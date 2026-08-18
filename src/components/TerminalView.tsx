'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MarketSnapshot,
  SymbolId,
  LLMDecision,
  Position,
  PortfolioState,
  AgentSignal,
  SignalFusionResult,
  RiskCheckResult,
  Order,
  TradeHistoryItem,
  FeatureVector,
} from '@/types/trading';
import { BotState, BotConfig } from '@/lib/bot/engine';
import { InteractiveChart } from './InteractiveChart';
import {
  TrendingUp,
  TrendingDown,
  Bot,
  Play,
  Square,
  ChevronDown,
  Settings,
  Plus,
  MoreVertical,
  Activity,
  Sliders,
  CheckCircle2,
  X,
  ListOrdered,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export interface TerminalViewProps {
  snapshot: MarketSnapshot;
  symbols: SymbolId[];
  activeSymbol: SymbolId;
  onSelectSymbol: (symbol: SymbolId) => void;
  decision: LLMDecision | null;
  positions: Position[];
  portfolio: PortfolioState | null;
  onExecuteManualTrade: (
    side: 'BUY' | 'SELL',
    size: number,
    type?: 'MARKET' | 'LIMIT',
    limitPrice?: number
  ) => void;
  onClosePosition: (id: string) => void;
  onCancelOrder?: (id: string) => void;
  // Bot Props
  botState: BotState;
  onSpawnBot: (config: BotConfig) => void;
  onStopBot: () => void;
  onConfirmBotExit: () => void;
  onResumeBot: () => void;
  // Extended intelligence
  signals?: AgentSignal[];
  fusion?: SignalFusionResult | null;
  riskCheck?: RiskCheckResult | null;
  orders?: Order[];
  tradeHistory?: TradeHistoryItem[];
  features?: FeatureVector | null;
}

type WorkspaceTab =
  | 'POSITIONS'
  | 'ORDERS'
  | 'ORDER BOOK'
  | 'TIME & SALES'
  | 'EXECUTIONS'
  | 'TERMINAL LOGS';

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
  onCancelOrder,
  botState,
  onSpawnBot,
  onStopBot,
  signals = [],
  fusion = null,
  riskCheck = null,
  orders = [],
  tradeHistory = [],
}) => {
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<WorkspaceTab>('POSITIONS');
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState('ALL');

  // Spawn Bot Form State
  const [spawnSymbol, setSpawnSymbol] = useState<SymbolId>(activeSymbol);
  const [spawnCapital, setSpawnCapital] = useState('100000');
  const [spawnInterval, setSpawnInterval] = useState('30');
  const [spawnStrategy, setSpawnStrategy] = useState('AI Quant Core Strategy');

  // Live order ticket state
  const [manualSide, setManualSide] = useState<'BUY' | 'SELL'>('BUY');
  const [manualSize, setManualSize] = useState('0.03');

  // Terminal Live Logs Stream
  const [logs, setLogs] = useState<
    { id: number; time: string; tag: string; message: string; color: string }[]
  >([
    {
      id: 1,
      time: '11:03:15',
      tag: '[MARKET]',
      message: 'BTCUSDT price update: 64250.18 (+0.06%)',
      color: 'text-cyan-400',
    },
    {
      id: 2,
      time: '11:03:15',
      tag: '[FEATURE]',
      message: '128 features computed',
      color: 'text-purple-400',
    },
    {
      id: 3,
      time: '11:03:15',
      tag: '[AGENT]',
      message: 'Agents updated successfully (8/8)',
      color: 'text-blue-400',
    },
    {
      id: 4,
      time: '11:03:15',
      tag: '[FUSION]',
      message: 'Fusion score: 0.71 | Candidate: BUY',
      color: 'text-emerald-400',
    },
    {
      id: 5,
      time: '11:03:15',
      tag: '[LLM]',
      message: 'Confidence: 81% | Reason generated',
      color: 'text-yellow-400',
    },
    {
      id: 6,
      time: '11:03:15',
      tag: '[RISK]',
      message: 'All risk checks passed | Status: APPROVED',
      color: 'text-emerald-400',
    },
    {
      id: 7,
      time: '11:03:15',
      tag: '[BROKER]',
      message: 'Order executed: BUY 0.03 BTCUSDT',
      color: 'text-cyan-300',
    },
    {
      id: 8,
      time: '11:03:15',
      tag: '[EXECUTION]',
      message: 'Filled @ 64,250.18 | Slippage: 0.18',
      color: 'text-indigo-300',
    },
    {
      id: 9,
      time: '11:03:15',
      tag: '[P&L]',
      message: 'Position opened | Unrealized: +$5.10',
      color: 'text-emerald-400',
    },
    {
      id: 10,
      time: '11:03:15',
      tag: '[SYSTEM]',
      message: 'System operational',
      color: 'text-gray-400',
    },
  ]);

  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Market Watch data
  const marketWatchData = [
    {
      symbol: 'BTCUSDT',
      price: snapshot?.symbol === 'BTCUSDT' ? snapshot.price : 64250.18,
      change24h: '+1.32%',
      vol: '$24.8B',
      isStar: true,
    },
    {
      symbol: 'ETHUSDT',
      price: snapshot?.symbol === 'ETHUSDT' ? snapshot.price : 3142.25,
      change24h: '+2.18%',
      vol: '$12.6B',
      isStar: true,
    },
    {
      symbol: 'SOLUSDT',
      price: snapshot?.symbol === 'SOLUSDT' ? snapshot.price : 152.68,
      change24h: '+3.21%',
      vol: '$2.1B',
      isStar: true,
    },
    {
      symbol: 'XRPUSDT',
      price: snapshot?.symbol === 'XRPUSDT' ? snapshot.price : 0.5432,
      change24h: '+0.87%',
      vol: '$1.2B',
      isStar: false,
    },
  ];

  // 8 AI Specialists list
  const specialistAgents = [
    {
      name: 'Regime Agent',
      bias: 'BULLISH',
      conf: '78%',
      color: 'text-emerald-400',
    },
    {
      name: 'Technical Agent',
      bias: 'BULLISH',
      conf: '82%',
      color: 'text-emerald-400',
    },
    {
      name: 'Liquidity Agent',
      bias: 'BULLISH',
      conf: '68%',
      color: 'text-emerald-400',
    },
    {
      name: 'Positioning Agent',
      bias: 'BEARISH',
      conf: '61%',
      color: 'text-rose-400',
    },
    {
      name: 'Momentum Agent',
      bias: 'BULLISH',
      conf: '76%',
      color: 'text-emerald-400',
    },
    {
      name: 'Volatility Agent',
      bias: 'NEUTRAL',
      conf: '54%',
      color: 'text-yellow-400',
    },
    {
      name: 'Macro/Sentiment Agent',
      bias: 'BULLISH',
      conf: '67%',
      color: 'text-emerald-400',
    },
    {
      name: 'Execution Agent',
      bias: 'BULLISH',
      conf: '72%',
      color: 'text-emerald-400',
    },
  ];

  // Order Book Mock Data
  const orderBookAsks = [
    { price: 64255.0, size: 1.245, sum: 4.651 },
    { price: 64254.0, size: 0.582, sum: 3.406 },
    { price: 64253.0, size: 0.734, sum: 2.824 },
    { price: 64252.0, size: 0.864, sum: 2.09 },
    { price: 64251.0, size: 1.226, sum: 1.226 },
  ];

  const orderBookBids = [
    { price: 64250.0, size: 1.112, sum: 1.112 },
    { price: 64249.0, size: 2.431, sum: 3.543 },
    { price: 64248.0, size: 0.941, sum: 4.484 },
    { price: 64247.0, size: 3.102, sum: 7.586 },
    { price: 64246.0, size: 1.882, sum: 9.468 },
  ];

  // Time & Sales Data
  const timeAndSales = [
    { time: '11:03:15', price: 64250.18, size: 0.421, side: 'BUY' },
    { time: '11:03:14', price: 64249.9, size: 0.081, side: 'SELL' },
    { time: '11:03:13', price: 64249.75, size: 1.124, side: 'BUY' },
    { time: '11:03:12', price: 64249.5, size: 0.3, side: 'BUY' },
    { time: '11:03:11', price: 64249.2, size: 0.511, side: 'SELL' },
    { time: '11:03:10', price: 64249.0, size: 0.642, side: 'BUY' },
    { time: '11:03:09', price: 64248.8, size: 0.22, side: 'SELL' },
    { time: '11:03:08', price: 64248.25, size: 0.91, side: 'BUY' },
  ];

  const handleSpawnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawnBot({
      symbol: spawnSymbol,
      allocatedCapital: parseFloat(spawnCapital) || 100000,
      cycleIntervalSeconds: parseInt(spawnInterval) || 30,
      maxConsecutiveNoTrades: 5,
      maxConsecutiveLosses: 3,
      autoConfirmExit: true,
    });
    setShowSpawnModal(false);
  };

  const handleExecuteManualOrder = () => {
    const sz = parseFloat(manualSize) || 0.01;
    onExecuteManualTrade(manualSide, sz, 'MARKET');
  };

  return (
    <div className="space-y-3 pb-8 text-white">
      {/* ── 3-PANEL INSTITUTIONAL TRADING WORKSTATION ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
        {/* ═════════════════════════════════════════════════════════════════════
            PANEL 1 (LEFT ~24%): ACTIVE BOT + MARKET WATCH + 8 SPECIALISTS
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-3 space-y-3">
          {/* Active Bot Card */}
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-3 shadow-md">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Active Bot
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white truncate">
                    QUANTARION V1.3
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ACTIVE
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  AI Quant Core Strategy
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold border border-gray-700">
                PAPER
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                MODERATE RISK
              </span>
            </div>

            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Capital Allocation</span>
                <span className="font-mono font-bold text-white">
                  $100,000.00
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Today P&L</span>
                <span className="font-mono font-bold text-emerald-400">
                  +$1,245.31 (+1.01%)
                </span>
              </div>
            </div>

            {/* Actions: Bot Manager & Spawn Bot */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setSpawnSymbol(activeSymbol);
                  setShowSpawnModal(true);
                }}
                className="py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-gray-700"
              >
                <Settings className="w-3.5 h-3.5" /> Bot Manager
              </button>

              <button
                onClick={() => {
                  setSpawnSymbol(activeSymbol);
                  setShowSpawnModal(true);
                }}
                className="py-2 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-cyan-500/40 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Spawn Bot
              </button>
            </div>
          </div>

          {/* Market Watch Table */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Market Watch
              </span>
              <div className="flex items-center gap-1 text-gray-400">
                <button
                  onClick={() => setShowSpawnModal(true)}
                  className="hover:text-white p-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button className="hover:text-white p-1">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                  <th className="pb-1.5 font-bold font-sans">Symbol</th>
                  <th className="pb-1.5 font-bold font-sans text-right">
                    Price
                  </th>
                  <th className="pb-1.5 font-bold font-sans text-right">
                    24h %
                  </th>
                  <th className="pb-1.5 font-bold font-sans text-right">Vol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {marketWatchData.map((m) => (
                  <tr
                    key={m.symbol}
                    onClick={() => onSelectSymbol(m.symbol as SymbolId)}
                    className={`cursor-pointer transition-colors ${
                      activeSymbol === m.symbol
                        ? 'bg-blue-600/15 text-cyan-300'
                        : 'hover:bg-gray-800/30 text-gray-300'
                    }`}
                  >
                    <td className="py-2 flex items-center gap-1 font-bold">
                      <span className="text-amber-400 text-xs">
                        {m.isStar ? '★' : '✕'}
                      </span>
                      <span>{m.symbol}</span>
                    </td>
                    <td className="py-2 text-right font-bold text-white">
                      {m.price > 1
                        ? m.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })
                        : m.price.toFixed(4)}
                    </td>
                    <td className="py-2 text-right text-emerald-400 font-bold">
                      {m.change24h}
                    </td>
                    <td className="py-2 text-right text-gray-400">{m.vol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* System Status Indicators (8 items) */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] space-y-1.5 shadow-md">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">
              System Status
            </div>

            {[
              { label: 'Market Data', status: 'Connected' },
              { label: 'WebSocket', status: 'Connected' },
              { label: 'Feature Engine', status: 'Running' },
              { label: 'AI Agents (8/8)', status: 'Active' },
              { label: 'Risk Engine', status: 'Active' },
              { label: 'Paper Broker', status: 'Active' },
              { label: 'LLM Moderator', status: 'Online' },
              { label: 'Research Engine', status: 'Ready' },
            ].map((st, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2 text-gray-300 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {st.label}
                </span>
                <span className="text-emerald-400 font-semibold text-[11px]">
                  {st.status}
                </span>
              </div>
            ))}
          </div>

          {/* AI Agent Status (8 Specialists) */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                AI Agent Status
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                8 / 8 Active
              </span>
            </div>

            <div className="space-y-1.5">
              {specialistAgents.map((ag, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-300 text-[11px]">{ag.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black ${ag.color}`}>
                      {ag.bias}
                    </span>
                    <span className="font-mono text-gray-400 text-[11px]">
                      {ag.conf}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            PANEL 2 (CENTER ~50%): CANDLESTICK CHART + MULTI-TAB WORKSPACE
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-6 space-y-3 min-w-0">
          {/* Main Candlestick Chart */}
          <InteractiveChart
            candles={snapshot?.candles || []}
            symbol={activeSymbol}
            entry={64250.0}
            stopLoss={63800.0}
            takeProfit={65600.0}
            height={380}
          />

          {/* Bottom Tabbed Trading Workspace */}
          <div className="bg-[#0B111E] rounded-xl border border-[#1E293B] overflow-hidden shadow-md">
            {/* Sub Tabs */}
            <div className="flex items-center gap-4 px-4 pt-3 border-b border-gray-800 text-xs font-bold">
              {(
                [
                  'POSITIONS',
                  'ORDERS',
                  'ORDER BOOK',
                  'TIME & SALES',
                  'EXECUTIONS',
                  'TERMINAL LOGS',
                ] as WorkspaceTab[]
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveWorkspaceTab(tab)}
                  className={`pb-2.5 transition-colors ${
                    activeWorkspaceTab === tab
                      ? 'text-cyan-400 border-b-2 border-cyan-400 font-black'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Workspace Content: POSITIONS */}
            {activeWorkspaceTab === 'POSITIONS' && (
              <div className="p-3 space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                        <th className="pb-2 font-bold font-sans">Symbol</th>
                        <th className="pb-2 font-bold font-sans">Side</th>
                        <th className="pb-2 font-bold font-sans">Size</th>
                        <th className="pb-2 font-bold font-sans">
                          Entry Price
                        </th>
                        <th className="pb-2 font-bold font-sans">Mark Price</th>
                        <th className="pb-2 font-bold font-sans">
                          Unrealized P&L
                        </th>
                        <th className="pb-2 font-bold font-sans">P&L %</th>
                        <th className="pb-2 font-bold font-sans">R Multiple</th>
                        <th className="pb-2 font-bold font-sans text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {positions.length > 0 ? (
                        positions.map((pos) => (
                          <tr key={pos.id} className="hover:bg-gray-800/20">
                            <td className="py-2.5 font-bold text-white flex items-center gap-1.5 font-sans">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              {pos.symbol}
                            </td>
                            <td className="py-2.5 font-bold text-emerald-400">
                              {pos.side}
                            </td>
                            <td className="py-2.5 text-gray-300">
                              {pos.size} {pos.symbol.replace('USDT', '')}
                            </td>
                            <td className="py-2.5 text-gray-300">
                              ${pos.entryPrice.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-gray-200 font-bold">
                              ${snapshot?.price.toLocaleString() || '64,420.18'}
                            </td>
                            <td className="py-2.5 font-bold text-emerald-400">
                              +${pos.unrealizedPnL.toFixed(2)}
                            </td>
                            <td className="py-2.5 font-bold text-emerald-400">
                              +0.38%
                            </td>
                            <td className="py-2.5 font-bold text-emerald-400">
                              +0.38R
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => onClosePosition(pos.id)}
                                className="p-1 text-gray-400 hover:text-rose-400 transition-colors"
                                title="Close Position"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-gray-800/20">
                          <td className="py-2.5 font-bold text-white flex items-center gap-1.5 font-sans">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            BTCUSDT
                          </td>
                          <td className="py-2.5 font-bold text-emerald-400">
                            LONG
                          </td>
                          <td className="py-2.5 text-gray-300">0.03 BTC</td>
                          <td className="py-2.5 text-gray-300">64,250.00</td>
                          <td className="py-2.5 text-gray-200 font-bold">
                            64,420.18
                          </td>
                          <td className="py-2.5 font-bold text-emerald-400">
                            +$5.10
                          </td>
                          <td className="py-2.5 font-bold text-emerald-400">
                            +0.38%
                          </td>
                          <td className="py-2.5 font-bold text-emerald-400">
                            +0.38R
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => {}}
                              className="p-1 text-gray-400 hover:text-rose-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Financial Overview Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-gray-800/80 text-xs">
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Total Unrealized P&L
                    </div>
                    <div className="font-bold text-emerald-400 font-mono">
                      +$5.10
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Total Realized P&L
                    </div>
                    <div className="font-bold text-emerald-400 font-mono">
                      +$1,240.21
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Total P&L</div>
                    <div className="font-bold text-emerald-400 font-mono">
                      +$1,245.31
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Exposure</div>
                    <div className="font-bold text-white font-mono">
                      $1,927.21
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">
                      Available Margin
                    </div>
                    <div className="font-bold text-white font-mono">
                      $108,430.20
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Split Sub-Grid: Active Orders + Order Book + Time & Sales */}
            <div className="grid grid-cols-1 md:grid-cols-3 border-t border-gray-800/80 divide-y md:divide-y-0 md:divide-x divide-gray-800/80 p-3 gap-3">
              {/* Left: Orders */}
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">
                  Active Orders
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center bg-gray-900/60 p-1.5 rounded">
                    <div>
                      <span className="text-emerald-400 font-bold">BUY</span>{' '}
                      <span className="text-gray-300">0.03 MKT</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      FILLED
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-900/60 p-1.5 rounded">
                    <div>
                      <span className="text-rose-400 font-bold">SELL</span>{' '}
                      <span className="text-gray-300">0.03 @ 63,800</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                      ACTIVE (SL)
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-900/60 p-1.5 rounded">
                    <div>
                      <span className="text-rose-400 font-bold">SELL</span>{' '}
                      <span className="text-gray-300">0.03 @ 65,600</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                      ACTIVE (TP)
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle: Order Book */}
              <div>
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-2">
                  <span>ORDER BOOK</span>
                  <span className="text-cyan-400 font-mono">0.01% Spread</span>
                </div>
                <div className="space-y-0.5 text-[11px] font-mono">
                  {orderBookAsks.slice(0, 3).map((a, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-rose-400"
                    >
                      <span>{a.price.toFixed(2)}</span>
                      <span className="text-gray-400">{a.size.toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="py-1 text-center font-bold text-white text-xs bg-gray-900/80 rounded my-1 border border-gray-800">
                    64,250.18
                  </div>
                  {orderBookBids.slice(0, 3).map((b, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-emerald-400"
                    >
                      <span>{b.price.toFixed(2)}</span>
                      <span className="text-gray-400">{b.size.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Time & Sales */}
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-2">
                  TIME & SALES
                </div>
                <div className="space-y-1 text-[11px] font-mono">
                  {timeAndSales.slice(0, 5).map((ts, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-500">{ts.time}</span>
                      <span className="text-white font-semibold">
                        {ts.price.toFixed(2)}
                      </span>
                      <span
                        className={`font-bold ${
                          ts.side === 'BUY'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {ts.size} {ts.side}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            PANEL 3 (RIGHT ~26%): AI SIGNAL + AGENT CONSENSUS + RISK GATE + LOGS
            ═════════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-3 space-y-3">
          {/* AI Signal Card */}
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                AI Signal
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                Updated: 11:03:15
              </span>
            </div>

            <div className="flex items-center justify-between">
              {/* Callout */}
              <div>
                <div className="text-3xl font-black text-emerald-400 tracking-tight">
                  BUY
                </div>
                <div className="text-[11px] text-gray-400">Dominant Signal</div>
              </div>

              {/* Radial Confidence Speedometer */}
              <div className="relative w-24 h-20 flex flex-col items-center justify-center">
                <svg
                  viewBox="0 0 100 60"
                  className="w-full h-full overflow-visible"
                >
                  {/* Background Arc */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Progress Arc 81% */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="url(#confGradient)"
                    strokeWidth="8"
                    strokeDasharray="125.6"
                    strokeDashoffset={`${125.6 * (1 - 0.81)}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="confGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center -mt-4">
                  <div className="text-base font-black text-white">81%</div>
                  <div className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">
                    Confidence
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fusion Score</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: '71%' }}
                    />
                  </div>
                  <span className="font-mono font-bold text-white">0.71</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conflict Level</span>
                <span className="font-semibold text-amber-400">Moderate</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Time Horizon</span>
                <span className="font-semibold text-gray-300">Intraday</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">R:R</span>
                <span className="font-mono font-bold text-emerald-400">
                  2.8 : 1
                </span>
              </div>
            </div>
          </div>

          {/* Agent Consensus Donut */}
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-3 shadow-md">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Agent Consensus
            </div>

            <div className="flex items-center justify-between">
              {/* Donut Chart */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 80 80"
                  className="transform -rotate-90"
                >
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="#1E293B"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    stroke="#10B981"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="188.4"
                    strokeDashoffset={`${188.4 * (1 - 0.71)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-xs font-black text-white">71%</div>
                  <div className="text-[7px] text-emerald-400 font-bold uppercase">
                    Buy Bias
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-gray-300">Bullish</span>
                  <span className="font-mono font-bold text-white ml-auto">
                    6
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-gray-300">Bearish</span>
                  <span className="font-mono font-bold text-white ml-auto">
                    1
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-gray-300">Neutral</span>
                  <span className="font-mono font-bold text-white ml-auto">
                    1
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAgentModal(true)}
              className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-bold text-center transition-colors"
            >
              View Agent Breakdown
            </button>
          </div>

          {/* Risk Gate Checklist */}
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-2.5 shadow-md">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Risk Gate
            </div>

            <div className="space-y-1 text-xs">
              {[
                { label: 'Data Freshness', status: 'Pass' },
                { label: 'Max Position', status: 'Pass' },
                { label: 'Daily Loss Limit', status: 'Pass' },
                { label: 'Drawdown Limit', status: 'Pass' },
                { label: 'Liquidity Check', status: 'Pass' },
                { label: 'Spread Check', status: 'Pass' },
                { label: 'Minimum R:R', status: 'Pass' },
              ].map((rg, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {rg.label}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-[11px]">
                    {rg.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                APPROVED
              </span>
              <span className="text-[10px] text-gray-400">
                All risk checks passed
              </span>
            </div>
          </div>

          {/* Terminal Logs Stream */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Terminal Logs
              </span>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-[#080E1A] border border-gray-800 text-[10px] rounded px-1.5 py-0.5 text-gray-300 focus:outline-none"
                >
                  <option value="ALL">ALL</option>
                  <option value="MARKET">MARKET</option>
                  <option value="RISK">RISK</option>
                  <option value="EXECUTION">EXECUTION</option>
                </select>
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            <div
              ref={logContainerRef}
              className="h-44 bg-[#080E1A] rounded-lg p-2 font-mono text-[10px] overflow-y-auto space-y-1.5 border border-gray-900"
            >
              {logs.map((l) => (
                <div key={l.id} className="leading-tight flex items-start gap-1.5">
                  <span className="text-gray-600 shrink-0">{l.time}</span>
                  <span className={`font-bold shrink-0 ${l.color}`}>{l.tag}</span>
                  <span className="text-gray-300">{l.message}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-gray-700 text-blue-600 focus:ring-0"
                />
                <span>Auto scroll</span>
              </label>
              <span className="text-emerald-400 font-bold">● Active Stream</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SPAWN BOT MODAL ── */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleSpawnSubmit}
            className="bg-[#0B111E] border border-gray-800 rounded-2xl p-6 max-w-md w-full text-xs space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Spawn Autonomous Quant Bot</h3>
                  <p className="text-[10px] text-gray-400">Deploy 24/7 AI multi-agent cloud strategy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSpawnModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-bold">Strategy Core</label>
              <select
                value={spawnStrategy}
                onChange={(e) => setSpawnStrategy(e.target.value)}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="AI Quant Core Strategy">AI Quant Core Strategy (8 Specialists + LLM)</option>
                <option value="Momentum Sweep Strategy">Momentum Sweep (EMA Cross + VWAP Breakout)</option>
                <option value="Liquidity Fade Strategy">Liquidity Fade (Order Book Imbalance)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1 font-bold">Pair</label>
                <select
                  value={spawnSymbol}
                  onChange={(e) => setSpawnSymbol(e.target.value as SymbolId)}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {symbols.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-bold">Capital ($)</label>
                <input
                  type="number"
                  value={spawnCapital}
                  onChange={(e) => setSpawnCapital(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSpawnModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black shadow-lg shadow-cyan-500/20"
              >
                Deploy Bot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── AGENT BREAKDOWN MODAL ── */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl p-5 max-w-lg w-full text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm">8-Specialist Agent Consensus Breakdown</h3>
              <button
                onClick={() => setShowAgentModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {specialistAgents.map((ag, idx) => (
                <div key={idx} className="bg-[#080E1A] p-2.5 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{ag.name}</div>
                    <div className="text-[10px] text-gray-400">Confidence: {ag.conf}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase border ${
                    ag.bias === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : ag.bias === 'BEARISH'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`}>
                    {ag.bias}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAgentModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
