'use client';

import React from 'react';
import { AgentSignal, SignalFusionResult, LLMDecision, RiskCheckResult, MarketSnapshot } from '@/types/trading';
import { Brain, Cpu, ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AIDecisionCenterViewProps {
  signals: AgentSignal[];
  fusion: SignalFusionResult | null;
  decision: LLMDecision | null;
  riskCheck: RiskCheckResult | null;
  snapshot: MarketSnapshot | null;
  onExecuteTrade: () => void;
}

export const AIDecisionCenterView: React.FC<AIDecisionCenterViewProps> = ({
  signals, fusion, decision, riskCheck, snapshot, onExecuteTrade,
}) => {

  if (!fusion || !decision) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" />
          <p className="text-gray-400 text-sm">AI engine initializing...</p>
          <p className="text-gray-600 text-xs mt-1">Fetching market data and computing signals</p>
        </div>
      </div>
    );
  }

  const readyToTrade = riskCheck?.approved
    && decision.action !== 'NO_TRADE'
    && decision.action !== 'HOLD'
    && !(snapshot?.dataQuality.criticalStale);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-400" />
          AI Decision Center
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          8 Specialist Agents → Signal Fusion → LLM Advisory → Deterministic Risk Gate
        </p>
      </div>

      {/* Grid: Fusion + LLM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal Fusion */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Signal Fusion Matrix
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
              fusion.dominantAction === 'BUY' ? 'border-emerald-500/40 text-emerald-400' :
              fusion.dominantAction === 'SELL' ? 'border-rose-500/40 text-rose-400' : 'border-gray-700 text-gray-400'
            }`}>
              {fusion.dominantAction}
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
              <span className="text-xs text-gray-400">NO_TRADE</span>
              <p className="text-xl font-black text-gray-400">{(fusion.noTradeScore * 100).toFixed(0)}%</p>
            </div>
          </div>

          {fusion.conflictingSignals && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Signal Conflict — BUY/SELL too close. Abstaining.
            </div>
          )}

          {fusion.abstainReason && (
            <p className="text-xs text-gray-500 italic">ℹ {fusion.abstainReason}</p>
          )}

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Agent Weights</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {Object.entries(fusion.agentWeights).map(([agent, weight]) => (
                <div key={agent} className="p-2 bg-[#0B111E] rounded border border-gray-800/60 flex justify-between">
                  <span className="text-gray-400 capitalize">{agent}</span>
                  <span className="font-bold text-white">{weight.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            <span>Confidence: </span>
            <strong className={fusion.confidence > 0.7 ? 'text-emerald-400' : fusion.confidence > 0.5 ? 'text-amber-400' : 'text-rose-400'}>
              {(fusion.confidence * 100).toFixed(0)}%
            </strong>
          </div>
        </div>

        {/* LLM Decision */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-400" />
              LLM Advisory Decision
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded font-bold border ${
              decision.action === 'BUY' ? 'border-emerald-500/40 text-emerald-400' :
              decision.action === 'SELL' ? 'border-rose-500/40 text-rose-400' : 'border-gray-700 text-gray-400'
            }`}>
              {decision.action} · {(decision.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-gray-400 block">Entry</span><strong className="text-white">{decision.entry != null ? `$${decision.entry.toLocaleString()}` : '—'}</strong></div>
            <div><span className="text-gray-400 block">Horizon</span><strong className="text-white">{decision.timeHorizon}</strong></div>
            <div><span className="text-gray-400 block">Stop Loss</span><strong className="text-rose-400">{decision.stopLoss != null ? `$${decision.stopLoss.toLocaleString()}` : '—'}</strong></div>
            <div><span className="text-gray-400 block">Take Profit</span><strong className="text-emerald-400">{decision.takeProfit != null ? `$${decision.takeProfit.toLocaleString()}` : '—'}</strong></div>
            <div><span className="text-gray-400 block">Risk:Reward</span><strong className="text-white">{decision.riskReward ? `${decision.riskReward}:1` : '—'}</strong></div>
            <div><span className="text-gray-400 block">Regime</span><strong className="text-white">{decision.regime}</strong></div>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Reasoning</span>
            <ul className="space-y-1.5 bg-[#0B111E] p-3 rounded-xl border border-gray-800">
              {decision.reasoning.map((r, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {decision.invalidation.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Invalidation</span>
              <ul className="space-y-1 bg-[#0B111E] p-3 rounded-xl border border-gray-800">
                {decision.invalidation.map((inv, i) => (
                  <li key={i} className="text-xs text-rose-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    {inv}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {decision.decisionId && (
            <p className="text-[10px] text-gray-600 font-mono">{decision.decisionId}</p>
          )}
        </div>
      </div>

      {/* Risk Gate */}
      {riskCheck && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Deterministic Risk Gate (Final Authority)
            </h3>
            <span className={`text-xs px-3 py-1 rounded font-bold border ${
              riskCheck.approved ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}>
              {riskCheck.approved ? '✓ APPROVED' : '✗ REJECTED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 flex items-start gap-3">
              {riskCheck.riskRewardRatio >= 2.0
                ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              <div>
                <span className="text-xs font-bold text-white block">R:R Gate (≥ 2.0)</span>
                <span className="text-xs text-gray-400">Current: {riskCheck.riskRewardRatio > 0 ? `${riskCheck.riskRewardRatio}:1` : 'N/A'}</span>
              </div>
            </div>

            <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 flex items-start gap-3">
              {!riskCheck.newsKillSwitchActive
                ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              <div>
                <span className="text-xs font-bold text-white block">News Kill Switch</span>
                <span className="text-xs text-gray-400">{riskCheck.newsKillSwitchActive ? 'ACTIVE — Trading paused' : 'Cleared'}</span>
              </div>
            </div>

            <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 flex items-start gap-3">
              {riskCheck.dailyDrawdownPercent < 5.0
                ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              <div>
                <span className="text-xs font-bold text-white block">Daily Drawdown (&lt; 5%)</span>
                <span className="text-xs text-gray-400">Current: {riskCheck.dailyDrawdownPercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {riskCheck.dataQualityBlock && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-semibold">
              ⚠ DATA QUALITY BLOCK — Market data is stale. Trading disabled until data is live.
            </div>
          )}

          {riskCheck.failedGates.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase">Failed Gates</span>
              {riskCheck.failedGates.map((g, i) => (
                <p key={i} className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg">{g}</p>
              ))}
            </div>
          )}

          {riskCheck.warnings.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase">Warnings</span>
              {riskCheck.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg">{w}</p>
              ))}
            </div>
          )}

          {riskCheck.calculatedPositionSize > 0 && (
            <div className="text-xs text-gray-300">
              <span className="text-gray-400">Risk-based position size: </span>
              <strong className="text-white">{riskCheck.calculatedPositionSize.toFixed(6)} units</strong>
              <span className="text-gray-500 ml-2">(max allowed: {riskCheck.maxAllowedPositionSize.toFixed(6)})</span>
            </div>
          )}

          {readyToTrade && (
            <button
              onClick={onExecuteTrade}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                decision.action === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
              }`}
            >
              Execute {decision.action} — {riskCheck.calculatedPositionSize.toFixed(4)} units @ ${decision.entry != null ? decision.entry.toLocaleString() : 'market'}
            </button>
          )}
        </div>
      )}

      {/* Agent Detail Grid */}
      {signals.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-4">Agent Evidence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {signals.map(sig => {
              const isUnavail = sig.bias === 'UNAVAILABLE';
              return (
                <div key={sig.agentId} className={`p-3 rounded-xl bg-[#0B111E] border ${
                  isUnavail ? 'border-gray-800' :
                  sig.action === 'BUY' ? 'border-emerald-500/20' :
                  sig.action === 'SELL' ? 'border-rose-500/20' : 'border-gray-800'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-400 font-bold">{sig.agentName.replace(' Agent', '')}</span>
                    <span className={`text-[10px] font-black ${
                      sig.action === 'BUY' ? 'text-emerald-400' :
                      sig.action === 'SELL' ? 'text-rose-400' : 'text-gray-500'
                    }`}>{sig.action}</span>
                  </div>
                  {isUnavail ? (
                    <p className="text-[10px] text-gray-600 italic">No data source</p>
                  ) : (
                    <div className="space-y-0.5">
                      {sig.evidence.slice(0, 2).map((ev, i) => (
                        <div key={i} className="flex justify-between text-[10px]">
                          <span className="text-gray-500">{ev.label}</span>
                          <span className={ev.signal === 'BULLISH' ? 'text-emerald-400' : ev.signal === 'BEARISH' ? 'text-rose-400' : 'text-gray-300'}>
                            {ev.value}
                          </span>
                        </div>
                      ))}
                      <div className="mt-1 h-0.5 bg-gray-800 rounded overflow-hidden">
                        <div className="h-full bg-blue-500/60 rounded" style={{ width: `${sig.confidence * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
