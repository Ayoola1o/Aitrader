import { SymbolId, LLMDecision, TradeHistoryItem } from '@/types/trading';

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
  }

  updateDecisionOutcome(decisionId: string, trade: TradeHistoryItem) {
    const entry = this.decisions.find(d => d.decisionId === decisionId);
    if (entry) {
      entry.outcome = trade.realizedPnL > 0 ? 'WIN' : trade.realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN';
      entry.realizedPnL = trade.realizedPnL;
      entry.rMultiple = trade.rMultiple;
      this.save();
    }
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
