# PHASE 9 — TELEGRAM COMMAND & CONTROL CENTER

You are continuing work on the existing AI Quant Trading platform.

The application already contains a partial Telegram integration with commands and notification functionality.

DO NOT rebuild the Telegram integration from scratch.

First inspect the entire existing Telegram implementation and integrate it with the existing application architecture.

The objective of this phase is to transform Telegram from a basic notification/command bot into a complete remote command-and-control interface for the AI Quant Trading platform.

IMPORTANT ARCHITECTURAL RULE:

Telegram must NOT have a separate trading implementation.

Telegram commands must call the same backend services used by the web application.

The architecture should become:

Telegram
↓
Telegram Gateway / Command Router
↓
Authentication + Authorization
↓
Trading Control Service
├── Bot Manager
├── Strategy Manager
├── Backtest Engine
├── Market Data Service
├── AI Decision Engine
├── Specialist Agents
├── Risk Engine
├── Execution Engine
├── Portfolio Service
├── Reports/Analytics
└── Alert Service

The web application and Telegram must operate on the same source of truth.

Do not duplicate trading logic inside Telegram handlers.

---

1. AUDIT EXISTING TELEGRAM IMPLEMENTATION

---

Inspect all existing Telegram-related code.

Identify:

* webhook handlers
* polling handlers
* command handlers
* notification services
* Telegram API calls
* bot token configuration
* chat ID configuration
* command parsing
* authorization
* message formatting
* inline keyboards
* callback queries
* error handling

Identify every existing command.

Do not remove existing functionality unless it is unsafe or duplicated.

Document:

* existing commands
* incomplete commands
* duplicate commands
* commands not connected to actual application state
* commands that use mock/static data
* commands that use in-memory state
* commands that bypass BotRuntime
* commands that bypass RiskEngine
* commands that bypass authentication

---

2. TELEGRAM AUTHENTICATION AND AUTHORIZATION

---

Telegram must NOT become an unauthenticated remote control channel.

Implement secure Telegram account authorization.

Map an authorized Telegram user/chat to the correct application user/account.

Validate:

* Telegram user ID
* Telegram chat ID
* application user ID
* authorized account
* command permission

Never allow an arbitrary Telegram user to control the trading system.

Support permission levels where appropriate:

VIEWER
TRADER
BOT_MANAGER
STRATEGY_MANAGER
ADMIN

Sensitive commands must require elevated permissions.

Examples:

VIEWER:

* /status
* /heartbeat
* /balance
* /pnl
* /bots
* /positions
* /trades
* /agents
* /strategies
* /market
* /reports

TRADER:

* start paper bot
* stop paper bot
* cancel paper orders

BOT_MANAGER:

* create bot
* start bot
* stop bot
* restart bot
* configure bot

STRATEGY_MANAGER:

* create strategy
* edit strategy
* backtest strategy
* approve strategy

ADMIN / HIGH PRIVILEGE:

* enable live trading
* emergency stop
* close all
* critical system controls

Never allow destructive commands without authorization.

---

3. SINGLE SOURCE OF TRUTH

---

Telegram must read/write the same persistent state used by the web application.

Do NOT maintain independent Telegram bot state.

For example:

Web UI:
→ BotRuntime
→ Supabase

Telegram:
→ Bot Control Service
→ BotRuntime
→ Supabase

Both must see the same:

* bots
* strategies
* positions
* orders
* trades
* AI decisions
* risk decisions
* reports
* account balances
* P&L

If the web dashboard says a bot is RUNNING, Telegram must show RUNNING.

If Telegram stops a bot, the web dashboard must immediately reflect STOPPED.

---

4. COMMAND SYSTEM

---

Implement a centralized command router.

Commands should be structured rather than implemented as scattered if/else blocks.

Example:

