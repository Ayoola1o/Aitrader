'use client';

import { SymbolId, OrderBook, OrderBookLevel } from '@/types/trading';

interface DepthUpdateEvent {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: [string, string][]; // Bids [price, qty]
  a: [string, string][]; // Asks [price, qty]
}

export class L2OrderBookManager {
  private localBooks: Partial<Record<SymbolId, {
    bids: Map<number, number>; // price -> size
    asks: Map<number, number>; // price -> size
    lastUpdateId: number;
    lastSyncedAt: number;
  }>> = {};

  private wsClients: Partial<Record<SymbolId, WebSocket>> = {};
  private reconnectTimers: Partial<Record<SymbolId, NodeJS.Timeout>> = {};
  private isResyncing: Partial<Record<SymbolId, boolean>> = {};

  constructor() {
    // Lazy initialize on first symbol request
  }

  /**
   * Get the live local L2 order book for a symbol.
   * If not yet started, triggers REST snapshot + WebSocket depth stream.
   */
  public async getOrderBook(symbol: SymbolId): Promise<OrderBook> {
    if (!this.localBooks[symbol]) {
      await this.initSymbol(symbol);
    }

    const book = this.localBooks[symbol];
    if (!book || book.bids.size === 0 || book.asks.size === 0) {
      return {
        bids: [],
        asks: [],
        spread: 0,
        spreadPercent: 0,
        bidAskImbalance: 0,
        bidDepth: 0,
        askDepth: 0,
        midPrice: 0,
        status: 'UNAVAILABLE',
      };
    }

    // Sort bids descending, asks ascending
    const sortedBids = Array.from(book.bids.entries())
      .filter(([_, size]) => size > 0)
      .sort((a, b) => b[0] - a[0])
      .slice(0, 20);

    const sortedAsks = Array.from(book.asks.entries())
      .filter(([_, size]) => size > 0)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 20);

    let bidTotal = 0;
    const bidLevels: OrderBookLevel[] = sortedBids.map(([price, size]) => {
      bidTotal += size;
      return { price, size, total: bidTotal };
    });

    let askTotal = 0;
    const askLevels: OrderBookLevel[] = sortedAsks.map(([price, size]) => {
      askTotal += size;
      return { price, size, total: askTotal };
    });

    const bestBid = bidLevels[0]?.price || 0;
    const bestAsk = askLevels[0]?.price || 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const midPrice = bestAsk > 0 && bestBid > 0 ? (bestBid + bestAsk) / 2 : bestBid;
    const spreadPercent = midPrice > 0 ? spread / midPrice : 0;
    const imbalance = bidTotal + askTotal > 0 ? (bidTotal - askTotal) / (bidTotal + askTotal) : 0;

    return {
      bids: bidLevels,
      asks: askLevels,
      spread: Number(spread.toFixed(2)),
      spreadPercent,
      bidAskImbalance: Number(imbalance.toFixed(4)),
      bidDepth: Number(bidTotal.toFixed(4)),
      askDepth: Number(askTotal.toFixed(4)),
      midPrice: Number(midPrice.toFixed(2)),
      status: 'LIVE',
    };
  }

  /**
   * Initializes REST snapshot + WebSocket stream for symbol
   */
  public async initSymbol(symbol: SymbolId) {
    if (this.isResyncing[symbol]) return;
    this.isResyncing[symbol] = true;

    try {
      // 1. Fetch initial REST depth snapshot
      const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const snap = await res.json();
        const bidsMap = new Map<number, number>();
        const asksMap = new Map<number, number>();

        if (Array.isArray(snap.bids)) {
          snap.bids.forEach(([p, q]: [string, string]) => {
            bidsMap.set(parseFloat(p), parseFloat(q));
          });
        }
        if (Array.isArray(snap.asks)) {
          snap.asks.forEach(([p, q]: [string, string]) => {
            asksMap.set(parseFloat(p), parseFloat(q));
          });
        }

        this.localBooks[symbol] = {
          bids: bidsMap,
          asks: asksMap,
          lastUpdateId: snap.lastUpdateId || Date.now(),
          lastSyncedAt: Date.now(),
        };

        // 2. Start WebSocket depth stream if in browser environment
        if (typeof window !== 'undefined') {
          this.connectWebSocket(symbol);
        }
      }
    } catch (err) {
      console.warn(`[L2OrderBook] Initial REST snapshot error on ${symbol}:`, err);
    } finally {
      this.isResyncing[symbol] = false;
    }
  }

  /**
   * Connects to Binance live WebSocket depth stream with sequence validation
   */
  private connectWebSocket(symbol: SymbolId) {
    if (this.wsClients[symbol]) {
      try {
        this.wsClients[symbol]?.close();
      } catch {}
    }

    const streamSym = symbol.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamSym}@depth@100ms`;

    try {
      const ws = new WebSocket(wsUrl);
      this.wsClients[symbol] = ws;

      ws.onmessage = (event) => {
        try {
          const data: DepthUpdateEvent = JSON.parse(event.data);
          const book = this.localBooks[symbol];
          if (!book) return;

          // Sequence validation: ignore events older than snapshot
          if (data.u <= book.lastUpdateId) return;

          // Apply bid updates (size 0 removes level)
          if (Array.isArray(data.b)) {
            data.b.forEach(([pStr, qStr]) => {
              const p = parseFloat(pStr);
              const q = parseFloat(qStr);
              if (q === 0) {
                book.bids.delete(p);
              } else {
                book.bids.set(p, q);
              }
            });
          }

          // Apply ask updates (size 0 removes level)
          if (Array.isArray(data.a)) {
            data.a.forEach(([pStr, qStr]) => {
              const p = parseFloat(pStr);
              const q = parseFloat(qStr);
              if (q === 0) {
                book.asks.delete(p);
              } else {
                book.asks.set(p, q);
              }
            });
          }

          book.lastUpdateId = data.u;
          book.lastSyncedAt = Date.now();
        } catch {}
      };

      ws.onerror = () => {
        this.scheduleReconnect(symbol);
      };

      ws.onclose = () => {
        this.scheduleReconnect(symbol);
      };
    } catch {
      this.scheduleReconnect(symbol);
    }
  }

  private scheduleReconnect(symbol: SymbolId) {
    if (this.reconnectTimers[symbol]) return;
    this.reconnectTimers[symbol] = setTimeout(() => {
      delete this.reconnectTimers[symbol];
      this.initSymbol(symbol);
    }, 4000);
  }
}

export const l2OrderBookManager = new L2OrderBookManager();
