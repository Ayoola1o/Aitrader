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

export interface BotRuntimeCycleInput {
  symbol: SymbolId;
  allocatedCapital: number;
  riskPercent?: number;
  mode?: 'PAPER' | 'LIVE' | 'DEMO' | 'REPLAY';
}

export interface BotRuntimeCycleResult {
  success: boolean;
  halted: boolean;
  haltReason?: string;
  snapshot: MarketSnapshot;
  evalResult?: DecisionEngineOutput;
  tradeExecuted?: boolean;
  orderId?: string;
  logMessage: string;
}

export class BotRuntime {
  /**
   * Universal Bot Execution Pipeline (Item 6 & 7):
   * MarketData
   * → FeatureEngine
   * → SpecialistAgents
   * → SignalFusion
   * → DecisionEngine
   * → RiskEngine
   * → PositionSizingEngine
   * → ExecutionAdapter (Paper / Alpaca)
   * → PortfolioLedger
   * → Journal & Telegram
   */
  public async executeCycle(input: BotRuntimeCycleInput): Promise<BotRuntimeCycleResult> {
    const { symbol, allocatedCapital, riskPercent = 0.5, mode = 'PAPER' } = input;

    // 1. Ingest Market Data
    const snap = await marketDataProvider.getSnapshot(symbol);

    // Fail-Closed: If market data is unavailable in PAPER mode, halt
    if (mode === 'PAPER' && (snap.status === 'UNAVAILABLE' || snap.dataQuality.criticalStale || snap.price <= 0)) {
      return {
        success: false,
        halted: true,
        haltReason: `Market data feed lost or stale on ${symbol}. Trading halted for safety per fail-closed policy.`,
        snapshot: snap,
        logMessage: `[FAIL-CLOSED] Live market feed unavailable on ${symbol} — Cycle halted.`,
      };
    }

    // 2. Portfolio Ledger Sync
    paperBroker.updatePrices({ [symbol]: snap.price });
    const portfolio = paperBroker.getPortfolioState(snap.price);

    // 3. Unified Decision Engine (Features -> Agents -> Fusion -> AI Reasoner -> 10 Risk Gates -> Position Sizing)
    const evalResult = await tradingDecisionEngine.evaluate({
      snapshot: snap,
      portfolio,
      allocatedCapital,
      riskPercent,
    });

    const { decision: dec, riskCheck: risk, positionSizing } = evalResult;
    dec.decisionId = generateDecisionId();

    // 4. Record Decision in Persistent Journal
    dbPersistence.saveDecisionLog(symbol, snap.price, dec);

    let tradeExecuted = false;
    let orderId: string | undefined;
    let logMessage = `Cycle completed. Consensus: ${evalResult.fusion.dominantAction} (${(dec.confidence * 100).toFixed(0)}% conf). Decision: ${dec.action}.`;

    // 5. Execution Adapter: Execute Trade if Risk Approved
    if (risk.approved && (dec.action === 'BUY' || dec.action === 'SELL')) {
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
        logMessage = `Executed ${dec.action} ${positionSizing.sizeUnits} ${symbol} @ $${snap.price.toLocaleString()} (${positionSizing.sizingReason})`;

        // Dispatch Telegram Alert
        telegramService.sendTradeExecutionAlert({
          symbol,
          side: dec.action,
          size: positionSizing.sizeUnits,
          price: snap.price,
          notional: positionSizing.sizeUsd,
          takeProfit: dec.takeProfit || undefined,
          stopLoss: dec.stopLoss || undefined,
          decisionReason: dec.reasoning[0] || 'Multi-Agent Consensus Approved',
          source: 'AI_BOT',
        }).catch(() => {});
      } else {
        logMessage = `Order rejected: ${orderRes.message}`;
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
      logMessage,
    };
  }
}

export const botRuntime = new BotRuntime();
