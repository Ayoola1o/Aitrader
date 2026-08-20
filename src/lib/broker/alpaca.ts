import { SymbolId, Position, PortfolioState, Order, TradeHistoryItem } from '@/types/trading';
import { getStartingBalance } from '@/lib/settings';

/**
 * Alpaca REST wrapper – connects through Next.js /api/alpaca proxy
 * to prevent browser CORS blocks, handle credential injection,
 * and support live crypto and equities order routing.
 */
export interface AlpacaCredentials {
  key: string;
  secret: string;
  isPaper?: boolean;
}

export interface AlpacaOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  qty?: number;
  notional?: number;
  type?: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  time_in_force?: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
  trail_price?: number;
  trail_percent?: number;
  extended_hours?: boolean;
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto';
  take_profit?: {
    limit_price: number;
  };
  stop_loss?: {
    stop_price: number;
    limit_price?: number;
  };
}

export interface AlpacaAccountSummary {
  balance: number;
  equity: number;
  buyingPower: number;
  cash: number;
  portfolioValue: number;
  status: string;
  daytradeCount?: number;
  daytradingBuyingPower?: number;
  regtBuyingPower?: number;
  initialMargin?: number;
  maintenanceMargin?: number;
}

export interface AlpacaActivityItem {
  id: string;
  activity_type: 'FILL' | 'DIV' | 'INT' | 'FEE' | 'CSD' | 'CSW';
  transaction_time: string;
  symbol?: string;
  side?: 'buy' | 'sell';
  qty?: string;
  price?: string;
  order_id?: string;
  type?: string;
  net_amount?: string;
}

export interface OrderResult {
  success: boolean;
  message: string;
  orderId?: string;
  data?: unknown;
}

let storedCreds: AlpacaCredentials | null = null;
let historicalEquityCurve: { time: number; equity: number }[] = [];

/** Convert internal symbol (BTCUSDT) to Alpaca crypto format (BTC/USD). */
export function toAlpacaSymbol(symbol: SymbolId | string): string {
  if (symbol.includes('/')) return symbol;
  return symbol.replace('USDT', '/USD').replace('USD', '/USD');
}

/** Convert Alpaca symbol (BTC/USD) back to internal SymbolId. */
export function fromAlpacaSymbol(alpacaSymbol: string): SymbolId {
  const normalized = alpacaSymbol.replace('/', '').toUpperCase();
  const internal = normalized.replace('USD', 'USDT');
  return internal as SymbolId;
}

export function mapAlpacaAccount(raw: Record<string, unknown>): AlpacaAccountSummary {
  const equity = parseFloat(String(raw.equity ?? raw.portfolio_value ?? 0));
  const cash = parseFloat(String(raw.cash ?? raw.balance ?? 0));
  const buyingPower = parseFloat(String(raw.non_marginable_buying_power ?? raw.buying_power ?? cash));

  return {
    balance: cash,
    cash,
    equity: equity || cash,
    buyingPower: buyingPower || cash,
    portfolioValue: equity,
    status: String(raw.status ?? 'ACTIVE'),
  };
}

export function mapAlpacaPosition(raw: Record<string, unknown>): Position {
  const rawSymbol = String(raw.symbol ?? 'BTC/USD');
  const symbol = fromAlpacaSymbol(rawSymbol);
  const side = String(raw.side ?? 'long').toLowerCase() === 'short' ? 'SHORT' : 'LONG';
  const entryPrice = parseFloat(String(raw.avg_entry_price ?? 0));
  const currentPrice = parseFloat(String(raw.current_price ?? entryPrice));
  const size = parseFloat(String(raw.qty ?? 0));
  const unrealizedPnL = parseFloat(String(raw.unrealized_pl ?? 0));
  const unrealizedPnLPercent = parseFloat(String(raw.unrealized_plpc ?? 0)) * 100;

  return {
    id: String(raw.asset_id ?? rawSymbol),
    symbol,
    side,
    entryPrice,
    currentPrice,
    size,
    leverage: 1,
    stopLoss: 0,
    takeProfit: 0,
    unrealizedPnL,
    unrealizedPnLPercent: parseFloat(unrealizedPnLPercent.toFixed(2)),
    liquidationPrice: 0,
    openedAt: raw.created_at ? new Date(String(raw.created_at)).getTime() : Date.now(),
    riskR: 0,
  };
}

