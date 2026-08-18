'use client';

import React, { useState } from 'react';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { StrategySidebar, StrategyHubNavId, StrategyStatusFilter } from '@/components/strategy/StrategySidebar';
import { StrategyInspector, StrategyItemData } from '@/components/strategy/StrategyInspector';
import {
  Bot,
  Zap,
  TrendingUp,
  Brain,
  Flame,
  Wind,
  Search,
  Edit2,
  ListOrdered,
  Copy,
  Trash2,
} from 'lucide-react';

interface StrategyViewProps {
  onNavigateDashboard?: () => void;
  onNavigateTerminal?: () => void;
  onNavigateSettings?: () => void;
}

const STRATEGY_DATA: (StrategyItemData & { iconType: string })[] = [
  {
    id: 'strat-1',
    name: 'AI Quant Core v1.3',
    version: 'v1.3',
    iconType: 'bot',
    status: 'ACTIVE',
    allocation: '$ 85.00%',
    currentPosition: 'LONG BTC',
    dailyPnL: '+$1,248.31',
    dailyPnLVal: 1248.31,
    totalReturn: '+11.01%',
    winRateRR: '68% | 2.4:1',
    sparkline: [100, 102, 105, 103, 108, 111],
    sparkColor: '#00D8F6',
    fusionScore: 0.71,
    uptime: '1.8Ms',
    agentWeights: { technical: 95, sentiment: 70, liquidity: 85, macro: 45, execution: 80 },
    riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 5.0 },
  },
  {
    id: 'strat-2',
    name: 'Momentum Sweep v1',
    version: 'v1.0',
    iconType: 'zap',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'FLAT',
    dailyPnL: '+$13.30',
    dailyPnLVal: 13.3,
    totalReturn: '+10.52%',
    winRateRR: '68% | 2.4:1',
    sparkline: [95, 98, 97, 101, 104, 110.52],
    sparkColor: '#F59E0B',
    fusionScore: 0.65,
    uptime: '1.2Ms',
    agentWeights: { technical: 88, sentiment: 60, liquidity: 75, macro: 50, execution: 70 },
    riskLimits: { maxPositionSize: 2.5, dailyDrawdownLimit: 4.5 },
  },
  {
    id: 'strat-3',
    name: 'Liquidity Fade v2',
    version: 'v2.0',
    iconType: 'trend',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'FLAT',
    dailyPnL: '+$20.20',
    dailyPnLVal: 20.2,
    totalReturn: '+13.72%',
    winRateRR: '66% | 2.4:1',
    sparkline: [102, 100, 104, 107, 111, 113.72],
    sparkColor: '#EF4444',
    fusionScore: 0.58,
    uptime: '840ks',
    agentWeights: { technical: 70, sentiment: 55, liquidity: 92, macro: 40, execution: 85 },
    riskLimits: { maxPositionSize: 1.5, dailyDrawdownLimit: 3.5 },
  },
  {
    id: 'strat-4',
    name: 'Liquidity Core v1',
    version: 'v1.1',
    iconType: 'brain',
    status: 'PAPER',
    allocation: '$ 35.00%',
    currentPosition: 'LONG BTC',
    dailyPnL: '+$38.70',
    dailyPnLVal: 38.7,
    totalReturn: '+18.17%',
    winRateRR: '68% | 2.4:1',
    sparkline: [98, 103, 106, 110, 114, 118.17],
    sparkColor: '#F59E0B',
    fusionScore: 0.74,
    uptime: '2.1Ms',
    agentWeights: { technical: 82, sentiment: 75, liquidity: 90, macro: 60, execution: 78 },
    riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 5.0 },
  },
  {
    id: 'strat-5',
    name: 'Liquidity Fade vv3',
    version: 'v3.0',
    iconType: 'zap',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'FLAT',
    dailyPnL: '+$12.52',
    dailyPnLVal: 12.52,
    totalReturn: '+18.60%',
    winRateRR: '68% | 2.4:1',
    sparkline: [99, 104, 108, 111, 115, 118.6],
    sparkColor: '#EAB308',
    fusionScore: 0.62,
    uptime: '620ks',
    agentWeights: { technical: 75, sentiment: 65, liquidity: 88, macro: 50, execution: 72 },
    riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 4.0 },
  },
  {
    id: 'strat-6',
    name: 'Momentum Sweep v1',
    version: 'v1.2',
    iconType: 'flame',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'FLAT',
    dailyPnL: '+$68.70',
    dailyPnLVal: 68.7,
    totalReturn: '+15.20%',
    winRateRR: '68% | 2.4:1',
    sparkline: [100, 103, 107, 109, 112, 115.2],
    sparkColor: '#8B5CF6',
    fusionScore: 0.69,
    uptime: '1.5Ms',
    agentWeights: { technical: 90, sentiment: 68, liquidity: 80, macro: 55, execution: 82 },
    riskLimits: { maxPositionSize: 2.2, dailyDrawdownLimit: 4.5 },
  },
  {
    id: 'strat-7',
    name: 'Liquidity Fade v2',
    version: 'v2.1',
    iconType: 'wind',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'FLAT',
    dailyPnL: '-$34.22',
    dailyPnLVal: -34.22,
    totalReturn: '+10.10%',
    winRateRR: '68% | 2.4:1',
    sparkline: [105, 108, 106, 109, 108, 110.1],
    sparkColor: '#EF4444',
    fusionScore: 0.54,
    uptime: '490ks',
    agentWeights: { technical: 65, sentiment: 50, liquidity: 85, macro: 40, execution: 70 },
    riskLimits: { maxPositionSize: 1.8, dailyDrawdownLimit: 3.5 },
  },
  {
    id: 'strat-8',
    name: 'Liquidity Fade v2',
    version: 'v2.2',
    iconType: 'brain',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'LONG BTC',
    dailyPnL: '-$32.17',
    dailyPnLVal: -32.17,
    totalReturn: '+13.72%',
    winRateRR: '68% | 2.4:1',
    sparkline: [101, 104, 107, 110, 112, 113.72],
    sparkColor: '#00D8F6',
    fusionScore: 0.61,
    uptime: '910ks',
    agentWeights: { technical: 78, sentiment: 60, liquidity: 86, macro: 48, execution: 75 },
    riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 4.0 },
  },
  {
    id: 'strat-9',
    name: 'AI Quant Core v1.3',
    version: 'v1.3.1',
    iconType: 'zap',
    status: 'PAPER',
    allocation: '$ 100%',
    currentPosition: 'LONG BTC',
    dailyPnL: '+$147.36',
    dailyPnLVal: 147.36,
    totalReturn: '+10.11%',
    winRateRR: '68% | 2.4:1',
    sparkline: [98, 101, 104, 107, 108, 110.11],
    sparkColor: '#00D8F6',
    fusionScore: 0.72,
    uptime: '1.4Ms',
    agentWeights: { technical: 92, sentiment: 72, liquidity: 84, macro: 50, execution: 80 },
    riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 5.0 },
  },
];

