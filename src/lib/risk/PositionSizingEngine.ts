'use client';

import { SymbolId, RegimeType } from '@/types/trading';

export interface PositionSizingParams {
  symbol: SymbolId;
  entryPrice: number;
  stopLossPrice: number | null;
  accountEquity: number;
  riskPercent: number; // e.g. 0.5% - 2.0%
  regime?: RegimeType;
  maxPositionSizeUsd?: number;
  leverage?: number;
}

export interface PositionSizingResult {
  sizeUnits: number;
  sizeUsd: number;
  riskDollars: number;
  riskRewardRatio: number;
  isCapped: boolean;
  sizingReason: string;
}

export class PositionSizingEngine {
  /**
   * Deterministic institutional position sizing formula.
   * Calculates size based on dollar risk = accountEquity * riskPercent,
   * divided by per-unit stop loss distance ($entry - $stopLoss).
   */
  public calculateSize(params: PositionSizingParams): PositionSizingResult {
    const {
      entryPrice,
      stopLossPrice,
      accountEquity,
      riskPercent = 0.5,
      regime = 'RANGING',
      maxPositionSizeUsd,
      leverage = 1,
    } = params;

    if (entryPrice <= 0 || accountEquity <= 0) {
      return {
        sizeUnits: 0,
        sizeUsd: 0,
        riskDollars: 0,
        riskRewardRatio: 0,
        isCapped: false,
        sizingReason: 'Invalid entry price or account equity',
      };
    }

    // 1. Calculate Dollar Risk per Trade
    const targetRiskPct = Math.min(Math.max(riskPercent, 0.1), 5.0) / 100;
    let riskDollars = accountEquity * targetRiskPct;

    // 2. Regime Volatility Deflation
    if (regime === 'HIGH_VOLATILITY') {
      riskDollars *= 0.65; // Deflate risk in turbulent regimes
    } else if (regime === 'TRANSITION') {
      riskDollars *= 0.80;
    }

    // 3. Stop Distance
    const stopDistance = stopLossPrice && stopLossPrice > 0
      ? Math.abs(entryPrice - stopLossPrice)
      : entryPrice * 0.015; // default 1.5% stop distance if none given

    const stopDistancePct = stopDistance / entryPrice;

    // 4. Calculate Units: Size = Risk Dollars / Stop Distance
    let rawUnits = riskDollars / stopDistance;
    let sizeUsd = rawUnits * entryPrice;

    // 5. Apply Max Capital Caps & Leverage Bounds
    const maxAllowedUsd = maxPositionSizeUsd
      ? Math.min(maxPositionSizeUsd, accountEquity * leverage * 0.5)
      : accountEquity * leverage * 0.25;

    let isCapped = false;
    if (sizeUsd > maxAllowedUsd) {
      sizeUsd = maxAllowedUsd;
      rawUnits = sizeUsd / entryPrice;
      isCapped = true;
    }

    // Precision formatting based on asset price
    const decimals = entryPrice > 1000 ? 4 : entryPrice > 10 ? 2 : 1;
    const sizeUnits = Number(rawUnits.toFixed(decimals));

    return {
      sizeUnits,
      sizeUsd: Number((sizeUnits * entryPrice).toFixed(2)),
      riskDollars: Number(riskDollars.toFixed(2)),
      riskRewardRatio: 2.5,
      isCapped,
      sizingReason: isCapped
        ? `Capped at max allowed allocation of $${maxAllowedUsd.toLocaleString()}`
        : `Sized for $${riskDollars.toFixed(2)} risk (${(stopDistancePct * 100).toFixed(2)}% stop distance)`,
    };
  }
}

export const positionSizingEngine = new PositionSizingEngine();
