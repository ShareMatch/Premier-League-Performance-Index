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






begin;

/* =========================================================
   1. MARKET UNITS LEDGER (User ↔ Market)
========================================================= */
create table if not exists market_units_ledger (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,
  market_index_seasons_asset_id uuid not null,

  change_units numeric not null,
  direction text not null check (direction in ('credit', 'debit')),
  source text not null, -- trade_buy, trade_sell, settlement, reversal

  created_at timestamptz not null default now()
);

create index if not exists idx_market_units_ledger_user
  on market_units_ledger (user_id);

create index if not exists idx_market_units_ledger_misa
  on market_units_ledger (market_index_seasons_asset_id);


/* =========================================================
   2. LP UNITS LEDGER (LP ↔ Market)
========================================================= */
create table if not exists lp_units_ledger (
  id uuid primary key default gen_random_uuid(),

  liquidity_provider_id uuid not null,
  market_index_seasons_asset_id uuid not null,

  change_units numeric not null,
  direction text not null check (direction in ('credit', 'debit')),
  source text not null, -- trade_buy, trade_sell, settlement

  created_at timestamptz not null default now()
);

create index if not exists idx_lp_units_ledger_lp
  on lp_units_ledger (liquidity_provider_id);

create index if not exists idx_lp_units_ledger_misa
  on lp_units_ledger (market_index_seasons_asset_id);


/* =========================================================
   3. TRADE PRICE HISTORY (for LP price updates)
========================================================= */
create table if not exists trade_price_history (
  id uuid primary key default gen_random_uuid(),

  market_index_seasons_asset_id uuid not null,
  buy_price numeric not null,
  sell_price numeric not null,

  source text not null, -- lp_offer_update
  created_at timestamptz not null default now()
);

create index if not exists idx_trade_price_history_misa
  on trade_price_history (market_index_seasons_asset_id);


