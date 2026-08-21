import { MarketSnapshot, FeatureVector, AgentSignal, RegimeType, Evidence, ActionType, DataStatus } from '@/types/trading';

// ── Regime Classifier ───────────────────────────────────────────────────────
export function classifyRegime(features: FeatureVector, snapshot: MarketSnapshot): RegimeType {
  const { adx, ema20, ema50, ema200, volPercentile, bollingerExpansion } = features;
  const price = snapshot.price;

  if (volPercentile > 85 && bollingerExpansion) return 'HIGH_VOLATILITY';
  if (volPercentile < 20 && adx < 20) return 'LOW_VOLATILITY';

  if (adx > 28) {
    if (ema20 > ema50 && ema50 > ema200 && price > ema20) return 'TRENDING_UP';
    if (ema20 < ema50 && ema50 < ema200 && price < ema20) return 'TRENDING_DOWN';
  }

  if (bollingerExpansion && adx > 22) return 'BREAKOUT';
  if (adx < 18) return 'RANGING';
  return 'TRANSITION';
}

// ── Agent Helpers ───────────────────────────────────────────────────────────
function makeSignal(
  id: string,
  name: string,
  action: ActionType,
  bias: AgentSignal['bias'],
  score: number,
  confidence: number,
  summary: string,
  evidence: Evidence[],
  risks: string[],
  keyMetrics: Record<string, string | number>,
  dataStatus: DataStatus = 'LIVE'
): AgentSignal {
  return {
    agentId: id, agentName: name, action, bias, score: Number(score.toFixed(3)),
    confidence: Number(confidence.toFixed(3)), summary, evidence, risks, keyMetrics,
    dataQuality: dataStatus, timestamp: Date.now(),
  };
}

// ── 8 Specialist Agents ─────────────────────────────────────────────────────
export class SpecialistAgentSystem {
  evaluateAllAgents(
    snapshot: MarketSnapshot,
    features: FeatureVector
  ): { signals: AgentSignal[]; regime: RegimeType } {
    const regime = classifyRegime(features, snapshot);
    return {
      signals: [
        this.regimeAgent(regime, features, snapshot),
        this.technicalAgent(features, snapshot),
        this.momentumAgent(features, snapshot),
        this.liquidityAgent(features, snapshot),
        this.positioningAgent(features, snapshot),
        this.volatilityAgent(features, snapshot),
        this.macroAgent(snapshot),
        this.executionAgent(features, snapshot),
      ],
      regime,
    };
  }

  // 1. Regime Agent
  private regimeAgent(regime: RegimeType, features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { adx, ema20, ema50, ema200 } = features;
    const price = snapshot.price;

    const evidence: Evidence[] = [
      { label: 'ADX', value: adx.toFixed(1), signal: adx > 25 ? 'BULLISH' : 'NEUTRAL' },
      { label: 'EMA20 vs EMA50', value: ema20 > ema50 ? 'Above' : 'Below', signal: ema20 > ema50 ? 'BULLISH' : 'BEARISH' },
      { label: 'Regime', value: regime, signal: regime === 'TRENDING_UP' ? 'BULLISH' : regime === 'TRENDING_DOWN' ? 'BEARISH' : 'NEUTRAL' },
    ];

    let action: ActionType = 'HOLD';
    let score = 0.5;
    if (regime === 'TRENDING_UP') { action = 'BUY'; score = 0.78; }
    else if (regime === 'TRENDING_DOWN') { action = 'SELL'; score = 0.78; }
    else if (regime === 'HIGH_VOLATILITY' || regime === 'RANGING') { action = 'NO_TRADE'; score = 0.2; }
    else if (regime === 'BREAKOUT') { score = 0.65; action = ema20 > ema50 ? 'BUY' : 'SELL'; }

    // Block trading if candles are simulated
    const isSimulated = snapshot.dataQuality.candlesStatus === 'SIMULATED';
    if (isSimulated) { action = 'NO_TRADE'; score = 0.1; }

    return makeSignal('regime', 'Regime Agent', action,
      score > 0.6 ? (action === 'BUY' ? 'BULLISH' : action === 'SELL' ? 'BEARISH' : 'NEUTRAL') : 'NEUTRAL',
      score, isSimulated ? 0.15 : adx > 30 ? 0.85 : adx > 20 ? 0.70 : 0.50,
      `Regime: ${regime}. ADX: ${adx.toFixed(1)}.`,
      evidence,
      regime === 'HIGH_VOLATILITY' ? ['High volatility — trade size risk'] : [],
      { regime, adx: adx.toFixed(1), ema20: ema20.toFixed(2) },
      isSimulated ? 'SIMULATED' : snapshot.dataQuality.candlesStatus
    );
  }

