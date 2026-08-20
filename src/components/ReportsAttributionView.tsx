'use client';

import React, { useState, useMemo } from 'react';
import { PortfolioState, TradeHistoryItem } from '@/types/trading';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { ReportsSidebar, ReportsNavId } from '@/components/reports/ReportsSidebar';
import {
  FileText,
  Download,
  Calendar,
  PieChart,
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Printer,
  Filter,
  Check,
  ChevronDown,
  AlertTriangle,
  Lightbulb,
  Bot,
  Zap,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  FileCode,
} from 'lucide-react';

interface ReportsAttributionViewProps {
  portfolio?: PortfolioState | null;
  tradeHistory?: TradeHistoryItem[];
}

export const ReportsAttributionView: React.FC<ReportsAttributionViewProps> = ({
  portfolio,
  tradeHistory = [],
}) => {
  const [activeSection, setActiveSection] = useState<ReportsNavId>('overview');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'MONTHLY_RETURNS' | 'RETURNS_HEATMAP' | 'ROLLING_METRICS' | 'DRAWDOWN' | 'EXPOSURE'>('MONTHLY_RETURNS');
  const [timeRange, setTimeRange] = useState<'1D' | '7D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'>('ALL');
  const [timeRangeSelect, setTimeRangeSelect] = useState('Custom');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2025-05-24');
  const [benchmarkSelect, setBenchmarkSelect] = useState('Benchmark (BTC)');
  const [groupBySelect, setGroupBySelect] = useState('Day');
  const [copiedShare, setCopiedShare] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // ── Live vs Baseline Statistical Calculations ──────────────────────────────
  const liveStats = useMemo(() => {
    const totalTrades = tradeHistory.length;
    const winTrades = tradeHistory.filter((t) => (t.realizedPnL || 0) > 0);
    const lossTrades = tradeHistory.filter((t) => (t.realizedPnL || 0) < 0);
    const winCount = winTrades.length;
    const lossCount = lossTrades.length;
    const winRate = totalTrades > 0 ? ((winCount / totalTrades) * 100).toFixed(2) : '62.38';

    const grossProfit = winTrades.reduce((a, t) => a + (t.realizedPnL || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((a, t) => a + (t.realizedPnL || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : '2.38';

    const currentEquity = portfolio?.equity || 127864.21;
    const initialBal = portfolio?.initialBalance || 100000.0;
    const netProfit = totalTrades > 0 ? grossProfit - grossLoss : 27864.21;
    const totalReturnPercent = totalTrades > 0 ? (((currentEquity - initialBal) / initialBal) * 100).toFixed(2) : '28.45';

    const sharpe = totalTrades > 0 ? (portfolio?.sharpeRatio || 2.14).toFixed(2) : '2.14';
    const sortino = '3.42';
    const maxDD = totalTrades > 0 ? (portfolio?.maxDrawdownPercent || 7.21).toFixed(2) : '7.21';

    return {
      totalReturnPercent: Number(totalReturnPercent),
      netProfit,
      cagr: 24.31,
      sharpeRatio: Number(sharpe),
      sortinoRatio: Number(sortino),
      maxDrawdownPercent: Number(maxDD),
      winRate: Number(winRate),
      profitFactor: Number(profitFactor),
      expectancy: '0.87R',
      totalTrades: totalTrades > 0 ? totalTrades : 186,
      winningTrades: winCount > 0 ? winCount : 116,
      losingTrades: lossCount > 0 ? lossCount : 70,
      endingEquity: currentEquity,
      initialCapital: initialBal,
    };
  }, [portfolio, tradeHistory]);

  // Monthly Returns Heatmap Table Data
  const monthlyMatrix = [
    { year: '2024', m: [2.31, 4.25, -1.12, 3.86, 6.42, 2.11, 4.75, -0.81, 2.94, 5.21, 3.12, 6.21], total: '+41.25%' },
    { year: '2025', m: [2.48, 3.74, 4.21, 5.83, 5.24, null, null, null, null, null, null, null], total: '+21.96%' },
  ];

  // Strategy Attribution Breakdown Data
  const strategyAttributionData = [
    { name: 'AI Quant Core v3', pnl: '+$18,250.34', ret: '+18.25%', contrib: '65.4%', winRate: '63.2%', trades: 98, color: 'bg-cyan-400' },
    { name: 'Momentum Sweep', pnl: '+$6,120.80', ret: '+6.12%', contrib: '21.9%', winRate: '61.1%', trades: 42, color: 'bg-purple-400' },
    { name: 'Liquidity Hunter', pnl: '+$2,850.12', ret: '+2.85%', contrib: '10.2%', winRate: '58.3%', trades: 28, color: 'bg-emerald-400' },
    { name: 'Mean Reversion', pnl: '-$1,356.45', ret: '-1.36%', contrib: '-4.9%', winRate: '45.5%', trades: 18, color: 'bg-amber-400' },
    { name: 'Breakout Alpha', pnl: '-$2,000.60', ret: '-2.00%', contrib: '-7.2%', winRate: '40.0%', trades: 20, color: 'bg-blue-400' },
  ];

  // Market Regime Performance Data
  const marketRegimeData = [
    { regime: 'Trending Up', ret: '+32.45%', winRate: '64.2%', pf: 2.95, trades: 98, color: 'bg-emerald-400' },
    { regime: 'Sideways', ret: '+8.73%', winRate: '54.1%', pf: 1.62, trades: 46, color: 'bg-amber-400' },
    { regime: 'Trending Down', ret: '+12.81%', winRate: '58.3%', pf: 1.81, trades: 42, color: 'bg-emerald-400' },
    { regime: 'High Volatility', ret: '+4.21%', winRate: '47.6%', pf: 1.28, trades: 24, color: 'bg-rose-400' },
  ];

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = 'ID,Symbol,Side,Entry,Exit,Size,PnL,CloseReason,OpenedAt,ClosedAt\n';
    const rows = tradeHistory.length > 0
      ? tradeHistory.map(t => `${t.id},${t.symbol},${t.side},${t.entryPrice},${t.exitPrice || t.entryPrice},${t.size},${t.realizedPnL || 0},${t.closeReason || 'CLOSED'},${new Date(t.openedAt || Date.now()).toISOString()},${new Date(t.closedAt || Date.now()).toISOString()}`).join('\n')
      : '1,BTCUSDT,LONG,64250.10,65812.40,0.023,1562.30,Take Profit,2025-05-24T09:00:00Z,2025-05-24T21:15:00Z';

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Generate PDF
  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      window.print();
      setIsGeneratingPdf(false);
    }, 400);
  };

  // Handle Share Link
  const handleShare = () => {
    setCopiedShare(true);
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
    }
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)] text-white">
      {/* ── LEFT SUB-SIDEBAR (Responsive mobile pill rail + desktop sidebar) ── */}
      <ReportsSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onSelectPreset={(p) => alert(`Loading preset ${p}...`)}
      />

      {/* ── MAIN REPORTS WORKSPACE ── */}
      <div className="flex-1 space-y-4 min-w-0 pb-8">
        {/* ── TOP HEADER & PRIMARY ACTIONS ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080E1A] p-3 rounded-2xl border border-[#1E293B]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeSection === 'overview'
                ? 'Performance Reports'
                : `${activeSection.replace('_', ' ').toUpperCase()} Report`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Comprehensive analytics and quantitative insights on your trading performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="px-3 py-2 bg-[#0B111E] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>{isGeneratingPdf ? 'Preparing PDF...' : 'Generate PDF'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-[#0B111E] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span>Export Data</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-white" />}
              <span>{copiedShare ? 'Copied!' : 'Share Report'}</span>
            </button>
          </div>
        </div>

        {/* ── TOP GLOBAL FILTER BAR (Matching reports page.png) ── */}
        <div className="bg-[#0B111E] p-3 rounded-2xl border border-[#1E293B] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Time Range Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-500">Time Range</span>
                <select
                  value={timeRangeSelect}
                  onChange={(e) => setTimeRangeSelect(e.target.value)}
                  className="bg-[#080E1A] border border-gray-700 rounded-xl px-2.5 py-1.5 text-gray-200 font-bold focus:outline-none"
                >
                  <option value="Custom">Custom</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                  <option value="YTD">Year to Date</option>
                  <option value="ALL">All History</option>
                </select>
              </div>

              {/* Date Pickers */}
              <div className="flex items-center gap-1.5 bg-[#080E1A] border border-gray-700 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-[11px] focus:outline-none"
                />
                <span className="text-gray-500">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-white font-mono text-[11px] focus:outline-none"
                />
              </div>

              {/* Comparison Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-500">Comparison</span>
                <select
                  value={benchmarkSelect}
                  onChange={(e) => setBenchmarkSelect(e.target.value)}
                  className="bg-[#080E1A] border border-gray-700 rounded-xl px-2.5 py-1.5 text-cyan-400 font-bold focus:outline-none"
                >
                  <option value="Benchmark (BTC)">Benchmark (BTC)</option>
                  <option value="Benchmark (ETH)">Benchmark (ETH)</option>
                  <option value="Benchmark (S&P 500)">Benchmark (S&P 500)</option>
                </select>
              </div>

              {/* Group By Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-500">Group By</span>
                <select
                  value={groupBySelect}
                  onChange={(e) => setGroupBySelect(e.target.value)}
                  className="bg-[#080E1A] border border-gray-700 rounded-xl px-2.5 py-1.5 text-gray-200 font-bold focus:outline-none"
                >
                  <option value="Day">Day</option>
                  <option value="Week">Week</option>
                  <option value="Month">Month</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => alert('Custom filters applied.')}
              className="px-3 py-1.5 bg-[#080E1A] hover:bg-gray-800 border border-gray-700 rounded-xl font-bold text-gray-300 flex items-center gap-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            OVERVIEW MAIN VIEW (Matching reports page.png)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            {/* ── ROW 1: TOP 8 KPI SUMMARY CARDS + RIGHT MINI CHARTS ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
              {/* Left 8 KPI Cards Grid (~75% / xl:col-span-9) */}
              <div className="xl:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                {/* 1. TOTAL RETURN */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">TOTAL RETURN</span>
                  <div className="my-1">
                    <span className="text-base font-black text-emerald-400">+{liveStats.totalReturnPercent}%</span>
                    <span className="text-[10px] text-emerald-400/80 block mt-0.5">+${liveStats.netProfit.toLocaleString()}</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[100, 105, 112, 108, 118, 128.45]} color="#10B981" height={24} />
                  </div>
                </div>

                {/* 2. CAGR */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">CAGR</span>
                  <div className="my-1">
                    <span className="text-base font-black text-white">{liveStats.cagr}%</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[20, 22, 23.5, 23.8, 24.31]} color="#64748B" height={24} />
                  </div>
                </div>

                {/* 3. SHARPE RATIO */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">SHARPE RATIO</span>
                  <div className="my-1">
                    <span className="text-base font-black text-white">{liveStats.sharpeRatio}</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[1.8, 1.95, 2.05, 2.10, 2.14]} color="#64748B" height={24} />
                  </div>
                </div>

                {/* 4. SORTINO RATIO */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">SORTINO RATIO</span>
                  <div className="my-1">
                    <span className="text-base font-black text-white">{liveStats.sortinoRatio}</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[2.9, 3.1, 3.25, 3.38, 3.42]} color="#64748B" height={24} />
                  </div>
                </div>

                {/* 5. MAX DRAWDOWN */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">MAX DRAWDOWN</span>
                  <div className="my-1">
                    <span className="text-base font-black text-rose-400">-{liveStats.maxDrawdownPercent}%</span>
                    <span className="text-[10px] text-rose-400/80 block mt-0.5">-$7,312.45</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[1.2, 3.4, 4.8, 7.21, 2.1]} color="#EF4444" height={24} />
                  </div>
                </div>

                {/* 6. WIN RATE */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">WIN RATE</span>
                  <div className="my-1">
                    <span className="text-base font-black text-white">{liveStats.winRate}%</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{liveStats.winningTrades} of {liveStats.totalTrades}</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[58, 60, 61.5, 62.38]} color="#10B981" height={24} />
                  </div>
                </div>

                {/* 7. PROFIT FACTOR */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">PROFIT FACTOR</span>
                  <div className="my-1">
                    <span className="text-base font-black text-white">{liveStats.profitFactor}</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">Excellent</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[2.1, 2.22, 2.30, 2.38]} color="#10B981" height={24} />
                  </div>
                </div>

                {/* 8. EXPECTANCY */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm">
                  <span className="text-[9px] uppercase font-sans font-bold text-gray-400">EXPECTANCY (R)</span>
                  <div className="my-1">
                    <span className="text-base font-black text-white">{liveStats.expectancy}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Per Trade</span>
                  </div>
                  <div className="h-6 mt-1">
                    <Sparkline data={[0.72, 0.78, 0.82, 0.87]} color="#06B6D4" height={24} />
                  </div>
                </div>
              </div>

              {/* Right Mini Charts Grid (~25% / xl:col-span-3) */}
              <div className="xl:col-span-3 grid grid-cols-2 xl:grid-cols-1 gap-2.5">
                {/* Return Distribution (R) */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] space-y-1.5 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Return Distribution (R)</span>
                  <div className="flex items-end justify-between h-12 gap-1 px-1">
                    {[
                      { l: '<-3R', h: 10, isLoss: true },
                      { l: '-2R', h: 25, isLoss: true },
                      { l: '-1R', h: 65, isLoss: true },
                      { l: '0', h: 25, isLoss: false },
                      { l: '1R', h: 50, isLoss: false },
                      { l: '2R', h: 80, isLoss: false },
                      { l: '>3R', h: 30, isLoss: false },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                        <div
                          style={{ height: `${bar.h}%` }}
                          className={`w-full rounded-t-sm ${bar.isLoss ? 'bg-rose-500/80' : 'bg-emerald-500/80'}`}
                        />
                        <span className="text-[7px] font-mono text-gray-500">{bar.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade Direction Donut */}
                <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between shadow-sm">
                  <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="18" stroke="#1E293B" strokeWidth="5" fill="none" />
                      <circle
                        cx="24"
                        cy="24"
                        r="18"
                        stroke="#10B981"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 18}
                        strokeDashoffset={(2 * Math.PI * 18) * (1 - 0.613)}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="text-[11px] space-y-0.5 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-gray-300">Long 61.3% (114)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-gray-300">Short 38.7% (72)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 2: MAIN 2-COLUMN ANALYTICS WORKSPACE ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
              {/* ═══════════════════════════════════════════════════════════════
                  LEFT COLUMN (~60% / xl:col-span-7): EQUITY CURVES & WORKSPACE
                  ═══════════════════════════════════════════════════════════════ */}
              <div className="xl:col-span-7 space-y-3 min-w-0">
                {/* Dual SVG Equity Curve & Underwater Drawdown */}
                <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Equity Curve</span>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                          <span className="text-gray-300 font-sans">Portfolio</span>
                          <span className="text-white font-bold">${liveStats.endingEquity.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                          <span className="text-gray-400 font-sans">Benchmark (BTC)</span>
                        </div>
                      </div>
                    </div>

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

                  {/* SVG Chart */}
                  <div className="h-56 w-full relative">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#1E293B" strokeDasharray="3 3" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="#1E293B" strokeDasharray="3 3" />
                      <line x1="0" y1="140" x2="500" y2="140" stroke="#1E293B" strokeDasharray="3 3" />

                      {/* Benchmark BTC Line */}
                      <path
                        d="M 0 160 Q 120 140, 240 130 T 500 100"
                        fill="none"
                        stroke="#64748B"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Strategy Portfolio Line */}
                      <path
                        d="M 0 160 Q 100 115, 200 95 T 350 55 T 500 25"
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2.5"
                      />

                      <defs>
                        <linearGradient id="repEquityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 160 Q 100 115, 200 95 T 350 55 T 500 25 L 500 200 L 0 200 Z"
                        fill="url(#repEquityGrad)"
                      />
                    </svg>

                    <div className="absolute left-1 top-2 text-[9px] font-mono text-gray-500">150K</div>
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-500">100K</div>
                    <div className="absolute left-1 bottom-1 text-[9px] font-mono text-gray-500">50K</div>
                  </div>

                  {/* Drawdown Area Chart */}
                  <div className="pt-2 border-t border-gray-800/80">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span className="text-rose-400 font-mono font-bold">-7.21% Max Drawdown</span>
                      <span className="font-mono">0% to -15%</span>
                    </div>

                    <div className="h-14 w-full">
                      <svg className="w-full h-full" viewBox="0 0 500 50" preserveAspectRatio="none">
                        <line x1="0" y1="5" x2="500" y2="5" stroke="#334155" />
                        <defs>
                          <linearGradient id="repDdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 5 Q 80 16, 140 7 T 240 20 T 340 42 T 420 10 T 500 5 L 500 5 Z"
                          fill="url(#repDdGrad)"
                          stroke="#EF4444"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Workspace Multi-Tabs (Monthly Returns, Returns Heatmap, Rolling Metrics, Drawdown Analysis, Exposure) */}
                <div className="bg-[#0B111E] rounded-2xl border border-[#1E293B] overflow-hidden shadow-md">
                  <div className="flex items-center gap-2 px-3 pt-3 border-b border-gray-800 text-xs font-bold overflow-x-auto custom-scrollbar">
                    {[
                      { id: 'MONTHLY_RETURNS' as const, label: 'Monthly Returns' },
                      { id: 'RETURNS_HEATMAP' as const, label: 'Returns Heatmap' },
                      { id: 'ROLLING_METRICS' as const, label: 'Rolling Metrics' },
                      { id: 'DRAWDOWN' as const, label: 'Drawdown Analysis' },
                      { id: 'EXPOSURE' as const, label: 'Exposure Over Time' },
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

                  {/* Tab: Monthly Returns Heatmap Table */}
                  <div className="p-3">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-center text-[10px] font-mono">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-800">
                            <th className="pb-1 text-left font-sans">YEAR</th>
                            {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m, i) => (
                              <th key={i} className="pb-1">{m}</th>
                            ))}
                            <th className="pb-1 font-bold text-right font-sans">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {monthlyMatrix.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-2 text-left text-gray-400 font-sans font-bold">{row.year}</td>
                              {row.m.map((val, mIdx) => (
                                <td key={mIdx} className="py-2">
                                  {val !== null ? (
                                    <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                      val >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                                    }`}>
                                      {val > 0 ? `${val}%` : `${val}%`}
                                    </span>
                                  ) : (
                                    <span className="text-gray-700">—</span>
                                  )}
                                </td>
                              ))}
                              <td className="py-2 text-right font-bold text-emerald-400">{row.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Bottom Triple Widgets Grid: Trade Stats + Daily Returns Donut + Win Rate by Confidence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Widget 1: Trade Statistics */}
                  <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] space-y-2 text-xs font-mono shadow-sm">
                    <span className="text-[10px] uppercase font-sans font-bold text-gray-400 block">Trade Statistics</span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between"><span className="text-gray-500 font-sans">Average Win</span><span className="text-emerald-400 font-bold">+$615.23 (1.24R)</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-sans">Average Loss</span><span className="text-rose-400 font-bold">-$412.18 (-0.83R)</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-sans">Largest Win</span><span className="text-emerald-400 font-bold">+$3,245.21 (4.12R)</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-sans">Largest Loss</span><span className="text-rose-400 font-bold">-$2,152.34 (-2.31R)</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-sans">Avg Win / Avg Loss</span><span className="text-white font-bold">1.49</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-sans">Payoff Ratio</span><span className="text-white font-bold">1.24</span></div>
                    </div>
                  </div>

                  {/* Widget 2: Daily Returns Distribution Donut */}
                  <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] space-y-2 shadow-sm">
                    <span className="text-[10px] uppercase font-sans font-bold text-gray-400 block">Daily Returns Distribution</span>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                        <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="18" stroke="#1E293B" strokeWidth="5" fill="none" />
                          <circle
                            cx="24"
                            cy="24"
                            r="18"
                            stroke="#10B981"
                            strokeWidth="5"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={(2 * Math.PI * 18) * (1 - 0.681)}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="text-[11px] space-y-1 font-mono">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Positive: <span className="font-bold text-emerald-400">68.1% (154)</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Negative: <span className="font-bold text-rose-400">31.9% (72)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Widget 3: Win Rate by Confidence Bar Chart */}
                  <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] space-y-2 shadow-sm">
                    <span className="text-[10px] uppercase font-sans font-bold text-gray-400 block">Win Rate by Confidence</span>
                    <div className="flex items-end justify-between h-14 gap-1 pt-1 px-1">
                      {[
                        { r: '<50%', wr: 28 },
                        { r: '50-60%', wr: 42 },
                        { r: '60-70%', wr: 58 },
                        { r: '70-80%', wr: 67 },
                        { r: '80-90%', wr: 78 },
                        { r: '>90%', wr: 85 },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <div
                            style={{ height: `${item.wr}%` }}
                            className="w-full rounded-t-sm bg-blue-500 hover:bg-cyan-400 transition-all"
                            title={`${item.r}: ${item.wr}% Win Rate`}
                          />
                          <span className="text-[7px] font-mono text-gray-400">{item.r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  RIGHT COLUMN (~40% / xl:col-span-5): DETAILED TABLES
                  ═══════════════════════════════════════════════════════════════ */}
              <div className="xl:col-span-5 space-y-3">
                {/* 1. Performance Summary Detailed Table */}
                <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                  <div className="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-gray-800/80">
                    Performance Summary
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                    <div><span className="text-gray-500 font-sans block text-[10px]">Initial Capital</span><span className="font-bold text-white">${liveStats.initialCapital.toLocaleString()}</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Best Day</span><span className="font-bold text-emerald-400">+$3,245.21</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Total Trades</span><span className="font-bold text-white">{liveStats.totalTrades}</span></div>

                    <div><span className="text-gray-500 font-sans block text-[10px]">Ending Equity</span><span className="font-bold text-white">${liveStats.endingEquity.toLocaleString()}</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Worst Day</span><span className="font-bold text-rose-400">-$2,152.34</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Winning Trades</span><span className="font-bold text-emerald-400">{liveStats.winningTrades} ({liveStats.winRate}%)</span></div>

                    <div><span className="text-gray-500 font-sans block text-[10px]">Net Profit</span><span className="font-bold text-emerald-400">+${liveStats.netProfit.toLocaleString()}</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Avg Daily Return</span><span className="font-bold text-white">0.18%</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Losing Trades</span><span className="font-bold text-rose-400">{liveStats.losingTrades}</span></div>

                    <div><span className="text-gray-500 font-sans block text-[10px]">Total Return</span><span className="font-bold text-emerald-400">+{liveStats.totalReturnPercent}%</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Std Deviation</span><span className="font-bold text-white">1.32%</span></div>
                    <div><span className="text-gray-500 font-sans block text-[10px]">Avg Hold Time</span><span className="font-bold text-white">13h 42m</span></div>
                  </div>
                </div>

                {/* 2. Strategy Attribution Table */}
                <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-2.5 shadow-md">
                  <div className="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-gray-800/80">
                    Strategy Attribution
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                          <th className="pb-1.5 font-bold font-sans">STRATEGY</th>
                          <th className="pb-1.5 font-bold font-sans text-right">NET P&L</th>
                          <th className="pb-1.5 font-bold font-sans text-right">RETURN</th>
                          <th className="pb-1.5 font-bold font-sans text-right">CONTRIB</th>
                          <th className="pb-1.5 font-bold font-sans text-right">WIN %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40">
                        {strategyAttributionData.map((strat, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/20">
                            <td className="py-2 flex items-center gap-1.5 font-sans font-bold text-white">
                              <span className={`w-2 h-2 rounded-full ${strat.color}`} />
                              <span className="truncate">{strat.name}</span>
                            </td>
                            <td className={`py-2 text-right font-bold ${strat.pnl.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {strat.pnl}
                            </td>
                            <td className="py-2 text-right text-gray-300">{strat.ret}</td>
                            <td className="py-2 text-right text-gray-400">{strat.contrib}</td>
                            <td className="py-2 text-right text-white font-bold">{strat.winRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Market Regime Performance Table */}
                <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-2.5 shadow-md">
                  <div className="text-xs font-bold text-white uppercase tracking-wider pb-1 border-b border-gray-800/80">
                    Market Regime Performance
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                          <th className="pb-1.5 font-bold font-sans">REGIME</th>
                          <th className="pb-1.5 font-bold font-sans text-right">RETURN</th>
                          <th className="pb-1.5 font-bold font-sans text-right">WIN %</th>
                          <th className="pb-1.5 font-bold font-sans text-right">PROFIT FACTOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/40">
                        {marketRegimeData.map((reg, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/20">
                            <td className="py-2 flex items-center gap-1.5 font-sans font-bold text-white">
                              <span className={`w-2 h-2 rounded-full ${reg.color}`} />
                              <span>{reg.regime}</span>
                            </td>
                            <td className="py-2 text-right font-bold text-emerald-400">{reg.ret}</td>
                            <td className="py-2 text-right text-gray-300">{reg.winRate}</td>
                            <td className="py-2 text-right text-white font-bold">{reg.pf}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 3: BOTTOM INSIGHTS ROW (3 CARDS) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: AI Performance Review */}
              <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>AI Performance Review</span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed">
                  <p className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Your strategy shows strong performance in trending markets with a Sharpe ratio of 2.14.</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Consider reducing position size in high volatility regimes to further reduce drawdowns.</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Key Takeaways */}
              <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Key Takeaways</span>
                </div>
                <div className="space-y-1 text-xs text-gray-300 leading-relaxed">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Strong risk-adjusted returns with consistent outperformance</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>AI Quant Core v3 is the top contributing strategy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Consider improving performance in sideways markets</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Risk Alerts */}
              <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Risk Alerts</span>
                </div>
                <div className="space-y-1 text-xs text-gray-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Max drawdown approaching warning threshold (10%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>High correlation detected between strategies</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Consider reducing exposure during high volatility</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            SUB-VIEW: FOCUSED REPORTS (When navigated from sub-sidebar)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection !== 'overview' && (
          <div className="bg-[#0B111E] p-6 rounded-2xl border border-[#1E293B] space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white capitalize">{activeSection.replace('_', ' ')} Deep Dive</h3>
              <button
                onClick={() => setActiveSection('overview')}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl"
              >
                Back to Overview
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-500 font-sans block text-[10px]">Active Sample Size</span>
                <span className="text-sm font-bold text-white font-mono">{liveStats.totalTrades} Executed Trades</span>
              </div>
              <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-500 font-sans block text-[10px]">Audited Sharpe Ratio</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{liveStats.sharpeRatio}</span>
              </div>
              <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-1">
                <span className="text-gray-500 font-sans block text-[10px]">Max Drawdown Depth</span>
                <span className="text-sm font-bold text-rose-400 font-mono">-{liveStats.maxDrawdownPercent}%</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed pt-2">
              This institutional analytics report synthesizes all historical fills, order latency telemetry, and multi-agent confidence distributions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
