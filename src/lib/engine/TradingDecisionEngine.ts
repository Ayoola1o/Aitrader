'use client';

import {
  MarketSnapshot,
  PortfolioState,
  FeatureVector,
  AgentSignal,
  SignalFusionResult,
  LLMDecision,
  RegimeType,
  RiskCheckResult,
} from '@/types/trading';
import { featureEngine } from '@/lib/features/engine';
import { specialistAgentSystem } from '@/lib/agents/specialists';
import { signalFusionEngine } from '@/lib/fusion/engine';
import { aiProviderManager } from '@/lib/llm/providers';
import { deterministicRiskEngine } from '@/lib/risk/engine';
import { positionSizingEngine, PositionSizingResult } from '@/lib/risk/PositionSizingEngine';

export type LLMOptimizationMode = 'ALWAYS' | 'CANDIDATE_ENTRIES' | 'REGIME_CHANGES' | 'CONFLICTS' | 'OFF';

export interface DecisionEngineInput {
  snapshot: MarketSnapshot;
  portfolio: PortfolioState;
  allocatedCapital?: number;
  riskPercent?: number;
  forceDeterministic?: boolean;
  llmOptimizationMode?: LLMOptimizationMode;
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
   * Unified single decision pipeline (Item 6, 7, 15, 17):
   * 1. Compute features
   * 2. Evaluate 8 specialist agents
   * 3. Consensus fusion
   * 4. AI / Deterministic Decision synthesis with selective LLM review (Item 17)
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
      llmOptimizationMode = snapshot.appMode === 'REPLAY' ? 'CANDIDATE_ENTRIES' : 'ALWAYS',
    } = input;

    // 1. Calculate Standard Quantitative Features
    const features = featureEngine.calculateFeatures(snapshot);

    // 2. Evaluate All 8 Specialist Agents
    const { signals, regime } = specialistAgentSystem.evaluateAllAgents(snapshot, features);

    // 3. Signal Fusion Matrix
    const fusion = signalFusionEngine.fuseSignals(signals, regime);

    // 4. Decision Synthesis (LLM Optimization Policy - Item 17)
    let shouldInvokeLLM = !forceDeterministic && llmOptimizationMode !== 'OFF';

    if (shouldInvokeLLM) {
      if (llmOptimizationMode === 'CANDIDATE_ENTRIES') {
        // Only review candidate trade entries (confidence >= 0.65)
        shouldInvokeLLM = (fusion.dominantAction === 'BUY' || fusion.dominantAction === 'SELL') && fusion.confidence >= 0.65;
      } else if (llmOptimizationMode === 'CONFLICTS') {
        // Only review when agent signals conflict
        shouldInvokeLLM = fusion.conflictingSignals;
      } else if (llmOptimizationMode === 'REGIME_CHANGES') {
        // Only review during structural regime transitions
        shouldInvokeLLM = regime === 'TRANSITION' || regime === 'BREAKOUT';
      }
    }

    let decision: LLMDecision;
    if (shouldInvokeLLM) {
      decision = await aiProviderManager.generateStructuredDecision(
        snapshot,
        features,
        signals,
        fusion,
        regime
      );
    } else {
      decision = this.buildDeterministicDecision(snapshot, features, signals, fusion, regime, riskPercent);
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
    const atr = features.atr > 0 ? features.atr : price * 0.012;
    const action = fusion.dominantAction;

    if (action === 'HOLD' || action === 'NO_TRADE') {
      return {
        action,
        confidence: fusion.confidence,
        entry: null,
        stopLoss: null,
        takeProfit: null,
        riskPercent: 0,
        positionSize: 0,
        riskReward: 0,
        reasoning: [
          fusion.abstainReason ?? 'Multi-agent consensus indicates no directional edge in current regime.',
          `Regime: ${regime}. Fusion confidence: ${(fusion.confidence * 100).toFixed(0)}%.`,
        ],
        invalidation: ['Wait for directional volume expansion or key level breach.'],
        timeHorizon: 'INTRADAY',
        regime,
      };
    }

    const isLong = action === 'BUY';
    const stopDistance = atr * 1.5;
    const stopLoss = Number((isLong ? price - stopDistance : price + stopDistance).toFixed(price > 100 ? 2 : 5));
    const takeProfit = Number((isLong ? price + stopDistance * 2.5 : price - stopDistance * 2.5).toFixed(price > 100 ? 2 : 5));
    const riskReward = stopDistance > 0 ? 2.5 : 0;

    return {
      action,
      confidence: fusion.confidence,
      entry: price,
      stopLoss,
      takeProfit,
      riskPercent,
      riskReward,
      reasoning: [
        `${regime} regime confirmed with multi-agent directional alignment.`,
        `Buy Score: ${fusion.buyScore.toFixed(2)}, Sell Score: ${fusion.sellScore.toFixed(2)}.`,
        `ADX: ${features.adx.toFixed(1)}, RSI: ${features.rsi.toFixed(1)}, VWAP Delta: ${((price - features.vwap) / features.vwap * 100).toFixed(2)}%.`,
      ],
      invalidation: [
        isLong ? `Breach below Stop Loss $${stopLoss}` : `Breach above Stop Loss $${stopLoss}`,
        'Volume collapse or severe book spread expansion',
      ],
      timeHorizon: 'INTRADAY',
      regime,
    };
  }
}

export const tradingDecisionEngine = new TradingDecisionEngine();
