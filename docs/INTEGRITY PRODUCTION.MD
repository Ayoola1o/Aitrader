NOTE "Take this fix one after the order so as to avoid miss any one you create a file for it and task to track progress of all 20 fix"
AI QUANT TRADER — INTEGRITY PHASE 2

The UI architecture is now sufficiently mature. Stop adding decorative UI and focus on making the displayed system state truthful and the trading engine deterministic.

CRITICAL OBJECTIVES:

1. REMOVE ALL SYNTHETIC DATA FROM PAPER MODE.

Synthetic data is allowed ONLY in DEMO mode.

If PAPER mode cannot obtain verified live market data:
HALT THE BOT.

Never silently use fallback prices, synthetic candles, synthetic order books, synthetic trades, hardcoded funding, hardcoded open interest, hardcoded long/short ratios or synthetic liquidations in PAPER mode.

2. BUILD A CENTRAL MARKET DATA PROVIDER.

Create:

MarketDataProvider
MarketDataHealth
MarketDataSnapshot

Every snapshot must contain:

source
timestamp
latency
freshness
dataQuality
status

3. REAL ORDER BOOK.

Replace Math.random order-book generation with actual L2 data.

If L2 is unavailable:

orderBook.status = UNAVAILABLE

Do NOT synthesize it in PAPER mode.

4. REAL CANDLE DATA.

Remove synthesized candle fallback from PAPER mode.

DEMO may use synthetic candles.

5. CENTRAL SYSTEM HEALTH SERVICE.

Create:

SystemHealthService

with:

Market Data
Broker
Supabase
AI Provider
Risk Engine
Paper Engine
Telegram

Every service returns:

status
latency
lastChecked
message
capabilities

Settings, Dashboard, Terminal, Footer and Data Lab must consume this same service.

6. TEST CONNECTIONS MUST ACTUALLY TEST CONNECTIONS.

Remove Math.random() from Test All Connections.

Do not claim CONNECTED merely because credentials exist.

7. SECURITY.

Remove all hardcoded credentials/passwords.

Remove localStorage storage of:

Alpaca secret
AI API keys
Telegram bot token

Move credentials to server-side secure storage.

8. AUTHENTICATION.

Remove local/offline authentication fallback from production mode.

Use Supabase Auth or proper server authentication.

9. DATABASE SECURITY.

Remove public:

USING(true)
WITH CHECK(true)

policies.

Add user_id to user-owned tables.

Use auth.uid() based RLS.

10. UNIFY TRADING MODES:

DEMO
REPLAY
PAPER
LIVE

Define exactly what each means.

11. ONE DECISION ENGINE.

Browser bot, cloud bot, backtester and replay must all use:

TradingDecisionEngine.evaluate()

Do not duplicate the agent/fusion/LLM/risk pipeline.

12. ONE POSITION SIZING ENGINE.

Browser bot
Cloud bot
Backtest
Manual paper trade

must all use the same position-sizing implementation.

13. TRUE MULTI-BOT CLOUD EXECUTION.

Do not use getActiveBotSession() with LIMIT 1.

Create:

bots
bot_runs
bot_decisions
bot_orders
bot_positions
bot_events

The scheduler must process all RUNNING bots independently.

14. PERSIST PAPER TRADING STATE.

Do not depend on:

module globals
React state
localStorage

for production paper trading state.

Persist:

accounts
orders
fills
positions
trades
equity snapshots
risk events

15. PAPER EXECUTION ENGINE.

Implement:

spread
order book consumption
slippage
market impact
fees
latency
partial fills
market orders
limit orders
stop orders
take profit
long
short
margin

16. REBUILD BACKTESTING.

The Backtesting UI already exists.

Now build the actual engine.

The Run Backtest button must execute:

historical data
→ features
→ agents
→ fusion
→ LLM/deterministic moderator
→ risk
→ execution simulator
→ portfolio ledger
→ metrics

Do not return hardcoded results.

17. REBUILD RESEARCH.

Remove Math.random() generated decisions.

Research must consume actual:

ai_decisions
trades
positions
equity snapshots

18. REBUILD REPORTS.

Remove hardcoded metrics.

Calculate:

return
CAGR
Sharpe
Sortino
max drawdown
win rate
profit factor
expectancy
R multiple
strategy attribution
regime attribution
agent performance

from actual persisted trading data.

19. DATA TRUTHFULNESS.

Every page displaying market data must clearly indicate:

LIVE
DELAYED
HISTORICAL
SIMULATED
STALE
UNAVAILABLE

20. IMPORTANT:

Do not change the visual design significantly.

The current UI is now good.

The goal is to make the underlying data and execution truthful and production-grade.
