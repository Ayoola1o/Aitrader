import { createClient } from '@supabase/supabase-js';

// Global Supabase client (already used elsewhere)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Alpaca REST wrapper – supports global credentials from .env
 * as well as per‑bot credential overrides.
 */
export interface AlpacaCredentials {
  key: string;
  secret: string;
  isPaper?: boolean;
}

export interface AlpacaOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  type?: 'market' | 'limit';
  time_in_force?: 'day' | 'gtc';
  limit_price?: number;
}

/**
 * Internal helper to build request headers.
 */
function buildHeaders(creds: AlpacaCredentials) {
  return {
    'APCA-API-KEY-ID': creds.key,
    'APCA-API-SECRET-KEY': creds.secret,
    'Content-Type': 'application/json',
  };
}

/**
 * Internal helper to get the base URL based on environment.
 */
function getBaseUrl(isPaper: boolean = true) {
  return isPaper 
    ? 'https://paper-api.alpaca.markets/v2' 
    : 'https://api.alpaca.markets/v2';
}

/**
 * Place an order on Alpaca. If `overrideCreds` is provided the request
 * uses those credentials; otherwise it falls back to the global env vars.
 */
export async function placeAlpacaOrder(
  params: AlpacaOrderParams,
  overrideCreds?: AlpacaCredentials
): Promise<any> {
  const creds: AlpacaCredentials = overrideCreds || {
    key: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
    secret: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || '',
    isPaper: process.env.NEXT_PUBLIC_ALPACA_PAPER === 'true',
  };

  if (!creds.key || !creds.secret) {
    throw new Error('Alpaca API credentials are missing');
  }

  const url = `${getBaseUrl(creds.isPaper)}/orders`;
  const body = {
    symbol: params.symbol,
    side: params.side,
    qty: params.qty,
    type: params.type ?? 'market',
    time_in_force: params.time_in_force ?? 'day',
    ...(params.limit_price && { limit_price: params.limit_price }),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(creds),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Alpaca order failed: ${res.status} ${err}`);
  }

  return await res.json();
}

/**
 * Cancel an existing Alpaca order.
 */
export async function cancelAlpacaOrder(
  orderId: string,
  overrideCreds?: AlpacaCredentials
): Promise<void> {
  const creds: AlpacaCredentials = overrideCreds || {
    key: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
    secret: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || '',
    isPaper: process.env.NEXT_PUBLIC_ALPACA_PAPER === 'true',
  };

  const url = `${getBaseUrl(creds.isPaper)}/orders/${orderId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(creds),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Alpaca cancel failed: ${res.status} ${err}`);
  }
}

/**
 * Fetch open orders – used for UI status refresh.
 */
export async function fetchOpenAlpacaOrders(
  overrideCreds?: AlpacaCredentials
): Promise<any[]> {
  const creds: AlpacaCredentials = overrideCreds || {
    key: process.env.NEXT_PUBLIC_ALPACA_API_KEY || '',
    secret: process.env.NEXT_PUBLIC_ALPACA_SECRET_KEY || '',
    isPaper: process.env.NEXT_PUBLIC_ALPACA_PAPER === 'true',
  };

  const url = `${getBaseUrl(creds.isPaper)}/orders?status=open`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(creds),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Alpaca fetch open orders failed: ${res.status} ${err}`);
  }

  return await res.json();
}
// Simple Alpaca client wrapper
let storedCreds: AlpacaCredentials | null = null;

export const alpacaBrokerClient = {
  setCredentials(creds: { apiKeyId: string; secretKey: string; isPaper?: boolean }) {
    storedCreds = { key: creds.apiKeyId, secret: creds.secretKey, isPaper: creds.isPaper ?? true };
  },
  hasCredentials() {
    return !!storedCreds?.key && !!storedCreds?.secret;
  },
  async getAccount() {
    if (!storedCreds) throw new Error('Alpaca credentials not set');
    const url = `${getBaseUrl(storedCreds.isPaper ?? true)}/account`;
    const res = await fetch(url, { method: 'GET', headers: buildHeaders(storedCreds) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca getAccount failed: ${res.status} ${err}`);
    }
    return await res.json();
  },
  async getPositions() {
    if (!storedCreds) throw new Error('Alpaca credentials not set');
    const url = `${getBaseUrl(storedCreds.isPaper ?? true)}/positions`;
    const res = await fetch(url, { method: 'GET', headers: buildHeaders(storedCreds) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca getPositions failed: ${res.status} ${err}`);
    }
    return await res.json();
  },
  async submitOrder(symbol: string, qty: number, side: 'buy' | 'sell', type: 'market' | 'limit' = 'market') {
    return await placeAlpacaOrder({ symbol, side, qty, type }, storedCreds ?? undefined);
  },
  async closePosition(symbol: string) {
    if (!storedCreds) throw new Error('Alpaca credentials not set');
    const url = `${getBaseUrl(storedCreds.isPaper ?? true)}/positions/${symbol}`;
    const res = await fetch(url, { method: 'DELETE', headers: buildHeaders(storedCreds) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca closePosition failed: ${res.status} ${err}`);
    }
  },
};

export default alpacaBrokerClient;
