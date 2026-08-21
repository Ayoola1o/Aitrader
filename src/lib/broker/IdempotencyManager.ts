export interface ClientOrderRecord {
  clientOrderId: string;
  botId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: number;
  orderId?: string;
  status: 'SUBMITTED' | 'PROCESSED' | 'REJECTED';
}

/**
 * Idempotency Manager (Phase 3 Execution Safety)
 * Generates deterministic client order IDs and caches recently submitted orders
 * to guarantee that network retries or overlapping ticks NEVER create duplicate trades.
 */
export class IdempotencyManager {
  private submittedOrders = new Map<string, ClientOrderRecord>();
  private readonly WINDOW_MS = 60000; // 60-second deduplication window

  /**
   * Generate a deterministic, unique client order ID.
   * Format: `cl-ord-${botId}-${timestampWindow}-${side}-${cleanSymbol}`
   */
  generateClientOrderId(botId: string, symbol: string, side: 'BUY' | 'SELL', cycleTimestamp = Date.now()): string {
    const timeWindow = Math.floor(cycleTimestamp / 10000); // 10-second block
    const cleanSym = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `cl-${botId}-${timeWindow}-${side}-${cleanSym}`;
  }

  /**
   * Check if a client order ID has already been submitted recently.
   */
  hasOrder(clientOrderId: string): boolean {
    const record = this.submittedOrders.get(clientOrderId);
    if (!record) return false;
    if (Date.now() - record.timestamp > this.WINDOW_MS) {
      this.submittedOrders.delete(clientOrderId);
      return false;
    }
    return true;
  }

  /**
   * Register a submitted client order ID to prevent duplicate submissions.
   */
  registerOrder(order: ClientOrderRecord): boolean {
    if (this.hasOrder(order.clientOrderId)) {
      return false; // Duplicate detected!
    }

    this.submittedOrders.set(order.clientOrderId, {
      ...order,
      timestamp: Date.now(),
    });

    // Cleanup expired records
    this.prune();
    return true;
  }

  /**
   * Mark an order as processed with its broker order ID.
   */
  resolveOrder(clientOrderId: string, orderId: string): void {
    const record = this.submittedOrders.get(clientOrderId);
    if (record) {
      record.orderId = orderId;
      record.status = 'PROCESSED';
    }
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, record] of this.submittedOrders.entries()) {
      if (now - record.timestamp > this.WINDOW_MS) {
        this.submittedOrders.delete(id);
      }
    }
  }
}

export const idempotencyManager = new IdempotencyManager();
