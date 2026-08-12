'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SymbolId, MarketSnapshot, FeatureVector, AgentSignal, SignalFusionResult,
  LLMDecision, RiskCheckResult, PortfolioState, Position, TradeHistoryItem,
  Order, AppMode
} from '@/types/trading';
import { marketEngine } from '@/lib/market/engine';
import { featureEngine } from '@/lib/features/engine';
import { specialistAgentSystem } from '@/lib/agents/specialists';
import { signalFusionEngine } from '@/lib/fusion/engine';
import { aiProviderManager } from '@/lib/llm/providers';
import { deterministicRiskEngine } from '@/lib/risk/engine';
import { paperBroker } from '@/lib/broker/paper';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';
import { dbPersistence, generateDecisionId } from '@/lib/db/schema';
import { tradingBotEngine, BotState, BotConfig } from '@/lib/bot/engine';

import { DashboardView } from '@/components/DashboardView';
import { TerminalView } from '@/components/TerminalView';
import { AIDecisionCenterView } from '@/components/AIDecisionCenterView';
import { PaperTradingView } from '@/components/PaperTradingView';
import { ReplayResearchView } from '@/components/ReplayResearchView';
import { SettingsView } from '@/components/SettingsView';

import {
  LayoutDashboard, LineChart, Brain, DollarSign, BarChart2, Settings, Zap,
  AlertTriangle, Wifi, WifiOff
} from 'lucide-react';

type TabId = 'dashboard' | 'terminal' | 'ai_center' | 'paper_trading' | 'research' | 'settings';

