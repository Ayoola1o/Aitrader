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
  Activity,
  ChevronRight,
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  botStatus = 'ACTIVE',
  botName = 'QUANTARION V1.3',
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

  return (
    <aside className="w-64 bg-[#080E1A] border-r border-[#1E293B] flex flex-col h-screen sticky top-0 shrink-0 select-none overflow-y-auto custom-scrollbar">
      {/* Brand Header */}
      <div className="px-5 py-4 flex items-center gap-2.5 border-b border-[#1E293B]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm tracking-wider text-white">AI QUANT TRADER</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-400 font-bold border border-cyan-500/20">
            LITE
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="px-3 py-3 space-y-0.5 flex-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onSelectTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left group ${
                isActive
                  ? 'bg-blue-600/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#0E1726]'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'
                }`}
              />
              <span className="tracking-wider">{label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />}
            </button>
          );
        })}

        {/* ACTIVE BOT CARD */}
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
              <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <div className="text-xs font-black text-white">{botName}</div>
                <div className="text-[10px] text-gray-400">AI QUANT CORE</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
              <span>PAPER MODE</span>
              <span className="text-amber-400 font-semibold">RISK: MODERATE</span>
            </div>

            <button
              onClick={() => onSelectTab('terminal')}
              className="w-full mt-1 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 text-[11px] font-bold border border-blue-500/30 transition-all flex items-center justify-center gap-1"
            >
              OPEN TERMINAL <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* SYSTEM STATUS CHECKLIST */}
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
      </div>
    </aside>
  );
};
