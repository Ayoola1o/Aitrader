import { MarketSnapshot, FeatureVector, AgentSignal, RegimeType } from '@/types/trading';

export class SpecialistAgentSystem {
  public evaluateAllAgents(snapshot: MarketSnapshot, features: FeatureVector): {
    signals: AgentSignal[];
    regime: RegimeType;
  } {
    const regimeSignal = this.evaluateRegimeAgent(snapshot, features);
    const technicalSignal = this.evaluateTechnicalAgent(snapshot, features);
    const liquiditySignal = this.evaluateLiquidityAgent(snapshot, features);
    const positioningSignal = this.evaluatePositioningAgent(snapshot, features);
    const momentumSignal = this.evaluateMomentumAgent(snapshot, features);
    const volatilitySignal = this.evaluateVolatilityAgent(snapshot, features);
    const macroSignal = this.evaluateMacroAgent(snapshot, features);
    const executionSignal = this.evaluateExecutionAgent(snapshot, features);

    const regime = (regimeSignal.keyMetrics.regimeState as RegimeType) || 'TRENDING_UP';

    return {
      signals: [
        regimeSignal,
        technicalSignal,
        liquiditySignal,
        positioningSignal,
        momentumSignal,
        volatilitySignal,
        macroSignal,
        executionSignal,
      ],
      regime,
    };
  }

  // 1. Regime Agent
  private evaluateRegimeAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const price = snapshot.price;
    const isTrendingUp = price > features.ema20 && features.ema20 > features.ema50 && features.adx > 25;
    const isTrendingDown = price < features.ema20 && features.ema20 < features.ema50 && features.adx > 25;
    const isHighVol = features.volPercentile > 0.85;

    let regimeState: RegimeType = 'RANGING';
    let bias: AgentSignal['bias'] = 'NEUTRAL';
    let score = 0.65;

    if (isHighVol) {
      regimeState = 'HIGH_VOLATILITY';
      bias = 'CAUTION';
      score = 0.55;
    } else if (isTrendingUp) {
      regimeState = 'TRENDING_UP';
      bias = 'BULLISH';
      score = 0.84;
    } else if (isTrendingDown) {
      regimeState = 'TRENDING_DOWN';
      bias = 'BEARISH';
      score = 0.82;
    } else if (features.adx < 20) {
      regimeState = 'RANGING';
      bias = 'NEUTRAL';
      score = 0.70;
    } else if (features.bollingerExpansion) {
      regimeState = 'BREAKOUT';
      bias = price > features.vwap ? 'BULLISH' : 'BEARISH';
      score = 0.78;
    }

