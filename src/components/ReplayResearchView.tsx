'use client';

import React, { useState } from 'react';
import { AgentSignal, PortfolioState, TradeHistoryItem } from '@/types/trading';
import { Download, Activity } from 'lucide-react';
import { dbPersistence } from '@/lib/db/schema';

interface ReplayResearchViewProps {
  signals?: AgentSignal[];
  portfolio?: PortfolioState | null;
  tradeHistory?: TradeHistoryItem[];
}

interface ScatterPoint {
  id: string;
  index: number;
  confidence: number;
  action: 'BUY' | 'SELL' | 'NO_TRADE';
  regime: string;
}

// Generate realistic simulated data points for the 616 decisions scatter plot
const generateScatterData = (): ScatterPoint[] => {
  const points: ScatterPoint[] = [];
  const regimes = ['TRENDING_UP', 'TRANSITION', 'TRENDING_DOWN', 'SIDEWAYS'];

  for (let i = 1; i <= 140; i++) {
    const idx = Math.round((i / 140) * 616);
    const rand = Math.random();
    const action: 'BUY' | 'SELL' | 'NO_TRADE' =
      rand > 0.85 ? 'BUY' : rand > 0.72 ? 'SELL' : 'NO_TRADE';
    // confidence centered around 55% with standard deviation
    const baseConf = action === 'BUY' ? 68 : action === 'SELL' ? 62 : 52;
    const confidence = Math.max(
      15,
      Math.min(95, Math.round(baseConf + (Math.random() - 0.5) * 35))
    );
    const regime = regimes[Math.floor(Math.random() * regimes.length)];

    points.push({
      id: `DEC-20268818-${String(idx).padStart(6, '0')}`,
      index: idx,
      confidence,
      action,
      regime,
    });
  }
  return points;
};

