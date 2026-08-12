Yes. I would give the coding agent a **replacement implementation brief**, not a list of small bug fixes. The current project has the right skeleton, but it needs to be converted from a visually convincing prototype into a **data-integrity-first paper-trading and research platform**.

Below is the specification I would give it.

---

# AI QUANT TRADER LITE — COMPREHENSIVE FIX & HARDENING PLAN

## 0. Mission

Refactor the existing AI Quant Trader Lite application into a **trustworthy, lightweight AI-assisted quantitative research and paper-trading platform**.

The application must prioritize:

1. **Data integrity**
2. **Correct quantitative calculations**
3. **Realistic paper execution**
4. **Strict risk management**
5. **Auditable AI decisions**
6. **Research/replay validity**
7. **High-end trading UI/UX**
8. **Vercel compatibility**
9. **Low package size**
10. **Fail-safe behavior**

Do **not** rebuild the application from scratch unless necessary.

Preserve the existing UI architecture and reusable components where practical, but replace any simulated or misleading backend logic.

---

# 1. NON-NEGOTIABLE RULES

### Rule 1 — Never present fake data as live data

Every data point must have a source status:

```ts
type DataStatus =
  | "LIVE"
  | "DELAYED"
  | "HISTORICAL"
  | "SIMULATED"
  | "UNAVAILABLE"
  | "STALE";
```

The UI must visibly distinguish these.

For example:

```text
BTC PRICE        ● LIVE
ORDER BOOK       ● LIVE
TRADES           ● LIVE
FUNDING          ● LIVE
OPEN INTEREST    ● LIVE
MACRO            ○ UNAVAILABLE
```

Never label synthetic values as live.

---

# 2. APPLICATION MODES

Create explicit modes.

## Demo

Synthetic data allowed.

```text
DEMO MODE
```

## Paper

Real market data + simulated execution.

```text
PAPER TRADING
```

## Replay

Historical market data + simulated execution.

```text
REPLAY
```

## Live

Do not implement real-money execution yet.

Show:

```text
LIVE TRADING
COMING SOON
```

The code architecture can prepare for it, but it must remain disabled.

---

# 3. DATA ARCHITECTURE

Replace the current mixed real/synthetic market snapshot system.

Current problem:

```text
real price
+
fake order book
+
fake OI
+
fake positioning
```

Replace with:

```text
                    MARKET DATA
                         │
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
    Trades             Ticker          Order Book
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ↓
                 NORMALIZATION
                         ↓
                  DATA VALIDATOR
                         ↓
                  MARKET SNAPSHOT
```

---

# 4. MARKET SNAPSHOT

Create one canonical schema.

```ts
interface MarketSnapshot {
  symbol: string;
  exchange: string;
  timestamp: number;

  price: number;
  bid: number;
  ask: number;
  spread: number;

  candles: Candle[];
  trades: TradeTick[];
  orderBook: OrderBook;

  volume24h: number;

  funding?: FundingData;
  openInterest?: OpenInterestData;
  longShort?: LongShortData;
  liquidations?: LiquidationData;

  volatility?: VolatilityData;

  dataQuality: DataQuality;
}
```

Every agent must consume this normalized structure.

---

# 5. DATA QUALITY ENGINE

Create:

```text
src/lib/market/DataQualityEngine.ts
```

It must check:

### Freshness

```text
ticker age
trade age
order book age
funding age
OI age
```

### Completeness

```text
missing fields
missing candles
missing order book
```

### Consistency

Check:

```text
bid <= ask
price inside reasonable spread
timestamps increasing
volume non-negative
price non-negative
```

### Staleness

Example:

```text
ticker > 5 seconds old
→ STALE
```

Thresholds should be configurable.

---

# 6. FAIL-CLOSED DATA POLICY

If critical data becomes stale:

```text
NO NEW TRADE
```

Do not let the AI continue trading on stale information.

Example:

```ts
if (dataQuality.criticalStale) {
  return {
    action: "NO_TRADE",
    reason: "Critical market data is stale"
  };
}
```