  // 2. Technical Agent
  private technicalAgent(features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { ema20, ema50, rsi, adx, bollingerUpper, bollingerLower, supportLevel, resistanceLevel } = features;
    const price = snapshot.price;

    const emaBullish = price > ema20 && ema20 > ema50;
    const emaBearish = price < ema20 && ema20 < ema50;
    const rsiOversold = rsi < 35;
    const rsiOverbought = rsi > 68;

    const evidence: Evidence[] = [
      { label: 'Price vs EMA20', value: (price > ema20 ? 'Above' : 'Below'), signal: price > ema20 ? 'BULLISH' : 'BEARISH' },
      { label: 'EMA20 vs EMA50', value: (ema20 > ema50 ? 'Golden' : 'Death'), signal: ema20 > ema50 ? 'BULLISH' : 'BEARISH' },
      { label: 'RSI', value: rsi.toFixed(1), signal: rsiOversold ? 'BULLISH' : rsiOverbought ? 'BEARISH' : 'NEUTRAL' },
      { label: 'ADX', value: adx.toFixed(1), signal: adx > 25 ? 'BULLISH' : 'NEUTRAL' },
    ];

    let score = 0.5;
    if (emaBullish && !rsiOverbought) score = 0.78;
    else if (emaBearish && !rsiOversold) score = 0.22;
    else if (rsiOversold && emaBullish) score = 0.85;
    else if (rsiOverbought && emaBearish) score = 0.15;

    const action: ActionType = score > 0.65 ? 'BUY' : score < 0.35 ? 'SELL' : 'HOLD';
    const risks: string[] = [];
    if (resistanceLevel > 0 && price > resistanceLevel * 0.995) risks.push(`Resistance ${((resistanceLevel - price) / price * 100).toFixed(2)}% above`);
    if (supportLevel > 0 && price < supportLevel * 1.005) risks.push(`Near support ${supportLevel.toFixed(2)}`);

    return makeSignal('technical', 'Technical Agent', action,
      score > 0.6 ? 'BULLISH' : score < 0.4 ? 'BEARISH' : 'NEUTRAL',
      score, adx > 25 ? 0.80 : 0.60,
      `EMA ${emaBullish ? 'bullish stack' : emaBearish ? 'bearish stack' : 'mixed'}. RSI ${rsi.toFixed(1)}.`,
      evidence, risks,
      { rsi: rsi.toFixed(1), adx: adx.toFixed(1), ema20: ema20.toFixed(2), ema50: ema50.toFixed(2) }
    );
  }

  // 3. Momentum Agent
  private momentumAgent(features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { roc, ppo, macd, macdSignal, volumeZScore, volumeAcceleration, momentumDivergence } = features;

    const evidence: Evidence[] = [
      { label: 'ROC-10', value: roc.toFixed(2) + '%', signal: roc > 0.5 ? 'BULLISH' : roc < -0.5 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'MACD vs Signal', value: macd > macdSignal ? 'Above' : 'Below', signal: macd > macdSignal ? 'BULLISH' : 'BEARISH' },
      { label: 'Volume Z-Score', value: volumeZScore.toFixed(2), signal: volumeZScore > 1 ? 'BULLISH' : 'NEUTRAL' },
      { label: 'Divergence', value: momentumDivergence ? 'YES' : 'NO', signal: momentumDivergence ? 'BEARISH' : 'NEUTRAL' },
    ];

    let score = 0.5;
    if (roc > 1 && macd > macdSignal && !momentumDivergence) score = 0.80;
    else if (roc < -1 && macd < macdSignal && !momentumDivergence) score = 0.20;
    else if (momentumDivergence) score = roc > 0 ? 0.35 : 0.65;

    if (volumeZScore > 1.5) score = score > 0.5 ? Math.min(score + 0.07, 0.92) : Math.max(score - 0.07, 0.08);

    const action: ActionType = score > 0.65 ? 'BUY' : score < 0.35 ? 'SELL' : 'HOLD';
    return makeSignal('momentum', 'Momentum Agent', action,
      score > 0.6 ? 'BULLISH' : score < 0.4 ? 'BEARISH' : 'NEUTRAL',
      score, momentumDivergence ? 0.55 : 0.72,
      `ROC ${roc.toFixed(2)}%. MACD ${macd > macdSignal ? 'bullish' : 'bearish'}. VolumeZ: ${volumeZScore.toFixed(1)}.`,
      evidence, momentumDivergence ? ['Momentum divergence — weakening signal'] : [],
      { roc: roc.toFixed(2), macd: macd.toFixed(4), volumeZScore: volumeZScore.toFixed(2) }
    );
  }

