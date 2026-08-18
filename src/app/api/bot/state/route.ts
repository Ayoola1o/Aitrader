import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager, BotSessionRecord } from '@/lib/db/supabase';
import { SymbolId } from '@/types/trading';

export const dynamic = 'force-dynamic';

export interface BotStateItem {
  id: string;
  name: string;
  symbol: SymbolId;
  version: string;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'IDLE';
  allocatedCapital: number;
  cycleIntervalSeconds: number;
  cycleCount: number;
  tradesExecuted: number;
  runningPnL: number;
  dailyPnL: number;
  totalReturn: number;
  winRate: string;
  lastAction: string;
  lastDecisionAction: string;
  consecutiveNoTrades: number;
  consecutiveLosses: number;
  currentPrice: number;
  sparkline: number[];
  startedAt: number | null;
  log: Array<{ id: number; time: number; level: 'INFO' | 'ACTION' | 'WARN' | 'ERROR'; message: string }>;
}

// In-memory multi-bot registry with rich initial presets
let inMemoryBots: BotStateItem[] = [
  {
    id: 'strat-1',
    name: 'AI Quant Core v1.3',
    symbol: 'BTCUSDT',
    version: 'v1.3',
    status: 'RUNNING',
    allocatedCapital: 25000,
    cycleIntervalSeconds: 30,
    cycleCount: 142,
    tradesExecuted: 18,
    runningPnL: 1248.31,
    dailyPnL: 1248.31,
    totalReturn: 11.01,
    winRate: '68% | 2.4:1',
    lastAction: 'Monitoring order book & volume profiles',
    lastDecisionAction: 'BUY',
    consecutiveNoTrades: 0,
    consecutiveLosses: 0,
    currentPrice: 64250,
    sparkline: [100, 102, 105, 103, 108, 111],
    startedAt: Date.now() - 3600000 * 4,
    log: [
      { id: 1, time: Date.now() - 60000, level: 'INFO', message: 'Cycle #142: Evaluated 5 specialist agents on BTCUSDT — Fusion: BUY (71%)' },
      { id: 2, time: Date.now() - 120000, level: 'ACTION', message: 'Executed BUY 0.25 BTCUSDT @ $64,250 — Take-Profit: $66,170' },
    ],
  },
  {
    id: 'strat-2',
    name: 'Momentum Sweep v1.0',
    symbol: 'ETHUSDT',
    version: 'v1.0',
    status: 'RUNNING',
    allocatedCapital: 15000,
    cycleIntervalSeconds: 30,
    cycleCount: 88,
    tradesExecuted: 12,
    runningPnL: 420.5,
    dailyPnL: 420.5,
    totalReturn: 8.52,
    winRate: '66% | 2.2:1',
    lastAction: 'Scanning breakout channels',
    lastDecisionAction: 'HOLD',
    consecutiveNoTrades: 1,
    consecutiveLosses: 0,
    currentPrice: 3450,
    sparkline: [95, 98, 97, 101, 104, 108.52],
    startedAt: Date.now() - 3600000 * 2,
    log: [
      { id: 1, time: Date.now() - 45000, level: 'INFO', message: 'Cycle #88: Scanning EMA20 / VWAP cross on ETHUSDT' },
    ],
  },
  {
    id: 'strat-3',
    name: 'Liquidity Fade v2.0',
    symbol: 'SOLUSDT',
    version: 'v2.0',
    status: 'PAUSED',
    allocatedCapital: 10000,
    cycleIntervalSeconds: 45,
    cycleCount: 65,
    tradesExecuted: 9,
    runningPnL: 215.8,
    dailyPnL: 215.8,
    totalReturn: 6.72,
    winRate: '64% | 2.0:1',
    lastAction: 'Paused by risk gate',
    lastDecisionAction: 'NO_TRADE',
    consecutiveNoTrades: 3,
    consecutiveLosses: 1,
    currentPrice: 145.2,
    sparkline: [102, 100, 104, 107, 106, 106.72],
    startedAt: Date.now() - 3600000 * 3,
    log: [
      { id: 1, time: Date.now() - 90000, level: 'WARN', message: 'Bot paused by risk gate: Volatility spike exceeds 3.5%' },
    ],
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      bots: inMemoryBots,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'START';
    const botId = body.botId;

    if (action === 'CREATE') {
      const config = body.config || {};
      const symbol = (config.symbol || 'BTCUSDT') as SymbolId;
      const name = config.name || `${symbol} AI Quant Bot`;
      const allocatedCapital = Number(config.allocatedCapital || 1000);
      const cycleIntervalSeconds = Number(config.cycleIntervalSeconds || 30);
      const id = `bot-${Date.now()}`;

      const newBot: BotStateItem = {
        id,
        name,
        symbol,
        version: config.version || 'v1.0',
        status: 'RUNNING',
        allocatedCapital,
        cycleIntervalSeconds,
        cycleCount: 0,
        tradesExecuted: 0,
        runningPnL: 0,
        dailyPnL: 0,
        totalReturn: 0,
        winRate: '— | —',
        lastAction: 'Spawned online in Cloud 24/7',
        lastDecisionAction: 'INITIALIZING',
        consecutiveNoTrades: 0,
        consecutiveLosses: 0,
        currentPrice: 0,
        sparkline: [100, 100],
        startedAt: Date.now(),
        log: [
          {
            id: 1,
            time: Date.now(),
            level: 'INFO',
            message: `Bot "${name}" spawned for ${symbol} with $${allocatedCapital.toLocaleString()} capital.`,
          },
        ],
      };

      inMemoryBots.unshift(newBot);

      // Persist in Supabase if configured
      await supabaseManager.saveBotSession({
        session_id: id,
        symbol,
        allocated_capital: allocatedCapital,
        cycle_interval_seconds: cycleIntervalSeconds,
        cycles_completed: 0,
        trades_executed: 0,
        final_pnl: 0,
        status: 'RUNNING',
        last_action: 'Spawned online',
        logs: newBot.log,
        started_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: `Bot ${name} created`, bot: newBot, bots: inMemoryBots });
    }

    if (action === 'START' || action === 'RESUME') {
      const bot = inMemoryBots.find((b) => b.id === botId) || inMemoryBots[0];
      if (bot) {
        bot.status = 'RUNNING';
        bot.lastAction = 'Resumed running in Cloud 24/7';
        bot.log.unshift({
          id: bot.log.length + 1,
          time: Date.now(),
          level: 'INFO',
          message: `Bot "${bot.name}" activated/resumed.`,
        });
        await supabaseManager.saveBotSession({ session_id: bot.id, status: 'RUNNING', last_action: bot.lastAction, logs: bot.log });
      }
      return NextResponse.json({ success: true, message: 'Bot started', bots: inMemoryBots });
    }

    if (action === 'PAUSE') {
      const bot = inMemoryBots.find((b) => b.id === botId);
      if (bot) {
        bot.status = 'PAUSED';
        bot.lastAction = 'Paused by user';
        bot.log.unshift({
          id: bot.log.length + 1,
          time: Date.now(),
          level: 'WARN',
          message: `Bot "${bot.name}" paused.`,
        });
        await supabaseManager.saveBotSession({ session_id: bot.id, status: 'PAUSED', last_action: bot.lastAction, logs: bot.log });
      }
      return NextResponse.json({ success: true, message: 'Bot paused', bots: inMemoryBots });
    }

    if (action === 'STOP') {
      const bot = inMemoryBots.find((b) => b.id === botId);
      if (bot) {
        bot.status = 'STOPPED';
        bot.lastAction = 'Stopped by user';
        bot.log.unshift({
          id: bot.log.length + 1,
          time: Date.now(),
          level: 'WARN',
          message: `Bot "${bot.name}" stopped.`,
        });
        await supabaseManager.saveBotSession({ session_id: bot.id, status: 'STOPPED', last_action: bot.lastAction, logs: bot.log });
      }
      return NextResponse.json({ success: true, message: 'Bot stopped', bots: inMemoryBots });
    }

    if (action === 'DELETE') {
      inMemoryBots = inMemoryBots.filter((b) => b.id !== botId);
      return NextResponse.json({ success: true, message: 'Bot deleted', bots: inMemoryBots });
    }

    if (action === 'UPDATE') {
      const updates = body.updates || {};
      const bot = inMemoryBots.find((b) => b.id === botId);
      if (bot) {
        Object.assign(bot, updates);
      }
      return NextResponse.json({ success: true, bots: inMemoryBots });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
