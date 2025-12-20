-- Enable RLS
ALTER TABLE public.market_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_sub_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_trading_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_ledger ENABLE ROW LEVEL SECURITY;

-- Read-only access for anon & authenticated
CREATE POLICY "Public read market_groups"
ON public.market_groups
FOR SELECT
USING (true);

CREATE POLICY "Public read market_sub_groups"
ON public.market_sub_groups
FOR SELECT
USING (true);

CREATE POLICY "Public read market_owners"
ON public.market_owners
FOR SELECT
USING (true);

CREATE POLICY "Public read markets"
ON public.markets
FOR SELECT
USING (true);

CREATE POLICY "Public read assets"
ON public.assets
FOR SELECT
USING (true);

CREATE POLICY "Public read market_seasons"
ON public.market_seasons
FOR SELECT
USING (true);

CREATE POLICY "Public read market_trading_assets"
ON public.market_trading_assets
FOR SELECT
USING (true);

CREATE POLICY "Public read asset_ledger"
ON public.asset_ledger
FOR SELECT
USING (true);
