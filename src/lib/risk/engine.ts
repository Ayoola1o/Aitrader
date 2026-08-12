import { LLMDecision, RiskCheckResult, PortfolioState, MarketSnapshot, FeatureVector } from '@/types/trading';

interface RiskConfig {
  maxPositionRiskPercent: number; // e.g. 0.5 = 0.5%
  maxDailyDrawdownPercent: number;
  minRiskReward: number;
  maxSpreadPercent: number;
  newsKillSwitch: boolean;
}

const DEFAULT_RISK: RiskConfig = {
  maxPositionRiskPercent: 0.5,
  maxDailyDrawdownPercent: 5.0,
  minRiskReward: 2.0,
  maxSpreadPercent: 0.3, // 0.3% max spread
  newsKillSwitch: false,
};

export class DeterministicRiskEngine {
  private config: RiskConfig = { ...DEFAULT_RISK };

  setConfig(config: Partial<RiskConfig>) {
    this.config = { ...this.config, ...config };
  }

  evaluate(
    decision: LLMDecision,
    portfolio: PortfolioState,
    snapshot: MarketSnapshot,
    features: FeatureVector
  ): RiskCheckResult {
    const failedGates: string[] = [];
    const warnings: string[] = [];

    // Gate 1: Data quality — fail-closed on stale data in PAPER mode
    const dataQualityBlock = snapshot.dataQuality.criticalStale && snapshot.appMode === 'PAPER';
    if (dataQualityBlock) {
      failedGates.push('DATA_QUALITY: Critical market data is stale — NO_TRADE');
    }

    // Gate 2: Daily drawdown limit
    const dailyDrawdown = portfolio.dailyDrawdownPercent;
    if (dailyDrawdown >= this.config.maxDailyDrawdownPercent) {
      failedGates.push(`DAILY_DRAWDOWN: ${dailyDrawdown.toFixed(2)}% >= limit ${this.config.maxDailyDrawdownPercent}%`);
    }

    // Gate 3: Total drawdown
    if (portfolio.maxDrawdownPercent >= this.config.maxDailyDrawdownPercent * 2) {
      failedGates.push(`MAX_DRAWDOWN: ${portfolio.maxDrawdownPercent.toFixed(2)}% exceeded`);
    }

    // Gate 4: Spread too wide
    if (features.spreadPercent * 100 > this.config.maxSpreadPercent) {
      failedGates.push(`SPREAD: ${(features.spreadPercent * 100).toFixed(4)}% > max ${this.config.maxSpreadPercent}%`);
    }

    // Gate 5: Minimum R:R
    const rr = decision.riskReward ?? 0;
    if (decision.action !== 'NO_TRADE' && decision.action !== 'HOLD' && rr < this.config.minRiskReward && decision.stopLoss !== null) {
      failedGates.push(`RISK_REWARD: ${rr.toFixed(2)} < minimum ${this.config.minRiskReward}`);
    }

    // Gate 6: Stop loss required
    if ((decision.action === 'BUY' || decision.action === 'SELL') && decision.stopLoss === null) {
      failedGates.push('NO_STOP_LOSS: Trade requires a stop loss');
    }

    // Gate 7: News kill switch
    if (this.config.newsKillSwitch) {
      warnings.push('NEWS_KILL_SWITCH: Active — verify no major macro release');
    }

    // Risk-based position sizing
    const price = snapshot.price;
    const stopLoss = decision.stopLoss;
    const equity = portfolio.equity;
    let calculatedPositionSize = 0;
    let maxAllowedPositionSize = 0;

    if (stopLoss !== null && price > 0) {
      const stopDistance = Math.abs(price - stopLoss);
      const riskAmount = (equity * (this.config.maxPositionRiskPercent / 100));
      calculatedPositionSize = stopDistance > 0 ? Number((riskAmount / stopDistance).toFixed(6)) : 0;
      maxAllowedPositionSize = calculatedPositionSize;
    }

    // Gate 8: Minimum viable size
    if (calculatedPositionSize > 0 && price > 0) {
      const positionValue = calculatedPositionSize * price;
      if (positionValue > portfolio.freeMargin) {
        failedGates.push(`MARGIN: Position value $${positionValue.toFixed(2)} exceeds free margin $${portfolio.freeMargin.toFixed(2)}`);
      }
    }

    if (features.slippageRisk === 'HIGH') {
      warnings.push('HIGH_SLIPPAGE: Execution cost may erode expected edge');
    }

    return {
      approved: failedGates.length === 0 && decision.action !== 'NO_TRADE' && decision.action !== 'HOLD',
      failedGates,
      warnings,
      maxAllowedPositionSize,
      calculatedPositionSize,
      riskRewardRatio: rr,
      dailyDrawdownPercent: dailyDrawdown,
      newsKillSwitchActive: this.config.newsKillSwitch,
      dataQualityBlock,
    };
  }
}

export const deterministicRiskEngine = new DeterministicRiskEngine();
