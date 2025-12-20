-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public read access for positions
CREATE POLICY "Public read positions"
ON public.positions
FOR SELECT
USING (true);

-- Public read access for transactions
CREATE POLICY "Public read transactions"
ON public.transactions
FOR SELECT
USING (true);
