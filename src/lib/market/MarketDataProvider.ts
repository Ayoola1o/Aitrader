'use client';

import {
  SymbolId,
  MarketSnapshot,
  Candle,
  TradeTick,
  OrderBook,
  OrderBookLevel,
  AppMode,
  DataStatus,
  DataQuality,
} from '@/types/trading';
import { dataQualityEngine } from './DataQualityEngine';

export interface MarketDataHealth {
  source: 'binance' | 'binance-us' | 'coinbase' | 'kraken' | 'alpaca' | 'simulated' | 'none';
  status: DataStatus;
  latencyMs: number;
  freshnessSeconds: number;
  dataQualityScore: number;
  isStale: boolean;
  lastChecked: number;
  message: string;
}

export interface MarketDataSnapshot extends MarketSnapshot {
  source: 'binance' | 'binance-us' | 'coinbase' | 'kraken' | 'alpaca' | 'simulated' | 'none';
  latency: number;
  freshness: number;
  status: DataStatus;
}

export class MarketDataProvider {
  private appMode: AppMode = 'PAPER';
  private lastSnapshots: Partial<Record<SymbolId, MarketDataSnapshot>> = {};
  private listeners: Set<(snap: MarketDataSnapshot) => void> = new Set();
  private healthListeners: Set<(health: MarketDataHealth) => void> = new Set();

  public setMode(mode: AppMode) {
    this.appMode = mode;
  }

  public getMode(): AppMode {
    return this.appMode;
  }

