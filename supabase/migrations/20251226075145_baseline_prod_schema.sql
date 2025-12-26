drop trigger if exists "trg_wallets_updated_at" on "public"."wallets";

drop extension if exists "moddatetime";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.moddatetime()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION app_private.update_user_verified_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_is_verified boolean;
BEGIN
    -- Determine the user_id from the row being INSERTED/UPDATED/DELETED
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);

    -- Check if BOTH email AND whatsapp channels are verified
    SELECT 
        COUNT(CASE WHEN channel = 'email' AND verified_at IS NOT NULL THEN 1 END) = 1
        AND
        COUNT(CASE WHEN channel = 'whatsapp' AND verified_at IS NOT NULL THEN 1 END) = 1
    INTO v_is_verified
    FROM public.user_otp_verification
    WHERE user_id = v_user_id;

    -- Update derived status
    UPDATE public.user_compliance
    SET is_user_verified = v_is_verified
    WHERE user_id = v_user_id;

    RETURN NULL; -- mandatory for AFTER trigger
END;
$function$
;

CREATE OR REPLACE FUNCTION public.place_trade(p_user_id uuid, p_market_trading_asset_id uuid, p_direction text, p_price numeric, p_quantity numeric, p_total_cost numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$DECLARE
    v_wallet_id uuid;
    v_balance bigint;
    v_reserved bigint;
    v_available bigint;
    v_cost_cents bigint;
    v_current_qty numeric;
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

        -- Update wallet balance
        UPDATE public.wallets
        SET balance = balance - v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Insert transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, market_trading_asset_id, direction, price_per_unit, quantity, trade_status
        ) VALUES (
            p_user_id,
            p_total_cost,
            'trade_entry',
            'success',
            p_market_trading_asset_id,
            p_direction,
            p_price,
            p_quantity,
            'pending'
        );

        -- Update positions
        SELECT quantity INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id AND market_trading_asset_id = p_market_trading_asset_id;

        IF v_current_qty IS NULL THEN
            INSERT INTO public.positions (user_id, market_trading_asset_id, quantity, average_buy_price)
            VALUES (p_user_id, p_market_trading_asset_id, p_quantity, p_price);
        ELSE
            UPDATE public.positions
            SET quantity = quantity + p_quantity,
                updated_at = now()
            WHERE user_id = p_user_id AND market_trading_asset_id = p_market_trading_asset_id;
        END IF;

    -- Handle SELL
    ELSIF p_direction = 'sell' THEN
        v_cost_cents := (p_total_cost * 100)::bigint;

        -- Check holdings
        SELECT quantity INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id AND market_trading_asset_id = p_market_trading_asset_id;

        IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient holdings');
        END IF;

        -- Insert transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, market_trading_asset_id, direction, price_per_unit, quantity, trade_status
        ) VALUES (
            p_user_id,
            p_total_cost,
            'trade_entry',
            'success',
            p_market_trading_asset_id,
            p_direction,
            p_price,
            p_quantity,
            'pending'
        );

        -- Update positions
        UPDATE public.positions
        SET quantity = quantity - p_quantity,
            updated_at = now()
        WHERE user_id = p_user_id AND market_trading_asset_id = p_market_trading_asset_id;

        -- Clean up empty positions
        DELETE FROM public.positions
        WHERE user_id = p_user_id AND market_trading_asset_id = p_market_trading_asset_id AND quantity <= 0;

        -- Credit Wallet
        UPDATE public.wallets
        SET balance = balance + v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid direction');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Trade placed successfully');
END;$function$
;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');


