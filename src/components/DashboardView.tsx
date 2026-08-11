'use client';

import React from 'react';
import { MarketSnapshot, AgentSignal, LLMDecision, RiskCheckResult, PortfolioState } from '@/types/trading';
import { TrendingUp, ShieldCheck, Zap, Activity, Brain, Target, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardViewProps {
  snapshot: MarketSnapshot;
  signals: AgentSignal[];
  decision: LLMDecision;
  riskCheck: RiskCheckResult;
  portfolio: PortfolioState;
  onExecuteTrade: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  signals,
  decision,
  riskCheck,
  portfolio,
  onExecuteTrade,
}) => {
  const isBullish = decision.action === 'BUY';
  const isBearish = decision.action === 'SELL';

  return (
    <div className="space-y-6">
      {/* Top Banner Ticker & Quick Status */}
      <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white tracking-wide">{snapshot.symbol}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                LIVE STREAM
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Funding: {(snapshot.fundingRate * 100).toFixed(4)}% | OI: ${(snapshot.openInterest / 1e6).toFixed(1)}M | L/S: {snapshot.longShortRatio.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Current Price</p>
            <p className="text-2xl font-extrabold text-white">${snapshot.price.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">24h Change</p>
            <p className={`text-xl font-bold flex items-center ${snapshot.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {snapshot.change24h >= 0 ? <ArrowUpRight className="w-5 h-5 mr-1" /> : <ArrowDownRight className="w-5 h-5 mr-1" />}
              {snapshot.change24h >= 0 ? '+' : ''}{snapshot.change24h}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">24h High / Low</p>
            <p className="text-sm font-semibold text-gray-200">${snapshot.high24h} / ${snapshot.low24h}</p>
          </div>
        </div>
      </div>

      {/* Main AI Decision Card & Portfolio Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Decision Highlight Card */}
        <div className={`lg:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden ${
          isBullish ? 'glow-bullish border-emerald-500/40' : isBearish ? 'glow-bearish border-rose-500/40' : 'border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isBullish ? 'bg-emerald-500/20 text-emerald-400' : isBearish ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Decision Engine Output</span>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  Action Recommendation:
                  <span className={`px-3 py-0.5 rounded-lg text-lg ${
                    isBullish ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50' :
                    isBearish ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' :
                    'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                  }`}>
                    {decision.action}
                  </span>
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">Confidence Score</span>
              <p className="text-2xl font-black text-blue-400">{(decision.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-5 bg-[#0B111E] p-4 rounded-xl border border-gray-800/80">
            <div>
              <span className="text-xs text-gray-400 block">Suggested Entry</span>
              <span className="text-lg font-bold text-white">{decision.entry ? `$${decision.entry}` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Stop Loss</span>
              <span className="text-lg font-bold text-rose-400">{decision.stopLoss ? `$${decision.stopLoss}` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Take Profit Target</span>
              <span className="text-lg font-bold text-emerald-400">{decision.takeProfit ? `$${decision.takeProfit}` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Risk / Reward Ratio</span>
              <span className="text-lg font-bold text-blue-400">{riskCheck.riskRewardRatio > 0 ? `${riskCheck.riskRewardRatio}:1` : 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Reasoning & Synthesis</span>
            <ul className="space-y-1.5">
              {decision.reasoning.map((r, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-5 h-5 ${riskCheck.approved ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="text-xs font-medium text-gray-300">
                Hard Risk Gate: {riskCheck.approved ? <span className="text-emerald-400 font-bold">APPROVED</span> : <span className="text-rose-400 font-bold">REJECTED</span>}
              </span>
            </div>
            <button
              onClick={onExecuteTrade}
              disabled={!riskCheck.approved || (decision.action !== 'BUY' && decision.action !== 'SELL')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                riskCheck.approved && (decision.action === 'BUY' || decision.action === 'SELL')
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            >
              Execute Paper Trade
            </button>
          </div>
        </div>

        {/* Paper Portfolio Quick Summary */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Paper Portfolio
              </h3>
              <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-medium">Active</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-400">Total Portfolio Equity</span>
                <p className="text-3xl font-black text-white">${portfolio.equity.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Total P&L</span>
                  <p className={`text-base font-bold ${portfolio.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL} ({portfolio.totalPnLPercent}%)
                  </p>
                </div>
                <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Win Rate</span>
                  <p className="text-base font-bold text-blue-400">{portfolio.winRate}%</p>
                </div>
                <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Profit Factor</span>
                  <p className="text-base font-bold text-purple-400">{portfolio.profitFactor}</p>
                </div>
                <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-400">Max Drawdown</span>
                  <p className="text-base font-bold text-amber-400">{portfolio.maxDrawdownPercent}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>Free Margin: ${portfolio.freeMargin.toLocaleString()}</span>
            <span>Used: ${portfolio.marginUsed.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Specialist Agents Breakdown Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Specialist Agents Signal Matrix (8 Quant Modules)
          </h3>
          <span className="text-xs text-gray-400">Deterministic Feature + AI Evaluation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {signals.map((sig) => (
            <div key={sig.agentId} className="glass-panel p-4 rounded-xl border border-gray-800 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">{sig.agentName}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  sig.bias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  sig.bias === 'BEARISH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  sig.bias === 'CAUTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-gray-800 text-gray-300 border border-gray-700'
                }`}>
                  {sig.bias}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3 min-h-[36px] line-clamp-2">{sig.summary}</p>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${sig.bias === 'BULLISH' ? 'bg-emerald-400' : sig.bias === 'BEARISH' ? 'bg-rose-400' : 'bg-amber-400'}`}
                  style={{ width: `${sig.score * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2 text-[11px] text-gray-500">
                <span>Score: {(sig.score * 100).toFixed(0)}%</span>
                <span>Conf: {(sig.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