---

# 7. BINANCE MARKET DATA

For the initial crypto version, use a properly implemented exchange stream.

Separate:

```text
ticker
trades
depth
```

or use Binance combined streams correctly.

Do not concatenate WebSocket paths incorrectly.

Normalize exchange messages immediately:

```text
Binance
 ↓
Adapter
 ↓
Internal MarketSnapshot
```

This allows another exchange to be added later without rewriting the entire application.

---

# 8. EXCHANGE ADAPTER

Create:

```text
src/lib/exchanges/
    ExchangeAdapter.ts
    BinanceAdapter.ts
```

Interface:

```ts
interface ExchangeAdapter {
  connect(): Promise<void>;

  subscribeTicker(symbol: string): void;

  subscribeTrades(symbol: string): void;

  subscribeOrderBook(symbol: string): void;

  getTicker(symbol: string): Promise<Ticker>;

  getHistoricalCandles(
    symbol: string,
    timeframe: string,
    start: number,
    end: number
  ): Promise<Candle[]>;
}
```

Future:

```text
Binance
Coinbase
Bybit
OKX
```

without changing the quant engine.

---

# 9. ORDER BOOK ENGINE

Replace random order book generation.

Maintain:

```text
bids
asks
bestBid
bestAsk
spread
midPrice
depth
imbalance
```

Calculate:

```text
imbalance =
(bidVolume - askVolume)
/
(bidVolume + askVolume)
```

at configurable depth:

```text
5 levels
10 levels
20 levels
```

---

# 10. REAL LIQUIDITY ANALYSIS

Do not call simple imbalance a "liquidity sweep."

Create:

```text
LiquidityAnalyzer
```

Calculate:

### Spread

```text
ask - bid
```

### Spread %

```text
(ask - bid) / mid
```

### Depth

```text
bid depth
ask depth
```

### Imbalance

```text
bid vs ask
```

### Liquidity concentration

Identify large levels.

### Liquidity gaps

Detect unusually thin areas.

### Sweep detection

Only call something a sweep if:

```text
aggressive trade flow
+
liquidity consumption
+
price movement through level
```

is observed.

---

# 11. TIME & SALES

The current UI has the component.

Now connect it to actual trade ticks.

Each tick:

```text
timestamp
price
size
side
```

Side can be estimated from bid/ask:

```text
price >= ask → aggressive buy
price <= bid → aggressive sell
```

Otherwise:

```text
UNKNOWN
```

Display:

```text
TIME      PRICE      SIZE      SIDE
14:03:12  64250.2    0.45      BUY
14:03:13  64249.8    0.12      SELL
```

---

# 12. FUNDING DATA

Connect funding to actual exchange data.

Schema:

```ts
interface FundingData {
  rate: number;
  nextFundingTime: number;
  timestamp: number;
  source: string;
}
```

Calculate:

```text
current funding
funding percentile
funding trend
```

---

# 13. OPEN INTEREST

Do not use:

```ts
Math.random()
```

Use actual exchange OI where available.

Store:

```text
current OI
OI change 1h
OI change 4h
OI change 24h
```

---

# 14. LONG/SHORT POSITIONING

Use real exchange positioning data when available.

Calculate:

```text
longShortRatio
longPercentage
shortPercentage
ratioChange
percentile
```

Do not interpret one threshold in isolation.

---

# 15. LIQUIDATIONS

Connect to real liquidation streams/data where available.

Store:

```ts
interface LiquidationData {
  longLiquidations: number;
  shortLiquidations: number;
  largestLiquidation?: number;
  timestamp: number;
}
```

Calculate liquidation imbalance.

---

# 16. PRICE + OI MATRIX

Create a proper positioning interpretation engine.

Example:

```text
Price ↑ + OI ↑
→ Long buildup / new positioning

Price ↑ + OI ↓
→ Short covering possibility

Price ↓ + OI ↑
→ Short buildup possibility

Price ↓ + OI ↓
→ Long liquidation / position reduction
```

This should be evidence, not an automatic trade signal.

---

