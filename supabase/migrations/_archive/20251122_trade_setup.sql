-- 1. Update transactions table to store trade details
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS asset_id text,
ADD COLUMN IF NOT EXISTS asset_name text,
ADD COLUMN IF NOT EXISTS direction text CHECK (direction IN ('buy', 'sell')),
ADD COLUMN IF NOT EXISTS price_per_unit numeric,
ADD COLUMN IF NOT EXISTS quantity numeric,
ADD COLUMN IF NOT EXISTS trade_status text DEFAULT 'pending' CHECK (trade_status IN ('pending', 'win', 'loss', 'cancelled'));

-- 2. Create positions table to track portfolio
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id),
  asset_id text NOT NULL,
  asset_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  average_buy_price numeric,
  current_value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

-- 3. Function to place a trade atomically
CREATE OR REPLACE FUNCTION place_trade(
  p_user_id uuid,
  p_asset_id text,
  p_asset_name text,
  p_direction text,
  p_price numeric,
  p_quantity numeric,
  p_total_cost numeric
) RETURNS jsonb AS $$
DECLARE
  v_wallet_id uuid;
  v_balance bigint;
  v_reserved bigint;
  v_available bigint;
  v_cost_cents bigint;
BEGIN
  -- Get wallet
  SELECT id, balance, reserved_cents INTO v_wallet_id, v_balance, v_reserved
  FROM public.wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
  END IF;

  v_cost_cents := (p_total_cost * 100)::bigint; -- Convert to cents
  v_available := v_balance - v_reserved;

  IF v_available < v_cost_cents THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
  END IF;

  -- Update wallet reserved amount
  UPDATE public.wallets
  SET reserved_cents = reserved_cents + v_cost_cents,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Insert transaction
  INSERT INTO public.transactions (
    user_id, amount, type, status, asset_id, asset_name, direction, price_per_unit, quantity, trade_status
  ) VALUES (
    p_user_id::text,
    p_total_cost,
    'trade_entry',
    'success',
    p_asset_id,
    p_asset_name,
    p_direction,
    p_price,
    p_quantity,
    'pending'
  );

  -- Update positions (Portfolio)
  INSERT INTO public.positions (user_id, asset_id, asset_name, quantity, average_buy_price)
  VALUES (p_user_id, p_asset_id, p_asset_name, p_quantity, p_price)
  ON CONFLICT (user_id, asset_id) DO UPDATE
  SET quantity = positions.quantity + EXCLUDED.quantity,
      average_buy_price = (positions.average_buy_price * positions.quantity + EXCLUDED.average_buy_price * EXCLUDED.quantity) / (positions.quantity + EXCLUDED.quantity),
      updated_at = now();

  RETURN jsonb_build_object('success', true, 'message', 'Trade placed successfully');
END;
$$ LANGUAGE plpgsql;

-- 4. Seed Data for testuser123
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert User if not exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    INSERT INTO public.users (id, username, email, full_name)
    VALUES (v_user_id, 'testuser123', 'testuser123@example.com', 'Test User');
  END IF;

  -- Insert Wallet if not exists
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = v_user_id) THEN
    INSERT INTO public.wallets (user_id, balance, reserved_cents, currency)
    VALUES (v_user_id, 1000000, 0, 'USD'); -- $10,000.00
  END IF;
END $$;