export const ReplayResearchView: React.FC<ReplayResearchViewProps> = ({
  tradeHistory = [],
}) => {
  const [activeTab, setActiveTab] = useState<
    'insights' | 'journal' | 'agents' | 'export'
  >('insights');
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);
  const [hoveredHeatmap, setHoveredHeatmap] = useState<{
    regime: string;
    action: string;
    freq: number;
    conf: number;
  } | null>(null);

  const decisions = dbPersistence.getDecisions();

  const scatterPoints = React.useMemo(() => {
    if (decisions.length > 0) {
      return decisions.map((d, idx) => ({
        id: d.decisionId || `DEC-${idx + 1}`,
        index: idx + 1,
        confidence: Math.round((d.confidence || 0.6) * 100),
        action: (d.action === 'BUY' ? 'BUY' : d.action === 'SELL' ? 'SELL' : 'NO_TRADE') as 'BUY' | 'SELL' | 'NO_TRADE',
        regime: 'ACTIVE_MARKET',
      }));
    }
    return [];
  }, [decisions]);

  const totalDecisions = decisions.length;
  const avgConfidence = totalDecisions > 0 ? Math.round(decisions.reduce((a, d) => a + (d.confidence || 0.6), 0) / totalDecisions * 100) : 0;
  const mostFrequentRegime = totalDecisions > 0 ? 'ACTIVE_MARKET' : 'NONE';
  const pendingOutcomes = totalDecisions;

  // Heatmap rows
  const heatmapData = [
    {
      regime: 'TRENDING_UP',
      noTrade: { freq: 180, conf: 61 },
      buy: { freq: 180, conf: 61 },
      sell: { freq: 30, conf: 72 },
    },
    {
      regime: 'TRANSITION',
      noTrade: { freq: 180, conf: 61 },
      buy: { freq: 120, conf: 58 },
      sell: { freq: 30, conf: 57 },
    },
    {
      regime: 'TRENDING_DOWN',
      noTrade: { freq: 100, conf: 52 },
      buy: { freq: 40, conf: 51 },
      sell: { freq: 20, conf: 45 },
    },
    {
      regime: 'SIDEWAYS',
      noTrade: { freq: 78, conf: 53 },
      buy: { freq: 120, conf: 52 },
      sell: { freq: 17, conf: 52 },
    },
    {
      regime: 'SIDEWAYS',
      noTrade: { freq: 31, conf: 61 },
      buy: { freq: 40, conf: 65 },
      sell: { freq: 15, conf: 45 },
    },
  ];

  // 30 Days confidence line points
  const confidence30Days = [
    54, 58, 52, 60, 56, 51, 62, 58, 55, 63, 52, 57, 59, 64, 53, 56, 61, 54, 58,
    52, 60, 55, 62, 57, 65, 53, 59, 56, 61, 55,
  ];

  const handleExportDecisions = () => {
    const csv = dbPersistence.exportDecisionsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aitrader_decisions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Advanced Research & Correlation Insights
        </h2>
        <p className="text-xs text-gray-400">
          Auditable AI decisions correlation analysis — for Quantarion BTCUSDT.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('insights')}
          className={`pb-2.5 transition-colors ${
            activeTab === 'insights'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Decision Insights
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-2.5 transition-colors ${
            activeTab === 'journal'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Decision Journal ({totalDecisions})
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-2.5 transition-colors ${
            activeTab === 'agents'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Agent Performance
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`pb-2.5 transition-colors ${
            activeTab === 'export'
              ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Export Data
        </button>
      </div>

      {/* ── ROW 1: 4 TOP KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Decisions */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">
            Total Decisions
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {totalDecisions}
          </div>
        </div>

        {/* 2. Avg. Decision Confidence */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">
            Avg. Decision Confidence
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {avgConfidence}%
          </div>
        </div>

        {/* 3. Most Frequent Regime */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">
            Most Frequent Regime
          </div>
          <div className="text-xl font-black text-purple-300 mt-1 tracking-tight">
            {mostFrequentRegime}
          </div>
        </div>

        {/* 4. Pending Outcomes */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">
            Pending Outcomes
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {pendingOutcomes}
          </div>
        </div>
      </div>

      {/* ── ROW 2: SCATTER PLOT (65%) + DECISION ACTION BREAKDOWN (35%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Confidence Scatter Plot */}
        <div className="lg:col-span-8 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Decision Confidence Scatter Plot
              </span>
              <div className="text-[10px] text-gray-400">Total Decisions</div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-gray-300">NO_TRADE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-gray-300">BUY</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-gray-300">SELL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-gray-400 inline-block" />
                <span className="text-gray-400">Avg. Confidence</span>
              </div>
            </div>
          </div>

          {/* Scatter Canvas / SVG */}
          <div className="relative w-full h-[220px]">
            <svg
              viewBox="0 0 650 200"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              {/* Y Grid lines */}
              {[100, 80, 60, 40, 20, 0].map((val) => {
                const y = 10 + (1 - val / 100) * 160;
                return (
                  <g key={val}>
                    <line
                      x1="45"
                      y1={y}
                      x2="640"
                      y2={y}
                      stroke="#1E293B"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x="38"
                      y={y + 3.5}
                      textAnchor="end"
                      fill="#64748B"
                      fontSize="9"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* X Grid lines */}
              {[1, 116, 246, 386, 466, 556, 616].map((idx) => {
                const x = 45 + ((idx - 1) / 615) * 595;
                return (
                  <text
                    key={idx}
                    x={x}
                    y="190"
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="9"
                  >
                    {idx}
                  </text>
                );
              })}

              {/* Average Line */}
              <line
                x1="45"
                y1={10 + (1 - 0.55) * 160}
                x2="640"
                y2={10 + (1 - 0.55) * 160}
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Scatter Points */}
              {scatterPoints.map((pt) => {
                const cx = 45 + ((pt.index - 1) / 615) * 595;
                const cy = 10 + (1 - pt.confidence / 100) * 160;
                const color =
                  pt.action === 'BUY'
                    ? '#10B981'
                    : pt.action === 'SELL'
                    ? '#EF4444'
                    : '#38BDF8';

                return (
                  <circle
                    key={pt.id}
                    cx={cx}
                    cy={cy}
                    r="3.5"
                    fill={color}
                    opacity={0.85}
                    className="cursor-pointer transition-all hover:r-5 hover:opacity-100"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            {/* Scatter Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#080E1A]/95 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-white shadow-2xl backdrop-blur-md pointer-events-none z-20 flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">
                  {hoveredPoint.id}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-purple-300 font-semibold">
                  {hoveredPoint.regime}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-200">
                  Conf {hoveredPoint.confidence}%
                </span>
                <span className="text-gray-400">|</span>
                <span
                  className={`font-bold ${
                    hoveredPoint.action === 'BUY'
                      ? 'text-emerald-400'
                      : hoveredPoint.action === 'SELL'
                      ? 'text-rose-400'
                      : 'text-cyan-400'
                  }`}
                >
                  Action: {hoveredPoint.action}
                </span>
              </div>
            )}
          </div>
          <div className="text-center text-[10px] text-gray-500 font-mono mt-1">
            Decision ID index
          </div>
        </div>

        {/* Decision Action Breakdown Pie */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-white tracking-wide uppercase">
              Decision Action Breakdown
            </span>
            <div className="text-[10px] text-gray-400">Total Decisions</div>
          </div>

          {/* 3D-styled SVG Pie */}
          <div className="relative flex items-center justify-center py-4">
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              className="transform -rotate-90 overflow-visible"
            >
              {/* NO_TRADE slice (69.3%) */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#6366F1"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.693 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset="0"
                className="hover:opacity-85 transition-opacity cursor-pointer"
              />
              {/* BUY slice (6.5%) */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#10B981"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.065 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset={`${-0.693 * 2 * Math.PI * 65}`}
                className="hover:opacity-85 transition-opacity cursor-pointer"
              />
              {/* SELL slice (4.2%) */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#EF4444"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.042 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset={`${-(0.693 + 0.065) * 2 * Math.PI * 65}`}
                className="hover:opacity-85 transition-opacity cursor-pointer"
              />
            </svg>
          </div>

          {/* Action Labels */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-gray-800/80 pt-2">
            <div>
              <div className="text-[10px] text-gray-400">NO_TRADE</div>
              <div className="font-bold text-indigo-400">550 (69.3%)</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">BUY</div>
              <div className="font-bold text-emerald-400">40 (6.5%)</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">SELL</div>
              <div className="font-bold text-rose-400">26 (4.2%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: HEATMAP (65%) + CONFIDENCE OVER TIME (35%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Heatmap Matrix */}
        <div className="lg:col-span-8 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between relative">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-3">
            Regime vs. Action Frequency & Avg. Confidence Heatmap
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2 text-left font-bold w-36">Regime</th>
                  <th className="pb-2 font-bold">NO_TRADE</th>
                  <th className="pb-2 font-bold">BUY</th>
                  <th className="pb-2 font-bold">SELL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {heatmapData.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-left font-bold text-white text-[11px] font-sans">
                      {row.regime}
                    </td>

                    {/* NO_TRADE Cell */}
                    <td
                      onMouseEnter={() =>
                        setHoveredHeatmap({
                          regime: row.regime,
                          action: 'NO_TRADE',
                          freq: row.noTrade.freq,
                          conf: row.noTrade.conf,
                        })
                      }
                      onMouseLeave={() => setHoveredHeatmap(null)}
                      className="py-2.5 px-2 cursor-pointer transition-all hover:brightness-125 bg-amber-500/20 text-amber-200 border border-amber-500/20"
                    >
                      Freq: {row.noTrade.freq} / Avg Conf: {row.noTrade.conf}%
                    </td>

                    {/* BUY Cell */}
                    <td
                      onMouseEnter={() =>
                        setHoveredHeatmap({
                          regime: row.regime,
                          action: 'BUY',
                          freq: row.buy.freq,
                          conf: row.buy.conf,
                        })
                      }
                      onMouseLeave={() => setHoveredHeatmap(null)}
                      className="py-2.5 px-2 cursor-pointer transition-all hover:brightness-125 bg-teal-500/20 text-teal-200 border border-teal-500/20"
                    >
                      Freq: {row.buy.freq} / Avg Conf: {row.buy.conf}%
                    </td>

                    {/* SELL Cell */}
                    <td
                      onMouseEnter={() =>
                        setHoveredHeatmap({
                          regime: row.regime,
                          action: 'SELL',
                          freq: row.sell.freq,
                          conf: row.sell.conf,
                        })
                      }
                      onMouseLeave={() => setHoveredHeatmap(null)}
                      className="py-2.5 px-2 cursor-pointer transition-all hover:brightness-125 bg-cyan-500/20 text-cyan-200 border border-cyan-500/20"
                    >
                      Freq: {row.sell.freq} / Avg Conf: {row.sell.conf}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hover Tooltip Popup for Heatmap */}
          {hoveredHeatmap && (
            <div className="absolute top-8 right-8 bg-[#080E1A] border border-cyan-500/60 rounded-xl p-2.5 shadow-2xl text-xs text-white z-20">
              <div className="font-bold text-cyan-400">
                {hoveredHeatmap.regime}
              </div>
              <div className="text-gray-300 text-[11px] mt-0.5">
                Freq: {hoveredHeatmap.freq} / Avg Conf: {hoveredHeatmap.conf}%
              </div>
              <div className="text-emerald-400 font-semibold text-[10px]">
                Action: {hoveredHeatmap.action}
              </div>
            </div>
          )}

          {/* Shading Legend Bar */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-800/80 mt-2">
            <span>Freq: 60%</span>
            <div className="w-48 h-2 rounded-full bg-gradient-to-r from-amber-500 via-teal-500 to-cyan-500 opacity-60" />
            <span>Avg: 02%</span>
          </div>
        </div>

        {/* Confidence Over Time (Daily Avg.) */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-1">
            Confidence Over Time (Daily Avg.)
          </div>

          {/* 30 Days SVG Chart */}
          <div className="relative w-full h-[180px] my-auto">
            <svg
              viewBox="0 0 300 150"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              {/* Grid Lines */}
              {[80, 60, 40, 20, 0].map((val) => {
                const y = 10 + (1 - val / 80) * 120;
                return (
                  <g key={val}>
                    <line
                      x1="25"
                      y1={y}
                      x2="295"
                      y2={y}
                      stroke="#1E293B"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x="20"
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748B"
                      fontSize="8"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Curve */}
              {(() => {
                const pts = confidence30Days.map((val, i) => ({
                  x: 25 + (i / (confidence30Days.length - 1)) * 270,
                  y: 10 + (1 - val / 80) * 120,
                }));
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i];
                  const p1 = pts[i + 1];
                  const cpX = (p0.x + p1.x) / 2;
                  d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
                }
                return (
                  <path
                    d={d}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                );
              })()}
            </svg>
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-500 px-6">
            <span>0</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>25</span>
            <span>30</span>
          </div>
          <div className="text-center text-[10px] text-gray-500 font-mono mt-0.5">
            Last 30 days
          </div>
        </div>
      </div>

      {/* Export Action Trigger */}
      {activeTab === 'export' && (
        <div className="bg-[#0B111E] p-6 rounded-2xl border border-gray-800 text-center space-y-4">
          <h3 className="text-sm font-bold text-white">Export Decision Logs</h3>
          <p className="text-xs text-gray-400">
            Download auditable decisions history and trade logs in CSV format.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleExportDecisions}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Decisions CSV (
              {decisions.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
