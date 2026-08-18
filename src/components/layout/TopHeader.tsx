'use client';

import React, { useState } from 'react';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { AppMode } from '@/types/trading';

interface TopHeaderProps {
  title?: string;
  subtitle?: string;
  appMode?: AppMode;
  accountEquity?: number;
  todayPnL?: number;
  todayPnLPercent?: number;
  exchangeName?: string;
  isExchangeConnected?: boolean;
  onToggleSidebar?: () => void;
  onModeChange?: (mode: AppMode) => void;
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
  onToggleSidebar,
}) => {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'ALL'>('24H');
  const [notificationsCount, setNotificationsCount] = useState(3);

  const isPositive = todayPnL >= 0;

  return (
    <header className="h-16 bg-[#080E1A] border-b border-[#1E293B] px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Hamburger & Page Info */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#0E1726] transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-none flex items-center gap-2">
            {title}
          </h1>
          <p className="text-xs text-gray-400 mt-1 leading-none">{subtitle}</p>
        </div>
      </div>

      {/* Right: Metrics & Controls */}
      <div className="flex items-center gap-4">
        {/* Mode Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-xs font-semibold text-gray-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
          <span>{appMode === 'DEMO' ? 'DEMO MODE' : 'PAPER MODE'}</span>
        </div>

        {/* Exchange Dropdown */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B111E] border border-[#1E293B] text-xs font-semibold text-gray-300 cursor-pointer hover:border-gray-700 transition-colors">
          <span className="w-2 h-2 rounded-full bg-[#F3BA2F]" />
          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] text-gray-400 font-bold uppercase">{exchangeName}</span>
            <span className="text-[9px] text-emerald-400 font-medium">Connected</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
        </div>

        {/* Account Equity Ticker */}
        <div className="hidden sm:flex flex-col text-right px-3 py-1 bg-[#0B111E] rounded-lg border border-[#1E293B]">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Account Equity</span>
          <span className="text-sm font-bold text-white leading-tight">
            ${accountEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Today P&L Ticker */}
        <div className="hidden md:flex flex-col text-right px-3 py-1 bg-[#0B111E] rounded-lg border border-[#1E293B]">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Today P&L</span>
          <span className={`text-sm font-bold leading-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}${todayPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs font-normal">({isPositive ? '+' : ''}{todayPnLPercent.toFixed(2)}%)</span>
          </span>
        </div>

        {/* Notification Bell */}
        <div className="relative cursor-pointer p-2 rounded-lg bg-[#0B111E] border border-[#1E293B] text-gray-300 hover:text-white transition-colors">
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#080E1A]">
              {notificationsCount}
            </span>
          )}
        </div>

        {/* Timeframe Selector Dropdown */}
        <div className="relative">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="appearance-none bg-[#0B111E] border border-[#1E293B] text-gray-300 text-xs font-semibold rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="1H">1H</option>
            <option value="24H">24H</option>
            <option value="7D">7D</option>
            <option value="30D">30D</option>
            <option value="ALL">ALL</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
        </div>
      </div>
    </header>
  );
};
