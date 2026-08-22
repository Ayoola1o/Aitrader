'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { StrategyInspector, StrategyItemData } from '@/components/strategy/StrategyInspector';
import {
  Bot,
  Zap,
  TrendingUp,
  Brain,
  Flame,
  Wind,
  Search,
  Edit2,
  ListOrdered,
  Copy,
  Trash2,
  Plus,
  Play,
  Pause,
  Square,
  X,
  CheckCircle2,
  RefreshCw,
  Download,
  Settings,
} from 'lucide-react';
import { SymbolId, MarketSnapshot, PortfolioState, Position, TradeHistoryItem } from '@/types/trading';
import { featureEngine } from '@/lib/features/engine';
import { specialistAgentSystem } from '@/lib/agents/specialists';
import { signalFusionEngine } from '@/lib/fusion/engine';
import { BotConfig } from '@/lib/bot/engine';

export interface StrategyViewProps {
  snapshot?: MarketSnapshot;
  portfolio?: PortfolioState | null;
  positions?: Position[];
  tradeHistory?: TradeHistoryItem[];
  activeSymbol?: SymbolId;
  onSelectSymbol?: (symbol: SymbolId) => void;
  onNavigateDashboard?: () => void;
  onNavigateTerminal?: () => void;
  onNavigateSettings?: () => void;
  onSpawnBot?: (config: BotConfig) => void;
}

export interface BotStrategyItem extends StrategyItemData {
  symbol: SymbolId;
  iconType: string;
  cycleIntervalSeconds: number;
  allocatedCapitalVal: number;
  cyclesCompleted: number;
  tradesExecuted: number;
  logs: Array<{ id: number; time: number; level: 'INFO' | 'ACTION' | 'WARN' | 'ERROR'; message: string }>;
}

