import { LLMDecision, RiskCheckResult, PortfolioState, MarketSnapshot, FeatureVector } from '@/types/trading';

interface RiskConfig {
  maxPositionRiskPercent: number; // e.g. 0.5 = 0.5%
  maxDailyDrawdownPercent: number;
  minRiskReward: number;
  maxSpreadPercent: number;
  maxFreshnessSeconds: number;
  minLiquidityScore: number;
  maxSlippagePercent: number;
  newsKillSwitch: boolean;
  minConfidence: number; // 0-1
}

const DEFAULT_RISK: RiskConfig = {
  maxPositionRiskPercent: 0.5,
  maxDailyDrawdownPercent: 5.0,
  minRiskReward: 2.0,
  maxSpreadPercent: 0.3, // 0.3% max spread
  maxFreshnessSeconds: 15, // max 15s data age
  minLiquidityScore: 0.30,
  maxSlippagePercent: 0.5,
  newsKillSwitch: false,
  minConfidence: 0.68,
};

export class DeterministicRiskEngine {
  private config: RiskConfig = { ...DEFAULT_RISK };

  setConfig(config: Partial<RiskConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Deterministic 10-Gate Risk Evaluation & Comprehensive Data Quality Gate (Item 19)
   */
  evaluate(
    decision: LLMDecision,
    portfolio: PortfolioState,
    snapshot: MarketSnapshot,
    features: FeatureVector
  ): RiskCheckResult {
    const failedGates: string[] = [];
    const warnings: string[] = [];
    const isLiveOrPaper = snapshot.appMode === 'PAPER' || snapshot.appMode === 'LIVE';

    // ── Gate 1: Comprehensive Data Quality Verification (Item 19) ────────────────
    let dataQualityBlock = false;
    const dq = snapshot.dataQuality;

    if (isLiveOrPaper) {
      if (dq.criticalStale || dq.tickerStatus === 'UNAVAILABLE' || snapshot.price <= 0) {
        failedGates.push('DATA_QUALITY_TICKER: Live price ticker feed is UNAVAILABLE or stale — NO_TRADE');
        dataQualityBlock = true;
      }
      if (dq.orderBookStatus === 'UNAVAILABLE' || !snapshot.orderBook || snapshot.orderBook.bids.length === 0) {
        failedGates.push('DATA_QUALITY_ORDERBOOK: L2 Depth order book feed is UNAVAILABLE — NO_TRADE');
        dataQualityBlock = true;
      }
      if (dq.candlesStatus === 'UNAVAILABLE' || !snapshot.candles || snapshot.candles.length < 5) {
        failedGates.push('DATA_QUALITY_CANDLES: Candlestick history feed is UNAVAILABLE — NO_TRADE');
        dataQualityBlock = true;
      }
      if (snapshot.timestamp > 0) {
        const dataAgeSeconds = Math.max(0, Math.round((Date.now() - snapshot.timestamp) / 1000));
        if (dataAgeSeconds > this.config.maxFreshnessSeconds) {
          failedGates.push(`DATA_QUALITY_FRESHNESS: Data age (${dataAgeSeconds}s) exceeds ${this.config.maxFreshnessSeconds}s freshness threshold`);
          dataQualityBlock = true;
        }
      }
      if (features.liquidityScore < this.config.minLiquidityScore) {
        failedGates.push(`DATA_QUALITY_LIQUIDITY: Market liquidity score (${features.liquidityScore.toFixed(2)}) is insufficient for institutional execution`);
      }
      if (features.slippageRisk === 'HIGH') {
        failedGates.push('DATA_QUALITY_SLIPPAGE: High slippage risk / thin depth crossing threshold — NO_TRADE');
      }
    }

    // ── Gate 2: Daily drawdown limit ─────────────────────────────────────────────
    const dailyDrawdown = portfolio.dailyDrawdownPercent || 0;
    if (dailyDrawdown >= this.config.maxDailyDrawdownPercent) {
      failedGates.push(`DAILY_DRAWDOWN: ${dailyDrawdown.toFixed(2)}% >= limit ${this.config.maxDailyDrawdownPercent}%`);
    }

    // ── Gate 3: Total drawdown ───────────────────────────────────────────────────
    const maxDrawdown = portfolio.maxDrawdownPercent || 0;
    if (maxDrawdown >= this.config.maxDailyDrawdownPercent * 2) {
      failedGates.push(`MAX_DRAWDOWN: ${maxDrawdown.toFixed(2)}% exceeded`);
    }

    // ── Gate 4: Spread too wide ──────────────────────────────────────────────────
    if (features.spreadPercent * 100 > this.config.maxSpreadPercent) {
      failedGates.push(`SPREAD: ${(features.spreadPercent * 100).toFixed(4)}% > max ${this.config.maxSpreadPercent}%`);
    }

    // ── Gate 5: Minimum R:R ──────────────────────────────────────────────────────
    const rr = decision.riskReward ?? 0;
    if (decision.action !== 'NO_TRADE' && decision.action !== 'HOLD' && rr < this.config.minRiskReward && decision.stopLoss !== null) {
      failedGates.push(`RISK_REWARD: ${rr.toFixed(2)} < minimum ${this.config.minRiskReward}`);
    }

    // ── Gate 6: Stop loss required ───────────────────────────────────────────────
    if ((decision.action === 'BUY' || decision.action === 'SELL') && decision.stopLoss === null) {
      failedGates.push('NO_STOP_LOSS: Trade requires a verified stop loss');
    }

    // ── Gate 7: News kill switch ─────────────────────────────────────────────────
    if (this.config.newsKillSwitch && (decision.action === 'BUY' || decision.action === 'SELL')) {
      failedGates.push('NEWS_KILL_SWITCH: Trading paused for macro event window');
    }

    // ── Gate 7b: Minimum AI confidence ───────────────────────────────────────────
    if (
      (decision.action === 'BUY' || decision.action === 'SELL') &&
      decision.confidence < this.config.minConfidence
    ) {
      failedGates.push(
        `CONFIDENCE: ${(decision.confidence * 100).toFixed(0)}% below minimum ${(this.config.minConfidence * 100).toFixed(0)}%`
      );
    }

    // ── Gate 8: Margin and Free Equity Availability ──────────────────────────────
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

    if (calculatedPositionSize > 0 && price > 0) {
      const positionValue = calculatedPositionSize * price;
      if (portfolio.freeMargin > 0 && positionValue > portfolio.freeMargin) {
        failedGates.push(`MARGIN: Position value $${positionValue.toFixed(2)} exceeds free margin $${portfolio.freeMargin.toFixed(2)}`);
      }
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