# 17. FEATURE ENGINE

Rewrite indicators using standard formulas.

Implement correctly:

```text
EMA
SMA
RSI
ATR
ADX
MACD
VWAP
Bollinger Bands
ROC
Realized Volatility
Volume Z-score
```

Do not invent approximate versions where standard definitions exist.

---

# 18. VOLATILITY PERCENTILE

Do not calculate:

```text
volatility / 45
```

Instead:

```text
current volatility
        ↓
historical volatility window
        ↓
rank
        ↓
percentile
```

Example:

```text
Current RV = 52%

Historical percentile = 91%
```

---

# 19. MARKET REGIME ENGINE

Create a proper regime classifier:

```text
TREND_UP
TREND_DOWN
RANGE
BREAKOUT
HIGH_VOLATILITY
LOW_VOLATILITY
TRANSITION
UNKNOWN
```

Use:

```text
ADX
EMA structure
ATR
price structure
volatility
volume
```

Do not use a single indicator.

---

# 20. SPECIALIST AGENTS

Keep the existing modular architecture.

Agents:

```text
RegimeAgent
TechnicalAgent
MomentumAgent
LiquidityAgent
PositioningAgent
VolatilityAgent
MacroAgent
ExecutionAgent
```

Each must return:

```ts
interface AgentSignal {
  agentId: string;

  action:
    | "BUY"
    | "SELL"
    | "HOLD"
    | "NO_TRADE";

  score: number;

  confidence: number;

  evidence: Evidence[];

  risks: string[];

  timestamp: number;

  dataQuality: DataQuality;
}
```

---

# 21. AGENTS MUST NOT USE FAKE DATA

If an agent's required data isn't available:

```text
status = UNAVAILABLE
```

Example:

```text
Macro Agent

Status: UNAVAILABLE

Reason:
No validated macro data source.
```

It should not invent:

```text
DXY = 104.2
VIX = 14.8
```

---

# 22. AGENT EVIDENCE

Every signal must explain itself.

Example:

```text
TECHNICAL AGENT

Action: BUY
Confidence: 82%

Evidence:

+ Price above EMA 20
+ EMA 20 above EMA 50
+ ADX = 31
+ RSI = 61

Risks:

- Resistance 0.8% above price
```

This will make the research system much more useful.

---

# 23. SIGNAL FUSION

Create a transparent fusion system.

Example:

```text
Technical       +0.82
Momentum        +0.71
Liquidity       +0.55
Positioning     -0.31
Volatility      -0.15
Regime          +0.73
```

Then:

```text
Composite Score
```

But do not blindly average everything.

Weights should be configurable.

---

# 24. SIGNAL CONFLICT

Example:

```text
Technical       BUY
Momentum        BUY
Liquidity       SELL
Positioning     SELL
Volatility      HOLD
```

Result:

```text
NO_TRADE
```

if conflict exceeds configured threshold.

This is essential.

---

# 25. LLM MODERATOR

The LLM should NOT receive raw thousands of candles.

Give it a compact structured evidence packet.

Example:

```json
{
  "market": {},
  "regime": {},
  "technical": {},
  "momentum": {},
  "liquidity": {},
  "positioning": {},
  "volatility": {},
  "macro": {},
  "execution": {},
  "risk": {}
}
```

The LLM should decide:

```text
BUY
SELL
HOLD
NO_TRADE
```

and provide:

```text
confidence
reason
invalidation
risk
```

---

# 26. LLM MUST NOT INVENT DATA

System instruction:

```text
You are a market decision moderator.

You MUST only use evidence supplied in the structured input.

You MUST NOT invent:
- prices
- indicators
- order-book conditions
- funding
- open interest
- macro data
- news
- liquidity

If required information is unavailable, explicitly state it.

When evidence conflicts materially, prefer NO_TRADE.
```

---

# 27. STRICT LLM OUTPUT

Use Zod:

```ts
const result =
  llmDecisionSchema.safeParse(parsed);
```

Reject invalid output.

No exceptions.

---

