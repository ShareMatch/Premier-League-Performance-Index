-- =========================================
-- Migration: Fix RLS Policies and Grants (With Anon Access for Public Data)
-- =========================================

-- Step 1: Revoke ALL from Anon/Auth on Sensitive Tables
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.wallets FROM anon, authenticated;
REVOKE ALL ON public.positions FROM anon, authenticated;
REVOKE ALL ON public.transactions FROM anon, authenticated;
REVOKE ALL ON public.user_compliance FROM anon, authenticated;
REVOKE ALL ON public.user_otp_verification FROM anon, authenticated;
REVOKE ALL ON public.user_payment_details FROM anon, authenticated;
REVOKE ALL ON public.user_crypto_wallets FROM anon, authenticated;
REVOKE ALL ON public.company_bank_accounts FROM anon, authenticated;
REVOKE ALL ON public.login_history FROM anon, authenticated;
REVOKE ALL ON public.user_preferences FROM anon, authenticated;

-- Revoke default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Step 2: Grant Back Privileges
-- Authenticated: Full access to their own data (RLS will filter)
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, UPDATE ON public.wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT SELECT ON public.user_compliance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_otp_verification TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payment_details TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_crypto_wallets TO authenticated;

-- Anon: SELECT only on public tables (for market/news display)
GRANT SELECT ON public.markets TO anon;
GRANT SELECT ON public.market_indexes TO anon;
GRANT SELECT ON public.assets TO anon;
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT ON public.market_index_trading_assets TO anon;
GRANT SELECT ON public.market_groups TO anon;
GRANT SELECT ON public.market_sub_groups TO anon;

-- Step 3: Enable RLS and Apply Policies

-- Users Table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on users" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Service role full access on users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Wallets Table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON public.wallets;
DROP POLICY IF EXISTS "all public role read access on wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallets" ON public.wallets FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Users can update their own wallets" ON public.wallets FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)) WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Service role full access on wallets" ON public.wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Positions Table
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access on positions" ON public.positions;
DROP POLICY IF EXISTS "Allow public read access on positions" ON public.positions;
CREATE POLICY "Users can manage their own positions" ON public.positions FOR ALL USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)) WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Service role full access on positions" ON public.positions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Transactions Table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users full access on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow public read access on transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Service role full access on transactions" ON public.transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User Compliance Table
ALTER TABLE public.user_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on user_compliance" ON public.user_compliance;
DROP POLICY IF EXISTS "Allow service_role full access on user_compliance" ON public.user_compliance;
CREATE POLICY "Users can view their own compliance" ON public.user_compliance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on compliance" ON public.user_compliance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- OTP Verification Table
ALTER TABLE public.user_otp_verification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service_role full access on otp" ON public.user_otp_verification;
DROP POLICY IF EXISTS "Allow service_role full access on otp table" ON public.user_otp_verification;
CREATE POLICY "Users can manage their own OTP" ON public.user_otp_verification FOR ALL
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id))
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Service role full access on OTP" ON public.user_otp_verification FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payment Details Table
ALTER TABLE public.user_payment_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can delete their own payment details" ON public.user_payment_details;
DROP POLICY IF EXISTS "Users can insert their own payment details" ON public.user_payment_details;
DROP POLICY IF EXISTS "Users can update their own payment details" ON public.user_payment_details;
DROP POLICY IF EXISTS "Users can view their own payment details" ON public.user_payment_details;
DROP POLICY IF EXISTS "Service role can manage all user payment details" ON public.user_payment_details;
CREATE POLICY "Users can manage their own payment details" ON public.user_payment_details FOR ALL
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id))
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Service role full access on payment details" ON public.user_payment_details FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Crypto Wallets Table
ALTER TABLE public.user_crypto_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own crypto wallets" ON public.user_crypto_wallets;
DROP POLICY IF EXISTS "Users can update their own crypto wallets" ON public.user_crypto_wallets;
DROP POLICY IF EXISTS "Users can view their own crypto wallets" ON public.user_crypto_wallets;
DROP POLICY IF EXISTS "Service role can manage user crypto wallets" ON public.user_crypto_wallets;
CREATE POLICY "Users can manage their own crypto wallets" ON public.user_crypto_wallets FOR ALL
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id))
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));
CREATE POLICY "Service role full access on crypto wallets" ON public.user_crypto_wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public Tables: Allow anon SELECT
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read markets" ON public.markets;
CREATE POLICY "Public read markets" ON public.markets FOR SELECT USING (true);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read assets" ON public.assets;
CREATE POLICY "Public read assets" ON public.assets FOR SELECT USING (true);

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on news_articles" ON public.news_articles;
DROP POLICY IF EXISTS "Allow service_role full access on news_articles" ON public.news_articles;
CREATE POLICY "Public read news" ON public.news_articles FOR SELECT USING (true);
CREATE POLICY "Service role full access on news" ON public.news_articles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.market_index_trading_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read market_trading_assets" ON public.market_index_trading_assets;
CREATE POLICY "Public read market_trading_assets" ON public.market_index_trading_assets FOR SELECT USING (true);

-- Step 4: Revoke Grants on Trade Functions
REVOKE ALL ON FUNCTION public.execute_trade(uuid, text, numeric, text, text, numeric, numeric) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.place_trade(uuid, uuid, text, numeric, numeric, numeric) FROM anon, authenticated;