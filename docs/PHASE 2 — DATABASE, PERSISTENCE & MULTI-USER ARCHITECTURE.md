PHASE 2 — DATABASE, PERSISTENCE AND MULTI-USER ARCHITECTURE

Continue from the existing AI Quant Trading project and from the completed Phase 1 security work.

DO NOT rebuild the application.

The objective of this phase is to make Supabase the reliable source of truth for user-specific application and trading state.

FIRST:
Inspect the existing Supabase schema, migrations, queries, types, authentication implementation and persistence code.

Identify what already exists before creating anything.

USER ISOLATION:
Every user-owned resource must be associated with the authenticated user.

Review and implement ownership for resources such as:

- users/profiles
- settings
- broker connections
- strategies
- strategy versions
- bots
- bot sessions
- trades
- orders
- executions
- positions
- AI decisions
- risk decisions
- backtests
- reports
- alerts
- journal entries
- notifications
- audit records

Use user_id or the existing appropriate ownership mechanism.

ROW LEVEL SECURITY:
Implement proper Supabase RLS policies.

Rules must ensure:

User A cannot:
- read User B's trades
- read User B's strategies
- read User B's reports
- read User B's broker credentials
- modify User B's bot
- modify User B's settings
- access User B's journal
- access User B's AI decisions

Service-role/server operations should only bypass RLS where explicitly required.

SETTINGS:
Move important application settings from browser-only localStorage into persistent server-side storage.

Settings should support categories such as:

- risk
- execution
- AI
- broker
- notifications
- trading mode
- safety
- system preferences

The UI should remain compatible with the existing design.

BROKER CREDENTIALS:
Design secure server-side storage for broker credentials.

Never expose raw broker secrets back to the browser.

The frontend should receive safe connection status such as:

Connected
Disconnected
Invalid credentials
Paper account
Live account

BOT STATE:
Move bot state out of in-memory server variables.

Bot state must survive:
- server restart
- deployment
- multiple server instances
- serverless invocation boundaries

Persist:
- bot status
- mode
- strategy
- start/stop state
- last cycle
- last decision
- errors
- heartbeat
- timestamps

ORDERS:
Create/standardize persistent order records.

Include appropriate fields for:
- user
- broker
- account
- strategy
- strategy version
- order ID
- client order ID
- symbol
- side
- quantity
- order type
- status
- timestamps
- requested price
- filled price
- fees where available

EXECUTIONS:
Persist fills/executions separately from orders where appropriate.

POSITIONS:
Maintain a persistent position model but do not treat it as more authoritative than the broker during reconciliation.

AI DECISIONS:
Persist:
- decision
- confidence
- strategy
- model/provider
- timestamp
- market context
- risk decision
- execution outcome

AUDIT:
Persist security-sensitive trading actions.

DATABASE MIGRATIONS:
Use proper migration files rather than manually changing production tables without migrations.

TYPES:
Regenerate/update TypeScript database types if the project uses generated Supabase types.

IMPORTANT:
Do not destroy existing production data.
Do not drop tables merely to make migrations easier.
Use additive migrations wherever possible.

TESTING:
Verify:
- user isolation
- RLS
- persistence after restart
- bot state persistence
- settings persistence
- trade persistence
- order persistence
- AI decision persistence

Run:
- lint
- TypeScript
- tests
- production build

At the end provide:
- database schema changes
- migrations created
- RLS policies
- files changed
- tests
- remaining database risks