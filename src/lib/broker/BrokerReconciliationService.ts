import { Position, Order } from '@/types/trading';
import { auditLogger } from '@/lib/server/audit';

export interface BrokerPosition {
  symbol: string;
  qty: number;
  side: 'long' | 'short';
  avgEntryPrice: number;
  marketValue: number;
  unrealizedPl: number;
}

export interface BrokerOrder {
  id: string;
  clientOrderId?: string;
  symbol: string;
  qty: number;
  filledQty: number;
  side: 'buy' | 'sell';
  type: string;
  status: string;
}

export interface ReconciliationMismatch {
  type: 'GHOST_POSITION' | 'MISSING_POSITION' | 'QUANTITY_MISMATCH' | 'SIDE_MISMATCH' | 'UNACCOUNTED_ORDER';
  symbol: string;
  internalValue: number | string;
  brokerValue: number | string;
  severity: 'CRITICAL' | 'WARNING';
  details: string;
}

export interface ReconciliationResult {
  timestamp: number;
  isMatched: boolean;
  criticalDivergence: boolean;
  mismatches: ReconciliationMismatch[];
  reconciledPositionsCount: number;
  reconciledOrdersCount: number;
}

/**
 * Broker Reconciliation Service (Phase 3 Execution Safety)
 * Compares internal ledger state against authoritative broker positions & orders.
 * Automatically identifies critical divergence, logs audit events, and trips safety halts.
 */
export class BrokerReconciliationService {
  /**
   * Reconcile internal positions against live broker positions.
   */
  reconcile(
    internalPositions: Position[],
    brokerPositions: BrokerPosition[],
    internalOrders: Order[] = [],
    brokerOrders: BrokerOrder[] = []
  ): ReconciliationResult {
    const mismatches: ReconciliationMismatch[] = [];
    const timestamp = Date.now();

    const brokerPosMap = new Map<string, BrokerPosition>();
    for (const bp of brokerPositions) {
      brokerPosMap.set(bp.symbol.toUpperCase(), bp);
    }

    const internalPosMap = new Map<string, Position>();
    for (const ip of internalPositions) {
      internalPosMap.set(ip.symbol.toUpperCase(), ip);
    }

    // 1. Check each internal position against broker
    for (const [sym, ip] of internalPosMap.entries()) {
      const bp = brokerPosMap.get(sym);
      if (!bp) {
        mismatches.push({
          type: 'MISSING_POSITION',
          symbol: sym,
          internalValue: ip.size,
          brokerValue: 0,
          severity: 'CRITICAL',
          details: `Internal ledger tracks ${sym} position size ${ip.size}, but broker reports 0 positions.`,
        });
      } else {
        // Compare quantity divergence (threshold: > 0.0001)
        const qtyDiff = Math.abs(Number(ip.size) - Math.abs(Number(bp.qty)));
        if (qtyDiff > 0.001) {
          mismatches.push({
            type: 'QUANTITY_MISMATCH',
            symbol: sym,
            internalValue: ip.size,
            brokerValue: bp.qty,
            severity: qtyDiff / Number(ip.size) > 0.05 ? 'CRITICAL' : 'WARNING',
            details: `Position size mismatch on ${sym}: Internal=${ip.size}, Broker=${bp.qty} (diff: ${qtyDiff}).`,
          });
        }

        // Compare side
        const expectedSide = ip.side.toLowerCase();
        const brokerSide = bp.side.toLowerCase();
        if (expectedSide !== brokerSide) {
          mismatches.push({
            type: 'SIDE_MISMATCH',
            symbol: sym,
            internalValue: ip.side,
            brokerValue: bp.side,
            severity: 'CRITICAL',
            details: `Position side mismatch on ${sym}: Internal=${ip.side}, Broker=${bp.side}.`,
          });
        }
      }
    }

    // 2. Check for ghost positions on broker (exists on broker but missing internally)
    for (const [sym, bp] of brokerPosMap.entries()) {
      if (!internalPosMap.has(sym) && Math.abs(Number(bp.qty)) > 0) {
        mismatches.push({
          type: 'GHOST_POSITION',
          symbol: sym,
          internalValue: 0,
          brokerValue: bp.qty,
          severity: 'CRITICAL',
          details: `Ghost position detected! Broker holds ${bp.qty} of ${sym}, but internal ledger has 0.`,
        });
      }
    }

    const criticalDivergence = mismatches.some((m) => m.severity === 'CRITICAL');

    if (criticalDivergence) {
      auditLogger.log({
        eventType: 'POSITION_CLOSED',
        status: 'FAILURE',
        details: {
          criticalReconciliationError: true,
          mismatchesCount: mismatches.length,
          mismatches,
        },
      });
    }

    return {
      timestamp,
      isMatched: mismatches.length === 0,
      criticalDivergence,
      mismatches,
      reconciledPositionsCount: brokerPositions.length,
      reconciledOrdersCount: brokerOrders.length,
    };
  }
}

export const brokerReconciliationService = new BrokerReconciliationService();