# 28. LLM DECISION SHOULD BE ADVISORY

Important architecture:

```text
LLM
 ↓
Decision Proposal
 ↓
Risk Engine
 ↓
Final Decision
```

The LLM should never bypass:

```text
max position
max leverage
daily loss
drawdown
liquidity
spread
R:R
data quality
```

---

# 29. RISK ENGINE

The Risk Engine is the final authority.

Check:

```text
Data freshness
Daily loss
Portfolio drawdown
Position exposure
Symbol exposure
Leverage
Margin
Spread
Liquidity
Slippage estimate
Risk/reward
Stop loss
Maximum position
Correlation
```

If any hard rule fails:

```text
NO_TRADE
```

---

# 30. POSITION SIZING

Use risk-based sizing.

Example:

```text
Account = $10,000

Risk per trade = 0.5%

Maximum loss = $50

Entry = $64,000
Stop = $63,500

Risk/unit = $500

Position size =
$50 / $500
= 0.1 BTC
```

Do not simply choose:

```text
$1,000 position
```

without regard to stop distance.

---

# 31. RISK/REWARD

Require:

```text
minimum R:R = configurable
```

Example:

```text
Entry: 64,000
Stop: 63,500
Target: 65,500

Risk = 500
Reward = 1,500

R:R = 3.0
```

---

# 32. PAPER BROKER

Completely rewrite the broker accounting.

Track:

```text
cash
equity
used margin
free margin
unrealized P&L
realized P&L
fees
funding
positions
orders
fills
```

---

# 33. EXECUTION MODEL

Paper execution must simulate:

```text
market order
limit order
stop market
stop limit
```

and:

```text
slippage
spread
fees
partial fills
latency
liquidity
```

---

# 34. NO PERFECT STOP FILLS

Do not do:

```text
stop triggered
→ exact stop price
```

Instead:

```text
stop triggered
→ simulated market execution
→ available liquidity
→ slippage
→ fill price
```

---

# 35. PAPER TRADING MUST START CLEAN

New paper account:

```text
Starting Balance
default prices the user input for the trade

Realized P&L
$0

Unrealized P&L
$0

Trades
0

Positions
0
```

Allow optional demo seed separately.

---

# 36. MANUAL + AI ORDERS MUST SHARE ONE PIPELINE

Both:

```text
AI Order
Manual Order
```

must go through:

```text
Order Request
 ↓
Validation
 ↓
Risk Gate
 ↓
Execution Simulator
 ↓
Broker
```

Never allow manual orders to bypass risk checks.

---

# 37. PAPER ACCOUNTING

Calculate:

```text
realized P&L
unrealized P&L
fees
funding
net P&L
equity curve
drawdown
```

correctly.

---

# 38. RESEARCH ENGINE — MAJOR REWRITE

Remove all hard-coded metrics.

Remove:

```text
Math.sin()
Math.cos()
```

as a trading strategy.

Replay must execute the actual strategy pipeline.

---

# 39. HISTORICAL REPLAY

Replay:

```text
Historical market data
 ↓
Feature Engine
 ↓
Agents
 ↓
Fusion
 ↓
LLM
 ↓
Risk
 ↓
Paper Broker
```

At each historical timestamp.

---

# 40. NO LOOK-AHEAD BIAS

At time `T`, the system may only use information available at:

```text
≤ T
```

Never:

```text
future candle
future volume
future OI
future funding
future liquidation
```

This is essential.

---

# 41. REPLAY MODES

Implement:

```text
FAST
NORMAL
STEP-BY-STEP
```

Example:

```text
1 candle
→ evaluate
→ decision
→ execution
→ next candle
```

---

# 42. RESEARCH METRICS

Calculate from actual trades:

```text
Net Return
Win Rate
Loss Rate
Profit Factor
Expectancy
Average Win
Average Loss
Sharpe Ratio
Sortino Ratio
Maximum Drawdown
Recovery Factor
Calmar Ratio
Trade Count
Average Holding Time
```

---

# 43. AI-SPECIFIC METRICS

Add:

