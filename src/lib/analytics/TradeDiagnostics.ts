import { TradeHistoryItem } from '@/types/trading';

export interface ComprehensiveTradeDiagnostics {
  bestTrade: { tradeId: string; pnl: number; symbol: string } | null;
  worstTrade: { tradeId: string; pnl: number; symbol: string } | null;
  averageTradePnL: number;
  largestWinUsd: number;
  largestLossUsd: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: { type: 'WIN' | 'LOSS' | 'NONE'; count: number };
  recoveryFactor: number; // Net PnL / Max Drawdown Usd
  averageHoldingPeriodMinutes: number;
}

export class TradeDiagnostics {
  /**
   * Analyzes consecutive streaks, extreme outcomes, and recovery metrics
   */
  static analyze(trades: TradeHistoryItem[], maxDrawdownUsd = 0): ComprehensiveTradeDiagnostics {
    if (trades.length === 0) {
      return {
        bestTrade: null,
        worstTrade: null,
        averageTradePnL: 0,
        largestWinUsd: 0,
        largestLossUsd: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        currentStreak: { type: 'NONE', count: 0 },
        recoveryFactor: 0,
        averageHoldingPeriodMinutes: 0,
      };
    }

    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let totalPnL = 0;
    let totalHoldMs = 0;

    let bestTrade: { tradeId: string; pnl: number; symbol: string } | null = null;
    let worstTrade: { tradeId: string; pnl: number; symbol: string } | null = null;
    let largestWin = 0;
    let largestLoss = 0;

    for (const t of trades) {
      const pnl = t.realizedPnL || 0;
      totalPnL += pnl;

      if (t.openedAt && t.closedAt && t.closedAt >= t.openedAt) {
        totalHoldMs += t.closedAt - t.openedAt;
      }

      if (bestTrade === null || pnl > bestTrade.pnl) {
        bestTrade = { tradeId: t.id, pnl, symbol: t.symbol };
      }
      if (worstTrade === null || pnl < worstTrade.pnl) {
        worstTrade = { tradeId: t.id, pnl, symbol: t.symbol };
      }

      if (pnl > 0) {
        if (pnl > largestWin) largestWin = pnl;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (pnl < 0) {
        if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    }

    const currentStreakType = currentWinStreak > 0 ? 'WIN' : currentLossStreak > 0 ? 'LOSS' : 'NONE';
    const currentStreakCount = Math.max(currentWinStreak, currentLossStreak);
    const avgPnL = totalPnL / trades.length;
    const avgHoldMins = Math.round(totalHoldMs / (trades.length * 60000));
    const recoveryFactor = maxDrawdownUsd > 0 ? totalPnL / maxDrawdownUsd : totalPnL > 0 ? 99.9 : 0;

    return {
      bestTrade,
      worstTrade,
      averageTradePnL: Number(avgPnL.toFixed(2)),
      largestWinUsd: Number(largestWin.toFixed(2)),
      largestLossUsd: Number(largestLoss.toFixed(2)),
      maxConsecutiveWins: maxWinStreak,
      maxConsecutiveLosses: maxLossStreak,
      currentStreak: { type: currentStreakType, count: currentStreakCount },
      recoveryFactor: Number(recoveryFactor.toFixed(2)),
      averageHoldingPeriodMinutes: avgHoldMins,
    };
  }
}