/status
/heartbeat
/dashboard
/balance
/pnl
/bots
/bot <name>
/startbot <name>
/stopbot <name>
/restartbot <name>
/createbot
/deletebot <name>
/positions
/orders
/trades
/trade <id>
/market <symbol>
/strategies
/strategy <name>
/createstrategy
/backtest
/reports
/report <id>
/agents
/agent <name>
/risk
/settings
/alerts
/notifications
/help

Also support aliases where useful.

---

5. /STATUS

---

Create a comprehensive system status response.

Include:

* system status
* trading mode
* broker connection
* market data connection
* AI provider status
* risk engine status
* bot worker status
* Telegram status
* kill switch status
* active bot count
* open position count
* pending order count
* current account equity
* available buying power
* today's P&L
* total P&L
* last trading cycle
* last decision
* system latency where available

Example structure:

AI QUANT TRADER

System: ONLINE
Broker: CONNECTED
Market Data: CONNECTED
AI: ONLINE
Risk Engine: ARMED
Kill Switch: OFF

Active Bots: 4
Positions: 6
Orders: 2

Today's P&L: +$482.18
Equity: $25,842.12

Last Cycle: 16:31:08

Do not fabricate unavailable values.

---

6. /HEARTBEAT

---

Implement a meaningful heartbeat.

Include:

* worker health
* API health
* database health
* broker health
* market data health
* AI health
* risk engine health
* Telegram health
* active bot count
* last cycle timestamp
* last successful trade cycle
* error count
* latency where available

Support:

/heartbeat

and optionally:

/heartbeat full

Return clear HEALTHY / DEGRADED / DOWN states.

---

7. BOT MANAGEMENT

---

Implement complete bot management from Telegram.

Commands:

/bots
/bot <name>
/createbot
/startbot <name>
/stopbot <name>
/restartbot <name>
/deletebot <name>

Do not duplicate BotRuntime logic.

---

8. /BOTS

---

Return all bots.

For each bot show:

* name
* status
* mode
* strategy
* symbol
* timeframe
* P&L
* current position
* last cycle
* AI status
* risk status

Use compact Telegram formatting.

Provide inline buttons where practical:

[VIEW]
[START]
[STOP]
[RESTART]

---

9. BOT DETAILS

---

For:

/bot BTC Scalper

return:

* bot status
* mode
* strategy
* strategy version
* symbol
* timeframe
* start time
* today's P&L
* total P&L
* trade count
* win rate
* profit factor
* max drawdown
* current position
* entry price
* current price
* unrealized P&L
* AI confidence
* latest decision
* risk decision
* latest execution
* last heartbeat

Provide appropriate actions:

[START]
[STOP]
[RESTART]
[TRADES]
[PERFORMANCE]
[LOGS]

---

10. CREATE BOT WORKFLOW

---

Implement conversational bot creation.

Support:

/createbot

The bot should guide the user through:

1. Bot name
2. Strategy
3. Symbol
4. Timeframe
5. Trading mode
6. Capital
7. Risk per trade
8. Stop loss
9. Take profit
10. AI configuration
11. Confirmation

Show a final configuration summary before creation.

Example:

BOT CONFIGURATION

Name: BTC Scalper
Strategy: BTC Quant Core
Symbol: BTC/USD
Timeframe: 5m
Mode: PAPER
Capital: $10,000
Risk: 1%

[CONFIRM]
[CANCEL]

Do not create the bot until the user confirms.

LIVE bots must require additional explicit confirmation.

Never create a LIVE bot accidentally.

---

11. START / STOP / RESTART BOT

---

Implement:

/startbot <name>
/stopbot <name>
/restartbot <name>

These must call the same BotRuntime/Control Service used by the web application.

When stopped, verify that the bot actually stopped.

When started, verify that the bot actually entered RUNNING state.

Return confirmation with:

* bot
* mode
* strategy
* timestamp
* current health

---

12. STRATEGY MANAGEMENT

---

Implement:

/strategies
/strategy <name>
/createstrategy

Strategy information should include:

* name
* description
* version
* status
* symbols
* timeframe
* risk
* latest backtest
* paper performance
* live performance
* deployment status

