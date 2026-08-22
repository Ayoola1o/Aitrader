'use client';

import {
  SymbolId,
  MarketSnapshot,
  PortfolioState,
  TradeHistoryItem,
  LLMDecision,
  RiskCheckResult,
} from '@/types/trading';
import { marketDataProvider } from '@/lib/market/MarketDataProvider';
import { tradingDecisionEngine, DecisionEngineOutput } from '@/lib/engine/TradingDecisionEngine';
import { paperBroker } from '@/lib/broker/paper';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';
import { dbPersistence, generateDecisionId } from '@/lib/db/schema';
import { telegramService } from '@/lib/notifications/telegram';
import { botLockManager } from '@/lib/bot/BotLockManager';
import { idempotencyManager } from '@/lib/broker/IdempotencyManager';

export interface BotRuntimeCycleInput {
  botId?: string;
  symbol: SymbolId;
  allocatedCapital: number;
  riskPercent?: number;
  mode?: 'PAPER' | 'LIVE' | 'DEMO' | 'REPLAY';
  liveTradingEnabled?: boolean;
}

export interface BotRuntimeCycleResult {
  success: boolean;
  halted: boolean;
  haltReason?: string;
  snapshot: MarketSnapshot;
  evalResult?: DecisionEngineOutput;
  tradeExecuted?: boolean;
  orderId?: string;
  clientOrderId?: string;
  logMessage: string;
}

