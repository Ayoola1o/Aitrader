-- ==============================================================================
-- AI QUANT TRADER LITE — SUPABASE / POSTGRESQL SCHEMA MIGRATION 001
-- ==============================================================================

-- 1. AI Decision Audit Journal (Stores all multi-agent & LLM decisions with evidence)
CREATE TABLE IF NOT EXISTS ai_decisions (
    id BIGSERIAL PRIMARY KEY,
    decision_id VARCHAR(64) UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(20) NOT NULL,
    price NUMERIC(18, 8) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'BUY' | 'SELL' | 'HOLD' | 'NO_TRADE'
    confidence NUMERIC(5, 4) NOT NULL,
    entry_price NUMERIC(18, 8),
    stop_loss NUMERIC(18, 8),
    take_profit NUMERIC(18, 8),
    regime VARCHAR(30) NOT NULL,
    reasoning JSONB NOT NULL DEFAULT '[]'::jsonb,
    outcome VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING'
    realized_pnl NUMERIC(18, 8),
    r_multiple NUMERIC(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_decisions_symbol_time ON ai_decisions(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decisions_outcome ON ai_decisions(outcome);

-- 2. Executed Trades Table (Paper and Live fills with slippage and fee accounting)
CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(64) PRIMARY KEY,
    decision_id VARCHAR(64) REFERENCES ai_decisions(decision_id) ON DELETE SET NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'LONG' | 'SHORT'
    entry_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8) NOT NULL,
    size NUMERIC(18, 8) NOT NULL,
    realized_pnl NUMERIC(18, 8) NOT NULL,
    realized_pnl_percent NUMERIC(10, 4) NOT NULL,
    fee NUMERIC(18, 8) NOT NULL DEFAULT 0,
    slippage NUMERIC(18, 8) NOT NULL DEFAULT 0,
    r_multiple NUMERIC(10, 4) NOT NULL DEFAULT 0,
    close_reason VARCHAR(30) NOT NULL, -- 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'HARD_GATE'
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol, closed_at DESC);

-- 3. Open Positions Table
CREATE TABLE IF NOT EXISTS positions (
    id VARCHAR(64) PRIMARY KEY,
    decision_id VARCHAR(64),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'LONG' | 'SHORT'
    entry_price NUMERIC(18, 8) NOT NULL,
    current_price NUMERIC(18, 8) NOT NULL,
    size NUMERIC(18, 8) NOT NULL,
    stop_loss NUMERIC(18, 8),
    take_profit NUMERIC(18, 8),
    unrealized_pnl NUMERIC(18, 8) DEFAULT 0,
    risk_r NUMERIC(10, 4) DEFAULT 0,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bot Sessions & Telemetry
CREATE TABLE IF NOT EXISTS bot_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    allocated_capital NUMERIC(18, 2) NOT NULL,
    cycle_interval_seconds INT NOT NULL,
    cycles_completed INT NOT NULL DEFAULT 0,
    trades_executed INT NOT NULL DEFAULT 0,
    final_pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- 'RUNNING' | 'PAUSED' | 'STOPPED'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stopped_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS) and allow anon read/write for client side app
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for ai_decisions" ON ai_decisions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for trades" ON trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for positions" ON positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for bot_sessions" ON bot_sessions FOR ALL USING (true) WITH CHECK (true);
