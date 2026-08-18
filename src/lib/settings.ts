import { deterministicRiskEngine } from '@/lib/risk/engine';
import { signalFusionEngine } from '@/lib/fusion/engine';

export interface AppSettings {
  maxRisk: number;
  maxDrawdown: number;
  minRR: number;
  killSwitch: boolean;
  confidenceThreshold: number;
  startingBalance: number;
}

export const DEFAULT_STARTING_BALANCE = 10000;

export const DEFAULT_SETTINGS: AppSettings = {
  maxRisk: 0.5,
  maxDrawdown: 5.0,
  minRR: 2.0,
  killSwitch: false,
  confidenceThreshold: 68,
  startingBalance: DEFAULT_STARTING_BALANCE,
};

function readNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
}

export function getStartingBalance(): number {
  return readNumber('aitrader_starting_balance', DEFAULT_STARTING_BALANCE);
}

export function loadSettings(): AppSettings {
  return {
    maxRisk: readNumber('aitrader_max_risk', DEFAULT_SETTINGS.maxRisk),
    maxDrawdown: readNumber('aitrader_max_drawdown', DEFAULT_SETTINGS.maxDrawdown),
    minRR: readNumber('aitrader_min_rr', DEFAULT_SETTINGS.minRR),
    killSwitch: readBool('aitrader_kill_switch', DEFAULT_SETTINGS.killSwitch),
    confidenceThreshold: readNumber('aitrader_confidence_threshold', DEFAULT_SETTINGS.confidenceThreshold),
    startingBalance: getStartingBalance(),
  };
}

export function saveSettings(settings: Partial<AppSettings>) {
  if (typeof window === 'undefined') return;

  if (settings.maxRisk !== undefined) localStorage.setItem('aitrader_max_risk', String(settings.maxRisk));
  if (settings.maxDrawdown !== undefined) localStorage.setItem('aitrader_max_drawdown', String(settings.maxDrawdown));
  if (settings.minRR !== undefined) localStorage.setItem('aitrader_min_rr', String(settings.minRR));
  if (settings.killSwitch !== undefined) localStorage.setItem('aitrader_kill_switch', String(settings.killSwitch));
  if (settings.confidenceThreshold !== undefined) {
    localStorage.setItem('aitrader_confidence_threshold', String(settings.confidenceThreshold));
  }
  if (settings.startingBalance !== undefined) {
    localStorage.setItem('aitrader_starting_balance', String(settings.startingBalance));
  }
}

export function applySettings(settings: AppSettings = loadSettings()) {
  deterministicRiskEngine.setConfig({
    maxPositionRiskPercent: settings.maxRisk,
    maxDailyDrawdownPercent: settings.maxDrawdown,
    minRiskReward: settings.minRR,
    newsKillSwitch: settings.killSwitch,
    minConfidence: settings.confidenceThreshold / 100,
  });
  signalFusionEngine.setConfig({
    confidenceFloor: settings.confidenceThreshold / 100,
  });
}
