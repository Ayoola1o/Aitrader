PHASE 7 — REPORTING AND ANALYTICS

Continue from Phases 1–6.

The objective is to create a reliable analytics layer behind the existing Reports UI.

DO NOT redesign the Reports UI unless required.

Do not calculate important performance metrics independently in multiple UI components.

Create a centralized performance/analytics layer.

DATA FLOW:

Trades
+
Orders
+
Executions
+
Positions
+
AI decisions
+
Risk decisions
+
Strategy versions
+
Market regime
↓
Analytics Engine
↓
Reports
↓
Reports UI

PERFORMANCE:

Calculate consistently:

- P&L
- return
- win rate
- profit factor
- expectancy
- Sharpe
- Sortino
- max drawdown
- drawdown duration
- Calmar
- average R
- exposure
- turnover
- fees
- slippage

ATTRIBUTION:

Support attribution by:
- strategy
- strategy version
- symbol
- timeframe
- market regime
- AI provider/model
- long vs short
- risk decision
- execution venue

TRADE ANALYSIS:

Provide:
- best trade
- worst trade
- average trade
- largest win
- largest loss
- consecutive wins
- consecutive losses
- average holding time

DRAWDOWN:

Track:
- current drawdown
- maximum drawdown
- drawdown duration
- recovery time
- recovery factor

AI ANALYTICS:

Where data exists, analyze:
- AI confidence vs outcome
- AI recommendation vs executed trade
- AI-approved vs risk-rejected signals
- model/provider performance

EXECUTION ANALYTICS:

Track:
- expected price
- actual fill
- slippage
- execution latency
- rejected orders
- partial fills

REPORT GENERATION:

Reports should be generated from the centralized analytics layer.

Support appropriate date ranges and filtering.

PERSISTENCE:

Persist generated report metadata where useful.

EXPORT:

Prepare the architecture for:
- CSV
- JSON
- PDF

Do not fabricate metrics if data is unavailable.

IMPORTANT:
All reports must clearly distinguish:
- simulated
- paper
- live

Never mix live and simulated results without explicitly labeling them.

TESTING:

Verify analytics against known datasets with expected results.

Run:
- lint
- TypeScript
- tests
- build

At the end provide:
- analytics architecture
- metrics
- attribution
- report generation
- files changed
- tests
- known limitations