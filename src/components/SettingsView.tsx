'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Cpu, Check, Download, Wifi, Key, Database, DollarSign, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { aiProviderManager, AIProviderId } from '@/lib/llm/providers';
import { dbPersistence } from '@/lib/db/schema';
import { paperBroker } from '@/lib/broker/paper';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';
import { AppMode } from '@/types/trading';
import { deterministicRiskEngine } from '@/lib/risk/engine';
import { supabaseManager } from '@/lib/db/supabase';

interface SettingsViewProps {
  onModeChange?: (mode: AppMode) => void;
  onCredentialsChange?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onModeChange, onCredentialsChange }) => {
  const [tradingMode, setTradingMode] = useState<'PAPER' | 'SHADOW' | 'LIVE'>('PAPER');
  const [maxRisk, setMaxRisk] = useState<number>(0.5);
  const [maxDrawdown, setMaxDrawdown] = useState<number>(5.0);
  const [minRR, setMinRR] = useState<number>(2.0);
  const [killSwitch, setKillSwitch] = useState<boolean>(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(68);
  const [startingBalance, setStartingBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('aitrader_starting_balance') ?? '10000');
    }
    return 10000;
  });

  // Alpaca API Credentials
  const [alpacaApiKey, setAlpacaApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aitrader_alpaca_api_key') || '';
    }
    return '';
  });

  const [alpacaSecretKey, setAlpacaSecretKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aitrader_alpaca_secret_key') || '';
    }
    return '';
  });

  const [useAlpacaBroker, setUseAlpacaBroker] = useState<boolean>(() => {
    return !!(alpacaApiKey && alpacaSecretKey);
  });

  const [alpacaStatus, setAlpacaStatus] = useState<string | null>(null);

  // Supabase PostgreSQL Credentials
  const [supabaseUrl, setSupabaseUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aitrader_supabase_url') || '';
    }
    return '';
  });

  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aitrader_supabase_anon_key') || '';
    }
    return '';
  });

  const [supabaseStatus, setSupabaseStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState<boolean>(false);

  // AI Provider Credentials
  const [aiProvider, setAiProvider] = useState<AIProviderId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('aitrader_ai_provider') as AIProviderId) || 'mock';
    }
    return 'mock';
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aitrader_ai_api_key') || '';
    }
    return '';
  });

  const [saved, setSaved] = useState<boolean>(false);

  // Initial connection test on mount if keys exist
  useEffect(() => {
    if (alpacaApiKey && alpacaSecretKey) {
      alpacaBrokerClient.setCredentials({
        apiKeyId: alpacaApiKey,
        secretKey: alpacaSecretKey,
        isPaper: true,
      });
      setUseAlpacaBroker(true);
      setAlpacaStatus('Alpaca Credentials Loaded & Active.');
    }

    if (supabaseUrl && supabaseAnonKey) {
      supabaseManager.setCredentials(supabaseUrl, supabaseAnonKey);
    }
  }, []);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    supabaseManager.setCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());
    const res = await supabaseManager.testConnection();
    setSupabaseStatus(res);
    setIsTestingSupabase(false);
  };

  const handleSave = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aitrader_alpaca_api_key', alpacaApiKey.trim());
      localStorage.setItem('aitrader_alpaca_secret_key', alpacaSecretKey.trim());
      localStorage.setItem('aitrader_ai_provider', aiProvider);
      localStorage.setItem('aitrader_ai_api_key', apiKey.trim());
      localStorage.setItem('aitrader_starting_balance', startingBalance.toString());
      localStorage.setItem('aitrader_supabase_url', supabaseUrl.trim());
      localStorage.setItem('aitrader_supabase_anon_key', supabaseAnonKey.trim());
    }

    // Configure Supabase Client
    supabaseManager.setCredentials(supabaseUrl.trim(), supabaseAnonKey.trim());

    // Configure AI Provider
    aiProviderManager.setConfig({
      provider: aiProvider,
      apiKey: apiKey.trim() || undefined,
    });

    // Update risk engine config
    deterministicRiskEngine.setConfig({
      maxPositionRiskPercent: maxRisk,
      maxDailyDrawdownPercent: maxDrawdown,
      minRiskReward: minRR,
      newsKillSwitch: killSwitch,
    });

    // Configure paper broker starting balance
    paperBroker.setStartingBalance(startingBalance);

    // Configure Alpaca Broker
    if (alpacaApiKey.trim() && alpacaSecretKey.trim()) {
      alpacaBrokerClient.setCredentials({
        apiKeyId: alpacaApiKey.trim(),
        secretKey: alpacaSecretKey.trim(),
        isPaper: true,
      });

      try {
        const acc = await alpacaBrokerClient.getAccount();
        setAlpacaStatus(`Connected & Saved! Equity: $${acc.equity.toLocaleString()}`);
        setUseAlpacaBroker(true);
      } catch (e: any) {
        setAlpacaStatus(`Saved to browser, Alpaca status: ${e.message}`);
      }
    } else {
      setAlpacaStatus('Local Paper Broker Active (No Alpaca keys entered).');
      setUseAlpacaBroker(false);
    }

    onCredentialsChange?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleExportDecisions = () => {
    const csv = dbPersistence.exportDecisionsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_quant_decisions_${Date.now()}.csv`;
    a.click();
  };

  const handleExportTrades = () => {
    const trades = paperBroker.getTradeHistory();
    const csv = dbPersistence.exportTradesToCSV(trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_quant_trades_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Quant Engine & Platform Settings
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Configure risk parameters, cloud database storage, API integrations, and execution credentials.
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
            saved
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Saved Successfully!' : 'Save All Settings'}
        </button>
      </div>

      {/* Grid: Broker & Starting Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alpaca Broker Configuration Card */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Alpaca Paper & Live Broker
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
              useAlpacaBroker ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-gray-700 bg-gray-800 text-gray-400'
            }`}>
              {useAlpacaBroker ? 'CONNECTED' : 'LOCAL SIM'}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Alpaca API Key ID</label>
              <input
                type="text"
                placeholder="PK..."
                value={alpacaApiKey}
                onChange={(e) => setAlpacaApiKey(e.target.value)}
                className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Alpaca Secret Key</label>
              <input
                type="password"
                placeholder="Secret key..."
                value={alpacaSecretKey}
                onChange={(e) => setAlpacaSecretKey(e.target.value)}
                className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            {alpacaStatus && (
              <p className="text-[11px] text-gray-400 bg-[#0B111E] p-2.5 rounded-lg border border-gray-800">
                {alpacaStatus}
              </p>
            )}
          </div>
        </div>

        {/* Paper Starting Balance & Capital Setting */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              Starting Paper Balance
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold border border-blue-500/40 bg-blue-500/10 text-blue-400">
              SIMULATED
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Initial Account Equity ($ USD)</label>
              <input
                type="number"
                step="1000"
                min="100"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-bold"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Used to initialize the local Paper Broker accounting ledger when Alpaca keys are not configured.
              </p>
            </div>

            <div className="p-3 bg-[#0B111E] rounded-xl border border-gray-800 text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Commission / Taker Fee:</span>
                <strong className="text-white">0.05% per fill</strong>
              </div>
              <div className="flex justify-between">
                <span>Simulated Market Slippage:</span>
                <strong className="text-white">0.03% (3 bps)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Database (Supabase PostgreSQL) Section */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Cloud Database (Supabase PostgreSQL)
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
            supabaseUrl && supabaseAnonKey ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-gray-700 bg-gray-800 text-gray-400'
          }`}>
            {supabaseUrl && supabaseAnonKey ? 'CONFIGURED' : 'LOCAL CACHE ONLY'}
          </span>
        </div>

        <p className="text-xs text-gray-400">
          Sync all AI decision audit logs, bot session telemetry, executed trades, and positions to a cloud PostgreSQL database for persistent, multi-device access.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Supabase Project URL</label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Supabase Public / Anon API Key</label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestSupabase}
            disabled={isTestingSupabase || !supabaseUrl || !supabaseAnonKey}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B111E] border border-gray-800 hover:border-gray-700 text-gray-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
            Test Supabase Connection
          </button>

          {supabaseStatus && (
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${
              supabaseStatus.success ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {supabaseStatus.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {supabaseStatus.message}
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-500 pt-1">
          💡 Database schema migration script is located at <code className="text-blue-400 font-mono">src/lib/db/migrations/001_initial_trading_schema.sql</code>. Run it once in your Supabase SQL editor to create all tables and indexes.
        </p>
      </div>

      {/* Grid: Data Source & AI Provider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Market Data Source */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            Market Data Source
          </h3>
          <div className="flex items-center justify-between p-3 bg-[#0B111E] rounded-xl border border-gray-800">
            <div>
              <span className="text-sm font-bold text-white block">Exchange Live Stream</span>
              <span className="text-xs text-gray-400">Binance REST (primary) → Alpaca REST (fallback). STALE indicator on delay.</span>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">AUTO</span>
          </div>
        </div>

        {/* LLM Provider Configuration */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            LLM API Provider Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Select AI Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as AIProviderId)}
                className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-bold"
              >
                <option value="mock">Deterministic Fast Engine (Built-in Synthesizer)</option>
                <option value="openai">OpenAI (gpt-4o-mini)</option>
                <option value="anthropic">Anthropic (claude-3-5-haiku)</option>
                <option value="google">Google Gemini (gemini-1.5-flash)</option>
              </select>
            </div>

            {aiProvider !== 'mock' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#0B111E] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV Export & Data Persistence Card */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-400" />
          Data Persistence & CSV Exporter
        </h3>
        <p className="text-xs text-gray-400">Download quantitative trade decisions and closed paper orders for offline statistical backtesting in Python / R.</p>

        <div className="flex gap-4">
          <button
            onClick={handleExportDecisions}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Decision Logs (CSV)
          </button>
          <button
            onClick={handleExportTrades}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Paper Trades (CSV)
          </button>
        </div>
      </div>

      {/* Hard Risk Gate Parameters */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Hard Risk Gate Limits (Deterministic Enforcement)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-gray-300 font-semibold block mb-1">
              Max Position Risk per Trade ({maxRisk}%)
            </label>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.25"
              value={maxRisk}
              onChange={(e) => setMaxRisk(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-[11px] text-gray-500">Hard stop at 2.0% recommended for risk control.</span>
          </div>

          <div>
            <label className="text-xs text-gray-300 font-semibold block mb-1">
              Max Daily Drawdown Limit ({maxDrawdown}%)
            </label>
            <input
              type="range"
              min="2.0"
              max="10.0"
              step="0.5"
              value={maxDrawdown}
              onChange={(e) => setMaxDrawdown(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-[11px] text-gray-500">Trading automatically halts if daily loss reaches this limit.</span>
          </div>

          <div>
            <label className="text-xs text-gray-300 font-semibold block mb-1">
              Mandatory Minimum Risk:Reward Ratio ({minRR}:1)
            </label>
            <input
              type="range"
              min="1.5"
              max="4.0"
              step="0.1"
              value={minRR}
              onChange={(e) => setMinRR(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-[11px] text-gray-500">Rejects trades where reward target is less than {minRR}x stop distance.</span>
          </div>

          <div>
            <label className="text-xs text-gray-300 font-semibold block mb-1">
              AI Decision Confidence Threshold ({confidenceThreshold}%)
            </label>
            <input
              type="range"
              min="60"
              max="95"
              step="1"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-[11px] text-gray-500">Minimum LLM confidence required for trade approval.</span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-white block">Economic News Event Kill Switch</span>
            <span className="text-xs text-gray-400">Pauses all trading 15 minutes before CPI, FOMC, or major macro releases.</span>
          </div>
          <button
            onClick={() => setKillSwitch(!killSwitch)}
            className={`w-12 h-6 rounded-full transition-all relative ${killSwitch ? 'bg-emerald-500' : 'bg-gray-800'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${killSwitch ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