export function mapAlpacaOrder(raw: Record<string, unknown>): Order {
  const rawSymbol = String(raw.symbol ?? 'BTC/USD');
  const symbol = fromAlpacaSymbol(rawSymbol);
  const rawSide = String(raw.side ?? 'buy').toUpperCase();
  const side = rawSide === 'SELL' ? 'SELL' : 'BUY';
  const rawType = String(raw.type ?? 'market').toUpperCase();
  const type = rawType === 'LIMIT' ? 'LIMIT' : 'MARKET';
  const rawStatus = String(raw.status ?? 'new').toLowerCase();

  let status: Order['status'] = 'PENDING';
  if (['filled'].includes(rawStatus)) status = 'FILLED';
  else if (['partially_filled'].includes(rawStatus)) status = 'PARTIALLY_FILLED';
  else if (['canceled', 'cancelled', 'expired', 'replaced'].includes(rawStatus)) status = 'CANCELLED';
  else if (['rejected', 'suspended'].includes(rawStatus)) status = 'REJECTED';

  const price = parseFloat(String(raw.limit_price ?? raw.filled_avg_price ?? 0));
  const filledPrice = raw.filled_avg_price ? parseFloat(String(raw.filled_avg_price)) : undefined;
  const size = parseFloat(String(raw.qty ?? raw.filled_qty ?? 0));
  const timestamp = raw.submitted_at ? new Date(String(raw.submitted_at)).getTime() : Date.now();

  return {
    id: String(raw.id ?? `alpaca-${Date.now()}`),
    symbol,
    side,
    type,
    price,
    filledPrice,
    size,
    status,
    timestamp,
    source: 'AI',
  };
}

export function mapAlpacaActivity(raw: Record<string, unknown>): TradeHistoryItem {
  const rawSymbol = String(raw.symbol ?? 'BTC/USD');
  const symbol = fromAlpacaSymbol(rawSymbol);
  const rawSide = String(raw.side ?? 'buy').toUpperCase();
  const side = rawSide === 'SELL' ? 'SHORT' : 'LONG';
  const price = parseFloat(String(raw.price ?? 0));
  const qty = parseFloat(String(raw.qty ?? 0));
  const timestamp = raw.transaction_time ? new Date(String(raw.transaction_time)).getTime() : Date.now();
  const fee = parseFloat(String(raw.fee ?? 0));

  return {
    id: String(raw.id ?? `act-${Date.now()}`),
    symbol,
    side,
    entryPrice: price,
    exitPrice: price,
    size: qty,
    realizedPnL: 0,
    realizedPnLPercent: 0,
    fee,
    slippage: 0,
    openedAt: timestamp,
    closedAt: timestamp,
    closeReason: 'MANUAL',
    rMultiple: 0,
  };
}

