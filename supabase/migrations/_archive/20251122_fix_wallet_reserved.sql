-- Recalculate reserved_cents for all wallets based on pending BUY trades only
-- This fixes the issue where the previous buggy 'sell' logic incorrectly reserved funds.

UPDATE public.wallets w
SET reserved_cents = (
  SELECT COALESCE(SUM(amount), 0) * 100
  FROM public.transactions t
  WHERE t.user_id = w.user_id::text
    AND t.trade_status = 'pending'
    AND t.direction = 'buy'
),
updated_at = now();
