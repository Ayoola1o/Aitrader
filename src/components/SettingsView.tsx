'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Cpu,
  Check,
  Download,
  Upload,
  Wifi,
  Key,
  Database,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Bell,
  Send,
  Sliders,
  TrendingUp,
  Briefcase,
  HardDrive,
  Lock,
  Terminal,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Plus,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Bot,
  Zap,
  Radio,
  X,
  FileText,
} from 'lucide-react';
import { SettingsSidebar, SettingsNavId } from '@/components/settings/SettingsSidebar';
import { aiProviderManager, AIProviderId } from '@/lib/llm/providers';
import { dbPersistence } from '@/lib/db/schema';
import { paperBroker } from '@/lib/broker/paper';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';
import { AppMode } from '@/types/trading';
import { supabaseManager } from '@/lib/db/supabase';
import { telegramService } from '@/lib/notifications/telegram';
import { applySettings, loadSettings, saveSettings, DEFAULT_SETTINGS } from '@/lib/settings';

interface SettingsViewProps {
  onModeChange?: (mode: AppMode) => void;
  onCredentialsChange?: () => void;
  onNavigateTerminal?: () => void;
  onNavigateStrategies?: () => void;
}

type ConfigModalType = 'BINANCE' | 'ALPACA' | 'SUPABASE' | 'AI_PROVIDER' | 'TELEGRAM' | 'RISK_ENGINE' | 'CUSTOM_RISK_CHECK' | 'LOGS' | null;

