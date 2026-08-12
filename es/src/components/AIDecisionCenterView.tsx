'use client';

import React from 'react';
import { AgentSignal, SignalFusionResult, LLMDecision, RiskCheckResult, FeatureVector } from '@/types/trading';
import { Brain, Cpu, ShieldCheck, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AIDecisionCenterViewProps {
  signals: AgentSignal[];
  fusion: SignalFusionResult;
  decision: LLMDecision;
  riskCheck: RiskCheckResult;
  features: FeatureVector;
}

export const AIDecisionCenterView: React.FC<AIDecisionCenterViewProps> = ({
  signals,
  fusion,
  decision,
  riskCheck,
  features,
}) => {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-400" />
            AI Decision Center & Multi-Agent Audit
          </h2>
          <p className="text-xs text-gray-400">
            Real-time evaluation across 8 Specialist Quant Modules, Signal Fusion Engine, Structured LLM Moderator, and Hard Risk Gates.
          </p>
        </div>
      </div>

      {/* Grid: Signal Fusion Summary & LLM Decision Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal Fusion Matrix Card */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Signal Fusion Matrix (Weighted Scoring)
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">
              Dominant: {fusion.dominantAction}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">BUY Score</span>
              <p className="text-xl font-black text-emerald-400">{(fusion.buyScore * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">SELL Score</span>
              <p className="text-xl font-black text-rose-400">{(fusion.sellScore * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">HOLD Score</span>
              <p className="text-xl font-black text-amber-400">{(fusion.holdScore * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">NO_TRADE Score</span>
              <p className="text-xl font-black text-gray-400">{(fusion.noTradeScore * 100).toFixed(0)}%</p>
            </div>
          </div>

          {fusion.conflictingSignals && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-400 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Signal Conflict Detected: Technical indicators and Positioning scores diverge. Abstention recommended.</span>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dynamic Regime Weighting</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {Object.entries(fusion.agentWeights).map(([agent, weight]) => (
                <div key={agent} className="p-2 bg-[#0B111E] rounded border border-gray-800/60 flex justify-between">
                  <span className="text-gray-400 capitalize">{agent}</span>
                  <span className="font-bold text-white">{(weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LLM Moderator Structured Output Card */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              Lightweight LLM Moderator Rationale
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-bold">
              Horizon: {decision.timeHorizon}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Decision Reasoning</span>
              <ul className="space-y-1.5 bg-[#0B111E] p-3 rounded-xl border border-gray-800">
                {decision.reasoning.map((r, i) => (
                  <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Invalidation Criteria</span>
              <ul className="space-y-1 bg-[#0B111E] p-3 rounded-xl border border-gray-800">
                {decision.invalidation.map((inv, i) => (
                  <li key={i} className="text-xs text-rose-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    {inv}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hard Risk Gate Audit Checklist */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Hard Risk Gate Audit Checklist (Deterministic Authority)
          </h3>
          <span className={`text-xs px-3 py-1 rounded font-bold ${riskCheck.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            Audit Result: {riskCheck.approved ? 'PASSED' : 'FAILED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 flex items-start gap-3">
            {riskCheck.riskRewardRatio >= 2.0 ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            <div>
              <span className="text-xs font-bold text-white block">Min Risk:Reward Gate (&gt;= 2.0)</span>
              <span className="text-xs text-gray-400">Current R:R: {riskCheck.riskRewardRatio > 0 ? `${riskCheck.riskRewardRatio}:1` : 'N/A'}</span>
            </div>
          </div>

          <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 flex items-start gap-3">
            {!riskCheck.newsKillSwitchActive ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            <div>
              <span className="text-xs font-bold text-white block">Economic Event Kill Switch</span>
              <span className="text-xs text-gray-400">Next event in {features.minutesToNextEvent} mins ({riskCheck.newsKillSwitchActive ? 'PAUSED' : 'CLEARED'})</span>
            </div>
          </div>

          <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 flex items-start gap-3">
            {riskCheck.dailyDrawdownPercent < 5.0 ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            <div>
              <span className="text-xs font-bold text-white block">Max Daily Drawdown (&lt; 5.0%)</span>
              <span className="text-xs text-gray-400">Current Drawdown: {riskCheck.dailyDrawdownPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
