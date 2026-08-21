-- ==============================================================================
-- AI QUANT TRADER — INTEGRITY PHASE 3 SCHEMA MIGRATION
-- Authoritative Persistent Paper Ledger & Multi-Bot Isolated Telemetry Tables
-- ==============================================================================

-- 1. Paper Accounts Ledger
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

-- 2. Paper Orders Ledger
CREATE TABLE IF NOT EXISTS public.paper_orders (
  order_id TEXT PRIMARY KEY,
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

-- 3. Paper Fills Ledger
CREATE TABLE IF NOT EXISTS public.paper_fills (
  fill_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  fill_price NUMERIC NOT NULL,
  filled_size NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  slippage NUMERIC NOT NULL DEFAULT 0,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Paper Active Positions
CREATE TABLE IF NOT EXISTS public.paper_positions (
  position_id TEXT PRIMARY KEY,
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

-- 5. Paper Closed Trades Journal
CREATE TABLE IF NOT EXISTS public.paper_trades (
  trade_id TEXT PRIMARY KEY,
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

-- 6. Paper Equity Snapshots (Historical curve)
CREATE TABLE IF NOT EXISTS public.paper_equity_snapshots (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  equity NUMERIC NOT NULL,
  cash NUMERIC NOT NULL,
  open_positions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Paper Risk Safety Events
CREATE TABLE IF NOT EXISTS public.paper_risk_events (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  bot_id TEXT,
  timestamp BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Multi-Bot Runs & Telemetry
CREATE TABLE IF NOT EXISTS public.bot_runs (
  id BIGSERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL,
  cycle_number INT NOT NULL,
  pnl NUMERIC NOT NULL DEFAULT 0,
  trades_executed INT NOT NULL DEFAULT 0,
  last_action TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bot_events (
  id BIGSERIAL PRIMARY KEY,
  bot_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users & service role access
CREATE POLICY "Allow public paper ledger reads" ON public.paper_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public paper ledger writes" ON public.paper_accounts FOR ALL USING (true);

CREATE POLICY "Allow public paper orders" ON public.paper_orders FOR ALL USING (true);
CREATE POLICY "Allow public paper fills" ON public.paper_fills FOR ALL USING (true);
CREATE POLICY "Allow public paper positions" ON public.paper_positions FOR ALL USING (true);
CREATE POLICY "Allow public paper trades" ON public.paper_trades FOR ALL USING (true);
CREATE POLICY "Allow public paper snapshots" ON public.paper_equity_snapshots FOR ALL USING (true);
CREATE POLICY "Allow public paper risk events" ON public.paper_risk_events FOR ALL USING (true);
CREATE POLICY "Allow public bot runs" ON public.bot_runs FOR ALL USING (true);
CREATE POLICY "Allow public bot events" ON public.bot_events FOR ALL USING (true);
