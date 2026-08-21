import { SymbolId, Candle, OrderBook, TradeTick, DataStatus } from '@/types/trading';

export type MarketDataQualityStatus = 'HEALTHY' | 'DEGRADED' | 'STALE' | 'DISCONNECTED' | 'INVALID';

export interface NormalizedQuote {
  symbol: SymbolId;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  spreadPercent: number;
  change24h: number;
  volume24h: number;
  timestamp: number; // UTC Unix Milliseconds
}

export interface ProviderConnectionStatus {
  providerName: string;
  connected: boolean;
  latencyMs: number;
  lastMessageTimestamp: number;
  status: DataStatus;
  quality: MarketDataQualityStatus;
  reconnectAttempts: number;
}

export interface IMarketDataProvider {
  readonly name: string;
  getHistoricalCandles(symbol: SymbolId, interval: string, limit?: number): Promise<Candle[]>;
  getRealtimeQuote(symbol: SymbolId): Promise<NormalizedQuote>;
  getOrderBook(symbol: SymbolId, depth?: number): Promise<OrderBook>;
  getRecentTrades(symbol: SymbolId, limit?: number): Promise<TradeTick[]>;
  getConnectionStatus(): ProviderConnectionStatus;
}