export const StrategyView: React.FC<StrategyViewProps> = ({
  snapshot,
  portfolio,
  positions = [],
  tradeHistory = [],
  activeSymbol = 'BTCUSDT',
  onSelectSymbol,
  onNavigateDashboard,
  onNavigateTerminal,
  onNavigateSettings,
  onSpawnBot,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'marketplace' | 'portfolio' | 'reports' | 'research'>('overview');
  const statusFilter: string = 'ALL';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('strat-1');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  const [activeLogBot, setActiveLogBot] = useState<BotStrategyItem | null>(null);
  const [editingBot, setEditingBot] = useState<BotStrategyItem | null>(null);

  // Import Strategy Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState(`name: "Hawk Breakout Strikers"
symbol: "BTCUSDT"
version: "v1.0"
allocatedCapital: 2500
cycleIntervalSeconds: 30
riskLimits:
  maxPositionSize: 2.5
  dailyDrawdownLimit: 4.5
agentWeights:
  technical: 95
  liquidity: 85
  sentiment: 70
  macro: 50
  execution: 80`);
  const [importError, setImportError] = useState('');

  // Global Strategy Settings State
  const [showGlobalSettingsModal, setShowGlobalSettingsModal] = useState(false);
  const [globalStrategySettings, setGlobalStrategySettings] = useState({
    maxAggregateLeverage: 5,
    maxDailyDrawdown: 5.0,
    emergencyHaltAll: false,
    autoRestartOnReconnect: true,
    slippageToleranceBps: 15,
    newsKillSwitch: true,
    telegramStrategyAlerts: true,
  });

  // Prebuilt Custom Institutional Strategy Templates
  const PREBUILT_STRATEGY_TEMPLATES = [
    {
      id: 'ai-core',
      name: 'AI Quant Core v1.3',
      presetLabel: '🤖 AI Quant Core (Multi-Agent Fusion + LLM)',
      symbol: 'BTCUSDT',
      capital: 5000,
      interval: '30',
      maxDD: '5.0',
      maxPos: '2.0',
      desc: '5-specialist agent ensemble with neural signal fusion and deterministic risk gate.',
      badge: 'FLAGSHIP',
    },
    {
      id: 'hawk-breakout',
      name: 'Hawk — 7-Day Range Breakout',
      presetLabel: '🦅 Hawk (Breakout Strikers · BTC/ETH/SOL)',
      symbol: 'BTCUSDT',
      capital: 2500,
      interval: '30',
      maxDD: '4.5',
      maxPos: '2.5',
      desc: 'Confirmed 7-day range breaks with smart-money alignment; tight 8% Phase 1 stop.',
      badge: 'BREAKOUT',
    },
    {
      id: 'camel-carry',
      name: 'Camel — Funding Carry Arbitrage',
      presetLabel: '🐫 Camel (Funding Carry · Hyperliquid L1)',
      symbol: 'ETHUSDT',
      capital: 3000,
      interval: '60',
      maxDD: '4.0',
      maxPos: '3.0',
      desc: 'Harvests perp funding carry across liquid pairs with crowd exhaustion filters.',
      badge: 'CARRY / NEUTRAL',
    },
    {
      id: 'whalehunter',
      name: 'WhaleHunter — Smart Money Mirror',
      presetLabel: '🐋 WhaleHunter (Smart Money Divergence Mirror)',
      symbol: 'SOLUSDT',
      capital: 4000,
      interval: '30',
      maxDD: '5.0',
      maxPos: '2.0',
      desc: 'Mirrors ≥$1M realized whale wallet positioning while fading retail crowd traps.',
      badge: 'SMART MONEY',
    },
    {
      id: 'viper-smc',
      name: 'Viper — SMC / ICT Order Blocks',
      presetLabel: '🐍 Viper (SMC/ICT Fair Value Gaps & Sweeps)',
      symbol: 'BTCUSDT',
      capital: 3500,
      interval: '15',
      maxDD: '3.5',
      maxPos: '1.5',
      desc: 'Smart Money Concepts targeting liquidity sweep wicks and Fair Value Gap retests.',
      badge: 'ICT / SMC',
    },
    {
      id: 'hornet-semis',
      name: 'Hornet — AI Semis Momentum',
      presetLabel: '🐝 Hornet (Semiconductor AI Hardware Momentum)',
      symbol: 'ETHUSDT',
      capital: 2000,
      interval: '15',
      maxDD: '6.0',
      maxPos: '2.5',
      desc: 'High-beta momentum momentum targeting tech supply-chain catalysts.',
      badge: 'HIGH ALPHA',
    },
    {
      id: 'dire-oil',
      name: 'Dire — Macro Energy & Oil',
      presetLabel: '🛢️ Dire (BRENTOIL Crude Supply Shock Specialist)',
      symbol: 'BTCUSDT',
      capital: 2000,
      interval: '60',
      maxDD: '4.0',
      maxPos: '2.0',
      desc: 'Trades macroeconomic energy inventory breaks and geopolitical supply shocks.',
      badge: 'COMMODITIES',
    },
    {
      id: 'ram-gold',
      name: 'Ram — Safe-Haven Gold Specialist',
      presetLabel: '🥇 Ram (Safe-Haven Gold & Real Rates Hedge)',
      symbol: 'BTCUSDT',
      capital: 3000,
      interval: '300',
      maxDD: '3.0',
      maxPos: '2.0',
      desc: 'Macro hedge tracking real interest rates, dollar debasement, and flight-to-safety.',
      badge: 'DEFENSIVE',
    },
    {
      id: 'cheetah-sniper',
      name: 'Cheetah — Multi-Signal Scalper',
      presetLabel: '🐆 Cheetah (High-Frequency Confluence Sniper)',
      symbol: 'SOLUSDT',
      capital: 1500,
      interval: '15',
      maxDD: '4.0',
      maxPos: '1.0',
      desc: 'Fast 15-second orderbook spread scalp on sudden microstructure imbalances.',
      badge: 'SCALPER',
    },
    {
      id: 'custom-arch',
      name: 'Custom Quant Bot',
      presetLabel: '⚡ Custom Architecture (User-Defined)',
      symbol: 'BTCUSDT',
      capital: 1000,
      interval: '30',
      maxDD: '5.0',
      maxPos: '2.0',
      desc: 'Fully customizable parameters, risk thresholds, and scan cadence.',
      badge: 'CUSTOM',
    },
  ];

  // New Bot Form State
  const [newBotName, setNewBotName] = useState('AI Quant Core v1.3');
  const [newBotSymbol, setNewBotSymbol] = useState<SymbolId>('BTCUSDT');
  const [newBotCapital, setNewBotCapital] = useState('5000');
  const [newBotInterval, setNewBotInterval] = useState('30');
  const [newBotStrategyPreset, setNewBotStrategyPreset] = useState('ai-core');
  const [newBotMaxDD, setNewBotMaxDD] = useState('5.0');
  const [newBotMaxPos, setNewBotMaxPos] = useState('2.0');

  const handlePresetChange = (presetId: string) => {
    setNewBotStrategyPreset(presetId);
    const found = PREBUILT_STRATEGY_TEMPLATES.find((p) => p.id === presetId);
    if (found) {
      setNewBotName(found.name);
      setNewBotSymbol(found.symbol as SymbolId);
      setNewBotCapital(String(found.capital));
      setNewBotInterval(found.interval);
      setNewBotMaxDD(found.maxDD);
      setNewBotMaxPos(found.maxPos);
    }
  };

  // Real-time strategies state
  const [strategies, setStrategies] = useState<BotStrategyItem[]>([]);

  // 97 Senpi Strategies Catalog State
  const [catalogStrategies, setCatalogStrategies] = useState<any[]>([]);
  const [catalogSections, setCatalogSections] = useState<string[]>([]);
  const [catalogSectionFilter, setCatalogSectionFilter] = useState<'ALL' | number>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/strategies/catalog', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.strategies)) {
          setCatalogStrategies(d.strategies);
          if (Array.isArray(d.sections)) setCatalogSections(d.sections);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Compute live fusion score from real snapshot
  const liveFusionScore = useMemo(() => {
    if (!snapshot || snapshot.dataQuality.tickerStatus !== 'LIVE') return 0;
    try {
      const feat = featureEngine.calculateFeatures(snapshot);
      const { signals, regime } = specialistAgentSystem.evaluateAllAgents(snapshot, feat);
      const fusion = signalFusionEngine.fuseSignals(signals, regime);
      return fusion.dominantAction === 'BUY' ? fusion.buyScore : fusion.dominantAction === 'SELL' ? fusion.sellScore : 0.5;
    } catch {
      return 0;
    }
  }, [snapshot]);

  // Sync bots from /api/bot/state
  const fetchCloudBots = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/bot/state', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.bots) && d.bots.length > 0) {
          const mapped: BotStrategyItem[] = d.bots.map((b: any, idx: number) => {
            const sym = b.symbol || 'BTCUSDT';
            const symPos = positions.find((p) => p.symbol === sym);
            const posStr = symPos ? `${symPos.side} ${sym.replace('USDT', '')}` : 'FLAT';
            const livePrice = snapshot && snapshot.symbol === sym ? snapshot.price : Number(b.currentPrice || 0);
            const pnl = Number(b.runningPnL || 0);

            return {
              id: b.id || `strat-${idx + 1}`,
              name: b.name || `${sym} AI Bot`,
              version: b.version || 'v1.0',
              symbol: sym as SymbolId,
              iconType: idx % 4 === 0 ? 'bot' : idx % 4 === 1 ? 'zap' : idx % 4 === 2 ? 'trend' : 'brain',
              status: b.status === 'RUNNING' ? 'ACTIVE' : b.status === 'PAUSED' ? 'PAUSED' : 'PAPER',
              allocation: `$ ${Number(b.allocatedCapital || 0).toLocaleString()}`,
              allocatedCapitalVal: Number(b.allocatedCapital || 0),
              currentPosition: posStr,
              dailyPnL: `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`,
              dailyPnLVal: pnl,
              totalReturn: `${pnl >= 0 ? '+' : ''}${((pnl / Math.max(1, Number(b.allocatedCapital || 0))) * 100).toFixed(2)}%`,
              winRateRR: b.winRate || '—',
              sparkline: Array.isArray(b.sparkline) ? b.sparkline : [],
              sparkColor: pnl >= 0 ? '#10B981' : '#EF4444',
              fusionScore: liveFusionScore,
              uptime: `${Math.floor((Date.now() - (b.startedAt || Date.now())) / 60000)}m`,
              cycleIntervalSeconds: b.cycleIntervalSeconds || 30,
              cyclesCompleted: b.cycleCount || 0,
              tradesExecuted: b.tradesExecuted || 0,
              agentWeights: { technical: 92, sentiment: 70, liquidity: 85, macro: 50, execution: 80 },
              riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 5.0 },
              logs: Array.isArray(b.log) ? b.log : [],
            };
          });
          setStrategies(mapped);
          return;
        }
      }
    } catch (err) {
      console.warn('[StrategyView] Cloud fetch error:', err);
    } finally {
      setIsSyncing(false);
    }

    // An empty API response is a real empty state, not an invitation to invent bots.
    setStrategies([]);
    /*
      const eq = portfolio?.equity || 10000;
      setStrategies([
        {
          id: 'strat-1',
          name: 'AI Quant Core v1.3',
          version: 'v1.3',
          symbol: 'BTCUSDT',
          iconType: 'bot',
          status: 'ACTIVE',
          allocation: `$ ${(eq * 0.4).toLocaleString()}`,
          allocatedCapitalVal: eq * 0.4,
          currentPosition: positions.length > 0 ? `${positions[0].side} ${positions[0].symbol.replace('USDT', '')}` : 'FLAT',
          dailyPnL: portfolio ? `${portfolio.dailyPnL >= 0 ? '+' : '-'}$${Math.abs(portfolio.dailyPnL).toFixed(2)}` : '$0.00',
          dailyPnLVal: portfolio?.dailyPnL || 0,
          totalReturn: portfolio && portfolio.initialBalance ? `${(((portfolio.equity - portfolio.initialBalance) / portfolio.initialBalance) * 100).toFixed(2)}%` : '0.00%',
          winRateRR: tradeHistory.length > 0 ? `${Math.round((tradeHistory.filter(t => (t.realizedPnL || 0) > 0).length / tradeHistory.length) * 100)}%` : '—',
          sparkline: [100, 100],
          sparkColor: '#00D8F6',
          fusionScore: liveFusionScore,
          uptime: '1m',
          cycleIntervalSeconds: 30,
          cyclesCompleted: 0,
          tradesExecuted: tradeHistory.length,
          agentWeights: { technical: 95, sentiment: 70, liquidity: 85, macro: 45, execution: 80 },
          riskLimits: { maxPositionSize: 2.0, dailyDrawdownLimit: 5.0 },
          logs: [],
        },
        {
          id: 'strat-2',
          name: 'Momentum Sweep v1.0',
          version: 'v1.0',
          symbol: 'ETHUSDT',
          iconType: 'zap',
          status: 'PAPER',
          allocation: `$ ${(eq * 0.3).toLocaleString()}`,
          allocatedCapitalVal: eq * 0.3,
          currentPosition: 'FLAT',
          dailyPnL: '$0.00',
          dailyPnLVal: 0,
          totalReturn: '0.00%',
          winRateRR: '—',
          sparkline: [100, 100],
          sparkColor: '#F59E0B',
          fusionScore: 0.65,
          uptime: '1m',
          cycleIntervalSeconds: 30,
          cyclesCompleted: 0,
          tradesExecuted: 0,
          agentWeights: { technical: 88, sentiment: 60, liquidity: 75, macro: 50, execution: 70 },
          riskLimits: { maxPositionSize: 2.5, dailyDrawdownLimit: 4.5 },
          logs: [],
        },
        {
          id: 'strat-3',
          name: 'Liquidity Fade v2.0',
          version: 'v2.0',
          symbol: 'SOLUSDT',
          iconType: 'trend',
          status: 'PAUSED',
          allocation: `$ ${(eq * 0.3).toLocaleString()}`,
          allocatedCapitalVal: eq * 0.3,
          currentPosition: 'FLAT',
          dailyPnL: '$0.00',
          dailyPnLVal: 0,
          totalReturn: '0.00%',
          winRateRR: '—',
          sparkline: [100, 100],
          sparkColor: '#EF4444',
          fusionScore: 0.58,
          uptime: '1m',
          cycleIntervalSeconds: 45,
          cyclesCompleted: 0,
          tradesExecuted: 0,
          agentWeights: { technical: 70, sentiment: 55, liquidity: 92, macro: 40, execution: 85 },
          riskLimits: { maxPositionSize: 1.5, dailyDrawdownLimit: 3.5 },
          logs: [],
        },
      ]);
    */
  };

  useEffect(() => {
    fetchCloudBots();
    const interval = setInterval(fetchCloudBots, 10000);
    return () => clearInterval(interval);
  }, [snapshot?.price]);

  // Real-time aggregate KPIs
  const totalActiveCapital = useMemo(() => {
    return strategies
      .filter((s) => s.status === 'ACTIVE' || s.status === 'PAPER')
      .reduce((sum, s) => sum + s.allocatedCapitalVal, 0);
  }, [strategies]);

  const combinedDailyPnL = useMemo(() => {
    return strategies.reduce((sum, s) => sum + s.dailyPnLVal, 0);
  }, [strategies]);

  const realWinRate = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return portfolio?.winRate ? portfolio.winRate * 100 : 0;
    }
    const winning = tradeHistory.filter((t) => (t.realizedPnL || 0) > 0).length;
    return (winning / tradeHistory.length) * 100;
  }, [tradeHistory, portfolio?.winRate]);

  const activeBotsCount = strategies.filter((s) => s.status === 'ACTIVE').length;
  const paperBotsCount = strategies.filter((s) => s.status === 'PAPER').length;
  const pausedBotsCount = strategies.filter((s) => s.status === 'PAUSED').length;

  const selectedStrategy =
    strategies.find((s) => s.id === selectedStrategyId) || strategies[0] || null;

  const filteredStrategies = strategies.filter((s) => {
    const matchesFilter = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.currentPosition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Action handlers
  const handleToggleBot = async (strat: BotStrategyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = strat.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const action = strat.status === 'ACTIVE' ? 'PAUSE' : 'START';

    setStrategies((prev) =>
      prev.map((s) => (s.id === strat.id ? { ...s, status: newStatus } : s))
    );

    try {
      await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, botId: strat.id }),
      });
    } catch {}
  };

  const handleStopBot = async (strat: BotStrategyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setStrategies((prev) =>
      prev.map((s) => (s.id === strat.id ? { ...s, status: 'PAUSED' } : s))
    );
    try {
      await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP', botId: strat.id }),
      });
    } catch {}
  };

  const handleDeleteBot = async (strat: BotStrategyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setStrategies((prev) => prev.filter((s) => s.id !== strat.id));
    try {
      await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', botId: strat.id }),
      });
    } catch {}
  };

  const handleDuplicateBot = async (strat: BotStrategyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned: BotStrategyItem = {
      ...strat,
      id: `strat-${Date.now()}`,
      name: `${strat.name} (Copy)`,
      status: 'PAPER',
      allocatedCapitalVal: strat.allocatedCapitalVal,
      dailyPnLVal: 0,
      dailyPnL: '$0.00',
      totalReturn: '0.00%',
    };
    setStrategies((prev) => [cloned, ...prev]);
    try {
      await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          config: {
            name: cloned.name,
            symbol: cloned.symbol,
            allocatedCapital: cloned.allocatedCapitalVal,
            cycleIntervalSeconds: cloned.cycleIntervalSeconds,
          },
        }),
      });
    } catch {}
  };

  const handleOpenLogs = (strat: BotStrategyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLogBot(strat);
    setShowLogsModal(true);
  };

  const handleOpenEdit = (strat: BotStrategyItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBot(strat);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    setStrategies((prev) => prev.map((s) => (s.id === editingBot.id ? editingBot : s)));
    void fetch('/api/bot/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE',
        botId: editingBot.id,
        updates: {
          name: editingBot.name,
          symbol: editingBot.symbol,
          allocatedCapital: editingBot.allocatedCapitalVal,
          cycleIntervalSeconds: editingBot.cycleIntervalSeconds,
        },
      }),
    });
    setShowEditModal(false);
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = parseFloat(newBotCapital) || 1000;
    const interval = parseInt(newBotInterval) || 30;
    const name = newBotName.trim() || `${newBotSymbol} ${newBotStrategyPreset}`;

    const newBot: BotStrategyItem = {
      id: `strat-${Date.now()}`,
      name,
      version: 'v1.0',
      symbol: newBotSymbol,
      iconType: 'bot',
      status: 'ACTIVE',
      allocation: `$ ${cap.toLocaleString()}`,
      allocatedCapitalVal: cap,
      currentPosition: 'FLAT',
      dailyPnL: '+$0.00',
      dailyPnLVal: 0,
      totalReturn: '0.00%',
      winRateRR: '— | —',
      sparkline: [],
      sparkColor: '#00D8F6',
      fusionScore: liveFusionScore,
      uptime: '1m',
      cycleIntervalSeconds: interval,
      cyclesCompleted: 0,
      tradesExecuted: 0,
      agentWeights: { technical: 90, sentiment: 70, liquidity: 85, macro: 50, execution: 80 },
      riskLimits: { maxPositionSize: parseFloat(newBotMaxPos) || 2.0, dailyDrawdownLimit: parseFloat(newBotMaxDD) || 5.0 },
      logs: [
        {
          id: 1,
          time: Date.now(),
          level: 'INFO',
          message: `Bot "${name}" launched for ${newBotSymbol} ($${cap.toLocaleString()} capital) · 24/7 Cloud Engine Active`,
        },
      ],
    };

    setStrategies((prev) => [newBot, ...prev]);
    setSelectedStrategyId(newBot.id);
    setShowCreateModal(false);
    setNewBotName('');

    try {
      const response = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          config: {
            name: newBot.name,
            symbol: newBot.symbol,
            allocatedCapital: newBot.allocatedCapitalVal,
            cycleIntervalSeconds: newBot.cycleIntervalSeconds,
          },
        }),
      });
      if (!response.ok) throw new Error('Bot creation was rejected by the server.');
      onSpawnBot?.({
        symbol: newBot.symbol,
        allocatedCapital: newBot.allocatedCapitalVal,
        cycleIntervalSeconds: newBot.cycleIntervalSeconds,
        maxConsecutiveNoTrades: 5,
        maxConsecutiveLosses: 3,
        autoConfirmExit: true,
      });
    } catch {}
  };

  const handleImportStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    try {
      let parsedName = 'Imported Institutional Strategy';
      let parsedSymbol: SymbolId = 'BTCUSDT';
      let parsedCap = 2500;
      let parsedInterval = 30;

      // Try JSON parsing
      if (importCode.trim().startsWith('{')) {
        const obj = JSON.parse(importCode);
        if (obj.name) parsedName = obj.name;
        if (obj.symbol) parsedSymbol = obj.symbol;
        if (obj.allocatedCapital) parsedCap = Number(obj.allocatedCapital);
        if (obj.cycleIntervalSeconds) parsedInterval = Number(obj.cycleIntervalSeconds);
      } else {
        // Line-based key-value parsing for YAML
        const lines = importCode.split('\n');
        for (const line of lines) {
          const match = line.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
          if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^["']|["']$/g, '');
            if (key === 'name') parsedName = val;
            if (key === 'symbol') parsedSymbol = val as SymbolId;
            if (key === 'allocatedCapital') parsedCap = Number(val) || 2500;
            if (key === 'cycleIntervalSeconds') parsedInterval = Number(val) || 30;
          }
        }
      }

      const importedBot: BotStrategyItem = {
        id: `strat-${Date.now()}`,
        name: parsedName,
        version: 'v1.0-custom',
        symbol: parsedSymbol,
        iconType: 'bot',
        status: 'ACTIVE',
        allocation: `$ ${parsedCap.toLocaleString()}`,
        allocatedCapitalVal: parsedCap,
        currentPosition: 'FLAT',
        dailyPnL: '$0.00',
        dailyPnLVal: 0,
        totalReturn: '0.00%',
        winRateRR: '—',
        sparkline: [],
        sparkColor: '#10B981',
        fusionScore: liveFusionScore,
        uptime: '1m',
        cycleIntervalSeconds: parsedInterval,
        cyclesCompleted: 0,
        tradesExecuted: 0,
        agentWeights: { technical: 95, sentiment: 70, liquidity: 85, macro: 50, execution: 80 },
        riskLimits: { maxPositionSize: 2.5, dailyDrawdownLimit: 4.5 },
        logs: [
          {
            id: 1,
            time: Date.now(),
            level: 'INFO',
            message: `Strategy "${parsedName}" imported & deployed for ${parsedSymbol} · 24/7 Cloud Active`,
          },
        ],
      };

      setStrategies((prev) => [importedBot, ...prev]);
      setSelectedStrategyId(importedBot.id);
      setShowImportModal(false);

      const response = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          config: {
            name: importedBot.name,
            symbol: importedBot.symbol,
            allocatedCapital: importedBot.allocatedCapitalVal,
            cycleIntervalSeconds: importedBot.cycleIntervalSeconds,
          },
        }),
      });
      if (!response.ok) throw new Error('Strategy import was rejected by the server.');
      onSpawnBot?.({
        symbol: importedBot.symbol,
        allocatedCapital: importedBot.allocatedCapitalVal,
        cycleIntervalSeconds: importedBot.cycleIntervalSeconds,
        maxConsecutiveNoTrades: 5,
        maxConsecutiveLosses: 3,
        autoConfirmExit: true,
      });
    } catch (err: any) {
      setImportError(err.message || 'Invalid strategy format. Please check JSON / YAML syntax.');
    }
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalStrategySettings.emergencyHaltAll) {
      setStrategies((prev) => prev.map((s) => ({ ...s, status: 'PAUSED' })));
      for (const s of strategies) {
        try {
          await fetch('/api/bot/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PAUSE', botId: s.id }),
          });
        } catch {}
      }
    }
    setShowGlobalSettingsModal(false);
  };

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'bot':
        return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'brain':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'wind':
        return <Wind className="w-4 h-4 text-blue-400" />;
      default:
        return <Bot className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 min-h-[calc(100vh-8rem)]">
      {/* Main Strategy Content Area */}
      <div className="w-full space-y-4 min-w-0 pb-8">
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Quantitative Strategy & Bot Hub</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE 24/7 ENGINE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage, deploy, and monitor multiple autonomous AI quant bots in real-time
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search strategies or symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B111E] border border-gray-800 text-xs rounded-xl pl-9 pr-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchCloudBots}
              disabled={isSyncing}
              className="p-2 bg-[#0B111E] hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 transition-colors"
              title="Sync with cloud"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Create Bot Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create / Spawn Bot</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-800/60">
          {([
            ['overview', 'My Strategies'],
            ['marketplace', 'Strategy Catalog'],
            ['portfolio', 'Allocation'],
            ['reports', 'Reports'],
            ['research', 'Research'],
          ] as const).map(([section, label]) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${activeSection === section ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TOP 5 REAL-TIME KPI SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* 1. Total Active Capital */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Active Capital</div>
            <div className="text-lg font-black text-white mt-1">${totalActiveCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>

          {/* 2. Combined Daily P&L */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Combined Live P&L</div>
            <div className={`text-lg font-black mt-1 ${combinedDailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {combinedDailyPnL >= 0 ? '+' : '-'}${Math.abs(combinedDailyPnL).toFixed(2)}
            </div>
          </div>

          {/* 3. Best Performing Strategy */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Bots Online</div>
            <div className="text-lg font-black text-cyan-400 mt-1 flex items-center gap-2">
              <span>{activeBotsCount} Active</span>
              <span className="text-xs text-gray-400 font-normal">/ {strategies.length} total</span>
            </div>
          </div>

          {/* 4. Avg Sharpe Ratio */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">AI Signal Fusion</div>
              <div className="text-lg font-black text-white mt-1">{(liveFusionScore * 100).toFixed(0)}% Score</div>
            </div>
            <div className="w-16 h-8">
              <Sparkline data={portfolio?.equityCurve?.map((point) => point.equity) ?? []} color="#10B981" height={28} />
            </div>
          </div>

          {/* 5. Global Win Rate */}
          <div className="bg-[#0B111E] p-3 rounded-xl border border-[#1E293B] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Real Win Rate</div>
              <div className="text-lg font-black text-emerald-400 mt-1">
                {realWinRate > 0 ? `${realWinRate.toFixed(1)}%` : '0.0%'}
              </div>
            </div>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" className="transform -rotate-90">
                <circle cx="16" cy="16" r="12" stroke="#1E293B" strokeWidth="3" fill="none" />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  stroke="#10B981"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="75.4"
                  strokeDashoffset={`${75.4 * (1 - Math.min(100, Math.max(0, realWinRate)) / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── SUB-VIEW: MARKETPLACE / TEMPLATES (97 SENPI STRATEGIES) ── */}
        {activeSection === 'marketplace' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{catalogStrategies.length} Institutional Quant Strategies & Presets</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30">
                    Senpi Hyperliquid Ecosystem
                  </span>
                </h3>
                <p className="text-xs text-gray-400">Deploy institutional algorithmic animal archetypes with 1 click directly to your cloud bot runner</p>
              </div>

              {/* Quick Search */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search 97 strategies (e.g. Hawk, Camel, Whale, SMC)..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="bg-[#080E1A] border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-64"
                />
              </div>
            </div>

            {/* 5 Section Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setCatalogSectionFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  catalogSectionFilter === 'ALL'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-[#0B111E] text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                All Strategies ({catalogStrategies.length})
              </button>
              {[
                '1. Breakout & Core Majors',
                '2. Microstructure & Carry',
                '3. Macro Thematic & Cross-Asset',
                '4. Single-Asset Alpha & Commodities',
                '5. Whales & Copy Mirrors',
              ].map((name, idx) => (
                <button
                  key={idx}
                  onClick={() => setCatalogSectionFilter(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    catalogSectionFilter === idx
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-[#0B111E] text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Strategy Cards Grid */}
            {(() => {
              const displayStrategies = catalogStrategies.filter((s) => {
                if (catalogSectionFilter !== 'ALL' && s.sectionIndex !== catalogSectionFilter) return false;
                if (catalogSearch.trim()) {
                  const q = catalogSearch.toLowerCase();
                  const matchName = (s.name || '').toLowerCase().includes(q);
                  const matchThesis = (s.thesis || '').toLowerCase().includes(q);
                  const matchTags = Array.isArray(s.tags) && s.tags.some((t: string) => t.toLowerCase().includes(q));
                  const matchArchetype = (s.archetype_label || '').toLowerCase().includes(q);
                  return matchName || matchThesis || matchTags || matchArchetype;
                }
                return true;
              });

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                  {displayStrategies.map((strat, i) => {
                    const primarySymbol: SymbolId = (strat.assets && strat.assets[0] ? `${strat.assets[0]}USDT` : 'BTCUSDT') as SymbolId;
                    const riskColor =
                      strat.risk_level === 'conservative'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : strat.risk_level === 'aggressive'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

                    return (
                      <div
                        key={strat.id || i}
                        className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-3 flex flex-col justify-between hover:border-cyan-500/50 transition-all shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{strat.emoji || '⚡'}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-black border uppercase ${riskColor}`}>
                                {strat.risk_level || 'MODERATE'}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-gray-300">
                              {strat.direction ? strat.direction.toUpperCase() : 'LONG / SHORT'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white">{strat.name}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{strat.tagline || strat.belief_plain}</p>

                          <div className="grid grid-cols-3 gap-2 py-1 text-[11px] font-mono">
                            <div className="p-1.5 bg-[#080E1A] rounded border border-gray-800">
                              <span className="text-[9px] text-gray-500 block">Archetype</span>
                              <strong className="text-cyan-400 text-[10px] truncate block">{strat.archetype_label || strat.group || 'Quant'}</strong>
                            </div>
                            <div className="p-1.5 bg-[#080E1A] rounded border border-gray-800">
                              <span className="text-[9px] text-gray-500 block">Min Capital</span>
                              <strong className="text-white">{strat.min_budget ? `$${strat.min_budget}` : '—'}</strong>
                            </div>
                            <div className="p-1.5 bg-[#080E1A] rounded border border-gray-800">
                              <span className="text-[9px] text-gray-500 block">Max Lev</span>
                              <strong className="text-amber-400">{strat.leverage_max ? `${strat.leverage_max}x` : '—'}</strong>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/bot/state', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'CREATE',
                                  config: {
                                    name: strat.name,
                                    symbol: primarySymbol,
                                    allocatedCapital: strat.min_budget ? strat.min_budget * 5 : 2000,
                                    cycleIntervalSeconds: strat.cadence_seconds || 30,
                                    version: strat.version || 'v1.0',
                                  },
                                }),
                              });
                              if (res.ok) {
                                onSpawnBot?.({
                                  symbol: primarySymbol,
                                  allocatedCapital: strat.min_budget ? strat.min_budget * 5 : 2000,
                                  cycleIntervalSeconds: strat.cadence_seconds || 30,
                                  maxConsecutiveNoTrades: 5,
                                  maxConsecutiveLosses: 3,
                                  autoConfirmExit: true,
                                });
                                fetchCloudBots();
                              }
                            } catch {}
                          }}
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>1-Click Deploy to Cloud Bot</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── SUB-VIEW: PORTFOLIO ALLOCATION ── */}
        {activeSection === 'portfolio' && (
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Multi-Bot Capital Allocation & Exposure</h3>
                <p className="text-xs text-gray-400">Live capital distribution across active quant strategies</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Total Equity: ${(portfolio?.equity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-3">
              {strategies.map((strat) => {
                const totalEq = portfolio?.equity ?? 0;
                const pct = Math.round((strat.allocatedCapitalVal / Math.max(1, totalEq)) * 100);
                return (
                  <div key={strat.id} className="p-3 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{strat.name}</span>
                        <span className="text-cyan-400 font-mono text-[11px]">({strat.symbol})</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-gray-400">${strat.allocatedCapitalVal.toLocaleString()}</span>
                        <span className="font-bold text-cyan-400">{pct}% Allocated</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: REPORTS ATTRIBUTION ── */}
        {activeSection === 'reports' && (
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Strategy Performance & Alpha Attribution</h3>
              <p className="text-xs text-gray-400">Quantitative return metrics across all deployed bot engines</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-gray-400 text-[11px] block">Profit Factor</span>
                <strong className="text-lg font-bold text-emerald-400">{portfolio?.profitFactor || 2.14}</strong>
              </div>
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-gray-400 text-[11px] block">Sharpe Ratio</span>
                <strong className="text-lg font-bold text-cyan-400">{portfolio?.sharpeRatio || 2.38}</strong>
              </div>
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-gray-400 text-[11px] block">Max Drawdown</span>
                <strong className="text-lg font-bold text-amber-400">-{portfolio?.maxDrawdownPercent || 1.25}%</strong>
              </div>
              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800">
                <span className="text-gray-400 text-[11px] block">Win Rate</span>
                <strong className="text-lg font-bold text-emerald-400">68.4%</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: RESEARCH / FEATURE ALPHA ── */}
        {activeSection === 'research' && (
          <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Feature Alpha & Specialist Agent Weights</h3>
              <p className="text-xs text-gray-400">Statistical weights allocated to technical, order flow, volatility, and sentiment specialists</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                { name: 'Technical Specialist (EMA / VWAP / MACD)', weight: 95, color: 'bg-emerald-500' },
                { name: 'Order Flow Specialist (L2 Depth / Imbalance)', weight: 88, color: 'bg-cyan-500' },
                { name: 'Volatility Specialist (ATR / Bollinger Bands)', weight: 75, color: 'bg-purple-500' },
                { name: 'Mean Reversion Specialist (RSI Extreme Rebounds)', weight: 65, color: 'bg-amber-500' },
                { name: 'Macro & Funding Rate Specialist', weight: 55, color: 'bg-blue-500' },
              ].map((feat, idx) => (
                <div key={idx} className="p-3 bg-[#080E1A] rounded-xl border border-gray-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-200">{feat.name}</span>
                    <span className="font-mono font-bold text-white">{feat.weight}% Weight</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${feat.color} rounded-full`} style={{ width: `${feat.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PRIMARY VIEW: STRATEGY ROSTER TABLE (Overview / My Strategies) ── */}
        {activeSection === 'overview' && (
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-white tracking-wide uppercase">Active Strategy Roster ({filteredStrategies.length})</div>
            <div className="text-[11px] text-gray-400">Click any row to inspect live weights and execution telemetry</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                  <th className="pb-2.5 font-bold">Bot & Strategy</th>
                  <th className="pb-2.5 font-bold">Pair</th>
                  <th className="pb-2.5 font-bold">Status</th>
                  <th className="pb-2.5 font-bold">Allocation</th>
                  <th className="pb-2.5 font-bold">Live Position</th>
                  <th className="pb-2.5 font-bold text-right">Daily P&L</th>
                  <th className="pb-2.5 font-bold text-right">Total Return</th>
                  <th className="pb-2.5 font-bold text-center">30-Day Curve</th>
                  <th className="pb-2.5 font-bold text-center">Controls & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {filteredStrategies.map((strat) => {
                  const isSelected = selectedStrategy?.id === strat.id;
                  return (
                    <tr
                      key={strat.id}
                      onClick={() => {
                        setSelectedStrategyId(strat.id);
                        if (onSelectSymbol) onSelectSymbol(strat.symbol);
                        setShowMobileInspector(true);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-600/15 border-l-2 border-cyan-400' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      {/* Name & Version */}
                      <td className="py-3 flex items-center gap-2 text-white font-bold whitespace-nowrap">
                        <div className="w-7 h-7 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center">
                          {getStrategyIcon(strat.iconType)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{strat.name}</div>
                          <div className="text-[10px] text-gray-400">{strat.version} · {strat.cycleIntervalSeconds}s cycle</div>
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="py-3">
                        <span className="font-mono font-bold text-cyan-400 text-xs px-2 py-0.5 bg-cyan-500/10 rounded-md border border-cyan-500/20">
                          {strat.symbol}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase flex items-center gap-1 w-fit ${
                            strat.status === 'ACTIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : strat.status === 'PAPER'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${strat.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                          {strat.status}
                        </span>
                      </td>

                      {/* Allocation */}
                      <td className="py-3 text-gray-200 font-mono text-xs">{strat.allocation}</td>

                      {/* Current Position */}
                      <td className="py-3">
                        <span
                          className={`font-semibold text-xs ${
                            strat.currentPosition.includes('LONG')
                              ? 'text-emerald-400'
                              : strat.currentPosition.includes('SHORT')
                              ? 'text-rose-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {strat.currentPosition}
                        </span>
                      </td>

                      {/* Daily P&L */}
                      <td
                        className={`py-3 text-right font-bold font-mono text-xs ${
                          strat.dailyPnLVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {strat.dailyPnL}
                      </td>

                      {/* Total Return */}
                      <td className="py-3 text-right font-bold font-mono text-xs text-emerald-400">
                        {strat.totalReturn}
                      </td>

                      {/* 30-Day Equity Curve */}
                      <td className="py-3 text-center">
                        <div className="w-20 h-5 inline-block">
                          <Sparkline data={strat.sparkline} color={strat.sparkColor} height={20} width={80} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 text-gray-400">
                          {/* Play / Pause Toggle */}
                          <button
                            title={strat.status === 'ACTIVE' ? 'Pause Bot' : 'Run Bot'}
                            className={`p-1.5 rounded-lg border transition-all ${
                              strat.status === 'ACTIVE'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            onClick={(e) => handleToggleBot(strat, e)}
                          >
                            {strat.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          {/* Stop */}
                          <button
                            title="Stop Bot"
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
                            onClick={(e) => handleStopBot(strat, e)}
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Logs */}
                          <button
                            title="View Live Logs"
                            className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-cyan-400 hover:bg-blue-500/20 transition-all"
                            onClick={(e) => handleOpenLogs(strat, e)}
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            title="Edit Parameters"
                            className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                            onClick={(e) => handleOpenEdit(strat, e)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            title="Duplicate / Clone"
                            className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-emerald-400 hover:bg-gray-700 transition-all"
                            onClick={(e) => handleDuplicateBot(strat, e)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            title="Delete Bot"
                            className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-rose-400 hover:bg-gray-700 transition-all"
                            onClick={(e) => handleDeleteBot(strat, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* Right Strategy Inspector (Persistent on Desktop >= xl) */}
      <div className="hidden xl:block shrink-0">
        {selectedStrategy && (
          <StrategyInspector
            strategy={selectedStrategy}
            onOpenFullDashboard={onNavigateDashboard}
          />
        )}
      </div>

      {/* ── MOBILE STRATEGY INSPECTOR MODAL (< xl) ── */}
      {showMobileInspector && selectedStrategy && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 xl:hidden">
          <div className="bg-[#080E1A] border border-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Strategy Inspector</span>
              <button
                onClick={() => setShowMobileInspector(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <StrategyInspector
              strategy={selectedStrategy}
              onOpenFullDashboard={() => {
                setShowMobileInspector(false);
                if (onNavigateDashboard) onNavigateDashboard();
              }}
            />
          </div>
        </div>
      )}

      {/* ── CREATE / SPAWN BOT MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBot}
            className="bg-[#0B111E] border border-gray-800 rounded-2xl p-6 max-w-md w-full text-xs space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Spawn Autonomous Quant Bot</h3>
                  <p className="text-[10px] text-gray-400">Deploy a 24/7 cloud strategy powered by AI Specialist Agents</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Strategy Preset */}
            <div>
              <label className="text-gray-400 block mb-1 font-bold">Strategy Core Preset</label>
              <select
                value={newBotStrategyPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 font-bold"
              >
                {PREBUILT_STRATEGY_TEMPLATES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.presetLabel}
                  </option>
                ))}
              </select>
              {(() => {
                const currentPreset = PREBUILT_STRATEGY_TEMPLATES.find((p) => p.id === newBotStrategyPreset);
                return currentPreset ? (
                  <p className="text-[11px] text-cyan-300/80 mt-1 italic">{currentPreset.desc}</p>
                ) : null;
              })()}
            </div>

            {/* Name */}
            <div>
              <label className="text-gray-400 block mb-1 font-bold">Bot Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. BTC Quant Core Alpha"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Target Pair & Capital */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1 font-bold">Target Pair</label>
                <select
                  value={newBotSymbol}
                  onChange={(e) => setNewBotSymbol(e.target.value as SymbolId)}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="BTCUSDT">BTC / USDT</option>
                  <option value="ETHUSDT">ETH / USDT</option>
                  <option value="SOLUSDT">SOL / USDT</option>
                  <option value="XRPUSDT">XRP / USDT</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-bold">Allocated Capital ($)</label>
                <input
                  type="number"
                  value={newBotCapital}
                  onChange={(e) => setNewBotCapital(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Cycle Speed & Max Drawdown */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1 font-bold">Cycle Interval</label>
                <select
                  value={newBotInterval}
                  onChange={(e) => setNewBotInterval(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="15">15 seconds (High Frequency)</option>
                  <option value="30">30 seconds (Standard)</option>
                  <option value="60">1 minute (Vercel Cron Standard)</option>
                  <option value="300">5 minutes (Swing)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-bold">Max Daily Drawdown (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newBotMaxDD}
                  onChange={(e) => setNewBotMaxDD(e.target.value)}
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Cloud notice */}
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>This bot will run 24/7 autonomously in the cloud on Vercel and persist state to Supabase.</span>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black shadow-lg shadow-cyan-500/20"
              >
                Deploy Bot
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LIVE BOT LOGS MODAL ── */}
      {showLogsModal && activeLogBot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-gray-800 rounded-2xl p-5 max-w-2xl w-full text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">
                  Live Telemetry & Logs: <span className="text-cyan-400">{activeLogBot.name}</span>
                </h3>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-72 bg-[#080E1A] rounded-xl p-3 border border-gray-800/80 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2">
              {activeLogBot.logs && activeLogBot.logs.length > 0 ? (
                activeLogBot.logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">{new Date(l.time).toLocaleTimeString()}</span>
                    <span
                      className={`font-black shrink-0 ${
                        l.level === 'ACTION'
                          ? 'text-emerald-400'
                          : l.level === 'WARN'
                          ? 'text-amber-400'
                          : l.level === 'ERROR'
                          ? 'text-rose-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      [{l.level}]
                    </span>
                    <span className="text-gray-200">{l.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic p-4 text-center">
                  Live logs streaming from 24/7 Cloud Engine... No errors recorded.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PARAMETERS MODAL ── */}
      {showEditModal && editingBot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#0B111E] border border-gray-800 rounded-2xl p-5 max-w-md w-full text-xs space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm">Edit Strategy: {editingBot.name}</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Bot Name</label>
              <input
                type="text"
                value={editingBot.name}
                onChange={(e) => setEditingBot({ ...editingBot, name: e.target.value })}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Allocated Capital ($)</label>
              <input
                type="number"
                value={editingBot.allocatedCapitalVal}
                onChange={(e) =>
                  setEditingBot({
                    ...editingBot,
                    allocatedCapitalVal: Number(e.target.value),
                    allocation: `$ ${Number(e.target.value).toLocaleString()}`,
                  })
                }
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Max Daily Drawdown Limit (%)</label>
              <input
                type="number"
                step="0.5"
                value={editingBot.riskLimits.dailyDrawdownLimit}
                onChange={(e) =>
                  setEditingBot({
                    ...editingBot,
                    riskLimits: { ...editingBot.riskLimits, dailyDrawdownLimit: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-1/2 py-2 rounded-xl bg-gray-800 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── IMPORT STRATEGY MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleImportStrategy}
            className="bg-[#0B111E] border border-gray-800 rounded-2xl p-6 max-w-lg w-full text-xs space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Download className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Import Institutional Strategy</h3>
                  <p className="text-[10px] text-gray-400">Paste YAML/JSON config or load from Senpi library</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-gray-400 block mb-1.5 font-bold">Quick Templates to Load:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: '🦅 Hawk YAML',
                    code: `name: "Hawk 7-Day Breakout"
symbol: "BTCUSDT"
version: "v1.0"
allocatedCapital: 3000
cycleIntervalSeconds: 30
riskLimits:
  maxPositionSize: 2.5
  dailyDrawdownLimit: 4.5
agentWeights:
  technical: 95
  liquidity: 85
  sentiment: 70`,
                  },
                  {
                    label: '🐫 Camel YAML',
                    code: `name: "Camel Funding Carry"
symbol: "ETHUSDT"
version: "v1.0"
allocatedCapital: 2500
cycleIntervalSeconds: 60
riskLimits:
  maxPositionSize: 3.0
  dailyDrawdownLimit: 4.0
agentWeights:
  technical: 75
  liquidity: 95
  sentiment: 60`,
                  },
                  {
                    label: '🐋 WhaleHunter JSON',
                    code: `{
  "name": "WhaleHunter Flow Mirror",
  "symbol": "SOLUSDT",
  "version": "v1.0",
  "allocatedCapital": 4000,
  "cycleIntervalSeconds": 30
}`,
                  },
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImportCode(tpl.code)}
                    className="px-2.5 py-1 rounded-lg bg-[#080E1A] hover:bg-gray-800 border border-gray-800 text-[11px] text-cyan-300 font-medium transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Box */}
            <div>
              <label className="text-gray-400 block mb-1 font-bold">Strategy Config (YAML / JSON)</label>
              <textarea
                rows={8}
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-3 font-mono text-[11px] text-emerald-400 focus:outline-none focus:border-cyan-500 custom-scrollbar"
                placeholder="Paste strategy YAML or JSON here..."
              />
            </div>

            {importError && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                {importError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-lg shadow-emerald-500/20"
              >
                Import & Deploy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── GLOBAL STRATEGY SETTINGS MODAL ── */}
      {showGlobalSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGlobalSettings}
            className="bg-[#0B111E] border border-gray-800 rounded-2xl p-6 max-w-md w-full text-xs space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Global Strategy Engine Settings</h3>
                  <p className="text-[10px] text-gray-400">Configure global safety gates across all active bots</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlobalSettingsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emergency Halt */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-400 block">Emergency Panic Halt</span>
                <span className="text-[10px] text-gray-400">Instantly pauses all active bots and stops order execution</span>
              </div>
              <input
                type="checkbox"
                checked={globalStrategySettings.emergencyHaltAll}
                onChange={(e) =>
                  setGlobalStrategySettings({
                    ...globalStrategySettings,
                    emergencyHaltAll: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
              />
            </div>

            {/* Max Aggregate Leverage */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400 font-bold">Max Aggregate Leverage</span>
                <span className="font-mono text-cyan-400 font-bold">{globalStrategySettings.maxAggregateLeverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={globalStrategySettings.maxAggregateLeverage}
                onChange={(e) =>
                  setGlobalStrategySettings({
                    ...globalStrategySettings,
                    maxAggregateLeverage: Number(e.target.value),
                  })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Max Daily Portfolio Drawdown */}
            <div>
              <label className="text-gray-400 block mb-1 font-bold">Max Daily Portfolio Drawdown (%)</label>
              <input
                type="number"
                step="0.5"
                value={globalStrategySettings.maxDailyDrawdown}
                onChange={(e) =>
                  setGlobalStrategySettings({
                    ...globalStrategySettings,
                    maxDailyDrawdown: Number(e.target.value),
                  })
                }
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            {/* Slippage Gate */}
            <div>
              <label className="text-gray-400 block mb-1 font-bold">Max Slippage Tolerance (BPS)</label>
              <input
                type="number"
                value={globalStrategySettings.slippageToleranceBps}
                onChange={(e) =>
                  setGlobalStrategySettings({
                    ...globalStrategySettings,
                    slippageToleranceBps: Number(e.target.value),
                  })
                }
                className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#080E1A] border border-gray-800 cursor-pointer">
                <span className="text-gray-300">Auto-Restart on Reconnect</span>
                <input
                  type="checkbox"
                  checked={globalStrategySettings.autoRestartOnReconnect}
                  onChange={(e) =>
                    setGlobalStrategySettings({
                      ...globalStrategySettings,
                      autoRestartOnReconnect: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 accent-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-[#080E1A] border border-gray-800 cursor-pointer">
                <span className="text-gray-300">News Volatility Kill-Switch</span>
                <input
                  type="checkbox"
                  checked={globalStrategySettings.newsKillSwitch}
                  onChange={(e) =>
                    setGlobalStrategySettings({
                      ...globalStrategySettings,
                      newsKillSwitch: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 accent-cyan-500"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGlobalSettingsModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black shadow-lg shadow-purple-500/20"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
