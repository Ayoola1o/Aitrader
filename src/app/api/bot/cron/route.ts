import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager, BotSessionRecord } from '@/lib/db/supabase';
import { SymbolId, MarketSnapshot, LLMDecision, FeatureVector, OrderBookLevel } from '@/types/trading';
import { featureEngine } from '@/lib/features/engine';
import { specialistAgentSystem } from '@/lib/agents/specialists';
import { signalFusionEngine } from '@/lib/fusion/engine';
import { aiProviderManager } from '@/lib/llm/providers';
import { deterministicRiskEngine } from '@/lib/risk/engine';
import { generateDecisionId } from '@/lib/db/schema';
import { alpacaBrokerClient, buildPortfolioFromAlpaca } from '@/lib/broker/alpaca';
import { paperBroker } from '@/lib/broker/paper';
import { telegramService } from '@/lib/notifications/telegram';
import { botRuntime } from '@/lib/bot/BotRuntime';
import { verifyCronAuth, authenticateRequest, unauthorizedResponse } from '@/lib/server/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow full 60s for Vercel serverless functions

async function fetchServerMarketSnapshot(symbol: SymbolId): Promise<MarketSnapshot> {
  const COINBASE_MAP: Record<string, string> = {
    BTCUSDT: 'BTC-USD',
    ETHUSDT: 'ETH-USD',
    SOLUSDT: 'SOL-USD',
    XRPUSDT: 'XRP-USD',
  };

  let price = 0;
  let bid = 0;
  let ask = 0;
  let change24h = 0;
  let high24h = 0;
  let low24h = 0;
  let volume24h = 0;
  let exchange = 'Binance';
  let isLive = false;

  // 1. Fetch Real Binance Ticker
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.lastPrice) {
        price = parseFloat(d.lastPrice);
        bid = parseFloat(d.bidPrice) || price * 0.9999;
        ask = parseFloat(d.askPrice) || price * 1.0001;
        change24h = parseFloat(d.priceChangePercent) || 0;
        high24h = parseFloat(d.highPrice) || price * 1.015;
        low24h = parseFloat(d.lowPrice) || price * 0.985;
        volume24h = parseFloat(d.volume) || 0;
        exchange = 'Binance';
        isLive = true;
      }
    }
  } catch {}

  // 2. Fetch Real Binance L2 Depth
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  let bidTotal = 0;
  let askTotal = 0;

  try {
    const depthRes = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (depthRes.ok) {
      const d = await depthRes.json();
      if (Array.isArray(d.bids) && Array.isArray(d.asks)) {
        d.bids.slice(0, 15).forEach((b: [string, string]) => {
          const sz = parseFloat(b[1]);
          bidTotal += sz;
          bids.push({ price: parseFloat(b[0]), size: sz, total: bidTotal });
        });
        d.asks.slice(0, 15).forEach((a: [string, string]) => {
          const sz = parseFloat(a[1]);
          askTotal += sz;
          asks.push({ price: parseFloat(a[0]), size: sz, total: askTotal });
        });
      }
    }
  } catch {}

  // 3. Fetch Real Binance 1m Candles
  const now = Date.now();
  const candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> = [];

  try {
    const klinesRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=60`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    if (klinesRes.ok) {
      const kData = await klinesRes.json();
      if (Array.isArray(kData)) {
        kData.forEach((k: any) => {
          candles.push({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          });
        });
      }
    }
  } catch {}

  const hasRealData = isLive && price > 0 && bids.length > 0 && candles.length > 0;

  return {
    symbol,
    exchange,
    timestamp: now,
    price,
    bid,
    ask,
    spread: Number((ask - bid).toFixed(2)),
    change24h,
    high24h,
    low24h,
    volume24h,
    candles,
    recentTrades: [],
    orderBook: {
      bids,
      asks,
      spread: Number((ask - bid).toFixed(2)),
      spreadPercent: price > 0 ? (ask - bid) / price : 0,
      bidAskImbalance: bidTotal + askTotal > 0 ? (bidTotal - askTotal) / (bidTotal + askTotal) : 0,
      bidDepth: bidTotal,
      askDepth: askTotal,
      midPrice: (bid + ask) / 2,
    },
    fundingRate: 0,
    openInterest: 0,
    openInterestChange24h: 0,
    longShortRatio: 1.0,
    liquidations24h: { longs: 0, shorts: 0 },
    dataQuality: {
      tickerStatus: hasRealData ? 'LIVE' : 'UNAVAILABLE',
      orderBookStatus: bids.length > 0 ? 'LIVE' : 'UNAVAILABLE',
      tradesStatus: hasRealData ? 'LIVE' : 'UNAVAILABLE',
      candlesStatus: candles.length > 0 ? 'LIVE' : 'UNAVAILABLE',
      fundingStatus: 'UNAVAILABLE',
      openInterestStatus: 'UNAVAILABLE',
      macroStatus: 'UNAVAILABLE',
      overallScore: hasRealData ? 95 : 0,
      criticalStale: !hasRealData,
      lastUpdated: now,
    },
    appMode: 'PAPER',
  };
}

export async function GET(req: NextRequest) {
  return handleCronCycle(req);
}

export async function POST(req: NextRequest) {
  return handleCronCycle(req);
}

async function handleCronCycle(req: NextRequest) {
  // 1. Rate Limiting Check
  const rate = checkRateLimit(req, { limit: 120, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  // 2. Cron Authentication Gate (CRON_SECRET or authenticated user)
  const isCronAuthorized = verifyCronAuth(req);
  if (!isCronAuthorized) {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return unauthorizedResponse('Unauthorized: Valid CRON_SECRET or Bearer token required to trigger bot cron execution.');
    }
  }

  try {
    // 1. Check for running bot session from Supabase (or /api/bot/state)
    const activeSession = await supabaseManager.getActiveBotSession();

    if (!activeSession || activeSession.status !== 'RUNNING') {
      return NextResponse.json({
        success: true,
        message: 'No active running bots to process',
        timestamp: new Date().toISOString(),
      });
    }

    const symbol = (activeSession.symbol || 'BTCUSDT') as SymbolId;
    const allocatedCapital = Number(activeSession.allocated_capital || 1000);
    const cycleCount = (activeSession.cycles_completed || 0) + 1;
    let tradesExecuted = activeSession.trades_executed || 0;
    let runningPnL = Number(activeSession.final_pnl || 0);
    let consecutiveNoTrades = activeSession.consecutive_no_trades || 0;
    let consecutiveLosses = activeSession.consecutive_losses || 0;

    const existingLogs = Array.isArray(activeSession.logs) ? activeSession.logs : [];
    let logId = existingLogs.length;

    const cycleLogs: Array<{ id: number; time: number; level: 'INFO' | 'ACTION' | 'WARN' | 'ERROR'; message: string }> = [
      {
        id: ++logId,
        time: Date.now(),
        level: 'INFO',
        message: `── [24/7 Cloud Cycle #${cycleCount}] ${symbol} ──`,
      },
    ];

    // 2. Execute Universal Bot Runtime Pipeline (Item 6 & 7)
    const runtimeResult = await botRuntime.executeCycle({
      symbol,
      allocatedCapital,
      riskPercent: 0.5,
      mode: 'PAPER',
    });

    const snap = runtimeResult.snapshot;
    cycleLogs.push({
      id: ++logId,
      time: Date.now(),
      level: 'INFO',
      message: `Live Price: $${snap.price.toLocaleString()} · Status: ${snap.dataQuality.tickerStatus}`,
    });

    let executed = runtimeResult.tradeExecuted || false;
    let lastAction = `Cycle #${cycleCount}: ${runtimeResult.logMessage}`;

    if (runtimeResult.halted) {
      cycleLogs.push({
        id: ++logId,
        time: Date.now(),
        level: 'ERROR',
        message: runtimeResult.logMessage,
      });
    } else if (runtimeResult.evalResult) {
      const { decision: dec, riskCheck: risk, fusion, regime } = runtimeResult.evalResult;

      cycleLogs.push({
        id: ++logId,
        time: Date.now(),
        level: 'INFO',
        message: `Fusion → ${fusion.dominantAction} · Regime: ${regime} · Decision: ${dec.action} (${(dec.confidence * 100).toFixed(0)}%)`,
      });

      if (executed) {
        tradesExecuted++;
        consecutiveNoTrades = 0;
        cycleLogs.push({
          id: ++logId,
          time: Date.now(),
          level: 'ACTION',
          message: runtimeResult.logMessage,
        });
      } else if (dec.action === 'NO_TRADE' || dec.action === 'HOLD') {
        consecutiveNoTrades++;
        cycleLogs.push({
          id: ++logId,
          time: Date.now(),
          level: 'INFO',
          message: `No Trade (${dec.action}) — ${dec.reasoning[0] ?? ''}`,
        });
      } else {
        consecutiveNoTrades++;
        cycleLogs.push({
          id: ++logId,
          time: Date.now(),
          level: 'WARN',
          message: `Risk Gate Rejected: ${risk.failedGates[0] ?? 'Risk threshold exceeded'}`,
        });
      }
    }

    // 7. Periodically Broadcast 30-Minute AI Specialist Consensus to Telegram
    const is30MinMark = cycleCount === 1 || cycleCount % 60 === 0 || Date.now() % 1800000 < 60000;
    if (is30MinMark && runtimeResult.evalResult) {
      const evalRes = runtimeResult.evalResult;
      telegramService.sendAIMarketConsensusBrief({
        symbol,
        price: snap.price,
        regime: evalRes.regime,
        fusionScore: evalRes.fusion.buyScore || evalRes.fusion.confidence,
        dominantAction: evalRes.decision.action,
        confidence: evalRes.decision.confidence,
        agents: evalRes.signals.map((s) => ({
          name: s.agentName,
          bias: s.bias,
          conf: s.confidence,
        })),
        llmRationale: evalRes.decision.reasoning[0],
      }).catch(() => {});
    }

    // 8. Update Supabase with cycle results
    const updatedLogs = [...cycleLogs, ...existingLogs].slice(0, 60);
    const decAction = runtimeResult.evalResult?.decision?.action || 'NO_TRADE';

    const updatedRecord: Partial<BotSessionRecord> & { session_id: string } = {
      session_id: activeSession.session_id,
      cycles_completed: cycleCount,
      trades_executed: tradesExecuted,
      final_pnl: runningPnL,
      status: 'RUNNING',
      last_action: lastAction,
      last_decision_action: decAction,
      consecutive_no_trades: consecutiveNoTrades,
      consecutive_losses: consecutiveLosses,
      current_price: snap.price,
      logs: updatedLogs,
    };

    await supabaseManager.saveBotSession(updatedRecord);

    return NextResponse.json({
      success: true,
      executed,
      cycleCount,
      symbol,
      price: snap.price,
      decision: decAction,
      tradesExecuted,
      logsGenerated: cycleLogs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BotCron] Execution error:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
