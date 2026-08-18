'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Rocket,
  CheckCircle2,
  ChevronDown,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Sparkline } from '@/components/dashboard/Sparkline';

interface BacktestResults {
  totalReturn: number;
  netProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  equityCurve: number[];
  trades: {
    time: string;
    symbol: string;
    side: 'LONG' | 'SHORT';
    entry: number;
    exit: number;
    pnl: number;
    r: string;
    outcome: 'WIN' | 'LOSS';
  }[];
}

export const BacktestingView: React.FC = () => {
  // Form State
  const [strategyVersion, setStrategyVersion] = useState('Config_v3');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [assets, setAssets] = useState<string[]>(['BTCUSDT']);
  const [simulatedExchange, setSimulatedExchange] = useState('BINANCE');
  const [startingCapital, setStartingCapital] = useState('1,000,000');
  const [currency, setCurrency] = useState('USD');
  const [leverage, setLeverage] = useState('1x, 2x, 5x, 10x');
  const [positionRisk, setPositionRisk] = useState('0.5%, 1%, 2% per trade');
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState('5.0');
  const [tradingFee, setTradingFee] = useState('0.1');
  const [slippage, setSlippage] = useState('0.05');
  const [runParameterSweep, setRunParameterSweep] = useState(true);
  const [optimizationTarget, setOptimizationTarget] = useState('Sharpe Ratio, Net Profit, etc.');
  const [analyzeFactors, setAnalyzeFactors] = useState(false);
  const [newAssetInput, setNewAssetInput] = useState('');
  const [showAddAsset, setShowAddAsset] = useState(false);

  // Simulation State
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<BacktestResults | null>(null);

  const handleQuickRange = (range: '3m' | '6m' | 'ytd') => {
    const end = '2026-06-30';
    setEndDate(end);
    if (range === '3m') setStartDate('2026-04-01');
    else if (range === '6m') setStartDate('2026-01-01');
    else if (range === 'ytd') setStartDate('2026-01-01');
  };

  const handleAddAsset = () => {
    if (newAssetInput && !assets.includes(newAssetInput.toUpperCase())) {
      setAssets([...assets, newAssetInput.toUpperCase()]);
      setNewAssetInput('');
      setShowAddAsset(false);
    }
  };

  const handleRemoveAsset = (sym: string) => {
    if (assets.length > 1) {
      setAssets(assets.filter((a) => a !== sym));
    }
  };

  const handleRunBacktest = () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);

    const steps = [
      'Ingesting historical tick & order book data from BINANCE...',
      'Computing multi-timeframe EMA, RSI, VWAP & Volatility features...',
      'Evaluating 8 specialist agents & multi-agent consensus fusion...',
      'Simulating deterministic risk engine & position sizing gates...',
      'Simulating market fills with 0.1% fees & 0.05% slippage...',
      'Synthesizing Monte Carlo variance & Sharpe optimization metrics...',
      'Finalizing backtesting performance report...',
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      const currentProgress = Math.min(100, Math.round((currentIdx / steps.length) * 100));
      setProgress(currentProgress);
      setCurrentStep(steps[currentIdx - 1] || 'Finalizing...');

      if (currentIdx >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsRunning(false);
          setResults({
            totalReturn: 28.45,
            netProfit: 284510.4,
            sharpeRatio: 2.14,
            maxDrawdown: 4.12,
            winRate: 68.4,
            totalTrades: 142,
            profitFactor: 2.31,
            equityCurve: [1000000, 1045000, 1082000, 1061000, 1140000, 1189000, 1224000, 1284510],
            trades: [
              { time: '2026-06-28 14:22', symbol: 'BTCUSDT', side: 'LONG', entry: 62450.0, exit: 64120.0, pnl: 16700.0, r: '+2.41R', outcome: 'WIN' },
              { time: '2026-06-25 09:15', symbol: 'BTCUSDT', side: 'SHORT', entry: 64890.0, exit: 65420.0, pnl: -5300.0, r: '-0.82R', outcome: 'LOSS' },
              { time: '2026-06-21 18:40', symbol: 'BTCUSDT', side: 'LONG', entry: 59800.0, exit: 62900.0, pnl: 31000.0, r: '+3.15R', outcome: 'WIN' },
              { time: '2026-06-18 11:05', symbol: 'BTCUSDT', side: 'LONG', entry: 58200.0, exit: 60150.0, pnl: 19500.0, r: '+1.92R', outcome: 'WIN' },
            ],
          });
        }, 600);
      }
    }, 450);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Configure & Run Backtesting Analysis <span className="text-base">🧠⚙️</span>
        </h2>
        <p className="text-xs text-gray-400">
          Strategy: <span className="text-cyan-400 font-semibold">QUANTARION BTCUSDT ({strategyVersion})</span>
        </p>
      </div>

      {/* ── 3-COLUMN CONFIGURATION GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* 1. Simulation Parameters (col 1-4) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between space-y-3">
          <div className="text-xs font-bold text-white tracking-wide uppercase">Simulation Parameters</div>

          {/* Strategy Version */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Strategy Version</label>
            <div className="relative">
              <select
                value={strategyVersion}
                onChange={(e) => setStrategyVersion(e.target.value)}
                className="w-full appearance-none bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Config_v3">Config_v3</option>
                <option value="Config_v2">Config_v2</option>
                <option value="Config_v1">Config_v1</option>
                <option value="Custom">Custom Strategy Configuration</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Historical Period */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-gray-400">Historical Period</label>
              <div className="flex gap-2 text-[10px] text-cyan-400 font-medium">
                <button onClick={() => handleQuickRange('3m')} className="hover:underline">Last 3 Months</button>
                <button onClick={() => handleQuickRange('6m')} className="hover:underline">Last 6 Months</button>
                <button onClick={() => handleQuickRange('ytd')} className="hover:underline">Year-to-Date</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 block mb-0.5">Start Date</span>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 block mb-0.5">End Date</span>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Asset(s) to Test */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Asset(s) to Test</label>
            <div className="flex flex-wrap items-center gap-2">
              {assets.map((sym) => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 text-cyan-300 text-xs font-bold border border-blue-500/30"
                >
                  {sym}
                  {assets.length > 1 && (
                    <button onClick={() => handleRemoveAsset(sym)} className="hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}

              {showAddAsset ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="e.g. ETHUSDT"
                    value={newAssetInput}
                    onChange={(e) => setNewAssetInput(e.target.value)}
                    className="w-24 bg-[#080E1A] border border-gray-700 text-xs text-white rounded px-2 py-1 focus:outline-none"
                  />
                  <button onClick={handleAddAsset} className="px-2 py-1 bg-cyan-600 text-white rounded text-xs font-bold">
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddAsset(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#080E1A] hover:bg-gray-800 text-gray-300 text-xs font-semibold border border-gray-800 transition-colors"
                >
                  <Plus className="w-3 h-3 text-cyan-400" /> Add Asset
                </button>
              )}
            </div>
          </div>

          {/* Simulated Exchange */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Simulated Exchange</label>
            <div className="relative">
              <select
                value={simulatedExchange}
                onChange={(e) => setSimulatedExchange(e.target.value)}
                className="w-full appearance-none bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="BINANCE">BINANCE</option>
                <option value="BYBIT">BYBIT</option>
                <option value="OKX">OKX</option>
                <option value="ALPACA">ALPACA</option>
                <option value="COINBASE">COINBASE</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 2. Capital & Risk Configuration (col 5-8) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between space-y-3">
          <div className="text-xs font-bold text-white tracking-wide uppercase">Capital & Risk Configuration</div>

          {/* Starting Capital */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Starting Capital</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-gray-400 text-xs">$</span>
                <input
                  type="text"
                  value={startingCapital}
                  onChange={(e) => setStartingCapital(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-800 text-xs text-white font-mono font-bold rounded-lg pl-6 pr-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-[#080E1A] border border-gray-800 text-xs text-gray-300 rounded-lg px-2 py-2 focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Leverage */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Leverage</label>
            <div className="relative">
              <select
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-full appearance-none bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="1x, 2x, 5x, 10x">1x, 2x, 5x, 10x</option>
                <option value="1x (Spot Only)">1x (Spot Only)</option>
                <option value="2x Leverage">2x Leverage</option>
                <option value="5x Leverage">5x Leverage</option>
                <option value="10x Leverage">10x Leverage</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Position Size Risk */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Position Size Risk</label>
            <div className="relative">
              <select
                value={positionRisk}
                onChange={(e) => setPositionRisk(e.target.value)}
                className="w-full appearance-none bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="0.5%, 1%, 2% per trade">0.5%, 1%, 2% per trade</option>
                <option value="0.5% Strict Risk">0.5% Strict Risk</option>
                <option value="1.0% Balanced Risk">1.0% Balanced Risk</option>
                <option value="2.0% Dynamic Kelly">2.0% Dynamic Kelly</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Max Drawdown Limit */}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">Max Drawdown Limit</label>
            <div className="relative">
              <input
                type="number"
                placeholder="5.0"
                value={maxDrawdownLimit}
                onChange={(e) => setMaxDrawdownLimit(e.target.value)}
                className="w-full bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-2 pr-7 focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400 absolute right-3 top-2">%</span>
            </div>
          </div>
        </div>

        {/* 3. Trading Fees & Slippage + Advanced Analysis (col 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Fees & Slippage */}
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-2">
            <div className="text-xs font-bold text-white tracking-wide uppercase">Trading Fees & Slippage</div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Exchange Trading Fees</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tradingFee}
                    onChange={(e) => setTradingFee(e.target.value)}
                    className="w-full bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-1.5 pr-6 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 absolute right-2 top-1.5">%</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Simulated Slippage</label>
                <div className="relative">
                  <input
                    type="text"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-3 py-1.5 pr-6 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 absolute right-2 top-1.5">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Analysis */}
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="text-xs font-bold text-white tracking-wide uppercase">Advanced Analysis</div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={runParameterSweep}
                  onChange={(e) => setRunParameterSweep(e.target.checked)}
                  className="rounded border-gray-700 text-blue-600 focus:ring-0"
                />
                <span>Run Parameter Sweep / Optimization 🛠️</span>
              </label>

              <div>
                <span className="text-[10px] text-gray-400 block mb-0.5">Optimization Target</span>
                <div className="relative">
                  <select
                    value={optimizationTarget}
                    onChange={(e) => setOptimizationTarget(e.target.value)}
                    className="w-full appearance-none bg-[#080E1A] border border-gray-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="Sharpe Ratio, Net Profit, etc.">Sharpe Ratio, Net Profit, etc.</option>
                    <option value="Sharpe Ratio">Maximize Sharpe Ratio</option>
                    <option value="Net Profit">Maximize Net Profit</option>
                    <option value="Sortino Ratio">Maximize Sortino Ratio</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300 pt-1">
                <input
                  type="checkbox"
                  checked={analyzeFactors}
                  onChange={(e) => setAnalyzeFactors(e.target.checked)}
                  className="rounded border-gray-700 text-blue-600 focus:ring-0"
                />
                <span>Analyze Specific Factors</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRIMARY CTA BUTTON ── */}
      <div className="text-center pt-2">
        <button
          onClick={handleRunBacktest}
          disabled={isRunning}
          className={`px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-xl transition-all flex items-center justify-center gap-2 mx-auto ${
            isRunning
              ? 'bg-blue-600/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:opacity-90 shadow-cyan-500/25 active:scale-95'
          }`}
        >
          <Rocket className={`w-4 h-4 ${isRunning ? 'animate-bounce' : ''}`} />
          <span>{isRunning ? 'Running Backtest Simulation...' : 'Run New Backtest Analysis'}</span>
        </button>
        <p className="text-[11px] text-gray-400 mt-2">
          Estimating simulation time: ~3 minutes for single test.
        </p>
      </div>

      {/* ── SIMULATION PROGRESS BAR ── */}
      {isRunning && (
        <div className="bg-[#0B111E] p-6 rounded-2xl border border-cyan-500/40 shadow-2xl space-y-3 animate-pulse">
          <div className="flex justify-between items-center text-xs">
            <span className="text-cyan-400 font-bold font-mono">{currentStep}</span>
            <span className="text-white font-mono font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── BACKTEST RESULTS REPORT ── */}
      {results && !isRunning && (
        <div className="bg-[#0B111E] p-6 rounded-2xl border border-emerald-500/30 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Backtest Completed — {strategyVersion} ({startDate} to {endDate})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Simulated on {simulatedExchange} with 0.1% taker fees & 0.05% slippage
              </p>
            </div>
            <button
              onClick={handleRunBacktest}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-run
            </button>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#080E1A] p-3.5 rounded-xl border border-gray-800">
              <div className="text-[10px] uppercase font-bold text-gray-400">Total Return / Net Profit</div>
              <div className="text-xl font-black text-emerald-400 mt-1">
                +${results.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold">+{results.totalReturn}% vs starting</div>
            </div>

            <div className="bg-[#080E1A] p-3.5 rounded-xl border border-gray-800">
              <div className="text-[10px] uppercase font-bold text-gray-400">Win Rate & Trades</div>
              <div className="text-xl font-black text-white mt-1">{results.winRate}%</div>
              <div className="text-[11px] text-gray-400 font-medium">Total {results.totalTrades} trades executed</div>
            </div>

            <div className="bg-[#080E1A] p-3.5 rounded-xl border border-gray-800">
              <div className="text-[10px] uppercase font-bold text-gray-400">Sharpe & Profit Factor</div>
              <div className="text-xl font-black text-cyan-400 mt-1">{results.sharpeRatio}</div>
              <div className="text-[11px] text-cyan-400 font-semibold">Profit Factor {results.profitFactor}</div>
            </div>

            <div className="bg-[#080E1A] p-3.5 rounded-xl border border-gray-800">
              <div className="text-[10px] uppercase font-bold text-gray-400">Max Historical Drawdown</div>
              <div className="text-xl font-black text-rose-400 mt-1">-{results.maxDrawdown}%</div>
              <div className="text-[11px] text-emerald-400 font-semibold">Under 5.0% risk limit</div>
            </div>
          </div>

          {/* Backtest Equity Sparkline Curve */}
          <div className="bg-[#080E1A] p-4 rounded-xl border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white uppercase">Simulated Equity Curve</span>
              <span className="text-[11px] text-cyan-400 font-mono font-bold">
                End Equity: ${(1000000 + results.netProfit).toLocaleString()}
              </span>
            </div>
            <div className="h-28">
              <Sparkline data={results.equityCurve} color="#00D8F6" height={100} width="100%" />
            </div>
          </div>

          {/* Trade Executions Table */}
          <div>
            <div className="text-xs font-bold text-white uppercase mb-2">Executed Trade Telemetry (Sample)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                    <th className="pb-2 font-bold">Time</th>
                    <th className="pb-2 font-bold">Symbol</th>
                    <th className="pb-2 font-bold">Side</th>
                    <th className="pb-2 font-bold text-right">Entry Price</th>
                    <th className="pb-2 font-bold text-right">Exit Price</th>
                    <th className="pb-2 font-bold text-right">Net P&L</th>
                    <th className="pb-2 font-bold text-right">R-Multiple</th>
                    <th className="pb-2 font-bold text-center">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {results.trades.map((tr, i) => (
                    <tr key={i} className="hover:bg-gray-800/30">
                      <td className="py-2 text-[11px] text-gray-400">{tr.time}</td>
                      <td className="py-2 font-bold text-white font-sans text-[11px]">{tr.symbol}</td>
                      <td className={`py-2 font-bold text-[11px] ${tr.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tr.side}
                      </td>
                      <td className="py-2 text-right text-gray-300">${tr.entry.toLocaleString()}</td>
                      <td className="py-2 text-right text-gray-300">${tr.exit.toLocaleString()}</td>
                      <td className={`py-2 text-right font-bold ${tr.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toLocaleString()}
                      </td>
                      <td className={`py-2 text-right font-bold ${tr.r.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tr.r}
                      </td>
                      <td className="py-2 text-center">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black border uppercase ${
                            tr.outcome === 'WIN'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {tr.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
