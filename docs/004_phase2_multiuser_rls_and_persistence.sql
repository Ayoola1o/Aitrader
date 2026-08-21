-- ==============================================================================
-- AI QUANT TRADER — PHASE 2 DATABASE, PERSISTENCE & MULTI-USER ARCHITECTURE
-- Additive PostgreSQL Schema Migration with Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. User Profiles & Roles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'TRADER' CHECK (role IN ('TRADER', 'QUANT', 'ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. User Settings (Categorized Persistent Server Storage) ──────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  risk_settings JSONB NOT NULL DEFAULT '{
    "maxRisk": 0.5,
    "maxDrawdown": 5.0,
    "minRR": 2.0,
    "killSwitch": false,
    "confidenceThreshold": 0.68,
    "startingBalance": 100000.0
  }'::jsonb,
  execution_settings JSONB NOT NULL DEFAULT '{
    "orderType": "MARKET",
    "slippageTolerance": 0.05,
    "routingPreference": "SMART_ROUTING",
    "extendedHours": false
  }'::jsonb,
  ai_settings JSONB NOT NULL DEFAULT '{
    "provider": "mock",
    "model": "gemini-2.5-pro",
    "temperature": 0.2,
    "optimizationMode": "CANDIDATE_ENTRIES"
  }'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{
    "telegramEnabled": false,
    "chatId": "",
    "notifyTrades": true,
    "notifyRiskAlerts": true,
    "notifyHeartbeat": true
  }'::jsonb,
  trading_mode_settings JSONB NOT NULL DEFAULT '{
    "defaultMode": "PAPER",
    "autoRebalance": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Broker Connections (Safe Status & Server-Side Storage) ─────────────────
CREATE TABLE IF NOT EXISTS public.broker_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  broker_name TEXT NOT NULL DEFAULT 'ALPACA' CHECK (broker_name IN ('ALPACA', 'BINANCE', 'HYPERLIQUID')),
  account_type TEXT NOT NULL DEFAULT 'PAPER' CHECK (account_type IN ('PAPER', 'LIVE')),
  connection_status TEXT NOT NULL DEFAULT 'DISCONNECTED' CHECK (connection_status IN ('CONNECTED', 'DISCONNECTED', 'INVALID_CREDENTIALS', 'ERROR')),
  account_number TEXT,
  buying_power NUMERIC DEFAULT 0.0,
  cash_balance NUMERIC DEFAULT 0.0,
  currency TEXT DEFAULT 'USD',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Bot Sessions & Telemetry (Survives Restarts & Serverless Boundaries) ───
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0',
  strategy_name TEXT NOT NULL DEFAULT 'AI Quant Core',
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'PAUSED', 'STOPPED', 'ERROR')),
  allocated_capital NUMERIC NOT NULL DEFAULT 5000.0,
  cycle_interval_seconds INT NOT NULL DEFAULT 30,
  cycles_completed INT NOT NULL DEFAULT 0,
  trades_executed INT NOT NULL DEFAULT 0,
  running_pnl NUMERIC NOT NULL DEFAULT 0.0,
  daily_pnl NUMERIC NOT NULL DEFAULT 0.0,
  final_pnl NUMERIC NOT NULL DEFAULT 0.0,
  win_rate TEXT DEFAULT '—',
  last_action TEXT,
  last_decision_action TEXT,
  last_decision_confidence NUMERIC,
  last_cycle_timestamp BIGINT,
  consecutive_no_trades INT DEFAULT 0,
  consecutive_losses INT DEFAULT 0,
  current_price NUMERIC DEFAULT 0.0,
  error_message TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_id column if table already existed from Phase 3 without user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bot_sessions' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.bot_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Bot Runs Audit Log