---

13. CONVERSATIONAL STRATEGY CREATION

---

Allow the user to request:

/createstrategy

Then provide a conversational workflow.

Support natural-language requests such as:

"Create a BTC momentum strategy using EMA crossover, RSI, volume and market regime."

Pass the request into the existing strategy creation architecture.

Do not create a separate Telegram strategy engine.

Generate a draft strategy.

Show the generated configuration.

Require confirmation before persistence.

Default new strategies to DRAFT.

Do not automatically make strategies LIVE.

---

14. BACKTEST COMMAND

---

Implement conversational backtesting.

Support:

/backtest

/backtest <strategy>

/backtest <strategy> <symbol>

The workflow should collect or confirm:

* strategy
* strategy version
* symbol
* timeframe
* start date
* end date
* starting capital
* fees
* slippage
* risk configuration

Show a confirmation message.

Then execute the existing backtesting engine.

Do not create a separate backtesting implementation.

---

15. BACKTEST RESULTS

---

Return:

BACKTEST COMPLETE

Strategy:
BTC Momentum v1.2

Return:
+24.8%

P&L:
+$2,480

Win Rate:
61.4%

Profit Factor:
1.92

Sharpe:
1.67

Max Drawdown:
-8.4%

Trades:
183

Average R:
+0.42

Fees:
$184

Slippage:
$91

Provide buttons:

[VIEW REPORT]
[RUN AGAIN]
[PAPER TEST]
[CREATE BOT]

Never offer LIVE deployment directly from a backtest without passing strategy lifecycle validation.

---

16. BALANCE

---

Implement:

/balance

Return broker/account information:

* equity
* cash
* buying power
* portfolio value
* unrealized P&L
* realized P&L
* day P&L
* margin where applicable

Clearly distinguish:
PAPER
LIVE

Never confuse paper and live account balances.

---

17. P&L

---

Implement:

/pnl

Support:

/pnl today
/pnl week
/pnl month
/pnl all

Return:

* realized P&L
* unrealized P&L
* total P&L
* return %
* number of trades
* win rate
* largest win
* largest loss
* drawdown

Allow filtering by bot and strategy.

---

18. POSITIONS

---

Implement:

/positions

For each position show:

* symbol
* side
* quantity
* entry
* current price
* unrealized P&L
* stop
* target
* bot
* strategy
* risk status

Provide a detailed position command.

---

19. ORDERS

---

Implement:

/orders

and:

/order <id>

Show:

* symbol
* side
* quantity
* order type
* requested price
* fill price
* status
* broker order ID
* bot
* strategy
* timestamps

Support safe cancellation where authorized.

---

20. TRADES

---

Implement:

/trades

Support:

/trades today
/trades week
/trades bot <name>
/trades strategy <name>

Show:

* symbol
* side
* entry
* exit
* P&L
* R multiple
* strategy
* bot
* timestamp

---

21. TRADE DETAILS

---

For:

/trade <id>

show the complete trade trace:

Trade
→ Order
→ Execution
→ Risk decision
→ AI decision
→ Strategy
→ Strategy version
→ Market context

This should make Telegram useful for auditing why a trade happened.

---

22. AGENTS

---

Implement:

/agents

and:

/agent <name>

Show specialist AI agents such as:

* Technical Agent
* Regime Agent
* Sentiment Agent
* Risk Agent
* Execution Agent
* News Agent
* other existing agents

For each agent show:

* status
* latest decision
* confidence
* timestamp
* current contribution
* recent errors if any

Do not expose private API keys or sensitive prompts.

---

23. AI DECISION INSPECTION

---

Implement a command such as:

/decision
/decision latest
/decision <id>

Return:

* symbol
* action
* confidence
* strategy
* AI provider
* specialist agent outputs
* fusion result
* risk decision
* execution decision

Clearly distinguish:

AI recommendation

from:

FINAL RISK DECISION

The AI must never appear to bypass deterministic risk controls.

---

24. MARKET COMMAND

