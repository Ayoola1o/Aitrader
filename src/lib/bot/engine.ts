import {
  SymbolId, MarketSnapshot, LLMDecision, RiskCheckResult, PortfolioState, TradeHistoryItem,
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
import { tradingDecisionEngine } from '@/lib/engine/TradingDecisionEngine';
import { botRuntime } from '@/lib/bot/BotRuntime';

// ── Types ──────────────────────────────────────────────────────────────────────
export type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'STOPPED';

export interface BotLogEntry {
  id: number;
  time: number;
  level: 'INFO' | 'ACTION' | 'WARN' | 'ERROR';
  message: string;
}

export interface BotExitRequest {
  reason: string;
  urgent: boolean;
  triggeredAt: number;
}

export interface BotState {
  status: BotStatus;
  symbol: SymbolId;
  allocatedCapital: number;
  cycleCount: number;
  tradesExecuted: number;
  lastAction: string;
  lastDecisionAction: string;
  runningPnL: number;
  consecutiveNoTrades: number;
  consecutiveLosses: number;
  startedAt: number | null;
  lastCycleAt: number | null;
  exitRequest: BotExitRequest | null;
  log: BotLogEntry[];
  currentDecision: LLMDecision | null;
  currentRiskCheck: RiskCheckResult | null;
  currentPrice: number;
}

export interface BotConfig {
  symbol: SymbolId;
  allocatedCapital: number;      // Capital allocated to bot in USD (e.g. 500)
  cycleIntervalSeconds: number; // 15 | 30 | 60 | 120
  maxConsecutiveNoTrades: number; // 3 | 5 | 10
  maxConsecutiveLosses: number;  // 2 | 3 | 5
  autoConfirmExit: boolean;
}

const DEFAULT_CONFIG: BotConfig = {
  symbol: 'BTCUSDT',
  allocatedCapital: 1000,
  cycleIntervalSeconds: 30,
  maxConsecutiveNoTrades: 5,
  maxConsecutiveLosses: 3,
  autoConfirmExit: false,
};

// ── Engine ─────────────────────────────────────────────────────────────────────
export class TradingBotEngine {
  private config: BotConfig = { ...DEFAULT_CONFIG };
  private state: BotState = this.makeIdleState();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private logId = 0;
  private initialEquity = 0;

  private onStateUpdateCb: ((s: BotState) => void) | null = null;
  private onExitRequestCb: ((r: BotExitRequest, s: BotState) => void) | null = null;

  // ── Public API ───────────────────────────────────────────────────────────────

  onStateUpdate(cb: (s: BotState) => void) { this.onStateUpdateCb = cb; }
  onExitRequest(cb: (r: BotExitRequest, s: BotState) => void) { this.onExitRequestCb = cb; }
  getState(): BotState { return { ...this.state, log: [...this.state.log] }; }
  isRunning(): boolean { return this.state.status === 'RUNNING' || this.state.status === 'PAUSED'; }

  async syncWithCloud() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/bot/state', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.bot) {
          const cloudBot = d.bot;
          if (cloudBot.status === 'RUNNING') {
            this.state.status = 'RUNNING';
            this.state.symbol = cloudBot.symbol;
            this.state.allocatedCapital = cloudBot.allocatedCapital;
            this.state.cycleCount = cloudBot.cycleCount;
            this.state.tradesExecuted = cloudBot.tradesExecuted;
            this.state.runningPnL = cloudBot.runningPnL;
            this.state.lastAction = cloudBot.lastAction;
            this.state.lastDecisionAction = cloudBot.lastDecisionAction;
            if (Array.isArray(cloudBot.log) && cloudBot.log.length > 0) {
              this.state.log = cloudBot.log;
            }
            this.push();
          }
        }
      }
    } catch {}
  }

  start(cfg: BotConfig) {
    if (this.state.status === 'RUNNING') return;
    this.config = cfg;
    const port = paperBroker.getPortfolioState(0);
    this.initialEquity = port.equity || 10000;
    this.state = {
      ...this.makeIdleState(),
      status: 'RUNNING',
      symbol: cfg.symbol,
      allocatedCapital: cfg.allocatedCapital,
      startedAt: Date.now(),
    };
    this.log('INFO', `Bot spawned on ${cfg.symbol} with $${cfg.allocatedCapital.toLocaleString()} capital — cycle every ${cfg.cycleIntervalSeconds}s (Cloud 24/7 Active)`);
    this.push();
    this.scheduleCycle(0); // run immediately

    if (typeof window !== 'undefined') {
      fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START', config: cfg }),
      }).catch(() => {});
    }
  }

  stop() {
    if (this.state.status !== 'RUNNING' && this.state.status !== 'PAUSED') return;
    this.clearTimer();
    this.state.status = 'STOPPED';
    this.log('WARN', 'Bot stopped by user command.');
    this.push();

    if (typeof window !== 'undefined') {
      fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP' }),
      }).catch(() => {});
    }
  }

  /** User confirmed exit — close all positions then stop */
  async confirmExit() {
    this.clearTimer();
    this.state.status = 'STOPPING';
    this.log('ACTION', 'Closing all open positions…');
    this.push();

    const price = this.state.currentPrice;
    let closedCount = 0;

    if (alpacaBrokerClient.hasCredentials()) {
      try {
        closedCount = await alpacaBrokerClient.closeAllPositions();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.log('ERROR', `Alpaca close failed: ${message}`);
      }
    } else {
      const positions = paperBroker.getPositions();
      for (const pos of positions) {
        paperBroker.closePosition(pos.id, price || pos.currentPrice, 'MANUAL');
      }
      closedCount = positions.length;
    }

    this.log('INFO', `Closed ${closedCount} position(s). Bot shut down cleanly.`);
    this.state.status = 'STOPPED';
    this.state.exitRequest = null;
    this.push();

    if (typeof window !== 'undefined') {
      fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STOP' }),
      }).catch(() => {});
    }
  }

  /** User chose to keep the bot running after an exit request */
  resumeFromExitRequest() {
    if (this.state.status !== 'PAUSED') return;
    this.state.exitRequest = null;
    this.state.status = 'RUNNING';
    this.state.consecutiveLosses = 0;
    this.state.consecutiveNoTrades = 0;
    this.log('INFO', 'User chose to keep running. Counters reset. Resuming…');
    this.push();
    this.scheduleCycle(this.config.cycleIntervalSeconds * 1000);
  }

  // ── Private Loop ─────────────────────────────────────────────────────────────

  private scheduleCycle(delayMs: number) {
    this.clearTimer();
    this.timer = setTimeout(() => this.runCycle(), delayMs);
  }

  private clearTimer() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  private async runCycle() {
    if (this.state.status !== 'RUNNING') return;

    this.state.cycleCount++;
    this.state.lastCycleAt = Date.now();
    const sym = this.state.symbol;
    this.log('INFO', `── Cycle #${this.state.cycleCount} · ${sym} ──`);
    this.push();

    try {
      const runtimeResult = await botRuntime.executeCycle({
        symbol: sym,
        allocatedCapital: this.config.allocatedCapital,
        riskPercent: 0.5,
        mode: 'PAPER',
      });

      if (runtimeResult.halted) {
        this.log('ERROR', runtimeResult.logMessage);
        this.triggerExitRequest({
          reason: runtimeResult.haltReason || 'Halted by BotRuntime fail-closed safety policy.',
          urgent: true,
          triggeredAt: Date.now(),
        });
        return;
      }

      const snap = runtimeResult.snapshot;
      this.state.currentPrice = snap.price;

      if (runtimeResult.evalResult) {
        const { decision: dec, riskCheck: risk } = runtimeResult.evalResult;
        this.state.currentDecision = dec;
        this.state.lastDecisionAction = dec.action;
        this.state.currentRiskCheck = risk;
        this.log('INFO', runtimeResult.logMessage);

        if (runtimeResult.tradeExecuted) {
          this.state.tradesExecuted++;
        } else {
          this.state.consecutiveNoTrades++;
        }
      }

      // Update consecutive losses from history
      await this.updateLossCounter();

      // Check exit conditions
      const port = await this.getPortfolio(sym, snap.price);
      this.state.runningPnL = port.totalPnL;
      if (this.state.currentDecision) {
        const exitReq = this.checkExitConditions(port, this.state.currentDecision);
        if (exitReq) {
          this.triggerExitRequest(exitReq);
          return;
        }
      }

    } catch (err: any) {
      this.log('ERROR', `Cycle failed: ${err?.message ?? String(err)}`);
    }

    this.scheduleNext();
    this.push();
  }

  private async executeTrade(
    sym: SymbolId,
    dec: LLMDecision,
    risk: RiskCheckResult,
    snap: MarketSnapshot,
    port: PortfolioState
  ) {
    const side = dec.action === 'BUY' ? 'BUY' : 'SELL';
    
    // Position sizing based on user's allocatedCapital
    const capital = Math.min(this.config.allocatedCapital, port.freeMargin || this.config.allocatedCapital);
    const capitalSizeUnits = snap.price > 0 ? capital / snap.price : 0.001;

    // Use smaller of risk-calculated size or allocated capital size
    let size = risk.calculatedPositionSize > 0 
      ? Math.min(risk.calculatedPositionSize, capitalSizeUnits) 
      : capitalSizeUnits;
    
    // Precision format per symbol
    size = Number(size.toFixed(sym === 'BTCUSDT' ? 4 : sym === 'ETHUSDT' ? 3 : 2));
    if (size <= 0) size = 0.001;

    const sl = dec.stopLoss ?? (dec.action === 'BUY' ? snap.price * 0.985 : snap.price * 1.015);
    const tp = dec.takeProfit ?? (dec.action === 'BUY' ? snap.price * 1.03 : snap.price * 0.97);

    let success = false;
    let msg = '';

    if (alpacaBrokerClient.hasCredentials()) {
      const res = await alpacaBrokerClient.submitOrder(sym, size, side === 'BUY' ? 'buy' : 'sell', 'market');
      success = res.success; msg = res.message;
    } else {
      const res = paperBroker.submitOrder(sym, side, size, snap.price, sl, tp, 'AI', dec.decisionId);
      success = res.success; msg = res.message;
    }

    if (success) {
      this.state.tradesExecuted++;
      this.state.consecutiveNoTrades = 0;
      const notionalVal = (size * snap.price).toFixed(2);
      this.state.lastAction = `${side} ${size} ${sym} ($${notionalVal}) [${new Date().toLocaleTimeString()}]`;
      this.log('ACTION', `✓ EXECUTED: ${side} ${size} ${sym} (~$${notionalVal} of $${this.config.allocatedCapital} capital) — SL:$${sl.toFixed(2)} TP:$${tp.toFixed(2)}`);
    } else {
      this.state.consecutiveNoTrades++;
      this.log('WARN', `Execution failed: ${msg}`);
    }
  }

  private async getPortfolio(sym: SymbolId, price: number): Promise<PortfolioState> {
    if (alpacaBrokerClient.hasCredentials()) {
      try {
        const acc = await alpacaBrokerClient.getAccount();
        const positions = await alpacaBrokerClient.getPositions();
        const trades = await alpacaBrokerClient.getTradeHistory();
        return buildPortfolioFromAlpaca(acc, positions, this.initialEquity, trades);
      } catch { /* fall through */ }
    }
    paperBroker.updatePrices({ [sym]: price } as Record<SymbolId, number>);
    return paperBroker.getPortfolioState(price);
  }

  private async updateLossCounter() {
    let history: TradeHistoryItem[] = [];
    if (alpacaBrokerClient.hasCredentials()) {
      try {
        history = await alpacaBrokerClient.getTradeHistory();
      } catch {
        history = paperBroker.getTradeHistory();
      }
    } else {
      history = paperBroker.getTradeHistory();
    }
    if (history.length === 0) return;
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].realizedPnL < 0) streak++;
      else break;
    }
    this.state.consecutiveLosses = streak;
    if (streak > 0) this.log('WARN', `Losing streak: ${streak} consecutive loss(es)`);
  }

  private checkExitConditions(port: PortfolioState, dec: LLMDecision): BotExitRequest | null {
    if (port.dailyDrawdownPercent >= 5) {
      return { reason: `Daily drawdown ${port.dailyDrawdownPercent.toFixed(2)}% hit the 5% limit`, urgent: true, triggeredAt: Date.now() };
    }
    if (this.config.allocatedCapital > 0 && Math.abs(this.state.runningPnL) >= this.config.allocatedCapital * 0.20 && this.state.runningPnL < 0) {
      return { reason: `Bot session loss reached -$${Math.abs(this.state.runningPnL).toFixed(2)} (20% of allocated capital $${this.config.allocatedCapital})`, urgent: true, triggeredAt: Date.now() };
    }
    if (this.state.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      return { reason: `${this.state.consecutiveLosses} consecutive losing trades hit the limit of ${this.config.maxConsecutiveLosses}`, urgent: false, triggeredAt: Date.now() };
    }
    if (this.state.consecutiveNoTrades >= this.config.maxConsecutiveNoTrades) {
      return { reason: `No tradeable setup found for ${this.state.consecutiveNoTrades} consecutive cycles`, urgent: false, triggeredAt: Date.now() };
    }
    const reasoning = dec.reasoning.join(' ').toLowerCase();
    if (reasoning.includes('close all') || reasoning.includes('exit market') || reasoning.includes('liquidate all')) {
      return { reason: 'AI advisory is explicitly recommending to exit all positions', urgent: false, triggeredAt: Date.now() };
    }
    return null;
  }

  private triggerExitRequest(req: BotExitRequest) {
    this.clearTimer();
    this.state.exitRequest = req;
    this.state.status = 'PAUSED';
    this.log('WARN', `⚠ Exit requested: ${req.reason}`);
    this.push();
    this.onExitRequestCb?.(req, this.getState());
    if (this.config.autoConfirmExit) {
      setTimeout(() => this.confirmExit(), 500);
    }
  }

  private scheduleNext() {
    if (this.state.status === 'RUNNING') {
      this.scheduleCycle(this.config.cycleIntervalSeconds * 1000);
    }
  }

  private log(level: BotLogEntry['level'], message: string) {
    this.state.log = [
      { id: ++this.logId, time: Date.now(), level, message },
      ...this.state.log,
    ].slice(0, 60);
  }

  private push() {
    this.onStateUpdateCb?.(this.getState());
  }

  private makeIdleState(): BotState {
    return {
      status: 'IDLE', symbol: 'BTCUSDT', allocatedCapital: 1000, cycleCount: 0, tradesExecuted: 0,
      lastAction: 'Not started', lastDecisionAction: '—', runningPnL: 0,
      consecutiveNoTrades: 0, consecutiveLosses: 0, startedAt: null,
      lastCycleAt: null, exitRequest: null, log: [], currentDecision: null,
      currentRiskCheck: null, currentPrice: 0,
    };
  }
}

export const tradingBotEngine = new TradingBotEngine();
