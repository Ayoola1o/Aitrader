import { SymbolId, Candle } from '@/types/trading';

export class AlpacaLiveMarketData {
  public async fetchLiveBars(symbol: SymbolId): Promise<Candle[]> {
    try {
      const res = await fetch(`/api/market?symbol=${symbol}&type=candles`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (data.success && Array.isArray(data.candles?.candles)) {
        return data.candles.candles.map((k: any) => ({
          time: k.timestamp || k.time || Date.now(),
          open: parseFloat(k.open),
          high: parseFloat(k.high),
          low: parseFloat(k.low),
          close: parseFloat(k.close),
          volume: parseFloat(k.volume) || 10,
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  public async fetchLiveTicker(symbol: SymbolId): Promise<{
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  } | null> {
    try {
      const res = await fetch(`/api/market?symbol=${symbol}&type=ticker`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.success && data.ticker) {
        return {
          price: parseFloat(data.ticker.price),
          change24h: parseFloat(data.ticker.change24h || 0),
          high24h: parseFloat(data.ticker.high24h || data.ticker.price * 1.015),
          low24h: parseFloat(data.ticker.low24h || data.ticker.price * 0.985),
          volume24h: parseFloat(data.ticker.volume24h || 1000000),
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const alpacaLiveMarketData = new AlpacaLiveMarketData();
