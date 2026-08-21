import { TradeHistoryItem } from '@/types/trading';

export interface AttributionDimensionSummary {
  dimension: string;
  category: string;
  totalTrades: number;
  winRate: number;
  netPnL: number;
  profitFactor: number;
  averageTradePnL: number;
}

export class PerformanceAttribution {
  /**
   * Computes multi-dimensional performance attribution breakdowns
   */
  static attributeByDimension(
    trades: (TradeHistoryItem & { regime?: string; strategyId?: string })[],
    dimensionKey: 'symbol' | 'side' | 'regime' | 'strategyId' | 'closeReason'
  ): AttributionDimensionSummary[] {
    const groups = new Map<string, TradeHistoryItem[]>();

    for (const t of trades) {
      const val = String((t as any)[dimensionKey] || 'UNKNOWN');
      const existing = groups.get(val) || [];
      existing.push(t);
      groups.set(val, existing);
    }

    const summaries: AttributionDimensionSummary[] = [];

    for (const [cat, grpTrades] of groups.entries()) {
      const totalTrades = grpTrades.length;
      const wins = grpTrades.filter((t) => (t.realizedPnL || 0) > 0);
      const grossWin = wins.reduce((s, t) => s + (t.realizedPnL || 0), 0);
      const grossLoss = grpTrades
        .filter((t) => (t.realizedPnL || 0) < 0)
        .reduce((s, t) => s + Math.abs(t.realizedPnL || 0), 0);

      const netPnL = grpTrades.reduce((s, t) => s + (t.realizedPnL || 0), 0);
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
      const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99.9 : 0;
      const avgPnL = totalTrades > 0 ? netPnL / totalTrades : 0;

      summaries.push({
        dimension: dimensionKey,
        category: cat,
        totalTrades,
        winRate: Number(winRate.toFixed(2)),
        netPnL: Number(netPnL.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
        averageTradePnL: Number(avgPnL.toFixed(2)),
      });
    }

    return summaries.sort((a, b) => b.netPnL - a.netPnL);
  }
}
