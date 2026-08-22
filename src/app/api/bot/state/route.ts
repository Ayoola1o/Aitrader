import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager, BotSessionRecord } from '@/lib/db/supabase';
import { SymbolId } from '@/types/trading';
import { authenticateRequest, unauthorizedResponse } from '@/lib/server/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { auditLogger } from '@/lib/server/audit';

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

let inMemoryBots: BotStateItem[] = [];

export async function GET(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 120, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

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
  const rate = checkRateLimit(req, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const auth = await authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse('Authentication required to modify bot runtime state.');
  }

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
        sparkline: [],
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
