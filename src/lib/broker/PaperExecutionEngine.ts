'use client';

import { SymbolId, Order, Position, TradeHistoryItem, OrderBook } from '@/types/trading';

export interface ExecutionFill {
  orderId: string;
  symbol: SymbolId;
  side: 'BUY' | 'SELL';
  requestedSize: number;
  filledSize: number;
  unfilledSize: number;
  requestedPrice: number;
  fillPrice: number;
  vwapPrice: number;
  spreadCostDollars: number;
  marketImpactDollars: number;
  slippage: number;
  slippageDollars: number;
  fee: number;
  feePercent: number;
  timestamp: number;
  isPartial: boolean;
}

export class PaperExecutionEngine {
  private takerFeePercent = 0.0005; // 0.05%
  private makerFeePercent = 0.0002; // 0.02%

  /**
   * Institutional Execution Simulation (Item 5):
   * Consumes actual L2 OrderBook depth level by level:
   * 1. Walks bid/ask levels
   * 2. Consumes available liquidity
   * 3. Calculates VWAP fill price
   * 4. Calculates spread cost
   * 5. Calculates market impact
   * 6. Calculates slippage
   * 7. Applies taker fees
   * 8. Supports partial fills & returns remaining unfilled quantity
   */
  public executeMarketOrder(params: {
    orderId: string;
    symbol: SymbolId;
    side: 'BUY' | 'SELL';
    size: number;
    marketPrice: number;
    orderBook?: OrderBook;
    allowPartialFills?: boolean;
  }): ExecutionFill {
    const {
      orderId,
      symbol,
      side,
      size,
      marketPrice,
      orderBook,
      allowPartialFills = false,
    } = params;

    if (size <= 0 || marketPrice <= 0) {
      return {
        orderId,
        symbol,
        side,
        requestedSize: size,
        filledSize: 0,
        unfilledSize: size,
        requestedPrice: marketPrice,
        fillPrice: marketPrice,
        vwapPrice: marketPrice,
        spreadCostDollars: 0,
        marketImpactDollars: 0,
        slippage: 0,
        slippageDollars: 0,
        fee: 0,
        feePercent: this.takerFeePercent,
        timestamp: Date.now(),
        isPartial: false,
      };
    }

    const levels = side === 'BUY' ? orderBook?.asks || [] : orderBook?.bids || [];

    let remainingSize = size;
    let filledNotional = 0;
    let filledSize = 0;

    // 1. Walk actual L2 order book depth levels
    if (levels.length > 0) {
      for (const lvl of levels) {
        if (remainingSize <= 0) break;
        const fillAtLevel = Math.min(remainingSize, lvl.size);
        filledNotional += fillAtLevel * lvl.price;
        filledSize += fillAtLevel;
        remainingSize -= fillAtLevel;
      }
    }

    // 2. Fill remaining quantity or mark as unfilled if partial fills strictly limited
    let unfilledSize = 0;
    if (remainingSize > 0) {
      if (allowPartialFills && filledSize > 0) {
        unfilledSize = remainingSize;
      } else {
        const halfSpread = (orderBook?.spread || marketPrice * 0.0002) / 2;
        const basePrice = side === 'BUY' ? marketPrice + halfSpread : marketPrice - halfSpread;
        filledNotional += remainingSize * basePrice;
        filledSize += remainingSize;
        remainingSize = 0;
      }
    }

    const vwapPrice = filledSize > 0 ? filledNotional / filledSize : marketPrice;
    const fillPrice = Number(vwapPrice.toFixed(marketPrice > 100 ? 2 : 4));

    const spreadCostDollars = orderBook && orderBook.spread > 0 ? (orderBook.spread / 2) * filledSize : 0;
    const slippageDollars = Math.abs(fillPrice - marketPrice) * filledSize;
    const marketImpactDollars = Math.max(0, slippageDollars - spreadCostDollars);
    const slippagePct = marketPrice > 0 ? Math.abs(fillPrice - marketPrice) / marketPrice : 0;
    const fee = Number((filledNotional * this.takerFeePercent).toFixed(2));

    return {
      orderId,
      symbol,
      side,
      requestedSize: size,
      filledSize,
      unfilledSize,
      requestedPrice: marketPrice,
      fillPrice,
      vwapPrice: fillPrice,
      spreadCostDollars: Number(spreadCostDollars.toFixed(2)),
      marketImpactDollars: Number(marketImpactDollars.toFixed(2)),
      slippage: slippagePct,
      slippageDollars: Number(slippageDollars.toFixed(2)),
      fee,
      feePercent: this.takerFeePercent,
      timestamp: Date.now(),
      isPartial: unfilledSize > 0,
    };
  }
}

export const paperExecutionEngine = new PaperExecutionEngine();
