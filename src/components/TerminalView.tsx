'use client';

import React, { useState } from 'react';
import { MarketSnapshot, SymbolId, LLMDecision, Position, PortfolioState, DataStatus } from '@/types/trading';
import { BotState, BotConfig } from '@/lib/bot/engine';
import { InteractiveChart } from './InteractiveChart';
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, Layers, ShoppingBag, Clock, Wallet,
  Bot, Play, Square, AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Terminal as TerminalIcon, DollarSign
} from 'lucide-react';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';

interface TerminalViewProps {
  snapshot: MarketSnapshot;
  symbols: SymbolId[];
  activeSymbol: SymbolId;
  onSelectSymbol: (symbol: SymbolId) => void;
  decision: LLMDecision | null;
  positions: Position[];
  portfolio: PortfolioState | null;
  onExecuteManualTrade: (side: 'BUY' | 'SELL', size: number) => void;
  onClosePosition: (id: string) => void;
  // Bot Props
  botState: BotState;
  onSpawnBot: (config: BotConfig) => void;
  onStopBot: () => void;
  onConfirmBotExit: () => void;
  onResumeBot: () => void;
}

function StatusDot({ status, label }: { status: DataStatus; label?: string }) {
  const colors: Record<DataStatus, string> = {
    LIVE: 'bg-emerald-400', DELAYED: 'bg-amber-400', HISTORICAL: 'bg-blue-400',
    SIMULATED: 'bg-orange-400', UNAVAILABLE: 'bg-gray-500', STALE: 'bg-rose-500 animate-pulse',
  };
  const textColors: Record<DataStatus, string> = {
    LIVE: 'text-emerald-400', DELAYED: 'text-amber-400', HISTORICAL: 'text-blue-400',
    SIMULATED: 'text-orange-400', UNAVAILABLE: 'text-gray-500', STALE: 'text-rose-400',
  };
  return (
    <span className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />
      {label && <span className={`text-[10px] font-bold ${textColors[status]}`}>{label ?? status}</span>}
    </span>
  );
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  snapshot,
  symbols,
  activeSymbol,
  onSelectSymbol,
  decision,
  positions,
  portfolio,
  onExecuteManualTrade,
  onClosePosition,
  botState,
  onSpawnBot,
  onStopBot,
  onConfirmBotExit,
  onResumeBot,
}) => {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderSize, setOrderSize] = useState<number>(0.001);
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // Spawn Modal Form state
  const [botSymbol, setBotSymbol] = useState<SymbolId>(activeSymbol);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(500);
  const [cycleInterval, setCycleInterval] = useState<number>(30);
  const [maxNoTrades, setMaxNoTrades] = useState<number>(5);
  const [maxLosses, setMaxLosses] = useState<number>(3);
  const [autoConfirmExit, setAutoConfirmExit] = useState<boolean>(false);

  const hasAlpaca = alpacaBrokerClient.hasCredentials();
  const isBotRunning = botState.status === 'RUNNING';
  const isBotPaused = botState.status === 'PAUSED';

  const handleStartBot = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawnBot({
      symbol: botSymbol,
      allocatedCapital: allocatedCapital || 500,
      cycleIntervalSeconds: cycleInterval,
      maxConsecutiveNoTrades: maxNoTrades,
      maxConsecutiveLosses: maxLosses,
      autoConfirmExit,
    });
    setShowSpawnModal(false);
  };

  return (
    <div className="space-y-6">
      {/* ── BOT CONTROL PANEL BANNER ────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isBotRunning ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse' :
              isBotPaused ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
              'bg-gray-800/60 border-gray-700 text-gray-400'
            }`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Autonomous AI Trading Bot</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                  isBotRunning ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                  isBotPaused ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                  'bg-gray-800 border-gray-700 text-gray-400'
                }`}>
                  {botState.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isBotRunning
                  ? `Looping on ${botState.symbol} ($${botState.allocatedCapital.toLocaleString()} Capital) · Cycle #${botState.cycleCount} · Last trade: ${botState.lastAction}`
                  : isBotPaused
                  ? `PAUSED — Bot is requesting exit from market`
                  : 'Spawn an AI bot with allocated investment capital to autonomously analyze and trade this market.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLog(!showLog)}
              className="px-3 py-2 rounded-xl bg-[#0B111E] border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 flex items-center gap-1.5"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
              Bot Log ({botState.log.length})
              {showLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isBotRunning || isBotPaused ? (
              <button
                onClick={onStopBot}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Bot
              </button>
            ) : (
              <button
                onClick={() => { setBotSymbol(activeSymbol); setShowSpawnModal(true); }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 text-xs font-extrabold flex items-center gap-2 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                🚀 Spawn AI Bot
              </button>
            )}
          </div>
        </div>

        {/* Live Bot Stats Ribbon (when running or paused) */}
        {(isBotRunning || isBotPaused) && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-3 border-t border-gray-800 text-xs">
            <div className="p-2.5 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Symbol</span>
              <strong className="text-white font-bold">{botState.symbol}</strong>
            </div>
            <div className="p-2.5 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Allocated Capital</span>
              <strong className="text-emerald-400 font-bold">${botState.allocatedCapital.toLocaleString()}</strong>
            </div>
            <div className="p-2.5 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Cycles Completed</span>
              <strong className="text-white font-bold">#{botState.cycleCount}</strong>
            </div>
            <div className="p-2.5 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Trades Executed</span>
              <strong className="text-emerald-400 font-bold">{botState.tradesExecuted}</strong>
            </div>
            <div className="p-2.5 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Bot Session P&L</span>
              <strong className={`font-bold ${botState.runningPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {botState.runningPnL >= 0 ? '+' : ''}${botState.runningPnL.toFixed(2)}
              </strong>
            </div>
            <div className="p-2.5 bg-[#0B111E] rounded-xl border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Last AI Signal</span>
              <strong className="text-blue-400 font-bold">{botState.lastDecisionAction}</strong>
            </div>
          </div>
        )}

        {/* Scrollable Bot Log Panel */}
        {showLog && (
          <div className="pt-3 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Bot Live Event Stream</span>
              <span>{botState.log.length} records</span>
            </div>
            <div className="bg-[#0B111E] rounded-xl border border-gray-800 p-3 max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
              {botState.log.length === 0 ? (
                <p className="text-gray-600 italic">No log entries yet. Spawn a bot to start streaming events.</p>
              ) : (
                botState.log.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-gray-300">
                    <span className="text-gray-600 shrink-0">{new Date(entry.time).toLocaleTimeString()}</span>
                    <span className={`shrink-0 px-1 py-0.2 rounded text-[9px] font-bold ${
                      entry.level === 'ACTION' ? 'bg-emerald-500/20 text-emerald-400' :
                      entry.level === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                      entry.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {entry.level}
                    </span>
                    <span className="break-all">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── EXIT REQUEST MODAL OVERLAY ────────────────────────────────────────── */}
      {botState.exitRequest && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/50 max-w-lg w-full space-y-5 shadow-2xl shadow-amber-500/20 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Bot Requesting Market Exit</h3>
                <p className="text-xs text-amber-400">The bot detected an exit condition and paused trading.</p>
              </div>
            </div>

            <div className="p-4 bg-[#0B111E] rounded-xl border border-gray-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Trigger Reason:</span>
                <strong className="text-rose-400 font-bold text-right max-w-xs">{botState.exitRequest.reason}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Symbol:</span>
                <strong className="text-white font-bold">{botState.symbol}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Allocated Capital:</span>
                <strong className="text-emerald-400 font-bold">${botState.allocatedCapital.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Session P&L:</span>
                <strong className={botState.runningPnL >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {botState.runningPnL >= 0 ? '+' : ''}${botState.runningPnL.toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Positions:</span>
                <strong className="text-white font-bold">{positions.length} open</strong>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              If you confirm exit, the bot will <strong>close all open positions</strong> and terminate. If you choose to keep running, the bot will clear the warning and resume its evaluation loop.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onConfirmBotExit}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all shadow-lg shadow-rose-500/20"
              >
                ✓ Exit Market & Close Positions
              </button>
              <button
                onClick={onResumeBot}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-all border border-gray-700"
              >
                ↺ Keep Bot Running
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOT SPAWN CONFIG MODAL ───────────────────────────────────────────── */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleStartBot} className="glass-panel p-6 rounded-2xl border border-gray-800 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Spawn Autonomous Trading Bot</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSpawnModal(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Target Asset</label>
                <select
                  value={botSymbol}
                  onChange={(e) => setBotSymbol(e.target.value as SymbolId)}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold flex items-center justify-between">
                  <span>Allocated Bot Capital ($ USD)</span>
                  <span className="text-[10px] text-emerald-400 font-normal">
                    Buying Power: ${portfolio ? (portfolio.freeMargin || portfolio.equity).toLocaleString() : '10,000'}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={allocatedCapital}
                    onChange={(e) => setAllocatedCapital(Math.max(10, Number(e.target.value)))}
                    className="w-full bg-[#0B111E] border border-gray-800 rounded-xl pl-7 pr-3 py-2 text-white font-bold"
                    placeholder="500"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Amount of money assigned to this bot session for calculating position sizes and risk limits.
                </p>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Cycle Evaluation Frequency</label>
                <select
                  value={cycleInterval}
                  onChange={(e) => setCycleInterval(Number(e.target.value))}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value={15}>Every 15 Seconds (Aggressive)</option>
                  <option value={30}>Every 30 Seconds (Recommended)</option>
                  <option value={60}>Every 60 Seconds (Standard)</option>
                  <option value={120}>Every 2 Minutes (Conservative)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Max Consecutive No-Trade Cycles (Exit Trigger)</label>
                <select
                  value={maxNoTrades}
                  onChange={(e) => setMaxNoTrades(Number(e.target.value))}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value={3}>3 cycles without setup</option>
                  <option value={5}>5 cycles without setup (Default)</option>
                  <option value={10}>10 cycles without setup</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Max Consecutive Loss Limit (Risk Cut-off)</label>
                <select
                  value={maxLosses}
                  onChange={(e) => setMaxLosses(Number(e.target.value))}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value={2}>2 losses in a row</option>
                  <option value={3}>3 losses in a row (Default)</option>
                  <option value={5}>5 losses in a row</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0B111E] rounded-xl border border-gray-800">
                <div>
                  <span className="text-white font-bold block">Auto-Exit Without Modal</span>
                  <span className="text-[10px] text-gray-500">Automatically close positions on exit trigger</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoConfirmExit}
                  onChange={(e) => setAutoConfirmExit(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSpawnModal(false)}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Bot ($${allocatedCapital})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SYMBOL SELECTOR & WATCHLIST BAR ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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

        {/* Account Balance Banner */}
        {portfolio ? (
          <div className="glass-panel px-4 py-2 rounded-xl border border-gray-800 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-400 font-semibold">{hasAlpaca ? 'Alpaca Buying Power:' : 'Buying Power:'}</span>
              <strong className="text-white font-bold">${(portfolio.freeMargin || portfolio.equity).toLocaleString()}</strong>
            </div>
            <div className="text-gray-400">
              Equity: <strong className="text-emerald-400">${portfolio.equity.toLocaleString()}</strong>
            </div>
            <div className={`ml-auto font-bold ${portfolio.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              P&L: {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="glass-panel px-4 py-2 rounded-xl border border-gray-800 text-xs text-gray-500">Loading portfolio...</div>
        )}
      </div>

      {/* ── MAIN TERMINAL GRID: CHART + ORDER BOOK + ORDER FORM ─────────────── */}
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
              entry={decision?.entry ?? null}
              stopLoss={decision?.stopLoss ?? null}
              takeProfit={decision?.takeProfit ?? null}
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
              <p className="text-xs text-gray-500 py-4 text-center">No open positions. Use the AI Decision Center, Bot, or manual order form to enter.</p>
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
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white">Manual Ticket</h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                {hasAlpaca ? 'Alpaca' : 'Local'}
              </span>
            </div>

            <div className="p-2.5 mb-3 bg-[#0B111E] rounded-xl border border-gray-800 text-[11px] space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Account Cash:</span>
                <strong className="text-white">${portfolio?.balance.toLocaleString() ?? '—'}</strong>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Buying Power:</span>
                <strong className="text-emerald-400">${portfolio ? (portfolio.freeMargin || portfolio.equity).toLocaleString() : '—'}</strong>
              </div>
            </div>

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
                <label className="text-xs text-gray-400 block mb-1 font-semibold">Position Size</label>
                <input
                  type="number"
                  step="0.001"
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
            Submit {hasAlpaca ? 'Alpaca' : 'Paper'} {orderSide}
          </button>
        </div>
      </div>
    </div>
  );
};