```text
Directional Accuracy
Signal Precision
Signal Recall
Abstention Rate
False Positive Rate
False Negative Rate
Confidence Calibration
```

---

# 44. AGENT CONTRIBUTION

Do not hard-code:

```text
Regime 78.4%
```

Instead calculate contribution from actual decisions.

For example:

```text
Agent was aligned with profitable trade
Agent contradicted profitable trade
Agent prevented bad trade
Agent caused unnecessary trade
```

Then produce:

```text
Regime Agent
Correct influence: 71%
Negative influence: 18%
Neutral: 11%
```

---

# 45. DECISION JOURNAL

Every AI decision must be stored.

Example:

```text
BTCUSDT
2026-08-11 14:32:10

Decision:
LONG

Confidence:
82%

Entry:
64,250

Stop:
63,800

Target:
65,600

Evidence:
Technical bullish
Momentum bullish
Liquidity positive
Positioning neutral

Risk:
Moderate

Outcome:
+1.8R
```

This becomes extremely valuable for improving the system.

---

# 46. DECISION REPLAY

Allow the user to click a historical trade:

```text
VIEW DECISION
```

and see:

```text
What did the agents see?
What did the LLM say?
What did risk reject/approve?
What happened afterward?
```

This is one of the highest-value features of the application.

---

# 47. CHART IMPROVEMENTS

Keep the current chart but add:

```text
Crosshair
Zoom
Pan
Timeframe
Volume
EMA
VWAP
RSI
ATR
```

And AI annotations:

```text
▲ AI LONG
▼ AI SHORT
× NO TRADE
```

Also show:

```text
Entry
Stop
Target
Liquidity zones
Support/resistance
```

---

# 48. TRADING TERMINAL

Target layout:

```text
┌──────────┬─────────────────────────────┬──────────────┐
│ WATCHLIST│                             │ AI DECISION  │
│          │                             │              │
│ BTCUSDT  │                             │ LONG         │
│ ETHUSDT  │           CHART             │ 82%          │
│ SOLUSDT  │                             │              │
│ XRPUSDT  │                             │ Entry        │
│          │                             │ Stop         │
│          │                             │ Target       │
├──────────┴─────────────────────────────┴──────────────┤
│ ORDER BOOK │ TIME & SALES │ ORDERS │ POSITIONS        │
└───────────────────────────────────────────────────────┘
```

---

# 49. AI DECISION CENTER

Display:

```text
MARKET REGIME
TECHNICAL
MOMENTUM
LIQUIDITY
POSITIONING
VOLATILITY
MACRO
EXECUTION
RISK
```

Each:

```text
ACTION
CONFIDENCE
EVIDENCE
DATA QUALITY
```

---

# 50. DATA INTEGRITY UI

Add a dedicated indicator.

```text
DATA INTEGRITY

Ticker       ● LIVE
Trades       ● LIVE
Order Book   ● LIVE
Funding      ● LIVE
OI           ● LIVE
Positioning  ● LIVE
Macro        ○ OFFLINE

Overall
92%
```

If critical:

```text
⚠ TRADING DISABLED
```

---

# 51. PAPER TRADING UI

Show:

```text
Balance
Equity
Margin
Free Margin
Daily P&L
Total P&L
Drawdown
```

Positions:

```text
Symbol
Side
Size
Entry
Mark
Stop
Target
Unrealized P&L
R
```

Orders:

```text
Submitted
Accepted
Partially Filled
Filled
Cancelled
Rejected
```

---

# 52. RESEARCH UI

Show:

```text
Equity Curve
Drawdown
Trade Distribution
Agent Performance
Decision Accuracy
Confidence Calibration
```

Never show a metric unless calculated.

---

# 53. API SECURITY

Remove secrets from:

```text
localStorage
client-side code
React components
```

Use:

```text
server-side environment variables
```

or encrypted server-side storage.

Architecture:

```text
Browser
 ↓
Next.js API
 ↓
Broker / AI Provider
```

---

# 54. API ROUTES

Use server routes such as:

