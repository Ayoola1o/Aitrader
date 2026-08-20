'use client';

import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  GitCompare,
  FastForward,
  Dice5,
  Sliders,
  Database,
  Bookmark,
  BookOpen,
  HelpCircle,
  FileCode,
  Zap,
  Plus,
} from 'lucide-react';

export type BacktestNavId =
  | 'overview'
  | 'new_backtest'
  | 'history'
  | 'comparison'
  | 'walk_forward'
  | 'monte_carlo'
  | 'parameter_sweep'
  | 'data_manager';

interface BacktestingSidebarProps {
  activeSection: BacktestNavId;
  onSelectSection: (id: BacktestNavId) => void;
  onSelectTemplate?: (templateName: string) => void;
  onOpenGuide?: (guideType: string) => void;
}

export const BacktestingSidebar: React.FC<BacktestingSidebarProps> = ({
  activeSection,
  onSelectSection,
  onSelectTemplate,
  onOpenGuide,
}) => {
  const mainNavItems = [
    { id: 'overview' as BacktestNavId, label: 'Overview', icon: LayoutDashboard },
    { id: 'new_backtest' as BacktestNavId, label: 'New Backtest', icon: PlusCircle },
    { id: 'history' as BacktestNavId, label: 'Backtest History', icon: History },
    { id: 'comparison' as BacktestNavId, label: 'Result Comparison', icon: GitCompare },
    { id: 'walk_forward' as BacktestNavId, label: 'Walk Forward', icon: FastForward },
    { id: 'monte_carlo' as BacktestNavId, label: 'Monte Carlo', icon: Dice5 },
    { id: 'parameter_sweep' as BacktestNavId, label: 'Parameter Sweep', icon: Sliders },
    { id: 'data_manager' as BacktestNavId, label: 'Data Manager', icon: Database },
  ];

  const quickTemplates = [
    { name: 'Momentum Strategy', color: 'bg-emerald-400' },
    { name: 'Mean Reversion', color: 'bg-cyan-400' },
    { name: 'Breakout Strategy', color: 'bg-amber-400' },
    { name: 'Trend Following', color: 'bg-blue-400' },
    { name: 'Liquidity Sweep', color: 'bg-purple-400' },
  ];

  const guides = [
    { id: 'guide', label: 'Backtesting Guide', icon: BookOpen },
    { id: 'metrics', label: 'Metrics Reference', icon: FileCode },
    { id: 'how_it_works', label: 'How it Works', icon: HelpCircle },
  ];

  return (
    <>
      {/* ── MOBILE / TABLET HORIZONTAL SUB-NAV (< 1024px) ── */}
      <div className="lg:hidden w-full space-y-2 bg-[#080E1A] p-2 rounded-2xl border border-[#1E293B]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {mainNavItems.map(({ id, label, icon: Icon }) => {
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
        {/* Navigation Categories */}
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">
            Backtesting
          </div>
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
                <span className="tracking-wide text-xs">{label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Templates List */}
        <div className="px-1 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-2 mb-1">
            Quick Templates
          </div>
          {quickTemplates.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => onSelectTemplate && onSelectTemplate(tmpl.name)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors text-left"
            >
              <span className={`w-2 h-2 rounded-full ${tmpl.color}`} />
              <span className="truncate">{tmpl.name}</span>
            </button>
          ))}

          <button
            onClick={() => onSelectSection('new_backtest')}
            className="w-full mt-1.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-cyan-300 text-xs font-bold border border-blue-500/30 flex items-center justify-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Save Template
          </button>
        </div>

        {/* Help & Guides */}
        <div className="px-1 space-y-1 pt-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-2 mb-1">
            Help & Guides
          </div>
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                onClick={() => onOpenGuide && onOpenGuide(g.id)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-cyan-300 hover:bg-[#0E1726] transition-colors text-left"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
