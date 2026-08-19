'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  FileCheck,
  TrendingUp,
  ShieldAlert,
  PieChart,
  History,
  BookOpen,
  Maximize2,
  DollarSign,
  Receipt,
  PlusCircle,
  ArrowDownCircle,
  Download,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type PortfolioNavId =
  | 'overview'
  | 'positions'
  | 'orders'
  | 'performance'
  | 'risk'
  | 'allocation'
  | 'history'
  | 'journal'
  | 'exposures'
  | 'cash_flow'
  | 'taxes';

interface PortfolioSidebarProps {
  activeSection: PortfolioNavId;
  onSelectSection: (id: PortfolioNavId) => void;
  buyingPower?: number;
  marginUsed?: number;
  marginFree?: number;
  leverage?: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
}

export const PortfolioSidebar: React.FC<PortfolioSidebarProps> = ({
  activeSection,
  onSelectSection,
  buyingPower = 108430.2,
  marginUsed = 16910.07,
  marginFree = 91520.13,
  leverage = 2.15,
  onDeposit,
  onWithdraw,
  onExport,
  onOpenSettings,
}) => {
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const navItems = [
    { id: 'overview' as PortfolioNavId, label: 'Overview', icon: LayoutDashboard },
    { id: 'positions' as PortfolioNavId, label: 'Positions', icon: Layers },
    { id: 'orders' as PortfolioNavId, label: 'Orders', icon: FileCheck },
    { id: 'performance' as PortfolioNavId, label: 'Performance', icon: TrendingUp },
    { id: 'risk' as PortfolioNavId, label: 'Risk Analytics', icon: ShieldAlert },
    { id: 'allocation' as PortfolioNavId, label: 'Allocation', icon: PieChart },
    { id: 'history' as PortfolioNavId, label: 'History', icon: History },
    { id: 'journal' as PortfolioNavId, label: 'Trade Journal', icon: BookOpen },
    { id: 'exposures' as PortfolioNavId, label: 'Exposures', icon: Maximize2 },
    { id: 'cash_flow' as PortfolioNavId, label: 'Cash Flow', icon: DollarSign },
    { id: 'taxes' as PortfolioNavId, label: 'Taxes', icon: Receipt },
  ];

  return (
    <>
      {/* ── MOBILE / TABLET HORIZONTAL SUB-NAV (< 1024px) ── */}
      <div className="lg:hidden w-full space-y-2 bg-[#080E1A] p-2 rounded-2xl border border-[#1E293B]">
        {/* Horizontal Scrollable Nav Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {navItems.map(({ id, label, icon: Icon }) => {
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

        {/* Mobile Summary Dropdown Toggle */}
        <div className="pt-1 border-t border-gray-800/60">
          <button
            onClick={() => setShowMobileSummary(!showMobileSummary)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-xs text-gray-300 font-bold bg-[#0B111E] rounded-lg border border-gray-800"
          >
            <span className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase">Buying Power:</span>
              <span className="text-emerald-400 font-mono">${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </span>
            {showMobileSummary ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {showMobileSummary && (
            <div className="mt-2 p-3 bg-[#0B111E] rounded-xl border border-gray-800 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400 block text-[10px]">Margin Used</span>
                  <span className="font-bold text-white font-mono">${marginUsed.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Margin Free</span>
                  <span className="font-bold text-white font-mono">${marginFree.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Leverage</span>
                  <span className="font-bold text-cyan-400 font-mono">{leverage}x</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Account</span>
                  <span className="font-bold text-emerald-400">PAPER</span>
                </div>
              </div>

              {/* Quick Actions Mobile */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-800 text-[11px]">
                <button onClick={onDeposit} className="py-1 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center gap-1">
                  <PlusCircle className="w-3 h-3" /> Deposit
                </button>
                <button onClick={onWithdraw} className="py-1 px-2 rounded-lg bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center gap-1">
                  <ArrowDownCircle className="w-3 h-3" /> Withdraw
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP VERTICAL SUB-SIDEBAR (>= 1024px) ── */}
      <aside className="hidden lg:flex w-56 bg-[#080E1A] border-r border-[#1E293B] flex-col shrink-0 select-none py-3 px-2 space-y-4">
        {/* Sub Navigation List */}
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">Portfolio</div>
          {navItems.map(({ id, label, icon: Icon }) => {
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

        {/* Portfolio Summary Card */}
        <div className="px-1">
          <div className="p-3 rounded-xl bg-[#0B111E] border border-[#1E293B] space-y-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Portfolio Summary</div>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-sans">Account Type</span>
                <span className="text-cyan-400 font-bold">PAPER</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-sans">Base Currency</span>
                <span className="text-gray-200 font-bold">USD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-sans">Buying Power</span>
                <span className="text-emerald-400 font-bold">
                  ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-sans">Leverage</span>
                <span className="text-white font-bold">{leverage}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-sans">Margin Used</span>
                <span className="text-gray-300">
                  ${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-sans">Margin Free</span>
                <span className="text-white font-bold">
                  ${marginFree.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions List */}
        <div className="px-1 space-y-1 pt-1">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-2 mb-1">Quick Actions</div>

          <button
            onClick={onDeposit}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-emerald-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deposit Funds</span>
          </button>

          <button
            onClick={onWithdraw}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-rose-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Withdraw Funds</span>
          </button>

          <button
            onClick={onExport}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-cyan-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Report</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-purple-400 hover:bg-[#0E1726] transition-colors text-left"
          >
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            <span>Broker Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
