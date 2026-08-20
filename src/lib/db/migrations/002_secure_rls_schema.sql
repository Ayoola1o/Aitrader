-- ==============================================================================
-- AI QUANT TRADER LITE — SUPABASE SECURE RLS & USER ATTRIBUTION MIGRATION 002
-- ==============================================================================

-- 1. Add user_id to all user-owned tables
ALTER TABLE IF EXISTS ai_decisions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS trades ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS positions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS bot_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Multi-Bot Cloud Execution Tables (Fix 13)
CREATE TABLE IF NOT EXISTS bots (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    strategy VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IDLE', -- 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED'
    allocated_capital NUMERIC(18, 2) NOT NULL DEFAULT 1000,
    cycle_interval_seconds INT NOT NULL DEFAULT 30,
    max_drawdown_limit NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_runs (
    id VARCHAR(64) PRIMARY KEY,
    bot_id VARCHAR(64) REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    cycle_count INT NOT NULL DEFAULT 0,
    trades_executed INT NOT NULL DEFAULT 0,
    pnl NUMERIC(18, 8) NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stopped_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bot_events (
    id BIGSERIAL PRIMARY KEY,
    bot_id VARCHAR(64) REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL, -- 'INFO' | 'ACTION' | 'WARN' | 'ERROR'
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Paper Trading State Persistence Tables (Fix 14)
CREATE TABLE IF NOT EXISTS paper_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    initial_balance NUMERIC(18, 2) NOT NULL DEFAULT 100000,
    cash NUMERIC(18, 2) NOT NULL DEFAULT 100000,
    equity NUMERIC(18, 2) NOT NULL DEFAULT 100000,
    margin_used NUMERIC(18, 2) NOT NULL DEFAULT 0,
    buying_power NUMERIC(18, 2) NOT NULL DEFAULT 200000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_equity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    account_id VARCHAR(64) REFERENCES paper_accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    equity NUMERIC(18, 2) NOT NULL,
    drawdown_percent NUMERIC(8, 4) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Secure Row Level Security (RLS) Policies (Remove public USING(true))
DROP POLICY IF EXISTS "Allow public read-write for ai_decisions" ON ai_decisions;
DROP POLICY IF EXISTS "Allow public read-write for trades" ON trades;
DROP POLICY IF EXISTS "Allow public read-write for positions" ON positions;
DROP POLICY IF EXISTS "Allow public read-write for bot_sessions" ON bot_sessions;

ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_equity_snapshots ENABLE ROW LEVEL SECURITY;

-- Strict User Auth Policies (auth.uid() = user_id)
CREATE POLICY "Users can only access their own ai_decisions" ON ai_decisions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own trades" ON trades
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own positions" ON positions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own bot_sessions" ON bot_sessions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own bots" ON bots
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own bot_runs" ON bot_runs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own bot_events" ON bot_events
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own paper_accounts" ON paper_accounts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own paper_equity_snapshots" ON paper_equity_snapshots
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
