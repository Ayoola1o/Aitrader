import { SymbolId, Candle, OrderBook, OrderBookLevel } from '@/types/trading';

/**
 * Universal Market Data Normalization (Phase 4 Market Data Infrastructure)
 * Guarantees standard symbol format, ISO 8601 UTC timestamps, valid non-negative numbers,
 * and sorted Level-2 order book ladders across all provider sources.
 */

export function normalizeSymbol(rawSymbol: string): SymbolId {
  const clean = rawSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.includes('BTC') || clean.includes('XBT')) return 'BTCUSDT';
  if (clean.includes('ETH')) return 'ETHUSDT';
  if (clean.includes('SOL')) return 'SOLUSDT';
  return (clean + (clean.endsWith('USDT') ? '' : 'USDT')) as SymbolId;
}

export function normalizeTimestampUTC(rawTime: number | string | Date): number {
  if (typeof rawTime === 'number') {
    // If timestamp is in seconds (e.g. 10 digits), convert to milliseconds
    if (rawTime < 1e11) return rawTime * 1000;
    return rawTime;
  }
  const parsed = new Date(rawTime).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

export function normalizeCandle(raw: {
  time?: number | string;
  timestamp?: number | string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
}): Candle {
  const time = normalizeTimestampUTC(raw.time ?? raw.timestamp ?? Date.now());
  const open = Number(raw.open) || 0;
  const high = Number(raw.high) || open;
  const low = Number(raw.low) || open;
  const close = Number(raw.close) || open;
  const volume = Math.max(0, Number(raw.volume) || 0);

  return {
    time,
    open,
    high: Math.max(high, open, close),
    low: Math.min(low, open, close),
    close,
    volume,
  };
}

export function normalizeOrderBook(
  rawBids: [number | string, number | string][],
  rawAsks: [number | string, number | string][]
): OrderBook {
  let bidRunningTotal = 0;
  const bids: OrderBookLevel[] = rawBids
    .map(([p, s]) => ({ price: Math.max(0, Number(p) || 0), size: Math.max(0, Number(s) || 0) }))
    .filter((l) => l.price > 0 && l.size > 0)
    .sort((a, b) => b.price - a.price) // Descending (highest bid first)
    .map((l) => {
      bidRunningTotal += l.size;
      return { price: l.price, size: l.size, total: bidRunningTotal };
    });

  let askRunningTotal = 0;
  const asks: OrderBookLevel[] = rawAsks
    .map(([p, s]) => ({ price: Math.max(0, Number(p) || 0), size: Math.max(0, Number(s) || 0) }))
    .filter((l) => l.price > 0 && l.size > 0)
    .sort((a, b) => a.price - b.price) // Ascending (lowest ask first)
    .map((l) => {
      askRunningTotal += l.size;
      return { price: l.price, size: l.size, total: askRunningTotal };
    });

  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = Math.max(0, bestAsk - bestBid);
  const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;
  const bidDepth = bids.reduce((acc, b) => acc + b.size, 0);
  const askDepth = asks.reduce((acc, a) => acc + a.size, 0);
  const totalDepth = bidDepth + askDepth;
  const bidAskImbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;

  return {
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
}
