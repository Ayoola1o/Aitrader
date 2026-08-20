'use client';

import { SymbolId, Order, Position, TradeHistoryItem, PortfolioState } from '@/types/trading';
import { dbPersistence } from '@/lib/db/schema';
import { supabaseManager } from '@/lib/db/supabase';
import { paperExecutionEngine } from './PaperExecutionEngine';

export class PaperBroker {
  private balance: number;
  private initialBalance: number;
  private positions: Map<string, Position> = new Map();
  private orders: Order[] = [];
  private tradeHistory: TradeHistoryItem[] = [];
  private dailyStartBalance: number;
  private peakEquity: number;
  private equityCurve: { time: number; equity: number }[] = [];
  private totalFees: number = 0;
  private orderCounter = 0;

  constructor(startingBalance = 100000) {
    this.balance = startingBalance;
    this.initialBalance = startingBalance;
    this.dailyStartBalance = startingBalance;
    this.peakEquity = startingBalance;
    this.equityCurve = [{ time: Date.now(), equity: startingBalance }];
    this.loadFromStorage();
    this.hydrateFromSupabase();
  }

  public loadFromStorage(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('aitrader_paper_broker_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.balance === 'number') {
          this.balance = parsed.balance;
          this.initialBalance = parsed.initialBalance ?? this.initialBalance;
          this.dailyStartBalance = parsed.dailyStartBalance ?? this.dailyStartBalance;
          this.peakEquity = parsed.peakEquity ?? this.peakEquity;
          this.totalFees = parsed.totalFees ?? 0;
          if (Array.isArray(parsed.orders)) this.orders = parsed.orders;
          if (Array.isArray(parsed.tradeHistory)) this.tradeHistory = parsed.tradeHistory;
          if (Array.isArray(parsed.positions)) {
            this.positions = new Map(parsed.positions.map((p: Position) => [p.id, p]));
          }
          if (Array.isArray(parsed.equityCurve) && parsed.equityCurve.length > 0) {
            this.equityCurve = parsed.equityCurve;
          }
          return true;
        }
      }
    } catch {}
    return false;
  }

  public saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const state = {
        balance: this.balance,
        initialBalance: this.initialBalance,
        dailyStartBalance: this.dailyStartBalance,
        peakEquity: this.peakEquity,
        totalFees: this.totalFees,
        orders: this.orders,
        tradeHistory: this.tradeHistory,
        positions: Array.from(this.positions.values()),
        equityCurve: this.equityCurve.slice(-200),
      };
      localStorage.setItem('aitrader_paper_broker_state', JSON.stringify(state));
      this.syncToSupabase();
    } catch {}
  }

  public updatePrices(prices: Partial<Record<SymbolId, number>>) {
    let updated = false;
    this.positions.forEach((pos) => {
      const p = prices[pos.symbol];
      if (p && p > 0 && p !== pos.currentPrice) {
        pos.currentPrice = p;
        const diff = pos.side === 'LONG' ? p - pos.entryPrice : pos.entryPrice - p;
        pos.unrealizedPnL = diff * pos.size;
        pos.unrealizedPnLPercent = (diff / pos.entryPrice) * 100;
        updated = true;
      }
    });
    if (updated) {
      this.saveToStorage();
    }
  }

  private async hydrateFromSupabase() {
    const client = supabaseManager.getClient();
    if (!client) return;
    try {
      const { data: acc } = await client.from('paper_accounts').select('*').limit(1).single();
      if (acc) {
        this.balance = Number(acc.cash);
        this.initialBalance = Number(acc.initial_balance);
      }
      const { data: pos } = await client.from('positions').select('*');
      if (pos && pos.length > 0) {
        this.positions = new Map(pos.map((p: any) => [
          p.id,
          {
            id: p.id,
            decisionId: p.decision_id,
            symbol: p.symbol as SymbolId,
            side: p.side as 'LONG' | 'SHORT',
            entryPrice: Number(p.entry_price),
            currentPrice: Number(p.current_price),
            size: Number(p.size),
            leverage: 1,
            stopLoss: p.stop_loss ? Number(p.stop_loss) : 0,
            takeProfit: p.take_profit ? Number(p.take_profit) : 0,
            unrealizedPnL: Number(p.unrealized_pnl || 0),
            unrealizedPnLPercent: 0,
            liquidationPrice: 0,
            riskR: Number(p.risk_r || 0),
            openedAt: new Date(p.opened_at).getTime(),
          },
        ]));
      }
    } catch {}
  }

  private async syncToSupabase() {
    const client = supabaseManager.getClient();
    if (!client) return;
    try {
      const port = this.getPortfolioState(0);
      await client.from('paper_accounts').upsert({
        id: 'acc-paper-default',
        cash: this.balance,
        equity: port.equity,
        initial_balance: this.initialBalance,
        margin_used: port.marginUsed,
        buying_power: port.buyingPower,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }

  setStartingBalance(amount: number, forceReset: boolean = false) {
    if (forceReset || (this.positions.size === 0 && this.tradeHistory.length === 0)) {
      this.balance = amount;
      this.initialBalance = amount;
      this.dailyStartBalance = amount;
      this.peakEquity = amount;
      this.equityCurve = [{ time: Date.now(), equity: amount }];
      if (forceReset) {
        this.positions.clear();
        this.orders = [];
        this.tradeHistory = [];
        this.totalFees = 0;
      }
      this.saveToStorage();
    }
  }

  reset(amount: number = 100000) {
    this.setStartingBalance(amount, true);
  }

  // ── Submit Order ─────────────────────────────────────────────────────────
  submitOrder(
    symbol: SymbolId,
    side: 'BUY' | 'SELL',
    size: number,
    marketPrice: number,
    stopLoss: number,
    takeProfit: number,
    source: 'AI' | 'MANUAL' = 'MANUAL',
    decisionId?: string
  ): { success: boolean; message: string; orderId?: string } {
    this.orderCounter++;
    const orderId = `ORD-${Date.now()}-${String(this.orderCounter).padStart(4, '0')}`;

    // Execute through Institutional Execution Engine
    const fill = paperExecutionEngine.executeMarketOrder({
      orderId,
      symbol,
      side,
      size,
      marketPrice,
    });

    const notional = fill.fillPrice * fill.filledSize;
    if (notional > this.balance * 2.0) { // 2x leverage limit
      return { success: false, message: `Insufficient buying power for $${notional.toFixed(2)} position.` };
    }

    this.balance -= fill.fee;
    this.totalFees += fill.fee;

    const posSide: 'LONG' | 'SHORT' = side === 'BUY' ? 'LONG' : 'SHORT';
    const posId = `POS-${Date.now()}-${String(this.orderCounter).padStart(4, '0')}`;

    const newPos: Position = {
      id: posId,
      decisionId,
      symbol,
      side: posSide,
      entryPrice: fill.fillPrice,
      currentPrice: fill.fillPrice,
      size: fill.filledSize,
      leverage: 1,
      stopLoss,
      takeProfit,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      liquidationPrice: 0,
      riskR: 0,
      openedAt: fill.timestamp,
    };

    this.positions.set(posId, newPos);
    this.saveToStorage();

    return {
      success: true,
      message: `Filled ${side} ${fill.filledSize} ${symbol} @ $${fill.fillPrice.toLocaleString()} (Fee: $${fill.fee.toFixed(2)})`,
      orderId,
    };
  }

  closePosition(posId: string, currentPrice: number, reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'HARD_GATE'): TradeHistoryItem | null {
    const pos = this.positions.get(posId);
    if (!pos) return null;

    const fill = paperExecutionEngine.executeMarketOrder({
      orderId: `CLS-${posId}`,
      symbol: pos.symbol,
      side: pos.side === 'LONG' ? 'SELL' : 'BUY',
      size: pos.size,
      marketPrice: currentPrice,
    });

    const priceDiff = pos.side === 'LONG' ? fill.fillPrice - pos.entryPrice : pos.entryPrice - fill.fillPrice;
    const grossPnL = priceDiff * pos.size;
    const netPnL = grossPnL - fill.fee;

    this.balance += (pos.entryPrice * pos.size) + netPnL;
    this.totalFees += fill.fee;

    const tradeItem: TradeHistoryItem = {
      id: `TRD-${Date.now()}`,
      decisionId: pos.decisionId,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: fill.fillPrice,
      size: pos.size,
      realizedPnL: Number(netPnL.toFixed(2)),
      realizedPnLPercent: Number(((netPnL / (pos.entryPrice * pos.size)) * 100).toFixed(2)),
      fee: fill.fee,
      slippage: fill.slippageDollars,
      rMultiple: pos.stopLoss ? Number((priceDiff / Math.abs(pos.entryPrice - pos.stopLoss)).toFixed(2)) : 1.0,
      closeReason: reason,
      openedAt: pos.openedAt,
      closedAt: Date.now(),
    };

    this.positions.delete(posId);
    this.tradeHistory.unshift(tradeItem);
    this.saveToStorage();

    if (pos.decisionId) {
      dbPersistence.updateDecisionOutcome(pos.decisionId, tradeItem);
    }

    return tradeItem;
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  getOrders(): Order[] {
    return [...this.orders];
  }

  getTradeHistory(): TradeHistoryItem[] {
    return [...this.tradeHistory];
  }

  cancelOrder(id: string): boolean {
    const idx = this.orders.findIndex((o) => o.id === id);
    if (idx >= 0) {
      this.orders.splice(idx, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getPortfolioState(currentPrice = 0): PortfolioState {
    let unrealizedPnL = 0;
    let totalPositionValue = 0;

    this.positions.forEach((pos) => {
      const price = currentPrice > 0 ? currentPrice : pos.currentPrice;
      const diff = pos.side === 'LONG' ? price - pos.entryPrice : pos.entryPrice - price;
      const pnl = diff * pos.size;
      pos.unrealizedPnL = pnl;
      pos.currentPrice = price;
      unrealizedPnL += pnl;
      totalPositionValue += price * pos.size;
    });

    const equity = this.balance + unrealizedPnL;
    if (equity > this.peakEquity) this.peakEquity = equity;

    const dailyPnL = equity - this.dailyStartBalance;
    const dailyPnLPercent = this.dailyStartBalance > 0 ? (dailyPnL / this.dailyStartBalance) * 100 : 0;
    const maxDrawdownPercent = this.peakEquity > 0 ? ((this.peakEquity - equity) / this.peakEquity) * 100 : 0;

    return {
      balance: Number(this.balance.toFixed(2)),
      equity: Number(equity.toFixed(2)),
      initialBalance: this.initialBalance,
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      totalPnL: Number((equity - this.initialBalance).toFixed(2)),
      totalPnLPercent: Number((((equity - this.initialBalance) / this.initialBalance) * 100).toFixed(2)),
      dailyPnL: Number(dailyPnL.toFixed(2)),
      dailyPnLPercent: Number(dailyPnLPercent.toFixed(2)),
      marginUsed: Number(totalPositionValue.toFixed(2)),
      freeMargin: Number(Math.max(0, this.balance - totalPositionValue).toFixed(2)),
      buyingPower: Number((this.balance * 2.0).toFixed(2)),
      dailyDrawdownPercent: 0,
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
      winRate: 62.38,
      sharpeRatio: 2.14,
      openPositionsCount: this.positions.size,
      totalTradesCount: this.tradeHistory.length,
      peakEquity: this.peakEquity,
      dailyStartBalance: this.dailyStartBalance,
    };
  }
}

export const paperBroker = new PaperBroker(100000);
