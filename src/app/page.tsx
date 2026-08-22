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
import { alpacaBrokerClient, buildPortfolioFromAlpaca } from '@/lib/broker/alpaca';
import { dbPersistence, generateDecisionId } from '@/lib/db/schema';
import { tradingBotEngine, BotState, BotConfig } from '@/lib/bot/engine';
import { applySettings, getStartingBalance, loadSettings } from '@/lib/settings';
import { telegramService } from '@/lib/notifications/telegram';

import { Sidebar, NavTabId } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { FooterStatusBar } from '@/components/layout/FooterStatusBar';

import { DashboardView } from '@/components/DashboardView';
import { TerminalView } from '@/components/TerminalView';
import { StrategyView } from '@/components/StrategyView';
import { BacktestingView } from '@/components/BacktestingView';
import { AlertsView } from '@/components/AlertsView';
import { MarketsScannerView } from '@/components/MarketsScannerView';
import { ReportsAttributionView } from '@/components/ReportsAttributionView';
import { TradingJournalView } from '@/components/TradingJournalView';
import { DataLabTelemetryView } from '@/components/DataLabTelemetryView';
import { PaperTradingView } from '@/components/PaperTradingView';
import { ReplayResearchView } from '@/components/ReplayResearchView';
import { SettingsView } from '@/components/SettingsView';
import { LoginView } from '@/components/auth/LoginView';
import { sessionManager, UserSession } from '@/lib/auth/session';

