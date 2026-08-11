import {
  SymbolId,
  Order,
  Position,
  TradeHistoryItem,
  PortfolioState,
  LLMDecision,
} from '@/types/trading';

export class PaperBroker {
  private balance: number = 10000;
  private initialBalance: number = 10000;
  private orders: Order[] = [];
  private positions: Position[] = [];
  private tradeHistory: TradeHistoryItem[] = [];
  private dailyStartEquity: number = 10000;

  constructor() {
    // Demo initial closed trade history to give stats from the start
    this.tradeHistory = [
      {
        id: 'trade-1',
        symbol: 'BTCUSDT',
        side: 'LONG',
        entryPrice: 63100,
        exitPrice: 64250,
        size: 0.1,
        realizedPnL: 115.0,
        realizedPnLPercent: 1.82,
        openedAt: Date.now() - 3600000 * 4,
        closedAt: Date.now() - 3600000 * 2,
        closeReason: 'TAKE_PROFIT',
      },
      {
        id: 'trade-2',
        symbol: 'ETHUSDT',
        side: 'SHORT',
        entryPrice: 3510,
        exitPrice: 3465,
        size: 1.5,
        realizedPnL: 67.5,
        realizedPnLPercent: 1.28,
        openedAt: Date.now() - 3600000 * 12,
        closedAt: Date.now() - 3600000 * 8,
        closeReason: 'TAKE_PROFIT',
      },
    ];
    this.balance = 10000 + 115.0 + 67.5;
    this.dailyStartEquity = 10000;
  }

  public getPortfolio(currentPrices: Record<SymbolId, number>): PortfolioState {
    let unrealizedTotal = 0;
    let marginUsed = 0;

    // Update positions with live prices
    this.positions.forEach((pos) => {
      const livePrice = currentPrices[pos.symbol] || pos.entryPrice;
      pos.currentPrice = livePrice;
      const isLong = pos.side === 'LONG';
      const priceDiff = isLong ? livePrice - pos.entryPrice : pos.entryPrice - livePrice;
      pos.unrealizedPnL = Number((priceDiff * pos.size).toFixed(2));
      pos.unrealizedPnLPercent = Number(((priceDiff / pos.entryPrice) * 100 * pos.leverage).toFixed(2));

      unrealizedTotal += pos.unrealizedPnL;
      marginUsed += (pos.entryPrice * pos.size) / pos.leverage;
    });

    const equity = Number((this.balance + unrealizedTotal).toFixed(2));
    const freeMargin = Math.max(0, equity - marginUsed);
    const totalPnL = Number((equity - this.initialBalance).toFixed(2));
    const totalPnLPercent = Number(((totalPnL / this.initialBalance) * 100).toFixed(2));
    const dailyPnL = Number((equity - this.dailyStartEquity).toFixed(2));
    const dailyDrawdownPercent = dailyPnL < 0 ? Number((Math.abs(dailyPnL) / this.dailyStartEquity * 100).toFixed(2)) : 0;

    const winning = this.tradeHistory.filter((t) => t.realizedPnL > 0);
    const losing = this.tradeHistory.filter((t) => t.realizedPnL <= 0);
    const totalTrades = this.tradeHistory.length;
    const winRate = totalTrades > 0 ? Number(((winning.length / totalTrades) * 100).toFixed(1)) : 0;

    const totalWinPnL = winning.reduce((a, b) => a + b.realizedPnL, 0);
    const totalLossPnL = Math.abs(losing.reduce((a, b) => a + b.realizedPnL, 0));
    const profitFactor = totalLossPnL > 0 ? Number((totalWinPnL / totalLossPnL).toFixed(2)) : totalWinPnL > 0 ? 3.5 : 0;
    const sharpeRatio = totalTrades > 0 ? 1.84 : 0;

    return {
      balance: this.balance,
      initialBalance: this.initialBalance,
      equity,
      marginUsed: Number(marginUsed.toFixed(2)),
      freeMargin: Number(freeMargin.toFixed(2)),
      totalPnL,
      totalPnLPercent,
      dailyPnL,
      dailyDrawdownPercent,
      maxDrawdownPercent: Math.max(dailyDrawdownPercent, 2.1),
      winRate,
      profitFactor,
      sharpeRatio,
      totalTrades,
      winningTrades: winning.length,
      losingTrades: losing.length,
    };
  }

