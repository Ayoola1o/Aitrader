import { SymbolId, LLMDecision, TradeHistoryItem, Position } from '@/types/trading';
import { supabaseManager } from './supabase';

export interface DecisionJournalEntry {
  decisionId: string;
  timestamp: number;
  symbol: SymbolId;
  price: number;
  action: string;
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  regime: string;
  reasoning: string[];
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING';
  realizedPnL?: number;
  rMultiple?: number;
}

let decisionCounter = 0;

export function generateDecisionId(): string {
  decisionCounter++;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `DEC-${dateStr}-${String(decisionCounter).padStart(6, '0')}`;
}

export class DBPersistence {
  private decisions: DecisionJournalEntry[] = [];
  private readonly KEY = 'aitrader_decisions';

  constructor() {
    this.load();
    this.hydrateFromSupabase();
  }

  private load() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.KEY);
        if (raw) this.decisions = JSON.parse(raw).slice(-500); // keep last 500
      } catch {
        this.decisions = [];
      }
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(this.decisions.slice(-500)));
      } catch {
        // localStorage full — trim older entries
        this.decisions = this.decisions.slice(-100);
      }
    }
  }

  private async hydrateFromSupabase() {
    const client = supabaseManager.getClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('ai_decisions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        const mapped: DecisionJournalEntry[] = data.map((d: any) => ({
          decisionId: d.decision_id,
          timestamp: new Date(d.timestamp).getTime(),
          symbol: d.symbol as SymbolId,
          price: Number(d.price),
          action: d.action,
          confidence: Number(d.confidence),
          entry: d.entry_price ? Number(d.entry_price) : null,
          stopLoss: d.stop_loss ? Number(d.stop_loss) : null,
          takeProfit: d.take_profit ? Number(d.take_profit) : null,
          regime: d.regime,
          reasoning: Array.isArray(d.reasoning) ? d.reasoning : [],
          outcome: d.outcome as 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING',
          realizedPnL: d.realized_pnl ? Number(d.realized_pnl) : undefined,
          rMultiple: d.r_multiple ? Number(d.r_multiple) : undefined,
        }));

        // Merge with local decisions
        const existingIds = new Set(this.decisions.map(d => d.decisionId));
        for (const item of mapped) {
          if (!existingIds.has(item.decisionId)) {
            this.decisions.push(item);
          }
        }
        this.save();
      }
    } catch (err) {
      console.warn('[DBPersistence] Supabase hydration error:', err);
    }
  }

  saveDecisionLog(symbol: SymbolId, price: number, decision: LLMDecision) {
    const entry: DecisionJournalEntry = {
      decisionId: decision.decisionId ?? generateDecisionId(),
      timestamp: Date.now(),
      symbol, price,
      action: decision.action,
      confidence: decision.confidence,
      entry: decision.entry,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
      regime: decision.regime,
      reasoning: decision.reasoning,
      outcome: 'PENDING',
    };
    this.decisions.push(entry);
    this.save();

    // Async push to Supabase PostgreSQL
    const client = supabaseManager.getClient();
    if (client) {
      (async () => {
        try {
          const { error } = await client
            .from('ai_decisions')
            .upsert({
              decision_id: entry.decisionId,
              timestamp: new Date(entry.timestamp).toISOString(),
              symbol: entry.symbol,
              price: entry.price,
              action: entry.action,
              confidence: entry.confidence,
              entry_price: entry.entry,
              stop_loss: entry.stopLoss,
              take_profit: entry.takeProfit,
              regime: entry.regime,
              reasoning: entry.reasoning,
              outcome: entry.outcome,
            }, { onConflict: 'decision_id' });

          if (error) console.warn('[Supabase] Failed to log decision:', error.message);
        } catch (err) {
          console.warn('[Supabase] Decision log network error:', err);
        }
      })();
    }
  }

  updateDecisionOutcome(decisionId: string, trade: TradeHistoryItem) {
    const entry = this.decisions.find(d => d.decisionId === decisionId);
    if (entry) {
      entry.outcome = trade.realizedPnL > 0 ? 'WIN' : trade.realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN';
      entry.realizedPnL = trade.realizedPnL;
      entry.rMultiple = trade.rMultiple;
      this.save();
    }

    // Async update in Supabase PostgreSQL
    const client = supabaseManager.getClient();
    if (client) {
      const outcome = trade.realizedPnL > 0 ? 'WIN' : trade.realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN';
      (async () => {
        try {
          const { error } = await client
            .from('ai_decisions')
            .update({
              outcome,
              realized_pnl: trade.realizedPnL,
              r_multiple: trade.rMultiple,
            })
            .eq('decision_id', decisionId);

          if (error) console.warn('[Supabase] Failed to update outcome:', error.message);
        } catch (err) {
          console.warn('[Supabase] Outcome update network error:', err);
        }
      })();
    }
  }

  saveTrade(trade: TradeHistoryItem) {
    const client = supabaseManager.getClient();
    if (!client) return;

    (async () => {
      try {
        const { error } = await client
          .from('trades')
          .upsert({
            id: trade.id,
            decision_id: trade.decisionId || null,
            symbol: trade.symbol,
            side: trade.side,
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            size: trade.size,
            realized_pnl: trade.realizedPnL,
            realized_pnl_percent: trade.realizedPnLPercent,
            fee: trade.fee,
            slippage: trade.slippage,
            r_multiple: trade.rMultiple,
            close_reason: trade.closeReason,
            opened_at: new Date(trade.openedAt).toISOString(),
            closed_at: new Date(trade.closedAt).toISOString(),
          }, { onConflict: 'id' });

        if (error) console.warn('[Supabase] Failed to save trade:', error.message);
      } catch (err) {
        console.warn('[Supabase] Save trade network error:', err);
      }
    })();
  }

  syncPositions(positions: Position[]) {
    const client = supabaseManager.getClient();
    if (!client) return;

    if (positions.length === 0) return;

    const payload = positions.map(pos => ({
      id: pos.id,
      decision_id: pos.decisionId || null,
      symbol: pos.symbol,
      side: pos.side,
      entry_price: pos.entryPrice,
      current_price: pos.currentPrice,
      size: pos.size,
      stop_loss: pos.stopLoss,
      take_profit: pos.takeProfit,
      unrealized_pnl: pos.unrealizedPnL,
      risk_r: pos.riskR,
      opened_at: new Date(pos.openedAt).toISOString(),
      updated_at: new Date().toISOString(),
    }));

    (async () => {
      try {
        const { error } = await client
          .from('positions')
          .upsert(payload, { onConflict: 'id' });

        if (error) console.warn('[Supabase] Failed to sync positions:', error.message);
      } catch (err) {
        console.warn('[Supabase] Sync positions network error:', err);
      }
    })();
  }

  getDecisions(): DecisionJournalEntry[] {
    return [...this.decisions].reverse();
  }

  exportDecisionsToCSV(): string {
    const headers = ['decisionId', 'timestamp', 'symbol', 'price', 'action', 'confidence', 'entry', 'stopLoss', 'takeProfit', 'regime', 'outcome', 'realizedPnL', 'rMultiple'];
    const rows = this.decisions.map(d =>
      [d.decisionId, new Date(d.timestamp).toISOString(), d.symbol, d.price, d.action, d.confidence, d.entry, d.stopLoss, d.takeProfit, d.regime, d.outcome, d.realizedPnL ?? '', d.rMultiple ?? ''].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  exportTradesToCSV(trades: TradeHistoryItem[]): string {
    const headers = ['id', 'symbol', 'side', 'entry', 'exit', 'size', 'pnl', 'fee', 'slippage', 'rMultiple', 'reason', 'openedAt', 'closedAt'];
    const rows = trades.map(t =>
      [t.id, t.symbol, t.side, t.entryPrice, t.exitPrice, t.size, t.realizedPnL, t.fee, t.slippage, t.rMultiple, t.closeReason, new Date(t.openedAt).toISOString(), new Date(t.closedAt).toISOString()].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  clearAll() {
    this.decisions = [];
    this.save();
  }
}

export const dbPersistence = new DBPersistence();
