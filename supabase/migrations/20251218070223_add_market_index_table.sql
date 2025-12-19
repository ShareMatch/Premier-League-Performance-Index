
CREATE EXTENSION IF NOT EXISTS "pgcrypto";



ALTER TABLE markets
DROP CONSTRAINT IF EXISTS markets_owner_id_fkey;

ALTER TABLE markets
DROP COLUMN IF EXISTS owner_id;

DROP TABLE IF EXISTS market_owners;




CREATE TABLE IF NOT EXISTS market_indexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL
    REFERENCES markets(id) ON DELETE CASCADE,

  name text NOT NULL,        -- e.g. "Tournament Winner"
  token text NOT NULL,       -- e.g. "EPL_WINNER"
  description text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (market_id, token)
);




ALTER TABLE market_seasons
RENAME TO market_index_seasons;

ALTER TABLE market_index_seasons
DROP CONSTRAINT IF EXISTS market_seasons_market_id_fkey;

ALTER TABLE market_index_seasons
DROP COLUMN IF EXISTS market_id;

ALTER TABLE market_index_seasons
ADD COLUMN market_index_id uuid NOT NULL
  REFERENCES market_indexes(id) ON DELETE CASCADE;

ALTER TABLE market_index_seasons
ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false;

ALTER TABLE market_index_seasons
ADD COLUMN IF NOT EXISTS settled_at timestamptz;





ALTER TABLE market_trading_assets
RENAME TO market_index_trading_assets;

ALTER TABLE market_index_trading_assets
DROP CONSTRAINT IF EXISTS market_trading_assets_market_season_id_fkey;

ALTER TABLE market_index_trading_assets
RENAME COLUMN market_season_id TO market_index_season_id;

ALTER TABLE market_index_trading_assets
ADD CONSTRAINT market_index_trading_assets_market_index_season_id_fkey
FOREIGN KEY (market_index_season_id)
REFERENCES market_index_seasons(id)
ON DELETE CASCADE;




ALTER TABLE asset_ledger
RENAME COLUMN market_trading_asset_id TO market_index_trading_asset_id;

-- Trade marker
ALTER TABLE asset_ledger
ADD COLUMN IF NOT EXISTS is_trade boolean NOT NULL DEFAULT false;

-- Time the price was recorded / trade occurred
ALTER TABLE asset_ledger
ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT now();

-- Drop any old FK just in case
ALTER TABLE asset_ledger
DROP CONSTRAINT IF EXISTS asset_ledger_market_trading_asset_id_fkey;

ALTER TABLE asset_ledger
DROP CONSTRAINT IF EXISTS asset_ledger_market_index_trading_asset_id_fkey;

-- Add correct FK
ALTER TABLE asset_ledger
ADD CONSTRAINT asset_ledger_market_index_trading_asset_id_fkey
FOREIGN KEY (market_index_trading_asset_id)
REFERENCES market_index_trading_assets(id)
ON DELETE CASCADE;




CREATE INDEX IF NOT EXISTS idx_market_indexes_market_id
ON market_indexes(market_id);

CREATE INDEX IF NOT EXISTS idx_market_index_seasons_index_id
ON market_index_seasons(market_index_id);

CREATE INDEX IF NOT EXISTS idx_market_index_trading_assets_season_id
ON market_index_trading_assets(market_index_season_id);

CREATE INDEX IF NOT EXISTS idx_asset_ledger_trading_asset_id
ON asset_ledger(market_index_trading_asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_ledger_recorded_at
ON asset_ledger(recorded_at);
