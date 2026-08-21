'use client';

import { supabaseManager } from '@/lib/db/supabase';
import { Position, TradeHistoryItem, Order, PortfolioState, SymbolId } from '@/types/trading';
import { ExecutionFill } from './PaperExecutionEngine';

export interface PaperAccountRecord {
  account_id: string;
  user_id?: string;
  cash: number;
  equity: number;
  peak_equity: number;
  daily_pnl: number;
  total_fees: number;
  created_at: string;
  updated_at: string;
}

export interface PaperOrderRecord {
  order_id: string;
  account_id: string;
  bot_id?: string;
  symbol: SymbolId;
  side: 'BUY' | 'SELL';
  type: string;
  price: number;
  size: number;
  status: string;
  stop_loss?: number;
  take_profit?: number;
  decision_id?: string;
  created_at: string;
}

export interface PaperFillRecord {
  fill_id: string;
  order_id: string;
  account_id: string;
  symbol: SymbolId;
  side: 'BUY' | 'SELL';
  fill_price: number;
  filled_size: number;
  fee: number;
  slippage: number;
  timestamp: number;
}

export interface PaperPositionRecord {
  position_id: string;
  account_id: string;
  bot_id?: string;
  symbol: SymbolId;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  current_price: number;
  size: number;
  stop_loss?: number;
  take_profit?: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  opened_at: number;
  updated_at: number;
}

export interface PaperTradeRecord {
  trade_id: string;
  account_id: string;
  bot_id?: string;
  symbol: SymbolId;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  size: number;
  realized_pnl: number;
  realized_pnl_percent: number;
  fee: number;
  slippage: number;
  close_reason: string;
  opened_at: number;
  closed_at: number;
}

export interface PaperEquitySnapshotRecord {
  account_id: string;
  timestamp: number;
  equity: number;
  cash: number;
  open_positions_count: number;
}

export interface PaperRiskEventRecord {
  account_id: string;
  bot_id?: string;
  timestamp: number;
  event_type: string;
  reason: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export class PaperLedgerService {
  private defaultAccountId = 'paper-primary-ledger';

  /**
   * Sync full account balance & equity state to persistent store (Item 8)
   */
  public async syncAccountState(state: {
    cash: number;
    equity: number;
    peakEquity: number;
    dailyPnL: number;
    totalFees: number;
    accountId?: string;
  }) {
    const client = supabaseManager.getClient();
    const accountId = state.accountId || this.defaultAccountId;

    if (client) {
      try {
        await client.from('paper_accounts').upsert({
          account_id: accountId,
          cash: state.cash,
          equity: state.equity,
          peak_equity: state.peakEquity,
          daily_pnl: state.dailyPnL,
          total_fees: state.totalFees,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'account_id' });
      } catch {}
    }
  }

  /**
   * Persist order creation
   */
  public async recordOrder(order: PaperOrderRecord) {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        await client.from('paper_orders').upsert(order, { onConflict: 'order_id' });
      } catch {}
    }
  }

  /**
   * Persist order fill details
   */
  public async recordFill(fill: PaperFillRecord) {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        await client.from('paper_fills').insert(fill);
      } catch {}
    }
  }

  /**
   * Sync active positions to persistent store
   */
  public async syncPositions(positions: Position[], accountId: string = this.defaultAccountId) {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        const rows: PaperPositionRecord[] = positions.map((p) => ({
          position_id: p.id,
          account_id: accountId,
          symbol: p.symbol,
          side: p.side,
          entry_price: p.entryPrice,
          current_price: p.currentPrice,
          size: p.size,
          stop_loss: p.stopLoss,
          take_profit: p.takeProfit,
          unrealized_pnl: p.unrealizedPnL,
          unrealized_pnl_percent: p.unrealizedPnLPercent,
          opened_at: p.openedAt,
          updated_at: Date.now(),
        }));

        // Delete positions no longer open
        await client.from('paper_positions').delete().eq('account_id', accountId);
        if (rows.length > 0) {
          await client.from('paper_positions').insert(rows);
        }
      } catch {}
    }
  }

  /**
   * Persist closed trade history item
   */
  public async recordTrade(trade: TradeHistoryItem, accountId: string = this.defaultAccountId, botId?: string) {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        await client.from('paper_trades').insert({
          trade_id: trade.id,
          account_id: accountId,
          bot_id: botId,
          symbol: trade.symbol,
          side: trade.side,
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          size: trade.size,
          realized_pnl: trade.realizedPnL,
          realized_pnl_percent: trade.realizedPnLPercent,
          fee: trade.fee,
          slippage: trade.slippage,
          close_reason: trade.closeReason,
          opened_at: trade.openedAt,
          closed_at: trade.closedAt,
        });
      } catch {}
    }
  }

  /**
   * Record periodic equity snapshot
   */
  public async recordEquitySnapshot(snapshot: PaperEquitySnapshotRecord) {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        await client.from('paper_equity_snapshots').insert(snapshot);
      } catch {}
    }
  }

  /**
   * Record risk safety event
   */
  public async recordRiskEvent(event: PaperRiskEventRecord) {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        await client.from('paper_risk_events').insert(event);
      } catch {}
    }
  }
}

export const paperLedgerService = new PaperLedgerService();