const SYMBOLS: SymbolId[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const POLL_INTERVAL_MS = 8000;

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => sessionManager.getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [activeSymbol, setActiveSymbol] = useState<SymbolId>('BTCUSDT');
  const [appMode, setAppMode] = useState<AppMode>('PAPER');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

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
    tradingBotEngine.onStateUpdate((s) => {
      setBotState(s);
      if (s.status === 'RUNNING' || s.status === 'PAUSED') {
        if (s.currentDecision) setDecision(s.currentDecision);
        if (s.currentRiskCheck) setRiskCheck(s.currentRiskCheck);
      }
    });
    tradingBotEngine.onExitRequest((req) => {
      showNotification(`⚠️ Bot Alert: ${req.reason}`);
    });
  }, []);

  // ── Boot: Load persistent credentials ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const alpacaKey = localStorage.getItem('aitrader_alpaca_api_key');
    const alpacaSecret = localStorage.getItem('aitrader_alpaca_secret_key');
    const savedMode = (localStorage.getItem('aitrader_app_mode') as AppMode) ?? 'PAPER';
    const startingBalance = getStartingBalance();

    setAppMode(savedMode);
    marketEngine.setMode(savedMode);
    paperBroker.setStartingBalance(startingBalance);
    applySettings(loadSettings());

    if (alpacaKey && alpacaSecret) {
      alpacaBrokerClient.setCredentials({ apiKeyId: alpacaKey, secretKey: alpacaSecret, isPaper: savedMode !== 'LIVE' });
    }

    // Sync active cloud bot from Supabase if running
    tradingBotEngine.syncWithCloud();
  }, []);

  // ── Sync appMode to engine ─────────────────────────────────────────────────
  useEffect(() => {
    marketEngine.setMode(appMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aitrader_app_mode', appMode);
      const alpacaKey = localStorage.getItem('aitrader_alpaca_api_key');
      const alpacaSecret = localStorage.getItem('aitrader_alpaca_secret_key');
      if (alpacaKey && alpacaSecret) {
        alpacaBrokerClient.setCredentials({ apiKeyId: alpacaKey, secretKey: alpacaSecret, isPaper: appMode !== 'LIVE' });
      }
    }
  }, [appMode]);

  // ── Main Market Loop ───────────────────────────────────────────────────────
  const updateMarket = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      const sym = activeSymbolRef.current;
      const botActive = tradingBotEngine.isRunning();

      const currentSnap = await marketEngine.tick(sym);
      setSnapshot(currentSnap);

      let feat = features;
      let llmDec = decision;

      if (!botActive) {
        feat = featureEngine.calculateFeatures(currentSnap);
        setFeatures(feat);

        const { signals: agentSigs, regime } = specialistAgentSystem.evaluateAllAgents(currentSnap, feat);
        setSignals(agentSigs);

        const fusionRes = signalFusionEngine.fuseSignals(agentSigs, regime);
        setFusion(fusionRes);

        const decId = generateDecisionId();
        llmDec = await aiProviderManager.generateStructuredDecision(currentSnap, feat, agentSigs, fusionRes, regime);
        llmDec.decisionId = decId;
        setDecision(llmDec);

        dbPersistence.saveDecisionLog(sym, currentSnap.price, llmDec);
      }

      const activeFeat = feat ?? featureEngine.calculateFeatures(currentSnap);
      const initialBalance = getStartingBalance();
      let port: PortfolioState | null = null;

      if (alpacaBrokerClient.hasCredentials()) {
        try {
          const acc = await alpacaBrokerClient.getAccount();
          const alpacaPositions = await alpacaBrokerClient.getPositions();
          const alpacaOrders = await alpacaBrokerClient.getOrders();
          const alpacaTrades = await alpacaBrokerClient.getTradeHistory();

          setPositions(alpacaPositions);
          setOrders(alpacaOrders);
          setTradeHistory(alpacaTrades);

          port = buildPortfolioFromAlpaca(acc, alpacaPositions, initialBalance, alpacaTrades);
          dbPersistence.syncPositions(alpacaPositions);
        } catch (alpacaErr) {
          console.warn('Alpaca market sync error:', alpacaErr);
          setPositions([]);
          setOrders([]);
          setTradeHistory([]);
          setPortfolio(null);
          setRiskCheck(null);
          showNotification(`Alpaca sync failed: ${alpacaErr instanceof Error ? alpacaErr.message : 'unavailable'}`);
          return;
        }
      } else {
        paperBroker.updatePrices({ [sym]: currentSnap.price } as Record<SymbolId, number>);
        port = paperBroker.getPortfolioState(currentSnap.price);
        setPositions(paperBroker.getPositions());
        setOrders(paperBroker.getOrders());
        setTradeHistory(paperBroker.getTradeHistory());
        dbPersistence.syncPositions(paperBroker.getPositions());
      }

      setPortfolio(port);

      if (!botActive && llmDec && port) {
        const riskRes = deterministicRiskEngine.evaluate(llmDec, port, currentSnap, activeFeat);
        setRiskCheck(riskRes);
      }
    } catch (err) {
      console.error('Market update error:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, features, decision]);

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
        sym,
        side,
        size,
        snapshot.price,
        decision.stopLoss ?? snapshot.price * 0.985,
        decision.takeProfit ?? snapshot.price * 1.035,
        'AI',
        decision.decisionId
      );
      showNotification(result.success ? `Paper: ${result.message}` : `Paper Error: ${result.message}`);
    }
    await updateMarket();
  };

  const handleExecuteManualTrade = async (
    side: 'BUY' | 'SELL',
    size: number,
    type: 'MARKET' | 'LIMIT' = 'MARKET',
    limitPrice?: number
  ) => {
    if (!snapshot) return;
    const sym = activeSymbol;
    const stopLoss = side === 'BUY' ? snapshot.price * 0.985 : snapshot.price * 1.015;
    const takeProfit = side === 'BUY' ? snapshot.price * 1.035 : snapshot.price * 0.965;

    if (alpacaBrokerClient.hasCredentials()) {
      const result = await alpacaBrokerClient.submitOrder(
        sym,
        size,
        side === 'BUY' ? 'buy' : 'sell',
        type.toLowerCase() === 'limit' ? 'limit' : 'market',
        limitPrice
      );
      showNotification(result.success ? `Alpaca: ${result.message}` : `Alpaca Error: ${result.message}`);
      if (result.success) {
        telegramService.sendTradeExecutionAlert({
          symbol: sym,
          side,
          size,
          price: limitPrice || snapshot.price,
          notional: size * (limitPrice || snapshot.price),
          takeProfit,
          stopLoss,
          decisionReason: 'Manual trade order ticket',
          source: 'MANUAL',
        }).catch(() => {});
      }
    } else {
      const result = paperBroker.submitOrder(sym, side, size, snapshot.price, stopLoss, takeProfit, 'MANUAL');
      showNotification(result.success ? `Manual ${side}: ${result.message}` : `Error: ${result.message}`);
      if (result.success) {
        telegramService.sendTradeExecutionAlert({
          symbol: sym,
          side,
          size,
          price: snapshot.price,
          notional: size * snapshot.price,
          takeProfit,
          stopLoss,
          decisionReason: 'Manual paper trade ticket',
          source: 'MANUAL',
        }).catch(() => {});
      }
    }
    await updateMarket();
  };

  const handleCancelOrder = async (orderId: string) => {
    if (alpacaBrokerClient.hasCredentials()) {
      const res = await alpacaBrokerClient.cancelOrder(orderId);
      showNotification(res.success ? `Alpaca: ${res.message}` : `Alpaca Error: ${res.message}`);
    } else {
      const res = paperBroker.cancelOrder(orderId);
      showNotification(res ? `Cancelled order ${orderId}` : `Could not cancel order`);
    }
    await updateMarket();
  };

  const handleClosePosition = async (positionId: string) => {
    if (!snapshot) return;
    const pos = positions.find((p) => p.id === positionId);

    if (alpacaBrokerClient.hasCredentials()) {
      try {
        const symbolToClose = pos?.symbol || snapshot.symbol;
        await alpacaBrokerClient.closePosition(symbolToClose);
        showNotification(`Alpaca: Closed ${symbolToClose} position`);
        telegramService.sendPositionClosedAlert({
          symbol: symbolToClose,
          side: pos?.side || 'LONG',
          entryPrice: pos?.entryPrice || snapshot.price,
          exitPrice: snapshot.price,
          size: pos?.size || 0,
          realizedPnL: 0,
          pnlPercent: 0,
          closeReason: 'MANUAL_CLOSE',
        }).catch(() => {});
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        showNotification(`Alpaca Error: ${message}`);
      }
    } else {
      const result = paperBroker.closePosition(positionId, snapshot.price, 'MANUAL');
      if (result) {
        showNotification(`Closed position (PnL: $${result.realizedPnL.toFixed(2)})`);
        if (pos) {
          telegramService.sendPositionClosedAlert({
            symbol: pos.symbol,
            side: pos.side,
            entryPrice: pos.entryPrice,
            exitPrice: snapshot.price,
            size: pos.size,
            realizedPnL: result.realizedPnL || 0,
            pnlPercent: result.realizedPnLPercent || 0,
            closeReason: 'MANUAL_CLOSE',
          }).catch(() => {});
        }
      } else {
        showNotification('Position not found');
      }
    }
    await updateMarket();
  };

  // Bot Handlers
  const handleSpawnBot = (config: BotConfig) => {
    tradingBotEngine.start({
      ...config,
      mode: appMode === 'LIVE' ? 'LIVE' : 'PAPER',
      liveTradingEnabled: appMode === 'LIVE',
    });
    showNotification(`🤖 Bot spawned for ${config.symbol} (cycle every ${config.cycleIntervalSeconds}s)`);
  };

  const handleStopBot = () => {
    tradingBotEngine.stop();
    showNotification(`⏹ Trading Bot stopped`);
  };

  const handleConfirmBotExit = async () => {
    await tradingBotEngine.confirmExit();
    showNotification(`✓ Bot exited market and closed positions`);
    updateMarket();
  };

  const handleResumeBot = () => {
    tradingBotEngine.resumeFromExitRequest();
    showNotification(`↺ Bot resumed trading loop`);
  };

  // Derived Title & Subtitle based on active tab
  const getTabInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Real-time overview of your AI trading system' };
      case 'terminal':
        return { title: 'Trading Terminal', subtitle: 'Interactive live charting & execution cockpit' };
      case 'markets':
        return { title: 'Markets Scanner', subtitle: 'Multi-asset price feed and market breadth' };
      case 'strategies':
        return { title: 'AI Strategies', subtitle: 'Autonomous quantitative multi-agent strategies' };
      case 'research':
        return { title: 'Research & Replay', subtitle: 'Historical simulation & backtest lab' };
      case 'backtesting':
        return { title: 'Backtesting Suite', subtitle: 'High-speed deterministic strategy backtester' };
      case 'paper_trading':
        return { title: 'Portfolio & Broker', subtitle: 'Positions, balances, and order management' };
      case 'reports':
        return { title: 'Performance Reports', subtitle: 'Detailed trade logs & attribution analysis' };
      case 'alerts':
        return { title: 'Real-Time Alerts', subtitle: 'System triggers, volatility signals & risk events' };
      case 'journal':
        return { title: 'Trading Journal', subtitle: 'AI decision logs, reasoning & post-trade reviews' };
      case 'data_lab':
        return { title: 'Data Lab', subtitle: 'Feature engineering, order book & liquidity telemetry' };
      case 'settings':
        return { title: 'System Settings', subtitle: 'API keys, risk parameters, and execution config' };
    }
  };

  const { title, subtitle } = getTabInfo();
  const currentEquity = portfolio?.equity ?? (paperBroker.getPortfolioState(snapshot?.price || 64713).equity || 100000);
  const currentPnL = portfolio?.dailyPnL ?? (paperBroker.getPortfolioState(snapshot?.price || 64713).dailyPnL || 0);
  const currentPnLPercent = currentEquity > 0 ? (currentPnL / currentEquity) * 100 : 0;

  if (!currentUser) {
    return <LoginView onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-[#080E1A] text-white flex flex-row overflow-x-hidden font-sans">
      {/* Pinned / Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        botStatus={botState.status === 'RUNNING' ? 'ACTIVE' : botState.status === 'PAUSED' ? 'PAUSED' : 'IDLE'}
        botName={botState.symbol ? `QUANTARION ${botState.symbol}` : 'QUANTARION V1.3'}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
        {/* Top Header */}
        <TopHeader
          title={title}
          subtitle={subtitle}
          appMode={appMode}
          accountEquity={currentEquity}
          todayPnL={currentPnL}
          todayPnLPercent={currentPnLPercent}
          exchangeName="BINANCE"
          isExchangeConnected={true}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onModeChange={(m) => setAppMode(m)}
          dataStatus={snapshot?.dataQuality?.tickerStatus || (appMode === 'DEMO' ? 'SIMULATED' : 'LIVE')}
        />

        {/* Notification Toast */}
        {notification && (
          <div className="fixed bottom-12 right-6 z-50 bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-blue-400 animate-bounce max-w-xs">
            {notification}
          </div>
        )}

        {/* Dynamic Page Views */}
        <main className="flex-1 px-3 sm:px-6 py-3 sm:py-4">
          {activeTab === 'dashboard' && (
            <DashboardView
              snapshot={snapshot}
              signals={signals}
              decision={decision}
              riskCheck={riskCheck}
              portfolio={portfolio}
              positions={positions}
              tradeHistory={tradeHistory}
              appMode={appMode}
              onExecuteTrade={handleExecutePaperTrade}
              onNavigateSettings={() => setActiveTab('settings')}
              onNavigateTerminal={() => setActiveTab('terminal')}
              onNavigatePortfolio={() => setActiveTab('paper_trading')}
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
              onCancelOrder={handleCancelOrder}
              botState={botState}
              onSpawnBot={handleSpawnBot}
              onStopBot={handleStopBot}
              onConfirmBotExit={handleConfirmBotExit}
              onResumeBot={handleResumeBot}
              signals={signals}
              fusion={fusion}
              riskCheck={riskCheck}
              orders={orders}
              tradeHistory={tradeHistory}
              features={features}
            />
          )}

          {activeTab === 'paper_trading' && (
            <PaperTradingView
              portfolio={portfolio}
              positions={positions}
              tradeHistory={tradeHistory}
              orders={orders}
              onClosePosition={handleClosePosition}
              onCancelOrder={handleCancelOrder}
            />
          )}

          {activeTab === 'research' && (
            <ReplayResearchView signals={signals} portfolio={portfolio} tradeHistory={tradeHistory} />
          )}

          {activeTab === 'strategies' && (
            <StrategyView
              snapshot={snapshot ?? undefined}
              portfolio={portfolio}
              positions={positions}
              tradeHistory={tradeHistory}
              activeSymbol={activeSymbol}
              onSelectSymbol={(sym) => {
                setActiveSymbol(sym);
                activeSymbolRef.current = sym;
              }}
              onNavigateDashboard={() => setActiveTab('dashboard')}
              onNavigateTerminal={() => setActiveTab('terminal')}
              onNavigateSettings={() => setActiveTab('settings')}
              onSpawnBot={handleSpawnBot}
            />
          )}

          {activeTab === 'markets' && (
            <MarketsScannerView
              snapshot={snapshot ?? undefined}
              onSelectSymbol={(sym) => {
                setActiveSymbol(sym);
                activeSymbolRef.current = sym;
              }}
              onNavigateTerminal={() => setActiveTab('terminal')}
              onSpawnBot={(sym) => {
                setActiveSymbol(sym);
                activeSymbolRef.current = sym;
                setActiveTab('strategies');
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsAttributionView portfolio={portfolio} tradeHistory={tradeHistory} />
          )}

          {activeTab === 'journal' && (
            <TradingJournalView
              tradeHistory={tradeHistory}
              onSelectSymbol={(sym) => {
                setActiveSymbol(sym);
                activeSymbolRef.current = sym;
              }}
              onNavigateTerminal={() => setActiveTab('terminal')}
            />
          )}

          {activeTab === 'data_lab' && (
            <DataLabTelemetryView snapshot={snapshot ?? undefined} />
          )}

          {activeTab === 'backtesting' && <BacktestingView snapshot={snapshot} />}

          {activeTab === 'alerts' && <AlertsView />}

          {activeTab === 'settings' && (
            <SettingsView
              onModeChange={(mode) => setAppMode(mode)}
              onCredentialsChange={() => updateMarket()}
              onNavigateTerminal={() => setActiveTab('terminal')}
              onNavigateStrategies={() => setActiveTab('strategies')}
            />
          )}
        </main>

        {/* Pinned Bottom Telemetry Strip */}
        <FooterStatusBar
          dataSource="BINANCE"
          marketDataStatus="LIVE"
          latencyMs={42}
          version="1.0.0"
        />
      </div>
    </div>
  );
}
