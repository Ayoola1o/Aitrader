import {
  SymbolId,
  MarketSnapshot,
  Candle,
  OrderBook,
  OrderBookLevel,
  TradeTick,
  AppMode,
  DataQuality,
  DataStatus,
} from '@/types/trading';
import { dataQualityEngine } from './DataQualityEngine';

// Last known good prices — used as STALE fallback
const SEED_PRICES: Record<SymbolId, number> = {
  BTCUSDT: 64250.0,
  ETHUSDT: 3450.0,
  SOLUSDT: 148.5,
  XRPUSDT: 0.585,
};

interface LiveTickerData {
  price: number;
  bid: number;
  ask: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fetchedAt: number;
  source: 'binance' | 'alpaca' | 'simulated';
}

interface LiveOrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  fetchedAt: number;
  source: 'binance' | 'alpaca' | 'simulated';
}

interface LiveTradesData {
  trades: TradeTick[];
  fetchedAt: number;
  source: 'binance' | 'alpaca' | 'simulated';
}

interface LiveCandlesData {
  candles: Candle[];
  fetchedAt: number;
  source: 'binance' | 'alpaca' | 'simulated';
}

export class MarketEngine {
  private lastTicker: Record<SymbolId, LiveTickerData | null> = {
    BTCUSDT: null, ETHUSDT: null, SOLUSDT: null, XRPUSDT: null,
  };
  private lastOrderBook: Record<SymbolId, LiveOrderBook | null> = {
    BTCUSDT: null, ETHUSDT: null, SOLUSDT: null, XRPUSDT: null,
  };
  private lastTrades: Record<SymbolId, LiveTradesData | null> = {
    BTCUSDT: null, ETHUSDT: null, SOLUSDT: null, XRPUSDT: null,
  };
  private lastCandles: Record<SymbolId, LiveCandlesData | null> = {
    BTCUSDT: null, ETHUSDT: null, SOLUSDT: null, XRPUSDT: null,
  };
  private appMode: AppMode = 'PAPER';
  private alpacaCredentials: { key: string; secret: string } | null = null;

  setMode(mode: AppMode) { this.appMode = mode; }
  setAlpacaCredentials(key: string, secret: string) {
    this.alpacaCredentials = { key, secret };
  }

