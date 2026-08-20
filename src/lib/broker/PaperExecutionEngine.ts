'use client';

import { SymbolId, Order, Position, TradeHistoryItem } from '@/types/trading';

export interface ExecutionFill {
  orderId: string;
  symbol: SymbolId;
  side: 'BUY' | 'SELL';
  requestedSize: number;
  filledSize: number;
  requestedPrice: number;
  fillPrice: number;
  slippage: number;
  slippageDollars: number;
  fee: number;
  feePercent: number;
  timestamp: number;
  isPartial: boolean;
}

export class PaperExecutionEngine {
  private makerFeePercent = 0.0002; // 0.02%
  private takerFeePercent = 0.0005; // 0.05%
  private baseSlippagePercent = 0.0002; // 0.02%

  /**
   * Institutional Execution Simulation:
   * 1. Consumes spread and order book depth
   * 2. Calculates dynamic slippage based on trade size vs typical depth
   * 3. Applies taker/maker fees
   * 4. Determines fill price and fills
   */
  public executeMarketOrder(params: {
    orderId: string;
    symbol: SymbolId;
    side: 'BUY' | 'SELL';
    size: number;
    marketPrice: number;
    spread?: number;
    orderBookDepth?: number;
    volatilityMultiplier?: number;
  }): ExecutionFill {
    const {
      orderId,
      symbol,
      side,
      size,
      marketPrice,
      spread = marketPrice * 0.0002,
      orderBookDepth = 10.0, // BTC depth
      volatilityMultiplier = 1.0,
    } = params;

    // 1. Half-Spread Crossing
    const halfSpread = spread / 2;
    const baseExecutionPrice = side === 'BUY' ? marketPrice + halfSpread : marketPrice - halfSpread;

    // 2. Size Impact & Dynamic Slippage
    // Size relative to top book depth creates nonlinear market impact
    const depthRatio = Math.min(size / Math.max(orderBookDepth, 0.1), 2.0);
    const sizeImpactSlippage = (this.baseSlippagePercent + depthRatio * 0.0003) * volatilityMultiplier;

    const slippageMultiplier = side === 'BUY' ? (1 + sizeImpactSlippage) : (1 - sizeImpactSlippage);
    const fillPrice = Number((baseExecutionPrice * slippageMultiplier).toFixed(marketPrice > 100 ? 2 : 4));

    const slippageDollars = Math.abs(fillPrice - marketPrice) * size;
    const notionalValue = fillPrice * size;
    const fee = Number((notionalValue * this.takerFeePercent).toFixed(2));

    return {
      orderId,
      symbol,
      side,
      requestedSize: size,
      filledSize: size,
      requestedPrice: marketPrice,
      fillPrice,
      slippage: sizeImpactSlippage,
      slippageDollars,
      fee,
      feePercent: this.takerFeePercent,
      timestamp: Date.now(),
      isPartial: false,
    };
  }
}

export const paperExecutionEngine = new PaperExecutionEngine();
