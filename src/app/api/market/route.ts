import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COINBASE_MAP: Record<string, string> = {
  BTCUSDT: 'BTC-USD',
  ETHUSDT: 'ETH-USD',
  SOLUSDT: 'SOL-USD',
  XRPUSDT: 'XRP-USD',
};

const KRAKEN_MAP: Record<string, string> = {
  BTCUSDT: 'XBTUSD',
  ETHUSDT: 'ETHUSD',
  SOLUSDT: 'SOLUSD',
  XRPUSDT: 'XRPUSD',
};

// ── Multi-Source Ticker Fetcher ──────────────────────────────────────────────
async function getLiveTicker(symbol: string) {
  // 1. Try Binance Global
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (res.ok) {
      const d = await res.json();
      return {
        price: parseFloat(d.lastPrice),
        bid: parseFloat(d.bidPrice) || parseFloat(d.lastPrice) * 0.9999,
        ask: parseFloat(d.askPrice) || parseFloat(d.lastPrice) * 1.0001,
        change24h: parseFloat(d.priceChangePercent),
        high24h: parseFloat(d.highPrice),
        low24h: parseFloat(d.lowPrice),
        volume24h: parseFloat(d.volume),
        source: 'binance',
        fetchedAt: Date.now(),
      };
    }
  } catch {}

  // 2. Try Binance US
  try {
    const res = await fetch(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const d = await res.json();
      return {
        price: parseFloat(d.lastPrice),
        bid: parseFloat(d.bidPrice) || parseFloat(d.lastPrice) * 0.9999,
        ask: parseFloat(d.askPrice) || parseFloat(d.lastPrice) * 1.0001,
        change24h: parseFloat(d.priceChangePercent),
        high24h: parseFloat(d.highPrice),
        low24h: parseFloat(d.lowPrice),
        volume24h: parseFloat(d.volume),
        source: 'binance-us',
        fetchedAt: Date.now(),
      };
    }
  } catch {}

  // 3. Try Coinbase Public API
  const cbPair = COINBASE_MAP[symbol];
  if (cbPair) {
    try {
      const [tickerRes, statsRes] = await Promise.all([
        fetch(`https://api.exchange.coinbase.com/products/${cbPair}/ticker`, { cache: 'no-store' }),
        fetch(`https://api.exchange.coinbase.com/products/${cbPair}/stats`, { cache: 'no-store' }),
      ]);

      if (tickerRes.ok) {
        const t = await tickerRes.json();
        const stats = statsRes.ok ? await statsRes.json() : {};
        const price = parseFloat(t.price);
        const open = parseFloat(stats.open || t.price);
        const change24h = open > 0 ? ((price - open) / open) * 100 : 0;

        return {
          price,
          bid: parseFloat(t.bid) || price * 0.9999,
          ask: parseFloat(t.ask) || price * 1.0001,
          change24h,
          high24h: parseFloat(stats.high) || price * 1.02,
          low24h: parseFloat(stats.low) || price * 0.98,
          volume24h: parseFloat(t.volume) || 0,
          source: 'coinbase',
          fetchedAt: Date.now(),
        };
      }
    } catch {}
  }

  // 4. Try Kraken Public API
  const krPair = KRAKEN_MAP[symbol];
  if (krPair) {
    try {
      const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${krPair}`, { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        const pairKey = Object.keys(d.result || {})[0];
        if (pairKey) {
          const t = d.result[pairKey];
          const price = parseFloat(t.c[0]);
          const open = parseFloat(t.o);
          const change24h = open > 0 ? ((price - open) / open) * 100 : 0;

          return {
            price,
            bid: parseFloat(t.b[0]) || price * 0.9999,
            ask: parseFloat(t.a[0]) || price * 1.0001,
            change24h,
            high24h: parseFloat(t.h[1]) || price * 1.02,
            low24h: parseFloat(t.l[1]) || price * 0.98,
            volume24h: parseFloat(t.v[1]) || 0,
            source: 'kraken',
            fetchedAt: Date.now(),
          };
        }
      }
    } catch {}
  }

  return null;
}

// ── Multi-Source Order Book Fetcher ──────────────────────────────────────────
async function getLiveOrderBook(symbol: string) {
  // 1. Try Binance
  try {
    const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`, { cache: 'no-store' });
    if (res.ok) {
      const d = await res.json();
      return {
        bids: (d.bids || []).map(([p, s]: [string, string]) => ({ price: parseFloat(p), size: parseFloat(s) })),
        asks: (d.asks || []).map(([p, s]: [string, string]) => ({ price: parseFloat(p), size: parseFloat(s) })),
        source: 'binance',
        fetchedAt: Date.now(),
      };
    }
  } catch {}

  // 2. Try Coinbase
  const cbPair = COINBASE_MAP[symbol];
  if (cbPair) {
    try {
      const res = await fetch(`https://api.exchange.coinbase.com/products/${cbPair}/book?level=2`, { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        return {
          bids: (d.bids || []).slice(0, 20).map(([p, s]: [string, string]) => ({ price: parseFloat(p), size: parseFloat(s) })),
          asks: (d.asks || []).slice(0, 20).map(([p, s]: [string, string]) => ({ price: parseFloat(p), size: parseFloat(s) })),
          source: 'coinbase',
          fetchedAt: Date.now(),
        };
      }
    } catch {}
  }

  return null;
}

// ── Multi-Source 1m Candles Fetcher ──────────────────────────────────────────
async function getLiveCandles(symbol: string) {
  // 1. Try Binance
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const candles = data.map((k: any) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
      return { candles, source: 'binance', fetchedAt: Date.now() };
    }
  } catch {}

  // 2. Try Coinbase
  const cbPair = COINBASE_MAP[symbol];
  if (cbPair) {
    try {
      const res = await fetch(`https://api.exchange.coinbase.com/products/${cbPair}/candles?granularity=60`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Coinbase returns [time, low, high, open, close, volume]
        const candles = data.slice(0, 100).reverse().map((k: any) => ({
          time: k[0] * 1000,
          open: parseFloat(k[3]),
          high: parseFloat(k[2]),
          low: parseFloat(k[1]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        return { candles, source: 'coinbase', fetchedAt: Date.now() };
      }
    } catch {}
  }

  return null;
}

// ── Main Route Handler ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const type = searchParams.get('type') || 'all'; // 'ticker' | 'orderbook' | 'candles' | 'all'

  try {
    if (type === 'ticker') {
      const ticker = await getLiveTicker(symbol);
      return NextResponse.json({ success: !!ticker, ticker });
    }

    if (type === 'orderbook') {
      const orderBook = await getLiveOrderBook(symbol);
      return NextResponse.json({ success: !!orderBook, orderBook });
    }

    if (type === 'candles') {
      const candles = await getLiveCandles(symbol);
      return NextResponse.json({ success: !!candles, candles });
    }

    // Default: fetch all in parallel
    const [ticker, orderBook, candles] = await Promise.all([
      getLiveTicker(symbol),
      getLiveOrderBook(symbol),
      getLiveCandles(symbol),
    ]);

    return NextResponse.json({
      success: !!ticker,
      ticker,
      orderBook,
      candles,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch market data' }, { status: 500 });
  }
}
