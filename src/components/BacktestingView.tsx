'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Rocket,
  CheckCircle2,
  ChevronDown,
  X,
  Play,
  RotateCcw,
  Download,
  Share2,
  Sliders,
  TrendingUp,
  History,
  GitCompare,
  FastForward,
  Dice5,
  Database,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Check,
  RefreshCw,
} from 'lucide-react';
import { BacktestingSidebar, BacktestNavId } from '@/components/backtesting/BacktestingSidebar';
import { MarketSnapshot } from '@/types/trading';

interface BacktestingViewProps {
  snapshot?: MarketSnapshot | null;
}

export const BacktestingView: React.FC<BacktestingViewProps> = ({ snapshot }) => {
  const [activeSection, setActiveSection] = useState<BacktestNavId>('overview');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'TRADES' | 'SUMMARY' | 'RISK' | 'MONTE_CARLO' | 'WALK_FORWARD' | 'PARAMETER'>('TRADES');
  const [timeRange, setTimeRange] = useState<'1D' | '7D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'>('ALL');
  const [copiedShare, setCopiedShare] = useState(false);
  const [showFullSettingsModal, setShowFullSettingsModal] = useState(false);

  // ── New Backtest Configuration Form State ────────────────────────────────────
  const [strategyVersion, setStrategyVersion] = useState('AI Quant Core v3');
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2025-05-24');
  const [initialCapital, setInitialCapital] = useState('100,000');
  const [feeRate, setFeeRate] = useState('0.05');
  const [slippageModel, setSlippageModel] = useState('Realistic');
  const [riskPerTrade, setRiskPerTrade] = useState('0.50');
  const [takeProfitR, setTakeProfitR] = useState('2.5');
  const [stopLossR, setStopLossR] = useState('1.0');
  const [maxConcurrentTrades, setMaxConcurrentTrades] = useState('5');
  const [leverage, setLeverage] = useState('1x');

  // Simulation Runner State
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  // ── Overview Performance Metrics (Matching backtest page.png) ───────────────
  const totalReturnPercent = 28.45;
  const netProfitDollars = 28452.31;
  const cagr = 24.31;
  const sharpeRatio = 2.14;
  const sortinoRatio = 3.42;
  const maxDrawdown = -7.21;
  const winRate = 62.38;
  const profitFactor = 2.38;
  const expectancy = '0.87R';
  const totalTradesCount = 186;
  const winningTradesCount = 116;
  const losingTradesCount = 70;
  const avgHoldTime = '13h 42m';

  // ── Equity & Drawdown Curve Data ─────────────────────────────────────────────
  const equityPoints = useMemo(() => {
    return [
      { date: 'Jan 24', strategy: 100000, buyHold: 100000, dd: 0 },
      { date: 'Feb 24', strategy: 104200, buyHold: 102500, dd: -1.2 },
      { date: 'Mar 24', strategy: 108900, buyHold: 106800, dd: -0.8 },
      { date: 'Apr 24', strategy: 107600, buyHold: 101200, dd: -3.4 },
      { date: 'May 24', strategy: 111400, buyHold: 104500, dd: -1.5 },
      { date: 'Jun 24', strategy: 116800, buyHold: 108200, dd: -2.1 },
      { date: 'Jul 24', strategy: 115200, buyHold: 106000, dd: -4.8 },
      { date: 'Aug 24', strategy: 119500, buyHold: 109400, dd: -1.8 },
      { date: 'Sep 24', strategy: 122100, buyHold: 107800, dd: -2.9 },
      { date: 'Oct 24', strategy: 120400, buyHold: 105200, dd: -7.21 },
      { date: 'Nov 24', strategy: 124800, buyHold: 109100, dd: -1.4 },
      { date: 'Dec 24', strategy: 126900, buyHold: 111400, dd: -0.9 },
      { date: 'Jan 25', strategy: 125100, buyHold: 108900, dd: -3.1 },
      { date: 'Feb 25', strategy: 128452.31, buyHold: 112374.21, dd: -1.1 },
    ];
  }, []);

  // ── Trades List Data ─────────────────────────────────────────────────────────
  const tradesData = [
    { time: '2025-05-24 09:00', dir: 'LONG', entry: 64250.10, exit: 65812.40, size: '0.023 BTC', pnlUsd: '+$1,562.30', pnlR: '+2.31R', duration: '12h 15m', reason: 'Take Profit', isWin: true },
    { time: '2025-05-23 21:00', dir: 'SHORT', entry: 67120.50, exit: 66210.20, size: '0.018 BTC', pnlUsd: '+$910.30', pnlR: '+1.62R', duration: '8h 05m', reason: 'Take Profit', isWin: true },
    { time: '2025-05-23 13:00', dir: 'LONG', entry: 64880.30, exit: 63950.10, size: '0.021 BTC', pnlUsd: '-$930.20', pnlR: '-1.05R', duration: '6h 42m', reason: 'Stop Loss', isWin: false },
    { time: '2025-05-23 02:00', dir: 'LONG', entry: 63210.40, exit: 64820.70, size: '0.020 BTC', pnlUsd: '+$1,610.30', pnlR: '+2.12R', duration: '20h 35m', reason: 'Take Profit', isWin: true },
    { time: '2025-05-22 15:00', dir: 'SHORT', entry: 66130.00, exit: 65210.00, size: '0.017 BTC', pnlUsd: '+$919.80', pnlR: '+1.41R', duration: '10h 12m', reason: 'Take Profit', isWin: true },
    { time: '2025-05-22 04:00', dir: 'LONG', entry: 61980.20, exit: 61350.10, size: '0.019 BTC', pnlUsd: '-$630.10', pnlR: '-0.83R', duration: '7h 18m', reason: 'Stop Loss', isWin: false },
  ];

  // ── Monthly Returns Matrix Data ─────────────────────────────────────────────
  const monthlyMatrix = [
    { year: '2024', m: [2.31, 4.25, -1.12, 3.86, 6.42, 2.11, 4.75, -0.81, 2.94, 5.21, 3.12, 6.21], total: '+41.25%' },
    { year: '2025', m: [2.48, 3.74, 4.21, 5.83, 5.24, null, null, null, null, null, null, null], total: '+21.96%' },
  ];

  // ── Profit Distribution (R) Histogram Data ──────────────────────────────────
  const rDistribution = [
    { label: '-3R', count: 4, isLoss: true },
    { label: '-2R', count: 12, isLoss: true },
    { label: '-1R', count: 54, isLoss: true },
    { label: '0', count: 18, isLoss: false },
    { label: '1R', count: 32, isLoss: false },
    { label: '2R', count: 48, isLoss: false },
    { label: '3R+', count: 18, isLoss: false },
  ];

  // Handle Interactive Backtest Execution
  const handleRunSimulation = () => {
    setIsRunning(true);
    setProgress(0);

    const steps = [
      'Ingesting historical tick & order book data from Binance Futures...',
      'Computing multi-timeframe EMA, RSI, VWAP & Volatility features...',
      'Evaluating 8 specialist agents & multi-agent consensus fusion...',
      'Simulating deterministic risk engine & position sizing gates...',
      'Simulating market fills with 0.05% fees & realistic slippage...',
      'Synthesizing Monte Carlo variance & Sharpe optimization metrics...',
      'Finalizing backtesting performance report...',
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < steps.length) {
        setCurrentStep(steps[currentIdx]);
        setProgress(Math.round(((currentIdx + 1) / steps.length) * 100));
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setActiveSection('overview');
      }
    }, 500);
  };

  // Handle Export Report JSON/CSV
  const handleExportReport = () => {
    const report = {
      strategy: strategyVersion,
      market: selectedAsset,
      timeframe,
      period: `${startDate} to ${endDate}`,
      metrics: {
        totalReturn: `+${totalReturnPercent}%`,
        netProfit: `$${netProfitDollars}`,
        sharpeRatio,
        sortinoRatio,
        maxDrawdown: `${maxDrawdown}%`,
        winRate: `${winRate}%`,
        profitFactor,
      },
      trades: tradesData,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-report-${selectedAsset}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Share Report Link
  const handleShare = () => {
    setCopiedShare(true);
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
    }
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)] text-white">
      {/* ── LEFT SUB-SIDEBAR (Mobile swipeable pill rail + desktop sidebar) ── */}
      <BacktestingSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onSelectTemplate={(tmpl) => {
          setStrategyVersion(tmpl);
          handleRunSimulation();
        }}
        onOpenGuide={(g) => alert(`Opening ${g.replace('_', ' ').toUpperCase()}...`)}
      />

      {/* ── MAIN BACKTESTING WORKSPACE ── */}
      <div className="flex-1 space-y-4 min-w-0 pb-8">
        {/* ── TOP HEADER & PRIMARY ACTIONS ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080E1A] p-3 rounded-2xl border border-[#1E293B]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeSection === 'overview'
                ? 'Backtesting Overview'
                : activeSection === 'new_backtest'
                ? 'New Backtest Simulation Cockpit'
                : activeSection === 'history'
                ? 'Backtest History & Replay Archive'
                : activeSection === 'comparison'
                ? 'Multi-Strategy Benchmark Comparison'
                : activeSection === 'walk_forward'
                ? 'Walk-Forward Optimization (WFO)'
                : activeSection === 'monte_carlo'
                ? 'Monte Carlo Simulation Engine'
                : activeSection === 'parameter_sweep'
                ? 'Parameter Grid & Sensitivity Surface'
                : 'Historical Data Manager'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Simulate your quantitative strategy over historical tick data and evaluate risk-adjusted performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportReport}
              className="px-3 py-2 bg-[#0B111E] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span>Export Report</span>
            </button>

            <button
              onClick={handleShare}
              className="px-3 py-2 bg-[#0B111E] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all shadow-sm"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-gray-400" />}
              <span>{copiedShare ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={() => {
                if (activeSection === 'new_backtest') handleRunSimulation();
                else setActiveSection('new_backtest');
              }}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Rocket className={`w-3.5 h-3.5 ${isRunning ? 'animate-bounce' : ''}`} />
              <span>{isRunning ? 'Simulating...' : 'Run Backtest'}</span>
            </button>
          </div>
        </div>

        {/* ── TOP METADATA SUMMARY BAR (Matching backtest page.png) ── */}
        <div className="bg-[#0B111E] p-3 rounded-2xl border border-[#1E293B] shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">STRATEGY</div>
              <div className="font-black text-white truncate mt-0.5">{strategyVersion}</div>
              <div className="text-[10px] text-gray-400">AI Quant Core Strategy</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">MARKET</div>
              <div className="font-mono font-bold text-cyan-400 mt-0.5">{selectedAsset}</div>
              <div className="text-[10px] text-gray-400">Binance Futures</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">TIMEFRAME</div>
              <div className="font-mono font-bold text-white mt-0.5">{timeframe}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">PERIOD</div>
              <div className="font-mono text-gray-300 text-[11px] mt-0.5">{startDate} to {endDate}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">INITIAL CAPITAL</div>
              <div className="font-mono font-bold text-white mt-0.5">${initialCapital}.00</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">FEES & SLIPPAGE</div>
              <div className="font-mono text-gray-300 mt-0.5">{feeRate}% · {slippageModel}</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">STATUS</div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Completed <span className="text-gray-500 text-[10px] font-normal">2m 34s</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            OVERVIEW MAIN VIEW (Matching backtest page.png)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
            {/* ═════════════════════════════════════════════════════════════════
                LEFT COLUMN (~24% / xl:col-span-3): BACKTEST CONFIGURATION
                ═════════════════════════════════════════════════════════════════ */}
            <div className="xl:col-span-3 space-y-3">
              <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-gray-800/80">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Backtest Configuration</span>
                  <button
                    onClick={() => setActiveSection('new_backtest')}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                  >
                    Modify
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Strategy</span>
                    <span className="font-bold text-white">{strategyVersion}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Description</span>
                    <p className="text-gray-300 text-[11px] leading-relaxed">Multi-agent AI fusion strategy with risk-managed execution</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800/60">
                    <div>
                      <span className="text-gray-500 text-[10px] block">Data Source</span>
                      <span className="text-gray-300 font-medium">Binance Futures</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Data Type</span>
                      <span className="text-gray-300 font-medium">Futures</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Timeframe</span>
                      <span className="text-gray-300 font-medium">1 Hour</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] block">Leverage</span>
                      <span className="text-cyan-400 font-mono font-bold">1x</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-gray-800/60 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Start Date</span>
                      <span className="text-gray-300">{startDate} 00:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">End Date</span>
                      <span className="text-gray-300">{endDate} 23:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Initial Capital</span>
                      <span className="text-white font-bold">${initialCapital}.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Position Sizing</span>
                      <span className="text-gray-300">Risk % of Equity</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Risk Per Trade</span>
                      <span className="text-emerald-400 font-bold">{riskPerTrade}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Max Concurrent</span>
                      <span className="text-white">{maxConcurrentTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Fees</span>
                      <span className="text-gray-300">{feeRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Slippage Model</span>
                      <span className="text-gray-300">{slippageModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Take Profit</span>
                      <span className="text-emerald-400 font-bold">{takeProfitR}R</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Stop Loss</span>
                      <span className="text-rose-400 font-bold">{stopLossR}R</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowFullSettingsModal(true)}
                    className="w-full mt-2 py-1.5 rounded-xl bg-[#080E1A] hover:bg-gray-800 text-cyan-300 text-xs font-bold border border-gray-800 transition-colors"
                  >
                    View Full Settings
                  </button>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                CENTER COLUMN (~48% / xl:col-span-6): CHARTS & INNER TABS
                ═════════════════════════════════════════════════════════════════ */}
            <div className="xl:col-span-6 space-y-3 min-w-0">
              {/* Dual SVG Equity Curve & Underwater Drawdown Chart */}
              <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Equity Curve</span>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="text-gray-300">Strategy</span>
                        <span className="font-mono font-bold text-white">$128,452.31</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                        <span className="text-gray-400">Buy & Hold</span>
                        <span className="font-mono text-gray-300">$112,374.21</span>
                      </div>
                    </div>
                  </div>

                  {/* Time Range Pills */}
                  <div className="flex items-center gap-1 bg-[#080E1A] p-1 rounded-xl border border-gray-800 text-[11px] font-bold">
                    {(['1D', '7D', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-2 py-0.5 rounded-lg transition-all ${
                          timeRange === r ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Equity Line Chart */}
                <div className="h-56 w-full relative">
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    <line x1="0" y1="40" x2="500" y2="40" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#1E293B" strokeDasharray="3 3" />
                    <line x1="0" y1="140" x2="500" y2="140" stroke="#1E293B" strokeDasharray="3 3" />

                    {/* Benchmark Buy & Hold Line (Gray Dashed) */}
                    <path
                      d="M 0 170 Q 120 150, 250 140 T 500 110"
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />

                    {/* Strategy Equity Growth Line (Cyan Glow) */}
                    <path
                      d="M 0 170 Q 100 120, 200 100 T 350 60 T 500 30"
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2.5"
                    />

                    {/* Gradient Fill under Strategy Line */}
                    <defs>
                      <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 170 Q 100 120, 200 100 T 350 60 T 500 30 L 500 200 L 0 200 Z"
                      fill="url(#equityGrad)"
                    />
                  </svg>

                  {/* Y-Axis Value Indicators */}
                  <div className="absolute left-1 top-2 text-[9px] font-mono text-gray-500">$140K</div>
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-500">$100K</div>
                  <div className="absolute left-1 bottom-1 text-[9px] font-mono text-gray-500">$70K</div>
                </div>

                {/* Underwater Drawdown Area Chart */}
                <div className="pt-2 border-t border-gray-800/80">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Drawdown: <span className="text-rose-400 font-mono font-bold">-7.21% Max</span>
                    </span>
                    <span className="font-mono">0% to -20%</span>
                  </div>

                  <div className="h-16 w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 60" preserveAspectRatio="none">
                      <line x1="0" y1="5" x2="500" y2="5" stroke="#334155" />
                      <defs>
                        <linearGradient id="ddGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 5 Q 80 18, 140 8 T 240 22 T 340 48 T 420 12 T 500 5 L 500 5 Z"
                        fill="url(#ddGrad)"
                        stroke="#EF4444"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 6-Tab Inner Workspace (Trades, Summary, Risk, Monte Carlo, Walk Forward, Parameter) */}
              <div className="bg-[#0B111E] rounded-2xl border border-[#1E293B] overflow-hidden shadow-md">
                <div className="flex items-center gap-2 px-3 pt-3 border-b border-gray-800 text-xs font-bold overflow-x-auto custom-scrollbar">
                  {[
                    { id: 'TRADES' as const, label: 'Trades' },
                    { id: 'SUMMARY' as const, label: 'Summary' },
                    { id: 'RISK' as const, label: 'Risk Analysis' },
                    { id: 'MONTE_CARLO' as const, label: 'Monte Carlo' },
                    { id: 'WALK_FORWARD' as const, label: 'Walk Forward' },
                    { id: 'PARAMETER' as const, label: 'Parameter Analysis' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveWorkspaceTab(id)}
                      className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-all ${
                        activeWorkspaceTab === id
                          ? 'border-cyan-400 text-cyan-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab Content: TRADES */}
                {activeWorkspaceTab === 'TRADES' && (
                  <div className="p-3 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                            <th className="pb-2 font-bold font-sans">Time</th>
                            <th className="pb-2 font-bold font-sans">Direction</th>
                            <th className="pb-2 font-bold font-sans">Entry</th>
                            <th className="pb-2 font-bold font-sans">Exit</th>
                            <th className="pb-2 font-bold font-sans">Size</th>
                            <th className="pb-2 font-bold font-sans">P&L (USD)</th>
                            <th className="pb-2 font-bold font-sans">P&L (R)</th>
                            <th className="pb-2 font-bold font-sans">Duration</th>
                            <th className="pb-2 font-bold font-sans">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {tradesData.map((t, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/20">
                              <td className="py-2.5 text-gray-400 text-[11px]">{t.time}</td>
                              <td className={`py-2.5 font-bold ${t.dir === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.dir}
                              </td>
                              <td className="py-2.5 text-gray-300">${t.entry.toFixed(2)}</td>
                              <td className="py-2.5 text-white font-bold">${t.exit.toFixed(2)}</td>
                              <td className="py-2.5 text-gray-300">{t.size}</td>
                              <td className={`py-2.5 font-bold ${t.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.pnlUsd}
                              </td>
                              <td className={`py-2.5 font-bold ${t.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.pnlR}
                              </td>
                              <td className="py-2.5 text-gray-400">{t.duration}</td>
                              <td className="py-2.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                                  t.isWin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {t.reason}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-center pt-1 border-t border-gray-800/60">
                      <button
                        onClick={() => alert('All 186 trades loaded in memory.')}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                      >
                        View All Trades (186 Executions)
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Content: SUMMARY */}
                {activeWorkspaceTab === 'SUMMARY' && (
                  <div className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Total Gross Profit</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">+$42,180.50</span>
                      </div>
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Total Gross Loss</span>
                        <span className="text-sm font-bold text-rose-400 font-mono">-$13,728.19</span>
                      </div>
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Profit Factor</span>
                        <span className="text-sm font-bold text-white font-mono">2.38</span>
                      </div>
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Total Commission Fees</span>
                        <span className="text-sm font-bold text-gray-300 font-mono">$482.15</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: RISK ANALYSIS */}
                {activeWorkspaceTab === 'RISK' && (
                  <div className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Value at Risk (95% VaR)</span>
                        <span className="text-sm font-bold text-rose-400">-$1,840.00 / day</span>
                      </div>
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Conditional VaR (CVaR)</span>
                        <span className="text-sm font-bold text-rose-400">-$2,410.00</span>
                      </div>
                      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">Recovery Factor</span>
                        <span className="text-sm font-bold text-emerald-400">3.95</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: MONTE CARLO */}
                {activeWorkspaceTab === 'MONTE_CARLO' && (
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                      <span className="font-bold text-white">Monte Carlo Probability Preview (1,000 Iterations)</span>
                      <span className="text-emerald-400 font-bold">Ruin Risk: &lt;0.01%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center font-mono">
                      <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">5th Percentile Return</span>
                        <span className="text-xs font-bold text-amber-400">+14.2%</span>
                      </div>
                      <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">50th (Median) Return</span>
                        <span className="text-xs font-bold text-emerald-400">+28.5%</span>
                      </div>
                      <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-500 font-sans block">95th Percentile Return</span>
                        <span className="text-xs font-bold text-cyan-400">+46.8%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content: WALK FORWARD */}
                {activeWorkspaceTab === 'WALK_FORWARD' && (
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1">
                      <span className="font-bold text-white">Walk-Forward Efficiency Ratio (WFE)</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">84.2% (Robust)</span>
                    </div>
                    <p className="text-gray-400 text-[11px]">In-Sample training to Out-Of-Sample forward testing degradation is minimal, proving strong real-world predictive generalization.</p>
                  </div>
                )}

                {/* Tab Content: PARAMETER ANALYSIS */}
                {activeWorkspaceTab === 'PARAMETER' && (
                  <div className="p-4 space-y-2 text-xs">
                    <span className="font-bold text-white block">Parameter Sensitivity Plateau</span>
                    <p className="text-gray-400 text-[11px]">Strategy displays a wide parameter plateau with positive Sharpe across Fast EMA 8-24 and Slow EMA 40-100 ranges.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                RIGHT COLUMN (~28% / xl:col-span-3): PERFORMANCE KPIS & HEATMAPS
                ═════════════════════════════════════════════════════════════════ */}
            <div className="xl:col-span-3 space-y-3">
              {/* Performance Summary 8 KPI Cards */}
              <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-gray-800/80">
                  Performance Summary
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">TOTAL RETURN</span>
                    <span className="text-sm font-black text-emerald-400">+{totalReturnPercent}%</span>
                    <span className="text-[10px] text-emerald-400/80 block mt-0.5">+${netProfitDollars.toLocaleString()}</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">CAGR</span>
                    <span className="text-sm font-black text-white">{cagr}%</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">SHARPE RATIO</span>
                    <span className="text-sm font-black text-white">{sharpeRatio}</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">SORTINO RATIO</span>
                    <span className="text-sm font-black text-white">{sortinoRatio}</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">MAX DRAWDOWN</span>
                    <span className="text-sm font-black text-rose-400">{maxDrawdown}%</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">WIN RATE</span>
                    <span className="text-sm font-black text-white">{winRate}%</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">PROFIT FACTOR</span>
                    <span className="text-sm font-black text-white">{profitFactor}</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">EXPECTANCY</span>
                    <span className="text-sm font-black text-white">{expectancy}</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">TOTAL TRADES</span>
                    <span className="text-sm font-black text-white">{totalTradesCount}</span>
                  </div>

                  <div className="p-2.5 bg-[#080E1A] rounded-xl border border-gray-800/80">
                    <span className="text-[9px] uppercase font-sans font-bold text-gray-500 block">WIN / LOSS</span>
                    <span className="text-sm font-black text-emerald-400">{winningTradesCount} <span className="text-gray-500">/</span> <span className="text-rose-400">{losingTradesCount}</span></span>
                  </div>
                </div>
              </div>

              {/* Monthly Returns Heatmap Matrix */}
              <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] space-y-2 shadow-md">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white uppercase tracking-wider text-[11px]">Monthly Returns (%)</span>
                  <span className="text-gray-500 text-[10px]">Heatmap</span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-center text-[10px] font-mono">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="pb-1 text-left font-sans">Yr</th>
                        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
                          <th key={i} className="pb-1">{m}</th>
                        ))}
                        <th className="pb-1 font-bold text-right font-sans">Tot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {monthlyMatrix.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 text-left text-gray-400 font-sans font-bold">{row.year}</td>
                          {row.m.map((val, mIdx) => (
                            <td key={mIdx} className="py-1.5">
                              {val !== null ? (
                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                  val >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                                }`}>
                                  {val > 0 ? `+${val}` : val}
                                </span>
                              ) : (
                                <span className="text-gray-700">—</span>
                              )}
                            </td>
                          ))}
                          <td className="py-1.5 text-right font-bold text-emerald-400">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Trade Distribution Donut & Profit Distribution R Histogram */}
              <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-gray-800/80">
                  Trade Distribution
                </div>

                <div className="flex items-center justify-between gap-3">
                  {/* Mini Donut */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" stroke="#1E293B" strokeWidth="6" fill="none" />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        stroke="#06B6D4"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={(2 * Math.PI * 26) * (1 - 0.613)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white font-mono">61%</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-gray-300">Long Trades</span>
                      <span className="font-mono font-bold text-white">61.3% (114)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-300">Short Trades</span>
                      <span className="font-mono font-bold text-white">38.7% (72)</span>
                    </div>
                  </div>
                </div>

                {/* Profit Distribution (R) Histogram */}
                <div className="pt-2 border-t border-gray-800/60">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Profit Distribution (R)</div>
                  <div className="flex items-end justify-between h-14 gap-1 px-1">
                    {rDistribution.map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          style={{ height: `${(item.count / 54) * 100}%` }}
                          className={`w-full rounded-t-sm transition-all ${
                            item.isLoss ? 'bg-rose-500/80 hover:bg-rose-400' : 'bg-emerald-500/80 hover:bg-emerald-400'
                          }`}
                          title={`${item.label}: ${item.count} trades`}
                        />
                        <span className="text-[8px] font-mono text-gray-500">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Equity Statistics & Market Regime */}
              <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-gray-800/80">
                  Equity Statistics
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Best Day</span>
                    <span className="text-emerald-400 font-bold">+$3,245.21</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Worst Day</span>
                    <span className="text-rose-400 font-bold">-$2,152.34</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Best Trade</span>
                    <span className="text-emerald-400 font-bold">+$2,850.12 (2.31R)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Worst Trade</span>
                    <span className="text-rose-400 font-bold">-$1,210.45 (-1.05R)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Avg Win</span>
                    <span className="text-emerald-400 font-bold">+$615.23 (1.24R)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-sans">Avg Loss</span>
                    <span className="text-rose-400 font-bold">-$412.18 (-0.83R)</span>
                  </div>
                </div>

                {/* Market Regime Performance */}
                <div className="pt-2 border-t border-gray-800/60">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Market Regime Performance</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Trending Up</span>
                      <div className="text-right font-mono">
                        <span className="text-emerald-400 font-bold">+32.45%</span>
                        <span className="text-gray-500 text-[10px] ml-1.5">64.2% WR (98)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Trending Down</span>
                      <div className="text-right font-mono">
                        <span className="text-emerald-400 font-bold">+12.81%</span>
                        <span className="text-gray-500 text-[10px] ml-1.5">58.3% WR (42)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Sideways / Range</span>
                      <div className="text-right font-mono">
                        <span className="text-cyan-400 font-bold">+8.73%</span>
                        <span className="text-gray-500 text-[10px] ml-1.5">54.1% WR (46)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: NEW BACKTEST SIMULATION BUILDER
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'new_backtest' && (
          <div className="bg-[#0B111E] p-6 rounded-2xl border border-[#1E293B] space-y-6 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white">Configure New Strategy Backtest</h3>
              <p className="text-xs text-gray-400 mt-0.5">Define multi-asset test parameters, exchange fees, slippage models, and risk rules.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Strategy Blueprint</label>
                <select
                  value={strategyVersion}
                  onChange={(e) => setStrategyVersion(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="AI Quant Core v3">AI Quant Core v3 (Multi-Agent Fusion)</option>
                  <option value="Momentum Strategy">Momentum Strategy (EMA / RSI Breakout)</option>
                  <option value="Mean Reversion">Mean Reversion (Bollinger Rebounds)</option>
                  <option value="Liquidity Sweep">Liquidity Sweep (Order Book Imbalance)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Target Market Pair</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-cyan-400 font-mono font-bold"
                >
                  <option value="BTCUSDT">BTCUSDT (Binance Futures)</option>
                  <option value="ETHUSDT">ETHUSDT (Binance Futures)</option>
                  <option value="SOLUSDT">SOLUSDT (Binance Futures)</option>
                  <option value="XRPUSDT">XRPUSDT (Binance Futures)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Candle Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="1m">1 Minute (Ultra High Frequency)</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour (Standard Swing)</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Initial Starting Capital ($)</label>
                <input
                  type="text"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Risk Per Trade (%)</label>
                <input
                  type="text"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-emerald-400 font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Take Profit (R-Multiple)</label>
                <input
                  type="text"
                  value={takeProfitR}
                  onChange={(e) => setTakeProfitR(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-emerald-400 font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-300 block">Stop Loss (R-Multiple)</label>
                <input
                  type="text"
                  value={stopLossR}
                  onChange={(e) => setStopLossR(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-rose-400 font-mono font-bold"
                />
              </div>
            </div>

            {/* Simulation Progress Bar */}
            {isRunning && (
              <div className="p-4 bg-[#080E1A] rounded-xl border border-cyan-500/40 space-y-2 animate-pulse">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {currentStep}
                  </span>
                  <span className="font-mono font-black text-white">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                onClick={() => setActiveSection('overview')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunSimulation}
                disabled={isRunning}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                <span>{isRunning ? 'Running Simulation...' : '🚀 Run Full Simulation'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: BACKTEST HISTORY ARCHIVE
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'history' && (
          <div className="bg-[#0B111E] p-5 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Backtest Simulation History Archive</h3>
                <p className="text-xs text-gray-400">Review, compare, and replay past strategy evaluation runs.</p>
              </div>
              <button
                onClick={() => setActiveSection('new_backtest')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
              >
                + New Run
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                    <th className="pb-2 font-bold font-sans">Run ID</th>
                    <th className="pb-2 font-bold font-sans">Strategy</th>
                    <th className="pb-2 font-bold font-sans">Market</th>
                    <th className="pb-2 font-bold font-sans">Period</th>
                    <th className="pb-2 font-bold font-sans">Net Return</th>
                    <th className="pb-2 font-bold font-sans">Sharpe</th>
                    <th className="pb-2 font-bold font-sans">Max DD</th>
                    <th className="pb-2 font-bold font-sans text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {[
                    { id: 'BT-20250524-1432', strat: 'AI Quant Core v3', sym: 'BTCUSDT', period: '2024-01 to 2025-05', ret: '+28.45%', sharpe: 2.14, dd: '-7.21%' },
                    { id: 'BT-20250522-0915', strat: 'Momentum Sweep', sym: 'SOLUSDT', period: '2024-06 to 2025-05', ret: '+42.18%', sharpe: 2.38, dd: '-11.4%' },
                    { id: 'BT-20250520-1840', strat: 'Mean Reversion', sym: 'ETHUSDT', period: '2024-01 to 2025-05', ret: '+18.90%', sharpe: 1.82, dd: '-6.50%' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-800/20">
                      <td className="py-3 text-cyan-400 font-bold">{row.id}</td>
                      <td className="py-3 font-sans font-bold text-white">{row.strat}</td>
                      <td className="py-3 text-cyan-300">{row.sym}</td>
                      <td className="py-3 text-gray-400">{row.period}</td>
                      <td className="py-3 font-bold text-emerald-400">{row.ret}</td>
                      <td className="py-3 text-white font-bold">{row.sharpe}</td>
                      <td className="py-3 text-rose-400">{row.dd}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setStrategyVersion(row.strat);
                            setSelectedAsset(row.sym);
                            setActiveSection('overview');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-cyan-300 hover:bg-blue-600/30 text-xs font-bold"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: RESULT COMPARISON
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'comparison' && (
          <div className="bg-[#0B111E] p-5 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white">Multi-Strategy Benchmark Comparison</h3>
              <p className="text-xs text-gray-400">Compare statistical risk metrics and alpha curves across active quantitative algorithms.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-[#080E1A] rounded-xl border border-cyan-500/30 space-y-2">
                <span className="text-xs font-black text-cyan-400 font-sans">AI Quant Core v3</span>
                <div className="space-y-1 pt-2 border-t border-gray-800">
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Return</span><span className="text-emerald-400 font-bold">+28.45%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Sharpe</span><span className="text-white font-bold">2.14</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Max DD</span><span className="text-rose-400">-7.21%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Win Rate</span><span className="text-white">62.38%</span></div>
                </div>
              </div>

              <div className="p-4 bg-[#080E1A] rounded-xl border border-blue-500/30 space-y-2">
                <span className="text-xs font-black text-blue-400 font-sans">Momentum Sweep</span>
                <div className="space-y-1 pt-2 border-t border-gray-800">
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Return</span><span className="text-emerald-400 font-bold">+42.18%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Sharpe</span><span className="text-white font-bold">2.38</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Max DD</span><span className="text-rose-400">-11.40%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Win Rate</span><span className="text-white">58.40%</span></div>
                </div>
              </div>

              <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-700 space-y-2">
                <span className="text-xs font-black text-gray-300 font-sans">Buy & Hold Benchmark</span>
                <div className="space-y-1 pt-2 border-t border-gray-800">
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Return</span><span className="text-gray-300 font-bold">+12.37%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Sharpe</span><span className="text-white font-bold">1.05</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Max DD</span><span className="text-rose-400">-24.80%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 font-sans">Volatility</span><span className="text-gray-300">38.4%</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: WALK FORWARD OPTIMIZATION
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'walk_forward' && (
          <div className="bg-[#0B111E] p-5 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white">Walk-Forward Optimization Matrix</h3>
              <p className="text-xs text-gray-400">Evaluate rolling out-of-sample forward trading performance to ensure zero overfitting.</p>
            </div>

            <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">Walk-Forward Efficiency (WFE)</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">84.2%</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-gray-900/60 rounded-lg">
                  <span className="text-gray-500 block text-[10px] font-sans">In-Sample Annual Return</span>
                  <span className="font-bold text-white">+33.80%</span>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-lg">
                  <span className="text-gray-500 block text-[10px] font-sans">Out-of-Sample Return</span>
                  <span className="font-bold text-emerald-400">+28.45%</span>
                </div>
                <div className="p-3 bg-gray-900/60 rounded-lg">
                  <span className="text-gray-500 block text-[10px] font-sans">Overfitting Risk</span>
                  <span className="font-bold text-emerald-400">LOW</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: MONTE CARLO SIMULATION
            ═════════════════════════════════════════════════════════════════ */}
        {activeSection === 'monte_carlo' && (
          <div className="bg-[#0B111E] p-5 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white">Monte Carlo Risk & Ruin Simulation</h3>
              <p className="text-xs text-gray-400">1,000 resampled equity curves testing worst-case trade sequence risks.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 font-sans block">Probability of Ruin</span>
                <span className="text-sm font-bold text-emerald-400">&lt; 0.01%</span>
              </div>
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 font-sans block">95% Confidence Max DD</span>
                <span className="text-sm font-bold text-rose-400">-9.40%</span>
              </div>
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 font-sans block">Median Expected Return</span>
                <span className="text-sm font-bold text-white">+28.50%</span>
              </div>
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-[10px] text-gray-500 font-sans block">Consecutive Losses Max</span>
                <span className="text-sm font-bold text-amber-400">4 Trades</span>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: PARAMETER SWEEP
            ═════════════════════════════════════════════════════════════════ */}
        {activeSection === 'parameter_sweep' && (
          <div className="bg-[#0B111E] p-5 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white">Parameter Sweep & Optimization Surface</h3>
              <p className="text-xs text-gray-400">2D heat matrix illustrating Sharpe Ratio stability across parameter clusters.</p>
            </div>

            <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-3">
              <div className="text-xs font-bold text-gray-300">Fast EMA (X-Axis) vs Slow EMA (Y-Axis) Sharpe Heatmap</div>
              <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
                {[
                  { label: 'EMA 8 / 50', sharpe: 1.84 },
                  { label: 'EMA 12 / 50', sharpe: 2.14 },
                  { label: 'EMA 16 / 50', sharpe: 2.08 },
                  { label: 'EMA 20 / 50', sharpe: 1.95 },
                  { label: 'EMA 24 / 50', sharpe: 1.72 },
                  { label: 'EMA 8 / 100', sharpe: 1.92 },
                  { label: 'EMA 12 / 100', sharpe: 2.21 },
                  { label: 'EMA 16 / 100', sharpe: 2.18 },
                  { label: 'EMA 20 / 100', sharpe: 2.05 },
                  { label: 'EMA 24 / 100', sharpe: 1.88 },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                    <span className="text-[9px] text-gray-400 block font-sans">{item.label}</span>
                    <span className="font-bold text-emerald-400">{item.sharpe}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: HISTORICAL DATA MANAGER
            ═════════════════════════════════════════════════════════════════ */}
        {activeSection === 'data_manager' && (
          <div className="bg-[#0B111E] p-5 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div>
              <h3 className="text-base font-bold text-white">Historical Market Data Storage</h3>
              <p className="text-xs text-gray-400">Download, audit, and manage locally cached Binance and Alpaca OHLCV candles.</p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { sym: 'BTCUSDT Futures (1h)', bars: '12,450 Bars', status: 'Cached (100%)', range: '2024-01-01 to 2025-05-24' },
                { sym: 'ETHUSDT Futures (1h)', bars: '12,450 Bars', status: 'Cached (100%)', range: '2024-01-01 to 2025-05-24' },
                { sym: 'SOLUSDT Futures (1h)', bars: '12,450 Bars', status: 'Cached (100%)', range: '2024-01-01 to 2025-05-24' },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-[#080E1A] rounded-xl border border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white font-sans">{item.sym}</span>
                    <span className="text-[10px] text-gray-500 block">{item.range}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold">{item.status}</span>
                    <span className="text-[10px] text-gray-400 block">{item.bars}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FULL SETTINGS MODAL ── */}
      {showFullSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <span className="text-sm font-black text-white">Full Backtest Settings</span>
              <button onClick={() => setShowFullSettingsModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Strategy</span><span className="text-white font-bold">{strategyVersion}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Asset</span><span className="text-cyan-400 font-bold">{selectedAsset}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Timeframe</span><span className="text-white font-bold">{timeframe}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Initial Balance</span><span className="text-white font-bold">${initialCapital}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Risk / Trade</span><span className="text-emerald-400 font-bold">{riskPerTrade}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Take Profit Target</span><span className="text-emerald-400 font-bold">{takeProfitR}R</span></div>
              <div className="flex justify-between"><span className="text-gray-400 font-sans">Stop Loss Target</span><span className="text-rose-400 font-bold">{stopLossR}R</span></div>
            </div>
            <div className="flex justify-end pt-3 border-t border-gray-800">
              <button onClick={() => setShowFullSettingsModal(false)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
