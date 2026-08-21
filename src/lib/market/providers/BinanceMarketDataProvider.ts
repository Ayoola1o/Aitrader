import { SymbolId, Candle, OrderBook, TradeTick } from '@/types/trading';
import { IMarketDataProvider, NormalizedQuote, ProviderConnectionStatus } from './types';
import { normalizeCandle, normalizeOrderBook, normalizeSymbol, normalizeTimestampUTC } from '../normalization';

export class BinanceMarketDataProvider implements IMarketDataProvider {
  readonly name = 'Binance';
  private lastMessageTime = Date.now();
  private latency = 42;

  async getHistoricalCandles(symbol: SymbolId, interval = '1h', limit = 100): Promise<Candle[]> {
    const clean = normalizeSymbol(symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${clean}&interval=${interval}&limit=${limit}`;
    const startTime = Date.now();

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance klines returned status ${res.status}`);
      const raw = await res.json();
      this.lastMessageTime = Date.now();
      this.latency = this.lastMessageTime - startTime;

      if (!Array.isArray(raw)) return [];

      return raw.map((k: any) =>
        normalizeCandle({
          time: k[0],
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          volume: k[5],
        })
      );
    } catch {
      return [];
    }
  }

  async getRealtimeQuote(symbol: SymbolId): Promise<NormalizedQuote> {
    const clean = normalizeSymbol(symbol);
    const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${clean}`;
    const startTime = Date.now();

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance bookTicker returned status ${res.status}`);
      const raw = await res.json();
      this.lastMessageTime = Date.now();
      this.latency = this.lastMessageTime - startTime;

      const bid = Number(raw.bidPrice) || 0;
      const ask = Number(raw.askPrice) || 0;
      const price = bid > 0 && ask > 0 ? (bid + ask) / 2 : bid || ask;
      const spread = Math.max(0, ask - bid);
      const spreadPercent = price > 0 ? (spread / price) * 100 : 0;

      return {
        symbol: clean,
        price,
        bid,
        ask,
        spread,
        spreadPercent,
        change24h: 0,
        volume24h: 0,
        timestamp: Date.now(),
      };
    } catch {
      return {
        symbol: clean,
        price: 0,
        bid: 0,
        ask: 0,
        spread: 0,
        spreadPercent: 0,
        change24h: 0,
        volume24h: 0,
        timestamp: Date.now(),
      };
    }
  }

  async getOrderBook(symbol: SymbolId, depth = 20): Promise<OrderBook> {
    const clean = normalizeSymbol(symbol);
    const url = `https://api.binance.com/api/v3/depth?symbol=${clean}&limit=${depth}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return normalizeOrderBook([], []);
      const raw = await res.json();
      return normalizeOrderBook(raw.bids || [], raw.asks || []);
    } catch {
      return normalizeOrderBook([], []);
    }
  }

  async getRecentTrades(symbol: SymbolId, limit = 50): Promise<TradeTick[]> {
    const clean = normalizeSymbol(symbol);
    const url = `https://api.binance.com/api/v3/trades?symbol=${clean}&limit=${limit}`;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];
      const raw = await res.json();

      if (!Array.isArray(raw)) return [];

      return raw.map((t: any, idx: number) => ({
        id: String(t.id || idx),
        time: normalizeTimestampUTC(t.time || Date.now()),
        price: Number(t.price) || 0,
        size: Number(t.qty) || 0,
        side: t.isBuyerMaker ? 'SELL' : 'BUY',
      }));
    } catch {
      return [];
    }
  }

  getConnectionStatus(): ProviderConnectionStatus {
    const isAlive = Date.now() - this.lastMessageTime < 30000;
    return {
      providerName: this.name,
      connected: isAlive,
      latencyMs: this.latency,
      lastMessageTimestamp: this.lastMessageTime,
      status: isAlive ? 'LIVE' : 'UNAVAILABLE',
      quality: isAlive ? 'HEALTHY' : 'STALE',
      reconnectAttempts: 0,
    };
  }
}

export const binanceMarketDataProvider = new BinanceMarketDataProvider();