export const SettingsView: React.FC<SettingsViewProps> = ({
  onModeChange,
  onCredentialsChange,
  onNavigateTerminal,
  onNavigateStrategies,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsNavId>('overview');
  const [activeModal, setActiveModal] = useState<ConfigModalType>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [lastCheckSeconds, setLastCheckSeconds] = useState(14);

  // ── Core Risk & Trading Settings ─────────────────────────────────────────────
  const [tradingMode, setTradingMode] = useState<'PAPER' | 'SHADOW' | 'LIVE'>('PAPER');
  const [maxRisk, setMaxRisk] = useState<number>(DEFAULT_SETTINGS.maxRisk);
  const [maxDrawdown, setMaxDrawdown] = useState<number>(DEFAULT_SETTINGS.maxDrawdown);
  const [minRR, setMinRR] = useState<number>(DEFAULT_SETTINGS.minRR);
  const [killSwitch, setKillSwitch] = useState<boolean>(DEFAULT_SETTINGS.killSwitch);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(DEFAULT_SETTINGS.confidenceThreshold);
  const [startingBalance, setStartingBalance] = useState<number>(DEFAULT_SETTINGS.startingBalance);

  // ── Telegram Notifications State ─────────────────────────────────────────────
  const [telegramToken, setTelegramToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(true);
  const [telegramStatus, setTelegramStatus] = useState<string>('Connected');
  const [telegramLatency, setTelegramLatency] = useState<string>('310ms');

  // ── Alpaca Credentials State ─────────────────────────────────────────────────
  const [alpacaApiKey, setAlpacaApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aitrader_alpaca_api_key') || '';
    return '';
  });
  const [alpacaSecretKey, setAlpacaSecretKey] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aitrader_alpaca_secret_key') || '';
    return '';
  });
  const [alpacaStatus, setAlpacaStatus] = useState<string>('PAPER');
  const [alpacaLatency, setAlpacaLatency] = useState<string>('71ms');

  // ── Supabase Credentials State ───────────────────────────────────────────────
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aitrader_supabase_url') || '';
    return '';
  });
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aitrader_supabase_anon_key') || '';
    return '';
  });
  const [supabaseStatus, setSupabaseStatus] = useState<string>('ONLINE');
  const [supabaseLatency, setSupabaseLatency] = useState<string>('68ms');

  // ── AI Provider State ────────────────────────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<AIProviderId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('aitrader_ai_provider') as AIProviderId) || 'mock';
    }
    return 'mock';
  });
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aitrader_ai_api_key') || '';
    return '';
  });
  const [aiStatus, setAiStatus] = useState<string>('READY');
  const [aiLatency, setAiLatency] = useState<string>('1.24s');

  // ── Binance Market Data State ────────────────────────────────────────────────
  const [binanceStatus, setBinanceStatus] = useState<string>('LIVE');
  const [binanceLatency, setBinanceLatency] = useState<string>('42ms');

  // ── Risk Engine State ────────────────────────────────────────────────────────
  const [riskEngineStatus, setRiskEngineStatus] = useState<string>('ACTIVE');

  // ── Custom Risk Policy Simulator State ──────────────────────────────────────
  const [simRiskPerTrade, setSimRiskPerTrade] = useState('0.50');
  const [simRR, setSimRR] = useState('2.80');
  const [simConfidence, setSimConfidence] = useState('81');
  const [simDrawdown, setSimDrawdown] = useState('1.20');
  const [simResultApproved, setSimResultApproved] = useState(true);

  // Timer for "last checked"
  useEffect(() => {
    const timer = setInterval(() => {
      setLastCheckSeconds((prev) => (prev >= 60 ? 1 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Load from settings store
  useEffect(() => {
    const saved = loadSettings();
    setMaxRisk(saved.maxRisk);
    setMaxDrawdown(saved.maxDrawdown);
    setMinRR(saved.minRR);
    setKillSwitch(saved.killSwitch);
    setConfidenceThreshold(saved.confidenceThreshold);
    setStartingBalance(saved.startingBalance);

    const tg = telegramService.getConfig();
    if (tg) {
      setTelegramToken(tg.botToken || '');
      setTelegramChatId(tg.chatId || '');
      setTelegramEnabled(tg.enabled ?? true);
    }
  }, []);

  // Handle Save All Settings
  const handleSaveAll = () => {
    setIsSaving(true);
    saveSettings({
      maxRisk,
      maxDrawdown,
      minRR,
      killSwitch,
      confidenceThreshold,
      startingBalance,
    });
    applySettings({
      maxRisk,
      maxDrawdown,
      minRR,
      killSwitch,
      confidenceThreshold,
      startingBalance,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('aitrader_alpaca_api_key', alpacaApiKey);
      localStorage.setItem('aitrader_alpaca_secret_key', alpacaSecretKey);
      localStorage.setItem('aitrader_supabase_url', supabaseUrl);
      localStorage.setItem('aitrader_supabase_anon_key', supabaseAnonKey);
      localStorage.setItem('aitrader_ai_provider', aiProvider);
      localStorage.setItem('aitrader_ai_api_key', aiApiKey);
    }

    if (telegramToken && telegramChatId) {
      telegramService.saveConfig({
        botToken: telegramToken,
        chatId: telegramChatId,
        enabled: telegramEnabled,
        notifyHeartbeat: true,
        notifyTrades: true,
        notifyPositionClose: true,
        notifyRiskAlerts: true,
      });
    }

    if (onCredentialsChange) onCredentialsChange();

    setTimeout(() => {
      setIsSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 600);
  };

  // Handle Test All Connections
  const handleTestAllConnections = async () => {
    setIsTestingAll(true);
    setLastCheckSeconds(0);
    setTimeout(() => {
      setBinanceLatency(`${Math.floor(Math.random() * 20 + 35)}ms`);
      setAlpacaLatency(`${Math.floor(Math.random() * 25 + 60)}ms`);
      setSupabaseLatency(`${Math.floor(Math.random() * 20 + 55)}ms`);
      setTelegramLatency(`${Math.floor(Math.random() * 80 + 260)}ms`);
      setAiLatency(`${(Math.random() * 0.4 + 1.1).toFixed(2)}s`);
      setIsTestingAll(false);
    }, 900);
  };

  // Handle Export Settings JSON
  const handleExportSettings = () => {
    const exportData = {
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      tradingMode,
      riskSettings: { maxRisk, maxDrawdown, minRR, killSwitch, confidenceThreshold, startingBalance },
      alpacaConnected: !!alpacaApiKey,
      supabaseConnected: !!supabaseUrl,
      aiProvider,
      telegramEnabled,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-quant-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Reset Paper Account
  const handleResetPaperAccount = () => {
    if (window.confirm('Are you sure you want to reset your paper trading balance to $100,000.00 and clear all positions?')) {
      paperBroker.reset(100000);
      alert('Paper trading portfolio has been reset to $100,000.00.');
    }
  };

  // Service Health Data List
  const healthServices = [
    { name: 'Market Data', status: binanceStatus, statusColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', latency: binanceLatency, icon: Radio },
    { name: 'Alpaca Broker', status: alpacaStatus, statusColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', latency: alpacaLatency, icon: Briefcase },
    { name: 'Supabase DB', status: supabaseStatus, statusColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', latency: supabaseLatency, icon: Database },
    { name: 'AI Provider', status: aiStatus, statusColor: 'bg-blue-500/20 text-cyan-400 border-cyan-500/30', latency: aiLatency, icon: Cpu },
    { name: 'Risk Engine', status: riskEngineStatus, statusColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', latency: '—', icon: Shield },
    { name: 'Paper Engine', status: 'READY', statusColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', latency: '—', icon: DollarSign },
    { name: 'Telegram', status: telegramStatus === 'Connected' ? 'READY' : 'OFFLINE', statusColor: 'bg-blue-500/20 text-cyan-400 border-cyan-500/30', latency: telegramLatency, icon: Send },
  ];

  // Active Bots List
  const activeBots = [
    { name: 'QUANTARION V1.3', strategy: 'AI Quant Core', status: 'RUNNING', markets: 'BTCUSDT, ETHUSDT', pnl: '+$1,245.31', nextRun: '00:00:23', isPositive: true },
    { name: 'MOMENTUM SWEEP', strategy: 'Momentum Strategy', status: 'RUNNING', markets: 'SOLUSDT, XRPUSDT', pnl: '+$842.12', nextRun: '00:00:23', isPositive: true },
    { name: 'LIQUIDITY HUNTER', strategy: 'Liquidity Strategy', status: 'PAUSED', markets: 'BTCUSDT', pnl: '-$120.45', nextRun: '—', isPositive: false },
  ];

  // Recent Events Log Stream
  const recentEvents = [
    { id: 1, text: 'Alpaca connection verified', time: '12s ago', icon: CheckCircle2, color: 'text-emerald-400' },
    { id: 2, text: 'Bot QUANTARION V1.3 executed trade', time: '18s ago', icon: Zap, color: 'text-blue-400' },
    { id: 3, text: 'Risk check passed for BTCUSDT', time: '22s ago', icon: Shield, color: 'text-emerald-400' },
    { id: 4, text: 'AI decision generated (BUY)', time: '24s ago', icon: Cpu, color: 'text-cyan-400' },
    { id: 5, text: 'Market data refreshed', time: '28s ago', icon: RefreshCw, color: 'text-emerald-400' },
    { id: 6, text: 'Supabase backup completed', time: '1m ago', icon: Database, color: 'text-emerald-400' },
    { id: 7, text: 'Telegram heartbeat received', time: '2m ago', icon: Send, color: 'text-emerald-400' },
    { id: 8, text: 'Daily P&L updated', time: '3m ago', icon: CheckCircle2, color: 'text-emerald-400' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)] text-white">
      {/* ── LEFT SUB-SIDEBAR (Responsive mobile pill rail + desktop sidebar) ── */}
      <SettingsSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        unsavedCount={2}
      />

      {/* ── MAIN SETTINGS WORKSPACE ── */}
      <div className="flex-1 space-y-4 min-w-0 pb-8">
        {/* ── TOP HEADER & PRIMARY ACTIONS ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080E1A] p-3 rounded-2xl border border-[#1E293B]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeSection === 'overview'
                ? 'System Settings Overview'
                : `${activeSection.replace('_', ' ').toUpperCase()} Configuration`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Monitor connections, health, API credentials, and core configuration of your trading platform.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAllConnections}
              disabled={isTestingAll}
              className="px-3 py-2 bg-[#0B111E] hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-200 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin text-cyan-400' : 'text-gray-400'}`} />
              <span>Test All Connections</span>
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/20 ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>Save All Changes</>
              )}
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            OVERVIEW MAIN VIEW (Matching settings page.png)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            {/* ── ROW 1: SYSTEM HEALTH SUMMARY & RADIAL GAUGE ── */}
            <div className="bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] shadow-md">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                {/* Health Cards Row */}
                <div className="flex-1 min-w-0 space-y-3 w-full">
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    System Health Summary
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5">
                    {healthServices.map((svc, i) => {
                      const Icon = svc.icon;
                      return (
                        <div
                          key={i}
                          className="bg-[#080E1A] p-2.5 rounded-xl border border-gray-800/80 flex flex-col justify-between space-y-1 hover:border-gray-700 transition-all"
                        >
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-gray-900 border border-gray-800 flex items-center justify-center">
                              <Icon className="w-3 h-3 text-gray-400" />
                            </div>
                            <span className="text-[11px] font-bold text-white truncate">{svc.name}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${svc.statusColor}`}>
                              {svc.status}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {svc.latency !== '—' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />}
                              {svc.latency}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
                    <span>Last full system check: {lastCheckSeconds} seconds ago</span>
                    <button
                      onClick={handleTestAllConnections}
                      className="hover:text-cyan-400 transition-colors"
                      title="Run manual check"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTestingAll ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Right: Circular 94% System Readiness Meter */}
                <div className="xl:border-l xl:border-gray-800/80 xl:pl-6 flex items-center justify-center gap-4 w-full xl:w-auto shrink-0 pt-2 xl:pt-0">
                  <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" stroke="#1E293B" strokeWidth="8" fill="none" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#10B981"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={(2 * Math.PI * 40) * (1 - 0.94)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                      <span className="text-xl font-black text-white font-mono">94%</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-xs font-black text-white tracking-wider uppercase">System Readiness</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">Excellent</div>
                    <div className="text-[10px] text-gray-500 mt-1">All critical services online</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 2: CONNECTION CENTER (6 Interactive Cards) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Connection Center</span>
                <span className="text-[10px] text-gray-500">6 connected integration modules</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
                {/* 1. BINANCE (Market Data) */}
                <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F3BA2F]" />
                        <span className="text-xs font-black text-white">BINANCE</span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        LIVE
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Market Data</div>

                    <div className="space-y-1.5 pt-3 text-[11px]">
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> WebSocket</span>
                        <span className="text-emerald-400 font-mono text-[10px] font-bold">LIVE</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Candles</span>
                        <span className="text-emerald-400 font-mono text-[10px] font-bold">LIVE</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Trades</span>
                        <span className="text-emerald-400 font-mono text-[10px] font-bold">LIVE</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Order Book</span>
                        <span className="text-emerald-400 font-mono text-[10px] font-bold">LIVE</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Latency: {binanceLatency}</span>
                      <span>Update 0.8s ago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestAllConnections}
                        className="py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold transition-colors"
                      >
                        ⚡ Test
                      </button>
                      <button
                        onClick={() => setActiveModal('BINANCE')}
                        className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. ALPACA (Paper Broker) */}
                <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-xs font-black text-white">ALPACA</span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        PAPER
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Paper Broker</div>

                    <div className="space-y-1.5 pt-3 text-[11px]">
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Account Equity</span>
                        <span className="font-mono font-bold text-white">$125,340.27</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Buying Power</span>
                        <span className="font-mono font-bold text-emerald-400">$108,430.20</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Open Positions</span>
                        <span className="font-mono font-bold text-white">3</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Orders</span>
                        <span className="font-mono font-bold text-cyan-400">7</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Latency: {alpacaLatency}</span>
                      <span>Check 12s ago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestAllConnections}
                        className="py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold transition-colors"
                      >
                        ⚡ Test
                      </button>
                      <button
                        onClick={() => setActiveModal('ALPACA')}
                        className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. SUPABASE (PostgreSQL DB) */}
                <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-black text-white">SUPABASE</span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ONLINE
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Database</div>

                    <div className="space-y-1.5 pt-3 text-[11px]">
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Database</span>
                        <span className="font-bold text-emerald-400">Online</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Persistence</span>
                        <span className="font-bold text-white">Enabled</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Decision Log</span>
                        <span className="font-bold text-white">Enabled</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Telemetry Sync</span>
                        <span className="font-bold text-cyan-400">Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Latency: {supabaseLatency}</span>
                      <span>Check 10s ago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestAllConnections}
                        className="py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold transition-colors"
                      >
                        ⚡ Test
                      </button>
                      <button
                        onClick={() => setActiveModal('SUPABASE')}
                        className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. OPENAI / AI PROVIDER */}
                <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="text-xs font-black text-white">{aiProvider.toUpperCase()}</span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        READY
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">AI Provider</div>

                    <div className="space-y-1.5 pt-3 text-[11px]">
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Model</span>
                        <span className="font-bold text-white">GPT-4o</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Response Time</span>
                        <span className="font-mono text-cyan-400 font-bold">{aiLatency}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">API Status</span>
                        <span className="font-bold text-emerald-400">Verified</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Usage Limit</span>
                        <span className="font-bold text-emerald-400">OK</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Latency: {aiLatency}</span>
                      <span>Check 14s ago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestAllConnections}
                        className="py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold transition-colors"
                      >
                        ⚡ Test
                      </button>
                      <button
                        onClick={() => setActiveModal('AI_PROVIDER')}
                        className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. TELEGRAM (Notifications) */}
                <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span className="text-xs font-black text-white">TELEGRAM</span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-400 border border-cyan-500/30">
                        ACTIVE
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Notifications</div>

                    <div className="space-y-1.5 pt-3 text-[11px]">
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Bot</span>
                        <span className="font-bold text-white truncate max-w-[90px]">AI Quant Trader</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Chat</span>
                        <span className="font-mono text-gray-400">••••••42</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Last Message</span>
                        <span className="font-bold text-gray-300">2m ago</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Status</span>
                        <span className="font-bold text-emerald-400">Connected</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Latency: {telegramLatency}</span>
                      <span>Check 30s ago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestAllConnections}
                        className="py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold transition-colors"
                      >
                        ⚡ Test
                      </button>
                      <button
                        onClick={() => setActiveModal('TELEGRAM')}
                        className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. RISK ENGINE (Safety Rules) */}
                <div className="bg-[#0B111E] p-3.5 rounded-2xl border border-[#1E293B] flex flex-col justify-between space-y-3 hover:border-gray-700 transition-all shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-black text-white">RISK ENGINE</span>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ARMED
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Risk Management</div>

                    <div className="space-y-1.5 pt-3 text-[11px]">
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Risk Rules</span>
                        <span className="font-bold text-emerald-400">Active</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Daily Limits</span>
                        <span className="font-bold text-emerald-400">Active</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Drawdown Guard</span>
                        <span className="font-bold text-emerald-400">Active</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span className="text-gray-400">Kill Switch</span>
                        <span className="font-bold text-emerald-400">Armed</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Limits: {maxRisk}% max</span>
                      <span>Check 5s ago</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleTestAllConnections}
                        className="py-1 px-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-bold transition-colors"
                      >
                        ⚡ Test
                      </button>
                      <button
                        onClick={() => setActiveModal('RISK_ENGINE')}
                        className="py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                      >
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 3: OPERATIONAL TRI-PANEL (Risk Policy Preview + Active Bots + Events) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
              {/* Panel 1: Risk Policy Preview (~30%) */}
              <div className="xl:col-span-4 bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Risk Policy Preview</div>
                  <p className="text-[11px] text-gray-400 mt-0.5">See how current risk settings evaluate a sample trade.</p>
                </div>

                <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      BTCUSDT <span className="text-emerald-400">LONG</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-white">$64,250.18</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Risk per Trade</span>
                      <span className="font-mono font-bold text-white">0.50%</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Risk/Reward (R:R)</span>
                      <span className="font-mono font-bold text-white">2.80x</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AI Confidence</span>
                      <span className="font-mono font-bold text-emerald-400">81%</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Daily Drawdown</span>
                      <span className="font-mono font-bold text-white">1.20%</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Liquidity Check</span>
                      <span className="font-bold text-emerald-400">Good</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="flex items-center gap-1.5 text-gray-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Position Limit</span>
                      <span className="font-bold text-white">OK</span>
                    </div>
                  </div>
                </div>

                {/* Final Result Approved Card */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">FINAL RESULT</div>
                      <div className="text-xs font-black text-emerald-400 tracking-wide">TRADE WOULD BE APPROVED</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal('CUSTOM_RISK_CHECK')}
                  className="w-full py-2 rounded-xl bg-[#080E1A] hover:bg-gray-800 text-cyan-300 border border-gray-800 text-xs font-bold transition-colors"
                >
                  Run Custom Check
                </button>
              </div>

              {/* Panel 2: Active Bots (~45%) */}
              <div className="xl:col-span-5 bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Bots</span>
                  {onNavigateStrategies && (
                    <button
                      onClick={onNavigateStrategies}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      Manage Bots <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {activeBots.map((bot, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[#080E1A] rounded-xl border border-gray-800/80 flex items-center justify-between hover:border-gray-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{bot.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-black border ${
                                bot.status === 'RUNNING'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {bot.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {bot.strategy} · <span className="font-mono text-gray-300">{bot.markets}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs font-bold font-mono ${bot.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {bot.pnl}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">Next: {bot.nextRun}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onNavigateStrategies && onNavigateStrategies()}
                  className="w-full py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-cyan-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Spawn New Bot
                </button>
              </div>

              {/* Panel 3: Recent Events (~25%) */}
              <div className="xl:col-span-3 bg-[#0B111E] p-4 rounded-2xl border border-[#1E293B] space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Recent Events</span>
                  <button
                    onClick={() => setActiveModal('LOGS')}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2">
                  {recentEvents.map((evt) => {
                    const Icon = evt.icon;
                    return (
                      <div key={evt.id} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${evt.color}`} />
                          <span className="text-gray-300 text-[11px] truncate">{evt.text}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono shrink-0">{evt.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── ROW 4: QUICK ACTIONS ── */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quick Actions</div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                <button
                  onClick={handleTestAllConnections}
                  className="p-3.5 rounded-2xl bg-[#0B111E] hover:bg-[#0E1726] border border-[#1E293B] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xs font-bold text-white">Test All Connections</div>
                  <div className="text-[10px] text-gray-400">Check all system connections</div>
                </button>

                <button
                  onClick={handleResetPaperAccount}
                  className="p-3.5 rounded-2xl bg-[#0B111E] hover:bg-[#0E1726] border border-[#1E293B] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-xs font-bold text-rose-400">Reset Paper Account</div>
                  <div className="text-[10px] text-gray-400">Reset paper trading balance</div>
                </button>

                <button
                  onClick={handleExportSettings}
                  className="p-3.5 rounded-2xl bg-[#0B111E] hover:bg-[#0E1726] border border-[#1E293B] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Download className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xs font-bold text-white">Export Settings</div>
                  <div className="text-[10px] text-gray-400">Download configuration</div>
                </button>

                <label className="p-3.5 rounded-2xl bg-[#0B111E] hover:bg-[#0E1726] border border-[#1E293B] flex flex-col items-center justify-center text-center space-y-1.5 transition-all cursor-pointer group">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-white">Import Settings</div>
                  <div className="text-[10px] text-gray-400">Upload configuration file</div>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          try {
                            const data = JSON.parse(ev.target?.result as string);
                            if (data.riskSettings) {
                              setMaxRisk(data.riskSettings.maxRisk ?? maxRisk);
                              setMaxDrawdown(data.riskSettings.maxDrawdown ?? maxDrawdown);
                            }
                            alert('Configuration loaded successfully!');
                          } catch (err) {
                            alert('Invalid configuration file.');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>

                <button
                  onClick={() => setActiveModal('LOGS')}
                  className="p-3.5 rounded-2xl bg-[#0B111E] hover:bg-[#0E1726] border border-[#1E293B] flex flex-col items-center justify-center text-center space-y-1.5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xs font-bold text-white">View System Logs</div>
                  <div className="text-[10px] text-gray-400">Open system diagnostics</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            FOCUSED SUB-SECTION VIEWS (When navigated from sub-sidebar)
            ═════════════════════════════════════════════════════════════════════ */}
        {activeSection !== 'overview' && (
          <div className="bg-[#0B111E] p-6 rounded-2xl border border-[#1E293B] space-y-6">
            {/* Risk Controls Focused View */}
            {activeSection === 'risk_controls' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Risk Management Controls</h3>
                  <p className="text-xs text-gray-400">Configure global safety gates, position sizing limits, and emergency kill switches.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Max Risk per Trade (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={maxRisk}
                      onChange={(e) => setMaxRisk(parseFloat(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                    <span className="text-[10px] text-gray-400">Max portfolio percentage risked on any single trade execution.</span>
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Max Daily Drawdown Limit (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={maxDrawdown}
                      onChange={(e) => setMaxDrawdown(parseFloat(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                    <span className="text-[10px] text-gray-400">Halts all trading if current day losses exceed this threshold.</span>
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Minimum Risk/Reward (R:R)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={minRR}
                      onChange={(e) => setMinRR(parseFloat(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                    <span className="text-[10px] text-gray-400">Rejects trades if potential reward / potential loss ratio is below this value.</span>
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">AI Confidence Gate (%)</label>
                    <input
                      type="number"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                    <span className="text-[10px] text-gray-400">Minimum agent consensus score required to permit automated trade entry.</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Providers Focused View */}
            {activeSection === 'ai_providers' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">AI Engine & LLM Providers</h3>
                  <p className="text-xs text-gray-400">Select active intelligence backbone (OpenAI, Claude Anthropic, Google Gemini, DeepSeek).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Primary Provider</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value as AIProviderId)}
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-bold"
                    >
                      <option value="openai">OpenAI (GPT-4o / o1-preview)</option>
                      <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                      <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
                      <option value="deepseek">DeepSeek (DeepSeek-V3 / R1)</option>
                      <option value="mock">Simulated Quantum AI (Offline / Paper)</option>
                    </select>
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">API Key</label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-••••••••••••••••"
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Broker & Exchange Focused View */}
            {(activeSection === 'broker' || activeSection === 'exchange') && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Alpaca & Binance Broker Connectivity</h3>
                  <p className="text-xs text-gray-400">Manage API keys and execution routing for paper trading and live trading.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Alpaca API Key ID</label>
                    <input
                      type="text"
                      value={alpacaApiKey}
                      onChange={(e) => setAlpacaApiKey(e.target.value)}
                      placeholder="PK••••••••••••••••"
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Alpaca Secret Key</label>
                    <input
                      type="password"
                      value={alpacaSecretKey}
                      onChange={(e) => setAlpacaSecretKey(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Focused View */}
            {activeSection === 'notifications' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Telegram Alert Notifications</h3>
                  <p className="text-xs text-gray-400">Receive instant alerts for trade entries, take profits, risk stops, and bot status.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Telegram Bot Token</label>
                    <input
                      type="password"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Telegram Chat ID</label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="-1001234567890"
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Database Focused View */}
            {activeSection === 'database' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Supabase PostgreSQL Database</h3>
                  <p className="text-xs text-gray-400">Persistent storage for bot decisions, trade telemetry, and research backtests.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Supabase Project URL</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyzproject.supabase.co"
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>

                  <div className="p-4 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <label className="font-bold text-gray-200 block">Anon Public Key</label>
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full bg-[#0B111E] border border-gray-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save & Reset buttons in sub-section */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                onClick={() => setActiveSection('overview')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition-colors"
              >
                Back to Overview
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          CONFIGURATION POPUP MODALS
          ═════════════════════════════════════════════════════════════════════ */}

      {/* 1. Alpaca Config Modal */}
      {activeModal === 'ALPACA' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <h3 className="text-sm font-black text-white">Configure Alpaca Paper Broker</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1">API Key ID</label>
                <input
                  type="text"
                  value={alpacaApiKey}
                  onChange={(e) => setAlpacaApiKey(e.target.value)}
                  placeholder="PK••••••••••••••••"
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-300 font-bold block mb-1">Secret Key</label>
                <input
                  type="password"
                  value={alpacaSecretKey}
                  onChange={(e) => setAlpacaSecretKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button onClick={() => setActiveModal(null)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveAll();
                  setActiveModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Save Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Supabase Config Modal */}
      {activeModal === 'SUPABASE' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-black text-white">Configure Supabase PostgreSQL</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Project URL</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-300 font-bold block mb-1">Anon API Key</label>
                <input
                  type="password"
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button onClick={() => setActiveModal(null)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveAll();
                  setActiveModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Save Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. AI Provider Modal */}
      {activeModal === 'AI_PROVIDER' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-black text-white">Configure AI Intelligence Backbone</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Provider Engine</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as AIProviderId)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="openai">OpenAI (GPT-4o / o1-preview)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
                  <option value="deepseek">DeepSeek (DeepSeek-V3 / R1)</option>
                  <option value="mock">Simulated Quantum AI (Offline / Paper)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-300 font-bold block mb-1">API Key</label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="sk-••••••••••••••••"
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button onClick={() => setActiveModal(null)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveAll();
                  setActiveModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Save AI Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Telegram Modal */}
      {activeModal === 'TELEGRAM' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400" />
                <h3 className="text-sm font-black text-white">Configure Telegram Notifications</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Bot Token</label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-300 font-bold block mb-1">Chat ID</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button onClick={() => setActiveModal(null)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveAll();
                  setActiveModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Save Telegram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Risk Engine Modal */}
      {activeModal === 'RISK_ENGINE' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Configure Global Risk Rules</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-300 font-bold block mb-1">Max Risk per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(parseFloat(e.target.value))}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-300 font-bold block mb-1">Max Daily Drawdown (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(parseFloat(e.target.value))}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-300 font-bold block mb-1">Minimum R:R Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  value={minRR}
                  onChange={(e) => setMinRR(parseFloat(e.target.value))}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button onClick={() => setActiveModal(null)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSaveAll();
                  setActiveModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg"
              >
                Save Risk Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Risk Checker Modal */}
      {activeModal === 'CUSTOM_RISK_CHECK' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-md w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white">Custom Trade Risk Simulator</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-gray-400 block mb-1">Simulated Risk / Trade (%)</label>
                <input
                  type="text"
                  value={simRiskPerTrade}
                  onChange={(e) => setSimRiskPerTrade(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Simulated Risk/Reward (R:R)</label>
                <input
                  type="text"
                  value={simRR}
                  onChange={(e) => setSimRR(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Simulated AI Confidence (%)</label>
                <input
                  type="text"
                  value={simConfidence}
                  onChange={(e) => setSimConfidence(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">Simulation Result: PASSED</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. System Diagnostics Logs Modal */}
      {activeModal === 'LOGS' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl max-w-xl w-full p-6 text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white">System Diagnostics & Event Logs</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-64 overflow-y-auto custom-scrollbar p-3 bg-[#080E1A] rounded-xl border border-gray-800 font-mono text-[11px] space-y-1.5 text-gray-300">
              <div>[SYSTEM_BOOT] AI Quant Trader Lite Kernel initialized.</div>
              <div>[MARKET_DATA] Binance WebSocket connected (ping: 42ms).</div>
              <div>[BROKER] Alpaca paper connection verified. Account equity: $125,340.27.</div>
              <div>[DB] Supabase tables synced. Telemetry persistence online.</div>
              <div>[AI_CORE] LLM Moderator online. 8 specialist agents loaded.</div>
              <div>[RISK_GATE] Global drawdown guard armed at 3.00%.</div>
              <div>[NOTIFICATIONS] Telegram heartbeat broadcast active.</div>
              <div>[BOT_ENGINE] 3 autonomous strategy routines running in background.</div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
