'use client';

import React from 'react';
import { PortfolioState, Position, TradeHistoryItem, Order } from '@/types/trading';
import { DollarSign, TrendingUp, History, ListFilter, Award, ShieldAlert } from 'lucide-react';

interface PaperTradingViewProps {
  portfolio: PortfolioState;
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
  orders: Order[];
  onClosePosition: (id: string) => void;
}

export const PaperTradingView: React.FC<PaperTradingViewProps> = ({
  portfolio,
  positions,
  tradeHistory,
  orders,
  onClosePosition,
}) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Paper Trading Portfolio & Execution Engine
          </h2>
          <p className="text-xs text-gray-400">
            Real-time simulated execution with realistic order fills, slippage, maker/taker fee deduction, and equity tracking.
          </p>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400">Account Equity</span>
          <p className="text-2xl font-black text-white mt-1">${portfolio.equity.toLocaleString()}</p>
          <span className="text-[11px] text-gray-500">Balance: ${portfolio.balance.toLocaleString()}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400">Total Net P&L</span>
          <p className={`text-2xl font-black mt-1 ${portfolio.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL} ({portfolio.totalPnLPercent}%)
          </p>
          <span className="text-[11px] text-gray-500">Today P&L: ${portfolio.dailyPnL}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400">Win Rate & Profit Factor</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{portfolio.winRate}%</p>
          <span className="text-[11px] text-gray-500">Profit Factor: {portfolio.profitFactor} | Sharpe: {portfolio.sharpeRatio}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <span className="text-xs text-gray-400">Max Drawdown</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{portfolio.maxDrawdownPercent}%</p>
          <span className="text-[11px] text-gray-500">Daily Drawdown Limit: 5.0%</span>
        </div>
      </div>

      {/* Open Positions Section */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Active Open Positions ({positions.length})
        </h3>

        {positions.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No open paper positions currently.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800 pb-2">
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Entry Price</th>
                  <th className="pb-2">Mark Price</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Stop Loss</th>
                  <th className="pb-2">Take Profit</th>
                  <th className="pb-2">Unrealized P&L</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {positions.map((pos) => (
                  <tr key={pos.id} className="text-gray-200">
                    <td className="py-3 font-bold">{pos.symbol}</td>
                    <td className={`py-3 font-bold ${pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{pos.side}</td>
                    <td className="py-3">${pos.entryPrice}</td>
                    <td className="py-3">${pos.currentPrice}</td>
                    <td className="py-3">{pos.size}</td>
                    <td className="py-3 text-rose-400">${pos.stopLoss}</td>
                    <td className="py-3 text-emerald-400">${pos.takeProfit}</td>
                    <td className={`py-3 font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL} ({pos.unrealizedPnLPercent}%)
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onClosePosition(pos.id)}
                        className="px-3 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 font-semibold"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Trade History Section */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          Closed Trade History ({tradeHistory.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800 pb-2">
                <th className="pb-2">Time</th>
                <th className="pb-2">Symbol</th>
                <th className="pb-2">Side</th>
                <th className="pb-2">Entry</th>
                <th className="pb-2">Exit</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Reason</th>
                <th className="pb-2 text-right">Realized P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {tradeHistory.map((t) => (
                <tr key={t.id} className="text-gray-300">
                  <td className="py-2.5 text-gray-500">{new Date(t.closedAt).toLocaleTimeString()}</td>
                  <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                  <td className={`py-2.5 font-bold ${t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.side}</td>
                  <td className="py-2.5">${t.entryPrice}</td>
                  <td className="py-2.5">${t.exitPrice}</td>
                  <td className="py-2.5">{t.size}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[11px] font-medium border border-gray-700">
                      {t.closeReason}
                    </span>
                  </td>
                  <td className={`py-2.5 text-right font-bold ${t.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.realizedPnL >= 0 ? '+' : ''}${t.realizedPnL} ({t.realizedPnLPercent}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
