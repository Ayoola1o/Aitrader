import { TradeHistoryItem, PortfolioState, AppMode } from '@/types/trading';

export interface StandardAnalyticsReport {
  mode: AppMode | 'SIMULATED';
  initialCapital: number;
  currentEquity: number;
  netPnL: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  expectancyUsd: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPercent: number;
  maxDrawdownUsd: number;
  averageHoldingTimeMinutes: number;
  totalFees: number;
  totalSlippage: number;
  generatedAt: string;
}

export class AnalyticsEngine {
  /**
   * Generates a standardized, truth-verified analytics report from raw ledger trades
   */
  generateReport(
    trades: TradeHistoryItem[],
    initialCapital = 100000.0,
    mode: AppMode | 'SIMULATED' = 'PAPER'
  ): StandardAnalyticsReport {
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        mode,
        initialCapital,
        currentEquity: initialCapital,
        netPnL: 0,
        totalReturnPercent: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        lossRate: 0,
        profitFactor: 0,
        expectancyUsd: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdownPercent: 0,
        maxDrawdownUsd: 0,
        averageHoldingTimeMinutes: 0,
        totalFees: 0,
        totalSlippage: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    let grossProfit = 0;
    let grossLoss = 0;
    let totalFees = 0;
    let totalSlippage = 0;
    let totalHoldingTimeMs = 0;
    const wins: number[] = [];
    const losses: number[] = [];
    const returns: number[] = [];

    let currentEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownUsd = 0;
    let maxDrawdownPercent = 0;

    for (const t of trades) {
      const pnl = t.realizedPnL || 0;
      totalFees += t.fee || 0;
      totalSlippage += t.slippage || 0;

      if (t.openedAt && t.closedAt && t.closedAt >= t.openedAt) {
        totalHoldingTimeMs += t.closedAt - t.openedAt;
      }

      const tradeReturn = currentEquity > 0 ? pnl / currentEquity : 0;
      returns.push(tradeReturn);

      if (pnl > 0) {
        grossProfit += pnl;
        wins.push(pnl);
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl);
        losses.push(Math.abs(pnl));
      }

      currentEquity += pnl;

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      } else {
        const ddUsd = peakEquity - currentEquity;
        const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;
        if (ddPct > maxDrawdownPercent) {
          maxDrawdownPercent = ddPct;
          maxDrawdownUsd = ddUsd;
        }
      }
    }

    const netPnL = currentEquity - initialCapital;
    const totalReturnPercent = (netPnL / initialCapital) * 100;
    const winningTrades = wins.length;
    const losingTrades = losses.length;
    const winRate = (winningTrades / totalTrades) * 100;
    const lossRate = (losingTrades / totalTrades) * 100;

    const averageWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
    const expectancyUsd = (winRate / 100) * averageWin - (lossRate / 100) * averageLoss;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    // Annualized Sharpe & Sortino
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const downsideReturns = returns.filter((r) => r < 0);
    const downsideStdDev =
      downsideReturns.length > 0
        ? Math.sqrt(downsideReturns.reduce((a, b) => a + b ** 2, 0) / downsideReturns.length)
        : 0.0001;

    const tradesPerYear = 252;
    const annualizedReturn = meanReturn * tradesPerYear;
    const sharpeRatio = stdDev > 0 ? (annualizedReturn - 0.04) / (stdDev * Math.sqrt(tradesPerYear)) : 0;
    const sortinoRatio = downsideStdDev > 0 ? (annualizedReturn - 0.04) / (downsideStdDev * Math.sqrt(tradesPerYear)) : 0;
    const calmarRatio = maxDrawdownPercent > 0 ? totalReturnPercent / maxDrawdownPercent : 0;

    const averageHoldingTimeMinutes = totalTrades > 0 ? Math.round(totalHoldingTimeMs / (totalTrades * 60000)) : 0;

    return {
      mode,
      initialCapital,
      currentEquity: Number(currentEquity.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: Number(winRate.toFixed(2)),
      lossRate: Number(lossRate.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      expectancyUsd: Number(expectancyUsd.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      sortinoRatio: Number(sortinoRatio.toFixed(2)),
      calmarRatio: Number(calmarRatio.toFixed(2)),
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
      maxDrawdownUsd: Number(maxDrawdownUsd.toFixed(2)),
      averageHoldingTimeMinutes,
      totalFees: Number(totalFees.toFixed(2)),
      totalSlippage: Number(totalSlippage.toFixed(2)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
