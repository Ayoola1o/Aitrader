import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AlpacaApiCredentials {
  key: string;
  secret: string;
  isPaper: boolean;
}

function resolveCredentials(req: NextRequest): AlpacaApiCredentials {
  const headerKey = req.headers.get('x-alpaca-key');
  const headerSecret = req.headers.get('x-alpaca-secret');
  const headerPaper = req.headers.get('x-alpaca-paper');

  const key = headerKey || process.env.ALPACA_API_KEY || process.env.NEXT_PUBLIC_ALPACA_API_KEY || '';
  const secret = headerSecret || process.env.ALPACA_SECRET_KEY || process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || '';
  const isPaper = headerPaper !== null ? headerPaper === 'true' : (process.env.NEXT_PUBLIC_ALPACA_PAPER !== 'false');

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
 * Alpaca Proxy Handler:
 * Supports GET: account, positions, orders, activities
 * Supports POST: placeOrder, cancelOrder, closePosition, closeAllPositions
 */
export async function GET(req: NextRequest) {
  const creds = resolveCredentials(req);
  if (!creds.key || !creds.secret) {
    return NextResponse.json({ success: false, error: 'Alpaca credentials missing' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'account';
  const baseUrl = getAlpacaBaseUrl(creds.isPaper);
  const headers = getAlpacaHeaders(creds);

  try {
    if (action === 'account') {
      const res = await fetch(`${baseUrl}/account`, { headers, cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca account error: ${res.status} ${errorText}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    if (action === 'positions') {
      const res = await fetch(`${baseUrl}/positions`, { headers, cache: 'no-store' });
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca positions error: ${res.status} ${errorText}` }, { status: res.status });
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
        return NextResponse.json({ success: false, error: `Alpaca orders error: ${res.status} ${errorText}` }, { status: res.status });
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
        return NextResponse.json({ success: false, error: `Alpaca activities error: ${res.status} ${errorText}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json({ success: true, data: Array.isArray(data) ? data : [] });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: `Alpaca request failed: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const creds = resolveCredentials(req);
  if (!creds.key || !creds.secret) {
    return NextResponse.json({ success: false, error: 'Alpaca credentials missing' }, { status: 400 });
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

      // Convert symbol for Alpaca Crypto if needed (e.g. BTCUSDT -> BTC/USD)
      let formattedSymbol = symbol;
      if (!formattedSymbol.includes('/')) {
        formattedSymbol = formattedSymbol.replace('USDT', '/USD').replace('USD', '/USD');
      }

      // Crypto orders on Alpaca require time_in_force 'gtc' or 'ioc'
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
        return NextResponse.json({ success: false, error: `Alpaca order rejected: ${res.status} ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
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
        return NextResponse.json({ success: false, error: `Alpaca cancel failed: ${res.status} ${errorText}` }, { status: res.status });
      }

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
        return NextResponse.json({ success: false, error: `Alpaca close position failed: ${res.status} ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    if (action === 'closeAllPositions') {
      const res = await fetch(`${baseUrl}/positions`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ success: false, error: `Alpaca close all failed: ${res.status} ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: `Alpaca execution failed: ${message}` }, { status: 500 });
  }
}
