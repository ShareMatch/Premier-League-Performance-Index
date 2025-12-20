-- ==============================
-- Core navigation tables
-- ==============================

CREATE TABLE public.market_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.market_sub_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_group_id uuid NOT NULL
    REFERENCES public.market_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.market_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================
-- Markets (formerly Index)
-- ==============================

CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  market_sub_group_id uuid
    REFERENCES public.market_sub_groups(id),
  owner_id uuid
    REFERENCES public.market_owners(id),
  status text NOT NULL,
  market_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================
-- Assets (static)
-- ==============================

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team text,
  logo_url text,
  color text,
  type text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================
-- Market Seasons (contracts)
-- ==============================

CREATE TABLE public.market_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL
    REFERENCES public.markets(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL,
  season_token text,
  is_settled boolean NOT NULL DEFAULT false,
  settled_at timestamptz,
  settlement_status text,
  settlement_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()

);

-- ==============================
-- Tradable assets (per season)
-- ==============================

CREATE TABLE public.market_trading_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_season_id uuid NOT NULL
    REFERENCES public.market_seasons(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL
    REFERENCES public.assets(id),
  buy numeric NOT NULL,
  sell numeric NOT NULL,
  units numeric NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================
-- Asset price history
-- ==============================

CREATE TABLE public.asset_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_trading_asset_id uuid NOT NULL
    REFERENCES public.market_trading_assets(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.positions
DROP COLUMN asset_name,
DROP COLUMN asset_id;

ALTER TABLE public.positions
ADD COLUMN market_trading_asset_id uuid NOT NULL
  REFERENCES public.market_trading_assets(id)
  ON DELETE CASCADE;


-- Disable RLS to allow structural changes
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Drop dependent policies (safe even if already disabled)
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

-- Modify transactions table to align with new tradable asset structure
ALTER TABLE public.transactions
DROP COLUMN asset_name,
DROP COLUMN asset_id,
DROP COLUMN user_id;

ALTER TABLE public.transactions
ADD COLUMN user_id uuid NOT NULL
  REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
ADD COLUMN market_trading_asset_id uuid NOT NULL
  REFERENCES public.market_trading_assets(id);
