PHASE 5 — BACKTESTING AND QUANTITATIVE VALIDATION

Continue from Phases 1–4.

The objective is to make the existing backtesting system quantitatively reliable.

DO NOT focus on visual redesign.

Inspect:
- backtesting engine
- BacktestingView
- strategy execution
- historical data
- feature engine
- AI decision engine
- risk engine
- order simulation
- performance calculations
- reports

EXECUTION MODEL:

Backtesting must simulate:

market data
→ signal
→ order
→ spread
→ slippage
→ fill
→ fees
→ position
→ P&L

Do not assume signal price equals fill price unless explicitly configured.

LOOKAHEAD PREVENTION:

Guarantee that at timestamp T the system cannot access:

- future candles
- future indicators
- future normalization statistics
- future labels
- future order-book information
- future AI inputs

Audit the entire feature-generation pipeline.

DATA:

Validate:
- missing candles
- duplicate candles
- timezone
- market sessions
- bad prices
- corporate actions where relevant

COST MODEL:

Support configurable:
- commissions
- fees
- spread
- slippage

PERFORMANCE METRICS:

Implement/verify:

- initial capital
- final equity
- net P&L
- gross profit
- gross loss
- return %
- win rate
- loss rate
- average win
- average loss
- expectancy
- profit factor
- Sharpe ratio
- Sortino ratio
- max drawdown
- drawdown duration
- Calmar ratio
- average R
- exposure
- turnover
- number of trades
- fees
- slippage

TRADE LOG:

Every simulated trade should record:
- strategy
- strategy version
- entry
- exit
- quantity
- stop
- target
- fees
- slippage
- P&L
- R multiple
- timestamps

WALK-FORWARD:

Add support for:
- training period
- validation period
- out-of-sample period

Avoid optimizing on the entire dataset.

ROBUSTNESS:

Where practical add:
- parameter sensitivity
- Monte Carlo trade-order simulation
- randomized slippage
- randomized execution
- drawdown stress testing

AI:

If AI is used during backtesting, make sure the AI receives only information that would have been available at that historical time.

DETERMINISM:

A backtest with the same:
- dataset
- strategy version
- parameters
- seed

should produce the same result.

TESTING:

Create tests specifically targeting:
- lookahead bias
- fee calculation
- slippage
- position sizing
- stop-loss
- take-profit
- partial fills
- drawdown
- performance metrics
- deterministic replay

Do not claim profitability based only on sample backtests.

At the end provide:
- backtest architecture
- metrics implemented
- anti-lookahead controls
- tests
- known limitations