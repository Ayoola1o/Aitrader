import { SymbolId, Candle, MarketSnapshot } from '@/types/trading';

export class AlpacaLiveMarketData {
  public async fetchLiveBars(symbol: SymbolId): Promise<Candle[]> {
    try {
      // Fetch live market candles from Binance Public Data API
      const symbolMap: Record<SymbolId, string> = {
        BTCUSDT: 'BTCUSDT',
        ETHUSDT: 'ETHUSDT',
        SOLUSDT: 'SOLUSDT',
        XRPUSDT: 'XRPUSDT',
      };

      const pairs = symbolMap[symbol] || 'BTCUSDT';
      const url = `https://api.binance.com/api/v3/klines?symbol=${pairs}&interval=1m&limit=100`;
      const res = await fetch(url);

      if (!res.ok) throw new Error('Live data request failed');

      const data = await res.json();
      return data.map((k: any[]) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch {
      // Fallback generator if network blocks public API
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
      const pairs = symbol.toUpperCase();
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pairs}`;
      const res = await fetch(url);

      if (!res.ok) return null;

      const data = await res.json();
      return {
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
      };
    } catch {
      return null;
    }
  }
}

export const alpacaLiveMarketData = new AlpacaLiveMarketData();
