'use client';

import {
  MarketSnapshot,
  LLMDecision,
  RiskCheckResult,
  PortfolioState,
  FeatureVector,
  AgentSignal,
  SignalFusionResult,
  RegimeType,
} from '@/types/trading';
import { featureEngine } from '@/lib/features/engine';
import { specialistAgentSystem } from '@/lib/agents/specialists';
import { signalFusionEngine } from '@/lib/fusion/engine';
import { aiProviderManager } from '@/lib/llm/providers';
import { deterministicRiskEngine } from '@/lib/risk/engine';
import { positionSizingEngine, PositionSizingResult } from '@/lib/risk/PositionSizingEngine';

export interface DecisionEngineInput {
  snapshot: MarketSnapshot;
  portfolio: PortfolioState;
  allocatedCapital?: number;
  riskPercent?: number;
  forceDeterministic?: boolean;
}

export interface DecisionEngineOutput {
  features: FeatureVector;
  signals: AgentSignal[];
  regime: RegimeType;
  fusion: SignalFusionResult;
  decision: LLMDecision;
  riskCheck: RiskCheckResult;
  positionSizing: PositionSizingResult;
  timestamp: number;
}

export class TradingDecisionEngine {
  /**
   * Unified single decision pipeline:
   * 1. Compute features
   * 2. Evaluate 8 specialist agents
   * 3. Consensus fusion
   * 4. AI / Deterministic Decision synthesis
   * 5. Deterministic 10-gate risk check
   * 6. Unified position sizing
   */
  public async evaluate(input: DecisionEngineInput): Promise<DecisionEngineOutput> {
    const {
      snapshot,
      portfolio,
      allocatedCapital = portfolio.equity || 10000,
      riskPercent = 0.5,
      forceDeterministic = false,
    } = input;

    // 1. Calculate Standard Quantitative Features
    const features = featureEngine.calculateFeatures(snapshot);

    // 2. Evaluate All 8 Specialist Agents
    const { signals, regime } = specialistAgentSystem.evaluateAllAgents(snapshot, features);

    // 3. Signal Fusion Matrix
    const fusion = signalFusionEngine.fuseSignals(signals, regime);

    // 4. Decision Synthesis (LLM or Deterministic Fallback)
    let decision: LLMDecision;
    if (forceDeterministic) {
      decision = this.buildDeterministicDecision(snapshot, features, signals, fusion, regime, riskPercent);
    } else {
      decision = await aiProviderManager.generateStructuredDecision(
        snapshot,
        features,
        signals,
        fusion,
        regime
      );
    }

    // 5. Deterministic Risk Gates
    const riskCheck = deterministicRiskEngine.evaluate(decision, portfolio, snapshot, features);

    // 6. Unified Position Sizing
    const positionSizing = positionSizingEngine.calculateSize({
      symbol: snapshot.symbol,
      entryPrice: decision.entry || snapshot.price,
      stopLossPrice: decision.stopLoss,
      accountEquity: allocatedCapital,
      riskPercent,
      regime,
    });

    decision.positionSize = positionSizing.sizeUnits;

    return {
      features,
      signals,
      regime,
      fusion,
      decision,
      riskCheck,
      positionSizing,
      timestamp: Date.now(),
    };
  }

  private buildDeterministicDecision(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType,
    riskPercent: number
  ): LLMDecision {
    const price = snapshot.price;
    const action = fusion.dominantAction;
    const isBuy = action === 'BUY';
    const isSell = action === 'SELL';

    const atr = features.atr || price * 0.015;
    const entry = isBuy || isSell ? price : null;
    const stopLoss = isBuy ? price - 1.5 * atr : isSell ? price + 1.5 * atr : null;
    const takeProfit = isBuy ? price + 3.0 * atr : isSell ? price - 3.0 * atr : null;

    return {
      action,
      confidence: fusion.confidence,
      entry,
      stopLoss,
      takeProfit,
      riskPercent,
      timeHorizon: 'INTRADAY',
      regime,
      reasoning: [
        `Dominant consensus: ${action} (${(fusion.confidence * 100).toFixed(0)}% confidence)`,
        `Market Regime: ${regime}`,
        `ATR: $${atr.toFixed(2)} | Target R/R: 2.0`,
      ],
      invalidation: [
        isBuy ? `Close below stop loss $${stopLoss?.toFixed(2)}` : isSell ? `Close above stop loss $${stopLoss?.toFixed(2)}` : 'Market consolidation',
      ],
    };
  }
}

export const tradingDecisionEngine = new TradingDecisionEngine();