```text
/api/market/ticker
/api/market/orderbook
/api/market/trades

/api/ai/decision

/api/paper/order
/api/paper/positions
/api/paper/account

/api/research/replay
/api/research/metrics
```

---

# 55. WEBSOCKET ARCHITECTURE

Do not rely on a long-running trading engine inside a Vercel serverless function.

Vercel should handle:

```text
UI
API
authentication
decision requests
database
```

Persistent market streams should be handled by an appropriate external/persistent service when necessary.

The frontend can subscribe to a realtime service.

---

# 56. VERCEL / 500 MB REQUIREMENT

Hard constraint:

```text
Deployment package < 500 MB
```

Target:

```text
<150 MB
```

Do not add:

```text
PyTorch
TensorFlow
CUDA
local LLM
large ML model
large historical dataset
```

Use external LLM APIs.

---

# 57. REMOVE UNNECESSARY DEPENDENCIES

Audit:

```text
package.json
```

Remove anything unused.

Run:

```text
npm dedupe
```

and production build.

Document final bundle/deployment size.

---

# 58. ERROR HANDLING

Every subsystem must fail gracefully.

### Exchange unavailable

```text
DATA OFFLINE
TRADING DISABLED
```

### LLM unavailable

```text
AI UNAVAILABLE
NO NEW AI TRADE
```

### Database unavailable

```text
PERSISTENCE ERROR
NO NEW TRADE
```

### Risk engine unavailable

```text
TRADING DISABLED
```

Never fail open.

---

# 59. KILL SWITCH

Add:

```text
TRADING HALT
```

conditions:

```text
data stale
exchange disconnected
LLM failure
risk engine failure
daily loss exceeded
drawdown exceeded
abnormal spread
abnormal volatility
```

And a manual kill switch:

```text
STOP TRADING
```

---

# 60. OBSERVABILITY

Add structured logs:

```text
market_event
agent_signal
fusion_result
llm_request
llm_response
risk_decision
order_request
order_fill
trade_close
```

Each should have:

```text
timestamp
symbol
decisionId
traceId
```

This makes debugging possible.

---

# 61. DECISION ID

Every AI decision gets:

```text
decisionId
```

Example:

```text
DEC-20260811-000182
```

Connect:

```text
Decision
 ↓
Agents
 ↓
LLM
 ↓
Risk
 ↓
Order
 ↓
Fill
 ↓
Trade
```

This gives complete auditability.

---

# 62. TESTING

Create automated tests for:

### Indicators

```text
RSI
EMA
ATR
ADX
VWAP
```

### Order book

```text
spread
imbalance
depth
```

### Risk

```text
position size
stop
R:R
drawdown
```

### Broker

```text
market order
limit order
stop
fees
slippage
P&L
```

### Replay

```text
no lookahead
correct timestamps
correct fills
```

---

# 63. CRITICAL TEST

Create a test:

```text
Future candle data must never influence a decision at T.
```

This should fail the build if violated.

---

# 64. PAPER-TRADING ACCEPTANCE TEST

Before declaring the app ready:

Run at least:

```text
100+
paper trades
```

under controlled historical/replay conditions.

Verify:

```text
orders
fills
fees
slippage
P&L
drawdown
position sizing
stop execution
```

---

# 65. RESEARCH ACCEPTANCE TEST

Run the same historical period twice.

Expected:

```text
Same data
+
Same configuration
=
Same results
```

unless randomness is explicitly configured.

No:

```text
Math.random()
```

in deterministic replay.

---

# 66. AI EVALUATION

Don't ask:

> "Is the AI right 95% of the time?"

Instead measure:

```text
Expected Value
Profit Factor
Maximum Drawdown
Sharpe
Sortino
Precision
Abstention
Calibration
```

The objective is:

> **positive risk-adjusted expectancy**, not artificially high directional accuracy.

---

# 67. CONFIDENCE CALIBRATION

If AI says:

```text
90% confidence
```

historically approximately 90% of comparable decisions should be correct under the chosen definition.

If:

```text
90% confidence
→ 58% success
```

