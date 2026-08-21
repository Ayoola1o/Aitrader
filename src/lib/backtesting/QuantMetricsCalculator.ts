export interface SimulatedTradeRecord {
  tradeId: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  fee: number;
  slippage: number;
  rMultiple: number;
  entryTime: number;
  exitTime: number;
  closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL' | 'TIMEOUT';
}

export interface ComprehensiveQuantMetrics {
  initialCapital: number;
  finalEquity: number;
  netPnL: number;
  grossProfit: number;
  grossLoss: number;
  totalReturnPercent: number;
  annualizedReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  lossRate: number;
  averageWin: number;
  averageLoss: number;
  winLossRatio: number;
  expectancy: number; // in USD
  expectancyR: number; // in R-units
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPercent: number;
  maxDrawdownUsd: number;
  drawdownDurationHours: number;
  averageR: number;
  totalFeesPaid: number;
  totalSlippageIncurred: number;
}

export class QuantMetricsCalculator {
  /**
   * Calculates mathematically rigorous quantitative performance metrics (Phase 5)
   */
  calculate(
    trades: SimulatedTradeRecord[],
    initialCapital = 100000.0,
    riskFreeRateAnnual = 0.04
  ): ComprehensiveQuantMetrics {
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        initialCapital,
        finalEquity: initialCapital,
        netPnL: 0,
        grossProfit: 0,
        grossLoss: 0,
        totalReturnPercent: 0,
        annualizedReturnPercent: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        lossRate: 0,
        averageWin: 0,
        averageLoss: 0,
        winLossRatio: 0,
        expectancy: 0,
        expectancyR: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdownPercent: 0,
        maxDrawdownUsd: 0,
        drawdownDurationHours: 0,
        averageR: 0,
        totalFeesPaid: 0,
        totalSlippageIncurred: 0,
      };
    }

    let grossProfit = 0;
    let grossLoss = 0;
    let totalFeesPaid = 0;
    let totalSlippageIncurred = 0;
    let totalR = 0;
    const wins: number[] = [];
    const losses: number[] = [];
    const returns: number[] = [];

    let currentEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownUsd = 0;
    let maxDrawdownPercent = 0;
    let maxDdDurationHours = 0;
    let currentDdStart = trades[0]?.entryTime || 0;

    for (const t of trades) {
      const pnl = t.realizedPnL;
      totalFeesPaid += t.fee || 0;
      totalSlippageIncurred += t.slippage || 0;
      totalR += t.rMultiple || 0;

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
        currentDdStart = t.exitTime;
      } else {
        const ddUsd = peakEquity - currentEquity;
        const ddPct = peakEquity > 0 ? (ddUsd / peakEquity) * 100 : 0;
        if (ddPct > maxDrawdownPercent) {
          maxDrawdownPercent = ddPct;
          maxDrawdownUsd = ddUsd;
        }
        const durationH = (t.exitTime - currentDdStart) / (1000 * 3600);
        if (durationH > maxDdDurationHours) {
          maxDdDurationHours = durationH;
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
    const winLossRatio = averageLoss > 0 ? averageWin / averageLoss : averageWin > 0 ? 10 : 0;

    // Expectancy in USD: (WinRate * AvgWin) - (LossRate * AvgLoss)
    const expectancy = (winRate / 100) * averageWin - (lossRate / 100) * averageLoss;
    const averageR = totalR / totalTrades;
    const expectancyR = averageR;

    // Profit Factor: GrossProfit / GrossLoss
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    // Sharpe & Sortino Ratios (Annualized)
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - meanReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const downsideReturns = returns.filter((r) => r < 0);
    const downsideVariance =
      downsideReturns.length > 0
        ? downsideReturns.reduce((a, b) => a + b ** 2, 0) / downsideReturns.length
        : 0.0001;
    const downsideStdDev = Math.sqrt(downsideVariance);

    const tradesPerYear = Math.max(10, totalTrades * (365 / Math.max(1, (trades[trades.length - 1].exitTime - trades[0].entryTime) / (1000 * 86400))));
    const annualizedReturn = meanReturn * tradesPerYear;
    const annualizedStdDev = stdDev * Math.sqrt(tradesPerYear);
    const annualizedDownsideStdDev = downsideStdDev * Math.sqrt(tradesPerYear);

    const sharpeRatio =
      annualizedStdDev > 0 ? (annualizedReturn - riskFreeRateAnnual) / annualizedStdDev : 0;
    const sortinoRatio =
      annualizedDownsideStdDev > 0
        ? (annualizedReturn - riskFreeRateAnnual) / annualizedDownsideStdDev
        : 0;

    // Calmar Ratio: Annualized Return / Max Drawdown %
    const calmarRatio =
      maxDrawdownPercent > 0 ? (totalReturnPercent) / maxDrawdownPercent : 0;

    return {
      initialCapital,
      finalEquity: Number(currentEquity.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
      annualizedReturnPercent: Number((annualizedReturn * 100).toFixed(2)),
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: Number(winRate.toFixed(2)),
      lossRate: Number(lossRate.toFixed(2)),
      averageWin: Number(averageWin.toFixed(2)),
      averageLoss: Number(averageLoss.toFixed(2)),
      winLossRatio: Number(winLossRatio.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
      expectancyR: Number(expectancyR.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      sortinoRatio: Number(sortinoRatio.toFixed(2)),
      calmarRatio: Number(calmarRatio.toFixed(2)),
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
      maxDrawdownUsd: Number(maxDrawdownUsd.toFixed(2)),
      drawdownDurationHours: Number(maxDdDurationHours.toFixed(1)),
      averageR: Number(averageR.toFixed(2)),
      totalFeesPaid: Number(totalFeesPaid.toFixed(2)),
      totalSlippageIncurred: Number(totalSlippageIncurred.toFixed(2)),
    };
  }
}

export const quantMetricsCalculator = new QuantMetricsCalculator();
