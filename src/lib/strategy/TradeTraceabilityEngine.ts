export interface CompleteTradeLineage {
  tradeId: string;
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: string;
  fillPrice: number;
  filledSize: number;
  fee: number;
  slippage: number;
  realizedPnL?: number;
  timestamps: {
    decisionTime: number;
    orderTime: number;
    fillTime: number;
  };
  strategy: {
    strategyId: string;
    strategyVersion: string;
  };
  aiDecision: {
    decisionId: string;
    action: string;
    confidence: number;
    model: string;
    reasoning: string[];
  };
  riskDecision: {
    approved: boolean;
    sizingUnits: number;
    riskPercent: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
  };
  marketContext: {
    price: number;
    spread: number;
    regime: string;
  };
}

export class TradeTraceabilityEngine {
  private lineageRegistry = new Map<string, CompleteTradeLineage>(); // tradeId or orderId -> lineage

  registerLineage(lineage: CompleteTradeLineage): void {
    this.lineageRegistry.set(lineage.tradeId, lineage);
    if (lineage.orderId) {
      this.lineageRegistry.set(lineage.orderId, lineage);
    }
  }

  traceBackward(identifier: string): CompleteTradeLineage | null {
    return this.lineageRegistry.get(identifier) || null;
  }
}

export const tradeTraceabilityEngine = new TradeTraceabilityEngine();
