import {
  SymbolId, MarketSnapshot, Candle, TradeTick, OrderBook,
  OrderBookLevel, AppMode
} from '@/types/trading';
import { dataQualityEngine } from './DataQualityEngine';

const SEED_PRICES: Record<SymbolId, number> = {
  BTCUSDT: 64250.0,
  ETHUSDT: 3450.0,
  SOLUSDT: 145.0,
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
  source: 'binance' | 'binance-us' | 'coinbase' | 'kraken' | 'alpaca' | 'simulated';
}

interface LiveOrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  fetchedAt: number;
  source: string;
}

interface LiveTradesData {
  trades: TradeTick[];
  fetchedAt: number;
  source: string;
}

interface LiveCandlesData {
  candles: Candle[];
  fetchedAt: number;
  source: string;
}

export class MarketEngine {
  private appMode: AppMode = 'PAPER';
  private alpacaCredentials: { key: string; secret: string } | null = null;

  // Cached state per symbol
  private lastTicker: Partial<Record<SymbolId, LiveTickerData>> = {};
  private lastOrderBook: Partial<Record<SymbolId, LiveOrderBook>> = {};
  private lastTrades: Partial<Record<SymbolId, LiveTradesData>> = {};
  private lastCandles: Partial<Record<SymbolId, LiveCandlesData>> = {};

  setMode(mode: AppMode) {
    this.appMode = mode;
  }

  getMode(): AppMode {
    return this.appMode;
  }

  setAlpacaCredentials(key: string, secret: string) {
    this.alpacaCredentials = { key, secret };
  }

  // ── Server Proxy Fetcher (/api/market) ───────────────────────────────────
  private async fetchMarketApiProxy(symbol: SymbolId): Promise<{
    ticker: LiveTickerData | null;
    orderBook: LiveOrderBook | null;
    candles: LiveCandlesData | null;
  } | null> {
    if (typeof window === 'undefined') return null;
    try {
      const res = await fetch(`/api/market?symbol=${symbol}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const d = await res.json();
      if (!d.success) return null;

      let ticker: LiveTickerData | null = null;
      if (d.ticker) {
        ticker = {
          price: d.ticker.price,
          bid: d.ticker.bid,
          ask: d.ticker.ask,
          change24h: d.ticker.change24h,
          high24h: d.ticker.high24h,
          low24h: d.ticker.low24h,
          volume24h: d.ticker.volume24h,
          fetchedAt: d.ticker.fetchedAt || Date.now(),
          source: d.ticker.source || 'binance',
        };
      }

      let orderBook: LiveOrderBook | null = null;
      if (d.orderBook) {
        const mapLevels = (arr: { price: number; size: number }[]): OrderBookLevel[] => {
          let total = 0;
          return arr.map(item => {
            total += item.size;
            return { price: item.price, size: item.size, total };
          });
        };
        orderBook = {
          bids: mapLevels(d.orderBook.bids || []),
          asks: mapLevels(d.orderBook.asks || []),
          fetchedAt: d.orderBook.fetchedAt || Date.now(),
          source: d.orderBook.source || 'binance',
        };
      }

      let candles: LiveCandlesData | null = null;
      if (d.candles && d.candles.candles) {
        candles = {
          candles: d.candles.candles,
          fetchedAt: d.candles.fetchedAt || Date.now(),
          source: d.candles.source || 'binance',
        };
      }

      return { ticker, orderBook, candles };
    } catch {
      return null;
    }
  }

  // ── Binance Direct REST Fallback ─────────────────────────────────────────
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

  // ── Alpaca REST Fallback ─────────────────────────────────────────────────
  private async fetchAlpacaTicker(symbol: SymbolId): Promise<LiveTickerData | null> {
    if (!this.alpacaCredentials) return null;
    try {
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

  // ── Simulated Generators ──────────────────────────────────────────────────
  private buildSimulatedOrderBook(price: number): LiveOrderBook {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bidTotal = 0;
    let askTotal = 0;
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
    const now = Date.now();

    // 1. Try Server Proxy first (multi-exchange: Binance, Binance US, Coinbase, Kraken)
    const proxyData = await this.fetchMarketApiProxy(symbol);

    let activeTicker: LiveTickerData | null = null;
    let activeOB: LiveOrderBook | null = null;
    let activeCandles: LiveCandlesData | null = null;

    if (proxyData && proxyData.ticker) {
      this.lastTicker[symbol] = proxyData.ticker;
      activeTicker = proxyData.ticker;
      if (proxyData.orderBook) this.lastOrderBook[symbol] = proxyData.orderBook;
      if (proxyData.candles) this.lastCandles[symbol] = proxyData.candles;
    }

    // 2. Direct fallbacks if proxy not available
    if (!activeTicker) {
      let ticker = await this.fetchBinanceTicker(symbol);
      if (!ticker) ticker = await this.fetchAlpacaTicker(symbol);
      if (ticker) {
        this.lastTicker[symbol] = ticker;
      }
      activeTicker = this.lastTicker[symbol] ?? null;
    }

    const price = activeTicker?.price ?? (this.appMode === 'DEMO' ? SEED_PRICES[symbol] : (this.lastTicker[symbol]?.price ?? SEED_PRICES[symbol]));
    const tickerSource = activeTicker?.source ?? (this.appMode === 'DEMO' ? 'simulated' : 'none');

    // 3. Order Book
    activeOB = this.lastOrderBook[symbol] ?? this.buildSimulatedOrderBook(price);

    // 4. Candles
    activeCandles = this.lastCandles[symbol] ?? this.buildSimulatedCandles(price);

    // 5. Order book summary
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

    // 6. Data quality evaluation
    const tickerAge = activeTicker ? now - activeTicker.fetchedAt : null;
    const orderBookAge = activeOB.source !== 'simulated' ? now - activeOB.fetchedAt : null;
    const candlesAge = activeCandles.source !== 'simulated' ? now - activeCandles.fetchedAt : null;

    const dataQuality = dataQualityEngine.buildQuality({
      tickerAge,
      orderBookAge,
      tradesAge: tickerAge,
      candlesAge,
      source: tickerSource as any,
      appMode: this.appMode,
    });

    return {
      symbol,
      exchange: tickerSource === 'alpaca' ? 'Alpaca' : tickerSource === 'coinbase' ? 'Coinbase' : tickerSource === 'kraken' ? 'Kraken' : tickerSource === 'binance-us' ? 'Binance US' : tickerSource === 'binance' ? 'Binance' : 'Demo',
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
      recentTrades: this.lastTrades[symbol]?.trades ?? [],
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
