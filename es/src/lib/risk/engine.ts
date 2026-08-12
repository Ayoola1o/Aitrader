import { LLMDecision, MarketSnapshot, FeatureVector, RiskCheckResult, PortfolioState } from '@/types/trading';

export class DeterministicRiskEngine {
  private maxAllowedPositionPercent = 2.0; // 2% max per trade
  private maxDailyDrawdownPercent = 5.0; // 5% daily loss limit
  private minRiskRewardRatio = 2.0; // 2:1 minimum R:R
  private maxAllowedSpreadPercent = 0.05; // 0.05% max spread

  public evaluateRisk(
    decision: LLMDecision,
    snapshot: MarketSnapshot,
    features: FeatureVector,
    portfolio: PortfolioState
  ): RiskCheckResult {
    const failedGates: string[] = [];
    const warnings: string[] = [];

    // If decision is HOLD or NO_TRADE, no order placement needed
    if (decision.action === 'HOLD' || decision.action === 'BUY' === false && decision.action === 'SELL' === false) {
      return {
        approved: false,
        failedGates: [],
        warnings: ['Action is HOLD or NO_TRADE'],
        maxAllowedPositionSize: 0,
        riskRewardRatio: 0,
        dailyDrawdownPercent: portfolio.dailyDrawdownPercent,
        newsKillSwitchActive: false,
      };
    }

    // 1. Daily Drawdown Limit
    if (portfolio.dailyDrawdownPercent >= this.maxDailyDrawdownPercent) {
      failedGates.push(`Daily drawdown limit exceeded (${portfolio.dailyDrawdownPercent.toFixed(2)}% >= ${this.maxDailyDrawdownPercent}%).`);
    }

    // 2. Risk:Reward Ratio Gate
    let rrRatio = 0;
    if (decision.entry && decision.stopLoss && decision.takeProfit) {
      const risk = Math.abs(decision.entry - decision.stopLoss);
      const reward = Math.abs(decision.takeProfit - decision.entry);
      rrRatio = risk > 0 ? reward / risk : 0;

      if (rrRatio < this.minRiskRewardRatio) {
        failedGates.push(`Risk:Reward ratio (${rrRatio.toFixed(2)}) is below mandatory minimum (${this.minRiskRewardRatio}).`);
      }
    } else {
      failedGates.push('Missing Entry, Stop Loss, or Take Profit target prices.');
    }

    // 3. Position Size Gate
    if (decision.riskPercent > this.maxAllowedPositionPercent) {
      failedGates.push(`Requested risk size (${decision.riskPercent}%) exceeds maximum limit (${this.maxAllowedPositionPercent}%).`);
    }

    // 4. Spread & Liquidity Gate
    const spreadPct = snapshot.orderBook.spreadPercent;
    if (spreadPct > this.maxAllowedSpreadPercent) {
      failedGates.push(`Market spread (${spreadPct.toFixed(3)}%) exceeds acceptable limit (${this.maxAllowedSpreadPercent}%).`);
    }

    // 5. News Event Kill Switch
    const newsKillSwitchActive = features.minutesToNextEvent <= 15;
    if (newsKillSwitchActive) {
      failedGates.push(`News Kill Switch Active: High-impact economic event scheduled within ${features.minutesToNextEvent} minutes.`);
    }

    // 6. Volatility & Crowding Warning
    if (features.volPercentile > 0.90) {
      warnings.push(`Extremely high realized volatility (${(features.volPercentile * 100).toFixed(0)}th percentile).`);
    }
    if (features.crowdedPositioning !== 'NONE') {
      warnings.push(`Crowded ${features.crowdedPositioning} positioning detected.`);
    }

    const approved = failedGates.length === 0;

    return {
      approved,
      failedGates,
      warnings,
      maxAllowedPositionSize: this.maxAllowedPositionPercent,
      riskRewardRatio: Number(rrRatio.toFixed(2)),
      dailyDrawdownPercent: portfolio.dailyDrawdownPercent,
      newsKillSwitchActive,
    };
  }
}

export const deterministicRiskEngine = new DeterministicRiskEngine();
