'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  PieChart,
  BarChart3,
  ShieldAlert,
  LineChart,
  Calendar,
  Layers,
  GitCompare,
  FileText,
  Bot,
  Lightbulb,
  Bell,
  Plus,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';

export type ReportsNavId =
  | 'overview'
  | 'performance_summary'
  | 'strategy_attribution'
  | 'trade_analysis'
  | 'risk_analysis'
  | 'equity_curve'
  | 'monthly_returns'
  | 'regime_analysis'
  | 'benchmark_comparison'
  | 'custom_reports'
  | 'ai_review'
  | 'key_takeaways'
  | 'alerts_anomalies';

interface ReportsSidebarProps {
  activeSection: ReportsNavId;
  onSelectSection: (id: ReportsNavId) => void;
  onSelectPreset?: (presetName: string) => void;
  refreshSecondsAgo?: number;
}

export const ReportsSidebar: React.FC<ReportsSidebarProps> = ({
  activeSection,
  onSelectSection,
  onSelectPreset,
  refreshSecondsAgo = 12,
}) => {
  const reportNavItems = [
    { id: 'overview' as ReportsNavId, label: 'Overview', icon: LayoutDashboard },
    { id: 'performance_summary' as ReportsNavId, label: 'Performance Summary', icon: TrendingUp },
    { id: 'strategy_attribution' as ReportsNavId, label: 'Strategy Attribution', icon: PieChart },
    { id: 'trade_analysis' as ReportsNavId, label: 'Trade Analysis', icon: BarChart3 },
    { id: 'risk_analysis' as ReportsNavId, label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'equity_curve' as ReportsNavId, label: 'Equity Curve', icon: LineChart },
    { id: 'monthly_returns' as ReportsNavId, label: 'Monthly Returns', icon: Calendar },
    { id: 'regime_analysis' as ReportsNavId, label: 'Regime Analysis', icon: Layers },
    { id: 'benchmark_comparison' as ReportsNavId, label: 'Benchmark Comparison', icon: GitCompare },
    { id: 'custom_reports' as ReportsNavId, label: 'Custom Reports', icon: FileText },
  ];

  const insightItems = [
    { id: 'ai_review' as ReportsNavId, label: 'AI Performance Review', icon: Bot },
    { id: 'key_takeaways' as ReportsNavId, label: 'Key Takeaways', icon: Lightbulb },
    { id: 'alerts_anomalies' as ReportsNavId, label: 'Alerts & Anomalies', icon: Bell },
  ];

  const reportPresets = [
    { name: 'Daily Performance', type: 'Default' },
    { name: 'Weekly Executive', type: 'Default' },
    { name: 'Monthly Deep Dive', type: 'Default' },
    { name: 'Strategy Analysis', type: 'Custom' },
    { name: 'Risk Overview', type: 'Default' },
  ];

  const allItems = [...reportNavItems, ...insightItems];

  return (
    <>
      {/* ── MOBILE / TABLET HORIZONTAL SUB-NAV (< 1024px) ── */}
      <div className="lg:hidden w-full space-y-2 bg-[#080E1A] p-2 rounded-2xl border border-[#1E293B]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {allItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => onSelectSection(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white bg-[#0B111E] border border-gray-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP VERTICAL SUB-SIDEBAR (>= 1024px) ── */}
      <aside className="hidden lg:flex w-56 bg-[#080E1A] border-r border-[#1E293B] flex-col shrink-0 select-none py-3 px-2 space-y-4">
        {/* Reports Navigation Section */}
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">
            Reports
          </div>
          {reportNavItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => onSelectSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#0E1726]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'
                  }`}
                />
                <span className="tracking-wide text-xs">{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Insights Section */}
        <div className="space-y-0.5 pt-1">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">
            Insights
          </div>
          {insightItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => onSelectSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#0E1726]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'
                  }`}
                />
                <span className="tracking-wide text-xs">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Report Presets Section */}
        <div className="px-1 space-y-1 pt-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-2 mb-1">
            Report Presets
          </div>

          <button
            onClick={() => onSelectSection('custom_reports')}
            className="w-full mb-1.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-cyan-300 text-xs font-bold border border-blue-500/30 flex items-center justify-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Report
          </button>

          {reportPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPreset && onSelectPreset(preset.name)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors text-left"
            >
              <span className="truncate">{preset.name}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-900 text-gray-500 font-mono">
                {preset.type}
              </span>
            </button>
          ))}
        </div>

        {/* Refresh Status Footer */}
        <div className="pt-2 border-t border-gray-800/80 px-2 flex items-center gap-2 text-[10px] text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Reports refresh: {refreshSecondsAgo}s ago</span>
        </div>
      </aside>
    </>
  );
};
