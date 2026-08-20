'use client';

import { AppMode } from '@/types/trading';

export interface TradingModeDefinition {
  mode: AppMode;
  name: string;
  description: string;
  allowSyntheticData: boolean;
  requiresRealMarketData: boolean;
  orderDestination: 'SIMULATED_LOCAL' | 'SIMULATED_SERVER' | 'ALPACA_PAPER' | 'ALPACA_LIVE' | 'BINANCE_LIVE';
  enforceStrictHaltOnDisconnect: boolean;
}

export const TRADING_MODES: Record<AppMode, TradingModeDefinition> = {
  DEMO: {
    mode: 'DEMO',
    name: 'Demo Sandbox Mode',
    description: 'Local simulation environment with synthetic market data allowed. Ideal for offline exploration.',
    allowSyntheticData: true,
    requiresRealMarketData: false,
    orderDestination: 'SIMULATED_LOCAL',
    enforceStrictHaltOnDisconnect: false,
  },
  REPLAY: {
    mode: 'REPLAY',
    name: 'Market Replay Mode',
    description: 'Bar-by-bar historical playback over verified OHLCV datasets for deterministic strategy tuning.',
    allowSyntheticData: false,
    requiresRealMarketData: false,
    orderDestination: 'SIMULATED_LOCAL',
    enforceStrictHaltOnDisconnect: true,
  },
  PAPER: {
    mode: 'PAPER',
    name: 'Live Paper Trading',
    description: 'Live real-time market data with simulated institutional execution. Zero synthetic data permitted.',
    allowSyntheticData: false,
    requiresRealMarketData: true,
    orderDestination: 'SIMULATED_SERVER',
    enforceStrictHaltOnDisconnect: true,
  },
  LIVE: {
    mode: 'LIVE',
    name: 'Real Capital Live Trading',
    description: 'Direct order dispatch to live exchange or Alpaca brokerage with audited risk controls.',
    allowSyntheticData: false,
    requiresRealMarketData: true,
    orderDestination: 'ALPACA_LIVE',
    enforceStrictHaltOnDisconnect: true,
  },
};

export class TradingModeManager {
  private activeMode: AppMode = 'PAPER';
  private listeners: Set<(m: TradingModeDefinition) => void> = new Set();

  public getActiveMode(): TradingModeDefinition {
    return TRADING_MODES[this.activeMode] || TRADING_MODES.PAPER;
  }

  public setMode(mode: AppMode) {
    this.activeMode = mode;
    const def = this.getActiveMode();
    this.listeners.forEach((cb) => {
      try { cb(def); } catch {}
    });
  }

  public subscribe(cb: (m: TradingModeDefinition) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const tradingModeManager = new TradingModeManager();