  // 4. Liquidity Agent
  private liquidityAgent(features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { spreadPercent, bidAskImbalance, liquidityScore, slippageRisk, sweepDetected } = features;
    const ob = snapshot.orderBook;
    const dataStatus = snapshot.dataQuality.orderBookStatus;

    const evidence: Evidence[] = [
      { label: 'Spread %', value: (spreadPercent * 100).toFixed(4) + '%', signal: spreadPercent < 0.0005 ? 'BULLISH' : spreadPercent > 0.002 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Bid/Ask Imbalance', value: bidAskImbalance.toFixed(3), signal: bidAskImbalance > 0.1 ? 'BULLISH' : bidAskImbalance < -0.1 ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Sweep', value: sweepDetected ? 'DETECTED' : 'None', signal: sweepDetected ? 'BULLISH' : 'NEUTRAL' },
      { label: 'Order Book', value: dataStatus, signal: dataStatus === 'LIVE' ? 'BULLISH' : 'NEUTRAL' },
    ];

    const action: ActionType = slippageRisk === 'HIGH' ? 'NO_TRADE' :
      bidAskImbalance > 0.15 ? 'BUY' : bidAskImbalance < -0.15 ? 'SELL' : 'HOLD';
    const score = 0.5 + bidAskImbalance * 0.3;
    const confidence = dataStatus === 'LIVE' ? 0.75 : dataStatus === 'SIMULATED' ? 0.30 : 0.45;

    return makeSignal('liquidity', 'Liquidity Agent', action,
      bidAskImbalance > 0.1 ? 'BULLISH' : bidAskImbalance < -0.1 ? 'BEARISH' : 'NEUTRAL',
      Math.max(0.05, Math.min(0.95, score)), confidence,
      `Spread ${(spreadPercent * 100).toFixed(4)}%. Slippage ${slippageRisk}. OB: ${dataStatus}.`,
      evidence,
      slippageRisk === 'HIGH' ? ['High spread — execution cost risk'] : [],
      { spread: (spreadPercent * 100).toFixed(4) + '%', imbalance: bidAskImbalance.toFixed(3), slippage: slippageRisk },
      dataStatus
    );
  }

