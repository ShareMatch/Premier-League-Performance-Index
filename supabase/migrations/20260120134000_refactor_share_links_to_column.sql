-- Add short_code column to market_index_trading_assets
ALTER TABLE public.market_index_trading_assets 
ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_market_index_trading_assets_short_code 
ON public.market_index_trading_assets(short_code);
