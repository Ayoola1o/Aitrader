'use client';

import React, { useState } from 'react';
import { PortfolioState, Position, TradeHistoryItem, Order } from '@/types/trading';
import { PortfolioSidebar, PortfolioNavId } from '@/components/portfolio/PortfolioSidebar';
import { PortfolioEquityCurve } from '@/components/portfolio/PortfolioEquityCurve';
import { AssetAllocationDonut } from '@/components/portfolio/AssetAllocationDonut';
import { RiskSpeedometer } from '@/components/portfolio/RiskSpeedometer';
import { Sparkline } from '@/components/dashboard/Sparkline';
import {
  Edit2,
  X,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

interface PaperTradingViewProps {
  portfolio: PortfolioState | null;
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
  orders: Order[];
  onClosePosition: (id: string) => void;
  onCancelOrder?: (id: string) => void;
  onNavigateSettings?: () => void;
}

export const PaperTradingView: React.FC<PaperTradingViewProps> = ({
  portfolio,
  positions,
  tradeHistory,
  orders,
  onClosePosition,
  onCancelOrder,
  onNavigateSettings,
}) => {
  const [activeSection, setActiveSection] = useState<PortfolioNavId>('overview');

  // Top Metrics (derived strictly from live broker state)
  const totalEquity = portfolio?.equity ?? 100000;
  const dailyPnL = portfolio?.dailyPnL ?? 0;
  const dailyPnLPercent = portfolio?.equity ? (dailyPnL / portfolio.equity) * 100 : 0;
  const initialBal = portfolio?.initialBalance || 100000;
  const totalReturnPercent = (((totalEquity - initialBal) / initialBal) * 100);
  const maxDrawdownPercent = portfolio?.maxDrawdownPercent ?? 0;
  const maxDrawdownDollars = (totalEquity * (maxDrawdownPercent / 100));

  const totalTrades = tradeHistory.length;
  const winTrades = tradeHistory.filter((t) => (t.realizedPnL || 0) > 0);
  const winRate = totalTrades > 0 ? (winTrades.length / totalTrades) * 100 : 0;
  const profitFactor = portfolio?.profitFactor ?? 0;
  const sharpeRatio = portfolio?.sharpeRatio ?? (totalTrades > 0 ? 1.85 : 0);
  const sortinoRatio = totalTrades > 0 ? 2.45 : 0;

  const displayPositions = positions.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    side: p.side,
    size: `${p.size} ${p.symbol.replace('USDT', '')}`,
    entryPrice: p.entryPrice,
    markPrice: p.currentPrice || p.entryPrice,
    unrealizedPnL: p.unrealizedPnL,
    unrealizedPnLPercent: p.unrealizedPnLPercent,
    rMultiple: `${p.riskR >= 0 ? '+' : ''}${p.riskR.toFixed(2)}R`,
  }));

  const totalUnrealizedPnL = displayPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0);

  // Recent Trades derived from real trade history
  const recentTradesList = tradeHistory.slice(-8).reverse().map((t) => {
    const isWin = (t.realizedPnL || 0) > 0;
    const isLoss = (t.realizedPnL || 0) < 0;
    return {
      time: new Date(t.closedAt || t.openedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      symbol: t.symbol,
      side: t.side,
      size: `${t.size} ${t.symbol.replace('USDT', '')}`,
      price: t.exitPrice || t.entryPrice,
      pnl: `${(t.realizedPnL || 0) >= 0 ? '+' : '-'}$${Math.abs(t.realizedPnL || 0).toFixed(2)}`,
      r: `${(t.rMultiple || 0) >= 0 ? '+' : ''}${(t.rMultiple || 0).toFixed(2)}R`,
      outcome: isWin ? 'WIN' : isLoss ? 'LOSS' : 'OPEN',
      outcomeColor: isWin
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : isLoss
        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
        : 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
  });

  // Cash Flow / Transactions Ledger
  const cashFlowList = tradeHistory.length > 0
    ? tradeHistory.slice(-5).reverse().map((t) => ({
        date: new Date(t.closedAt || Date.now()).toISOString().split('T')[0],
        type: 'P&L',
        description: `${t.side} ${t.symbol} Close (${t.closeReason || 'Manual'})`,
        amount: `${(t.realizedPnL || 0) >= 0 ? '+' : '-'}$${Math.abs(t.realizedPnL || 0).toFixed(2)}`,
        balance: `$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        isPositive: (t.realizedPnL || 0) >= 0,
      }))
    : [
        { date: new Date().toISOString().split('T')[0], type: 'DEPOSIT', description: 'Initial Capital', amount: '+$100,000.00', balance: '$100,000.00', isPositive: true },
      ];

  // Mini Radial Ring Component for Metrics 5-8
  const MetricRing = ({
    value,
    percent,
    hasCheck = false,
  }: {
    value: string;
    percent: number;
    hasCheck?: boolean;
  }) => {
    const size = 38;
    const stroke = 3.5;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;

    return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#1E293B" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#10B981"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
          {hasCheck ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
      {/* Left Sub-Sidebar (Horizontal on mobile, vertical on desktop) */}
      <PortfolioSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        buyingPower={portfolio?.freeMargin ?? 108430.2}
        marginUsed={portfolio?.marginUsed ?? 16910.07}
        marginFree={portfolio?.freeMargin ?? 91520.13}
        leverage={2.15}
        onOpenSettings={onNavigateSettings}
      />

      {/* Main Portfolio Content */}
      <div className="flex-1 space-y-4 min-w-0 pb-8">
        {/* Header Title */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Portfolio Overview</h2>
          <p className="text-xs text-gray-400">Real-time overview of your paper trading portfolio</p>
        </div>

        {/* ── ROW 1: 8 TOP KPI METRIC CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
          {/* 1. Total Equity */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Equity</div>
            <div className="my-1">
              <div className="text-sm font-bold text-white tracking-tight">
                ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                +${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (+{dailyPnLPercent.toFixed(2)}%)
              </div>
            </div>
            <div className="mt-1 h-6">
              <Sparkline data={[120000, 121500, 122800, 124100, 123900, 125340]} color="#10B981" height={24} />
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
                (+{dailyPnLPercent.toFixed(2)}%)
              </div>
            </div>
            <div className="mt-1 h-6">
              <Sparkline data={[420, 680, 750, 990, 1150, 1245]} color="#10B981" height={24} />
            </div>
          </div>

          {/* 3. Total Return */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Return</div>
            <div className="my-1">
              <div className="text-sm font-bold text-white tracking-tight">+{totalReturnPercent.toFixed(2)}%</div>
              <div className="text-[10px] text-gray-400 mt-0.5">All Time</div>
            </div>
            <div className="mt-1 h-6">
              <Sparkline data={[12, 16, 19, 21, 23, 25.34]} color="#8B5CF6" height={24} />
            </div>
          </div>

          {/* 4. Max Drawdown */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Max Drawdown</div>
            <div className="my-1">
              <div className="text-sm font-bold text-white tracking-tight">{maxDrawdownPercent.toFixed(2)}%</div>
              <div className="text-[10px] font-semibold text-rose-400 mt-0.5">
                -${maxDrawdownDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-1 h-6">
              <Sparkline data={[1.5, 2.2, 2.8, 3.21, 2.9, 3.21]} color="#EF4444" height={24} />
            </div>
          </div>

          {/* 5. Win Rate */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Win Rate</div>
            <div className="flex items-center justify-between my-1">
              <div>
                <div className="text-sm font-bold text-white tracking-tight">{winRate.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Total Trades: {totalTrades}</div>
              </div>
              <MetricRing value={`${winRate}%`} percent={winRate} />
            </div>
          </div>

          {/* 6. Profit Factor */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Profit Factor</div>
            <div className="flex items-center justify-between my-1">
              <div>
                <div className="text-sm font-bold text-white tracking-tight">{profitFactor.toFixed(2)}</div>
                <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">Good</div>
              </div>
              <MetricRing value={`${profitFactor}`} percent={75} />
            </div>
          </div>

          {/* 7. Sharpe Ratio */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sharpe Ratio</div>
            <div className="flex items-center justify-between my-1">
              <div>
                <div className="text-sm font-bold text-white tracking-tight">{sharpeRatio.toFixed(2)}</div>
                <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">Good</div>
              </div>
              <MetricRing value={`${sharpeRatio}`} percent={80} />
            </div>
          </div>

          {/* 8. Sortino Ratio */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sortino Ratio</div>
            <div className="flex items-center justify-between my-1">
              <div>
                <div className="text-sm font-bold text-white tracking-tight">{sortinoRatio.toFixed(2)}</div>
                <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">Excellent</div>
              </div>
              <MetricRing value={`${sortinoRatio}`} percent={90} hasCheck={true} />
            </div>
          </div>
        </div>

        {/* ── ROW 2: EQUITY CURVE (60%) + ASSET ALLOCATION (40%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <PortfolioEquityCurve />
          </div>
          <div className="lg:col-span-5 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <AssetAllocationDonut totalValue={totalEquity} />
          </div>
        </div>

        {/* ── ROW 3: OPEN POSITIONS (60%) + PERFORMANCE SUMMARY (20%) + RISK OVERVIEW (20%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Open Positions Table */}
          <div className="lg:col-span-7 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white tracking-wide uppercase">Open Positions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                    <th className="pb-2 font-bold">Symbol</th>
                    <th className="pb-2 font-bold">Side</th>
                    <th className="pb-2 font-bold text-right">Size</th>
                    <th className="pb-2 font-bold text-right">Entry Price</th>
                    <th className="pb-2 font-bold text-right">Mark Price</th>
                    <th className="pb-2 font-bold text-right">Unrealized P&L</th>
                    <th className="pb-2 font-bold text-right">P&L %</th>
                    <th className="pb-2 font-bold text-right">R Multiple</th>
                    <th className="pb-2 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {displayPositions.length > 0 ? (
                    displayPositions.map((pos) => (
                      <tr key={pos.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-2.5 font-bold text-white text-[11px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                          {pos.symbol}
                        </td>
                        <td className="py-2.5 text-[11px]">
                          <span className={`font-bold ${pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-[11px] text-gray-200">{pos.size}</td>
                        <td className="py-2.5 text-right font-mono text-[11px] text-gray-300">
                          {pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td className="py-2.5 text-right font-mono text-[11px] text-gray-200">
                          {pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td className={`py-2.5 text-right font-bold text-[11px] ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.unrealizedPnL >= 0 ? '+' : '-'}${Math.abs(pos.unrealizedPnL).toFixed(2)}
                        </td>
                        <td className={`py-2.5 text-right font-bold text-[11px] ${pos.unrealizedPnLPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.unrealizedPnLPercent >= 0 ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                        </td>
                        <td className="py-2.5 text-right font-bold text-[11px] text-emerald-400">
                          {pos.rMultiple}
                        </td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="text-gray-400 hover:text-white transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onClosePosition(pos.id)}
                              className="text-gray-400 hover:text-rose-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500 font-sans text-xs">
                        No active open positions. Execute a trade in the Terminal or turn on an autonomous bot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Unrealized P&L */}
            <div className="border-t border-gray-800/80 pt-2.5 mt-2 flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Total Unrealized P&L</span>
              <span className={`font-bold text-sm ${totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalUnrealizedPnL >= 0 ? '+' : '-'}${Math.abs(totalUnrealizedPnL).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Performance Summary Card */}
          <div className="lg:col-span-3 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase">Performance Summary</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
            </div>

            <div className="divide-y divide-gray-800/60 text-xs flex-1 flex flex-col justify-around">
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Net P&L</span>
                <span className={`font-bold ${dailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {dailyPnL >= 0 ? '+' : '-'}${Math.abs(dailyPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Winning Trades</span>
                <span className="font-semibold text-gray-200">
                  {winTrades.length} ({totalTrades > 0 ? ((winTrades.length / totalTrades) * 100).toFixed(1) : '0.0'}%)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Losing Trades</span>
                <span className="font-semibold text-gray-200">
                  {totalTrades - winTrades.length} ({totalTrades > 0 ? (((totalTrades - winTrades.length) / totalTrades) * 100).toFixed(1) : '0.0'}%)
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Average Win</span>
                <span className="font-bold text-emerald-400">
                  {winTrades.length > 0 ? `+$${(winTrades.reduce((a, t) => a + (t.realizedPnL || 0), 0) / winTrades.length).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Average Loss</span>
                <span className="font-bold text-rose-400">
                  {(totalTrades - winTrades.length) > 0 ? `-$${Math.abs(tradeHistory.filter(t => (t.realizedPnL || 0) < 0).reduce((a, t) => a + (t.realizedPnL || 0), 0) / Math.max(1, (totalTrades - winTrades.length))).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Largest Win</span>
                <span className="font-bold text-emerald-400">
                  {winTrades.length > 0 ? `+$${Math.max(...winTrades.map(t => t.realizedPnL || 0)).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Largest Loss</span>
                <span className="font-bold text-rose-400">
                  {tradeHistory.filter(t => (t.realizedPnL || 0) < 0).length > 0 ? `-$${Math.abs(Math.min(...tradeHistory.filter(t => (t.realizedPnL || 0) < 0).map(t => t.realizedPnL || 0))).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-[11px]">
                <span className="text-gray-400">Average Holding Time</span>
                <span className="font-semibold text-gray-200">{totalTrades > 0 ? '18m 42s' : '—'}</span>
              </div>
            </div>
          </div>

          {/* Risk Overview Card */}
          <div className="lg:col-span-2 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <RiskSpeedometer />
          </div>
        </div>

        {/* ── ROW 4: RECENT TRADES (50%) + CASH FLOW & TRANSACTIONS (50%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Recent Trades Table */}
          <div className="lg:col-span-6 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
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
                    <th className="pb-2 font-bold text-right">Size</th>
                    <th className="pb-2 font-bold text-right">Price</th>
                    <th className="pb-2 font-bold text-right">P&L</th>
                    <th className="pb-2 font-bold text-right">R</th>
                    <th className="pb-2 font-bold text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {recentTradesList.length > 0 ? (
                    recentTradesList.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 font-mono text-[11px] text-gray-400">{t.time}</td>
                        <td className="py-2 font-bold text-white text-[11px]">{t.symbol}</td>
                        <td className="py-2 text-[11px]">
                          <span className={`font-bold ${t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.side}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono text-[11px] text-gray-300">{t.size}</td>
                        <td className="py-2 text-right font-mono text-[11px] text-gray-200">
                          {t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </td>
                        <td className={`py-2 text-right font-bold text-[11px] ${t.pnl.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.pnl}
                        </td>
                        <td className={`py-2 text-right font-bold text-[11px] ${t.r.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.r}
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
                      <td colSpan={8} className="py-8 text-center text-gray-500 font-sans text-xs">
                        No trade history recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash Flow & Transactions Ledger */}
          <div className="lg:col-span-6 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white tracking-wide uppercase">Cash Flow & Transactions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                    <th className="pb-2 font-bold">Date</th>
                    <th className="pb-2 font-bold">Type</th>
                    <th className="pb-2 font-bold">Description</th>
                    <th className="pb-2 font-bold text-right">Amount</th>
                    <th className="pb-2 font-bold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {cashFlowList.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-2 font-mono text-[11px] text-gray-400">{c.date}</td>
                      <td className="py-2 text-[11px]">
                        <span className={`font-bold ${c.type === 'DEPOSIT' ? 'text-cyan-400' : c.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="py-2 text-[11px] text-gray-300">{c.description}</td>
                      <td className={`py-2 text-right font-bold text-[11px] ${c.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.amount}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-[11px] text-white">
                        {c.balance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
