export type SymbolId = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'XRPUSDT';

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export type ActionType = 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE';

export type RegimeType = 
  | 'TRENDING_UP' 
  | 'TRENDING_DOWN' 
  | 'RANGING' 
  | 'HIGH_VOLATILITY' 
  | 'LOW_VOLATILITY' 
  | 'BREAKOUT' 
  | 'TRANSITION';

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
  bidAskImbalance: number; // -1 (full sell imbalance) to +1 (full buy imbalance)
}

export interface TradeTick {
  id: string;
  time: number;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
}

export interface MarketSnapshot {
  symbol: SymbolId;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
  openInterestChange24h: number;
  longShortRatio: number;
  liquidations24h: { longs: number; shorts: number };
  orderBook: OrderBook;
  recentTrades: TradeTick[];
  candles: Candle[];
}

export interface FeatureVector {
  // Technical
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  adx: number;
  vwap: number;
  supportLevel: number;
  resistanceLevel: number;
  
  // Momentum
  roc: number; // Rate of change
  ppo: number; // Percentage Price Oscillator
  volumeAcceleration: number;
  momentumDivergence: boolean;
  
  // Volatility
  atr: number;
  realizedVol: number;
  volPercentile: number;
  bollingerExpansion: boolean;
  
  // Liquidity
  spread: number;
  liquidityScore: number;
  slippageRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  sweepDetected: boolean;
  
  // Positioning
  fundingDivergence: boolean;
  crowdedPositioning: 'NONE' | 'LONG' | 'SHORT';
  
  // Macro
  dxyIndex: number;
  vixProxy: number;
  macroRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  minutesToNextEvent: number;
  newsImpactScore: number;
}

export interface AgentSignal {
  agentId: string;
  agentName: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTION';
  score: number; // 0 to 1
  confidence: number; // 0 to 1
  summary: string;
  keyMetrics: Record<string, string | number>;
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
  reasoning: string[];
  invalidation: string[];
  timeHorizon: 'SCALP' | 'INTRADAY' | 'SWING';
  regime: RegimeType;
}

export interface RiskCheckResult {
  approved: boolean;
  failedGates: string[];
  warnings: string[];
  maxAllowedPositionSize: number;
  riskRewardRatio: number;
  dailyDrawdownPercent: number;
  newsKillSwitchActive: boolean;
}

export interface DecisionRecord {
  id: string;
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
}

export interface Order {
  id: string;
  timestamp: number;
  symbol: SymbolId;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';
  price: number;
  size: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  filledPrice?: number;
  slippage?: number;
  fee?: number;
}

export interface Position {
  id: string;
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
}

export interface TradeHistoryItem {
  id: string;
  symbol: SymbolId;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  openedAt: number;
  closedAt: number;
  closeReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'LIQUIDATION' | 'HARD_GATE';
}

export interface PortfolioState {
  balance: number;
  initialBalance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyDrawdownPercent: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface AgentPerformanceMetric {
  agentId: string;
  agentName: string;
  accuracy: number; // 0..1
  contribution: number; // e.g. +12%
  signalsGenerated: number;
  successfulSignals: number;
}
