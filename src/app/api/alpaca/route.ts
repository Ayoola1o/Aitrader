import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/server/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { auditLogger } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

interface AlpacaApiCredentials {
  key: string;
  secret: string;
  isPaper: boolean;
}

function resolveServerCredentials(isPaperRequested?: boolean): AlpacaApiCredentials {
  const key = process.env.ALPACA_API_KEY || '';
  const secret = process.env.ALPACA_SECRET_KEY || '';
  const isPaper = isPaperRequested !== undefined ? isPaperRequested : (process.env.ALPACA_PAPER !== 'false');

  return { key, secret, isPaper };
}

function getAlpacaBaseUrl(isPaper: boolean): string {
  return isPaper ? 'https://paper-api.alpaca.markets/v2' : 'https://api.alpaca.markets/v2';
}

function getAlpacaHeaders(creds: AlpacaApiCredentials): Record<string, string> {
  return {
    'APCA-API-KEY-ID': creds.key,
    'APCA-API-SECRET-KEY': creds.secret,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Sanitize error message to prevent any credential reflection
 */
function sanitizeErrorMessage(msg: string): string {
  return msg.replace(/[A-Za-z0-9_-]{20,}/g, '••••');
}

/**
 * Alpaca Proxy Handler (Phase 1 Security Hardened):
 * Supports GET: account, positions, orders, activities
 * Supports POST: placeOrder, cancelOrder, closePosition, closeAllPositions
 */
export async function GET(req: NextRequest) {
  // 1. Rate Limiting Check
  const rate = checkRateLimit(req, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  // 2. Centralized Authentication Check
  const auth = await authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse('Authentication required to access private broker data.');
  }

  // 3. Resolve Server Credentials (Never trust client-supplied secret keys)
  const { searchParams } = new URL(req.url);
  const requestedPaper = searchParams.get('paper') !== 'false';
  const creds = resolveServerCredentials(requestedPaper);

  if (!creds.key || !creds.secret) {
    return NextResponse.json(
      { success: false, error: 'Alpaca credentials are not configured on server' },
      { status: 503 }
    );
  }

  const action = searchParams.get('action') || 'account';
  const baseUrl = getAlpacaBaseUrl(creds.isPaper);
  const headers = getAlpacaHeaders(creds);

  try {
    if (action === 'account') {
      const res = await fetch(`${baseUrl}/account`, { headers, cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca account query failed (${res.status}): ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    if (action === 'positions') {
      const res = await fetch(`${baseUrl}/positions`, { headers, cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca positions query failed: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
    }

    if (action === 'orders') {
      const status = searchParams.get('status') || 'all';
      const limit = searchParams.get('limit') || '50';
      const res = await fetch(`${baseUrl}/orders?status=${status}&limit=${limit}&nested=true`, { headers, cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca orders query failed: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
    }

    if (action === 'activities') {
      const activityType = searchParams.get('activity_type') || 'FILL';
      const pageSize = searchParams.get('page_size') || '50';
      const res = await fetch(`${baseUrl}/account/activities/${activityType}?direction=desc&page_size=${pageSize}`, { headers, cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca activities query failed: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: `Alpaca request failed: ${sanitizeErrorMessage(message)}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // 1. Rate Limiting Check (Strict 30 req/min for order actions)
  const rate = checkRateLimit(req, { limit: 30, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  // 2. Centralized Authentication Check
  const auth = await authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse('Authentication required to execute broker transactions.');
  }

  // 3. Resolve Server Credentials
  const creds = resolveServerCredentials();
  if (!creds.key || !creds.secret) {
    return NextResponse.json(
      { success: false, error: 'Alpaca credentials are not configured on server' },
      { status: 503 }
    );
  }

  const baseUrl = getAlpacaBaseUrl(creds.isPaper);
  const headers = getAlpacaHeaders(creds);

  try {
    const body = await req.json();
    const action = body.action || 'placeOrder';

    if (action === 'placeOrder') {
      const {
        symbol,
        side,
        qty,
        notional,
        type = 'market',
        time_in_force = 'gtc',
        limit_price,
        stop_price,
        trail_price,
        trail_percent,
        extended_hours,
        order_class,
        take_profit,
        stop_loss,
      } = body;

      if (!symbol || !side || (!qty && !notional)) {
        return NextResponse.json(
          { success: false, error: 'Missing required order parameters (symbol, side, and either qty or notional)' },
          { status: 400 }
        );
      }

      if (qty && notional) {
        return NextResponse.json(
          { success: false, error: 'qty and notional are mutually exclusive per Alpaca fractional trading API' },
          { status: 400 }
        );
      }

      let formattedSymbol = symbol;
      if (!formattedSymbol.includes('/')) {
        formattedSymbol = formattedSymbol.replace('USDT', '/USD').replace('USD', '/USD');
      }

      const isCrypto = formattedSymbol.includes('/') || formattedSymbol.includes('USD');
      const tif = isCrypto ? 'gtc' : (time_in_force || 'gtc');

      const payload: Record<string, unknown> = {
        symbol: formattedSymbol,
        side: side.toLowerCase(),
        type: type.toLowerCase(),
        time_in_force: tif,
      };

      if (qty) {
        const numQty = parseFloat(String(qty));
        if (isNaN(numQty) || numQty <= 0) {
          return NextResponse.json({ success: false, error: 'Invalid order quantity' }, { status: 400 });
        }
        payload.qty = numQty.toString();
      } else if (notional) {
        const numNotional = parseFloat(String(notional));
        if (isNaN(numNotional) || numNotional < 1.0) {
          return NextResponse.json({ success: false, error: 'Minimum notional order size is $1.00' }, { status: 400 });
        }
        payload.notional = numNotional.toString();
      }

      if (type.toLowerCase() === 'limit' && limit_price) {
        payload.limit_price = parseFloat(String(limit_price)).toString();
      }

      if (['stop', 'stop_limit'].includes(type.toLowerCase()) && stop_price) {
        payload.stop_price = parseFloat(String(stop_price)).toString();
      }

      if (type.toLowerCase() === 'trailing_stop') {
        if (trail_percent) payload.trail_percent = parseFloat(String(trail_percent)).toString();
        if (trail_price) payload.trail_price = parseFloat(String(trail_price)).toString();
      }

      if (extended_hours && !isCrypto) {
        payload.extended_hours = true;
      }

      if (order_class) {
        payload.order_class = order_class;
        if (take_profit) payload.take_profit = take_profit;
        if (stop_loss) payload.stop_loss = stop_loss;
      }

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        await auditLogger.log({
          userId: auth.user.id,
          eventType: 'ORDER_PLACED',
          details: { symbol: formattedSymbol, side, qty, notional, error: sanitizeErrorMessage(errorText) },
          status: 'FAILURE',
        });
        return NextResponse.json({ success: false, error: `Alpaca order rejected: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }

      const data = await res.json();
      await auditLogger.log({
        userId: auth.user.id,
        eventType: 'ORDER_PLACED',
        details: { orderId: data.id, symbol: formattedSymbol, side, qty: data.qty, notional: data.notional },
        status: 'SUCCESS',
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === 'cancelOrder') {
      const { orderId } = body;
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'Missing orderId' }, { status: 400 });
      }

      const res = await fetch(`${baseUrl}/orders/${orderId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca cancel failed: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }

      await auditLogger.log({
        userId: auth.user.id,
        eventType: 'ORDER_CANCELLED',
        details: { orderId },
        status: 'SUCCESS',
      });

      return NextResponse.json({ success: true, message: `Order ${orderId} cancelled` });
    }

    if (action === 'closePosition') {
      let { symbol } = body;
      if (!symbol) {
        return NextResponse.json({ success: false, error: 'Missing symbol' }, { status: 400 });
      }

      let formattedSymbol = symbol;
      if (!formattedSymbol.includes('/')) {
        formattedSymbol = formattedSymbol.replace('USDT', '/USD').replace('USD', '/USD');
      }

      const encoded = encodeURIComponent(formattedSymbol);
      const res = await fetch(`${baseUrl}/positions/${encoded}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca close position failed: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }

      const data = await res.json();
      await auditLogger.log({
        userId: auth.user.id,
        eventType: 'POSITION_CLOSED',
        details: { symbol: formattedSymbol },
        status: 'SUCCESS',
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === 'closeAllPositions') {
      const res = await fetch(`${baseUrl}/positions`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca close all failed: ${sanitizeErrorMessage(errorText)}` }, { status: res.status });
      }

      const data = await res.json();
      await auditLogger.log({
        userId: auth.user.id,
        eventType: 'CLOSE_ALL_POSITIONS',
        details: { count: Array.isArray(data) ? data.length : 0 },
        status: 'SUCCESS',
      });

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: `Alpaca execution failed: ${sanitizeErrorMessage(message)}` }, { status: 500 });
  }
}