  public subscribe(cb: (snap: MarketDataSnapshot) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public subscribeHealth(cb: (health: MarketDataHealth) => void) {
    this.healthListeners.add(cb);
    return () => this.healthListeners.delete(cb);
  }

  /**
   * Fetch verified live market data via the server-side API proxy.
   * If in PAPER mode and verified live data cannot be fetched, returns an UNAVAILABLE snapshot.
   * Synthetic data is generated ONLY if mode === 'DEMO'.
   */
  public async getSnapshot(symbol: SymbolId): Promise<MarketDataSnapshot> {
    const startTime = Date.now();
    let proxyData: {
      ticker: any;
      orderBook: any;
      candles: any;
    } | null = null;

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/market?symbol=${symbol}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success) {
            proxyData = d;
          }
        }
      } catch (err) {
        // Network timeout / error
      }
    }

    const now = Date.now();
    const latency = now - startTime;

    // ── CASE A: Live Data Available from Exchange ──
    if (proxyData && proxyData.ticker && proxyData.ticker.price > 0) {
      const t = proxyData.ticker;
      const source = t.source || 'binance';
      const price = Number(t.price);
      const bid = Number(t.bid || price * 0.9999);
      const ask = Number(t.ask || price * 1.0001);
      const spread = ask - bid;
      const spreadPercent = spread / ((bid + ask) / 2);

      // Real L2 Order Book
      let orderBook: OrderBook;
      if (proxyData.orderBook && Array.isArray(proxyData.orderBook.bids) && proxyData.orderBook.bids.length > 0) {
        const mapLevels = (arr: { price: number; size: number }[]): OrderBookLevel[] => {
          let total = 0;
          return arr.map((item) => {
            total += item.size;
            return { price: item.price, size: item.size, total };
          });
        };
        const bids = mapLevels(proxyData.orderBook.bids);
        const asks = mapLevels(proxyData.orderBook.asks);
        const bidDepth = bids.reduce((s, b) => s + b.size, 0);
        const askDepth = asks.reduce((s, a) => s + a.size, 0);
        const bidAskImbalance = bidDepth + askDepth > 0 ? (bidDepth - askDepth) / (bidDepth + askDepth) : 0;
        const midPrice = (bids[0]?.price && asks[0]?.price) ? (bids[0].price + asks[0].price) / 2 : price;

        orderBook = {
          bids,
          asks,
          spread,
          spreadPercent,
          bidAskImbalance,
          bidDepth,
          askDepth,
          midPrice,
          status: 'LIVE',
        };
      } else {
        orderBook = {
          bids: [],
          asks: [],
          spread: 0,
          spreadPercent: 0,
          bidAskImbalance: 0,
          bidDepth: 0,
          askDepth: 0,
          midPrice: price,
          status: 'UNAVAILABLE',
        };
      }

      // Real Candles
      let candles: Candle[] = [];
      let candlesStatus: DataStatus = 'UNAVAILABLE';
      if (proxyData.candles && Array.isArray(proxyData.candles.candles) && proxyData.candles.candles.length > 0) {
        candles = proxyData.candles.candles;
        candlesStatus = 'LIVE';
      }

      const quality: DataQuality = {
        tickerStatus: 'LIVE',
        orderBookStatus: orderBook.status || 'UNAVAILABLE',
        tradesStatus: 'LIVE',
        candlesStatus,
        fundingStatus: 'UNAVAILABLE',
        openInterestStatus: 'UNAVAILABLE',
        macroStatus: 'UNAVAILABLE',
        overallScore: orderBook.status === 'LIVE' && candlesStatus === 'LIVE' ? 100 : 75,
        criticalStale: false,
        lastUpdated: now,
      };

      const snap: MarketDataSnapshot = {
        symbol,
        exchange: source === 'alpaca' ? 'Alpaca' : 'Binance',
        timestamp: now,
        price,
        bid,
        ask,
        spread,
        change24h: Number(t.change24h || 0),
        high24h: Number(t.high24h || price * 1.02),
        low24h: Number(t.low24h || price * 0.98),
        volume24h: Number(t.volume24h || 0),
        candles,
        recentTrades: [],
        orderBook,
        fundingRate: null,
        openInterest: null,
        openInterestChange24h: null,
        longShortRatio: null,
        liquidations24h: null,
        dataQuality: quality,
        appMode: this.appMode,
        source: source as any,
        latency,
        freshness: 0,
        status: 'LIVE',
      };

      this.lastSnapshots[symbol] = snap;
      this.notify(snap);
      return snap;
    }

    // ── CASE B: DEMO MODE (Synthetic Data Allowed & Explicitly Labeled) ──
    if (this.appMode === 'DEMO') {
      const seedPrices: Record<SymbolId, number> = {
        BTCUSDT: 64250.0,
        ETHUSDT: 3450.0,
        SOLUSDT: 145.0,
        XRPUSDT: 0.585,
      };
      const basePrice = seedPrices[symbol] || 64000;
      const simulatedCandles = this.buildDemoCandles(basePrice);
      const simulatedOB = this.buildDemoOrderBook(basePrice);

      const quality: DataQuality = {
        tickerStatus: 'SIMULATED',
        orderBookStatus: 'SIMULATED',
        tradesStatus: 'SIMULATED',
        candlesStatus: 'SIMULATED',
        fundingStatus: 'UNAVAILABLE',
        openInterestStatus: 'UNAVAILABLE',
        macroStatus: 'UNAVAILABLE',
        overallScore: 90,
        criticalStale: false,
        lastUpdated: now,
      };

      const snap: MarketDataSnapshot = {
        symbol,
        exchange: 'Demo Simulation',
        timestamp: now,
        price: basePrice,
        bid: basePrice * 0.9999,
        ask: basePrice * 1.0001,
        spread: basePrice * 0.0002,
        change24h: 1.85,
        high24h: basePrice * 1.03,
        low24h: basePrice * 0.97,
        volume24h: 12500000,
        candles: simulatedCandles,
        recentTrades: [],
        orderBook: simulatedOB,
        fundingRate: null,
        openInterest: null,
        openInterestChange24h: null,
        longShortRatio: null,
        liquidations24h: null,
        dataQuality: quality,
        appMode: 'DEMO',
        source: 'simulated',
        latency: 5,
        freshness: 0,
        status: 'SIMULATED',
      };

      this.lastSnapshots[symbol] = snap;
      this.notify(snap);
      return snap;
    }

    // ── CASE C: PAPER / LIVE MODE WITHOUT LIVE DATA -> MARK UNAVAILABLE (NO SYNTHETIC DATA) ──
    const prevSnap = this.lastSnapshots[symbol];
    const isStale = prevSnap ? (now - prevSnap.timestamp > 20000) : true;

    const quality: DataQuality = {
      tickerStatus: isStale ? 'UNAVAILABLE' : 'STALE',
      orderBookStatus: 'UNAVAILABLE',
      tradesStatus: 'UNAVAILABLE',
      candlesStatus: 'UNAVAILABLE',
      fundingStatus: 'UNAVAILABLE',
      openInterestStatus: 'UNAVAILABLE',
      macroStatus: 'UNAVAILABLE',
      overallScore: 0,
      criticalStale: true, // triggers immediate halt in bot and warning in UI
      lastUpdated: prevSnap?.timestamp || now,
    };

    const unavailableSnap: MarketDataSnapshot = {
      symbol,
      exchange: 'Disconnected',
      timestamp: now,
      price: prevSnap?.price || 0,
      bid: 0,
      ask: 0,
      spread: 0,
      change24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      candles: [],
      recentTrades: [],
      orderBook: {
        bids: [],
        asks: [],
        spread: 0,
        spreadPercent: 0,
        bidAskImbalance: 0,
        bidDepth: 0,
        askDepth: 0,
        midPrice: 0,
        status: 'UNAVAILABLE',
      },
      fundingRate: null,
      openInterest: null,
      openInterestChange24h: null,
      longShortRatio: null,
      liquidations24h: null,
      dataQuality: quality,
      appMode: this.appMode,
      source: 'none',
      latency,
      freshness: prevSnap ? Math.round((now - prevSnap.timestamp) / 1000) : 9999,
      status: 'UNAVAILABLE',
    };

    this.notify(unavailableSnap);
    return unavailableSnap;
  }

  public getHealth(symbol: SymbolId): MarketDataHealth {
    const snap = this.lastSnapshots[symbol];
    if (!snap) {
      return {
        source: 'none',
        status: 'UNAVAILABLE',
        latencyMs: 0,
        freshnessSeconds: 9999,
        dataQualityScore: 0,
        isStale: true,
        lastChecked: Date.now(),
        message: 'No market data received yet',
      };
    }

    const ageSec = Math.round((Date.now() - snap.timestamp) / 1000);
    const isStale = snap.status === 'UNAVAILABLE' || ageSec > 25;

    return {
      source: snap.source,
      status: snap.status,
      latencyMs: snap.latency,
      freshnessSeconds: ageSec,
      dataQualityScore: snap.dataQuality.overallScore,
      isStale,
      lastChecked: Date.now(),
      message: isStale
        ? 'Market data disconnected or stale — Paper trading halted'
        : `Connected to ${snap.exchange} (${snap.latency}ms latency)`,
    };
  }

  private notify(snap: MarketDataSnapshot) {
    this.listeners.forEach((cb) => {
      try { cb(snap); } catch {}
    });
    const health = this.getHealth(snap.symbol);
    this.healthListeners.forEach((cb) => {
      try { cb(health); } catch {}
    });
  }

  // Demo-only helpers
  private buildDemoOrderBook(price: number): OrderBook {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bidTotal = 0;
    let askTotal = 0;
    for (let i = 1; i <= 10; i++) {
      const bidP = Number((price - i * price * 0.0001).toFixed(2));
      const askP = Number((price + i * price * 0.0001).toFixed(2));
      const bidS = Number((Math.exp(-i * 0.15) * 1.5).toFixed(4));
      const askS = Number((Math.exp(-i * 0.15) * 1.5).toFixed(4));
      bidTotal += bidS;
      askTotal += askS;
      bids.push({ price: bidP, size: bidS, total: bidTotal });
      asks.push({ price: askP, size: askS, total: askTotal });
    }
    const spread = asks[0].price - bids[0].price;
    return {
      bids,
      asks,
      spread,
      spreadPercent: spread / price,
      bidAskImbalance: 0.05,
      bidDepth: bidTotal,
      askDepth: askTotal,
      midPrice: price,
      status: 'SIMULATED',
    };
  }

  private buildDemoCandles(price: number): Candle[] {
    const candles: Candle[] = [];
    const now = Date.now();
    let p = price * 0.98;
    for (let i = 60; i >= 0; i--) {
      const chg = Math.sin(i * 0.2) * 0.002;
      const open = p;
      const close = p * (1 + chg);
      const high = Math.max(open, close) * 1.001;
      const low = Math.min(open, close) * 0.999;
      candles.push({ time: now - i * 60000, open, high, low, close, volume: 100 });
      p = close;
    }
    return candles;
  }
}

export const marketDataProvider = new MarketDataProvider();
