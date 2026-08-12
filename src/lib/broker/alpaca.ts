import { SymbolId, Position, Order, PortfolioState } from '@/types/trading';

export interface AlpacaCredentials {
  apiKeyId: string;
  secretKey: string;
  isPaper: boolean;
}

export class AlpacaBrokerClient {
  private credentials: AlpacaCredentials | null = null;

  public setCredentials(creds: AlpacaCredentials) {
    this.credentials = creds;
  }

  public hasCredentials(): boolean {
    if (this.credentials && this.credentials.apiKeyId && this.credentials.secretKey) {
      return true;
    }
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('aitrader_alpaca_api_key');
      const secret = localStorage.getItem('aitrader_alpaca_secret_key');
      if (key && secret) {
        this.credentials = { apiKeyId: key, secretKey: secret, isPaper: true };
        return true;
      }
    }
    return false;
  }

  private getHeaders(): HeadersInit {
    if (!this.hasCredentials() || !this.credentials) {
      throw new Error('Alpaca credentials not configured.');
    }
    return {
      'APCA-API-KEY-ID': this.credentials.apiKeyId,
      'APCA-API-SECRET-KEY': this.credentials.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl(): string {
    return this.credentials?.isPaper !== false
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';
  }

  public async getAccount(): Promise<{
    equity: number;
    balance: number;
    buyingPower: number;
  }> {
    if (!this.hasCredentials()) {
      throw new Error('Alpaca credentials missing');
    }

    const res = await fetch(`${this.getBaseUrl()}/v2/account`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca Account Error: ${err}`);
    }

    const data = await res.json();
    return {
      equity: parseFloat(data.equity || '10000'),
      balance: parseFloat(data.cash || '10000'),
      buyingPower: parseFloat(data.buying_power || '40000'),
    };
  }

  public async getPositions(): Promise<Position[]> {
    if (!this.hasCredentials()) return [];

    try {
      const res = await fetch(`${this.getBaseUrl()}/v2/positions`, {
        headers: this.getHeaders(),
      });

      if (!res.ok) return [];

      const data = await res.json();
      return data.map((p: any) => {
        const entryPrice = parseFloat(p.avg_entry_price);
        const currentPrice = parseFloat(p.current_price);
        const qty = Math.abs(parseFloat(p.qty));
        const side = parseFloat(p.qty) >= 0 ? 'LONG' : 'SHORT';
        const unrealizedPnL = parseFloat(p.unrealized_pl);

        return {
          id: p.asset_id || p.symbol,
          symbol: p.symbol as SymbolId,
          side,
          entryPrice,
          currentPrice,
          size: qty,
          leverage: 1,
          stopLoss: side === 'LONG' ? entryPrice * 0.985 : entryPrice * 1.015,
          takeProfit: side === 'LONG' ? entryPrice * 1.035 : entryPrice * 0.965,
          unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
          unrealizedPnLPercent: Number(((unrealizedPnL / (entryPrice * qty)) * 100).toFixed(2)),
          liquidationPrice: side === 'LONG' ? entryPrice * 0.8 : entryPrice * 1.2,
          openedAt: Date.now(),
        };
      });
    } catch {
      return [];
    }
  }

  public async submitOrder(
    symbol: string,
    qty: number,
    side: 'buy' | 'sell',
    type: 'market' | 'limit' = 'market',
    limitPrice?: number
  ): Promise<{ success: boolean; message: string }> {
    if (!this.hasCredentials()) {
      return { success: false, message: 'Alpaca API credentials missing.' };
    }

    try {
      const body: any = {
        symbol: symbol.replace('/', '').toUpperCase(),
        qty: qty.toString(),
        side,
        type,
        time_in_force: 'gtc',
      };

      if (type === 'limit' && limitPrice) {
        body.limit_price = limitPrice.toString();
      }

      const res = await fetch(`${this.getBaseUrl()}/v2/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, message: `Alpaca Order Error: ${err}` };
      }

      const data = await res.json();
      return {
        success: true,
        message: `Submitted Alpaca Paper Order ${data.id} (${side.toUpperCase()} ${qty} ${symbol} @ ${data.type})`,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Alpaca submission failed.' };
    }
  }

  public async closePosition(symbol: string): Promise<boolean> {
    if (!this.hasCredentials()) return false;

    try {
      const res = await fetch(`${this.getBaseUrl()}/v2/positions/${symbol.replace('/', '')}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}

export const alpacaBrokerClient = new AlpacaBrokerClient();
