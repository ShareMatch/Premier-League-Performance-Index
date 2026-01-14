-- =========================================
-- Migration: Align RLS with auth_user_id mapping
-- =========================================

-- Ensure we drop any previous policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage their own positions" ON public.positions;
DROP POLICY IF EXISTS "Users can view their own compliance" ON public.user_compliance;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- User profile policies stay tied to auth_user_id
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Wallets: allow sessions whose auth ID matches the owning user's auth_user_id
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallets" ON public.wallets
  FOR SELECT USING (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.wallets.user_id
    )
  );

CREATE POLICY "Users can update their own wallets" ON public.wallets
  FOR UPDATE USING (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.wallets.user_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.wallets.user_id
    )
  );

-- Positions policy (reads/writes)
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own positions" ON public.positions
  FOR ALL USING (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.positions.user_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.positions.user_id
    )
  );

-- Transactions policy (selects and inserts)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.transactions.user_id
    )
  );

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.transactions.user_id
    )
  );

-- User compliance policy
ALTER TABLE public.user_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own compliance" ON public.user_compliance
  FOR SELECT USING (
    auth.uid() = (
      SELECT auth_user_id FROM public.users WHERE id = public.user_compliance.user_id
    )
  );
