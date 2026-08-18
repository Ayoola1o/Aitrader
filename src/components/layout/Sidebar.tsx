'use client';

import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  TrendingUp,
  GitBranch,
  Search,
  History,
  DollarSign,
  FileText,
  Bell,
  BookOpen,
  Database,
  Settings,
  Zap,
  Bot,
  ChevronRight,
  X,
} from 'lucide-react';

export type NavTabId =
  | 'terminal'
  | 'dashboard'
  | 'markets'
  | 'strategies'
  | 'research'
  | 'backtesting'
  | 'paper_trading'
  | 'reports'
  | 'alerts'
  | 'journal'
  | 'data_lab'
  | 'settings';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  botStatus?: string;
  botName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  botStatus = 'ACTIVE',
  botName = 'QUANTARION V1.3',
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'terminal' as NavTabId, label: 'TERMINAL', icon: LineChart },
    { id: 'dashboard' as NavTabId, label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'markets' as NavTabId, label: 'MARKETS', icon: TrendingUp },
    { id: 'strategies' as NavTabId, label: 'STRATEGIES', icon: GitBranch },
    { id: 'research' as NavTabId, label: 'RESEARCH', icon: Search },
    { id: 'backtesting' as NavTabId, label: 'BACKTESTING', icon: History },
    { id: 'paper_trading' as NavTabId, label: 'PAPER TRADING', icon: DollarSign },
    { id: 'reports' as NavTabId, label: 'REPORTS', icon: FileText },
    { id: 'alerts' as NavTabId, label: 'ALERTS', icon: Bell },
    { id: 'journal' as NavTabId, label: 'JOURNAL', icon: BookOpen },
    { id: 'data_lab' as NavTabId, label: 'DATA LAB', icon: Database },
    { id: 'settings' as NavTabId, label: 'SETTINGS', icon: Settings },
  ];

  const systemStatusItems = [
    { label: 'Market Data', status: 'Connected' },
    { label: 'WebSocket', status: 'Connected' },
    { label: 'AI Agents (8/8)', status: 'Active' },
    { label: 'Risk Engine', status: 'Active' },
    { label: 'Paper Broker', status: 'Active' },
    { label: 'LLM Moderator', status: 'Online' },
    { label: 'Research Engine', status: 'Ready' },
  ];

  const handleTabClick = (id: NavTabId) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* ── MOBILE BACKDROP OVERLAY ── */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* ── ASIDE SIDEBAR CONTAINER ── */}
      <aside
        className={`
          bg-[#080E1A] border-r border-[#1E293B] flex flex-col h-screen select-none overflow-y-auto custom-scrollbar z-50 transition-all duration-300 ease-in-out
          ${
            isMobileOpen
              ? 'fixed inset-y-0 left-0 w-64 translate-x-0 shadow-2xl'
              : 'fixed -translate-x-full lg:translate-x-0 lg:sticky lg:top-0 shrink-0'
          }
          ${!isMobileOpen && isCollapsed ? 'lg:w-16' : 'lg:w-60'}
        `}
      >
        {/* Brand Header */}
        <div className={`px-4 py-4 flex items-center border-b border-[#1E293B] ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="font-black text-xs tracking-wider text-white whitespace-nowrap">
                  AI QUANT TRADER
                </span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                  LITE
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <div className={`py-3 space-y-1 flex-1 ${isCollapsed && !isMobileOpen ? 'px-2' : 'px-3'}`}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <div key={id} className="relative group">
                <button
                  onClick={() => handleTabClick(id)}
                  className={`
                    w-full flex items-center rounded-xl text-xs font-bold transition-all text-left
                    ${isCollapsed && !isMobileOpen ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'}
                    ${
                      isActive
                        ? 'bg-blue-600/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#0E1726]'
                    }
                  `}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'
                    }`}
                  />

                  {(!isCollapsed || isMobileOpen) && (
                    <>
                      <span className="tracking-wider text-[11px] font-semibold">{label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                      )}
                    </>
                  )}
                </button>

                {/* Floating Tooltip for Desktop Icon-Only Collapsed Mode */}
                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[#0B111E] border border-gray-800 text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                    {label}
                  </div>
                )}
              </div>
            );
          })}

          {/* ACTIVE BOT CARD (Full width or mini icon) */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="pt-4 pb-2">
              <div className="p-3 rounded-xl bg-[#0B111E] border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Active Bot</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {botStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">{botName}</div>
                    <div className="text-[10px] text-gray-400">AI QUANT CORE</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                  <span>PAPER MODE</span>
                  <span className="text-amber-400 font-semibold">MODERATE</span>
                </div>

                <button
                  onClick={() => handleTabClick('terminal')}
                  className="w-full mt-1 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 text-[11px] font-bold border border-blue-500/30 transition-all flex items-center justify-center gap-1"
                >
                  OPEN TERMINAL <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 flex justify-center">
              <button
                onClick={() => onSelectTab('terminal')}
                title={`${botName} (${botStatus})`}
                className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 hover:scale-105 transition-all"
              >
                <Bot className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* SYSTEM STATUS CHECKLIST */}
          {(!isCollapsed || isMobileOpen) && (
            <div className="pt-1 pb-3 px-1">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">System Status</div>
              <div className="space-y-1.5 text-[11px]">
                {systemStatusItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                      <span className="text-gray-400 text-[11px]">{item.label}</span>
                    </div>
                    <span className="text-emerald-400 font-medium text-[11px]">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
