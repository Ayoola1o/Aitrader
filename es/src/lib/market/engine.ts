import { SymbolId, MarketSnapshot, Candle, OrderBook, TradeTick } from '@/types/trading';

const BASE_PRICES: Record<SymbolId, number> = {
  BTCUSDT: 64250.0,
  ETHUSDT: 3450.0,
  SOLUSDT: 148.5,
  XRPUSDT: 0.585,
};

export class MarketEngine {
  private currentPrices: Record<SymbolId, number> = { ...BASE_PRICES };
  private candles: Record<SymbolId, Candle[]> = {
    BTCUSDT: [],
    ETHUSDT: [],
    SOLUSDT: [],
    XRPUSDT: [],
  };
  private tradeHistory: Record<SymbolId, TradeTick[]> = {
    BTCUSDT: [],
    ETHUSDT: [],
    SOLUSDT: [],
    XRPUSDT: [],
  };

  constructor() {
    this.initializeCandles();
  }

  private initializeCandles() {
    const symbols: SymbolId[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
    const now = Date.now();
    const intervalMs = 60 * 1000; // 1 minute

    symbols.forEach((symbol) => {
      let price = BASE_PRICES[symbol];
      const list: Candle[] = [];
      const count = 100;

      for (let i = count; i >= 0; i--) {
        const time = now - i * intervalMs;
        const changePercent = (Math.random() - 0.49) * 0.006;
        const open = price;
        const close = price * (1 + changePercent);
        const high = Math.max(open, close) * (1 + Math.random() * 0.002);
        const low = Math.min(open, close) * (1 - Math.random() * 0.002);
        const volume = (BASE_PRICES[symbol] > 1000 ? 5 : 500) * (0.5 + Math.random());

        list.push({ time, open, high, low, close, volume });
        price = close;
      }
      this.candles[symbol] = list;
      this.currentPrices[symbol] = price;
    });
  }

  public tick(symbol: SymbolId): MarketSnapshot {
    const lastPrice = this.currentPrices[symbol];
    const tickChangePercent = (Math.random() - 0.492) * 0.0015;
    const newPrice = Number((lastPrice * (1 + tickChangePercent)).toFixed(symbol === 'XRPUSDT' ? 4 : 2));
    this.currentPrices[symbol] = newPrice;

    // Update last candle
    const symbolCandles = this.candles[symbol];
    const lastCandle = symbolCandles[symbolCandles.length - 1];
    const now = Date.now();

    if (now - lastCandle.time > 60000) {
      // New candle
      symbolCandles.shift();
      symbolCandles.push({
        time: now,
        open: newPrice,
        high: newPrice,
        low: newPrice,
        close: newPrice,
        volume: (BASE_PRICES[symbol] > 1000 ? 0.8 : 80) * (0.5 + Math.random()),
      });
    } else {
      lastCandle.high = Math.max(lastCandle.high, newPrice);
      lastCandle.low = Math.min(lastCandle.low, newPrice);
      lastCandle.close = newPrice;
      lastCandle.volume += (BASE_PRICES[symbol] > 1000 ? 0.05 : 5);
    }

    // Generate Order Book
    const orderBook = this.generateOrderBook(symbol, newPrice);

    // Generate Trade Tick
    const newTrade: TradeTick = {
      id: Math.random().toString(36).substring(2, 9),
      time: now,
      price: newPrice,
      size: Number(((Math.random() * (BASE_PRICES[symbol] > 1000 ? 0.5 : 50)) + 0.01).toFixed(3)),
      side: tickChangePercent >= 0 ? 'BUY' : 'SELL',
    };
    this.tradeHistory[symbol].unshift(newTrade);
    if (this.tradeHistory[symbol].length > 30) {
      this.tradeHistory[symbol].pop();
    }

    // 24h stats
    const firstCandle = symbolCandles[0];
    const change24h = Number((((newPrice - firstCandle.open) / firstCandle.open) * 100).toFixed(2));
    const high24h = Math.max(...symbolCandles.map((c) => c.high));
    const low24h = Math.min(...symbolCandles.map((c) => c.low));
    const volume24h = Number(symbolCandles.reduce((acc, c) => acc + c.volume, 0).toFixed(2));

    return {
      symbol,
      price: newPrice,
      change24h,
      high24h: Number(high24h.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      low24h: Number(low24h.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      volume24h,
      fundingRate: 0.0001 + Math.sin(now / 100000) * 0.00015,
      openInterest: 125000000 + Math.random() * 500000,
      openInterestChange24h: 3.42,
      longShortRatio: 1.68 + (Math.random() - 0.5) * 0.1,
      liquidations24h: { longs: 1240000, shorts: 480000 },
      orderBook,
      recentTrades: this.tradeHistory[symbol],
      candles: [...symbolCandles],
    };
  }

  private generateOrderBook(symbol: SymbolId, currentPrice: number): OrderBook {
    const step = symbol === 'XRPUSDT' ? 0.0005 : currentPrice > 1000 ? 10 : 0.5;
    const spread = step;
    const spreadPercent = (spread / currentPrice) * 100;

    const bids = [];
    const asks = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 10; i++) {
      const bidPrice = Number((currentPrice - spread / 2 - i * step).toFixed(symbol === 'XRPUSDT' ? 4 : 2));
      const askPrice = Number((currentPrice + spread / 2 + i * step).toFixed(symbol === 'XRPUSDT' ? 4 : 2));

      const bidSize = Number(((Math.random() * (BASE_PRICES[symbol] > 1000 ? 1.5 : 150)) + 0.1).toFixed(2));
      const askSize = Number(((Math.random() * (BASE_PRICES[symbol] > 1000 ? 1.5 : 150)) + 0.1).toFixed(2));

      bidTotal += bidSize;
      askTotal += askSize;

      bids.push({ price: bidPrice, size: bidSize, total: Number(bidTotal.toFixed(2)) });
      asks.push({ price: askPrice, size: askSize, total: Number(askTotal.toFixed(2)) });
    }

    const bidAskImbalance = (bidTotal - askTotal) / (bidTotal + askTotal);

    return {
      bids,
      asks,
      spread: Number(spread.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      spreadPercent: Number(spreadPercent.toFixed(4)),
      bidAskImbalance: Number(bidAskImbalance.toFixed(3)),
    };
  }

  public getCandles(symbol: SymbolId): Candle[] {
    return [...this.candles[symbol]];
  }
}

// Global Singleton Instance
export const marketEngine = new MarketEngine();