const SYMBOLS: SymbolId[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const POLL_INTERVAL_MS = 8000; // 8-second polling for market data

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [activeSymbol, setActiveSymbol] = useState<SymbolId>('BTCUSDT');
  const [appMode, setAppMode] = useState<AppMode>('PAPER');

  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [features, setFeatures] = useState<FeatureVector | null>(null);
  const [signals, setSignals] = useState<AgentSignal[]>([]);
  const [fusion, setFusion] = useState<SignalFusionResult | null>(null);
  const [decision, setDecision] = useState<LLMDecision | null>(null);
  const [riskCheck, setRiskCheck] = useState<RiskCheckResult | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Bot State Sync
  const [botState, setBotState] = useState<BotState>(tradingBotEngine.getState());

  const activeSymbolRef = useRef(activeSymbol);
  activeSymbolRef.current = activeSymbol;

  // ── Bot Sync Subscription ──────────────────────────────────────────────────
  useEffect(() => {
    tradingBotEngine.onStateUpdate((s) => setBotState(s));
    tradingBotEngine.onExitRequest((req) => {
      showNotification(`⚠️ Bot Alert: ${req.reason}`);
    });
  }, []);

  // ── Boot: Load persistent credentials ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const alpacaKey = localStorage.getItem('aitrader_alpaca_api_key');
    const alpacaSecret = localStorage.getItem('aitrader_alpaca_secret_key');
    const savedMode = localStorage.getItem('aitrader_app_mode') as AppMode ?? 'PAPER';
    const startingBalance = parseFloat(localStorage.getItem('aitrader_starting_balance') ?? '10000');

    setAppMode(savedMode);
    marketEngine.setMode(savedMode);
    paperBroker.setStartingBalance(startingBalance);

    if (alpacaKey && alpacaSecret) {
      alpacaBrokerClient.setCredentials({ apiKeyId: alpacaKey, secretKey: alpacaSecret, isPaper: true });
      marketEngine.setAlpacaCredentials(alpacaKey, alpacaSecret);
    }
  }, []);

  // ── Sync appMode to engine ─────────────────────────────────────────────────
  useEffect(() => {
    marketEngine.setMode(appMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aitrader_app_mode', appMode);
    }
  }, [appMode]);

  // ── Main Market Loop ───────────────────────────────────────────────────────
  const updateMarket = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const sym = activeSymbolRef.current;

      // 1. Fetch real market data (Binance → Alpaca → STALE)
      const currentSnap = await marketEngine.tick(sym);
      setSnapshot(currentSnap);

      // 2. Features (standard formulas)
      const feat = featureEngine.calculateFeatures(currentSnap);
      setFeatures(feat);

      // 3. Agents (with evidence, honest MacroAgent)
      const { signals: agentSigs, regime } = specialistAgentSystem.evaluateAllAgents(currentSnap, feat);
      setSignals(agentSigs);

      // 4. Signal Fusion (conflict detection)
      const fusionRes = signalFusionEngine.fuseSignals(agentSigs, regime);
      setFusion(fusionRes);

      // 5. LLM Decision (advisory; fail-closed on stale)
      const decId = generateDecisionId();
      const llmDec = await aiProviderManager.generateStructuredDecision(currentSnap, feat, agentSigs, fusionRes, regime);
      llmDec.decisionId = decId;
      setDecision(llmDec);

      // Persist decision log
      dbPersistence.saveDecisionLog(sym, currentSnap.price, llmDec);

      // 6. Portfolio sync
      let port: PortfolioState;
      if (alpacaBrokerClient.hasCredentials()) {
        try {
          const acc = await alpacaBrokerClient.getAccount();
          const alpacaPositions = await alpacaBrokerClient.getPositions();
          setPositions(alpacaPositions);
          port = {
            balance: acc.balance,
            initialBalance: parseFloat(localStorage.getItem('aitrader_starting_balance') ?? '100000'),
            equity: acc.equity,
            marginUsed: 0,
            freeMargin: acc.buyingPower,
            unrealizedPnL: alpacaPositions.reduce((s, p) => s + p.unrealizedPnL, 0),
            totalPnL: acc.equity - parseFloat(localStorage.getItem('aitrader_starting_balance') ?? '100000'),
            totalPnLPercent: 0,
            dailyPnL: 0,
            dailyDrawdownPercent: 0,
            maxDrawdownPercent: 0,
            totalFees: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            equityCurve: [],
          };
        } catch {
          // Alpaca API failed — fall back to paper broker
          paperBroker.updatePrices({ [sym]: currentSnap.price } as Record<SymbolId, number>);
          port = paperBroker.getPortfolioState(currentSnap.price);
          setPositions(paperBroker.getPositions());
        }
      } else {
        paperBroker.updatePrices({ [sym]: currentSnap.price } as Record<SymbolId, number>);
        port = paperBroker.getPortfolioState(currentSnap.price);
        setPositions(paperBroker.getPositions());
      }

      setPortfolio(port);
      setOrders(paperBroker.getOrders());
      setTradeHistory(paperBroker.getTradeHistory());

      // 7. Risk check (final authority)
      if (llmDec && port) {
        const riskRes = deterministicRiskEngine.evaluate(llmDec, port, currentSnap, feat);
        setRiskCheck(riskRes);
      }

    } catch (err) {
      console.error('Market update error:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating]);

  useEffect(() => {
    updateMarket();
    const interval = setInterval(updateMarket, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  // ── Trade Execution ────────────────────────────────────────────────────────
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleExecutePaperTrade = async () => {
    if (!decision?.entry || !riskCheck?.approved || !snapshot) return;
    const sym = activeSymbol;
    const side = decision.action === 'BUY' ? 'BUY' : 'SELL';
    const size = riskCheck.calculatedPositionSize || 0.01;

    if (alpacaBrokerClient.hasCredentials()) {
      const result = await alpacaBrokerClient.submitOrder(sym, size, side === 'BUY' ? 'buy' : 'sell', 'market');
      showNotification(result.success ? `Alpaca: ${result.message}` : `Alpaca Error: ${result.message}`);
    } else {
      const result = paperBroker.submitOrder(
        sym, side, size, snapshot.price,
        decision.stopLoss ?? snapshot.price * 0.985,
        decision.takeProfit ?? snapshot.price * 1.035,
        'AI', decision.decisionId
      );
      showNotification(result.success ? `Paper: ${result.message}` : `Paper Error: ${result.message}`);
    }
    await updateMarket();
  };

  const handleExecuteManualTrade = async (side: 'BUY' | 'SELL', size: number) => {
    if (!snapshot) return;
    const sym = activeSymbol;
    const stopLoss = side === 'BUY' ? snapshot.price * 0.985 : snapshot.price * 1.015;
    const takeProfit = side === 'BUY' ? snapshot.price * 1.035 : snapshot.price * 0.965;

    if (alpacaBrokerClient.hasCredentials()) {
      const result = await alpacaBrokerClient.submitOrder(sym, size, side === 'BUY' ? 'buy' : 'sell', 'market');
      showNotification(result.success ? `Alpaca: ${result.message}` : `Alpaca Error: ${result.message}`);
    } else {
      const result = paperBroker.submitOrder(sym, side, size, snapshot.price, stopLoss, takeProfit, 'MANUAL');
      showNotification(result.success ? `Manual ${side}: ${result.message}` : `Error: ${result.message}`);
    }
    await updateMarket();
  };

  const handleClosePosition = async (positionId: string) => {
    if (!snapshot) return;
    if (alpacaBrokerClient.hasCredentials()) {
      await alpacaBrokerClient.closePosition(positionId);
    } else {
      paperBroker.closePosition(positionId, snapshot.price, 'MANUAL');
    }
    await updateMarket();
  };

  // Bot Handlers
  const handleSpawnBot = (config: BotConfig) => {
    tradingBotEngine.start(config);
    showNotification(`🤖 Bot spawned for ${config.symbol} (cycle every ${config.cycleIntervalSeconds}s)`);
  };

  const handleStopBot = () => {
    tradingBotEngine.stop();
    showNotification(`⏹ Trading Bot stopped`);
  };

  const handleConfirmBotExit = () => {
    tradingBotEngine.confirmExit();
    showNotification(`✓ Bot exited market and closed positions`);
    updateMarket();
  };

  const handleResumeBot = () => {
    tradingBotEngine.resumeFromExitRequest();
    showNotification(`↺ Bot resumed trading loop`);
  };

  // ── Data quality helpers ───────────────────────────────────────────────────
  const dataScore = snapshot?.dataQuality.overallScore ?? 0;
  const isCritical = snapshot?.dataQuality.criticalStale ?? false;
  const isAlpacaConnected = alpacaBrokerClient.hasCredentials();

  return (
    <div className="min-h-screen bg-[#080E1A] text-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-[#080E1A]/95 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight">AI Quant Trader</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-bold border border-gray-700">LITE</span>
            </div>
          </div>

          {/* Mode + Data Status */}
          <div className="flex items-center gap-3 text-xs">
            {/* App Mode Pill */}
            <div className="flex items-center gap-1 rounded-lg overflow-hidden border border-gray-700">
              {(['DEMO', 'PAPER'] as AppMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setAppMode(m)}
                  className={`px-3 py-1.5 font-bold text-xs transition-all ${
                    appMode === m ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Data Quality */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold ${
              isCritical ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : dataScore > 75 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {isCritical ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              {isCritical ? 'DATA STALE' : `DATA ${dataScore}%`}
            </div>

            {/* Alpaca Status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-semibold ${
              isAlpacaConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-800/50 border-gray-700 text-gray-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isAlpacaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {isAlpacaConnected ? 'ALPACA LIVE' : 'PAPER SIM'}
            </div>

            {/* Portfolio equity */}
            {portfolio && (
              <div className="text-gray-300">
                <span className="text-gray-400">Equity:</span>{' '}
                <strong className={portfolio.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  ${portfolio.equity.toLocaleString()}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* CRITICAL STALE BANNER */}
        {isCritical && (
          <div className="bg-rose-600/20 border-t border-rose-500/30 px-4 py-2 flex items-center gap-2 text-xs text-rose-300 font-semibold">
            <AlertTriangle className="w-4 h-4" />
            ⚠ TRADING DISABLED — Market data is stale. AI will return NO_TRADE until live data is restored.
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-t border-gray-800 px-4">
          {([
            { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
            { id: 'terminal', label: '2. Terminal', icon: LineChart },
            { id: 'ai_center', label: '3. AI Decision', icon: Brain },
            { id: 'paper_trading', label: '4. Portfolio', icon: DollarSign },
            { id: 'research', label: '5. Research', icon: BarChart2 },
            { id: 'settings', label: '⚙ Settings', icon: Settings },
          ] as { id: TabId; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-blue-400 animate-bounce max-w-xs">
          {notification}
        </div>
      )}

      {/* Main Body */}
      <main className="max-w-screen-2xl mx-auto px-4 py-6 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <DashboardView
            snapshot={snapshot}
            signals={signals}
            decision={decision}
            riskCheck={riskCheck}
            portfolio={portfolio}
            appMode={appMode}
            onExecuteTrade={handleExecutePaperTrade}
            onNavigateSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'terminal' && snapshot && (
          <TerminalView
            snapshot={snapshot}
            symbols={SYMBOLS}
            activeSymbol={activeSymbol}
            onSelectSymbol={setActiveSymbol}
            decision={decision}
            positions={positions}
            portfolio={portfolio}
            onExecuteManualTrade={handleExecuteManualTrade}
            onClosePosition={handleClosePosition}
            botState={botState}
            onSpawnBot={handleSpawnBot}
            onStopBot={handleStopBot}
            onConfirmBotExit={handleConfirmBotExit}
            onResumeBot={handleResumeBot}
          />
        )}

        {activeTab === 'ai_center' && (
          <AIDecisionCenterView
            signals={signals}
            fusion={fusion}
            decision={decision}
            riskCheck={riskCheck}
            snapshot={snapshot}
            onExecuteTrade={handleExecutePaperTrade}
          />
        )}

        {activeTab === 'paper_trading' && (
          <PaperTradingView
            portfolio={portfolio}
            positions={positions}
            tradeHistory={tradeHistory}
            orders={orders}
            onClosePosition={handleClosePosition}
          />
        )}

        {activeTab === 'research' && (
          <ReplayResearchView
            signals={signals}
            portfolio={portfolio}
            tradeHistory={tradeHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onModeChange={(mode) => setAppMode(mode)}
            onCredentialsChange={() => updateMarket()}
          />
        )}
      </main>
    </div>
  );
}
