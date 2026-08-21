PHASE 3 — TRADING ENGINE & EXECUTION SAFETY 🔴PHASE 3 — TRADING ENGINE AND EXECUTION SAFETY

Continue from Phases 1 and 2.

DO NOT rebuild the trading engine.

Inspect the existing:
- BotRuntime
- BotScheduler
- TradingModeManager
- RiskEngine
- PositionSizing
- PaperBroker
- AlpacaBroker
- order routes
- position routes
- market data
- execution logic
- kill switch
- Supabase persistence

The goal is to make trading execution deterministic, safe, persistent and production-grade.

TRADING MODES:
Clearly separate:

DEMO
REPLAY
PAPER
LIVE

No LIVE execution should happen accidentally.

Implement explicit mode validation.

LIVE trading must require:
- authenticated user
- authorized trading account
- valid broker connection
- explicit live trading enablement
- risk configuration
- healthy market data
- kill switch disabled
- all safety checks passing

RISK:
The deterministic Risk Engine must remain the final authority.

AI must never bypass risk controls.

For LIVE mode, risk calculations must use actual broker/account state:
- equity
- buying power
- open positions
- exposure
- available cash
- existing orders

Do not use the PaperBroker portfolio for LIVE risk calculations.

KILL SWITCH:
Implement a server-side kill switch.

When activated:
- prevent new orders
- stop automated trading
- mark affected bots as halted
- generate an audit record
- generate an alert

If the application already supports emergency position closure, keep it explicit and separately authorized.

BOT LOCK:
Prevent multiple bot cycles from running simultaneously.

Implement a distributed lock using persistent storage.

A cycle must not execute twice simply because:
- cron overlaps
- serverless instances overlap
- network retries occur

IDEMPOTENCY:
Implement client order IDs/idempotency protection.

A retry must not accidentally create duplicate orders.

ORDER STATE MACHINE:
Implement reliable order lifecycle handling:

CREATED
SUBMITTED
ACKNOWLEDGED
PARTIALLY_FILLED
FILLED
CANCEL_PENDING
CANCELLED
REJECTED
FAILED

Persist transitions.

BROKER RECONCILIATION:
Create a reconciliation process comparing:
- internal orders
- internal positions
- broker orders
- broker positions

If there is a critical mismatch:
- stop automated trading
- record the mismatch
- alert the user

PARTIAL FILLS:
Handle partial fills correctly.

Do not assume:
requested quantity == filled quantity.

SLIPPAGE:
Track requested price versus actual execution price.

FAILURE HANDLING:
Handle:
- broker timeout
- broker rejection
- network failure
- malformed broker response
- stale market data
- disconnected broker
- insufficient buying power
- invalid order
- duplicate order

LIVE SAFETY:
Do not enable automatic live trading by default.

The user must explicitly enable it.

TESTING:
Build comprehensive tests for:
- risk limits
- position sizing
- duplicate order prevention
- partial fills
- broker failures
- reconciliation
- kill switch
- mode separation
- concurrent bot cycles

Do not place real trades during testing.

Run:
- lint
- TypeScript
- tests
- production build

At the end provide:
- execution architecture
- files changed
- safety controls added
- tests performed
- known limitations