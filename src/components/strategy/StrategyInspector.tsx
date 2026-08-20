'use client';

import React from 'react';
import { Bot, ChevronRight } from 'lucide-react';

export interface StrategyItemData {
  id: string;
  name: string;
  version: string;
  status: 'ACTIVE' | 'PAPER' | 'PAUSED' | 'ARCHIVED';
  allocation: string;
  currentPosition: string;
  dailyPnL: string;
  dailyPnLVal: number;
  totalReturn: string;
  winRateRR: string;
  sparkline: number[];
  sparkColor: string;
  fusionScore: number;
  uptime: string;
  agentWeights: {
    technical: number;
    sentiment: number;
    liquidity: number;
    macro: number;
    execution: number;
  };
  riskLimits: {
    maxPositionSize: number;
    dailyDrawdownLimit: number;
  };
}

interface StrategyInspectorProps {
  strategy: StrategyItemData;
  onOpenFullDashboard?: () => void;
}

export const StrategyInspector: React.FC<StrategyInspectorProps> = ({
  strategy,
  onOpenFullDashboard,
}) => {
  const fusionScore = strategy.fusionScore ?? 0.71;
  const size = 130;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const angle = fusionScore * 180;
  const needleAngle = -180 + angle;

  return (
    <aside className="w-72 bg-[#0B111E] border-l border-[#1E293B] p-4 flex flex-col justify-between shrink-0 select-none overflow-y-auto custom-scrollbar space-y-4">
      {/* Header */}
      <div>
        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Strategy Inspector</div>

        {/* Strategy Profile */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-800/80">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{strategy.name}</h3>
            <div className="text-[11px] text-gray-400">Version {strategy.version}</div>
          </div>
        </div>

        {/* Uptime Sub-Bar */}
        <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 pb-1">
          <span>Uptime: <strong className="text-gray-200">{strategy.uptime || 'Active'}</strong></span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            24/7 Engine
          </span>
        </div>

        {/* Current State & Fusion Score Gauge */}
        <div className="pt-3 pb-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 text-center">
            Current State & Fusion Score
          </div>

          <div className="relative flex flex-col items-center justify-center my-1">
            <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`} className="overflow-visible">
              <defs>
                <linearGradient id="fusionGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              {/* Background Arc */}
              <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke="#1E293B"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Gradient Score Arc */}
              <path
                d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                fill="none"
                stroke="url(#fusionGaugeGrad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Needle Base */}
              <circle cx={size / 2} cy={size / 2} r="4" fill="#38BDF8" />
              <line
                x1={size / 2}
                y1={size / 2}
                x2={size / 2 + (radius - 10) * Math.cos((needleAngle * Math.PI) / 180)}
                y2={size / 2 + (radius - 10) * Math.sin((needleAngle * Math.PI) / 180)}
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 4px #38BDF8)' }}
              />
            </svg>

            {/* Score Text */}
            <div className="text-center mt-[-4px]">
              <div className="text-base font-black text-white">{fusionScore.toFixed(2)}</div>
              <div className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                {fusionScore > 0.65 ? 'STRONG SCORE' : fusionScore > 0.45 ? 'MODERATE SCORE' : 'WEAK SCORE'}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Weightings */}
        <div className="pt-2 pb-2 space-y-1.5 border-t border-gray-800/80">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Agent Weighting</div>
          {[
            { label: 'Technical', val: strategy.agentWeights?.technical ?? 95 },
            { label: 'Sentiment', val: strategy.agentWeights?.sentiment ?? 70 },
            { label: 'Liquidity', val: strategy.agentWeights?.liquidity ?? 85 },
            { label: 'Macro', val: strategy.agentWeights?.macro ?? 45 },
            { label: 'Execution', val: strategy.agentWeights?.execution ?? 80 },
          ].map((ag, i) => (
            <div key={i} className="flex items-center justify-between text-xs gap-2">
              <span className="text-gray-400 text-[11px] w-16">{ag.label}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/40 transition-all duration-300"
                  style={{ width: `${ag.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Risk Limits */}
        <div className="pt-2 pb-2 space-y-1.5 border-t border-gray-800/80">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Risk Limits</div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-400">Max Position Size</span>
              <span className="font-semibold text-white">{strategy.riskLimits?.maxPositionSize ?? 2.0}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${(strategy.riskLimits?.maxPositionSize ?? 2) * 20}%` }}
              />
            </div>
          </div>

          <div className="pt-1">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-400">Daily Drawdown Limit</span>
              <span className="font-semibold text-white">{strategy.riskLimits?.dailyDrawdownLimit ?? 5.0}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${(strategy.riskLimits?.dailyDrawdownLimit ?? 5) * 15}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Status & Allocations */}
        <div className="pt-2 pb-1 border-t border-gray-800/80 space-y-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Live Allocation & State</div>
          <div className="p-2 rounded-xl bg-[#080E1A] border border-gray-800 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Allocated Capital:</span>
              <span className="font-mono font-bold text-white">{strategy.allocation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active Position:</span>
              <span className="font-mono font-bold text-cyan-300">{strategy.currentPosition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Return:</span>
              <span className={`font-mono font-bold ${strategy.dailyPnLVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {strategy.totalReturn}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="pt-2">
        <button
          onClick={onOpenFullDashboard}
          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-1"
        >
          <span>View Full Strategy Dashboard</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
