'use client';

import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  Search,
  DollarSign,
  FileText,
  Settings,
  PlusCircle,
  Download,
  Filter,
} from 'lucide-react';

export type StrategyHubNavId =
  | 'overview'
  | 'my_strategies'
  | 'marketplace'
  | 'research'
  | 'portfolio'
  | 'reports'
  | 'settings';

export type StrategyStatusFilter = 'ALL' | 'ACTIVE' | 'PAPER' | 'PAUSED' | 'ARCHIVED';

interface StrategySidebarProps {
  activeSection: StrategyHubNavId;
  onSelectSection: (id: StrategyHubNavId) => void;
  statusFilter: StrategyStatusFilter;
  onSelectStatusFilter: (filter: StrategyStatusFilter) => void;
  activeCount?: number;
  paperCount?: number;
  pausedCount?: number;
  archivedCount?: number;
  onCreateStrategy?: () => void;
  onImportStrategy?: () => void;
  onOpenSettings?: () => void;
}

export const StrategySidebar: React.FC<StrategySidebarProps> = ({
  activeSection,
  onSelectSection,
  statusFilter,
  onSelectStatusFilter,
  activeCount = 2,
  paperCount = 5,
  pausedCount = 3,
  archivedCount = 0,
  onCreateStrategy,
  onImportStrategy,
  onOpenSettings,
}) => {
  const mainNavItems = [
    { id: 'overview' as StrategyHubNavId, label: 'Overview', icon: LayoutDashboard },
    { id: 'my_strategies' as StrategyHubNavId, label: 'My Strategies', icon: Layers },
    { id: 'marketplace' as StrategyHubNavId, label: 'Marketplace / Templates', icon: ShoppingBag },
    { id: 'research' as StrategyHubNavId, label: 'RESEARCH', icon: Search },
    { id: 'portfolio' as StrategyHubNavId, label: 'PORTFOLIO', icon: DollarSign },
    { id: 'reports' as StrategyHubNavId, label: 'REPORTS', icon: FileText },
    { id: 'settings' as StrategyHubNavId, label: 'SETTINGS', icon: Settings },
  ];

  const statusFilters: { id: StrategyStatusFilter; label: string; count: number; color: string }[] = [
    { id: 'ALL', label: 'All Strategies', count: activeCount + paperCount + pausedCount + archivedCount, color: 'bg-blue-400' },
    { id: 'ACTIVE', label: 'Active/Live', count: activeCount, color: 'bg-emerald-400' },
    { id: 'PAPER', label: 'Paper Trading', count: paperCount, color: 'bg-amber-400' },
    { id: 'PAUSED', label: 'Paused', count: pausedCount, color: 'bg-rose-400' },
  ];

  return (
    <>
      {/* ── MOBILE / TABLET HORIZONTAL BAR (< 1024px) ── */}
      <div className="lg:hidden w-full space-y-2 bg-[#080E1A] p-2.5 rounded-2xl border border-[#1E293B]">
        {/* Status Filter Chips Horizontal */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {statusFilters.map(({ id, label, count, color }) => {
            const isActive = statusFilter === id;
            return (
              <button
                key={id}
                onClick={() => onSelectStatusFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white bg-[#0B111E] border border-gray-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                <span>{label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 font-mono text-gray-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP VERTICAL STRATEGY SIDEBAR (>= 1024px) ── */}
      <aside className="hidden lg:flex w-56 bg-[#080E1A] border-r border-[#1E293B] flex-col shrink-0 select-none py-3 px-2 space-y-4">
        {/* Strategy Hub Nav List */}
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">Strategy Hub</div>
          {mainNavItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => onSelectSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left group ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#0E1726]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'
                  }`}
                />
                <span className="tracking-wide">{label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />}
              </button>
            );
          })}
        </div>

        {/* Status Registry Filter Section */}
        <div className="px-1 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-2 mb-1">Status Registry</div>
          {statusFilters.map(({ id, label, count, color }) => {
            const isActive = statusFilter === id;
            return (
              <button
                key={id}
                onClick={() => onSelectStatusFilter(id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive ? 'bg-[#0B111E] text-white font-bold border border-gray-800' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span>{label}</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Actions List */}
        <div className="px-1 space-y-1 pt-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-2 mb-1">Quick Actions</div>

          <button
            onClick={onCreateStrategy}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-cyan-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Create Strategy</span>
          </button>

          <button
            onClick={onImportStrategy}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-emerald-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Strategy</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-purple-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            <span>Global Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