the confidence is poorly calibrated.

Add calibration reporting.

---

# 68. NO-TRADE SHOULD BE A FIRST-CLASS OUTCOME

The system should frequently choose:

```text
NO TRADE
```

when:

```text
data conflict
poor R:R
poor liquidity
high spread
high volatility
weak setup
stale data
insufficient confidence
```

A high-quality trading system doesn't need to trade constantly.

---

# 69. FINAL DECISION OBJECT

Use something like:

```ts
interface FinalDecision {
  decisionId: string;

  symbol: string;

  action:
    | "BUY"
    | "SELL"
    | "HOLD"
    | "NO_TRADE";

  confidence: number;

  regime: string;

  entry?: number;

  stopLoss?: number;

  takeProfit?: number;

  positionSize?: number;

  leverage?: number;

  riskReward?: number;

  reasoning: string[];

  evidence: Evidence[];

  rejectedReasons: string[];

  dataQuality: DataQuality;

  riskStatus: "APPROVED" | "REJECTED";

  timestamp: number;
}
```

---

# 70. UI STATUS MUST COME FROM THE ENGINE

Don't hard-code:

```text
AI ONLINE
LIVE DATA
84%
```

The UI should consume actual state.

Example:

```text
AI ONLINE
```

only if:

```text
provider reachable
last successful request < threshold
```

---

# 71. FINAL PRODUCT ARCHITECTURE

The final system should look like:

```text
                         ┌──────────────┐
                         │   NEXT.JS    │
                         │     UI       │
                         └──────┬───────┘
                                │
                         API / Realtime
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
          MARKET DATA                    APPLICATION API
                 │                             │
        ┌────────┴────────┐             ┌──────┴───────┐
        │                 │             │              │
     Exchange          Historical      AI Engine     Paper Broker
        │                 │             │              │
        └────────┬────────┘             │              │
                 ↓                      │              │
           DATA VALIDATOR               │              │
                 ↓                      │              │
          FEATURE ENGINE                │              │
                 ↓                      │              │
           AGENT ENGINE ────────────────┘              │
                 ↓                                     │
           SIGNAL FUSION                               │
                 ↓                                     │
           LLM MODERATOR                               │
                 ↓                                     │
            RISK ENGINE ───────────────────────────────┘
                 ↓
           FINAL DECISION
                 ↓
           PAPER EXECUTION
                 ↓
           TRADE JOURNAL
                 ↓
          RESEARCH METRICS
```

---

# 72. DEVELOPMENT ORDER

Do **not** let the agent implement everything simultaneously.

Use this order:

### Sprint 1

**Data integrity**

```text
Exchange adapter
Ticker
Trades
Order book
Data validation
```

### Sprint 2

**Quant engine**

```text
Indicators
Regime
Liquidity
Positioning
Volatility
```

### Sprint 3

**Agents**

```text
8 specialist agents
Evidence
Confidence
```

### Sprint 4

**Decision engine**

```text
Fusion
LLM
Zod
Decision policy
```

### Sprint 5

**Risk**

```text
Sizing
Exposure
R:R
Drawdown
Kill switch
```

### Sprint 6

**Paper broker**

```text
Orders
Fills
Slippage
Fees
P&L
Margin
```

### Sprint 7

**Replay**

```text
Historical data
No lookahead
Actual strategy execution
```

### Sprint 8

**Research**

```text
Metrics
Agent attribution
Decision journal
Calibration
```

### Sprint 9

**UI**

```text
Charts
Order book
Time & sales
AI decision
Research
```

### Sprint 10

**Hardening**

```text
Security
Testing
Performance
Vercel deployment
Package audit
```

---

# 73. DEFINITION OF DONE

Do not declare the project complete until:

### Market data

* [ ] Real ticker
* [ ] Real trades
* [ ] Real order book
* [ ] Data freshness monitoring
* [ ] Data provenance
* [ ] No fake data in Paper mode

### Quant

* [ ] Standard indicator formulas
* [ ] Real volatility percentile
* [ ] Real liquidity analysis
* [ ] Real positioning analysis
* [ ] Regime detection

