import { LLMDecision, AgentSignal, TradeHistoryItem, PortfolioState } from '@/types/trading';

export interface DecisionLogEntry {
  id: string;
  timestamp: number;
  symbol: string;
  price: number;
  action: string;
  confidence: number;
  regime: string;
  reasoning: string;
}

export class DatabasePersistence {
  private decisionLogs: DecisionLogEntry[] = [];

  public saveDecisionLog(
    symbol: string,
    price: number,
    decision: LLMDecision
  ) {
    const entry: DecisionLogEntry = {
      id: 'log-' + Date.now(),
      timestamp: Date.now(),
      symbol,
      price,
      action: decision.action,
      confidence: decision.confidence,
      regime: decision.regime,
      reasoning: decision.reasoning.join(' | '),
    };

    this.decisionLogs.unshift(entry);
    if (this.decisionLogs.length > 500) {
      this.decisionLogs.pop();
    }
  }

  public getDecisionLogs(): DecisionLogEntry[] {
    return this.decisionLogs;
  }

  public exportDecisionsToCSV(): string {
    const headers = ['ID', 'Timestamp', 'Symbol', 'Price', 'Action', 'Confidence', 'Regime', 'Reasoning'];
    const rows = this.decisionLogs.map((log) => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.symbol,
      log.price,
      log.action,
      log.confidence,
      log.regime,
      `"${log.reasoning.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public exportTradesToCSV(trades: TradeHistoryItem[]): string {
    const headers = ['ID', 'Symbol', 'Side', 'EntryPrice', 'ExitPrice', 'Size', 'RealizedPnL', 'CloseReason', 'ClosedAt'];
    const rows = trades.map((t) => [
      t.id,
      t.symbol,
      t.side,
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.realizedPnL,
      t.closeReason,
      new Date(t.closedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const dbPersistence = new DatabasePersistence();
