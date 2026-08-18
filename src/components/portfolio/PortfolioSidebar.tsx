'use client';

import React from 'react';
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
  FileSpreadsheet,
  Settings,
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
    <aside className="w-56 bg-[#080E1A] border-r border-[#1E293B] flex flex-col shrink-0 select-none py-3 px-2 space-y-4">
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
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Portfolio Summary Card */}
      <div className="p-3 rounded-xl bg-[#0B111E] border border-[#1E293B] space-y-2 text-xs">
        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Portfolio Summary</div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-gray-400">Account Type</span>
            <span className="text-cyan-400 font-bold">PAPER</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Base Currency</span>
            <span className="text-white font-semibold">USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Buying Power</span>
            <span className="text-emerald-400 font-bold">${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Leverage</span>
            <span className="text-white font-semibold">{leverage}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Margin Used</span>
            <span className="text-white font-semibold">${marginUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Margin Free</span>
            <span className="text-white font-semibold">${marginFree.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-3 mb-1">Quick Actions</div>
        <button
          onClick={onDeposit}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Deposit Funds</span>
        </button>
        <button
          onClick={onWithdraw}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Withdraw Funds</span>
        </button>
        <button
          onClick={onExport}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Report</span>
        </button>
        <button
          onClick={() => onSelectSection('history')}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#0E1726] transition-colors border border-transparent hover:border-gray-800"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
          <span>Transaction History</span>
        </button>
      </div>

      {/* Bottom Settings Button */}
      <div className="pt-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#0B111E] hover:bg-[#0E1726] border border-[#1E293B] transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-gray-400" />
          <span>Portfolio Settings</span>
        </button>
      </div>
    </aside>
  );
};