  // ── Binance REST ticker ──────────────────────────────────────────────────
  private async fetchBinanceTicker(symbol: SymbolId): Promise<LiveTickerData | null> {
    try {
      const [tickerRes, bookRes] = await Promise.allSettled([
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { cache: 'no-store' }),
        fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`, { cache: 'no-store' }),
      ]);

      let price: number | null = null;
      let change24h = 0, high24h = 0, low24h = 0, volume24h = 0;
      let bid = 0, ask = 0;

      if (tickerRes.status === 'fulfilled' && tickerRes.value.ok) {
        const d = await tickerRes.value.json();
        price = parseFloat(d.lastPrice);
        change24h = parseFloat(d.priceChangePercent);
        high24h = parseFloat(d.highPrice);
        low24h = parseFloat(d.lowPrice);
        volume24h = parseFloat(d.volume);
      }

      if (bookRes.status === 'fulfilled' && bookRes.value.ok) {
        const d = await bookRes.value.json();
        bid = parseFloat(d.bidPrice);
        ask = parseFloat(d.askPrice);
        if (!price) price = (bid + ask) / 2;
      }

      if (!price) return null;

      return {
        price,
        bid: bid || price * 0.9999,
        ask: ask || price * 1.0001,
        change24h,
        high24h: high24h || price * 1.02,
        low24h: low24h || price * 0.98,
        volume24h,
        fetchedAt: Date.now(),
        source: 'binance',
      };
    } catch {
      return null;
    }
  }

  // ── Alpaca REST fallback ─────────────────────────────────────────────────
  private async fetchAlpacaTicker(symbol: SymbolId): Promise<LiveTickerData | null> {
    if (!this.alpacaCredentials) return null;
    try {
      // Map crypto symbols to Alpaca format
      const alpacaSymbol = symbol.replace('USDT', '/USD');
      const url = `https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols=${alpacaSymbol}`;
      const res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': this.alpacaCredentials.key,
          'APCA-API-SECRET-KEY': this.alpacaCredentials.secret,
        },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json();
      const trade = data.trades?.[alpacaSymbol];
      if (!trade) return null;

      const price = parseFloat(trade.p);
      const last = this.lastTicker[symbol];
      return {
        price,
        bid: price * 0.9999,
        ask: price * 1.0001,
        change24h: last ? ((price - last.price) / last.price) * 100 : 0,
        high24h: last?.high24h || price * 1.02,
        low24h: last?.low24h || price * 0.98,
        volume24h: last?.volume24h || 0,
        fetchedAt: Date.now(),
        source: 'alpaca',
      };
    } catch {
      return null;
    }
  }

  // ── Binance REST order book ──────────────────────────────────────────────
  private async fetchBinanceOrderBook(symbol: SymbolId): Promise<LiveOrderBook | null> {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const mapLevels = (arr: [string, string][]): OrderBookLevel[] => {
        let total = 0;
        return arr.map(([p, s]) => {
          const size = parseFloat(s);
          total += size;
          return { price: parseFloat(p), size, total };
        });
      };
      return {
        bids: mapLevels(data.bids || []),
        asks: mapLevels(data.asks || []),
        fetchedAt: Date.now(),
        source: 'binance',
      };
    } catch {
      return null;
    }
  }

  // ── Binance REST trades ──────────────────────────────────────────────────
  private async fetchBinanceTrades(symbol: SymbolId, lastPrice: number): Promise<LiveTradesData | null> {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=50`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const trades: TradeTick[] = data.map((t: any) => {
        const price = parseFloat(t.price);
        const bid = lastPrice * 0.9999;
        const ask = lastPrice * 1.0001;
        return {
          id: String(t.id),
          time: t.time,
          price,
          size: parseFloat(t.qty),
          side: (price >= ask ? 'BUY' : price <= bid ? 'SELL' : 'UNKNOWN') as TradeTick['side'],
        };
      });
      return { trades: trades.reverse(), fetchedAt: Date.now(), source: 'binance' };
    } catch {
      return null;
    }
  }

  // ── Binance REST candles ─────────────────────────────────────────────────
  private async fetchBinanceCandles(symbol: SymbolId): Promise<LiveCandlesData | null> {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const candles: Candle[] = data.map((k: any) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
      return { candles, fetchedAt: Date.now(), source: 'binance' };
    } catch {
      return null;
    }
  }

  // ── Simulated order book from last price ────────────────────────────────
  private buildSimulatedOrderBook(price: number): LiveOrderBook {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bidTotal = 0, askTotal = 0;
    for (let i = 1; i <= 15; i++) {
      const bidP = Number((price - i * price * 0.0001).toFixed(price > 100 ? 2 : 4));
      const askP = Number((price + i * price * 0.0001).toFixed(price > 100 ? 2 : 4));
      const bidS = Number((Math.exp(-i * 0.15) * (price > 1000 ? 2 : 200)).toFixed(4));
      const askS = Number((Math.exp(-i * 0.15) * (price > 1000 ? 2 : 200)).toFixed(4));
      bidTotal += bidS; askTotal += askS;
      bids.push({ price: bidP, size: bidS, total: bidTotal });
      asks.push({ price: askP, size: askS, total: askTotal });
    }
    return { bids, asks, fetchedAt: Date.now(), source: 'simulated' };
  }

  private buildSimulatedCandles(price: number): LiveCandlesData {
    const now = Date.now();
    const candles: Candle[] = [];
    let p = price * 0.98;
    for (let i = 100; i >= 0; i--) {
      const chg = (Math.sin(i * 0.15) * 0.002) + (i % 7 === 0 ? 0.003 : -0.001);
      const open = p;
      const close = p * (1 + chg);
      const high = Math.max(open, close) * 1.0008;
      const low = Math.min(open, close) * 0.9992;
      candles.push({ time: now - i * 60000, open, high, low, close, volume: 50 + Math.abs(chg) * 5000 });
      p = close;
    }
    return { candles, fetchedAt: Date.now(), source: 'simulated' };
  }

  // ── Main tick ────────────────────────────────────────────────────────────
  public async tick(symbol: SymbolId): Promise<MarketSnapshot> {
    // 1. Fetch ticker — Binance first, Alpaca fallback
    let ticker = await this.fetchBinanceTicker(symbol);
    if (!ticker) {
      ticker = await this.fetchAlpacaTicker(symbol);
    }

    if (ticker) {
      this.lastTicker[symbol] = ticker;
    }

    const activeTicker = this.lastTicker[symbol];
    const price = activeTicker?.price ?? SEED_PRICES[symbol];
    const tickerSource = activeTicker?.source ?? 'simulated';

    // 2. Fetch order book
    let ob = await this.fetchBinanceOrderBook(symbol);
    if (ob) {
      this.lastOrderBook[symbol] = ob;
    }
    const activeOB = this.lastOrderBook[symbol] ?? this.buildSimulatedOrderBook(price);

    // 3. Fetch trades
    let trades = await this.fetchBinanceTrades(symbol, price);
    if (trades) {
      this.lastTrades[symbol] = trades;
    }
    const activeTrades = this.lastTrades[symbol];

    // 4. Fetch candles
    let candles = await this.fetchBinanceCandles(symbol);
    if (candles) {
      this.lastCandles[symbol] = candles;
    }
    const activeCandles = this.lastCandles[symbol] ?? this.buildSimulatedCandles(price);

    // 5. Build order book summary
    const bids = activeOB.bids;
    const asks = activeOB.asks;
    const bidDepth = bids.reduce((s, b) => s + b.size, 0);
    const askDepth = asks.reduce((s, a) => s + a.size, 0);
    const bidAskImbalance = bidDepth + askDepth > 0
      ? (bidDepth - askDepth) / (bidDepth + askDepth)
      : 0;
    const bestBid = bids[0]?.price ?? price * 0.9999;
    const bestAsk = asks[0]?.price ?? price * 1.0001;
    const spread = bestAsk - bestBid;
    const spreadPercent = spread / ((bestBid + bestAsk) / 2);
    const midPrice = (bestBid + bestAsk) / 2;

    const orderBook: OrderBook = {
      bids, asks, spread, spreadPercent, bidAskImbalance, bidDepth, askDepth, midPrice,
    };

    // 6. Data quality
    const now = Date.now();
    const dataQuality = dataQualityEngine.buildQuality({
      tickerAge: activeTicker ? now - activeTicker.fetchedAt : null,
      orderBookAge: activeOB.source !== 'simulated' ? now - activeOB.fetchedAt : null,
      tradesAge: activeTrades ? now - activeTrades.fetchedAt : null,
      candlesAge: activeCandles.source !== 'simulated' ? now - activeCandles.fetchedAt : null,
      source: tickerSource as any,
    });

    return {
      symbol,
      exchange: tickerSource === 'alpaca' ? 'Alpaca' : tickerSource === 'binance' ? 'Binance' : 'Demo',
      timestamp: now,
      price,
      bid: activeTicker?.bid ?? bestBid,
      ask: activeTicker?.ask ?? bestAsk,
      spread,
      change24h: activeTicker?.change24h ?? 0,
      high24h: activeTicker?.high24h ?? price * 1.02,
      low24h: activeTicker?.low24h ?? price * 0.98,
      volume24h: activeTicker?.volume24h ?? 0,
      candles: activeCandles.candles,
      recentTrades: activeTrades?.trades ?? [],
      orderBook,
      fundingRate: null,
      openInterest: null,
      openInterestChange24h: null,
      longShortRatio: null,
      liquidations24h: null,
      dataQuality,
      appMode: this.appMode,
    };
  }
}

export const marketEngine = new MarketEngine();
