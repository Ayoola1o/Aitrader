# AI Quant Trader — Production Architecture, Deployment & Disaster Recovery

## 1. System Topology & Separation of Concerns

To ensure stability, resilience, and execution isolation, the system separates the user-facing web tier, the background trading daemon, the cloud database, and periodic scheduled triggers.

```
┌────────────────────────────────────────────────────────┐
│               1. WEB FRONTEND & API TIER               │
│                  (Vercel / Next.js)                    │
│  - User Interface & Interactive Dashboards            │
│  - Auth Verification & Session JWT Validation          │
│  - Serverless API Routes (/api/alpaca, /api/settings)  │
│  - In-Memory Sliding-Window Rate Limiting             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               2. DATABASE & PERSISTENCE                │
│                 (Supabase PostgreSQL)                  │
│  - Row Level Security (RLS) on all user-owned tables   │
│  - Authoritative Paper & Live Ledgers                  │
│  - Multi-Bot State, Settings, & AI Decision Journals   │
│  - Point-in-Time Recovery & Automated Daily Backups   │
└──────────────────────────▲─────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────┐
│              3. BACKGROUND TRADING DAEMON              │
│                (Render / Node.js Worker)               │
│  - Continuous Multi-Bot Polling & Execution Cycles     │
│  - Distributed Bot Locking (BotLockManager)            │
│  - Real-Time WebSocket Feeds (Binance / Alpaca)        │
│  - Telegram Command & Control Daemon                   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### A. Web Application & API Layer (Vercel)
- **Framework**: Next.js 14 (App Router).
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `ALPACA_PAPER`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - `CRON_SECRET`
- **Security**: Rate limiting on all routes, authentication via Supabase JWT Bearer tokens, secret sanitization in audit logs.

### B. Trading Worker Daemon (Render)
- **Runtime**: Node.js background worker (`scripts/telegram-daemon.mjs` or dedicated runner).
- **Restart Policy**: `on-failure` with exponential backoff.
- **State Recovery**: Reads persisted bot session states from `bot_sessions` in Supabase upon startup.

### C. Database & Row Level Security (Supabase)
- **Migrations Applied**:
  - `003_paper_ledger_and_multibot_schema.sql`
  - `004_phase2_multiuser_rls_and_persistence.sql`
  - `005_phase6_strategy_lifecycle_and_versioning.sql`
- **Isolation**: Every table is guarded with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` where `auth.uid() = user_id`.

---

## 3. Disaster Recovery & Emergency Playbooks

### Playbook 1: Global Emergency Kill Switch
1. **Trigger**: Send authenticated `POST /api/trading/kill-switch` with `{ "active": true, "reason": "Emergency Stop" }` or invoke Telegram `/kill`.
2. **Automated Action**:
   - Sets server-side kill switch to active.
   - Updates all `bot_sessions` with status `PAUSED`.
   - Rejects all subsequent order submissions across all routes with `NO_TRADE`.
   - Records an immutable security audit event in `audit_logs`.

### Playbook 2: Credential Rotation (Alpaca / Supabase / Telegram)
1. Generate new API credentials in the respective broker/provider dashboard.
2. Update the environment variables in Vercel and Render project settings.
3. Trigger a zero-downtime redeployment.
4. Old credentials in user browsers are purged automatically by `localStorage.removeItem(...)` in `SettingsView.tsx`.

### Playbook 3: Broker Disconnection / Network Partition
1. `DataQualityEngine` detects lost ticker/orderbook heartbeat ($> 25\text{s}$).
2. Quality drops to `STALE` $\rightarrow$ `BotRuntime` fail-closed safety gate triggers and pauses order placement.
3. Once network re-establishes, `BrokerReconciliationService` automatically verifies positions against the internal ledger before trading resumes.

---

## 4. Production Checklist
- [x] Strict Row Level Security enabled on all tables.
- [x] Zero API keys or secrets in source code or `localStorage`.
- [x] Distributed bot locking prevents overlapping cron cycles.
- [x] Fail-closed safety gates prevent accidental LIVE order execution.
- [x] Comprehensive test suites pass 100% across all 8 phases.
