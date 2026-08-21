export type UserRole = 'TRADER' | 'QUANT' | 'ADMIN';

export interface UserProfileRecord {
  id: string; // UUID from auth.users
  email: string;
  display_name?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface RiskSettingsPayload {
  maxRisk: number;
  maxDrawdown: number;
  minRR: number;
  killSwitch: boolean;
  confidenceThreshold: number;
  startingBalance: number;
}

export interface ExecutionSettingsPayload {
  orderType: 'MARKET' | 'LIMIT';
  slippageTolerance: number;
  routingPreference: 'SMART_ROUTING' | 'DIRECT';
  extendedHours: boolean;
}

export interface AISettingsPayload {
  provider: 'mock' | 'gemini' | 'openai' | 'anthropic' | 'deepseek';
  model: string;
  temperature: number;
  optimizationMode: 'ALWAYS' | 'CANDIDATE_ENTRIES' | 'REGIME_CHANGES' | 'CONFLICTS' | 'OFF';
}

export interface NotificationSettingsPayload {
  telegramEnabled: boolean;
  chatId: string;
  notifyTrades: boolean;
  notifyRiskAlerts: boolean;
  notifyHeartbeat: boolean;
}

export interface TradingModeSettingsPayload {
  defaultMode: 'DEMO' | 'REPLAY' | 'PAPER' | 'LIVE';
  autoRebalance: boolean;
}

export interface UserSettingsRecord {
  id?: string;
  user_id: string;
  risk_settings: RiskSettingsPayload;
  execution_settings: ExecutionSettingsPayload;
  ai_settings: AISettingsPayload;
  notification_settings: NotificationSettingsPayload;
  trading_mode_settings: TradingModeSettingsPayload;
  created_at?: string;
  updated_at?: string;
}

export interface BrokerConnectionRecord {
  id?: string;
  user_id: string;
  broker_name: 'ALPACA' | 'BINANCE' | 'HYPERLIQUID';
  account_type: 'PAPER' | 'LIVE';
  connection_status: 'CONNECTED' | 'DISCONNECTED' | 'INVALID_CREDENTIALS' | 'ERROR';
  account_number?: string;
  buying_power?: number;
  cash_balance?: number;
  currency?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AIDecisionJournalRecord {
  decision_id: string;
  user_id?: string;
  bot_id?: string;
  symbol: string;
  price: number;
  regime: string;
  dominant_action: string;
  confidence: number;
  entry_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  position_size?: number;
  risk_reward?: number;
  reasoning?: string[];
  invalidation?: string[];
  agent_signals?: Record<string, unknown>[];
  fusion_scores?: Record<string, unknown>;
  risk_approved?: boolean;
  risk_failed_gates?: string[];
  executed?: boolean;
  created_at?: string;
}

export type StrategyLifecycleStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'BACKTESTED'
  | 'WALK_FORWARD_TESTED'
  | 'PAPER_APPROVED'
  | 'LIVE_ELIGIBLE'
  | 'LIVE'
  | 'SUSPENDED'
  | 'RETIRED';

export interface StrategyRecord {
  strategy_id: string;
  user_id?: string;
  name: string;
  description?: string;
  category: string;
  current_version: string;
  lifecycle_status: StrategyLifecycleStatus;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StrategyVersionRecord {
  version_id?: number;
  strategy_id: string;
  user_id?: string;
  version_tag: string; // e.g. 'v1.0'
  parameters: Record<string, unknown>;
  lifecycle_status: StrategyLifecycleStatus;
  backtest_metrics?: Record<string, unknown>;
  is_immutable: boolean;
  change_summary?: string;
  created_at?: string;
}