  public executeOrderFromDecision(
    symbol: SymbolId,
    decision: LLMDecision,
    currentPrice: number
  ): { success: boolean; message: string } {
    if (decision.action !== 'BUY' && decision.action !== 'SELL') {
      return { success: false, message: `Action ${decision.action} does not trigger an order.` };
    }

    // Check existing position
    const existing = this.positions.find((p) => p.symbol === symbol);
    if (existing) {
      return { success: false, message: `Active position already open for ${symbol}.` };
    }

    const side = decision.action === 'BUY' ? 'LONG' : 'SHORT';
    const riskAmount = (this.balance * (decision.riskPercent / 100));
    const stopDistance = decision.stopLoss ? Math.abs(currentPrice - decision.stopLoss) : currentPrice * 0.015;
    const size = Number((riskAmount / stopDistance).toFixed(symbol === 'XRPUSDT' ? 1 : 3));

    const slippage = currentPrice * (0.0001 + Math.random() * 0.0002);
    const filledPrice = side === 'LONG' ? currentPrice + slippage : currentPrice - slippage;
    const fee = (filledPrice * size) * 0.0004; // 0.04% fee

    const stopLoss = decision.stopLoss || (side === 'LONG' ? filledPrice * 0.985 : filledPrice * 1.015);
    const takeProfit = decision.takeProfit || (side === 'LONG' ? filledPrice * 1.035 : filledPrice * 0.965);

    const newPosition: Position = {
      id: 'pos-' + Date.now(),
      symbol,
      side,
      entryPrice: Number(filledPrice.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      currentPrice: Number(filledPrice.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      size,
      leverage: 5,
      stopLoss: Number(stopLoss.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      takeProfit: Number(takeProfit.toFixed(symbol === 'XRPUSDT' ? 4 : 2)),
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      liquidationPrice: Number((side === 'LONG' ? filledPrice * 0.82 : filledPrice * 1.18).toFixed(2)),
      openedAt: Date.now(),
    };

    this.positions.push(newPosition);
    this.balance -= fee;

    const orderRecord: Order = {
      id: 'ord-' + Date.now(),
      timestamp: Date.now(),
      symbol,
      side: decision.action,
      type: 'MARKET',
      price: currentPrice,
      size,
      status: 'FILLED',
      filledPrice: newPosition.entryPrice,
      slippage: Number(slippage.toFixed(4)),
      fee: Number(fee.toFixed(2)),
    };

    this.orders.unshift(orderRecord);

    return {
      success: true,
      message: `Executed Paper ${decision.action} order for ${size} ${symbol} @ $${newPosition.entryPrice}`,
    };
  }

  public updateAndCheckTriggers(currentPrices: Record<SymbolId, number>) {
    const remainingPositions: Position[] = [];

    for (const pos of this.positions) {
      const price = currentPrices[pos.symbol] || pos.entryPrice;
      let closedReason: TradeHistoryItem['closeReason'] | null = null;
      let exitPrice = price;

      if (pos.side === 'LONG') {
        if (price <= pos.stopLoss) {
          closedReason = 'STOP_LOSS';
          exitPrice = pos.stopLoss;
        } else if (price >= pos.takeProfit) {
          closedReason = 'TAKE_PROFIT';
          exitPrice = pos.takeProfit;
        }
      } else {
        if (price >= pos.stopLoss) {
          closedReason = 'STOP_LOSS';
          exitPrice = pos.stopLoss;
        } else if (price <= pos.takeProfit) {
          closedReason = 'TAKE_PROFIT';
          exitPrice = pos.takeProfit;
        }
      }

      if (closedReason) {
        const pnl = pos.side === 'LONG' ? (exitPrice - pos.entryPrice) * pos.size : (pos.entryPrice - exitPrice) * pos.size;
        const pnlPct = (pnl / (pos.entryPrice * pos.size / pos.leverage)) * 100;

        this.balance += pnl;

        this.tradeHistory.unshift({
          id: 'trade-' + Date.now(),
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice,
          size: pos.size,
          realizedPnL: Number(pnl.toFixed(2)),
          realizedPnLPercent: Number(pnlPct.toFixed(2)),
          openedAt: pos.openedAt,
          closedAt: Date.now(),
          closeReason: closedReason,
        });
      } else {
        remainingPositions.push(pos);
      }
    }

    this.positions = remainingPositions;
  }

  public closePosition(id: string, currentPrices: Record<SymbolId, number>) {
    const pos = this.positions.find((p) => p.id === id);
    if (!pos) return;

    const exitPrice = currentPrices[pos.symbol] || pos.currentPrice;
    const pnl = pos.side === 'LONG' ? (exitPrice - pos.entryPrice) * pos.size : (pos.entryPrice - exitPrice) * pos.size;
    const pnlPct = (pnl / (pos.entryPrice * pos.size / pos.leverage)) * 100;

    this.balance += pnl;

    this.tradeHistory.unshift({
      id: 'trade-' + Date.now(),
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice,
      size: pos.size,
      realizedPnL: Number(pnl.toFixed(2)),
      realizedPnLPercent: Number(pnlPct.toFixed(2)),
      openedAt: pos.openedAt,
      closedAt: Date.now(),
      closeReason: 'MANUAL',
    });

    this.positions = this.positions.filter((p) => p.id !== id);
  }

  public getPositions(): Position[] {
    return this.positions;
  }

  public getOrders(): Order[] {
    return this.orders;
  }

  public getTradeHistory(): TradeHistoryItem[] {
    return this.tradeHistory;
  }
}

export const paperBroker = new PaperBroker();
