-- ==============================================================================
-- AI QUANT TRADER — PHASE 6 STRATEGY LIFECYCLE & VERSIONING SCHEMA
-- Controlled Multi-Stage Lifecycle & Immutable Version Persistence
-- ==============================================================================

-- ── 1. Strategies Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategies (
  strategy_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'MOMENTUM_TREND',
  current_version TEXT NOT NULL DEFAULT 'v1.0',
  lifecycle_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    lifecycle_status IN (
      'DRAFT',
      'VALIDATED',
      'BACKTESTED',
      'WALK_FORWARD_TESTED',
      'PAPER_APPROVED',
      'LIVE_ELIGIBLE',
      'LIVE',
      'SUSPENDED',
      'RETIRED'
    )
  ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Strategy Versions (Immutable Snapshots) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategy_versions (
  version_id BIGSERIAL PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES public.strategies(strategy_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  version_tag TEXT NOT NULL, -- e.g. 'v1.0', 'v1.1', 'v2.0'
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    lifecycle_status IN (
      'DRAFT',
      'VALIDATED',
      'BACKTESTED',
      'WALK_FORWARD_TESTED',
      'PAPER_APPROVED',
      'LIVE_ELIGIBLE',
      'LIVE',
      'SUSPENDED',
      'RETIRED'
    )
  ),
  backtest_metrics JSONB DEFAULT '{}'::jsonb,
  is_immutable BOOLEAN NOT NULL DEFAULT FALSE,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(strategy_id, version_tag)
);

-- ── 3. Enable Row Level Security (RLS) ────────────────────────────────────────
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;

-- 4. User Isolation Policies
DROP POLICY IF EXISTS "Users can manage own strategies" ON public.strategies;
DROP POLICY IF EXISTS "Users can manage own strategy versions" ON public.strategy_versions;

CREATE POLICY "Users can manage own strategies" ON public.strategies
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage own strategy versions" ON public.strategy_versions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service Role Full Access Policies
DROP POLICY IF EXISTS "Service role full access strategies" ON public.strategies;
DROP POLICY IF EXISTS "Service role full access strategy_versions" ON public.strategy_versions;

CREATE POLICY "Service role full access strategies" ON public.strategies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access strategy_versions" ON public.strategy_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
