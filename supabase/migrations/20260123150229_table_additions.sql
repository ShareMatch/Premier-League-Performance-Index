-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ACTORS
-- =============================================
CREATE TABLE issuer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscriber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE liquidity_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CORE MARKET ASSET (MISA)
-- =============================================
CREATE TABLE market_index_seasons_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  market_index_season_id UUID NOT NULL
    REFERENCES market_index_season(id),

  asset_id UUID NOT NULL
    REFERENCES assets(id),

  -- Lifecycle & state
  status TEXT NOT NULL,
  current_owner TEXT,

  -- Blockchain linkage
  token_id TEXT,
  smart_contract_address TEXT,
  bearer_contract_address TEXT,

  -- Issuance & subscription
  nominal_value NUMERIC(20,8) NOT NULL,
  subscribed_at TIMESTAMPTZ,
  subscription_price NUMERIC(20,8),

  -- Settlement
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settlement_price NUMERIC(20,8),

  -- Trading constraints
  min_value NUMERIC(20,8),
  max_value NUMERIC(20,8),

  -- Market prices (derived, not source-of-truth)
  buy_price NUMERIC(20,8),
  sell_price NUMERIC(20,8),

  -- Aggregates
  total_trading_units NUMERIC(20,8) NOT NULL CHECK (total_trading_units >= 0),

  -- Metadata
  last_change TIMESTAMPTZ,
  avatar_class TEXT,
  external_asset_ref_code TEXT UNIQUE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- ISSUER → ASSET MINTING (APPEND-ONLY)
-- =============================================
CREATE TABLE issuer_index_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID NOT NULL REFERENCES issuer(id),
  market_index_seasons_asset_id UUID NOT NULL REFERENCES market_index_seasons_asset(id),
  units NUMERIC(20,8) NOT NULL CHECK (units > 0),
  issued_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SUBSCRIBER → ASSET OWNERSHIP (APPEND-ONLY)
-- =============================================
CREATE TABLE subscriber_index_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscriber(id),
  market_index_seasons_asset_id UUID NOT NULL REFERENCES market_index_seasons_asset(id),
  units NUMERIC(20,8) NOT NULL CHECK (units > 0),
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LIQUIDITY PROVIDER → INVENTORY
-- =============================================
CREATE TABLE liquidity_provider_index_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidity_provider_id UUID NOT NULL REFERENCES liquidity_provider(id),
  market_index_seasons_asset_id UUID NOT NULL REFERENCES market_index_seasons_asset(id),
  units NUMERIC(20,8) NOT NULL CHECK (units > 0),
  external_lp_ref_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LIQUIDITY PROVIDER OFFERS (APPEND-ONLY)
-- =============================================
CREATE TABLE liquidity_provider_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidity_provider_index_assets_id UUID NOT NULL
    REFERENCES liquidity_provider_index_assets(id),

  buy_offer_price NUMERIC(20,8),
  sell_offer_price NUMERIC(20,8),
  offered_units NUMERIC(20,8) NOT NULL CHECK (offered_units > 0),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TRADING PRICE HISTORY (GRAPH-SAFE)
-- =============================================
CREATE TABLE trading_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  market_index_seasons_asset_id UUID NOT NULL
    REFERENCES market_index_seasons_asset(id),

  liquidity_provider_offers_id UUID
    REFERENCES liquidity_provider_offers(id),

  last_traded_buy_price NUMERIC(20,8),
  last_traded_sell_price NUMERIC(20,8),

  lp_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT unique_price_point
    UNIQUE (market_index_seasons_asset_id, created_at)
);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE issuer ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_provider ENABLE ROW LEVEL SECURITY;

ALTER TABLE market_index_seasons_asset ENABLE ROW LEVEL SECURITY;

ALTER TABLE issuer_index_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_index_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_provider_index_assets ENABLE ROW LEVEL SECURITY;

ALTER TABLE liquidity_provider_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_price_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- ---- PUBLIC READ MARKET DATA
CREATE POLICY "public read misa"
ON market_index_seasons_asset
FOR SELECT
USING (true);

CREATE POLICY "public read price history"
ON trading_price_history
FOR SELECT
USING (true);

-- ---- SUBSCRIBER
CREATE POLICY "subscriber read own assets"
ON subscriber_index_assets
FOR SELECT
USING (subscriber_id = auth.uid());

-- ---- LIQUIDITY PROVIDER INVENTORY
CREATE POLICY "lp read own inventory"
ON liquidity_provider_index_assets
FOR SELECT
USING (liquidity_provider_id = auth.uid());

-- ---- LIQUIDITY PROVIDER OFFERS (INSERT ONLY)
CREATE POLICY "lp create offers"
ON liquidity_provider_offers
FOR INSERT
WITH CHECK (
  liquidity_provider_index_assets_id IN (
    SELECT id
    FROM liquidity_provider_index_assets
    WHERE liquidity_provider_id = auth.uid()
  )
);

CREATE POLICY "lp read own offers"
ON liquidity_provider_offers
FOR SELECT
USING (
  liquidity_provider_index_assets_id IN (
    SELECT id
    FROM liquidity_provider_index_assets
    WHERE liquidity_provider_id = auth.uid()
  )
);

-- =========================================================
-- trading_asset_lp_offers
-- =========================================================
-- Holds the currently validated & active LP offer
-- that controls pricing for a specific MISA asset
-- =========================================================

create table public.trading_asset_lp_offers (
    id uuid primary key default gen_random_uuid(),

    market_index_seasons_asset_id uuid not null
        references public.market_index_seasons_asset(id)
        on delete cascade,

    liquidity_provider_offers_id uuid not null
        references public.liquidity_provider_offers(id)
        on delete restrict,

    is_active boolean not null default true,

    activated_at timestamptz not null default now(),
    deactivated_at timestamptz,
    created_at timestamptz not null default now()
);

create unique index uq_active_lp_offer_per_misa
on public.trading_asset_lp_offers (market_index_seasons_asset_id)
where is_active = true;

alter table public.trading_asset_lp_offers
enable row level security;

create policy "Public read access"
on public.trading_asset_lp_offers
for select
using (true);

alter table public.market_index_seasons_asset
add constraint unique_market_index_season_asset
unique (market_index_seasons_id, asset_id);


ALTER TABLE market_index_seasons
ADD COLUMN external_ref_code text UNIQUE;

ALTER TABLE market_index_seasons_asset
ADD COLUMN external_asset_ref_code text UNIQUE;

ALTER TABLE subscriber
ADD COLUMN external_subscriber_ref text UNIQUE;

ALTER TABLE liquidity_provider
ADD COLUMN external_lp_ref text UNIQUE;

create table public.trading_price_history (
  id uuid not null default gen_random_uuid(),

  market_index_seasons_asset_id uuid not null
    references market_index_seasons_asset(id),

  price_source text not null
    check (price_source in ('subscriber', 'lp_offer', 'settlement')),

  subscriber_id uuid null
    references subscribers(id),

  lp_offers_id uuid null
    references liquidity_provider_offers(id),

  last_traded_buy_price numeric(20, 8) not null,
  last_traded_sell_price numeric(20, 8) not null,

  effective_at timestamp with time zone not null default now(),

  constraint trading_price_history_pkey primary key (id),

  constraint one_price_per_asset_per_time
    unique (market_index_seasons_asset_id, effective_at)
);