  // 5. Positioning Agent (Item 18: Explicit Derivatives DataStatus & Zero Synthetic Inference)
  private positioningAgent(features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { fundingRate, openInterest, longShortRatio, liquidations24h, dataQuality } = snapshot;
    const { crowdedPositioning } = features;

    const isFundingAvail = dataQuality.fundingStatus === 'LIVE' && fundingRate !== null;
    const isOiAvail = dataQuality.openInterestStatus === 'LIVE' && openInterest !== null;

    if (!isFundingAvail && !isOiAvail) {
      return makeSignal(
        'positioning',
        'Positioning Agent',
        'NO_TRADE',
        'UNAVAILABLE',
        0.5,
        0.0,
        'Derivatives positioning data UNAVAILABLE (Funding & Open Interest unverified). Agent abstaining.',
        [
          { label: 'Funding Rate', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
          { label: 'Open Interest', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
          { label: 'Long/Short Ratio', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
          { label: '24h Liquidations', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
        ],
        ['No live derivatives feed available — synthetic inference forbidden'],
        { fundingRate: 'UNAVAILABLE', openInterest: 'UNAVAILABLE' },
        'UNAVAILABLE'
      );
    }

    const evidence: Evidence[] = [];
    if (isFundingAvail && fundingRate !== null) {
      evidence.push({
        label: 'Funding Rate',
        value: (fundingRate * 100).toFixed(4) + '%',
        signal: fundingRate > 0.0005 ? 'BEARISH' : fundingRate < -0.0005 ? 'BULLISH' : 'NEUTRAL',
      });
    }
    if (isOiAvail && openInterest !== null) {
      evidence.push({
        label: 'Open Interest',
        value: `$${(openInterest).toLocaleString()}`,
        signal: 'NEUTRAL',
      });
    }
    if (longShortRatio !== null) {
      evidence.push({
        label: 'Long/Short Ratio',
        value: longShortRatio.toFixed(2),
        signal: longShortRatio > 1.8 ? 'BEARISH' : longShortRatio < 0.6 ? 'BULLISH' : 'NEUTRAL',
      });
    }

    const action: ActionType = crowdedPositioning === 'LONG' ? 'SELL' : crowdedPositioning === 'SHORT' ? 'BUY' : 'HOLD';
    return makeSignal(
      'positioning',
      'Positioning Agent',
      action,
      crowdedPositioning === 'LONG' ? 'BEARISH' : crowdedPositioning === 'SHORT' ? 'BULLISH' : 'NEUTRAL',
      0.55,
      0.65,
      `Positioning active. Funding: ${isFundingAvail && fundingRate !== null ? (fundingRate * 100).toFixed(4) + '%' : 'N/A'}. Crowd: ${crowdedPositioning}.`,
      evidence,
      [],
      {
        fundingRate: isFundingAvail && fundingRate !== null ? (fundingRate * 100).toFixed(4) + '%' : 'UNAVAILABLE',
        crowded: crowdedPositioning,
      },
      'LIVE'
    );
  }

  // 6. Volatility Agent
  private volatilityAgent(features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { realizedVol, volPercentile, atr, bollingerExpansion, slippageRisk } = features;
    const price = snapshot.price;

    const evidence: Evidence[] = [
      { label: 'Realized Vol', value: realizedVol.toFixed(1) + '%', signal: 'NEUTRAL' },
      { label: 'Vol Percentile', value: volPercentile.toFixed(1) + '%', signal: volPercentile > 80 ? 'BEARISH' : volPercentile < 20 ? 'BULLISH' : 'NEUTRAL' },
      { label: 'ATR', value: atr.toFixed(4), signal: 'NEUTRAL' },
      { label: 'Bollinger Expansion', value: bollingerExpansion ? 'YES' : 'NO', signal: bollingerExpansion ? 'BEARISH' : 'NEUTRAL' },
    ];

    const action: ActionType = volPercentile > 85 ? 'NO_TRADE' : 'HOLD';
    const score = volPercentile > 85 ? 0.2 : volPercentile < 20 ? 0.75 : 0.5;

    return makeSignal('volatility', 'Volatility Agent', action,
      volPercentile > 80 ? 'CAUTION' : 'NEUTRAL',
      score, 0.70,
      `RV ${realizedVol.toFixed(1)}% at ${volPercentile.toFixed(0)}th percentile. ATR: ${atr.toFixed(2)}.`,
      evidence,
      volPercentile > 80 ? ['Elevated volatility — wider stops needed'] : [],
      { realizedVol: realizedVol + '%', volPercentile: volPercentile + '%', atr: atr.toFixed(4) }
    );
  }

  // 7. Macro Agent — honestly unavailable
  private macroAgent(snapshot: MarketSnapshot): AgentSignal {
    return makeSignal('macro', 'Macro Agent', 'NO_TRADE', 'UNAVAILABLE', 0.5, 0.0,
      'Macro data UNAVAILABLE. No validated source for DXY, VIX, or news events.',
      [
        { label: 'DXY', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
        { label: 'VIX', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
        { label: 'News Events', value: 'UNAVAILABLE', signal: 'NEUTRAL' },
      ],
      ['No macro data source connected — agent abstaining'],
      { status: 'UNAVAILABLE' },
      'UNAVAILABLE'
    );
  }

  // 8. Execution Quality Agent
  private executionAgent(features: FeatureVector, snapshot: MarketSnapshot): AgentSignal {
    const { spreadPercent, slippageRisk, liquidityScore, bidAskImbalance } = features;
    const ob = snapshot.orderBook;
    const bidDepth = ob.bidDepth;
    const askDepth = ob.askDepth;

    const evidence: Evidence[] = [
      { label: 'Spread', value: (spreadPercent * 100).toFixed(4) + '%', signal: spreadPercent < 0.001 ? 'BULLISH' : 'NEUTRAL' },
      { label: 'Slippage Risk', value: slippageRisk, signal: slippageRisk === 'LOW' ? 'BULLISH' : slippageRisk === 'HIGH' ? 'BEARISH' : 'NEUTRAL' },
      { label: 'Liquidity Score', value: liquidityScore.toFixed(3), signal: liquidityScore > 0.7 ? 'BULLISH' : 'NEUTRAL' },
    ];

    const execOk = slippageRisk !== 'HIGH' && liquidityScore > 0.4;
    const action: ActionType = execOk ? 'HOLD' : 'NO_TRADE';

    return makeSignal('execution', 'Execution Quality Agent', action,
      execOk ? 'NEUTRAL' : 'CAUTION',
      execOk ? 0.60 : 0.25, execOk ? 0.72 : 0.80,
      `Execution quality ${slippageRisk}. Liquidity: ${liquidityScore.toFixed(2)}.`,
      evidence,
      slippageRisk === 'HIGH' ? ['Execution cost may erode edge'] : [],
      { spread: (spreadPercent * 100).toFixed(4) + '%', liquidity: liquidityScore.toFixed(2), slippage: slippageRisk }
    );
  }
}

export const specialistAgentSystem = new SpecialistAgentSystem();
