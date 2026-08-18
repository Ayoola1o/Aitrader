import { SymbolId, Order, Position, TradeHistoryItem, PortfolioState } from '@/types/trading';
import { dbPersistence } from '@/lib/db/schema';

const TAKER_FEE = 0.0005; // 0.05%
const SLIPPAGE_PCT = 0.0002; // 0.02% per market order

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

  constructor(startingBalance = 10000) {
    this.balance = startingBalance;
    this.initialBalance = startingBalance;
    this.dailyStartBalance = startingBalance;
    this.peakEquity = startingBalance;
    this.equityCurve = [{ time: Date.now(), equity: startingBalance }];
  }

  setStartingBalance(amount: number) {
    this.balance = amount;
    this.initialBalance = amount;
    this.dailyStartBalance = amount;
    this.peakEquity = amount;
    this.equityCurve = [{ time: Date.now(), equity: amount }];
    this.positions.clear();
    this.orders = [];
    this.tradeHistory = [];
    this.totalFees = 0;
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
    if (size <= 0) return { success: false, message: 'Invalid position size' };
    if (this.balance <= 0) return { success: false, message: 'Insufficient balance' };

    // Apply market slippage
    const slippage = marketPrice * SLIPPAGE_PCT;
    const fillPrice = side === 'BUY'
      ? Number((marketPrice + slippage).toFixed(marketPrice > 100 ? 2 : 5))
      : Number((marketPrice - slippage).toFixed(marketPrice > 100 ? 2 : 5));

    const fee = fillPrice * size * TAKER_FEE;
    const positionValue = fillPrice * size;

    if (positionValue + fee > this.balance) {
      return { success: false, message: `Insufficient balance: need $${(positionValue + fee).toFixed(2)}, have $${this.balance.toFixed(2)}` };
    }

    this.orderCounter++;
    const orderId = `PAPER-${Date.now()}-${this.orderCounter}`;
    const order: Order = {
      id: orderId, decisionId, timestamp: Date.now(), symbol,
      side, type: 'MARKET', price: fillPrice, size,
      stopPrice: stopLoss, takeProfitPrice: takeProfit,
      status: 'FILLED', filledPrice: fillPrice,
      slippage, fee, source,
    };
    this.orders.push(order);

    // Deduct cost
    this.balance -= (positionValue + fee);
    this.totalFees += fee;

    const positionId = `${symbol}-${orderId}`;
    const position: Position = {
      id: positionId, decisionId, symbol,
      side: side === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: fillPrice,
      currentPrice: fillPrice,
      size, leverage: 1,
      stopLoss, takeProfit,
      unrealizedPnL: 0, unrealizedPnLPercent: 0,
      liquidationPrice: side === 'BUY' ? fillPrice * 0.5 : fillPrice * 1.5,
      openedAt: Date.now(),
      riskR: 0,
    };
    this.positions.set(positionId, position);

    return { success: true, message: `Filled @ $${fillPrice} (slippage: $${slippage.toFixed(4)}, fee: $${fee.toFixed(4)})`, orderId: positionId };
  }

  // ── Close Position ────────────────────────────────────────────────────────
  closePosition(
    positionId: string,
    marketPrice: number,
    reason: TradeHistoryItem['closeReason'] = 'MANUAL'
  ): { success: boolean; pnl?: number; message?: string } {
    const pos = this.positions.get(positionId);
    if (!pos) return { success: false, message: 'Position not found' };

    // Simulate slippage on close
    const slippage = marketPrice * SLIPPAGE_PCT;
    const exitPrice = pos.side === 'LONG'
      ? Number((marketPrice - slippage).toFixed(marketPrice > 100 ? 2 : 5))
      : Number((marketPrice + slippage).toFixed(marketPrice > 100 ? 2 : 5));

    const fee = exitPrice * pos.size * TAKER_FEE;
    const priceDiff = pos.side === 'LONG'
      ? exitPrice - pos.entryPrice
      : pos.entryPrice - exitPrice;

    const grossPnL = priceDiff * pos.size;
    const netPnL = grossPnL - fee;
    const pnlPercent = (netPnL / (pos.entryPrice * pos.size)) * 100;

    // Initial risk for R multiple
    const initialRisk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.size;
    const rMultiple = initialRisk > 0 ? netPnL / initialRisk : 0;

    this.balance += pos.entryPrice * pos.size + netPnL;
    this.totalFees += fee;

    this.tradeHistory.push({
      id: `TRADE-${Date.now()}`,
      decisionId: pos.decisionId,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      size: pos.size,
      realizedPnL: Number(netPnL.toFixed(2)),
      realizedPnLPercent: Number(pnlPercent.toFixed(3)),
      fee: Number(fee.toFixed(4)),
      slippage: Number(slippage.toFixed(4)),
      openedAt: pos.openedAt,
      closedAt: Date.now(),
      closeReason: reason,
      rMultiple: Number(rMultiple.toFixed(2)),
    });

    const closedTrade = this.tradeHistory[this.tradeHistory.length - 1];
    dbPersistence.saveTrade(closedTrade);
    if (pos.decisionId) {
      dbPersistence.updateDecisionOutcome(pos.decisionId, closedTrade);
    }

    this.positions.delete(positionId);
    this.equityCurve.push({ time: Date.now(), equity: this.getEquity(marketPrice) });
    return { success: true, pnl: Number(netPnL.toFixed(2)) };
  }

  // ── Update Positions with Current Prices ─────────────────────────────────
  updatePrices(prices: Record<SymbolId, number>) {
    for (const [id, pos] of this.positions) {
      const price = prices[pos.symbol];
      if (!price) continue;
      pos.currentPrice = price;
      const priceDiff = pos.side === 'LONG' ? price - pos.entryPrice : pos.entryPrice - price;
      pos.unrealizedPnL = Number((priceDiff * pos.size).toFixed(2));
      pos.unrealizedPnLPercent = Number(((priceDiff / pos.entryPrice) * 100).toFixed(3));
      const initialRisk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.size;
      pos.riskR = initialRisk > 0 ? pos.unrealizedPnL / initialRisk : 0;

      // Check stop loss / take profit (with simulated slippage on fill)
      const slippage = price * SLIPPAGE_PCT;
      const stopHit = pos.side === 'LONG' ? price <= pos.stopLoss + slippage : price >= pos.stopLoss - slippage;
      const tpHit = pos.side === 'LONG' ? price >= pos.takeProfit - slippage : price <= pos.takeProfit + slippage;

      if (tpHit) {
        this.closePosition(id, price, 'TAKE_PROFIT');
      } else if (stopHit) {
        this.closePosition(id, price, 'STOP_LOSS');
      }
    }
  }

  // ── Portfolio State ───────────────────────────────────────────────────────
  getEquity(currentPrice: number): number {
    const unrealizedTotal = Array.from(this.positions.values())
      .reduce((s, p) => s + p.unrealizedPnL, 0);
    return this.balance + unrealizedTotal;
  }

  getPortfolioState(currentPrice: number): PortfolioState {
    const equity = this.getEquity(currentPrice);
    const unrealizedPnL = Array.from(this.positions.values())
      .reduce((s, p) => s + p.unrealizedPnL, 0);
    const marginUsed = Array.from(this.positions.values())
      .reduce((s, p) => s + p.entryPrice * p.size, 0);
    const freeMargin = this.balance;

    const totalPnL = equity - this.initialBalance;
    const totalPnLPercent = this.initialBalance > 0 ? (totalPnL / this.initialBalance) * 100 : 0;
    const dailyPnL = equity - this.dailyStartBalance;
    const dailyDrawdownPercent = this.dailyStartBalance > 0
      ? Math.max(0, (this.dailyStartBalance - equity) / this.dailyStartBalance * 100) : 0;

    if (equity > this.peakEquity) this.peakEquity = equity;
    const maxDrawdownPercent = this.peakEquity > 0
      ? Math.max(0, (this.peakEquity - equity) / this.peakEquity * 100) : 0;

    const wins = this.tradeHistory.filter(t => t.realizedPnL > 0);
    const losses = this.tradeHistory.filter(t => t.realizedPnL <= 0);
    const totalTrades = this.tradeHistory.length;
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const grossProfit = wins.reduce((s, t) => s + t.realizedPnL, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realizedPnL, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : wins.length > 0 ? 99 : 0;

    // Simplified Sharpe (annualized, requires at least 5 trades)
    let sharpeRatio = 0;
    if (totalTrades >= 5) {
      const returns = this.tradeHistory.map(t => t.realizedPnLPercent / 100);
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
      const std = Math.sqrt(variance);
      sharpeRatio = std > 0 ? Number(((mean / std) * Math.sqrt(252)).toFixed(2)) : 0;
    }

    return {
      balance: Number(this.balance.toFixed(2)),
      initialBalance: this.initialBalance,
      equity: Number(equity.toFixed(2)),
      marginUsed: Number(marginUsed.toFixed(2)),
      freeMargin: Number(freeMargin.toFixed(2)),
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPercent: Number(totalPnLPercent.toFixed(3)),
      dailyPnL: Number(dailyPnL.toFixed(2)),
      dailyDrawdownPercent: Number(dailyDrawdownPercent.toFixed(3)),
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(3)),
      totalFees: Number(this.totalFees.toFixed(4)),
      winRate: Number(winRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      sharpeRatio,
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      equityCurve: this.equityCurve.slice(-200),
    };
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.find((o) => o.id === orderId);
    if (order && order.status === 'PENDING') {
      order.status = 'CANCELLED';
      return true;
    }
    return false;
  }

  getPositions(): Position[] { return Array.from(this.positions.values()); }
  getOrders(): Order[] { return this.orders.slice(-100); }
  getTradeHistory(): TradeHistoryItem[] { return this.tradeHistory; }
}

export const paperBroker = new PaperBroker(10000);
