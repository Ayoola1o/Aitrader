AI QUANT TRADER — aI3 INTEGRITY FIX

The latest implementation has made significant architectural progress.

DO NOT redesign the UI.

The UI is now sufficiently mature.

The next task is to make the trading system truthful, deterministic, persistent and internally consistent.

==================================================
1. CANONICAL TRADING MODES
==================================================

Create one canonical AppMode:

DEMO
REPLAY
PAPER
LIVE

Remove SHADOW from Settings.

Definitions:

DEMO:
Synthetic market data + simulated execution.

REPLAY:
Historical market data + simulated execution.

PAPER:
LIVE market data + simulated execution.

LIVE:
LIVE market data + real broker execution.

Every module must use the same AppMode.

==================================================
2. REMOVE SYNTHETIC DATA FROM PAPER
==================================================

Paper mode must NEVER use:

Math.random()
synthetic order books
synthetic candles
synthetic trades
hardcoded funding
hardcoded open interest
hardcoded long/short ratios
hardcoded liquidations
seed price fallback

This includes:

/api/market
/api/bot/cron
MarketDataProvider
DataLab
Dashboard
Terminal

Synthetic data is allowed ONLY in DEMO.

If PAPER cannot get verified live data:

RETURN UNAVAILABLE
HALT TRADING
SHOW DATA QUALITY ERROR

==================================================
3. CREATE ONE AUTHORITATIVE MARKET DATA SERVICE
==================================================

Create:

MarketDataService

Responsibilities:

- exchange WebSocket
- REST snapshot
- ticker
- trades
- L2 order book
- candles
- freshness
- latency
- data quality
- reconnect
- stale detection

Expose:

getSnapshot()
getOrderBook()
getCandles()
getHealth()

All application components must consume this service.

Do not create separate synthetic market implementations.

==================================================
4. REAL L2 ORDER BOOK
==================================================

Use a real exchange depth feed.

Implement:

initial REST snapshot
+
WebSocket depth updates
+
sequence validation
+
local order book
+
reconnect/resync

Do not construct order-book levels from price.

Paper execution must consume the actual order book.

==================================================
5. PAPER EXECUTION
==================================================

PaperExecutionEngine must consume L2 depth.

For a market order:

walk bid/ask levels
consume liquidity
calculate VWAP
calculate spread cost
calculate market impact
calculate slippage
apply fees
support partial fills
return remaining quantity if liquidity is insufficient

Remove:

orderBookDepth = 10.0

as the default execution source.

Execution should accept:

OrderBook

rather than an arbitrary depth number.

==================================================
6. UNIFIED BOT RUNTIME
==================================================

Browser bot and cloud bot must use the same runtime logic.

Create:

BotRuntime

Pipeline:

MarketData
→ FeatureEngine
→ SpecialistAgents
→ SignalFusion
→ DecisionEngine
→ RiskEngine
→ PositionSizingEngine
→ ExecutionAdapter
→ PortfolioLedger
→ Journal

Browser and server must not duplicate this pipeline.

==================================================
7. UNIFIED POSITION SIZING
==================================================

Remove manual position-size formulas from:

TradingBotEngine
cron/route.ts
BacktestingEngine

All must call:

PositionSizingEngine.calculateSize()

Final execution size must come from the centralized sizing engine.

==================================================
8. PERSISTENT PAPER LEDGER
==================================================

Paper trading must persist:

accounts
cash
equity
orders
fills
positions
trades
fees
slippage
equity snapshots
risk events

Do not rely on:

React state
module globals
localStorage

for authoritative paper state.

==================================================
9. TRUE MULTI-BOT
==================================================

The cloud scheduler must NOT use:

getActiveBotSession()
LIMIT 1

Use:

bots
bot_runs
bot_events
bot_orders
bot_positions

Process every RUNNING bot independently.

Each bot must have:

botId
userId
strategy
symbols
capital
risk policy
execution mode
status

One bot must never modify another bot's portfolio.

==================================================
10. DATABASE SECURITY
==================================================

Separate:

browser Supabase client
server Supabase admin client

Never expose SERVICE_ROLE_KEY to browser.

Never use:

NEXT_PUBLIC_ALPACA_SECRET_KEY

Remove it completely.

Server-only secrets:

ALPACA_API_KEY
ALPACA_SECRET_KEY
AI provider keys
Telegram token
Supabase service role key

