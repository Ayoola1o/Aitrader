import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COINGECKO_MAP: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  SOLUSDT: 'solana',
  XRPUSDT: 'ripple',
};

const ALPACA_CRYPTO_MAP: Record<string, string> = {
  BTCUSDT: 'BTC/USD',
  ETHUSDT: 'ETH/USD',
  SOLUSDT: 'SOL/USD',
  XRPUSDT: 'XRP/USD',
};

const COINBASE_PAIR_MAP: Record<string, string> = {
  BTCUSDT: 'BTC-USD',
  ETHUSDT: 'ETH-USD',
  SOLUSDT: 'SOL-USD',
  XRPUSDT: 'XRP-USD',
};

interface CacheEntry {
  data: any;
  timestamp: number;
}
const marketCache: Record<string, CacheEntry> = {};

// ── 1. Live Ticker Fetcher ───────────────────────────────────────────────────
async function getLiveTicker(symbol: string) {
  // Try Binance Global REST
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.lastPrice) {
        const price = parseFloat(d.lastPrice);
        return {
          price,
          bid: parseFloat(d.bidPrice) || price * 0.9999,
          ask: parseFloat(d.askPrice) || price * 1.0001,
          change24h: parseFloat(d.priceChangePercent),
          high24h: parseFloat(d.highPrice),
          low24h: parseFloat(d.lowPrice),
          volume24h: parseFloat(d.volume),
          source: 'binance',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  // Try CoinGecko Public API
  const cgId = COINGECKO_MAP[symbol] || 'bitcoin';
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`,
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(2500),
      }
    );
    if (res.ok) {
      const d = await res.json();
      const coin = d[cgId];
      if (coin && coin.usd > 0) {
        const price = parseFloat(coin.usd);
        const change24h = parseFloat(coin.usd_24h_change) || 0;
        return {
          price,
          bid: price * 0.9999,
          ask: price * 1.0001,
          change24h: parseFloat(change24h.toFixed(2)),
          high24h: price * (1 + Math.max(0.008, Math.abs(change24h / 100))),
          low24h: price * (1 - Math.max(0.008, Math.abs(change24h / 100))),
          volume24h: parseFloat(coin.usd_24h_vol) || 0,
          source: 'coingecko',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  // Try Alpaca Crypto
  const alpacaPair = ALPACA_CRYPTO_MAP[symbol] || 'BTC/USD';
  try {
    const res = await fetch(`https://data.alpaca.markets/v1beta3/crypto/us/latest/bars?symbols=${alpacaPair}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const d = await res.json();
      const bar = d.bars?.[alpacaPair];
      if (bar && bar.c > 0) {
        const price = parseFloat(bar.c);
        const open = parseFloat(bar.o) || price;
        const change24h = open > 0 ? ((price - open) / open) * 100 : 0;
        return {
          price,
          bid: price * 0.9999,
          ask: price * 1.0001,
          change24h: parseFloat(change24h.toFixed(2)),
          high24h: parseFloat(bar.h) || price * 1.015,
          low24h: parseFloat(bar.l) || price * 0.985,
          volume24h: parseFloat(bar.v) || 0,
          source: 'alpaca',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  return {
    price: 0,
    bid: 0,
    ask: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    source: 'unverified',
    status: 'UNAVAILABLE',
    fetchedAt: Date.now(),
  };
}

// ── 2. Real L2 Order Book Depth Fetcher (Zero Math.random) ───────────────────
async function getLiveOrderBook(symbol: string) {
  // 1. Try Binance L2 Depth
  try {
    const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const d = await res.json();
      if (Array.isArray(d.bids) && Array.isArray(d.asks) && d.bids.length > 0) {
        return {
          bids: d.bids.slice(0, 15).map((b: [string, string]) => ({
            price: parseFloat(b[0]),
            size: parseFloat(b[1]),
          })),
          asks: d.asks.slice(0, 15).map((a: [string, string]) => ({
            price: parseFloat(a[0]),
            size: parseFloat(a[1]),
          })),
          source: 'binance-l2',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  // 2. Try Coinbase L2 Depth
  const cbPair = COINBASE_PAIR_MAP[symbol] || 'BTC-USD';
  try {
    const res = await fetch(`https://api.exchange.coinbase.com/products/${cbPair}/book?level=2`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const d = await res.json();
      if (Array.isArray(d.bids) && Array.isArray(d.asks) && d.bids.length > 0) {
        return {
          bids: d.bids.slice(0, 15).map((b: [string, string, number]) => ({
            price: parseFloat(b[0]),
            size: parseFloat(b[1]),
          })),
          asks: d.asks.slice(0, 15).map((a: [string, string, number]) => ({
            price: parseFloat(a[0]),
            size: parseFloat(a[1]),
          })),
          source: 'coinbase-l2',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  return {
    bids: [],
    asks: [],
    source: 'unverified',
    status: 'UNAVAILABLE',
    fetchedAt: Date.now(),
  };
}

// ── 3. Real Candles Fetcher (Zero Math.sin / Synthetic Candles) ──────────────
async function getLiveCandles(symbol: string) {
  // 1. Try Binance 1m Kline Bars
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=60`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const d = await res.json();
      if (Array.isArray(d) && d.length > 0) {
        return {
          candles: d.map((k: any) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          })),
          source: 'binance',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  // 2. Try Alpaca Crypto 1-Minute Bars
  const alpacaPair = ALPACA_CRYPTO_MAP[symbol] || 'BTC/USD';
  try {
    const res = await fetch(
      `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${alpacaPair}&timeframe=1Min&limit=60`,
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (res.ok) {
      const d = await res.json();
      const bars = d.bars?.[alpacaPair];
      if (Array.isArray(bars) && bars.length > 0) {
        return {
          candles: bars.map((b: any) => ({
            timestamp: new Date(b.t).getTime(),
            open: parseFloat(b.o),
            high: parseFloat(b.h),
            low: parseFloat(b.l),
            close: parseFloat(b.c),
            volume: parseFloat(b.v),
          })),
          source: 'alpaca',
          status: 'LIVE',
          fetchedAt: Date.now(),
        };
      }
    }
  } catch {}

  return {
    candles: [],
    source: 'unverified',
    status: 'UNAVAILABLE',
    fetchedAt: Date.now(),
  };
}

// ── Main Route Handler ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const type = searchParams.get('type') || 'all';
  const cacheKey = `${symbol}_${type}`;

  const cached = marketCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < 2000) {
    return NextResponse.json(cached.data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  try {
    const ticker = await getLiveTicker(symbol);
    let payload: any;

    if (type === 'ticker') {
      payload = { success: ticker.status === 'LIVE', ticker };
    } else if (type === 'orderbook') {
      const orderBook = await getLiveOrderBook(symbol);
      payload = { success: orderBook.status === 'LIVE', orderBook };
    } else if (type === 'candles') {
      const candles = await getLiveCandles(symbol);
      payload = { success: candles.status === 'LIVE', candles };
    } else {
      const [orderBook, candles] = await Promise.all([
        getLiveOrderBook(symbol),
        getLiveCandles(symbol),
      ]);
      const isLive = ticker.status === 'LIVE' && orderBook.status === 'LIVE';
      payload = {
        success: isLive,
        status: isLive ? 'LIVE' : 'UNAVAILABLE',
        ticker,
        orderBook,
        candles,
        timestamp: Date.now(),
      };
    }

    if (payload.success) {
      marketCache[cacheKey] = { data: payload, timestamp: Date.now() };
    }

    return NextResponse.json(payload, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        status: 'UNAVAILABLE',
        error: `Live market data feed unavailable: ${message}`,
        timestamp: Date.now(),
      },
      { status: 503 }
    );
  }
}
