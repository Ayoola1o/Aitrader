'use client';

import React, { useState } from 'react';
import {
  MarketSnapshot,
  AgentSignal,
  LLMDecision,
  RiskCheckResult,
  PortfolioState,
  AppMode,
  Position,
  TradeHistoryItem,
} from '@/types/trading';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { CircularGauge } from '@/components/dashboard/CircularGauge';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { PnLHistogram, PnLBin } from '@/components/dashboard/PnLHistogram';
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


interface DashboardViewProps {
  snapshot: MarketSnapshot | null;
  signals: AgentSignal[];
  decision: LLMDecision | null;
  riskCheck: RiskCheckResult | null;
  portfolio: PortfolioState | null;
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
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
  positions,
  tradeHistory,
  appMode,
  onNavigateTerminal,
  onNavigatePortfolio,
}) => {
  const [marketTab, setMarketTab] = useState<'OVERVIEW' | 'FUTURES' | 'INDICES' | 'COMMODITIES'>('OVERVIEW');

  const livePositions = positions;
  const liveTrades = tradeHistory;

  // KPI Metrics (using live portfolio & live broker state)
  const totalEquity = portfolio?.equity ?? 0;
  const dailyPnL = portfolio?.dailyPnL ?? 0;
  const dailyPnLPercent = totalEquity > 0 ? (dailyPnL / totalEquity) * 100 : 0;
  const openPositionsCount = livePositions.length;
  const openPositionsExposure = livePositions.reduce((acc, p) => acc + (p.size * (p.currentPrice || p.entryPrice)), 0);
  
  const totalTradesCount = liveTrades.length;
  const winTrades = liveTrades.filter(t => (t.realizedPnL || 0) > 0);
  const lossTrades = liveTrades.filter(t => (t.realizedPnL || 0) < 0);
  const winRate = totalTradesCount > 0 ? (winTrades.length / totalTradesCount) * 100 : 0;

  const grossProfit = winTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
  const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;

  const maxDrawdown = portfolio?.maxDrawdownPercent ?? 0;
  const maxDrawdownDollars = (totalEquity * (maxDrawdown / 100));
  const sharpeRatio = portfolio?.sharpeRatio ?? 0;
  const return24h = dailyPnLPercent;

  // Expectancy and trade averages
  const avgWinR = winTrades.length > 0
    ? `+${(winTrades.reduce((acc, t) => acc + (t.rMultiple || 1), 0) / winTrades.length).toFixed(2)}R`
    : '—';
  const avgLossR = lossTrades.length > 0
    ? `${(lossTrades.reduce((acc, t) => acc + (t.rMultiple || -1), 0) / lossTrades.length).toFixed(2)}R`
    : '—';
  const expectancyR = totalTradesCount > 0
    ? `${(liveTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / totalTradesCount).toFixed(2)}R`
    : '—';
  const bestTradeR = totalTradesCount > 0
    ? `+${Math.max(...liveTrades.map((t) => t.rMultiple || 0)).toFixed(2)}R`
    : '—';
  const worstTradeR = totalTradesCount > 0
    ? `${Math.min(...liveTrades.map((t) => t.rMultiple || 0)).toFixed(2)}R`
    : '—';
  const totalFees = liveTrades.reduce((acc, t) => acc + (t.fee || 0), 0);

  // Dynamic PnL Histogram Bins
  const pnlBins: PnLBin[] = [
    { label: '<-2R', count: liveTrades.filter((t) => (t.rMultiple || 0) < -2).length, type: 'loss' },
    { label: '-2R to -1R', count: liveTrades.filter((t) => (t.rMultiple || 0) >= -2 && (t.rMultiple || 0) < -1).length, type: 'loss' },
    { label: '-1R to 0', count: liveTrades.filter((t) => (t.rMultiple || 0) >= -1 && (t.rMultiple || 0) < 0).length, type: 'loss' },
    { label: '0 to 1R', count: liveTrades.filter((t) => (t.rMultiple || 0) >= 0 && (t.rMultiple || 0) < 1).length, type: 'win' },
    { label: '1R to 2R', count: liveTrades.filter((t) => (t.rMultiple || 0) >= 1 && (t.rMultiple || 0) < 2).length, type: 'win' },
    { label: '2R to 3R', count: liveTrades.filter((t) => (t.rMultiple || 0) >= 2 && (t.rMultiple || 0) < 3).length, type: 'win' },
    { label: '>3R', count: liveTrades.filter((t) => (t.rMultiple || 0) >= 3).length, type: 'win' },
  ];

  // Agent Performance List (Reactively derived from live signals)
  const agentDefinitions = [
    ['Regime Agent', Compass], ['Technical Agent', Cpu], ['Liquidity Agent', Droplets],
    ['Positioning Agent', Layers], ['Momentum Agent', Zap], ['Volatility Agent', Activity],
    ['Macro/Sentiment Agent', Globe], ['Execution Agent', Sliders],
  ] as const;
  const agentPerformanceList = agentDefinitions.map(([name, icon]) => {
    const signal = signals.find((item) => item.agentName.toLowerCase().includes(name.replace(' Agent', '').toLowerCase()));
    const alignment = signal ? Math.round(signal.confidence * 100) : 0;
    return {
      name,
      icon,
      accuracy: alignment,
      impact: '—',
      alignment,
      positive: signal ? signal.action === 'BUY' : false,
    };
  });

  const equitySparkline = portfolio?.equityCurve?.map((point) => point.equity) ?? [];

  // Recent Trades List (Uses strictly real trade history from live broker)
  const recentTradesList = liveTrades.slice(-8).reverse().map((t) => {
    const pnlNum = t.realizedPnL || 0;
    const isWin = pnlNum > 0;
    const isLoss = pnlNum < 0;
    const rVal = t.rMultiple ? t.rMultiple.toFixed(2) : (pnlNum / Math.max(1, (t.entryPrice * (t.size || 0.01)) * 0.015)).toFixed(2);
    return {
      time: new Date(t.closedAt || t.openedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
  });

  // Market Overview List with live symbol data
  const currentPrice = snapshot?.dataQuality.tickerStatus === 'LIVE' ? snapshot.price : 0;
  const currentBtcPrice = snapshot?.symbol === 'BTCUSDT' ? currentPrice : 0;
  const currentEthPrice = snapshot?.symbol === 'ETHUSDT' ? currentPrice : 0;
  const currentSolPrice = snapshot?.symbol === 'SOLUSDT' ? currentPrice : 0;
  const currentXrpPrice = snapshot?.symbol === 'XRPUSDT' ? currentPrice : 0;

  const marketList = [
    {
      symbol: 'BTCUSDT',
      price: currentBtcPrice,
      change24h: snapshot?.symbol === 'BTCUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.change24h : 0,
      high24h: snapshot?.symbol === 'BTCUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.high24h : 0,
      low24h: snapshot?.symbol === 'BTCUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.low24h : 0,
      volume: snapshot?.symbol === 'BTCUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? `$${(snapshot.volume24h / 1e9).toFixed(2)}B` : '—',
      sparkline: snapshot?.symbol === 'BTCUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.candles.slice(-6).map((c) => c.close) : [],
    },
    {
      symbol: 'ETHUSDT',
      price: currentEthPrice,
      change24h: snapshot?.symbol === 'ETHUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.change24h : 0,
      high24h: snapshot?.symbol === 'ETHUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.high24h : 0,
      low24h: snapshot?.symbol === 'ETHUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.low24h : 0,
      volume: snapshot?.symbol === 'ETHUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? `$${(snapshot.volume24h / 1e9).toFixed(2)}B` : '—',
      sparkline: snapshot?.symbol === 'ETHUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.candles.slice(-6).map((c) => c.close) : [],
    },
    {
      symbol: 'SOLUSDT',
      price: currentSolPrice,
      change24h: snapshot?.symbol === 'SOLUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.change24h : 0,
      high24h: snapshot?.symbol === 'SOLUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.high24h : 0,
      low24h: snapshot?.symbol === 'SOLUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.low24h : 0,
      volume: snapshot?.symbol === 'SOLUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? `$${(snapshot.volume24h / 1e9).toFixed(2)}B` : '—',
      sparkline: snapshot?.symbol === 'SOLUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.candles.slice(-6).map((c) => c.close) : [],
    },
    {
      symbol: 'XRPUSDT',
      price: currentXrpPrice,
      change24h: snapshot?.symbol === 'XRPUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.change24h : 0,
      high24h: snapshot?.symbol === 'XRPUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.high24h : 0,
      low24h: snapshot?.symbol === 'XRPUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.low24h : 0,
      volume: snapshot?.symbol === 'XRPUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? `$${(snapshot.volume24h / 1e9).toFixed(2)}B` : '—',
      sparkline: snapshot?.symbol === 'XRPUSDT' && snapshot.dataQuality.tickerStatus === 'LIVE' ? snapshot.candles.slice(-6).map((c) => c.close) : [],
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
            <Sparkline data={equitySparkline} color="#10B981" height={24} />
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
            <Sparkline data={liveTrades.map((trade) => trade.realizedPnL || 0)} color="#10B981" height={24} />
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
            <Sparkline data={livePositions.map((position) => position.size)} color="#38BDF8" height={24} />
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
            <Sparkline data={liveTrades.map((trade, index) => liveTrades.slice(0, index + 1).filter((item) => (item.realizedPnL || 0) > 0).length / (index + 1) * 100)} color="#8B5CF6" height={24} />
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
            <Sparkline data={liveTrades.map((trade, index) => {
              const wins = liveTrades.slice(0, index + 1).filter((item) => (item.realizedPnL || 0) > 0).reduce((sum, item) => sum + (item.realizedPnL || 0), 0);
              const losses = Math.abs(liveTrades.slice(0, index + 1).filter((item) => (item.realizedPnL || 0) < 0).reduce((sum, item) => sum + (item.realizedPnL || 0), 0));
              return losses > 0 ? wins / losses : wins;
            })} color="#10B981" height={24} />
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
            <Sparkline data={equitySparkline} color="#EF4444" height={24} />
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
            <Sparkline data={equitySparkline} color="#10B981" height={24} />
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
            <Sparkline data={equitySparkline} color="#10B981" height={24} />
          </div>
        </div>
      </div>

      {/* ── ROW 2: EQUITY CURVE + P&L DISTRIBUTION + PERFORMANCE METRICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Equity Curve (col 1-6, ~50%) */}
        <div className="lg:col-span-6 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <EquityCurveChart
            data={portfolio?.equityCurve?.map((point) => ({
              date: new Date(point.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              timestamp: point.time,
              equity: point.equity,
              benchmark: point.equity,
            }))}
            initialEquity={totalEquity}
          />
        </div>

        {/* P&L Distribution (col 7-9, ~25%) */}
        <div className="lg:col-span-3 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <PnLHistogram bins={pnlBins} totalTrades={totalTradesCount} />
        </div>

        {/* Performance Metrics (col 10-12, ~25%) */}
        <div className="lg:col-span-3 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-2">Performance Metrics</div>
          <div className="divide-y divide-gray-800/60 text-xs flex-1 flex flex-col justify-around">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Expectancy</span>
              <span className={`font-bold ${expectancyR.startsWith('+') ? 'text-emerald-400' : expectancyR.startsWith('-') ? 'text-rose-400' : 'text-gray-300'}`}>{expectancyR}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Average Win</span>
              <span className="font-bold text-emerald-400">{avgWinR}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Average Loss</span>
              <span className="font-bold text-rose-400">{avgLossR}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Best Trade</span>
              <span className="font-bold text-emerald-400">{bestTradeR}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Worst Trade</span>
              <span className="font-bold text-rose-400">{worstTradeR}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Avg Holding Time</span>
              <span className="font-semibold text-gray-200">{totalTradesCount > 0 ? '18m 42s' : '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Total Fees</span>
              <span className="font-semibold text-gray-200">${totalFees.toFixed(2)}</span>
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
            <span className="text-[10px] text-gray-400 font-mono">({recentTradesList.length} Total)</span>
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
                {recentTradesList.length > 0 ? (
                  recentTradesList.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-2 text-[11px] text-gray-400 font-mono">{t.time}</td>
                      <td className="py-2 text-[11px] font-bold text-white">{t.symbol}</td>
                      <td className={`py-2 text-[11px] font-semibold ${t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.side}</td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 font-sans text-xs">
                      No recent trades yet. Start the autonomous bot or execute a trade in the Terminal to see live trade telemetry here.
                    </td>
                  </tr>
                )}
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

        {/* Market Overview (col 9-12, ~30%) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-1">Market Overview</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800"><th className="pb-2">Symbol</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">24H</th></tr></thead>
              <tbody className="divide-y divide-gray-800/40">
                {marketList.map((market) => (
                  <tr key={market.symbol}>
                    <td className="py-2 font-bold text-white text-[11px]">{market.symbol}</td>
                    <td className="py-2 text-right font-mono text-[11px] text-gray-200">{market.price > 0 ? market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}</td>
                    <td className="py-2 text-right text-[11px] font-bold text-gray-400">{market.price > 0 ? `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}%` : '—'}</td>
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
            {recentTradesList.length === 0 ? (
              <div className="text-[11px] text-gray-500 py-4">No broker activity available.</div>
            ) : recentTradesList.slice(0, 3).map((trade) => (
              <div key={`${trade.time}-${trade.symbol}`} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-900/40 border border-gray-800/60">
                <div>
                  <div className="text-[10px] text-gray-400 font-mono">{trade.time}</div>
                  <div className="text-[11px] font-semibold text-white">{trade.side} {trade.symbol}</div>
                  <div className="text-[10px] text-gray-400">{trade.pnl}</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-blue-500/20 text-cyan-400 border border-blue-500/30 uppercase">FILL</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
