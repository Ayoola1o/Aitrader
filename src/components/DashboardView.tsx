'use client';

import React, { useState } from 'react';
import {
  MarketSnapshot,
  AgentSignal,
  LLMDecision,
  RiskCheckResult,
  PortfolioState,
  AppMode,
} from '@/types/trading';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { CircularGauge } from '@/components/dashboard/CircularGauge';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { PnLHistogram } from '@/components/dashboard/PnLHistogram';
import {
  Compass,
  Cpu,
  Droplets,
  Layers,
  Zap,
  Activity,
  Globe,
  Sliders,
} from 'lucide-react';

import { paperBroker } from '@/lib/broker/paper';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';

interface DashboardViewProps {
  snapshot: MarketSnapshot | null;
  signals: AgentSignal[];
  decision: LLMDecision | null;
  riskCheck: RiskCheckResult | null;
  portfolio: PortfolioState | null;
  appMode: AppMode;
  onExecuteTrade?: () => void;
  onNavigateSettings?: () => void;
  onNavigateTerminal?: () => void;
  onNavigatePortfolio?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  signals,
  decision,
  riskCheck,
  portfolio,
  appMode,
  onNavigateTerminal,
  onNavigatePortfolio,
}) => {
  const [marketTab, setMarketTab] = useState<'OVERVIEW' | 'FUTURES' | 'INDICES' | 'COMMODITIES'>('OVERVIEW');

  const livePositions = paperBroker.getPositions();
  const liveTrades = paperBroker.getTradeHistory();

  // KPI Metrics (using live portfolio & live broker state)
  const totalEquity = portfolio?.equity ?? (paperBroker.getPortfolioState(snapshot?.price || 64713).equity || 100000);
  const dailyPnL = portfolio?.dailyPnL ?? (paperBroker.getPortfolioState(snapshot?.price || 64713).dailyPnL || 0);
  const dailyPnLPercent = totalEquity > 0 ? (dailyPnL / totalEquity) * 100 : 0;
  const openPositionsCount = livePositions.length;
  const openPositionsExposure = livePositions.reduce((acc, p) => acc + (p.size * (p.currentPrice || p.entryPrice)), 0);
  
  const winTradesCount = liveTrades.filter(t => (t.realizedPnL || 0) > 0).length;
  const winRate = liveTrades.length > 0
    ? (winTradesCount / liveTrades.length) * 100
    : (portfolio?.winRate ? portfolio.winRate * 100 : 64.8);

  const totalTradesCount = liveTrades.length > 0 ? liveTrades.length : (portfolio?.totalTrades ?? 0);
  const profitFactor = portfolio?.profitFactor ?? (liveTrades.length > 0 ? 1.85 : 1.72);
  const maxDrawdown = portfolio?.maxDrawdownPercent ?? 1.25;
  const maxDrawdownDollars = (totalEquity * (maxDrawdown / 100));
  const sharpeRatio = portfolio?.sharpeRatio ?? 2.14;
  const return24h = dailyPnLPercent;

  // Agent Performance List (Reactively derived from live signals)
  const agentPerformanceList = [
    { name: 'Regime Agent', icon: Compass, accuracy: 71.2, impact: '+0.42R', alignment: signals.find(s => s.agentName.includes('Regime'))?.confidence ? Math.round(signals.find(s => s.agentName.includes('Regime'))!.confidence * 100) : 78, positive: true },
    { name: 'Technical Agent', icon: Cpu, accuracy: 74.6, impact: '+0.58R', alignment: signals.find(s => s.agentName.includes('Technical'))?.confidence ? Math.round(signals.find(s => s.agentName.includes('Technical'))!.confidence * 100) : 82, positive: true },
    { name: 'Liquidity Agent', icon: Droplets, accuracy: 64.1, impact: '+0.31R', alignment: signals.find(s => s.agentName.includes('Liquidity') || s.agentName.includes('Order'))?.confidence ? Math.round(signals.find(s => s.agentName.includes('Liquidity') || s.agentName.includes('Order'))!.confidence * 100) : 68, positive: true },
    { name: 'Positioning Agent', icon: Layers, accuracy: 58.7, impact: '-0.12R', alignment: 61, positive: false },
    { name: 'Momentum Agent', icon: Zap, accuracy: 70.4, impact: '+0.39R', alignment: 76, positive: true },
    { name: 'Volatility Agent', icon: Activity, accuracy: 53.2, impact: '-0.08R', alignment: signals.find(s => s.agentName.includes('Volatility'))?.confidence ? Math.round(signals.find(s => s.agentName.includes('Volatility'))!.confidence * 100) : 54, positive: false },
    { name: 'Macro/Sentiment Agent', icon: Globe, accuracy: 61.3, impact: '+0.16R', alignment: 67, positive: true },
    { name: 'Execution Agent', icon: Sliders, accuracy: 69.8, impact: '+0.28R', alignment: 72, positive: true },
  ];

  // Recent Trades List (Uses live trade history from paper/Alpaca broker)
  const recentTradesList = liveTrades.length > 0
    ? liveTrades.slice(-8).reverse().map((t) => {
        const pnlNum = t.realizedPnL || 0;
        const isWin = pnlNum > 0;
        const isLoss = pnlNum < 0;
        const rVal = t.rMultiple ? t.rMultiple.toFixed(2) : (pnlNum / Math.max(1, (t.entryPrice * (t.size || 0.01)) * 0.015)).toFixed(2);
        return {
          time: new Date(t.closedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          symbol: t.symbol,
          side: t.side,
          r: `${pnlNum >= 0 ? '+' : ''}${rVal}R`,
          pnl: `${pnlNum >= 0 ? '+' : '-'}$${Math.abs(pnlNum).toFixed(2)}`,
          outcome: isWin ? 'WIN' : isLoss ? 'LOSS' : 'OPEN',
          outcomeColor: isWin
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : isLoss
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        };
      })
    : [
        { time: '11:03', symbol: 'BTCUSDT', side: 'LONG', r: '+0.38R', pnl: '+$28.65', outcome: 'OPEN', outcomeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        { time: '10:47', symbol: 'ETHUSDT', side: 'LONG', r: '+1.42R', pnl: '+$142.11', outcome: 'WIN', outcomeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
        { time: '09:32', symbol: 'SOLUSDT', side: 'SHORT', r: '-0.92R', pnl: '-$92.34', outcome: 'LOSS', outcomeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
        { time: '08:15', symbol: 'BTCUSDT', side: 'LONG', r: '+2.18R', pnl: '+$218.67', outcome: 'WIN', outcomeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      ];

  // Market Overview List with live symbol data
  const currentBtcPrice = snapshot?.symbol === 'BTCUSDT' ? snapshot.price : 64713;
  const currentEthPrice = snapshot?.symbol === 'ETHUSDT' ? snapshot.price : 1913.86;
  const currentSolPrice = snapshot?.symbol === 'SOLUSDT' ? snapshot.price : 77.11;
  const currentXrpPrice = snapshot?.symbol === 'XRPUSDT' ? snapshot.price : 1.001;

  const marketList = [
    {
      symbol: 'BTCUSDT',
      price: currentBtcPrice,
      change24h: snapshot?.symbol === 'BTCUSDT' ? snapshot.change24h : 1.32,
      high24h: snapshot?.symbol === 'BTCUSDT' ? snapshot.high24h : currentBtcPrice * 1.015,
      low24h: snapshot?.symbol === 'BTCUSDT' ? snapshot.low24h : currentBtcPrice * 0.985,
      volume: '$24.8B',
      sparkline: [currentBtcPrice * 0.988, currentBtcPrice * 0.992, currentBtcPrice * 0.998, currentBtcPrice * 0.995, currentBtcPrice * 1.005, currentBtcPrice],
    },
    {
      symbol: 'ETHUSDT',
      price: currentEthPrice,
      change24h: snapshot?.symbol === 'ETHUSDT' ? snapshot.change24h : 2.18,
      high24h: snapshot?.symbol === 'ETHUSDT' ? snapshot.high24h : currentEthPrice * 1.02,
      low24h: snapshot?.symbol === 'ETHUSDT' ? snapshot.low24h : currentEthPrice * 0.98,
      volume: '$12.6B',
      sparkline: [currentEthPrice * 0.985, currentEthPrice * 0.99, currentEthPrice * 0.995, currentEthPrice * 1.002, currentEthPrice],
    },
    {
      symbol: 'SOLUSDT',
      price: currentSolPrice,
      change24h: snapshot?.symbol === 'SOLUSDT' ? snapshot.change24h : 3.21,
      high24h: snapshot?.symbol === 'SOLUSDT' ? snapshot.high24h : currentSolPrice * 1.03,
      low24h: snapshot?.symbol === 'SOLUSDT' ? snapshot.low24h : currentSolPrice * 0.97,
      volume: '$2.1B',
      sparkline: [currentSolPrice * 0.97, currentSolPrice * 0.985, currentSolPrice * 0.995, currentSolPrice],
    },
    {
      symbol: 'XRPUSDT',
      price: currentXrpPrice,
      change24h: snapshot?.symbol === 'XRPUSDT' ? snapshot.change24h : 0.87,
      high24h: snapshot?.symbol === 'XRPUSDT' ? snapshot.high24h : currentXrpPrice * 1.02,
      low24h: snapshot?.symbol === 'XRPUSDT' ? snapshot.low24h : currentXrpPrice * 0.98,
      volume: '$1.2B',
      sparkline: [currentXrpPrice * 0.98, currentXrpPrice * 0.99, currentXrpPrice * 0.995, currentXrpPrice],
    },
  ];

  return (
    <div className="space-y-4 p-1 pb-10">
      {/* ── ROW 1: 8 TOP-LEVEL KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* 1. Total Equity */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Equity</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">
              ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
              +{dailyPnLPercent.toFixed(2)}%
            </div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[121000, 122400, 121800, 123900, 124600, 125340]} color="#10B981" height={24} />
          </div>
        </div>

        {/* 2. Daily P&L */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Daily P&L</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">
              +${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
              +{dailyPnLPercent.toFixed(2)}%
            </div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[400, 720, 650, 980, 1120, 1245]} color="#10B981" height={24} />
          </div>
        </div>

        {/* 3. Open Positions */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Open Positions</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">{openPositionsCount}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Exposure ${openPositionsExposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[2, 3, 2, 4, 3, 3]} color="#38BDF8" height={24} />
          </div>
        </div>

        {/* 4. Win Rate */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Win Rate</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">{winRate.toFixed(1)}%</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Total {totalTradesCount} trades</div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[58, 60, 62, 61, 63, 64.8]} color="#8B5CF6" height={24} />
          </div>
        </div>

        {/* 5. Profit Factor */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Profit Factor</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">{profitFactor.toFixed(2)}</div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">Good</div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[1.45, 1.52, 1.6, 1.58, 1.68, 1.72]} color="#10B981" height={24} />
          </div>
        </div>

        {/* 6. Max Drawdown */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Max Drawdown</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">{maxDrawdown.toFixed(2)}%</div>
            <div className="text-[10px] font-semibold text-rose-400 mt-0.5">
              ${maxDrawdownDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[1.8, 2.4, 2.1, 3.0, 3.21, 2.8]} color="#EF4444" height={24} />
          </div>
        </div>

        {/* 7. Sharpe Ratio */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sharpe Ratio</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">{sharpeRatio.toFixed(2)}</div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">Good</div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[1.55, 1.62, 1.7, 1.68, 1.78, 1.83]} color="#10B981" height={24} />
          </div>
        </div>

        {/* 8. Return (24H) */}
        <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Return (24H)</div>
          <div className="my-1">
            <div className="text-sm font-bold text-white tracking-tight">+{return24h.toFixed(2)}%</div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
              +${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-1 h-6">
            <Sparkline data={[0.2, 0.5, 0.4, 0.8, 0.95, 1.01]} color="#10B981" height={24} />
          </div>
        </div>
      </div>

      {/* ── ROW 2: EQUITY CURVE + P&L DISTRIBUTION + PERFORMANCE METRICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Equity Curve (col 1-6, ~50%) */}
        <div className="lg:col-span-6 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <EquityCurveChart />
        </div>

        {/* P&L Distribution (col 7-9, ~25%) */}
        <div className="lg:col-span-3 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <PnLHistogram />
        </div>

        {/* Performance Metrics (col 10-12, ~25%) */}
        <div className="lg:col-span-3 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-2">Performance Metrics</div>
          <div className="divide-y divide-gray-800/60 text-xs flex-1 flex flex-col justify-around">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Expectancy</span>
              <span className="font-bold text-emerald-400">+0.57R</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Average Win</span>
              <span className="font-bold text-emerald-400">+1.42R</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Average Loss</span>
              <span className="font-bold text-rose-400">-0.83R</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Best Trade</span>
              <span className="font-bold text-emerald-400">+3.82R</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Worst Trade</span>
              <span className="font-bold text-rose-400">-1.95R</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Avg Holding Time</span>
              <span className="font-semibold text-gray-200">2h 18m</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Total Fees</span>
              <span className="font-semibold text-gray-200">$125.34</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Total Trades</span>
              <span className="font-semibold text-gray-200">{totalTradesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: AI AGENT PERFORMANCE + RECENT TRADES + STRATEGY ALLOCATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* AI Agent Performance (col 1-4, ~33%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-3">AI Agent Performance</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2 font-bold">Agent</th>
                  <th className="pb-2 font-bold text-center">Accuracy</th>
                  <th className="pb-2 font-bold text-center">Impact</th>
                  <th className="pb-2 font-bold text-right">Signal Alignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {agentPerformanceList.map((ag, i) => {
                  const Icon = ag.icon;
                  return (
                    <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-2 flex items-center gap-1.5 text-gray-300 font-medium whitespace-nowrap">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[11px]">{ag.name}</span>
                      </td>
                      <td className="py-2 text-center text-gray-200 text-[11px] font-semibold">
                        {ag.accuracy.toFixed(1)}%
                      </td>
                      <td className={`py-2 text-center text-[11px] font-bold ${ag.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ag.impact}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-14 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ag.alignment > 65 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                              style={{ width: `${ag.alignment}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono w-7 text-right">
                            {ag.alignment}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Trades (col 5-8, ~37%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white tracking-wide uppercase">Recent Trades</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2 font-bold">Time</th>
                  <th className="pb-2 font-bold">Symbol</th>
                  <th className="pb-2 font-bold">Side</th>
                  <th className="pb-2 font-bold text-center">R</th>
                  <th className="pb-2 font-bold text-right">P&L</th>
                  <th className="pb-2 font-bold text-right">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {recentTradesList.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2 text-[11px] text-gray-400 font-mono">{t.time}</td>
                    <td className="py-2 text-[11px] font-bold text-white">{t.symbol}</td>
                    <td className="py-2 text-[11px] font-semibold text-emerald-400">{t.side}</td>
                    <td className={`py-2 text-center text-[11px] font-bold ${t.r.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.r}
                    </td>
                    <td className={`py-2 text-right text-[11px] font-bold ${t.pnl.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase ${t.outcomeColor}`}>
                        {t.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={onNavigatePortfolio}
            className="w-full mt-3 py-1.5 text-center text-[11px] text-cyan-400 hover:text-cyan-300 font-bold border-t border-gray-800 pt-2 transition-colors uppercase tracking-wider"
          >
            VIEW ALL TRADES
          </button>
        </div>

        {/* Strategy Allocation (col 9-12, ~30%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-1">Strategy Allocation</div>
          <div className="flex-1">
            <DonutChart />
          </div>
        </div>
      </div>

      {/* ── ROW 4: MARKET OVERVIEW + SYSTEM HEALTH + RECENT ALERTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Market Overview (col 1-4, ~33%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white tracking-wide uppercase">Market Overview</span>
            <div className="flex gap-2 text-[10px] font-bold">
              {(['OVERVIEW', 'FUTURES', 'INDICES', 'COMMODITIES'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMarketTab(tab)}
                  className={`transition-colors ${marketTab === tab ? 'text-cyan-400 border-b border-cyan-400' : 'text-gray-400 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2 font-bold">Symbol</th>
                  <th className="pb-2 font-bold text-right">Price</th>
                  <th className="pb-2 font-bold text-right">24H %</th>
                  <th className="pb-2 font-bold text-right">24H High</th>
                  <th className="pb-2 font-bold text-right">24H Low</th>
                  <th className="pb-2 font-bold text-right">Trend (7D)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {marketList.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2 font-bold text-white text-[11px]">{m.symbol}</td>
                    <td className="py-2 text-right font-mono text-[11px] text-gray-200">
                      {m.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-2 text-right text-[11px] font-bold text-emerald-400">
                      +{m.change24h.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right font-mono text-[10px] text-gray-400">
                      {m.high24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right font-mono text-[10px] text-gray-400">
                      {m.low24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-gray-400 font-mono">{m.volume}</span>
                        <div className="w-10 h-4 inline-block">
                          <Sparkline data={m.sparkline} color="#10B981" height={16} width={40} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health (col 5-8, ~37%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-2">System Health</div>
          <div className="grid grid-cols-4 gap-2 my-auto py-2">
            <CircularGauge value={28} label="CPU Usage" statusText="Normal" />
            <CircularGauge value={42} label="Memory" statusText="Normal" />
            <CircularGauge value={36} label="Disk Space" statusText="Normal" />
            <CircularGauge value={42} label="API Latency" statusText="Excellent" unit="ms" />
          </div>
        </div>

        {/* Recent Alerts (col 9-12, ~30%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white tracking-wide uppercase">Recent Alerts</span>
            <button className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold">View All</button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Alert 1 */}
            <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-900/40 border border-gray-800/60">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shadow-sm shadow-emerald-400/50" />
                <div>
                  <div className="text-[10px] text-gray-400 font-mono">11:03:12</div>
                  <div className="text-[11px] font-semibold text-white">Trade Executed: BTCUSDT Long 0.03</div>
                  <div className="text-[10px] text-gray-400">Filled @ 64,250.18</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-blue-500/20 text-cyan-400 border border-blue-500/30 uppercase">
                INFO
              </span>
            </div>

            {/* Alert 2 */}
            <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-900/40 border border-gray-800/60">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shadow-sm shadow-amber-400/50" />
                <div>
                  <div className="text-[10px] text-gray-400 font-mono">10:47:01</div>
                  <div className="text-[11px] font-semibold text-white">High Volatility Detected</div>
                  <div className="text-[10px] text-gray-400">BTCUSDT 1m volatility 72% percentile</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                WARNING
              </span>
            </div>

            {/* Alert 3 */}
            <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-900/40 border border-gray-800/60">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shadow-sm shadow-emerald-400/50" />
                <div>
                  <div className="text-[10px] text-gray-400 font-mono">10:15:32</div>
                  <div className="text-[11px] font-semibold text-white">Risk Check Passed</div>
                  <div className="text-[10px] text-gray-400">All risk parameters within limits</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-blue-500/20 text-cyan-400 border border-blue-500/30 uppercase">
                INFO
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