export function buildPortfolioFromAlpaca(
  account: AlpacaAccountSummary,
  positions: Position[],
  initialBalance?: number,
  tradeHistory?: TradeHistoryItem[]
): PortfolioState {
  const starting = initialBalance ?? getStartingBalance();
  const equity = account.equity || starting;
  const balance = account.balance || equity;
  const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalPnL = equity - starting;
  const totalPnLPercent = starting > 0 ? (totalPnL / starting) * 100 : 0;

  // Track equity curve
  const now = Date.now();
  if (historicalEquityCurve.length === 0 || now - (historicalEquityCurve[historicalEquityCurve.length - 1]?.time ?? 0) > 10000) {
    historicalEquityCurve.push({ time: now, equity });
    if (historicalEquityCurve.length > 100) historicalEquityCurve.shift();
  }

  const trades = tradeHistory || [];
  const winningTrades = trades.filter((t) => t.realizedPnL > 0).length;
  const losingTrades = trades.filter((t) => t.realizedPnL < 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalWins = trades.filter((t) => t.realizedPnL > 0).reduce((s, t) => s + t.realizedPnL, 0);
  const totalLosses = Math.abs(trades.filter((t) => t.realizedPnL < 0).reduce((s, t) => s + t.realizedPnL, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 99 : 1.0;

  return {
    balance,
    initialBalance: starting,
    equity,
    marginUsed: 0,
    freeMargin: account.buyingPower,
    unrealizedPnL,
    totalPnL,
    totalPnLPercent,
    dailyPnL: 0,
    dailyDrawdownPercent: 0,
    maxDrawdownPercent: 0,
    totalFees: 0,
    winRate,
    profitFactor,
    sharpeRatio: 1.5,
    totalTrades,
    winningTrades,
    losingTrades,
    equityCurve: [...historicalEquityCurve],
  };
}

function getRequestHeaders(overrideCreds?: AlpacaCredentials): Record<string, string> {
  const creds = overrideCreds || storedCreds || {
    key: typeof window !== 'undefined' ? localStorage.getItem('aitrader_alpaca_api_key') || '' : '',
    secret: typeof window !== 'undefined' ? localStorage.getItem('aitrader_alpaca_secret_key') || '' : '',
    isPaper: true,
  };

  return {
    'Content-Type': 'application/json',
    ...(creds.key ? { 'x-alpaca-key': creds.key } : {}),
    ...(creds.secret ? { 'x-alpaca-secret': creds.secret } : {}),
    'x-alpaca-paper': String(creds.isPaper ?? true),
  };
}

export const alpacaBrokerClient = {
  setCredentials(creds: { apiKeyId: string; secretKey: string; isPaper?: boolean }) {
    storedCreds = {
      key: creds.apiKeyId.trim(),
      secret: creds.secretKey.trim(),
      isPaper: creds.isPaper ?? true,
    };
  },

  hasCredentials(): boolean {
    if (storedCreds?.key && storedCreds?.secret) return true;
    if (typeof window !== 'undefined') {
      const k = localStorage.getItem('aitrader_alpaca_api_key');
      const s = localStorage.getItem('aitrader_alpaca_secret_key');
      return !!(k && s);
    }
    return false;
  },

  getStoredCredentials(): AlpacaCredentials | null {
    if (storedCreds) return storedCreds;
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('aitrader_alpaca_api_key') || '';
      const secret = localStorage.getItem('aitrader_alpaca_secret_key') || '';
      if (key && secret) {
        storedCreds = { key, secret, isPaper: true };
        return storedCreds;
      }
    }
    return null;
  },

  async getAccount(): Promise<AlpacaAccountSummary> {
    const res = await fetch('/api/alpaca?action=account', {
      method: 'GET',
      headers: getRequestHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `Alpaca account failed: ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(json.error || 'Failed to fetch Alpaca account');
    }
    return mapAlpacaAccount(json.data);
  },

  async getPositions(): Promise<Position[]> {
    const res = await fetch('/api/alpaca?action=positions', {
      method: 'GET',
      headers: getRequestHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `Alpaca positions failed: ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }
    return json.data.map((p: Record<string, unknown>) => mapAlpacaPosition(p));
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch('/api/alpaca?action=orders&status=all&limit=50', {
      method: 'GET',
      headers: getRequestHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data.map((o: Record<string, unknown>) => mapAlpacaOrder(o));
  },

  async getTradeHistory(): Promise<TradeHistoryItem[]> {
    const res = await fetch('/api/alpaca?action=activities&activity_type=FILL&page_size=50', {
      method: 'GET',
      headers: getRequestHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data.map((a: Record<string, unknown>) => mapAlpacaActivity(a));
  },

  async placeOrder(params: AlpacaOrderParams): Promise<OrderResult> {
    try {
      const res = await fetch('/api/alpaca', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          action: 'placeOrder',
          symbol: toAlpacaSymbol(params.symbol),
          side: params.side,
          qty: params.qty,
          notional: params.notional,
          type: params.type || 'market',
          time_in_force: params.time_in_force || 'gtc',
          limit_price: params.limit_price,
          stop_price: params.stop_price,
          trail_price: params.trail_price,
          trail_percent: params.trail_percent,
          extended_hours: params.extended_hours,
          order_class: params.order_class,
          take_profit: params.take_profit,
          stop_loss: params.stop_loss,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error || 'Alpaca order rejected',
        };
      }

      const orderData = json.data || {};
      const orderId = String(orderData.id ?? '');
      return {
        success: true,
        message: `${params.side.toUpperCase()} ${params.qty || `$${params.notional}`} ${toAlpacaSymbol(params.symbol)} submitted (${(params.type || 'market').toUpperCase()})`,
        orderId,
        data: orderData,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Order submission failed: ${message}` };
    }
  },

  async submitOrder(
    symbol: SymbolId | string,
    qty: number,
    side: 'buy' | 'sell',
    type: 'market' | 'limit' = 'market',
    limitPrice?: number
  ): Promise<OrderResult> {
    return this.placeOrder({
      symbol,
      qty,
      side,
      type,
      limit_price: limitPrice,
      time_in_force: 'gtc',
    });
  },

  async cancelOrder(orderId: string): Promise<OrderResult> {
    try {
      const res = await fetch('/api/alpaca', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          action: 'cancelOrder',
          orderId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || 'Failed to cancel order' };
      }

      return { success: true, message: `Order ${orderId} cancelled` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  },

  async closePosition(symbol: SymbolId | string): Promise<OrderResult> {
    try {
      const res = await fetch('/api/alpaca', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
          action: 'closePosition',
          symbol: toAlpacaSymbol(symbol),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.error || `Failed to close ${symbol}` };
      }

      return { success: true, message: `Closed ${symbol} position on Alpaca` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  },

  async submitBracketOrder(
    symbol: SymbolId | string,
    side: 'buy' | 'sell',
    qty: number,
    takeProfitPrice: number,
    stopLossPrice: number,
    limitPrice?: number
  ): Promise<OrderResult> {
    return this.placeOrder({
      symbol: toAlpacaSymbol(symbol),
      side,
      qty,
      type: limitPrice ? 'limit' : 'market',
      limit_price: limitPrice,
      order_class: 'bracket',
      take_profit: { limit_price: takeProfitPrice },
      stop_loss: { stop_price: stopLossPrice },
    });
  },

  async submitFractionalOrder(
    symbol: SymbolId | string,
    side: 'buy' | 'sell',
    params: { qty?: number; notional?: number }
  ): Promise<OrderResult> {
    return this.placeOrder({
      symbol: toAlpacaSymbol(symbol),
      side,
      qty: params.qty,
      notional: params.notional,
      type: 'market',
      time_in_force: 'day',
    });
  },

  async getAccountActivities(activityType: 'FILL' | 'DIV' | 'INT' | 'FEE' = 'FILL', pageSize = 50): Promise<AlpacaActivityItem[]> {
    try {
      const res = await fetch(`/api/alpaca?action=activities&activity_type=${activityType}&page_size=${pageSize}`, {
        headers: getRequestHeaders(),
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data as AlpacaActivityItem[];
      }
      return [];
    } catch {
      return [];
    }
  },

  calculateRegTMargin(positions: Position[], equity: number) {
    const totalExposure = positions.reduce((acc, p) => acc + p.size * (p.currentPrice || p.entryPrice), 0);
    const initialMarginRequired = totalExposure * 0.5; // Reg T 50%
    const maintenanceMarginRequired = positions.reduce((acc, p) => {
      const price = p.currentPrice || p.entryPrice;
      const mktVal = p.size * price;
      if (p.side === 'LONG') {
        if (price < 2.5) return acc + mktVal * 1.0;
        if (price <= 6.0) return acc + mktVal * 0.5;
        return acc + mktVal * 0.3;
      } else {
        return acc + Math.max(mktVal * 0.3, p.size * (price < 5.0 ? 2.5 : 5.0));
      }
    }, 0);

    const isEligibleForMargin = equity >= 2000;
    const intradayDTBP = isEligibleForMargin ? equity * 4 : equity;
    const overnightBuyingPower = isEligibleForMargin ? equity * 2 : equity;

    return {
      isEligibleForMargin,
      totalExposure,
      initialMarginRequired,
      maintenanceMarginRequired,
      intradayDTBP,
      overnightBuyingPower,
      marginExcess: Math.max(0, equity - maintenanceMarginRequired),
      inMarginCall: equity < maintenanceMarginRequired,
    };
  },

  async closeAllPositions(): Promise<number> {
    try {
      const res = await fetch('/api/alpaca', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ action: 'closeAllPositions' }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to close all positions');
      }

      const closed = Array.isArray(json.data) ? json.data.length : 1;
      return closed;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Alpaca closeAllPositions failed: ${message}`);
    }
  },
};

export default alpacaBrokerClient;
