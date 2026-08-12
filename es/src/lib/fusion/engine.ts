import { AgentSignal, SignalFusionResult, RegimeType, ActionType } from '@/types/trading';

export class SignalFusionEngine {
  private getRegimeWeights(regime: RegimeType): Record<string, number> {
    switch (regime) {
      case 'TRENDING_UP':
      case 'TRENDING_DOWN':
        return {
          regime: 0.20,
          technical: 0.20,
          momentum: 0.20,
          liquidity: 0.15,
          positioning: 0.10,
          volatility: 0.05,
          macro: 0.05,
          execution: 0.05,
        };
      case 'RANGING':
        return {
          liquidity: 0.25,
          technical: 0.20,
          volatility: 0.20,
          positioning: 0.15,
          regime: 0.10,
          momentum: 0.05,
          macro: 0.03,
          execution: 0.02,
        };
      case 'HIGH_VOLATILITY':
        return {
          volatility: 0.30,
          liquidity: 0.25,
          positioning: 0.15,
          macro: 0.10,
          technical: 0.10,
          regime: 0.05,
          momentum: 0.03,
          execution: 0.02,
        };
      default:
        return {
          regime: 0.15,
          technical: 0.15,
          liquidity: 0.15,
          positioning: 0.15,
          momentum: 0.10,
          volatility: 0.10,
          macro: 0.10,
          execution: 0.10,
        };
    }
  }

  public fuseSignals(signals: AgentSignal[], regime: RegimeType): SignalFusionResult {
    const weights = this.getRegimeWeights(regime);
    let weightedBullish = 0;
    let weightedBearish = 0;
    let weightedNeutral = 0;
    let weightedCaution = 0;
    let totalWeight = 0;

    signals.forEach((signal) => {
      const weight = weights[signal.agentId] || 0.10;
      totalWeight += weight;

      if (signal.bias === 'BULLISH') {
        weightedBullish += signal.score * weight;
      } else if (signal.bias === 'BEARISH') {
        weightedBearish += signal.score * weight;
      } else if (signal.bias === 'CAUTION') {
        weightedCaution += (1 - signal.score) * weight;
      } else {
        weightedNeutral += 0.5 * weight;
      }
    });

    const buyScore = Number((weightedBullish / totalWeight).toFixed(3));
    const sellScore = Number((weightedBearish / totalWeight).toFixed(3));
    const holdScore = Number((weightedNeutral / totalWeight).toFixed(3));
    const cautionPenalty = Number((weightedCaution / totalWeight).toFixed(3));

    const noTradeScore = Number(Math.max(holdScore, cautionPenalty, 1 - Math.max(buyScore, sellScore)).toFixed(3));

    // Conflict detection: if both Bullish and Bearish scores are close (within 0.15)
    const conflictingSignals = Math.abs(buyScore - sellScore) < 0.15 && Math.max(buyScore, sellScore) > 0.35;

    let dominantAction: ActionType = 'HOLD';
    let abstainReason: string | undefined;

    if (conflictingSignals) {
      dominantAction = 'NO_TRADE';
      abstainReason = 'Conflicting signals between technical indicators and market positioning.';
    } else if (cautionPenalty > 0.30) {
      dominantAction = 'NO_TRADE';
      abstainReason = 'Excessive market risk / crowded positioning caution.';
    } else if (buyScore >= 0.55 && buyScore > sellScore + 0.20) {
      dominantAction = 'BUY';
    } else if (sellScore >= 0.55 && sellScore > buyScore + 0.20) {
      dominantAction = 'SELL';
    } else {
      dominantAction = 'HOLD';
      abstainReason = 'Insufficient statistical edge for directional entry.';
    }

    const confidence = Number(
      (
        Math.max(buyScore, sellScore, holdScore) * 0.7 +
        (1 - (conflictingSignals ? 0.4 : 0)) * 0.3
      ).toFixed(2)
    );

    return {
      buyScore,
      sellScore,
      holdScore,
      noTradeScore,
      dominantAction,
      confidence,
      conflictingSignals,
      abstainReason,
      agentWeights: weights,
    };
  }
}

export const signalFusionEngine = new SignalFusionEngine();