CREATE TABLE IF NOT EXISTS public.bot_runs (
  run_id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.bot_sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  regime TEXT,
  dominant_action TEXT,
  confidence NUMERIC,
  trade_executed BOOLEAN DEFAULT FALSE,
  pnl_delta NUMERIC DEFAULT 0.0,
  log_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Standardized Paper Ledger Tables with user_id ──────────────────────────
CREATE TABLE IF NOT EXISTS public.paper_accounts (
  account_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cash NUMERIC NOT NULL DEFAULT 100000.00,
  equity NUMERIC NOT NULL DEFAULT 100000.00,
  peak_equity NUMERIC NOT NULL DEFAULT 100000.00,
  daily_pnl NUMERIC NOT NULL DEFAULT 0.00,
  total_fees NUMERIC NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='paper_accounts' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.paper_accounts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.paper_orders (
  order_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  bot_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  type TEXT NOT NULL DEFAULT 'MARKET',
  price NUMERIC NOT NULL,
  size NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'FILLED',
  stop_loss NUMERIC,
  take_profit NUMERIC,
  decision_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='paper_orders' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.paper_orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.paper_positions (
  position_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  bot_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  size NUMERIC NOT NULL,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  unrealized_pnl NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl_percent NUMERIC NOT NULL DEFAULT 0,
  opened_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='paper_positions' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.paper_positions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.paper_trades (
  trade_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  bot_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  size NUMERIC NOT NULL,
  realized_pnl NUMERIC NOT NULL,
  realized_pnl_percent NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  slippage NUMERIC NOT NULL DEFAULT 0,
  close_reason TEXT NOT NULL,
  opened_at BIGINT NOT NULL,
  closed_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='paper_trades' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.paper_trades ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 6. AI Decision Journal Persistence ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_decisions (
  decision_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id TEXT,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  regime TEXT NOT NULL,
  dominant_action TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  position_size NUMERIC,
  risk_reward NUMERIC,
  reasoning JSONB DEFAULT '[]'::jsonb,
  invalidation JSONB DEFAULT '[]'::jsonb,
  agent_signals JSONB DEFAULT '[]'::jsonb,
  fusion_scores JSONB DEFAULT '{}'::jsonb,
  risk_approved BOOLEAN DEFAULT TRUE,
  risk_failed_gates JSONB DEFAULT '[]'::jsonb,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. Security Audit Logs Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'WARNING')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ── ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────────
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage own broker connection" ON public.broker_connections;
DROP POLICY IF EXISTS "Users can manage own bot sessions" ON public.bot_sessions;
DROP POLICY IF EXISTS "Users can view own bot runs" ON public.bot_runs;
DROP POLICY IF EXISTS "Users can manage own paper accounts" ON public.paper_accounts;
DROP POLICY IF EXISTS "Users can manage own paper orders" ON public.paper_orders;
DROP POLICY IF EXISTS "Users can manage own paper positions" ON public.paper_positions;
DROP POLICY IF EXISTS "Users can manage own paper trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Users can manage own ai decisions" ON public.ai_decisions;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;

-- Service Role Bypass Policies (For background cloud workers)
DROP POLICY IF EXISTS "Service role full access user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role full access user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Service role full access broker_connections" ON public.broker_connections;
DROP POLICY IF EXISTS "Service role full access bot_sessions" ON public.bot_sessions;
DROP POLICY IF EXISTS "Service role full access bot_runs" ON public.bot_runs;
DROP POLICY IF EXISTS "Service role full access paper_accounts" ON public.paper_accounts;
DROP POLICY IF EXISTS "Service role full access paper_orders" ON public.paper_orders;
DROP POLICY IF EXISTS "Service role full access paper_positions" ON public.paper_positions;
DROP POLICY IF EXISTS "Service role full access paper_trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Service role full access ai_decisions" ON public.ai_decisions;
DROP POLICY IF EXISTS "Service role full access audit_logs" ON public.audit_logs;

-- 3. Create User Isolation RLS Policies
CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own broker connection" ON public.broker_connections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own bot sessions" ON public.bot_sessions FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own bot runs" ON public.bot_runs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own paper accounts" ON public.paper_accounts FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own paper orders" ON public.paper_orders FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own paper positions" ON public.paper_positions FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own paper trades" ON public.paper_trades FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own ai decisions" ON public.ai_decisions FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- 4. Create Service Role Full Access Policies (Bypasses for server background execution)
CREATE POLICY "Service role full access user_profiles" ON public.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access user_settings" ON public.user_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access broker_connections" ON public.broker_connections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access bot_sessions" ON public.bot_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access bot_runs" ON public.bot_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access paper_accounts" ON public.paper_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access paper_orders" ON public.paper_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access paper_positions" ON public.paper_positions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access paper_trades" ON public.paper_trades FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ai_decisions" ON public.ai_decisions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
