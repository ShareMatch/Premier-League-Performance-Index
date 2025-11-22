-- Debug script to check portfolio update issue
-- Run this to see what's in the positions table

SELECT * FROM public.positions WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Check if there are any constraints or triggers that might be failing
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.positions'::regclass;

-- Test the place_trade function manually
SELECT place_trade(
  '00000000-0000-0000-0000-000000000001'::uuid,
  '1',
  'Arsenal',
  'buy',
  55.6,
  1,
  55.6
);
