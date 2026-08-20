'use client';

import { SymbolId } from '@/types/trading';
import { supabaseManager } from '@/lib/db/supabase';
import { marketDataProvider } from '@/lib/market/MarketDataProvider';
import { tradingDecisionEngine } from '@/lib/engine/TradingDecisionEngine';
import { paperBroker } from '@/lib/broker/paper';
import { botRuntime } from '@/lib/bot/BotRuntime';

export interface CloudBotInstance {
  id: string;
  userId?: string;
  name: string;
  symbol: SymbolId;
  strategy: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';
  allocatedCapital: number;
  cycleIntervalSeconds: number;
  cycleCount: number;
  tradesExecuted: number;
  pnl: number;
  lastCycleAt?: number;
}

export class CloudBotScheduler {
  private runningBots: Map<string, CloudBotInstance> = new Map();
  private isProcessing = false;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.hydrateBotsFromDB();
    this.startSchedulerLoop();
  }

  private startSchedulerLoop() {
    if (typeof window === 'undefined') return;
    this.intervalTimer = setInterval(() => {
      this.processAllRunningBots();
    }, 15000);
  }

  public async hydrateBotsFromDB() {
    const client = supabaseManager.getClient();
    if (!client) {
      // Default instance
      if (this.runningBots.size === 0) {
        this.runningBots.set('bot-btc-core', {
          id: 'bot-btc-core',
          name: 'AI Quant Core v3 (BTC)',
          symbol: 'BTCUSDT',
          strategy: 'Multi-Agent Fusion',
          status: 'IDLE',
          allocatedCapital: 1000,
          cycleIntervalSeconds: 30,
          cycleCount: 0,
          tradesExecuted: 0,
          pnl: 0,
        });
      }
      return;
    }

    try {
      const { data, error } = await client.from('bots').select('*');
      if (!error && data && data.length > 0) {
        data.forEach((b: any) => {
          this.runningBots.set(b.id, {
            id: b.id,
            userId: b.user_id,
            name: b.name,
            symbol: b.symbol as SymbolId,
            strategy: b.strategy,
            status: b.status as any,
            allocatedCapital: Number(b.allocated_capital),
            cycleIntervalSeconds: b.cycle_interval_seconds || 30,
            cycleCount: 0,
            tradesExecuted: 0,
            pnl: 0,
          });
        });
      }
    } catch {}
  }

  /**
   * Process all running bots independently in parallel (Fix 13)
   */
  public async processAllRunningBots(): Promise<{ processedCount: number; errors: string[] }> {
    if (this.isProcessing) return { processedCount: 0, errors: [] };
    this.isProcessing = true;
    const errors: string[] = [];
    let processedCount = 0;

    const activeBots = Array.from(this.runningBots.values()).filter((b) => b.status === 'RUNNING');

    await Promise.all(
      activeBots.map(async (bot) => {
        try {
          const res = await botRuntime.executeCycle({
            symbol: bot.symbol,
            allocatedCapital: bot.allocatedCapital,
            riskPercent: 0.5,
            mode: 'PAPER',
          });

          bot.cycleCount++;
          bot.lastCycleAt = Date.now();

          if (res.halted) {
            bot.status = 'PAUSED';
            errors.push(`Bot ${bot.name} paused: ${res.haltReason}`);
            return;
          }

          processedCount++;
          if (res.tradeExecuted) {
            bot.tradesExecuted++;
          }
        } catch (err: any) {
          errors.push(`Bot ${bot.name} error: ${err?.message || String(err)}`);
        }
      })
    );

    this.isProcessing = false;
    return { processedCount, errors };
  }

  public getAllBots(): CloudBotInstance[] {
    return Array.from(this.runningBots.values());
  }

  public setBotStatus(botId: string, status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED') {
    const bot = this.runningBots.get(botId);
    if (bot) {
      bot.status = status;
      const client = supabaseManager.getClient();
      if (client) {
        client.from('bots').update({ status, updated_at: new Date().toISOString() }).eq('id', botId).then(() => {});
      }
    }
  }
}

export const cloudBotScheduler = new CloudBotScheduler();