/* =========================================================
   4. UPDATED LP BULK OFFER RPC
========================================================= */
create or replace function set_lp_bulk_offer_prices(
  p_lp_id uuid,
  p_market_index_season_code text,
  p_offers jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_mis_id uuid;
  r record;
begin
  /* resolve MIS */
  select id
  into v_mis_id
  from market_index_seasons
  where external_ref_code = p_market_index_season_code
  for update;

  if not found then
    raise exception 'Invalid market_index_season_code';
  end if;

  /* deactivate existing offers */
  update trading_asset_lp_offers
  set is_active = false,
      deactivated_at = now()
  where is_active = true
    and market_index_seasons_asset_id in (
      select id
      from market_index_seasons_asset
      where market_index_seasons_id = v_mis_id
    );

  /* insert new offers */
  for r in
    select
      lpi.id as lp_index_asset_id,
      misa.id as misa_id,
      (o->>'buy_offer_price')::numeric as buy_price,
      (o->>'sell_offer_price')::numeric as sell_price
    from jsonb_array_elements(p_offers) o
    join liquidity_provider_index_assets lpi
      on lpi.external_lp_asset_ref = o->>'lp_asset_code'
     and lpi.liquidity_provider_id = p_lp_id
    join market_index_seasons_asset misa
      on misa.id = lpi.market_index_seasons_asset_id
     and misa.market_index_seasons_id = v_mis_id
  loop
    insert into liquidity_provider_offers (
      liquidity_provider_index_assets_id,
      buy_offer_price,
      sell_offer_price,
      created_at
    )
    values (
      r.lp_index_asset_id,
      r.buy_price,
      r.sell_price,
      now()
    )
    returning id into r.lp_index_asset_id;

    insert into trading_asset_lp_offers (
      market_index_seasons_asset_id,
      liquidity_provider_offers_id,
      is_active,
      activated_at,
      created_at
    )
    values (
      r.misa_id,
      r.lp_index_asset_id,
      true,
      now(),
      now()
    );

    update market_index_seasons_asset
    set
      is_secondary_market_enabled = true,
      buy_price = r.buy_price,
      sell_price = r.sell_price,
      last_change = now()
    where id = r.misa_id;

    insert into trade_price_history (
      market_index_seasons_asset_id,
      buy_price,
      sell_price,
      source
    )
    values (
      r.misa_id,
      r.buy_price,
      r.sell_price,
      'lp_offer_update'
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'offers_processed', jsonb_array_length(p_offers)
  );
end;
$$;


/* =========================================================
   5. UPDATED PLACE TRADE RPC (with ledgers)
========================================================= */
create or replace function place_trade(
  p_user_id uuid,
  p_lp_id uuid,
  p_market_index_seasons_asset_id uuid,
  p_market_trading_asset_id uuid,
  p_direction text,
  p_price numeric,
  p_quantity numeric,
  p_total_cost numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet_id uuid;
  v_balance bigint;
  v_reserved bigint;
  v_cost_cents bigint;
  v_current_qty numeric;
begin
  select id, balance, reserved_cents
  into v_wallet_id, v_balance, v_reserved
  from wallets
  where user_id = p_user_id
  for update;

  if v_wallet_id is null then
    return jsonb_build_object('success', false, 'message', 'Wallet not found');
  end if;

  v_cost_cents := (p_total_cost * 100)::bigint;

  if p_direction = 'buy' then
    if (v_balance - v_reserved) < v_cost_cents then
      return jsonb_build_object('success', false, 'message', 'Insufficient funds');
    end if;

    update wallets set balance = balance - v_cost_cents where id = v_wallet_id;

    insert into market_units_ledger
      (user_id, market_index_seasons_asset_id, change_units, direction, source)
    values
      (p_user_id, p_market_index_seasons_asset_id, p_quantity, 'credit', 'trade_buy');

    insert into lp_units_ledger
      (liquidity_provider_id, market_index_seasons_asset_id, change_units, direction, source)
    values
      (p_lp_id, p_market_index_seasons_asset_id, -p_quantity, 'debit', 'trade_buy');

  elsif p_direction = 'sell' then
    select quantity into v_current_qty
    from positions
    where user_id = p_user_id
      and market_trading_asset_id = p_market_trading_asset_id
    for update;

    if v_current_qty is null or v_current_qty < p_quantity then
      return jsonb_build_object('success', false, 'message', 'Insufficient holdings');
    end if;

    update wallets set balance = balance + v_cost_cents where id = v_wallet_id;

    insert into market_units_ledger
      (user_id, market_index_seasons_asset_id, change_units, direction, source)
    values
      (p_user_id, p_market_index_seasons_asset_id, -p_quantity, 'debit', 'trade_sell');

    insert into lp_units_ledger
      (liquidity_provider_id, market_index_seasons_asset_id, change_units, direction, source)
    values
      (p_lp_id, p_market_index_seasons_asset_id, p_quantity, 'credit', 'trade_sell');

  else
    return jsonb_build_object('success', false, 'message', 'Invalid direction');
  end if;

  return jsonb_build_object('success', true);
end;
$$;


/* =========================================================
   6. GRANTS
========================================================= */
grant execute on function set_lp_bulk_offer_prices(uuid, text, jsonb) to service_role;
grant execute on function place_trade(uuid, uuid, uuid, uuid, text, numeric, numeric, numeric) to service_role;

grant select on market_units_ledger to service_role;
grant select on lp_units_ledger to service_role;
grant select on trade_price_history to service_role;


/* =========================================================
   7. RLS
========================================================= */
alter table market_units_ledger enable row level security;
alter table lp_units_ledger enable row level security;
alter table trade_price_history enable row level security;

create policy "users_read_own_market_units"
on market_units_ledger
for select
using (auth.uid() = user_id);

create policy "service_role_all_lp_units"
on lp_units_ledger
for all
using (auth.role() = 'service_role');

create policy "public_read_price_history"
on trade_price_history
for select
using (true);

commit;

