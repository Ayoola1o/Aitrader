PHASE 6 — STRATEGY LIFECYCLE AND VERSIONING

Continue from Phases 1–5.

The objective is to turn the existing strategy system into a controlled strategy lifecycle.

DO NOT rebuild the existing Strategy UI unless necessary.

Inspect:
- strategies
- strategy creation
- strategy editor
- strategy configuration
- strategy execution
- backtesting
- bot runtime
- reports
- database schema

STRATEGY LIFECYCLE:

Implement:

DRAFT
↓
VALIDATED
↓
BACKTESTED
↓
WALK_FORWARD_TESTED
↓
PAPER_APPROVED
↓
LIVE_ELIGIBLE
↓
LIVE
↓
SUSPENDED
↓
RETIRED

A strategy must not automatically become LIVE immediately after creation.

VERSIONING:

Every strategy change creates a version.

Example:

Strategy:
BTC Quant Core

Versions:
v1.0
v1.1
v1.2
v2.0

Never silently modify a strategy version that has already been used for trading.

TRADE TRACEABILITY:

Every trade/order/decision must record:

- strategy_id
- strategy_version
- model/provider version where applicable
- risk configuration version
- decision ID

DECISION TRACEABILITY:

A user should be able to start with a trade and trace backward:

Trade
→ Order
→ Risk decision
→ AI decision
→ Strategy version
→ Market context

VALIDATION:

A strategy should have validation requirements before live eligibility.

Possible requirements:
- valid configuration
- successful backtest
- acceptable risk profile
- sufficient number of trades
- out-of-sample test
- paper-trading period
- no critical risk violations

STRATEGY DEPLOYMENT:

Implement clear states for:
- enabled
- disabled
- paper
- live
- suspended

A suspended strategy must not generate new live orders.

STRATEGY PERFORMANCE:

Track performance by:
- strategy
- strategy version
- symbol
- timeframe
- market regime

DATABASE:

Persist strategy definitions and versions.

Do not overwrite historical strategy definitions.

UI:

Expose lifecycle status clearly in the existing UI.

Do not introduce unnecessary redesign.

TESTING:

Test:
- version creation
- version immutability
- lifecycle transitions
- live eligibility
- suspended strategies
- trade/version traceability

Run:
- lint
- TypeScript
- tests
- build

At the end provide:
- strategy lifecycle
- database changes
- versioning implementation
- files changed
- tests
- remaining limitations