---

Implement:

/market BTC
/market BTC/USD

Return:

* price
* change
* volume
* bid
* ask
* spread
* market status
* data quality
* last update

Where supported, include concise market regime information.

---

25. REPORTS

---

Implement:

/reports

Show recent reports.

Support:

/report <id>

Reports should include:

* P&L
* return
* win rate
* profit factor
* Sharpe
* Sortino
* max drawdown
* exposure
* strategy performance
* bot performance
* AI performance
* execution performance

Where possible provide a link/reference to the web report.

Do not fabricate report URLs.

---

26. BOT PERFORMANCE

---

Implement detailed performance commands:

/performance
/performance bot <name>
/performance strategy <name>

Return:

* P&L
* return
* win rate
* profit factor
* Sharpe
* Sortino
* max drawdown
* trades
* average win
* average loss
* expectancy
* average R
* exposure
* fees
* slippage

---

27. RISK COMMAND

---

Implement:

/risk

Return:

* risk per trade
* current exposure
* maximum exposure
* daily loss
* daily loss limit
* drawdown
* drawdown limit
* open positions
* risk engine status
* kill switch state

If a risk limit is close to being breached, clearly flag it.

---

28. ALERTS

---

Implement:

/alerts

Return recent:

* broker failures
* bot failures
* risk violations
* market-data problems
* strategy errors
* execution errors
* system errors

Support severity:

INFO
WARNING
CRITICAL

---

29. EMERGENCY CONTROLS

---

Existing destructive commands such as:

/panic
/closeall

must be secured.

Require explicit confirmation.

Example:

⚠️ EMERGENCY ACTION

This will close all eligible positions.

Account:
PAPER

Positions:
6

Continue?

[CONFIRM CLOSE ALL]
[CANCEL]

Never execute destructive actions from a single accidental message.

LIVE emergency actions require elevated authorization.

---

30. TELEGRAM INLINE KEYBOARDS

---

Where practical, use Telegram inline keyboards rather than forcing users to type every command.

Examples:

BOTS
[View] [Start] [Stop]

BOT DETAILS
[Trades] [Performance] [Logs] [Stop]

STRATEGY
[Backtest] [View] [Paper Test]

BACKTEST
[View Report] [Run Again]

STATUS
[Dashboard] [Bots] [Positions] [P&L]

---

31. NATURAL LANGUAGE COMMANDS

---

Where practical, support natural-language requests.

Examples:

"Show my active bots."

"What is my P&L today?"

"How is BTC Scalper performing?"

"Stop BTC Scalper."

"Show me my open positions."

"Backtest BTC Momentum for the last 90 days."

"Create a paper bot using BTC Momentum."

"Why did the BTC bot buy?"

"Show me the latest AI decision."

"Which strategy is performing best?"

"Show today's trades."

Do not allow natural-language interpretation to bypass authorization or safety checks.

For destructive actions, require explicit confirmation.

---

32. TELEGRAM NOTIFICATIONS

---

The system should proactively send notifications for important events.

Examples:

BOT STARTED
BOT STOPPED
BOT ERROR
TRADE OPENED
TRADE CLOSED
ORDER FILLED
ORDER REJECTED
RISK BLOCKED
DRAWDOWN WARNING
KILL SWITCH ACTIVATED
BROKER DISCONNECTED
MARKET DATA DEGRADED
AI ERROR
BACKTEST COMPLETED
STRATEGY VALIDATED
STRATEGY SUSPENDED

Allow users to configure notification preferences.

---

33. HEARTBEAT NOTIFICATIONS

---

Implement optional periodic heartbeat notifications.

Example:

💓 SYSTEM HEARTBEAT

Status: HEALTHY

Bots: 4 running
Positions: 6
Today's P&L: +$482.18

Broker: CONNECTED
Market Data: HEALTHY
AI: ONLINE
Risk: ARMED

Last Cycle:
16:31:08

Do not send excessive heartbeat messages.

Allow configurable intervals.

