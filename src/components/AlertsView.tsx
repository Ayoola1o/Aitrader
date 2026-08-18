'use client';

import React, { useState } from 'react';
import { Eye, FileText, CheckCircle2 } from 'lucide-react';

interface AlertItem {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  symbol: string;
  price: string;
  time: string;
  status: 'UNACKNOWLEDGED' | 'ACKNOWLEDGED';
  details?: string;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'AL-20268818-000101',
    priority: 'CRITICAL',
    type: 'Price Breach',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$64,092.132',
    status: 'UNACKNOWLEDGED',
    details: 'Price: 10 / Avg. Cont: 64,900 | Action: BTCUSDT | Priorities: NO. Details',
  },
  {
    id: 'AL-20268818-000102',
    priority: 'CRITICAL',
    type: 'Price Breach',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,082.438',
    status: 'UNACKNOWLEDGED',
    details: 'Upper bound resistance breached on 1m chart',
  },
  {
    id: 'AL-20268818-000103',
    priority: 'CRITICAL',
    type: 'Price Breach',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,084.434',
    status: 'UNACKNOWLEDGED',
    details: 'Stop loss threshold proximity warning < 0.5%',
  },
  {
    id: 'AL-20268818-000104',
    priority: 'HIGH',
    type: 'Price Breach',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,084.455',
    status: 'UNACKNOWLEDGED',
    details: 'High momentum divergence against trend direction',
  },
  {
    id: 'AL-20268818-000105',
    priority: 'HIGH',
    type: 'Regime Shift',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,007.377',
    status: 'ACKNOWLEDGED',
    details: 'Shift detected from RANGING to TRANSITION',
  },
  {
    id: 'AL-20268818-000106',
    priority: 'MEDIUM',
    type: 'Regime Shift',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,082.389',
    status: 'ACKNOWLEDGED',
    details: 'Volatility percentile crossed 70th percentile',
  },
  {
    id: 'AL-20268818-000107',
    priority: 'MEDIUM',
    type: 'Regime Shift',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,001.458',
    status: 'ACKNOWLEDGED',
    details: 'Liquidity sweep detected on Ask side',
  },
  {
    id: 'AL-20268818-000108',
    priority: 'LOW',
    type: 'Risk Violation',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,009.131',
    status: 'ACKNOWLEDGED',
    details: 'Max position size clamped by risk engine',
  },
  {
    id: 'AL-20268818-000109',
    priority: 'LOW',
    type: 'No Trade Confirmation',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,007.329',
    status: 'ACKNOWLEDGED',
    details: 'Abstain reason: conflicting agent consensus',
  },
  {
    id: 'AL-20268818-000110',
    priority: 'LOW',
    type: 'No Trade Confirmation',
    symbol: 'BTCUSDT',
    price: '$64,500.00',
    time: '$65,007.388',
    status: 'ACKNOWLEDGED',
    details: 'Spread too wide for taker entry',
  },
];

