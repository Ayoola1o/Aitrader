import { SymbolId, MarketSnapshot, OrderBook, TradeTick } from '@/types/trading';

export class LiveMarketWebSocket {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private activeSymbol: SymbolId = 'BTCUSDT';
  private onSnapshotCallback?: (snapshot: Partial<MarketSnapshot>) => void;

  public connect(symbol: SymbolId, onSnapshot: (snapshot: Partial<MarketSnapshot>) => void) {
    this.activeSymbol = symbol;
    this.onSnapshotCallback = onSnapshot;

    const streamSymbol = symbol.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamSymbol}@ticker/${streamSymbol}@depth10@100ms/${streamSymbol}@trade`;

    try {
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 24h Ticker Stream
          if (data.e === '24hrTicker') {
            const price = parseFloat(data.c);
            const change24h = parseFloat(data.P);
            const high24h = parseFloat(data.h);
            const low24h = parseFloat(data.l);
            const volume24h = parseFloat(data.v);

            this.onSnapshotCallback?.({
              price,
              change24h,
              high24h,
              low24h,
              volume24h,
            });
          }

          // Depth Order Book Stream
          if (data.bids && data.asks) {
            const bids = data.bids.slice(0, 10).map(([p, s]: [string, string]) => ({
              price: parseFloat(p),
              size: parseFloat(s),
              total: parseFloat(p) * parseFloat(s),
            }));
            const asks = data.asks.slice(0, 10).map(([p, s]: [string, string]) => ({
              price: parseFloat(p),
              size: parseFloat(s),
              total: parseFloat(p) * parseFloat(s),
            }));

            const spread = asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0;
            const spreadPercent = bids.length > 0 ? (spread / bids[0].price) * 100 : 0;
            const bidTotal = bids.reduce((acc: number, b: { size: number }) => acc + b.size, 0);
            const askTotal = asks.reduce((acc: number, a: { size: number }) => acc + a.size, 0);
            const bidAskImbalance = (bidTotal - askTotal) / (bidTotal + askTotal || 1);

            const orderBook: OrderBook = {
              bids,
              asks,
              spread: parseFloat(spread.toFixed(4)),
              spreadPercent: parseFloat(spreadPercent.toFixed(4)),
              bidAskImbalance: parseFloat(bidAskImbalance.toFixed(3)),
              bidDepth: bidTotal,
              askDepth: askTotal,
              midPrice: bids.length > 0 && asks.length > 0 ? (bids[0].price + asks[0].price) / 2 : 0,
            };

            this.onSnapshotCallback?.({ orderBook });
          }
        } catch {
          // Ignore parsing errors
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const liveMarketWebSocket = new LiveMarketWebSocket();