export class BotRuntime {
  /**
   * Universal Bot Execution Pipeline (Phase 3 Execution Safety):
   * Distributed Lock -> MarketData -> Broker/Paper Portfolio -> DecisionEngine -> RiskEngine -> PositionSizing -> Execution -> Journal
   */
  public async executeCycle(input: BotRuntimeCycleInput): Promise<BotRuntimeCycleResult> {
    const {
      botId = `bot-${input.symbol.toLowerCase()}`,
      symbol,
      allocatedCapital,
      riskPercent = 0.5,
      mode = 'PAPER',
      liveTradingEnabled = false,
    } = input;

    // ── 1. Distributed Bot Lock (Prevent Concurrent Overlapping Cycles) ───────
    const lockAcquired = await botLockManager.acquireLock(botId);
    if (!lockAcquired) {
      const snap = await marketDataProvider.getSnapshot(symbol);
      return {
        success: false,
        halted: true,
        haltReason: `Bot cycle for ${botId} is already executing or locked. Skipped overlapping cycle.`,
        snapshot: snap,
        logMessage: `[CONCURRENCY LOCK] Cycle skipped: ${botId} execution lock active.`,
      };
    }

    try {
      // ── 2. Ingest Market Data ──────────────────────────────────────────────
      const snap = await marketDataProvider.getSnapshot(symbol);

      // Fail-Closed: If market data is unavailable in PAPER or LIVE mode, halt
      if (
        (mode === 'PAPER' || mode === 'LIVE') &&
        (snap.status === 'UNAVAILABLE' || snap.dataQuality.criticalStale || snap.price <= 0)
      ) {
        return {
          success: false,
          halted: true,
          haltReason: `Market data feed lost or stale on ${symbol}. Trading halted for safety per fail-closed policy.`,
          snapshot: snap,
          logMessage: `[FAIL-CLOSED] Live market feed unavailable on ${symbol} — Cycle halted.`,
        };
      }

      // ── 3. Strict LIVE Mode Multi-Condition Safety Gate ─────────────────────
      if (mode === 'LIVE') {
        if (!liveTradingEnabled) {
          return {
            success: false,
            halted: true,
            haltReason: 'LIVE trading requested but liveTradingEnabled flag is FALSE. Explicit user enablement required.',
            snapshot: snap,
            logMessage: '[SAFETY GATE] Blocked: LIVE mode requested without explicit user enablement.',
          };
        }

        if (!alpacaBrokerClient.hasCredentials()) {
          return {
            success: false,
            halted: true,
            haltReason: 'LIVE mode requires authorized broker credentials. No credentials configured.',
            snapshot: snap,
            logMessage: '[SAFETY GATE] Blocked: LIVE mode requires active broker credentials.',
          };
        }
      }

      // ── 4. Portfolio Ledger Sync (Live Broker vs Paper Broker) ──────────────
      let portfolio: PortfolioState;

      if ((mode === 'LIVE' || mode === 'PAPER') && alpacaBrokerClient.hasCredentials()) {
        try {
          const acc = await alpacaBrokerClient.getAccount();
          const equity = acc?.equity || allocatedCapital;
          const cash = acc?.cash || allocatedCapital;
          const buyingPower = acc?.buyingPower || allocatedCapital * 2;

          portfolio = {
            initialBalance: allocatedCapital,
            balance: cash,
            equity,
            buyingPower,
            freeMargin: buyingPower,
            marginUsed: 0,
            unrealizedPnL: equity - cash,
            totalPnL: equity - allocatedCapital,
            totalPnLPercent: ((equity - allocatedCapital) / allocatedCapital) * 100,
            dailyPnL: 0,
            dailyDrawdownPercent: 0,
            maxDrawdownPercent: 0,
            totalTradesCount: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            openPositionsCount: 0,
            equityCurve: [{ time: Date.now(), equity }],
          };
        } catch {
          // If broker account sync fails in LIVE mode, fail closed!
          return {
            success: false,
            halted: true,
            haltReason: 'Failed to sync live broker account details. Halting LIVE execution for safety.',
            snapshot: snap,
            logMessage: '[FAIL-CLOSED] Broker account sync failed in LIVE mode.',
          };
        }
      } else {
        paperBroker.updatePrices({ [symbol]: snap.price });
        portfolio = paperBroker.getPortfolioState(snap.price);
      }

      // ── 5. Unified Decision Engine ──────────────────────────────────────────
      const evalResult = await tradingDecisionEngine.evaluate({
        snapshot: snap,
        portfolio,
        allocatedCapital,
        riskPercent,
      });

      const { decision: dec, riskCheck: risk, positionSizing } = evalResult;
      dec.decisionId = generateDecisionId();

      // ── 6. Record Decision in Persistent Journal ────────────────────────────
      dbPersistence.saveDecisionLog(symbol, snap.price, dec);

      let tradeExecuted = false;
      let orderId: string | undefined;
      let clientOrderId: string | undefined;
      let logMessage = `Cycle completed. Consensus: ${evalResult.fusion.dominantAction} (${(dec.confidence * 100).toFixed(0)}% conf). Decision: ${dec.action}.`;

      // ── 7. Execution Adapter with Idempotency Protection ────────────────────
      if (risk.approved && (dec.action === 'BUY' || dec.action === 'SELL')) {
        clientOrderId = idempotencyManager.generateClientOrderId(botId, symbol, dec.action);

        const canSubmit = idempotencyManager.registerOrder({
          clientOrderId,
          botId,
          symbol,
          side: dec.action,
          size: positionSizing.sizeUnits,
          price: snap.price,
          timestamp: Date.now(),
          status: 'SUBMITTED',
        });

        if (!canSubmit) {
          return {
            success: true,
            halted: false,
            snapshot: snap,
            evalResult,
            tradeExecuted: false,
            logMessage: `[IDEMPOTENCY] Duplicate order detected (${clientOrderId}). Suppressed duplicate execution.`,
          };
        }

        if ((mode === 'LIVE' || mode === 'PAPER') && alpacaBrokerClient.hasCredentials()) {
          try {
            const alpacaSide = dec.action === 'BUY' ? 'buy' : 'sell';
            const alpacaSym =
              symbol === 'BTCUSDT'
                ? 'BTC/USD'
                : symbol === 'ETHUSDT'
                ? 'ETH/USD'
                : symbol === 'SOLUSDT'
                ? 'SOL/USD'
                : 'BTC/USD';
            const alpRes = await alpacaBrokerClient.submitOrder(
              alpacaSym,
              positionSizing.sizeUnits,
              alpacaSide,
              'market'
            );
            if (alpRes.success) {
              tradeExecuted = true;
              orderId = alpRes.orderId;
              idempotencyManager.resolveOrder(clientOrderId, orderId || 'LIVE_ORDER');
              logMessage = `[LIVE ALPACA] Executed ${dec.action} ${positionSizing.sizeUnits} ${symbol} (Order ID: ${alpRes.orderId || 'PENDING'})`;
            } else {
              logMessage = `[LIVE ALPACA] Order failed: ${alpRes.message}`;
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logMessage = `Alpaca Live execution error: ${errMsg}`;
          }
        } else {
          const orderRes = paperBroker.submitOrder(
            symbol,
            dec.action,
            positionSizing.sizeUnits,
            snap.price,
            dec.stopLoss || 0,
            dec.takeProfit || 0,
            'AI',
            dec.decisionId,
            snap.orderBook
          );

          if (orderRes.success) {
            tradeExecuted = true;
            orderId = orderRes.orderId;
            idempotencyManager.resolveOrder(clientOrderId, orderId || 'PAPER_ORDER');
            logMessage = `Executed ${dec.action} ${positionSizing.sizeUnits} ${symbol} @ $${snap.price.toLocaleString()} (${positionSizing.sizingReason})`;
          } else {
            logMessage = `Order rejected: ${orderRes.message}`;
          }
        }

        if (tradeExecuted) {
          // Dispatch Telegram Alert
          telegramService
            .sendTradeExecutionAlert({
              symbol,
              side: dec.action,
              size: positionSizing.sizeUnits,
              price: snap.price,
              notional: positionSizing.sizeUsd,
              takeProfit: dec.takeProfit || undefined,
              stopLoss: dec.stopLoss || undefined,
              decisionReason: dec.reasoning[0] || 'Multi-Agent Consensus Approved',
              source: 'AI_BOT',
            })
            .catch(() => {});
        }
      } else if (!risk.approved && (dec.action === 'BUY' || dec.action === 'SELL')) {
        logMessage = `Risk gate blocked trade: ${risk.failedGates[0] || 'Risk threshold exceeded'}`;
      }

      return {
        success: true,
        halted: false,
        snapshot: snap,
        evalResult,
        tradeExecuted,
        orderId,
        clientOrderId,
        logMessage,
      };
    } finally {
      // ── 8. Always Release Distributed Bot Lock ──────────────────────────────
      await botLockManager.releaseLock(botId);
    }
  }
}

export const botRuntime = new BotRuntime();
