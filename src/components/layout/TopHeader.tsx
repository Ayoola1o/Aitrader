'use client';

import React, { useState } from 'react';
import { Menu, Bell, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AppMode, DataStatus } from '@/types/trading';
import { DataTruthBadge } from '@/components/common/DataTruthBadge';

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  appMode?: AppMode;
  accountEquity?: number;
  todayPnL?: number;
  todayPnLPercent?: number;
  exchangeName?: string;
  isExchangeConnected?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onModeChange?: (mode: AppMode) => void;
  dataStatus?: DataStatus;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title = 'Dashboard',
  subtitle = 'Real-time overview of your AI trading system',
  appMode = 'PAPER',
  accountEquity = 125340.27,
  todayPnL = 1245.31,
  todayPnLPercent = 1.01,
  exchangeName = 'BINANCE',
  isExchangeConnected = true,
  isSidebarCollapsed = false,
  onToggleSidebar,
  dataStatus,
}) => {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'ALL'>('24H');
  const [notificationsCount, setNotificationsCount] = useState(3);

  const isPositive = todayPnL >= 0;

  return (
    <header className="h-16 bg-[#080E1A] border-b border-[#1E293B] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Hamburger & Page Info */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-2 rounded-xl bg-[#0B111E] border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 transition-all flex items-center justify-center shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
            ) : (
              <Menu className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none truncate flex items-center gap-2">
            {title}
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-none truncate hidden xs:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Metrics & Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Data Truth Status Badge (Fix 19) */}
        <DataTruthBadge status={dataStatus || (appMode === 'DEMO' ? 'SIMULATED' : 'LIVE')} />

        {/* Mode Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B111E] border border-[#1E293B] text-[11px] font-semibold text-gray-300">
          <span className={`w-1.5 h-1.5 rounded-full ${appMode === 'LIVE' ? 'bg-rose-400 animate-pulse' : appMode === 'DEMO' ? 'bg-purple-400' : appMode === 'REPLAY' ? 'bg-cyan-400' : 'bg-emerald-400 animate-pulse'}`} />
          <span className="hidden sm:inline">
            {appMode === 'DEMO' ? 'DEMO MODE' : appMode === 'REPLAY' ? 'REPLAY MODE' : appMode === 'LIVE' ? 'LIVE MODE' : 'PAPER MODE'}
          </span>
          <span className="sm:hidden">{appMode}</span>
        </div>

        {/* Exchange Dropdown */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B111E] border border-[#1E293B] text-xs font-semibold text-gray-300">
          <span className="w-2 h-2 rounded-full bg-[#F3BA2F]" />
          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] text-gray-400 font-bold uppercase">{exchangeName}</span>
            <span className="text-[8px] text-emerald-400 font-medium">Connected</span>
          </div>
        </div>

        {/* Account Equity Ticker */}
        <div className="flex flex-col text-right px-2.5 py-1 bg-[#0B111E] rounded-lg border border-[#1E293B]">
          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Equity</span>
          <span className="text-xs sm:text-sm font-bold text-white leading-tight font-mono">
            ${accountEquity >= 1000000 ? `${(accountEquity / 1000000).toFixed(2)}M` : `${accountEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          </span>
        </div>

        {/* Today P&L Ticker */}
        <div className="hidden sm:flex flex-col text-right px-2.5 py-1 bg-[#0B111E] rounded-lg border border-[#1E293B]">
          <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Today P&L</span>
          <span className={`text-xs sm:text-sm font-bold leading-tight font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}${todayPnL.toFixed(0)} <span className="text-[10px] font-normal">({isPositive ? '+' : ''}{todayPnLPercent.toFixed(1)}%)</span>
          </span>
        </div>

        {/* Notification Bell */}
        <div className="relative cursor-pointer p-2 rounded-lg bg-[#0B111E] border border-[#1E293B] text-gray-300 hover:text-white transition-colors">
          <Bell className="w-3.5 h-3.5" />
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center border-2 border-[#080E1A]">
              {notificationsCount}
            </span>
          )}
        </div>

        {/* User Account / Logout */}
        <button
          onClick={() => {
            if (confirm('Sign out from AI Quant Trader?')) {
              window.location.reload();
              if (typeof window !== 'undefined') localStorage.removeItem('aitrader_user_session');
            }
          }}
          title="Click to Sign Out"
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-[#0B111E] border border-gray-800 hover:border-rose-500/40 text-xs text-gray-300 hover:text-white transition-all cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-[10px] font-bold text-white flex items-center justify-center">
            AI
          </div>
          <span className="hidden md:inline font-semibold text-[11px]">Trader</span>
        </button>
      </div>
    </header>
  );
};
