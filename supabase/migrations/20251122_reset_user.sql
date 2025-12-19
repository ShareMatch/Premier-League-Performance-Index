-- Reset testuser123 to initial state
-- Run this if you want to clear all trades and start fresh with $10,000

-- 1. Delete all positions
DELETE FROM public.positions WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 2. Delete all transactions
DELETE FROM public.transactions WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 3. Reset Wallet
UPDATE public.wallets
SET balance = 1000000, -- $10,000.00
    reserved_cents = 0,
    updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000001';
