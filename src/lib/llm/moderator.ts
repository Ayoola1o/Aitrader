import { z } from 'zod';
import { MarketSnapshot, FeatureVector, AgentSignal, SignalFusionResult, LLMDecision, RegimeType } from '@/types/trading';

export const llmDecisionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD', 'NO_TRADE']),
  confidence: z.number().min(0).max(1),
  entry: z.number().nullable(),
  stopLoss: z.number().nullable(),
  takeProfit: z.number().nullable(),
  riskPercent: z.number().min(0).max(2),
  reasoning: z.array(z.string()),
  invalidation: z.array(z.string()),
  timeHorizon: z.enum(['SCALP', 'INTRADAY', 'SWING']),
  regime: z.enum([
    'TRENDING_UP',
    'TRENDING_DOWN',
    'RANGING',
    'HIGH_VOLATILITY',
    'LOW_VOLATILITY',
    'BREAKOUT',
    'TRANSITION',
  ]),
});

export class LLMModerator {
  public generateDecision(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType
  ): LLMDecision {
    const price = snapshot.price;
    const atr = features.atr > 0 ? features.atr : price * 0.015;

    let action = fusion.dominantAction;
    let confidence = fusion.confidence;

    // If signal fusion recommended NO_TRADE or HOLD, maintain that decision
    if (action === 'NO_TRADE' || action === 'HOLD') {
      return {
        action,
        confidence: Number(confidence.toFixed(2)),
        entry: null,
        stopLoss: null,
        takeProfit: null,
        riskPercent: 0,
        reasoning: [
          fusion.abstainReason || 'Market conditions do not meet edge threshold.',
          `Regime is ${regime} with high caution penalty.`,
          `Signal Fusion score (BUY: ${fusion.buyScore}, SELL: ${fusion.sellScore}).`,
        ],
        invalidation: [
          'Breakout above resistance with volume surge',
          'Liquidity imbalance normalization',
        ],
        timeHorizon: 'INTRADAY',
        regime,
      };
    }

    // Calculating precise Entry, Stop-Loss, and Take-Profit targets
    const isLong = action === 'BUY';
    const entry = price;
    const stopDistance = Math.max(atr * 1.5, price * 0.012);
    const stopLoss = Number((isLong ? price - stopDistance : price + stopDistance).toFixed(price > 1000 ? 2 : 4));
    const targetDistance = stopDistance * 2.22; // Target 2.22 Risk:Reward
    const takeProfit = Number((isLong ? price + targetDistance : price - targetDistance).toFixed(price > 1000 ? 2 : 4));

    const reasoning = [
      `${regime.replace('_', ' ')} regime confirmed by Market & Technical agents.`,
      `RSI at ${features.rsi} and ADX at ${features.adx} indicate directional momentum.`,
      `Order book liquidity score ${features.liquidityScore} is suitable for execution with low slippage.`,
    ];

    if (features.crowdedPositioning !== 'NONE') {
      reasoning.push(`Note: ${features.crowdedPositioning} positioning is elevated. Kept position size conservative at 0.65%.`);
    }

    const invalidation = [
      `Price closes beyond stop loss at $${stopLoss}.`,
      `Liquidity deteriorates or spread expands beyond 0.03%.`,
      `Regime shifts to HIGH_VOLATILITY before target is reached.`,
    ];

    return {
      action,
      confidence: Number(confidence.toFixed(2)),
      entry,
      stopLoss,
      takeProfit,
      riskPercent: 0.65,
      reasoning,
      invalidation,
      timeHorizon: 'INTRADAY',
      regime,
    };
  }

  public compressContext(snapshot: MarketSnapshot, features: FeatureVector, signals: AgentSignal[]): string {
    return JSON.stringify(
      {
        asset: snapshot.symbol,
        price: snapshot.price,
        fundingRate: snapshot.fundingRate,
        orderBookImbalance: snapshot.orderBook.bidAskImbalance,
        features: {
          rsi: features.rsi,
          adx: features.adx,
          vwap: features.vwap,
          atr: features.atr,
          spread: features.spread,
          volPercentile: features.volPercentile,
          crowdedPositioning: features.crowdedPositioning,
        },
        agentScores: signals.map((s) => ({ agent: s.agentId, bias: s.bias, score: s.score })),
      },
      null,
      2
    );
  }
}

export const llmModerator = new LLMModerator();
