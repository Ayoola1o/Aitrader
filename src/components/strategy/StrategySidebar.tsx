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
  archivedCount = 14,
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

  return (
    <aside className="w-56 bg-[#080E1A] border-r border-[#1E293B] flex flex-col shrink-0 select-none py-3 px-2 space-y-4">
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
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Registry */}
      <div className="space-y-1 pt-1">
        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1.5">Status Registry</div>
        <button
          onClick={() => onSelectStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-300 hover:bg-[#0E1726]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span>Active/Live</span>
          </div>
          <span className="text-gray-400 font-mono text-[11px]">({activeCount})</span>
        </button>

        <button
          onClick={() => onSelectStatusFilter(statusFilter === 'PAPER' ? 'ALL' : 'PAPER')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'PAPER' ? 'bg-amber-500/15 text-amber-400' : 'text-gray-300 hover:bg-[#0E1726]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Paper Trading</span>
          </div>
          <span className="text-gray-400 font-mono text-[11px]">({paperCount})</span>
        </button>

        <button
          onClick={() => onSelectStatusFilter(statusFilter === 'PAUSED' ? 'ALL' : 'PAUSED')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'PAUSED' ? 'bg-rose-500/15 text-rose-400' : 'text-gray-300 hover:bg-[#0E1726]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Paused</span>
          </div>
          <span className="text-gray-400 font-mono text-[11px]">({pausedCount})</span>
        </button>

        <button
          onClick={() => onSelectStatusFilter(statusFilter === 'ARCHIVED' ? 'ALL' : 'ARCHIVED')}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'ARCHIVED' ? 'bg-gray-700/30 text-gray-300' : 'text-gray-400 hover:bg-[#0E1726]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full border border-gray-500" />
            <span>Archived</span>
          </div>
          <span className="text-gray-500 font-mono text-[11px]">({archivedCount})</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1 pt-1">
        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">Quick Actions</div>
        <button
          onClick={onCreateStrategy}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Create Strategy</span>
        </button>
        <button
          onClick={onImportStrategy}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Import Strategy</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <Settings className="w-3.5 h-3.5 text-gray-400" />
          <span>Global Settings</span>
        </button>
      </div>
    </aside>
  );
};
