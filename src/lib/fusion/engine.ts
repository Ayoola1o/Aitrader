import { AgentSignal, SignalFusionResult, ActionType, RegimeType } from '@/types/trading';

// Configurable agent weights per regime
const DEFAULT_WEIGHTS: Record<string, number> = {
  regime: 1.4,
  technical: 1.2,
  momentum: 1.0,
  liquidity: 0.9,
  positioning: 0.7,
  volatility: 1.0,
  macro: 0.0, // macro is UNAVAILABLE so weight 0
  execution: 0.8,
};

const CONFLICT_THRESHOLD = 0.35; // if buy vs sell diverge by < this, conflict
const DEFAULT_CONFIDENCE_FLOOR = 0.68; // minimum confidence to trade

interface FusionConfig {
  confidenceFloor: number;
}

export class SignalFusionEngine {
  private config: FusionConfig = { confidenceFloor: DEFAULT_CONFIDENCE_FLOOR };

  setConfig(config: Partial<FusionConfig>) {
    this.config = { ...this.config, ...config };
  }

  fuseSignals(signals: AgentSignal[], regime: RegimeType): SignalFusionResult {
    const weights = { ...DEFAULT_WEIGHTS };

    // Regime-adjusted weights
    if (regime === 'TRENDING_UP' || regime === 'TRENDING_DOWN') {
      weights.technical = 1.4;
      weights.momentum = 1.2;
    } else if (regime === 'RANGING') {
      weights.liquidity = 1.2;
      weights.volatility = 1.1;
    }

    let weightedBuy = 0, weightedSell = 0, weightedHold = 0, weightedNoTrade = 0;
    let totalWeight = 0;
    const agentWeights: Record<string, number> = {};

    for (const sig of signals) {
      // Skip unavailable agents from the fusion score
      if (sig.bias === 'UNAVAILABLE' || sig.dataQuality === 'UNAVAILABLE') {
        agentWeights[sig.agentId] = 0;
        continue;
      }

      const w = (weights[sig.agentId] ?? 1.0) * sig.confidence;
      agentWeights[sig.agentId] = Number(w.toFixed(3));
      totalWeight += w;

      const score = sig.score;
      switch (sig.action) {
        case 'BUY': weightedBuy += score * w; break;
        case 'SELL': weightedSell += (1 - score) * w; break;
        case 'HOLD': weightedHold += 0.5 * w; break;
        case 'NO_TRADE': weightedNoTrade += w; break;
      }
    }

    if (totalWeight === 0) {
      return {
        buyScore: 0, sellScore: 0, holdScore: 0, noTradeScore: 1,
        dominantAction: 'NO_TRADE',
        confidence: 1.0, conflictingSignals: false,
        abstainReason: 'All agents unavailable or returned NO_TRADE',
        agentWeights,
      };
    }

    const buyScore = weightedBuy / totalWeight;
    const sellScore = weightedSell / totalWeight;
    const holdScore = weightedHold / totalWeight;
    const noTradeScore = weightedNoTrade / totalWeight;

    // Conflict detection: if buy and sell scores are too close
    const conflictingSignals = Math.abs(buyScore - sellScore) < CONFLICT_THRESHOLD
      && buyScore > 0.15 && sellScore > 0.15;

    // Any NO_TRADE signal from critical agents (regime, volatility)
    const criticalNoTrade = signals.some(
      s => (s.agentId === 'regime' || s.agentId === 'volatility' || s.agentId === 'execution') &&
           s.action === 'NO_TRADE'
    );

    let dominantAction: ActionType;
    let abstainReason: string | undefined;

    if (criticalNoTrade || conflictingSignals || noTradeScore > 0.35) {
      dominantAction = 'NO_TRADE';
      abstainReason = criticalNoTrade
        ? 'Critical agent (regime/volatility/execution) returned NO_TRADE'
        : conflictingSignals
        ? `Signal conflict: BUY ${(buyScore * 100).toFixed(0)}% vs SELL ${(sellScore * 100).toFixed(0)}% — insufficient edge`
        : 'High NO_TRADE score from agents';
    } else {
      const max = Math.max(buyScore, sellScore, holdScore);
      dominantAction = max === buyScore ? 'BUY' : max === sellScore ? 'SELL' : 'HOLD';
    }

    // Overall confidence
    const spread = Math.abs(buyScore - sellScore);
    const confidence = conflictingSignals ? 0.4 : Math.min(0.95, 0.45 + spread * 0.8);

    // Enforce minimum confidence floor
    const floor = this.config.confidenceFloor;
    if (confidence < floor && dominantAction !== 'NO_TRADE' && dominantAction !== 'HOLD') {
      dominantAction = 'NO_TRADE';
      abstainReason = `Confidence ${(confidence * 100).toFixed(0)}% below minimum threshold ${(floor * 100).toFixed(0)}%`;
    }

    return {
      buyScore: Number(buyScore.toFixed(3)),
      sellScore: Number(sellScore.toFixed(3)),
      holdScore: Number(holdScore.toFixed(3)),
      noTradeScore: Number(noTradeScore.toFixed(3)),
      dominantAction,
      confidence: Number(confidence.toFixed(3)),
      conflictingSignals,
      abstainReason,
      agentWeights,
    };
  }
}

export const signalFusionEngine = new SignalFusionEngine();
