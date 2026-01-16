-- Fix company_bank_accounts permissions
-- The table needs SELECT grant for authenticated users so RLS can evaluate the policy

-- Grant SELECT permission to authenticated users (RLS will control row access)
GRANT SELECT ON public.company_bank_accounts TO authenticated;

-- Ensure the RLS policy exists
DROP POLICY IF EXISTS "Users can view active company bank accounts" ON public.company_bank_accounts;
CREATE POLICY "Users can view active company bank accounts" ON public.company_bank_accounts
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Service role keeps full access
DROP POLICY IF EXISTS "Service role can manage company bank accounts" ON public.company_bank_accounts;
CREATE POLICY "Service role can manage company bank accounts" ON public.company_bank_accounts
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;