export const AlertsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'history' | 'triggers' | 'logs'>('live');
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [hoveredAlert, setHoveredAlert] = useState<AlertItem | null>(null);
  const [hoveredVolumeDay, setHoveredVolumeDay] = useState<{ day: number; count: number } | null>(null);

  const toggleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === 'UNACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED',
            }
          : a
      )
    );
  };

  const criticalCount = alerts.filter((a) => a.priority === 'CRITICAL' && a.status === 'UNACKNOWLEDGED').length;

  // 30-Day Alert Volume Timeline data
  const volumeData = [
    5, 5, 5, 8, 10, 12, 10, 21, 15, 8, 8, 8, 10, 14, 11, 8, 11, 8, 6, 12, 4, 15, 11, 8, 7, 10, 7, 7, 7, 7,
  ];

  // Critical alert regimes
  const criticalRegimes = [
    { regime: 'TRANSITION', count: 75 },
    { regime: 'TRENDING_UP', count: 65 },
    { regime: 'SIDEWAYS', count: 40 },
    { regime: 'HIGH_VOLUME', count: 35 },
    { regime: 'SIDEWAYS', count: 15 },
    { regime: 'TRENDING_DOWN', count: 10 },
    { regime: 'SIDEWAYS', count: 5 },
  ];

  return (
    <div className="space-y-4 pb-10">
      {/* Main Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Intelligent Alert Management & Notification Journal
        </h2>
        <p className="text-xs text-gray-400">
          Auditable and actionable notifications based on bot decisions, market events, and system anomalies for Quantarion BTCUSDT.
        </p>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-6 border-b border-gray-800 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('live')}
          className={`pb-2.5 transition-colors ${
            activeSubTab === 'live' ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Live Alerts
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-2.5 transition-colors ${
            activeSubTab === 'history' ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Alert History
        </button>
        <button
          onClick={() => setActiveSubTab('triggers')}
          className={`pb-2.5 transition-colors ${
            activeSubTab === 'triggers' ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Trigger Configuration
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-2.5 transition-colors ${
            activeSubTab === 'logs' ? 'text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          System Logs
        </button>
      </div>

      {/* ── ROW 1: 4 TOP KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Active Alerts */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">Total Active Alerts</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{alerts.length}</div>
        </div>

        {/* 2. Unacknowledged Critical */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">Unacknowledged Critical</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{criticalCount}</div>
        </div>

        {/* 3. Alerts Today */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">Alerts Today</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">25</div>
        </div>

        {/* 4. Avg. Acknowledge Time */}
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] text-center flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-gray-400">Avg. Acknowledge Time</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">15s</div>
        </div>
      </div>

      {/* ── ROW 2: LIVE ALERTS TABLE (65%) + ALERT TYPE DISTRIBUTION (35%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Live Alerts Table */}
        <div className="lg:col-span-8 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between relative">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-2">Alerts</div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2 font-bold">Alert ID</th>
                  <th className="pb-2 font-bold">Priority</th>
                  <th className="pb-2 font-bold">Alert Type</th>
                  <th className="pb-2 font-bold">Symbol</th>
                  <th className="pb-2 font-bold">Price</th>
                  <th className="pb-2 font-bold">Time</th>
                  <th className="pb-2 font-bold">Status</th>
                  <th className="pb-2 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 font-mono">
                {alerts.map((al) => (
                  <tr
                    key={al.id}
                    onMouseEnter={() => setHoveredAlert(al)}
                    onMouseLeave={() => setHoveredAlert(null)}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-2 text-[11px] text-gray-300 font-bold">{al.id}</td>
                    <td className="py-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                          al.priority === 'CRITICAL'
                            ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                            : al.priority === 'HIGH'
                            ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                            : al.priority === 'MEDIUM'
                            ? 'text-yellow-300 bg-yellow-500/15 border border-yellow-500/30'
                            : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                        }`}
                      >
                        {al.priority}
                      </span>
                    </td>
                    <td className="py-2 text-[11px] text-white font-sans font-medium">{al.type}</td>
                    <td className="py-2 text-[11px] text-gray-300 font-sans">{al.symbol}</td>
                    <td className="py-2 text-[11px] text-gray-300">{al.price}</td>
                    <td className="py-2 text-[10px] text-gray-400">{al.time}</td>
                    <td className="py-2">
                      <span
                        className={`text-[9px] font-bold tracking-wider uppercase font-sans ${
                          al.status === 'UNACKNOWLEDGED' ? 'text-amber-400' : 'text-cyan-400'
                        }`}
                      >
                        {al.status}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => toggleAcknowledge(al.id)}
                          className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-cyan-300 text-[10px] font-bold transition-colors"
                        >
                          Acknowledge
                        </button>
                        <button className="text-gray-400 hover:text-white p-0.5">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="text-gray-400 hover:text-white p-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hover Detail Tooltip */}
          {hoveredAlert && (
            <div className="absolute top-12 left-1/3 bg-[#080E1A] border border-cyan-500/60 rounded-xl p-3 shadow-2xl text-xs text-white z-20 max-w-xs backdrop-blur-md">
              <div className="font-mono text-cyan-400 font-bold">{hoveredAlert.id}</div>
              <div className="text-gray-300 text-[11px] mt-1 font-sans">
                Alert Type: <strong>{hoveredAlert.type}</strong>
              </div>
              <div className="text-gray-400 text-[10px] mt-0.5 font-mono">{hoveredAlert.details}</div>
            </div>
          )}
        </div>

        {/* Alert Type Distribution Pie */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-1">Alert Type Distribution</div>

          {/* SVG Pie */}
          <div className="relative flex items-center justify-center py-4">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              {/* Regime Shift 26% */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#2DD4BF"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.26 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset="0"
              />
              {/* Risk Breach 16% */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#F43F5E"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.16 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset={`${-0.26 * 2 * Math.PI * 65}`}
              />
              {/* Price Breach 16% */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#6366F1"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.16 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset={`${-(0.26 + 0.16) * 2 * Math.PI * 65}`}
              />
              {/* No Trade Conf 16% */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#3B82F6"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.16 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset={`${-(0.26 + 0.16 + 0.16) * 2 * Math.PI * 65}`}
              />
              {/* High Volume 15% */}
              <circle
                cx="90"
                cy="90"
                r="65"
                stroke="#F97316"
                strokeWidth="35"
                fill="none"
                strokeDasharray={`${0.15 * 2 * Math.PI * 65} ${2 * Math.PI * 65}`}
                strokeDashoffset={`${-(0.26 + 0.16 + 0.16 + 0.16) * 2 * Math.PI * 65}`}
              />
            </svg>
          </div>

          {/* Slices list */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-300 border-t border-gray-800/80 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Regime Shift (26%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Risk Breach (16%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Price Breach (16%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>No Trade Conf (16%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>High Volume (15%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: ALERT VOLUME OVER TIME (65%) + REGIME FOR CRITICAL ALERTS (35%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Alert Volume over Time (Last 30 Days) */}
        <div className="lg:col-span-8 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between relative">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-1">
            Alert Volume over Time (Last 30 Days)
          </div>

          <div className="relative w-full h-[180px] my-auto">
            <svg viewBox="0 0 650 140" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              {/* Y Scale */}
              {[25, 20, 15, 10, 5, 0].map((v) => {
                const y = 10 + (1 - v / 25) * 110;
                return (
                  <g key={v}>
                    <line x1="30" y1={y} x2="640" y2={y} stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
                    <text x="22" y={y + 3} textAnchor="end" fill="#64748B" fontSize="9">
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* Curve Line */}
              {(() => {
                const pts = volumeData.map((count, i) => ({
                  x: 30 + (i / (volumeData.length - 1)) * 610,
                  y: 10 + (1 - count / 25) * 110,
                  day: i + 1,
                  count,
                }));
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i];
                  const p1 = pts[i + 1];
                  const cpX = (p0.x + p1.x) / 2;
                  d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
                }
                return (
                  <>
                    <path d={d} fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                    {pts.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="#38BDF8"
                        stroke="#0B111E"
                        strokeWidth="1.5"
                        className="cursor-pointer hover:r-5 transition-all"
                        onMouseEnter={() => setHoveredVolumeDay({ day: p.day, count: p.count })}
                        onMouseLeave={() => setHoveredVolumeDay(null)}
                      />
                    ))}
                  </>
                );
              })()}
            </svg>

            {/* Hover tooltip for volume point */}
            {hoveredVolumeDay && (
              <div className="absolute top-2 left-1/3 bg-[#080E1A] border border-cyan-500/60 rounded-lg p-2 text-xs text-white z-20 shadow-xl pointer-events-none">
                <div className="font-bold text-cyan-400">Day {hoveredVolumeDay.day}</div>
                <div className="text-gray-300 text-[10px]">Alert Volume: {hoveredVolumeDay.count}</div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-500 px-6 font-mono">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="text-center text-[10px] text-gray-500 font-mono mt-0.5">Day 1-30</div>
        </div>

        {/* Regime for Critical Alerts Horizontal Bars */}
        <div className="lg:col-span-4 bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase mb-2">Regime for Critical Alerts</div>

          <div className="space-y-2 text-xs flex-1 flex flex-col justify-around">
            {criticalRegimes.map((cr, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase w-28 truncate">{cr.regime}</span>
                <div className="flex-1 h-3.5 bg-gray-900 rounded-sm overflow-hidden flex items-center">
                  <div
                    className="h-full bg-indigo-500/80 hover:bg-indigo-400 transition-all"
                    style={{ width: `${cr.count}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Scale X-Axis */}
          <div className="flex justify-between items-center text-[9px] text-gray-500 border-t border-gray-800/80 pt-1.5 mt-2 px-1 font-mono">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          <div className="text-right text-[9px] text-gray-500 font-mono">Critical Alerts</div>
        </div>
      </div>
    </div>
  );
};