export const StrategyView: React.FC<StrategyViewProps> = ({
  onNavigateDashboard,
  onNavigateTerminal,
  onNavigateSettings,
}) => {
  const [activeSection, setActiveSection] = useState<StrategyHubNavId>('overview');
  const [statusFilter, setStatusFilter] = useState<StrategyStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('strat-1');

  const selectedStrategy =
    STRATEGY_DATA.find((s) => s.id === selectedStrategyId) || STRATEGY_DATA[0];

  const filteredStrategies = STRATEGY_DATA.filter((s) => {
    const matchesFilter = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.currentPosition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'bot':
        return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'brain':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'wind':
        return <Wind className="w-4 h-4 text-blue-400" />;
      default:
        return <Bot className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="flex gap-4 min-h-[calc(100vh-8rem)]">
      {/* Left Strategy Sidebar */}
      <StrategySidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        statusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
        activeCount={2}
        paperCount={5}
        pausedCount={3}
        archivedCount={14}
        onOpenSettings={onNavigateSettings}
      />

      {/* Main Strategy Content Area */}
      <div className="flex-1 space-y-4 min-w-0 pb-8">
        {/* Header & Optional Search Bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Strategies</h2>
            <p className="text-xs text-gray-400">Real-time overview of your paper-trading portfolio</p>
          </div>

          {/* Search Input */}
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search (optional, but good for data density)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B111E] border border-gray-800 text-xs rounded-xl pl-9 pr-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* ── TOP 5 KPI SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* 1. Total Active Capital */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Active Capital</div>
            <div className="text-lg font-black text-white mt-1">$85,000.00</div>
          </div>

          {/* 2. Combined Daily P&L */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Combined Daily P&L</div>
            <div className="text-lg font-black text-emerald-400 mt-1">
              +$1,245.31 <span className="text-xs font-normal text-emerald-400/80">(+1.01%)</span>
            </div>
          </div>

          {/* 3. Best Performing Strategy */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Best Performing Strategy</div>
            <button
              onClick={() => setSelectedStrategyId('strat-2')}
              className="text-left text-sm font-bold text-cyan-400 hover:underline mt-1 truncate"
            >
              Momentum Sweep v1
            </button>
          </div>

          {/* 4. Avg Sharpe Ratio (Active) */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Avg Sharpe Ratio (Active)</div>
              <div className="text-lg font-black text-white mt-1">1.95</div>
            </div>
            <div className="w-16 h-8">
              <Sparkline data={[1.6, 1.72, 1.8, 1.88, 1.95]} color="#10B981" height={28} />
            </div>
          </div>

          {/* 5. Global Win Rate */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Global Win Rate</div>
              <div className="text-lg font-black text-white mt-1">64.8%</div>
            </div>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" className="transform -rotate-90">
                <circle cx="16" cy="16" r="12" stroke="#1E293B" strokeWidth="3" fill="none" />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  stroke="#10B981"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="75.4"
                  strokeDashoffset="26.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── STRATEGY ROSTER TABLE ── */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B]">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-3">Strategy Roster</div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2.5 font-bold">Name & Version</th>
                  <th className="pb-2.5 font-bold">Status</th>
                  <th className="pb-2.5 font-bold">Allocation</th>
                  <th className="pb-2.5 font-bold">Current Position</th>
                  <th className="pb-2.5 font-bold text-right">Daily P&L</th>
                  <th className="pb-2.5 font-bold text-right">Total Return</th>
                  <th className="pb-2.5 font-bold text-center">Win Rate & R:R</th>
                  <th className="pb-2.5 font-bold text-center">30-Day Equity Curve</th>
                  <th className="pb-2.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {filteredStrategies.map((strat) => {
                  const isSelected = selectedStrategy.id === strat.id;
                  return (
                    <tr
                      key={strat.id}
                      onClick={() => setSelectedStrategyId(strat.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-600/15 border-l-2 border-cyan-400' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      {/* Name & Version */}
                      <td className="py-2.5 flex items-center gap-2 text-white font-bold whitespace-nowrap">
                        <div className="w-6 h-6 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center">
                          {getStrategyIcon(strat.iconType)}
                        </div>
                        <span>{strat.name}</span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase ${
                            strat.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : strat.status === 'PAPER'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {strat.status}
                        </span>
                      </td>

                      {/* Allocation */}
                      <td className="py-2.5 text-gray-300 font-mono text-[11px]">{strat.allocation}</td>

                      {/* Current Position */}
                      <td className="py-2.5">
                        <span
                          className={`font-semibold text-[11px] ${
                            strat.currentPosition.includes('LONG')
                              ? 'text-emerald-400'
                              : strat.currentPosition.includes('SHORT')
                              ? 'text-rose-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {strat.currentPosition}
                        </span>
                      </td>

                      {/* Daily P&L */}
                      <td
                        className={`py-2.5 text-right font-bold font-mono text-[11px] ${
                          strat.dailyPnLVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {strat.dailyPnL}
                      </td>

                      {/* Total Return */}
                      <td className="py-2.5 text-right font-bold font-mono text-[11px] text-emerald-400">
                        {strat.totalReturn}
                      </td>

                      {/* Win Rate & R:R */}
                      <td className="py-2.5 text-center font-mono text-[11px] text-gray-300">
                        {strat.winRateRR}
                      </td>

                      {/* 30-Day Equity Curve */}
                      <td className="py-2.5 text-center">
                        <div className="w-20 h-5 inline-block">
                          <Sparkline data={strat.sparkline} color={strat.sparkColor} height={20} width={80} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-gray-400">
                          <button
                            title="Edit"
                            className="p-1 hover:text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Logs"
                            className="p-1 hover:text-cyan-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Duplicate"
                            className="p-1 hover:text-emerald-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete"
                            className="p-1 hover:text-rose-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Strategy Inspector */}
      <StrategyInspector
        strategy={selectedStrategy}
        onOpenFullDashboard={onNavigateDashboard}
      />
    </div>
  );
};