==================================================
11. REMOVE LOCALSTORAGE SECRETS
==================================================

Never store:

Alpaca secret
AI API key
Telegram token
broker credentials

in localStorage.

Settings should display:

••••••••7F2A

Credentials must be stored server-side.

==================================================
12. AUTHENTICATION
==================================================

Remove fake OAuth sessions.

Google/GitHub/Microsoft buttons must either:

A. implement real OAuth

or

B. be removed until implemented.

Remove API-key login that creates a user without server verification.

Use Supabase Auth for normal authentication.

==================================================
13. SYSTEM HEALTH
==================================================

SystemHealthService must start with:

UNKNOWN

not fake:

ONLINE
42ms

Each service transitions:

UNKNOWN
→ TESTING
→ CONNECTED / ERROR / DEGRADED

AI health must perform an actual provider health request.

Market health must perform an actual feed test.

Broker health must perform an actual account test.

Database health must perform an actual authenticated query.

==================================================
14. BACKTESTING
==================================================

Remove generated historical candles.

Do not use:

Math.sin()
synthetic drift
synthetic volatility

for real backtesting.

Historical backtest data must come from:

database
uploaded data
exchange historical API
or another explicit historical provider.

If no historical data exists:

show:

NO HISTORICAL DATA AVAILABLE

Do not fabricate results.

==================================================
15. BACKTEST MUST USE THE SAME DECISION ENGINE
==================================================

Remove:

10-period / 20-period moving-average-only entry logic.

Backtest must use:

Historical Snapshot
→ FeatureEngine
→ Agents
→ Fusion
→ DecisionEngine
→ RiskEngine
→ PositionSizing
→ PaperExecution

The only difference between PAPER and REPLAY is the market clock/data source.

==================================================
16. REMOVE FAKE BACKTEST METRICS
==================================================

Delete all fallback metrics such as:

28.45%
28452.31
62.38%
186 trades
2.14 Sharpe

A zero-trade backtest must report:

0 trades
0 return
and explain why.

Never substitute attractive numbers.

==================================================
17. LLM BACKTEST OPTIMIZATION
==================================================

Do not call an LLM for every historical candle.

Default:

deterministic agents
→ fusion
→ deterministic moderator

Optional LLM review:

candidate entries
regime changes
signal conflicts
user-selected sampling

==================================================
18. DERIVATIVES DATA
==================================================

Funding
Open Interest
Long/Short
Liquidations

must each have an explicit DataStatus.

If unavailable:

Agent returns NO_SIGNAL.

Do not infer missing derivatives data.

==================================================
19. DATA QUALITY GATE
==================================================

Before every PAPER/LIVE trade verify:

ticker LIVE
order book LIVE
candles LIVE
freshness within threshold
spread acceptable
liquidity sufficient
slippage acceptable

If any critical requirement fails:

NO_TRADE

==================================================
20. REPORTS / RESEARCH
==================================================

Reports must be calculated from:

orders
fills
trades
positions
equity snapshots
decision journal

Research must consume actual persisted decisions.

No Math.random()
No fabricated confidence
No fabricated P&L
No hardcoded performance metrics.

==================================================
21. DATA LAB
==================================================

Remove random latency generation.

Data Lab must consume:

SystemHealthService

so Settings, Dashboard, Data Lab and Terminal show the same connection state.

==================================================
22. FINAL INTEGRITY TESTS
==================================================

Create automated tests for:

PAPER with live data → allowed

PAPER with stale data → blocked

PAPER with synthetic data → blocked

PAPER with unavailable order book → blocked

risk > limit → blocked

confidence < threshold → blocked

spread > limit → blocked

insufficient liquidity → blocked

position exceeds exposure → blocked

duplicate order → blocked

daily drawdown exceeded → blocked

kill switch → blocked

LIVE without broker → blocked

LIVE without persistent ledger → blocked

==================================================

IMPORTANT

Do not add more decorative UI.

Do not fabricate successful states.

Do not use fake market data to make the UI look populated.

If a service is unavailable, show the unavailable state.

The objective of this phase is:

TRUTHFUL DATA
+
DETERMINISTIC RISK
+
REALISTIC EXECUTION
+
PERSISTENT STATE
+
ONE DECISION PIPELINE

Only after this phase passes should new trading features be added.