    return {
      agentId: 'regime',
      agentName: 'Market Regime Agent',
      bias,
      score,
      confidence: 0.85,
      summary: `Market state: ${regimeState}. ADX=${features.adx}, EMA20/50 aligned.`,
      keyMetrics: {
        regimeState,
        adx: features.adx,
        trendAlignment: isTrendingUp ? 'BULLISH' : isTrendingDown ? 'BEARISH' : 'FLAT',
      },
    };
  }

  // 2. Technical Agent
  private evaluateTechnicalAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const price = snapshot.price;
    let bullPoints = 0;
    let totalPoints = 5;

    if (price > features.ema20) bullPoints++;
    if (price > features.vwap) bullPoints++;
    if (features.rsi > 45 && features.rsi < 70) bullPoints++;
    if (features.adx > 22) bullPoints++;
    if (price > features.supportLevel * 1.005) bullPoints++;

    const score = bullPoints / totalPoints;
    const bias: AgentSignal['bias'] = score >= 0.7 ? 'BULLISH' : score <= 0.3 ? 'BEARISH' : 'NEUTRAL';

    return {
      agentId: 'technical',
      agentName: 'Technical Analysis Agent',
      bias,
      score: Number(score.toFixed(2)),
      confidence: 0.88,
      summary: `Price $${price} vs VWAP $${features.vwap}. RSI: ${features.rsi}, ADX: ${features.adx}.`,
      keyMetrics: {
        rsi: features.rsi,
        vwapDistancePct: Number((((price - features.vwap) / features.vwap) * 100).toFixed(2)),
        support: features.supportLevel,
        resistance: features.resistanceLevel,
      },
    };
  }

  // 3. Liquidity Agent
  private evaluateLiquidityAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const depthOk = features.liquidityScore > 0.6;
    const lowSlippage = features.slippageRisk === 'LOW';
    const imbalance = snapshot.orderBook.bidAskImbalance;

    let bias: AgentSignal['bias'] = 'NEUTRAL';
    if (imbalance > 0.25) bias = 'BULLISH';
    else if (imbalance < -0.25) bias = 'BEARISH';
    if (!depthOk) bias = 'CAUTION';

    return {
      agentId: 'liquidity',
      agentName: 'Liquidity Agent',
      bias,
      score: features.liquidityScore,
      confidence: 0.78,
      summary: `Spread: ${features.spread} (${snapshot.orderBook.spreadPercent.toFixed(3)}%). Imbalance: ${imbalance > 0 ? '+' : ''}${(imbalance * 100).toFixed(1)}%.`,
      keyMetrics: {
        spread: features.spread,
        slippageRisk: features.slippageRisk,
        imbalance: imbalance,
        sweepDetected: features.sweepDetected ? 'YES' : 'NO',
      },
    };
  }

  // 4. Long/Short Positioning Agent
  private evaluatePositioningAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const lsRatio = snapshot.longShortRatio;
    const isCrowdedLong = lsRatio > 1.8;
    const isCrowdedShort = lsRatio < 0.7;

    let bias: AgentSignal['bias'] = 'NEUTRAL';
    let summary = `Long/Short Ratio: ${lsRatio.toFixed(2)}. Funding: ${(snapshot.fundingRate * 100).toFixed(4)}%.`;

    if (isCrowdedLong) {
      bias = 'CAUTION'; // High risk of long squeeze
      summary += ' WARNING: Crowded long positioning detected.';
    } else if (isCrowdedShort) {
      bias = 'BULLISH'; // Short squeeze potential
      summary += ' Short squeeze potential detected.';
    } else {
      bias = lsRatio >= 1.0 ? 'BULLISH' : 'BEARISH';
    }

    return {
      agentId: 'positioning',
      agentName: 'Positioning Agent',
      bias,
      score: isCrowdedLong ? 0.42 : 0.75,
      confidence: 0.81,
      summary,
      keyMetrics: {
        longShortRatio: Number(lsRatio.toFixed(2)),
        fundingRate: Number((snapshot.fundingRate * 100).toFixed(4)) + '%',
        openInterest: (snapshot.openInterest / 1e6).toFixed(1) + 'M',
      },
    };
  }

  // 5. Momentum Agent
  private evaluateMomentumAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const isStrongUp = features.roc > 0.5 && features.ppo > 0 && features.volumeAcceleration > 1.1;
    const isStrongDown = features.roc < -0.5 && features.ppo < 0 && features.volumeAcceleration > 1.1;

    let bias: AgentSignal['bias'] = 'NEUTRAL';
    let score = 0.60;

    if (isStrongUp) {
      bias = 'BULLISH';
      score = 0.85;
    } else if (isStrongDown) {
      bias = 'BEARISH';
      score = 0.82;
    } else if (features.roc > 0) {
      bias = 'BULLISH';
      score = 0.68;
    }

    return {
      agentId: 'momentum',
      agentName: 'Momentum Agent',
      bias,
      score,
      confidence: 0.83,
      summary: `ROC: ${features.roc}%, PPO: ${features.ppo}%, Vol Accel: ${features.volumeAcceleration}x.`,
      keyMetrics: {
        roc: features.roc,
        ppo: features.ppo,
        volumeAccel: features.volumeAcceleration,
      },
    };
  }

  // 6. Volatility Agent
  private evaluateVolatilityAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const volPct = features.volPercentile;
    let bias: AgentSignal['bias'] = 'NEUTRAL';
    let score = 0.70;

    if (volPct > 0.85) {
      bias = 'CAUTION';
      score = 0.50;
    } else if (volPct < 0.30) {
      bias = 'NEUTRAL';
      score = 0.75;
    } else {
      score = 0.80;
    }

    return {
      agentId: 'volatility',
      agentName: 'Volatility Agent',
      bias,
      score,
      confidence: 0.76,
      summary: `Realized Volatility: ${features.realizedVol}% (Percentile: ${(volPct * 100).toFixed(0)}th). ATR: $${features.atr}.`,
      keyMetrics: {
        realizedVol: features.realizedVol,
        volPercentile: (volPct * 100).toFixed(0) + '%',
        atr: features.atr,
      },
    };
  }

  // 7. Macro/Sentiment Agent
  private evaluateMacroAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const isEventNear = features.minutesToNextEvent < 30;
    const bias: AgentSignal['bias'] = isEventNear ? 'CAUTION' : 'NEUTRAL';

    return {
      agentId: 'macro',
      agentName: 'Macro / Sentiment Agent',
      bias,
      score: isEventNear ? 0.45 : 0.68,
      confidence: 0.72,
      summary: `DXY: ${features.dxyIndex}, VIX Proxy: ${features.vixProxy}. Event in ${features.minutesToNextEvent} mins.`,
      keyMetrics: {
        dxy: features.dxyIndex,
        vix: features.vixProxy,
        nextEventInMins: features.minutesToNextEvent,
      },
    };
  }

  // 8. Execution Agent
  private evaluateExecutionAgent(snapshot: MarketSnapshot, features: FeatureVector): AgentSignal {
    const spreadPct = snapshot.orderBook.spreadPercent;
    const isQualityGood = spreadPct < 0.02 && features.slippageRisk === 'LOW';

    return {
      agentId: 'execution',
      agentName: 'Execution Quality Agent',
      bias: isQualityGood ? 'BULLISH' : 'CAUTION',
      score: isQualityGood ? 0.90 : 0.60,
      confidence: 0.89,
      summary: `Slippage Risk: ${features.slippageRisk}. Rec Order: ${isQualityGood ? 'LIMIT / MARKET' : 'LIMIT ONLY'}.`,
      keyMetrics: {
        slippageRisk: features.slippageRisk,
        recommendedOrderType: isQualityGood ? 'LIMIT' : 'POST_ONLY_LIMIT',
      },
    };
  }
}

export const specialistAgentSystem = new SpecialistAgentSystem();
