'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Database,
  LineChart,
  Cpu,
  Bot,
  Search,
  DollarSign,
  Sliders,
  Shield,
  Bell,
  HardDrive,
  Download,
  Lock,
  Terminal,
  AlertCircle,
} from 'lucide-react';

export type SettingsNavId =
  | 'overview'
  | 'exchange'
  | 'broker'
  | 'database'
  | 'market_data'
  | 'ai_providers'
  | 'ai_agents'
  | 'research'
  | 'paper_trading'
  | 'execution'
  | 'risk_controls'
  | 'bots'
  | 'notifications'
  | 'data_sources'
  | 'exports'
  | 'security'
  | 'advanced';

interface SettingsSidebarProps {
  activeSection: SettingsNavId;
  onSelectSection: (id: SettingsNavId) => void;
  unsavedCount?: number;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeSection,
  onSelectSection,
  unsavedCount = 2,
}) => {
  const sections = [
    {
      category: 'SETTINGS',
      items: [
        { id: 'overview' as SettingsNavId, label: 'Overview', icon: LayoutDashboard },
      ],
    },
    {
      category: 'CONNECTIONS',
      items: [
        { id: 'exchange' as SettingsNavId, label: 'Exchange', icon: TrendingUp },
        { id: 'broker' as SettingsNavId, label: 'Broker', icon: Briefcase },
        { id: 'database' as SettingsNavId, label: 'Database', icon: Database },
        { id: 'market_data' as SettingsNavId, label: 'Market Data', icon: LineChart },
      ],
    },
    {
      category: 'INTELLIGENCE',
      items: [
        { id: 'ai_providers' as SettingsNavId, label: 'AI Providers', icon: Cpu },
        { id: 'ai_agents' as SettingsNavId, label: 'AI Agents', icon: Bot },
        { id: 'research' as SettingsNavId, label: 'Research', icon: Search },
      ],
    },
    {
      category: 'TRADING',
      items: [
        { id: 'paper_trading' as SettingsNavId, label: 'Paper Trading', icon: DollarSign },
        { id: 'execution' as SettingsNavId, label: 'Execution', icon: Sliders },
        { id: 'risk_controls' as SettingsNavId, label: 'Risk Controls', icon: Shield },
      ],
    },
    {
      category: 'AUTOMATION',
      items: [
        { id: 'bots' as SettingsNavId, label: 'Bots', icon: Bot },
        { id: 'notifications' as SettingsNavId, label: 'Notifications', icon: Bell },
      ],
    },
    {
      category: 'DATA',
      items: [
        { id: 'data_sources' as SettingsNavId, label: 'Data Sources', icon: HardDrive },
        { id: 'exports' as SettingsNavId, label: 'Exports', icon: Download },
      ],
    },
    {
      category: 'SYSTEM',
      items: [
        { id: 'security' as SettingsNavId, label: 'Security', icon: Lock },
        { id: 'advanced' as SettingsNavId, label: 'Advanced', icon: Terminal },
      ],
    },
  ];

  const allItems = sections.flatMap((s) => s.items);

  return (
    <>
      {/* ── MOBILE / TABLET HORIZONTAL SUB-NAV (< 1024px) ── */}
      <div className="lg:hidden w-full space-y-2 bg-[#080E1A] p-2 rounded-2xl border border-[#1E293B]">
        {/* Horizontal Scrollable Nav Pills */}
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

        {/* Unsaved Changes Banner on Mobile */}
        {unsavedCount > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Unsaved Changes
            </span>
            <span className="text-gray-400 text-[10px]">{unsavedCount} sections modified</span>
          </div>
        )}
      </div>

      {/* ── DESKTOP VERTICAL SUB-SIDEBAR (>= 1024px) ── */}
      <aside className="hidden lg:flex w-56 bg-[#080E1A] border-r border-[#1E293B] flex-col shrink-0 select-none py-3 px-2 space-y-4">
        {/* Navigation Categories */}
        <div className="space-y-3.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">
                {sec.category}
              </div>
              {sec.items.map(({ id, label, icon: Icon }) => {
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
                    <span className="tracking-wide text-[11px]">{label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Unsaved Changes Indicator Bottom Bar */}
        {unsavedCount > 0 && (
          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-amber-500/30 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Unsaved Changes</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">
              {unsavedCount} sections have unsaved changes
            </p>
          </div>
        )}
      </aside>
    </>
  );
};