### AI

* [ ] 8 specialist agents
* [ ] Evidence per agent
* [ ] Signal fusion
* [ ] LLM moderator
* [ ] Zod validation
* [ ] LLM cannot bypass risk
* [ ] NO_TRADE supported

### Risk

* [ ] Position sizing
* [ ] Stop loss
* [ ] Take profit
* [ ] R:R
* [ ] Max exposure
* [ ] Daily loss limit
* [ ] Drawdown limit
* [ ] Kill switch

### Paper broker

* [ ] Clean starting account
* [ ] Market orders
* [ ] Limit orders
* [ ] Stop orders
* [ ] Fees
* [ ] Slippage
* [ ] Partial fills
* [ ] Realized P&L
* [ ] Unrealized P&L
* [ ] Margin

### Research

* [ ] Historical replay
* [ ] No lookahead
* [ ] Actual strategy execution
* [ ] Deterministic results
* [ ] Real metrics
* [ ] Agent attribution
* [ ] Decision journal
* [ ] Confidence calibration

### UI

* [ ] Trading chart
* [ ] Time & sales
* [ ] Order book
* [ ] AI decision panel
* [ ] Paper portfolio
* [ ] Research dashboard
* [ ] Data integrity status

### Infrastructure

* [ ] Secrets server-side
* [ ] API routes protected
* [ ] WebSocket architecture appropriate for deployment
* [ ] No large ML libraries
* [ ] Deployment <500 MB
* [ ] Automated tests
* [ ] Error handling
* [ ] Logging

---

# 74. MOST IMPORTANT INSTRUCTION TO THE CODING AGENT

Give it this instruction verbatim at the top of the task:

> **Do not optimize for making the UI appear complete. Optimize for making every displayed trading value truthful, traceable, reproducible, and derived from real or explicitly labeled simulated data. If a capability is not implemented with valid data, display it as unavailable rather than fabricating a value. Never hard-code trading performance metrics. Never use random values in Paper or Replay modes. Never allow the LLM to bypass deterministic risk controls. When uncertain, fail closed and return NO_TRADE.**

---

## The target after this fix

The application should be able to show something like:

```text
┌──────────────────────────────────────────────────────────────┐
│ AI QUANT TRADER                         PAPER ●              │
├───────────┬──────────────────────────────┬───────────────────┤
│ WATCHLIST │                              │ AI DECISION       │
│           │                              │                   │
│ BTCUSDT   │          BTCUSDT 15m         │ LONG              │
│ ETHUSDT   │                              │ 82%               │
│ SOLUSDT   │          CANDLE CHART        │                   │
│ XRPUSDT   │                              │ Entry  64,250     │
│           │                              │ Stop   63,800     │
│           │                              │ Target 65,600     │
├───────────┴──────────────────────────────┴───────────────────┤
│ ORDER BOOK       │ TIME & SALES       │ AGENT SIGNALS       │
│                  │                    │                     │
│ LIVE ●           │ LIVE ●             │ Technical   BUY     │
│ Spread 0.01%     │ Buy flow +18%     │ Momentum    BUY     │
│ Imbalance +0.31  │                    │ Liquidity   BUY     │
│                  │                    │ Positioning HOLD    │
├──────────────────────────────────────────────────────────────┤
│ DATA INTEGRITY: 94% ● LIVE                                   │
│ Ticker ●  Trades ●  OrderBook ●  Funding ●  OI ●            │
├──────────────────────────────────────────────────────────────┤
│ PAPER ACCOUNT                                                  │
│ $10,482 Equity │ +$482 P&L │ 4.8% Return │ 2.1% Drawdown    │
└──────────────────────────────────────────────────────────────┘
```

**That is the version I would work toward.**

And importantly, **don't add live-money trading yet**. The immediate objective should be to make the **paper broker + replay engine mathematically trustworthy**, because once those are reliable, you have the foundation to determine whether the AI actually has an edge rather than merely producing impressive-looking signals.
