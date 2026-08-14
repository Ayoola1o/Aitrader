

'use client';

import React, { useState } from 'react';
import {
  MarketSnapshot, SymbolId, LLMDecision, Position, PortfolioState,
  AgentSignal, SignalFusionResult, RiskCheckResult,
  Order, TradeHistoryItem, FeatureVector
} from '@/types/trading';
import { BotState, BotConfig } from '@/lib/bot/engine';
import { deterministicRiskEngine } from '@/lib/risk/engine';
import { InteractiveChart } from './InteractiveChart';
import {
  TrendingUp, Layers, ShoppingBag, Clock, Wallet,
  Bot, Play, Square, AlertTriangle, ChevronDown,
  ChevronUp, Terminal as TerminalIcon, ShieldAlert, ShieldCheck,
  Sliders, Cpu, Activity, ListOrdered, FileText
} from 'lucide-react';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';

export interface TerminalViewProps {
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
  // Extended intelligence & workspace props
  signals?: AgentSignal[];
  fusion?: SignalFusionResult | null;
  riskCheck?: RiskCheckResult | null;
  orders?: Order[];
  tradeHistory?: TradeHistoryItem[];
  features?: FeatureVector | null;
}

type WorkspaceTab = 'Positions' | 'Orders' | 'Order Book' | 'Time & Sales' | 'Executions' | 'Terminal Logs';

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
  signals = [],
  riskCheck = null,
  orders = [],
  tradeHistory = [],
}) => {
  // Order ticket state
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [orderSize, setOrderSize] = useState<number>(0.001);
  const [limitPrice, setLimitPrice] = useState<number>(snapshot?.price ?? 0);

  // Tab management
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('Positions');

  // Progressive disclosure states
  const [showReasoning, setShowReasoning] = useState(false);
  const [showRiskConfig, setShowRiskConfig] = useState(false);
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [showBotLogModal, setShowBotLogModal] = useState(false);

  // User-configurable Risk Gate state
  const [maxRiskPercent, setMaxRiskPercent] = useState<number>(0.5);
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState<number>(5.0);
  const [minRiskReward, setMinRiskReward] = useState<number>(2.0);
  const [maxSpreadPercent, setMaxSpreadPercent] = useState<number>(0.3);
  const [newsKillSwitch, setNewsKillSwitch] = useState<boolean>(false);
  const [riskSavedToast, setRiskSavedToast] = useState(false);

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

  // Apply Risk Config Changes
  const handleSaveRiskConfig = (e: React.FormEvent) => {
    e.preventDefault();
    deterministicRiskEngine.setConfig({
      maxPositionRiskPercent: maxRiskPercent,
      maxDailyDrawdownPercent: maxDailyDrawdown,
      minRiskReward: minRiskReward,
      maxSpreadPercent: maxSpreadPercent,
      newsKillSwitch: newsKillSwitch,
    });
    setRiskSavedToast(true);
    setTimeout(() => setRiskSavedToast(false), 2500);
  };

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

  // Quick preset calculation for size
  const handleSizePreset = (pct: number) => {
    const freeMargin = portfolio?.freeMargin ?? portfolio?.equity ?? 10000;
    const capitalToUse = freeMargin * (pct / 100);
    if (snapshot?.price && snapshot.price > 0) {
      const calculated = capitalToUse / snapshot.price;
      setOrderSize(Number(calculated.toFixed(activeSymbol === 'BTCUSDT' ? 4 : 2)));
    }
  };

  const openOrdersCount = orders.filter(o => o.status === 'PENDING').length;
  const isGateApproved = riskCheck?.approved ?? false;
  const computedLatency = Math.max(8, Math.round(Math.abs(Date.now() - snapshot.timestamp) % 50));

  return (
    <div className="space-y-4 text-white">

      {/* ── TOP HEADER / SYMBOLS & ACCOUNT STATUS RIBBON ────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0B111E] border border-gray-800/80 shadow-md">
        {/* Watchlist Symbol Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1 pr-2 hidden sm:inline">Markets:</span>
          {symbols.map((sym) => (
            <button
              key={sym}
              onClick={() => onSelectSymbol(sym)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                activeSymbol === sym
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-[#080E1A] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {sym}
            </button>
          ))}
        </div>

        {/* Quick Account Financial Pill */}
        <div className="flex items-center gap-3 text-xs ml-auto">
          {portfolio ? (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#080E1A] border border-gray-800">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-gray-400 font-medium">Buying Power:</span>
                <strong className="text-white font-bold">${(portfolio.freeMargin || portfolio.equity).toLocaleString()}</strong>
              </div>
              <div className="w-px h-3 bg-gray-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Equity:</span>
                <strong className="text-emerald-400 font-bold">${portfolio.equity.toLocaleString()}</strong>
              </div>
              <div className="w-px h-3 bg-gray-800" />
              <div className={`font-bold ${portfolio.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Loading portfolio...</div>
          )}

          {/* Spawn Bot Button */}
          {isBotRunning || isBotPaused ? (
            <button
              onClick={onStopBot}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Bot
            </button>
          ) : (
            <button
              onClick={() => { setBotSymbol(activeSymbol); setShowSpawnModal(true); }}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Spawn AI Bot
            </button>
          )}
        </div>
      </div>

      {/* ── 3-COLUMN DESKTOP WORKSTATION GRID ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* ═════════════════════════════════════════════════════════════════════
            COLUMN 1 (LEFT ~20-25%): BOT / MARKET CONTEXT + MANUAL ORDER TICKET
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Active Bot Identity Card */}
          <div className="p-4 rounded-2xl bg-[#0B111E] border border-gray-800/80 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${
                  isBotRunning ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse' :
                  isBotPaused ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
                  'bg-gray-800/60 border-gray-700 text-gray-400'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Active Bot Identity</h4>
                  <span className="text-[10px] text-gray-400">Autonomous Agent</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                isBotRunning ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                isBotPaused ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                'bg-gray-800 border-gray-700 text-gray-400'
              }`}>
                {botState.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#080E1A] rounded-xl border border-gray-800/80">
                <span className="text-[10px] text-gray-500 block">Target Symbol</span>
                <strong className="text-white font-bold">{botState.symbol}</strong>
              </div>
              <div className="p-2 bg-[#080E1A] rounded-xl border border-gray-800/80">
                <span className="text-[10px] text-gray-500 block">Capital Assigned</span>
                <strong className="text-emerald-400 font-bold">${botState.allocatedCapital.toLocaleString()}</strong>
              </div>
              <div className="p-2 bg-[#080E1A] rounded-xl border border-gray-800/80">
                <span className="text-[10px] text-gray-500 block">Cycles / Trades</span>
                <strong className="text-white font-bold">#{botState.cycleCount} / {botState.tradesExecuted}</strong>
              </div>
              <div className="p-2 bg-[#080E1A] rounded-xl border border-gray-800/80">
                <span className="text-[10px] text-gray-500 block">Session P&L</span>
                <strong className={`font-bold ${botState.runningPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {botState.runningPnL >= 0 ? '+' : ''}${botState.runningPnL.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
              <span>Last Decision:</span>
              <span className="font-bold text-blue-400">{botState.lastDecisionAction}</span>
            </div>

            <button
              onClick={() => setShowBotLogModal(true)}
              className="w-full py-1.5 rounded-xl bg-[#080E1A] border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 flex items-center justify-center gap-1.5 transition-all"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
              View Bot Event Stream ({botState.log.length})
            </button>
          </div>

          {/* Market & System Context Card */}
          <div className="p-4 rounded-2xl bg-[#0B111E] border border-gray-800/80 space-y-3 shadow-md text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                Market & System Context
              </h4>
              <span className="text-[10px] text-gray-500">{snapshot.exchange}</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Live Price:</span>
                <strong className="text-white font-bold">${snapshot.price}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Change:</span>
                <strong className={snapshot.change24h >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {snapshot.change24h >= 0 ? '+' : ''}{snapshot.change24h}%
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h High / Low:</span>
                <span className="text-gray-300">${snapshot.high24h} / ${snapshot.low24h}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bid / Ask:</span>
                <span className="text-gray-300">${snapshot.bid} / ${snapshot.ask}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Spread:</span>
                <span className="text-gray-300">${snapshot.spread}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/80 space-y-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Connection:</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {hasAlpaca ? 'Alpaca Live' : 'Paper Simulated'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Score:</span>
                <span className="font-bold text-white">{snapshot.dataQuality.overallScore}%</span>
              </div>
            </div>
          </div>

          {/* Manual Order Ticket Card */}
          <div className="p-4 rounded-2xl bg-[#0B111E] border border-gray-800/80 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                Execution Workspace
              </h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                {hasAlpaca ? 'Alpaca' : 'Paper'}
              </span>
            </div>

            {/* Side Selector (BUY vs SELL) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                className={`py-2 rounded-xl font-extrabold text-xs transition-all ${
                  orderSide === 'BUY'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400'
                    : 'bg-[#080E1A] border border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                className={`py-2 rounded-xl font-extrabold text-xs transition-all ${
                  orderSide === 'SELL'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-400'
                    : 'bg-[#080E1A] border border-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 text-[11px] font-semibold">Order Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['MARKET', 'LIMIT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        orderType === t
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-[#080E1A] border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <label className="text-gray-400 block mb-1 text-[11px] font-semibold">Limit Price ($)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(Number(e.target.value))}
                    className="w-full bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs font-bold focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1 text-[11px]">
                  <label className="text-gray-400 font-semibold">Position Size ({activeSymbol.replace('USDT', '')})</label>
                  <span className="text-gray-500 font-mono">≈ ${(orderSize * (snapshot?.price ?? 0)).toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  step="0.001"
                  min="0.0001"
                  value={orderSize}
                  onChange={(e) => setOrderSize(Math.max(0.0001, Number(e.target.value)))}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs font-bold focus:border-blue-500 outline-none"
                />
              </div>

              {/* Percentage Quick Pickers */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[10, 25, 50, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSizePreset(pct)}
                    className="py-1 rounded-lg bg-[#080E1A] border border-gray-800 hover:border-gray-700 text-[10px] font-bold text-gray-400 hover:text-white transition-all"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={() => onExecuteManualTrade(orderSide, orderSize)}
              className={`w-full py-2.5 rounded-xl font-black text-xs transition-all shadow-md ${
                orderSide === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              Submit {hasAlpaca ? 'Alpaca' : 'Paper'} {orderSide}
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            COLUMN 2 (CENTER ~55-60%): PRIMARY CHART + LOWER WORKSPACE TABS
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Primary Candlestick Chart (Largest Visual Element) */}
          <div className="p-4 rounded-2xl bg-[#0B111E] border border-gray-800/80 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    {snapshot.symbol} Candlestick Chart
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">1m Timeframe</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">EMA(20) Blue Overlay · Target Lines Active</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-white">${snapshot.price}</span>
                <span className={`ml-2 text-xs font-extrabold ${snapshot.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {snapshot.change24h >= 0 ? '+' : ''}{snapshot.change24h}%
                </span>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#080E1A]">
              <InteractiveChart
                candles={snapshot.candles}
                entry={decision?.entry ?? null}
                stopLoss={decision?.stopLoss ?? null}
                takeProfit={decision?.takeProfit ?? null}
                height={390}
              />
            </div>
          </div>

          {/* Lower Multi-Tabbed Quantitative Workspace */}
          <div className="rounded-2xl bg-[#0B111E] border border-gray-800/80 shadow-md overflow-hidden flex flex-col">
            
            {/* Tab Navigation Header */}
            <div className="flex items-center overflow-x-auto border-b border-gray-800 bg-[#080E1A]/80 px-2 pt-1 gap-1">
              {([
                { id: 'Positions', label: `Positions (${positions.length})`, icon: ShoppingBag },
                { id: 'Orders', label: `Orders (${openOrdersCount})`, icon: ListOrdered },
                { id: 'Order Book', label: 'Order Book (L2)', icon: Layers },
                { id: 'Time & Sales', label: 'Time & Sales', icon: Clock },
                { id: 'Executions', label: `Executions (${tradeHistory.length})`, icon: FileText },
                { id: 'Terminal Logs', label: `Terminal Logs (${botState.log.length})`, icon: TerminalIcon },
              ] as { id: WorkspaceTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveWorkspaceTab(id)}
                  className={`px-3 py-2.5 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                    activeWorkspaceTab === id
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Body Contents */}
            <div className="p-3.5 min-h-[220px] max-h-[300px] overflow-y-auto">
              
              {/* TAB 1: POSITIONS */}
              {activeWorkspaceTab === 'Positions' && (
                <div>
                  {positions.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-xs">
                      No open positions. Use manual ticket, AI signals, or spawn a bot to enter.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-800 pb-2 text-[11px]">
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
                            <tr key={pos.id} className="text-gray-200 hover:bg-gray-800/20">
                              <td className="py-2 font-bold">{pos.symbol}</td>
                              <td className={`py-2 font-bold ${pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{pos.side}</td>
                              <td className="py-2 font-mono">${pos.entryPrice}</td>
                              <td className="py-2 font-mono">${pos.currentPrice}</td>
                              <td className="py-2 font-mono">{pos.size}</td>
                              <td className={`py-2 font-mono font-bold ${pos.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL} ({pos.unrealizedPnLPercent}%)
                              </td>
                              <td className="py-2 text-right">
                                <button
                                  onClick={() => onClosePosition(pos.id)}
                                  className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 font-bold text-[11px]"
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
              )}

              {/* TAB 2: OPEN ORDERS */}
              {activeWorkspaceTab === 'Orders' && (
                <div>
                  {orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-xs">No active orders in session.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-800 pb-2 text-[11px]">
                            <th className="pb-2">Order ID</th>
                            <th className="pb-2">Symbol</th>
                            <th className="pb-2">Side</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Price</th>
                            <th className="pb-2">Size</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="text-gray-200 hover:bg-gray-800/20">
                              <td className="py-2 font-mono text-[11px] text-gray-400">{ord.id.slice(0, 14)}...</td>
                              <td className="py-2 font-bold">{ord.symbol}</td>
                              <td className={`py-2 font-bold ${ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{ord.side}</td>
                              <td className="py-2">{ord.type}</td>
                              <td className="py-2 font-mono">${ord.price}</td>
                              <td className="py-2 font-mono">{ord.size}</td>
                              <td className="py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  ord.status === 'FILLED' ? 'bg-emerald-500/20 text-emerald-400' :
                                  ord.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-gray-800 text-gray-400'
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2 text-[11px] text-gray-400">{ord.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ORDER BOOK */}
              {activeWorkspaceTab === 'Order Book' && (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  {/* Bids */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Bids (Buy Orders)</span>
                    {snapshot.orderBook.bids.slice(0, 6).map((bid, idx) => (
                      <div key={idx} className="flex justify-between items-center relative py-0.5 px-2 bg-[#080E1A] rounded">
                        <div
                          className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 rounded"
                          style={{ width: `${Math.min(100, (bid.size / 150) * 100)}%` }}
                        />
                        <span className="text-emerald-400 relative font-bold">${bid.price}</span>
                        <span className="text-gray-300 relative">{bid.size}</span>
                      </div>
                    ))}
                  </div>

                  {/* Asks */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">Asks (Sell Orders)</span>
                    {snapshot.orderBook.asks.slice(0, 6).reverse().map((ask, idx) => (
                      <div key={idx} className="flex justify-between items-center relative py-0.5 px-2 bg-[#080E1A] rounded">
                        <div
                          className="absolute right-0 top-0 bottom-0 bg-rose-500/10 rounded"
                          style={{ width: `${Math.min(100, (ask.size / 150) * 100)}%` }}
                        />
                        <span className="text-rose-400 relative font-bold">${ask.price}</span>
                        <span className="text-gray-300 relative">{ask.size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: TIME & SALES */}
              {activeWorkspaceTab === 'Time & Sales' && (
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="grid grid-cols-4 text-gray-500 text-[10px] font-bold pb-1 border-b border-gray-800 uppercase">
                    <span>Side</span>
                    <span>Price</span>
                    <span>Size</span>
                    <span className="text-right">Timestamp</span>
                  </div>
                  {snapshot.recentTrades.slice(0, 10).map((t) => (
                    <div key={t.id} className="grid grid-cols-4 py-0.5 text-gray-300 items-center">
                      <span className={`font-bold ${t.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.side}</span>
                      <span className="font-bold">${t.price}</span>
                      <span>{t.size}</span>
                      <span className="text-right text-gray-500 text-[11px]">{new Date(t.time).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: EXECUTIONS / TRADE HISTORY */}
              {activeWorkspaceTab === 'Executions' && (
                <div>
                  {tradeHistory.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-xs">No closed executions yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-800 pb-2 text-[11px]">
                            <th className="pb-2">Symbol</th>
                            <th className="pb-2">Side</th>
                            <th className="pb-2">Entry</th>
                            <th className="pb-2">Exit</th>
                            <th className="pb-2">Realized P&L</th>
                            <th className="pb-2">Reason</th>
                            <th className="pb-2 text-right">Closed At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {tradeHistory.map((tr) => (
                            <tr key={tr.id} className="text-gray-200 hover:bg-gray-800/20">
                              <td className="py-2 font-bold">{tr.symbol}</td>
                              <td className={`py-2 font-bold ${tr.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{tr.side}</td>
                              <td className="py-2 font-mono">${tr.entryPrice}</td>
                              <td className="py-2 font-mono">${tr.exitPrice}</td>
                              <td className={`py-2 font-mono font-bold ${tr.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tr.realizedPnL >= 0 ? '+' : ''}${tr.realizedPnL} ({tr.realizedPnLPercent}%)
                              </td>
                              <td className="py-2 text-[11px] text-gray-400">{tr.closeReason}</td>
                              <td className="py-2 text-right text-gray-500 text-[11px]">{new Date(tr.closedAt).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: TERMINAL LOGS */}
              {activeWorkspaceTab === 'Terminal Logs' && (
                <div className="bg-[#080E1A] rounded-xl border border-gray-800 p-3 max-h-[220px] overflow-y-auto space-y-1 font-mono text-[11px]">
                  {botState.log.length === 0 ? (
                    <p className="text-gray-600 italic text-center py-4">No system logs recorded yet.</p>
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
              )}
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            COLUMN 3 (RIGHT ~20-25%): AI DECISION + DETERMINISTIC RISK GATE
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* AI Decision & Advisory Intelligence Card */}
          <div className="p-4 rounded-2xl bg-[#0B111E] border border-blue-500/30 space-y-3.5 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">AI Decision Center</h4>
                  <span className="text-[10px] text-gray-400">LLM Advisory Stream</span>
                </div>
              </div>

              {/* Signal Badge */}
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                decision?.action === 'BUY' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/30' :
                decision?.action === 'SELL' ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-sm shadow-rose-500/30' :
                decision?.action === 'HOLD' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
                'bg-gray-800 border-gray-700 text-gray-400'
              }`}>
                {decision?.action ?? 'EVALUATING'}
              </span>
            </div>

            {/* Confidence & Planned Price Levels */}
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-gray-400 font-semibold">Model Confidence</span>
                  <span className="text-blue-400 font-bold">{decision?.confidence ?? 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${decision?.confidence ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono text-[11px]">
                <div className="p-1.5 bg-[#080E1A] rounded-lg border border-gray-800/80">
                  <span className="text-[9px] text-gray-500 block uppercase">Entry</span>
                  <strong className="text-white">${decision?.entry ?? '—'}</strong>
                </div>
                <div className="p-1.5 bg-[#080E1A] rounded-lg border border-gray-800/80">
                  <span className="text-[9px] text-gray-500 block uppercase">Stop Loss</span>
                  <strong className="text-rose-400">${decision?.stopLoss ?? '—'}</strong>
                </div>
                <div className="p-1.5 bg-[#080E1A] rounded-lg border border-gray-800/80">
                  <span className="text-[9px] text-gray-500 block uppercase">Take Profit</span>
                  <strong className="text-emerald-400">${decision?.takeProfit ?? '—'}</strong>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-gray-400 pt-1">
                <span>Risk / Reward Ratio:</span>
                <strong className="text-white font-mono">{decision?.riskReward ? `${decision.riskReward}:1` : '—'}</strong>
              </div>
            </div>

            {/* Progressive Disclosure: AI Reasoning */}
            <div className="pt-2 border-t border-gray-800/80">
              <button
                type="button"
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-gray-300 hover:text-white"
              >
                <span>AI Rationale & Specialist Votes</span>
                {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showReasoning && (
                <div className="mt-2 space-y-2 text-[11px]">
                  {/* Reasoning list */}
                  {decision?.reasoning && decision.reasoning.length > 0 ? (
                    <div className="p-2 bg-[#080E1A] rounded-xl border border-gray-800 space-y-1">
                      {decision.reasoning.map((r, i) => (
                        <div key={i} className="text-gray-300 flex items-start gap-1.5">
                          <span className="text-blue-400 shrink-0">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No rationale available.</p>
                  )}

                  {/* Specialist Agent Votes */}
                  {signals.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Agent Consensus:</span>
                      <div className="grid grid-cols-2 gap-1">
                        {signals.map((sig) => (
                          <div key={sig.agentId} className="p-1.5 bg-[#080E1A] rounded-lg border border-gray-800 flex items-center justify-between text-[10px]">
                            <span className="text-gray-400 truncate max-w-[70px]">{sig.agentName}</span>
                            <span className={`font-black ${
                              sig.bias === 'BULLISH' ? 'text-emerald-400' :
                              sig.bias === 'BEARISH' ? 'text-rose-400' :
                              'text-amber-400'
                            }`}>
                              {sig.bias}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Deterministic Risk Gate Card (Visually Separated) */}
          <div className="p-4 rounded-2xl bg-[#0B111E] border border-rose-500/30 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${
                  isGateApproved ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                }`}>
                  {isGateApproved ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-none">Deterministic Risk Gate</h4>
                  <span className="text-[10px] text-gray-400">Fail-Closed Safety Engine</span>
                </div>
              </div>

              {/* Status */}
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                isGateApproved ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}>
                {isGateApproved ? 'PASS' : 'GATED'}
              </span>
            </div>

            {/* Check results */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#080E1A] border border-gray-800">
                <span className="text-gray-400 text-[11px]">Daily Drawdown:</span>
                <span className="font-mono font-bold text-white">{portfolio?.dailyDrawdownPercent.toFixed(2) ?? '0.00'}% / {maxDailyDrawdown}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#080E1A] border border-gray-800">
                <span className="text-gray-400 text-[11px]">Spread Limit:</span>
                <span className="font-mono font-bold text-white">{((snapshot?.spread / snapshot?.price) * 100).toFixed(3)}% / {maxSpreadPercent}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#080E1A] border border-gray-800">
                <span className="text-gray-400 text-[11px]">Min R:R Ratio:</span>
                <span className="font-mono font-bold text-white">{minRiskReward}:1</span>
              </div>

              {riskCheck?.failedGates && riskCheck.failedGates.length > 0 && (
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
                  <span className="font-bold block">Active Blocks:</span>
                  {riskCheck.failedGates.map((fg, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{fg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progressive Disclosure: User Configurable Thresholds */}
            <div className="pt-2 border-t border-gray-800/80">
              <button
                type="button"
                onClick={() => setShowRiskConfig(!showRiskConfig)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-gray-300 hover:text-white"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  Configure Risk-Gate Thresholds
                </span>
                {showRiskConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRiskConfig && (
                <form onSubmit={handleSaveRiskConfig} className="mt-3 space-y-3 p-3 bg-[#080E1A] rounded-xl border border-gray-800 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1 text-[10px] font-semibold">Max Position Risk (% of Equity)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={maxRiskPercent}
                      onChange={(e) => setMaxRiskPercent(Number(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 text-[10px] font-semibold">Max Daily Drawdown (% Limit)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="20"
                      value={maxDailyDrawdown}
                      onChange={(e) => setMaxDailyDrawdown(Number(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 text-[10px] font-semibold">Min Risk / Reward Ratio (e.g. 2.0 = 2:1)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10"
                      value={minRiskReward}
                      onChange={(e) => setMinRiskReward(Number(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 text-[10px] font-semibold">Max Spread (% of Price)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="2"
                      value={maxSpreadPercent}
                      onChange={(e) => setMaxSpreadPercent(Number(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-300">Macro News Kill Switch</span>
                    <input
                      type="checkbox"
                      checked={newsKillSwitch}
                      onChange={(e) => setNewsKillSwitch(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-0"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md mt-1"
                  >
                    Save Risk Limits
                  </button>

                  {riskSavedToast && (
                    <span className="text-[10px] text-emerald-400 font-bold block text-center mt-1">
                      ✓ Risk thresholds updated
                    </span>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY/DOCKED STATUS BAR FOOTER ─────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center px-4 py-2 bg-[#0B111E] text-xs text-gray-400 border border-gray-800/80 rounded-2xl shadow-lg gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong className="text-gray-300 font-semibold">Broker:</strong> {hasAlpaca ? 'Alpaca Live' : 'Paper Sim'}
          </span>
          <div className="w-px h-3 bg-gray-800" />
          <span>
            <strong className="text-gray-300 font-semibold">Latency:</strong> {computedLatency} ms
          </span>
          <div className="w-px h-3 bg-gray-800" />
          <span>
            <strong className="text-gray-300 font-semibold">Data Score:</strong>{' '}
            <span className="text-emerald-400 font-bold">{snapshot?.dataQuality?.overallScore ?? 100}%</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            <strong className="text-gray-300 font-semibold">Equity:</strong>{' '}
            <strong className="text-white">${portfolio?.equity?.toLocaleString() ?? '10,000'}</strong>
          </span>
          <div className="w-px h-3 bg-gray-800" />
          <span>
            <strong className="text-gray-300 font-semibold">Bot State:</strong>{' '}
            <span className={isBotRunning ? 'text-emerald-400 font-bold' : 'text-gray-400 font-bold'}>
              {botState.status} (#{botState.cycleCount})
            </span>
          </span>
        </div>
      </div>

      {/* ── BOT LOG MODAL ───────────────────────────────────────────────────── */}
      {showBotLogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] p-6 rounded-2xl border border-gray-800 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Bot Event Stream & Execution Log</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBotLogModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#080E1A] rounded-xl border border-gray-800 p-3.5 max-h-80 overflow-y-auto space-y-1.5 font-mono text-xs">
              {botState.log.length === 0 ? (
                <p className="text-gray-600 italic py-6 text-center">No logs generated yet.</p>
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

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowBotLogModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOT SPAWN CONFIG MODAL ───────────────────────────────────────────── */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleStartBot} className="bg-[#0B111E] p-6 rounded-2xl border border-gray-800 max-w-md w-full space-y-5 shadow-2xl">
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
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-2 text-white font-bold"
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
                    className="w-full bg-[#080E1A] border border-gray-800 rounded-xl pl-7 pr-3 py-2 text-white font-bold"
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Cycle Evaluation Frequency</label>
                <select
                  value={cycleInterval}
                  onChange={(e) => setCycleInterval(Number(e.target.value))}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-2 text-white font-semibold"
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
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-2 text-white font-semibold"
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
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value={2}>2 losses in a row</option>
                  <option value={3}>3 losses in a row (Default)</option>
                  <option value={5}>5 losses in a row</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <div>
                  <span className="text-white font-bold block">Auto-Exit Without Confirmation</span>
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
                Launch Bot (${allocatedCapital})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── EXIT REQUEST MODAL OVERLAY ────────────────────────────────────────── */}
      {botState.exitRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B111E] p-6 rounded-2xl border border-amber-500/50 max-w-lg w-full space-y-5 shadow-2xl shadow-amber-500/20 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Bot Requesting Market Exit</h3>
                <p className="text-xs text-amber-400">The bot detected an exit condition and paused trading.</p>
              </div>
            </div>

            <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2 text-xs">
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
    </div>
  );
};
