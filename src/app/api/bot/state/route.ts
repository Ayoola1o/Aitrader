import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager, BotSessionRecord } from '@/lib/db/supabase';
import { SymbolId } from '@/types/trading';

export const dynamic = 'force-dynamic';

// In-memory fallback if Supabase is not configured yet
let inMemoryBotState: {
  sessionId: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';
  symbol: SymbolId;
  allocatedCapital: number;
  cycleIntervalSeconds: number;
  cycleCount: number;
  tradesExecuted: number;
  runningPnL: number;
  lastAction: string;
  lastDecisionAction: string;
  consecutiveNoTrades: number;
  consecutiveLosses: number;
  currentPrice: number;
  startedAt: number | null;
  lastCycleAt: number | null;
  log: Array<{ id: number; time: number; level: 'INFO' | 'ACTION' | 'WARN' | 'ERROR'; message: string }>;
} = {
  sessionId: `BOT-SESSION-DEFAULT`,
  status: 'IDLE',
  symbol: 'BTCUSDT',
  allocatedCapital: 1000,
  cycleIntervalSeconds: 30,
  cycleCount: 0,
  tradesExecuted: 0,
  runningPnL: 0,
  lastAction: 'Not started',
  lastDecisionAction: '—',
  consecutiveNoTrades: 0,
  consecutiveLosses: 0,
  currentPrice: 0,
  startedAt: null,
  lastCycleAt: null,
  log: [],
};

export async function GET() {
  try {
    const supabaseSession = await supabaseManager.getActiveBotSession();
    if (supabaseSession) {
      return NextResponse.json({
        success: true,
        source: 'supabase',
        bot: {
          sessionId: supabaseSession.session_id,
          status: supabaseSession.status,
          symbol: supabaseSession.symbol as SymbolId,
          allocatedCapital: Number(supabaseSession.allocated_capital || 1000),
          cycleIntervalSeconds: supabaseSession.cycle_interval_seconds || 30,
          cycleCount: supabaseSession.cycles_completed || 0,
          tradesExecuted: supabaseSession.trades_executed || 0,
          runningPnL: Number(supabaseSession.final_pnl || 0),
          lastAction: supabaseSession.last_action || 'Running in Cloud',
          lastDecisionAction: supabaseSession.last_decision_action || '—',
          consecutiveNoTrades: supabaseSession.consecutive_no_trades || 0,
          consecutiveLosses: supabaseSession.consecutive_losses || 0,
          currentPrice: Number(supabaseSession.current_price || 0),
          startedAt: supabaseSession.started_at ? new Date(supabaseSession.started_at).getTime() : null,
          log: Array.isArray(supabaseSession.logs) ? supabaseSession.logs : [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      source: 'memory',
      bot: inMemoryBotState,
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

    if (action === 'START') {
      const config = body.config || {};
      const symbol = (config.symbol || 'BTCUSDT') as SymbolId;
      const allocatedCapital = Number(config.allocatedCapital || 1000);
      const cycleIntervalSeconds = Number(config.cycleIntervalSeconds || 30);
      const sessionId = `BOT-${symbol}-${Date.now()}`;

      const newLog = [
        {
          id: 1,
          time: Date.now(),
          level: 'INFO' as const,
          message: `Autonomous Cloud Bot spawned on ${symbol} ($${allocatedCapital.toLocaleString()} capital) via Vercel 24/7 Engine`,
        },
      ];

      inMemoryBotState = {
        sessionId,
        status: 'RUNNING',
        symbol,
        allocatedCapital,
        cycleIntervalSeconds,
        cycleCount: 0,
        tradesExecuted: 0,
        runningPnL: 0,
        lastAction: 'Spawned online',
        lastDecisionAction: 'INITIALIZING',
        consecutiveNoTrades: 0,
        consecutiveLosses: 0,
        currentPrice: 0,
        startedAt: Date.now(),
        lastCycleAt: Date.now(),
        log: newLog,
      };

      const record: Partial<BotSessionRecord> & { session_id: string } = {
        session_id: sessionId,
        symbol,
        allocated_capital: allocatedCapital,
        cycle_interval_seconds: cycleIntervalSeconds,
        cycles_completed: 0,
        trades_executed: 0,
        final_pnl: 0,
        status: 'RUNNING',
        last_action: 'Spawned online',
        last_decision_action: 'INITIALIZING',
        consecutive_no_trades: 0,
        consecutive_losses: 0,
        logs: newLog,
        started_at: new Date().toISOString(),
      };

      await supabaseManager.saveBotSession(record);

      return NextResponse.json({
        success: true,
        message: `Bot spawned for ${symbol}`,
        bot: inMemoryBotState,
      });
    }

    if (action === 'STOP') {
      inMemoryBotState.status = 'STOPPED';
      inMemoryBotState.lastAction = 'Stopped by user';
      inMemoryBotState.log = [
        {
          id: inMemoryBotState.log.length + 1,
          time: Date.now(),
          level: 'WARN' as const,
          message: 'Bot stopped by user command.',
        },
        ...inMemoryBotState.log,
      ].slice(0, 60);

      const active = await supabaseManager.getActiveBotSession();
      if (active) {
        await supabaseManager.saveBotSession({
          session_id: active.session_id,
          status: 'STOPPED',
          last_action: 'Stopped by user',
          stopped_at: new Date().toISOString(),
          logs: inMemoryBotState.log,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Bot stopped cleanly',
        bot: inMemoryBotState,
      });
    }

    if (action === 'SYNC') {
      // Direct update from background cron runner or UI sync
      const updates = body.updates || {};
      inMemoryBotState = { ...inMemoryBotState, ...updates };

      if (inMemoryBotState.sessionId) {
        await supabaseManager.saveBotSession({
          session_id: inMemoryBotState.sessionId,
          status: inMemoryBotState.status,
          cycles_completed: inMemoryBotState.cycleCount,
          trades_executed: inMemoryBotState.tradesExecuted,
          final_pnl: inMemoryBotState.runningPnL,
          last_action: inMemoryBotState.lastAction,
          last_decision_action: inMemoryBotState.lastDecisionAction,
          consecutive_no_trades: inMemoryBotState.consecutiveNoTrades,
          consecutive_losses: inMemoryBotState.consecutiveLosses,
          current_price: inMemoryBotState.currentPrice,
          logs: inMemoryBotState.log,
        });
      }

      return NextResponse.json({ success: true, bot: inMemoryBotState });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
