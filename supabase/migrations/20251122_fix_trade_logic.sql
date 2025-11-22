-- Fix place_trade function to handle Buy vs Sell correctly

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
  v_current_qty numeric;
  v_current_avg_price numeric;
BEGIN
  -- Get wallet
  SELECT id, balance, reserved_cents INTO v_wallet_id, v_balance, v_reserved
  FROM public.wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
  END IF;

  -- Handle BUY
  IF p_direction = 'buy' THEN
      v_cost_cents := (p_total_cost * 100)::bigint;
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

      -- Update positions (Add)
      INSERT INTO public.positions (user_id, asset_id, asset_name, quantity, average_buy_price)
      VALUES (p_user_id, p_asset_id, p_asset_name, p_quantity, p_price)
      ON CONFLICT (user_id, asset_id) DO UPDATE
      SET quantity = positions.quantity + EXCLUDED.quantity,
          average_buy_price = (positions.average_buy_price * positions.quantity + EXCLUDED.average_buy_price * EXCLUDED.quantity) / (positions.quantity + EXCLUDED.quantity),
          updated_at = now();

  -- Handle SELL
  ELSIF p_direction = 'sell' THEN
      -- Check current holding
      SELECT quantity, average_buy_price INTO v_current_qty, v_current_avg_price
      FROM public.positions
      WHERE user_id = p_user_id AND asset_id = p_asset_id;

      IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
         RETURN jsonb_build_object('success', false, 'message', 'Insufficient holdings');
      END IF;

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

      -- Update positions (Subtract)
      -- We do NOT update average_buy_price on sell (cost basis remains same for remaining shares)
      UPDATE public.positions
      SET quantity = quantity - p_quantity,
          updated_at = now()
      WHERE user_id = p_user_id AND asset_id = p_asset_id;
      
      -- Optional: Clean up empty positions
      DELETE FROM public.positions 
      WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity <= 0;

      -- NOTE: We are NOT releasing reserved funds yet, as the trade is "pending" settlement.
      -- This aligns with "worst case" logic where funds remain locked until win/loss is determined.

  ELSE
      RETURN jsonb_build_object('success', false, 'message', 'Invalid direction');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Trade placed successfully');
END;
$$ LANGUAGE plpgsql;