---

34. MESSAGE FORMATTING

---

Create reusable Telegram formatting utilities.

Do not manually build inconsistent messages in every handler.

Standardize:

* currency
* percentage
* P&L
* timestamps
* status icons
* error messages
* bot summaries
* trade summaries
* reports

Messages must remain readable on mobile.

---

35. ERROR HANDLING

---

Telegram must gracefully handle:

* unknown command
* invalid bot
* invalid strategy
* unauthorized user
* broker disconnected
* AI unavailable
* market data unavailable
* backtest failure
* database failure
* bot failure
* invalid parameters

Return useful error messages.

Never expose:

* stack traces
* secrets
* API keys
* internal credentials

---

36. SECURITY

---

Ensure:

* Telegram token is server-side only
* Telegram authorization is enforced
* user/chat ownership is enforced
* destructive commands require confirmation
* live trading requires explicit authorization
* secrets are never logged
* Telegram cannot bypass RiskEngine
* Telegram cannot bypass TradingModeManager
* Telegram cannot directly call broker credentials
* Telegram cannot directly manipulate database records outside authorized services

---

37. WEB + TELEGRAM SYNCHRONIZATION

---

Verify the following:

If bot is started from Telegram:
→ web dashboard updates.

If bot is stopped from web:
→ Telegram sees STOPPED.

If a trade happens:
→ Telegram can retrieve it.

If a position changes:
→ Telegram reflects it.

If P&L changes:
→ Telegram reflects it.

If risk blocks a trade:
→ Telegram can report why.

If kill switch activates:
→ Telegram reports it.

---

38. TESTING

---

Create automated tests for:

* Telegram authentication
* authorization
* command routing
* bot creation
* bot start
* bot stop
* strategy creation
* backtest requests
* balance
* P&L
* positions
* trades
* reports
* agents
* heartbeat
* alerts
* kill switch
* close all confirmation
* natural language commands
* Telegram/web synchronization

Mock Telegram API calls during tests.

DO NOT place real trades.

DO NOT enable live trading during tests.

---

39. FINAL ACCEPTANCE CRITERIA

---

The implementation is complete only when a properly authorized user can use Telegram as a genuine remote interface to the trading platform.

At minimum, I must be able to:

✓ See system status
✓ See heartbeat
✓ See account balance
✓ See P&L
✓ See active bots
✓ View bot details
✓ Start bots
✓ Stop bots
✓ Restart bots
✓ Create paper bots
✓ Configure bots
✓ View strategies
✓ Create strategy drafts
✓ Request backtests
✓ Receive backtest results
✓ View reports
✓ View positions
✓ View orders
✓ View trades
✓ View trade details
✓ View AI agents
✓ View agent decisions
✓ View AI decisions
✓ View risk status
✓ View market data
✓ Receive trade notifications
✓ Receive bot notifications
✓ Receive risk alerts
✓ Receive system alerts
✓ Use emergency controls safely
✓ Ask natural-language questions
✓ Receive useful responses
✓ Have Telegram and the web application reflect the same state

The system must remain secure and must never allow Telegram to bypass authentication, authorization, deterministic risk controls, broker safeguards, or live-trading confirmation.

---

40. FINAL REPORT

---

At the end of this phase provide:

1. Existing Telegram functionality discovered
2. Inconsistencies found
3. Commands implemented
4. Commands modified
5. New services created
6. Database changes
7. Authentication changes
8. Authorization changes
9. Notification system changes
10. Bot-control changes
11. Strategy-control changes
12. Backtest integration
13. Report integration
14. AI-agent integration
15. Risk integration
16. Emergency-control implementation
17. Tests created
18. Tests passed
19. Tests failed
20. Build result
21. Remaining limitations
22. Manual configuration required
23. Example Telegram command list
24. Confirmation that Telegram and the web application use the same source of truth

Do not claim functionality is complete unless it has actually been implemented and tested.

Do not enable real-money LIVE trading automatically.

Do not place real trades.
