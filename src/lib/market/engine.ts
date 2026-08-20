import {
  SymbolId,
  MarketSnapshot,
  AppMode,
} from '@/types/trading';
import { marketDataProvider, MarketDataSnapshot } from './MarketDataProvider';

export class MarketEngine {
  private appMode: AppMode = 'PAPER';

  setMode(mode: AppMode) {
    this.appMode = mode;
    marketDataProvider.setMode(mode);
  }

  getMode(): AppMode {
    return this.appMode;
  }

  public async tick(symbol: SymbolId): Promise<MarketDataSnapshot> {
    marketDataProvider.setMode(this.appMode);
    return await marketDataProvider.getSnapshot(symbol);
  }
}

export const marketEngine = new MarketEngine();
