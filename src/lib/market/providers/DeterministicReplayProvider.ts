import { SymbolId, Candle, OrderBook, TradeTick } from '@/types/trading';
import { IMarketDataProvider, NormalizedQuote, ProviderConnectionStatus } from './types';
import { normalizeOrderBook, normalizeSymbol } from '../normalization';

export class DeterministicReplayProvider implements IMarketDataProvider {
  readonly name = 'DeterministicReplay';
  private candles: Candle[] = [];
  private currentIndex = 0;
  private symbol: SymbolId = 'BTCUSDT';

  constructor(initialCandles: Candle[] = [], symbol: SymbolId = 'BTCUSDT') {
    this.candles = initialCandles;
    this.symbol = symbol;
    this.currentIndex = 0;
  }

  loadCandles(candles: Candle[], symbol: SymbolId = 'BTCUSDT') {
    this.candles = candles;
    this.symbol = symbol;
    this.currentIndex = 0;
  }

  setCursor(index: number) {
    this.currentIndex = Math.max(0, Math.min(index, this.candles.length - 1));
  }

  nextTick(): Candle | null {
    if (this.currentIndex >= this.candles.length - 1) return null;
    this.currentIndex += 1;
    return this.candles[this.currentIndex];
  }

  async getHistoricalCandles(symbol: SymbolId, interval = '1h', limit = 100): Promise<Candle[]> {
    const end = this.currentIndex + 1;
    const start = Math.max(0, end - limit);
    return this.candles.slice(start, end);
  }

  async getRealtimeQuote(symbol: SymbolId): Promise<NormalizedQuote> {
    const current = this.candles[this.currentIndex] || { close: 0, time: Date.now() };
    const price = current.close;
    const spread = price * 0.0002;
    const bid = price - spread / 2;
    const ask = price + spread / 2;

    return {
      symbol: this.symbol,
      price,
      bid,
      ask,
      spread,
      spreadPercent: 0.02,
      change24h: 0,
      volume24h: current.volume || 0,
      timestamp: current.time,
    };
  }

  async getOrderBook(symbol: SymbolId, depth = 10): Promise<OrderBook> {
    const current = this.candles[this.currentIndex] || { close: 64000 };
    const p = current.close;
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];

    for (let i = 1; i <= depth; i++) {
      bids.push([p * (1 - i * 0.0005), 1.0 + i * 0.2]);
      asks.push([p * (1 + i * 0.0005), 1.0 + i * 0.2]);
    }

    return normalizeOrderBook(bids, asks);
  }

  async getRecentTrades(symbol: SymbolId, limit = 10): Promise<TradeTick[]> {
    const current = this.candles[this.currentIndex] || { close: 64000, time: Date.now() };
    return [
      {
        id: `rep-${this.currentIndex}`,
        time: current.time,
        price: current.close,
        size: 0.5,
        side: 'BUY',
      },
    ];
  }

  getConnectionStatus(): ProviderConnectionStatus {
    return {
      providerName: this.name,
      connected: true,
      latencyMs: 0,
      lastMessageTimestamp: this.candles[this.currentIndex]?.time || Date.now(),
      status: 'LIVE',
      quality: 'HEALTHY',
      reconnectAttempts: 0,
    };
  }
}
