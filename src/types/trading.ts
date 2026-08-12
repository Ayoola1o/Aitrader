export type SymbolId = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'XRPUSDT';

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';

export type AppMode = 'DEMO' | 'PAPER' | 'REPLAY';

export type DataStatus =
  | 'LIVE'
  | 'DELAYED'
  | 'HISTORICAL'
  | 'SIMULATED'
  | 'UNAVAILABLE'
  | 'STALE';

export interface DataQuality {
  tickerStatus: DataStatus;
  orderBookStatus: DataStatus;
  tradesStatus: DataStatus;
  candlesStatus: DataStatus;
  fundingStatus: DataStatus;
  openInterestStatus: DataStatus;
  macroStatus: DataStatus;
  overallScore: number; // 0-100
  criticalStale: boolean;
  lastUpdated: number;
}

export type RegimeType =
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'RANGING'
  | 'HIGH_VOLATILITY'
  | 'LOW_VOLATILITY'
  | 'BREAKOUT'
  | 'TRANSITION'
  | 'UNKNOWN';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  bidAskImbalance: number; // -1 (full sell) to +1 (full buy)
  bidDepth: number;
  askDepth: number;
  midPrice: number;
}

export interface TradeTick {
  id: string;
  time: number;
  price: number;
  size: number;
  side: 'BUY' | 'SELL' | 'UNKNOWN';
}

export interface MarketSnapshot {
  symbol: SymbolId;
  exchange: string;
  timestamp: number;
  // Prices
  price: number;
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  // Data collections
  candles: Candle[];
  recentTrades: TradeTick[];
  orderBook: OrderBook;
  // Optional derivatives (may be UNAVAILABLE)
  fundingRate: number | null;
  openInterest: number | null;
  openInterestChange24h: number | null;
  longShortRatio: number | null;
  liquidations24h: { longs: number; shorts: number } | null;
  // Data quality metadata
  dataQuality: DataQuality;
  appMode: AppMode;
}

export interface FeatureVector {
  // Technical — standard formulas
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  adx: number;
  vwap: number;
  atr: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerExpansion: boolean;
  supportLevel: number;
  resistanceLevel: number;
  // Momentum
  roc: number;
  ppo: number;
  volumeZScore: number;
  volumeAcceleration: number;
  momentumDivergence: boolean;
  // Volatility
  realizedVol: number;
  volPercentile: number; // proper rank-based
  // Liquidity
  spread: number;
  spreadPercent: number;
  bidAskImbalance: number;
  liquidityScore: number;
  slippageRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  sweepDetected: boolean;
  // Positioning (from real data if available)
  fundingDivergence: boolean;
  crowdedPositioning: 'NONE' | 'LONG' | 'SHORT';
  // Macro — explicitly UNAVAILABLE if no source
  macroAvailable: boolean;
}

export interface Evidence {
  label: string;
  value: string | number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface AgentSignal {
  agentId: string;
  agentName: string;
  action: ActionType;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTION' | 'UNAVAILABLE';
  score: number;
  confidence: number;
  summary: string;
  evidence: Evidence[];
  risks: string[];
  keyMetrics: Record<string, string | number>;
  dataQuality: DataStatus;
  timestamp: number;
}

export interface SignalFusionResult {
  buyScore: number;
  sellScore: number;
  holdScore: number;
  noTradeScore: number;
  dominantAction: ActionType;
  confidence: number;
  conflictingSignals: boolean;
  abstainReason?: string;
  agentWeights: Record<string, number>;
}

export interface LLMDecision {
  action: ActionType;
  confidence: number;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskPercent: number;
  positionSize?: number;
  riskReward?: number;
  reasoning: string[];
  invalidation: string[];
  timeHorizon: 'SCALP' | 'INTRADAY' | 'SWING';
  regime: RegimeType;
  decisionId?: string;
}

export interface RiskCheckResult {
  approved: boolean;
  failedGates: string[];
  warnings: string[];
  maxAllowedPositionSize: number;
  calculatedPositionSize: number;
  riskRewardRatio: number;
  dailyDrawdownPercent: number;
  newsKillSwitchActive: boolean;
  dataQualityBlock: boolean;
}

export interface DecisionRecord {
  decisionId: string;
  timestamp: number;
  symbol: SymbolId;
  price: number;
  regime: RegimeType;
  agentSignals: AgentSignal[];
  fusion: SignalFusionResult;
  llmDecision: LLMDecision;
  riskCheck: RiskCheckResult;
  executed: boolean;
  orderId?: string;
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING';
  realizedPnL?: number;
}

export interface Order {
  id: string;
  decisionId?: string;
  timestamp: number;
  symbol: SymbolId;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  price: number;
  size: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  filledPrice?: number;
  slippage?: number;
  fee?: number;
  source: 'AI' | 'MANUAL';
}

export interface Position {
  id: string;
  decisionId?: string;
  symbol: SymbolId;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  liquidationPrice: number;
  openedAt: number;
  riskR: number; // current position in R units
}

export interface TradeHistoryItem {
  id: string;
  decisionId?: string;
  symbol: SymbolId;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  fee: number;
  slippage: number;
  openedAt: number;
  closedAt: number;
  closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'LIQUIDATION' | 'HARD_GATE';
  rMultiple: number; // profit in units of initial risk
}

export interface PortfolioState {
  balance: number;
  initialBalance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  unrealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyDrawdownPercent: number;
  maxDrawdownPercent: number;
  totalFees: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  equityCurve: { time: number; equity: number }[];
}

export interface AgentPerformanceMetric {
  agentId: string;
  agentName: string;
  accuracy: number;
  contribution: number;
  signalsGenerated: number;
  successfulSignals: number;
  noTradeSignals: number;
}
