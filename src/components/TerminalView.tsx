'use client';

import React, { useState } from 'react';
import { MarketSnapshot, SymbolId, LLMDecision, Position } from '@/types/trading';
import { InteractiveChart } from './InteractiveChart';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers, ShoppingBag, Clock } from 'lucide-react';

interface TerminalViewProps {
  snapshot: MarketSnapshot;
  symbols: SymbolId[];
  activeSymbol: SymbolId;
  onSelectSymbol: (symbol: SymbolId) => void;
  decision: LLMDecision;
  positions: Position[];
  onExecuteManualTrade: (side: 'BUY' | 'SELL', size: number) => void;
  onClosePosition: (id: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  snapshot,
  symbols,
  activeSymbol,
  onSelectSymbol,
  decision,
  positions,
  onExecuteManualTrade,
  onClosePosition,
}) => {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderSize, setOrderSize] = useState<number>(0.1);

  return (
    <div className="space-y-6">
      {/* Symbol Selection Watchlist Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {symbols.map((sym) => (
          <button
            key={sym}
            onClick={() => onSelectSymbol(sym)}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border ${
              activeSymbol === sym
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                : 'glass-panel border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {sym}
          </button>
        ))}
      </div>

      {/* Main Terminal Grid: Chart + Order Book + Order Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {snapshot.symbol} Candlestick Chart (1m)
                </h3>
                <p className="text-xs text-gray-400">EMA(20) Blue Overlay | Target Lines Active</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-white">${snapshot.price}</span>
                <span className={`ml-2 text-xs font-semibold ${snapshot.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {snapshot.change24h >= 0 ? '+' : ''}{snapshot.change24h}%
                </span>
              </div>
            </div>

            <InteractiveChart
              candles={snapshot.candles}
              entry={decision.entry}
              stopLoss={decision.stopLoss}
              takeProfit={decision.takeProfit}
              height={380}
            />
          </div>

          {/* Active Open Positions Table */}
          <div className="glass-panel p-4 rounded-2xl border border-gray-800">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              Active Positions ({positions.length})
            </h4>

            {positions.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No open positions. Use the AI Decision Center or manual order form to enter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800 pb-2">
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Entry</th>
                      <th className="pb-2">Current</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Unrealized P&L</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {positions.map((pos) => (
                      <tr key={pos.id} className="text-gray-200">
                        <td className="py-2.5 font-bold">{pos.symbol}</td>
                        <td className={`py-2.5 font-bold ${pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{pos.side}</td>
                        <td className="py-2.5">${pos.entryPrice}</td>
                        <td className="py-2.5">${pos.currentPrice}</td>
                        <td className="py-2.5">{pos.size}</td>
                        <td className={`py-2.5 font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL} ({pos.unrealizedPnLPercent}%)
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => onClosePosition(pos.id)}
                            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 font-semibold"
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
        </div>

        {/* Order Book Column (3 cols) */}
        <div className="lg:col-span-3 glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Level 2 Order Book
              </h4>
              <span className="text-[11px] text-gray-400">Spread: {snapshot.orderBook.spread}</span>
            </div>

            {/* Asks (Sells) */}
            <div className="space-y-1 text-xs font-mono">
              {snapshot.orderBook.asks.slice(0, 7).reverse().map((ask, idx) => (
                <div key={idx} className="flex justify-between items-center relative py-0.5 px-1">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/15"
                    style={{ width: `${Math.min(100, (ask.size / 150) * 100)}%` }}
                  />
                  <span className="text-rose-400 relative font-semibold">${ask.price}</span>
                  <span className="text-gray-300 relative">{ask.size}</span>
                </div>
              ))}
            </div>

            {/* Current Price Ticker Separator */}
            <div className="py-2 my-2 bg-[#0B111E] rounded text-center border border-gray-800">
              <span className="text-base font-extrabold text-white">${snapshot.price}</span>
            </div>

            {/* Bids (Buys) */}
            <div className="space-y-1 text-xs font-mono">
              {snapshot.orderBook.bids.slice(0, 7).map((bid, idx) => (
                <div key={idx} className="flex justify-between items-center relative py-0.5 px-1">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/15"
                    style={{ width: `${Math.min(100, (bid.size / 150) * 100)}%` }}
                  />
                  <span className="text-emerald-400 relative font-semibold">${bid.price}</span>
                  <span className="text-gray-300 relative">{bid.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time & Sales Mini Stream */}
          <div className="mt-4 pt-3 border-t border-gray-800">
            <h5 className="text-[11px] font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              Time & Sales Stream
            </h5>
            <div className="space-y-1 text-[11px] font-mono max-h-[100px] overflow-y-auto pr-1">
              {snapshot.recentTrades.slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between items-center text-gray-400">
                  <span className={t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>${t.price}</span>
                  <span>{t.size}</span>
                  <span className="text-gray-500">{new Date(t.time).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Paper Order Ticket Column (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Manual Ticket</h4>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`py-2 rounded-xl font-bold text-xs transition-all ${
                  orderSide === 'BUY' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-800 text-gray-400'
                }`}
              >
                BUY / LONG
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`py-2 rounded-xl font-bold text-xs transition-all ${
                  orderSide === 'SELL' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-gray-800 text-gray-400'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Asset</label>
                <input
                  type="text"
                  disabled
                  value={activeSymbol}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Order Type</label>
                <select className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white font-semibold">
                  <option>MARKET ORDER</option>
                  <option>LIMIT ORDER</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Position Size</label>
                <input
                  type="number"
                  step="0.05"
                  value={orderSize}
                  onChange={(e) => setOrderSize(Number(e.target.value))}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onExecuteManualTrade(orderSide, orderSize)}
            className={`w-full py-3 rounded-xl font-bold text-xs mt-4 transition-all ${
              orderSide === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/30'
            }`}
          >
            Submit Paper {orderSide}
          </button>
        </div>
      </div>
    </div>
  );
};
