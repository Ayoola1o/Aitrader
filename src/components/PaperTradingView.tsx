'use client';

import React from 'react';
import { PortfolioState, Position, TradeHistoryItem, Order } from '@/types/trading';
import { DollarSign, TrendingUp, TrendingDown, History, Database, Wallet, ShieldCheck, X, Activity } from 'lucide-react';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';

interface PaperTradingViewProps {
  portfolio: PortfolioState | null;
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
  orders: Order[];
  onClosePosition: (id: string) => void;
}

function MetricCard({ label, value, sub, color = 'white', isUnavailable = false }: {
  label: string; value: string; sub?: string; color?: string; isUnavailable?: boolean;
}) {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-gray-800">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-black ${isUnavailable ? 'text-gray-600' : `text-${color}`}`}>
        {isUnavailable ? '—' : value}
      </p>
      {sub && <p className={`text-xs mt-0.5 ${isUnavailable ? 'text-gray-700' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

export const PaperTradingView: React.FC<PaperTradingViewProps> = ({
  portfolio, positions, tradeHistory, orders, onClosePosition,
}) => {
  const hasAlpaca = alpacaBrokerClient.hasCredentials();
  const hasRealTrades = tradeHistory.length >= 1;

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-400" />
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            {hasAlpaca ? 'Alpaca Paper Account' : 'Paper Portfolio'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {hasAlpaca
              ? 'Synced with Alpaca Paper Trading API'
              : 'Simulated broker — 0.05% taker fee, 0.02% slippage per market order'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
          hasAlpaca ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }`}>
          <Database className="w-3.5 h-3.5" />
          {hasAlpaca ? 'Alpaca API' : 'Paper Engine'}
        </span>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Account Equity" value={`$${(portfolio?.equity ?? 0).toLocaleString()}`} color="white" />
        <MetricCard label="Cash Balance" value={`$${(portfolio?.balance ?? 0).toLocaleString()}`} color="gray-200" />
        <MetricCard label="Buying Power" value={`$${(portfolio?.freeMargin ?? 0).toLocaleString()}`} color="emerald-400" />
        <MetricCard
          label="Unrealized P&L"
          value={`${(portfolio?.unrealizedPnL ?? 0) >= 0 ? '+' : ''}$${portfolio?.unrealizedPnL?.toFixed(2) ?? '0.00'}`}
          color={(portfolio?.unrealizedPnL ?? 0) >= 0 ? 'emerald-400' : 'rose-400'}
        />
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Realized P&L"
          value={`${portfolio.totalPnL >= 0 ? '+' : ''}$${portfolio.totalPnL.toFixed(2)}`}
          sub={`${portfolio.totalPnLPercent >= 0 ? '+' : ''}${portfolio.totalPnLPercent.toFixed(2)}% vs start`}
          color={portfolio.totalPnL >= 0 ? 'emerald-400' : 'rose-400'}
        />
        <MetricCard
          label="Win Rate"
          value={hasRealTrades ? `${portfolio.winRate.toFixed(1)}%` : '—'}
          sub={hasRealTrades ? `${portfolio.winningTrades}W / ${portfolio.losingTrades}L` : `${tradeHistory.length} trades needed`}
          isUnavailable={!hasRealTrades}
        />
        <MetricCard
          label="Profit Factor"
          value={hasRealTrades ? portfolio.profitFactor.toFixed(2) : '—'}
          sub={hasRealTrades ? (portfolio.profitFactor >= 1.5 ? 'Acceptable edge' : 'Edge insufficient') : 'Pending trades'}
          color={portfolio.profitFactor >= 1.5 ? 'emerald-400' : 'amber-400'}
          isUnavailable={!hasRealTrades}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={portfolio.totalTrades >= 5 ? portfolio.sharpeRatio.toFixed(2) : '—'}
          sub={portfolio.totalTrades >= 5 ? 'Annualized' : `Need ${5 - portfolio.totalTrades} more trades`}
          isUnavailable={portfolio.totalTrades < 5}
        />
      </div>

      {/* Drawdown row */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Daily P&L"
          value={`${portfolio.dailyPnL >= 0 ? '+' : ''}$${portfolio.dailyPnL.toFixed(2)}`}
          color={portfolio.dailyPnL >= 0 ? 'emerald-400' : 'rose-400'}
        />
        <MetricCard
          label="Daily Drawdown"
          value={`${portfolio.dailyDrawdownPercent.toFixed(2)}%`}
          sub={portfolio.dailyDrawdownPercent > 3 ? '⚠ Approaching limit' : 'Within limits'}
          color={portfolio.dailyDrawdownPercent > 3 ? 'amber-400' : 'gray-300'}
        />
        <MetricCard
          label="Max Drawdown"
          value={`${portfolio.maxDrawdownPercent.toFixed(2)}%`}
          color={portfolio.maxDrawdownPercent > 10 ? 'rose-400' : 'gray-300'}
        />
      </div>

      {/* Equity Curve Sparkline (simple bar-based) */}
      {portfolio.equityCurve && portfolio.equityCurve.length > 1 && (
        <div className="glass-panel p-4 rounded-2xl border border-gray-800">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Equity Curve ({portfolio.equityCurve.length} points)
          </h4>
          <div className="flex items-end gap-0.5 h-12">
            {portfolio.equityCurve.slice(-60).map((pt, i) => {
              const allValues = portfolio.equityCurve.map(p => p.equity);
              const minVal = Math.min(...allValues);
              const maxVal = Math.max(...allValues);
              const range = maxVal - minVal || 1;
              const h = Math.max(2, ((pt.equity - minVal) / range) * 48);
              const isPositive = pt.equity >= portfolio.initialBalance;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ height: `${h}px` }}
                  title={`$${pt.equity.toFixed(2)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Open Positions */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800">
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          Open Positions ({positions.length})
        </h4>
        {positions.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="pb-2 text-left">Symbol</th>
                  <th className="pb-2 text-right">Side</th>
                  <th className="pb-2 text-right">Entry</th>
                  <th className="pb-2 text-right">Current</th>
                  <th className="pb-2 text-right">Size</th>
                  <th className="pb-2 text-right">Unreal P&L</th>
                  <th className="pb-2 text-right">R</th>
                  <th className="pb-2 text-right">SL</th>
                  <th className="pb-2 text-right">TP</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="py-2 font-bold text-white">{pos.symbol}</td>
                    <td className={`py-2 text-right font-bold ${pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{pos.side}</td>
                    <td className="py-2 text-right text-gray-300">${pos.entryPrice}</td>
                    <td className="py-2 text-right text-gray-300">${pos.currentPrice}</td>
                    <td className="py-2 text-right text-gray-300">{pos.size}</td>
                    <td className={`py-2 text-right font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                    </td>
                    <td className={`py-2 text-right ${pos.riskR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.riskR?.toFixed(2) ?? '—'}R
                    </td>
                    <td className="py-2 text-right text-rose-400">${pos.stopLoss}</td>
                    <td className="py-2 text-right text-emerald-400">${pos.takeProfit}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onClosePosition(pos.id)}
                        className="px-2 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-lg text-[10px] font-bold hover:bg-rose-500/30 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade History */}
      <div className="glass-panel p-4 rounded-2xl border border-gray-800">
        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          Trade History ({tradeHistory.length})
        </h4>
        {tradeHistory.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No completed trades yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="pb-2 text-left">Symbol</th>
                  <th className="pb-2 text-right">Side</th>
                  <th className="pb-2 text-right">Entry</th>
                  <th className="pb-2 text-right">Exit</th>
                  <th className="pb-2 text-right">Size</th>
                  <th className="pb-2 text-right">Net P&L</th>
                  <th className="pb-2 text-right">R-Multiple</th>
                  <th className="pb-2 text-right">Fee</th>
                  <th className="pb-2 text-right">Reason</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.slice().reverse().map(trade => (
                  <tr key={trade.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                    <td className="py-2 font-bold text-white">{trade.symbol}</td>
                    <td className={`py-2 text-right font-bold ${trade.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.side}</td>
                    <td className="py-2 text-right text-gray-300">${trade.entryPrice}</td>
                    <td className="py-2 text-right text-gray-300">${trade.exitPrice}</td>
                    <td className="py-2 text-right text-gray-300">{trade.size}</td>
                    <td className={`py-2 text-right font-bold ${trade.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.realizedPnL >= 0 ? '+' : ''}${trade.realizedPnL.toFixed(2)}
                    </td>
                    <td className={`py-2 text-right ${trade.rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.rMultiple?.toFixed(2) ?? '—'}R
                    </td>
                    <td className="py-2 text-right text-gray-500">${trade.fee?.toFixed(4) ?? '—'}</td>
                    <td className={`py-2 text-right text-[10px] font-bold ${
                      trade.closeReason === 'TAKE_PROFIT' ? 'text-emerald-400' :
                      trade.closeReason === 'STOP_LOSS' ? 'text-rose-400' : 'text-gray-400'
                    }`}>{trade.closeReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
