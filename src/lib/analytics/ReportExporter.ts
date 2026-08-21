import { StandardAnalyticsReport } from './AnalyticsEngine';
import { TradeHistoryItem } from '@/types/trading';

export class ReportExporter {
  /**
   * Exports trade history to standard CSV format
   */
  static exportTradesToCSV(trades: TradeHistoryItem[]): string {
    const headers = [
      'Trade ID',
      'Symbol',
      'Side',
      'Entry Price',
      'Exit Price',
      'Size',
      'Realized PnL',
      'Realized PnL %',
      'Fee',
      'Slippage',
      'Close Reason',
      'Opened At',
      'Closed At',
    ];

    const rows = trades.map((t) => [
      t.id,
      t.symbol,
      t.side,
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.realizedPnL || 0,
      t.realizedPnLPercent || 0,
      t.fee || 0,
      t.slippage || 0,
      t.closeReason,
      new Date(t.openedAt).toISOString(),
      new Date(t.closedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Exports comprehensive report to JSON string
   */
  static exportReportToJSON(report: StandardAnalyticsReport, trades: TradeHistoryItem[]): string {
    return JSON.stringify(
      {
        summary: report,
        tradesCount: trades.length,
        trades,
      },
      null,
      2
    );
  }
}
