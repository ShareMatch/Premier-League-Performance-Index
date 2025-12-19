

CREATE SCHEMA IF NOT EXISTS "app_private";
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


CREATE OR REPLACE FUNCTION "app_private"."place_trade"("p_user_id" "uuid", "p_asset_id" "text", "p_asset_name" "text", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_wallet_id uuid;
    v_balance bigint;
    v_reserved bigint;
    v_available bigint;
    v_cost_cents bigint;
    v_current_qty numeric;
    v_current_avg_price numeric;
BEGIN
    -- 0. Input validation
    IF p_quantity <= 0 OR p_price <= 0 THEN
         RETURN jsonb_build_object('success', false, 'message', 'Quantity and price must be positive');
    END IF;

    -- Get wallet and lock the row (CRITICAL for preventing double-spend)
    SELECT id, balance, reserved_cents INTO v_wallet_id, v_balance, v_reserved
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    -- Convert total cost to cents
    v_cost_cents := (p_total_cost * 100)::bigint;

    -- Handle BUY
    IF p_direction = 'buy' THEN
        v_available := v_balance - v_reserved;

        IF v_available < v_cost_cents THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
        END IF;

        -- 1. Update wallet balance
        UPDATE public.wallets
        SET balance = balance - v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- 2. Insert transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, asset_id, asset_name, direction, price_per_unit, quantity, trade_status
        ) VALUES (
            p_user_id, -- CORRECTED: Pass UUID directly, not p_user_id::text
            p_total_cost,
            'trade_entry',
            'success',
            p_asset_id,
            p_asset_name,
            p_direction,
            p_price,
            p_quantity,
            'completed' -- Status is completed since transaction is final
        );

        -- 3. Update positions (Lock the position record for update)
        SELECT quantity INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id AND asset_id = p_asset_id
        FOR UPDATE NOWAIT;

        IF v_current_qty IS NULL THEN
            -- New Position
            INSERT INTO public.positions (user_id, asset_id, asset_name, quantity, average_buy_price)
            VALUES (p_user_id, p_asset_id, p_asset_name, p_quantity, p_price);
        ELSE
            -- Update Existing Position
            UPDATE public.positions
            SET quantity = quantity + p_quantity,
                updated_at = now()
            WHERE user_id = p_user_id AND asset_id = p_asset_id;
        END IF;

    -- Handle SELL
    ELSIF p_direction = 'sell' THEN
        
        -- 1. Check holdings and lock the position record
        SELECT quantity, average_buy_price INTO v_current_qty, v_current_avg_price
        FROM public.positions
        WHERE user_id = p_user_id AND asset_id = p_asset_id
        FOR UPDATE NOWAIT;

        IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient holdings');
        END IF;

        -- 2. Insert transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, asset_id, asset_name, direction, price_per_unit, quantity, trade_status
        ) VALUES (
            p_user_id, -- CORRECTED: Pass UUID directly
            p_total_cost,
            'trade_entry',
            'success',
            p_asset_id,
            p_asset_name,
            p_direction,
            p_price,
            p_quantity,
            'completed'
        );

        -- 3. Update positions (Subtract)
        UPDATE public.positions
        SET quantity = quantity - p_quantity,
            updated_at = now()
        WHERE user_id = p_user_id AND asset_id = p_asset_id;
        
        -- 4. Clean up empty positions
        DELETE FROM public.positions 
        WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity <= 0;

        -- 5. Credit Wallet Immediately
        UPDATE public.wallets
        SET balance = balance + v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid direction');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Trade placed successfully');

EXCEPTION
    WHEN OTHERS THEN
        -- Catch any unexpected SQL errors (e.g., integrity violations, locks)
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION "app_private"."update_user_verified_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id uuid;
    v_is_verified boolean;
BEGIN
    -- Determine the user_id from the row being INSERTED/UPDATED/DELETED
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);

    -- Check if BOTH email AND whatsapp channels are verified (non-null verified_at)
    SELECT 
        COUNT(CASE WHEN channel = 'email' AND verified_at IS NOT NULL THEN 1 END) = 1
        AND
        COUNT(CASE WHEN channel = 'whatsapp' AND verified_at IS NOT NULL THEN 1 END) = 1
    INTO v_is_verified
    FROM public.user_otp_verification
    WHERE user_id = v_user_id;

    -- Update the compliance table with the derived status
    -- The user_compliance record must exist before this trigger fires.
    UPDATE public.user_compliance
    SET is_user_verified = v_is_verified
    WHERE user_id = v_user_id;

    RETURN NULL; -- Mandatory for AFTER trigger
END;
$$;

CREATE OR REPLACE FUNCTION "public"."execute_trade"("p_user_id" "uuid", "p_direction" "text", "p_total_cost" numeric, "p_asset_id" "text", "p_asset_name" "text", "p_price" numeric, "p_quantity" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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

        -- Update wallet balance directly (Instant Fill)
        UPDATE public.wallets
        SET balance = balance - v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Insert transaction
        INSERT INTO public.transactions (
            user_id, amount, type, status, asset_id, asset_name, direction, price_per_unit, quantity, trade_status
        ) VALUES (
            p_user_id,
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

        -- Update positions (Add/Avg Price)
        -- Check if position exists
        SELECT quantity INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id AND asset_id = p_asset_id;

        IF v_current_qty IS NULL THEN
            INSERT INTO public.positions (user_id, asset_id, asset_name, quantity, average_buy_price)
            VALUES (p_user_id, p_asset_id, p_asset_name, p_quantity, p_price);
        ELSE
            -- NOTE: Average price calculation is missing here, but for structure purposes, we continue
            UPDATE public.positions
            SET quantity = quantity + p_quantity,
                updated_at = now()
            WHERE user_id = p_user_id AND asset_id = p_asset_id;
        END IF;

    -- Handle SELL
    ELSIF p_direction = 'sell' THEN
        v_cost_cents := (p_total_cost * 100)::bigint;
        
        -- Check holdings
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
            p_user_id,
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
        UPDATE public.positions
        SET quantity = quantity - p_quantity,
            updated_at = now()
        WHERE user_id = p_user_id AND asset_id = p_asset_id;
        
        -- Clean up empty
        DELETE FROM public.positions 
        WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity <= 0;

        -- Credit Wallet Immediately
        UPDATE public.wallets
        SET balance = balance + v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid direction');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Trade placed successfully');
END;
$$;


-- CREATE OR REPLACE FUNCTION "public"."notify_n8n_from_users"() RETURNS "trigger"
--     LANGUAGE "plpgsql" SECURITY DEFINER
--     AS $$
-- declare
--   payload jsonb;
--   _resp jsonb;
-- begin
--   -- Build simplified payload for n8n
--   payload := jsonb_build_object(
--     'event', TG_OP,
--     'table', TG_TABLE_NAME,
--     'at', now(),
--     'user', jsonb_build_object(
--       'id',          NEW.id,
--       'full_name',   NEW.full_name,
--       'email',       NEW.email,
--       'phone_e164',  NEW.phone_e164,
--       'dob',         NEW.dob
--     )
--   );

--   -- Post to your new n8n webhook
--   select (extensions.http_post(
--     url          := 'https://sm-n8n-prod-u57860.vm.elestio.app/webhook/new-registration',
--     content_type := 'application/json',
--     content      := payload::text,
--     headers      := '{"Content-Type":"application/json"}'
--   )).content::jsonb
--   into _resp;

--   return NEW;

-- exception when others then
--   perform pg_notify('app_warnings', 'notify_n8n_from_users failed: ' || sqlerrm);
--   return NEW;
-- end;
-- $$;


CREATE OR REPLACE FUNCTION "public"."place_trade"("p_user_id" "uuid", "p_asset_id" "text", "p_asset_name" "text", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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

        -- Update wallet balance directly (Instant Fill)
        UPDATE public.wallets
        SET balance = balance - v_cost_cents,
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

        -- Update positions (Add/Avg Price)
        -- Check if position exists
        SELECT quantity INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id AND asset_id = p_asset_id;

        IF v_current_qty IS NULL THEN
            INSERT INTO public.positions (user_id, asset_id, asset_name, quantity, average_buy_price)
            VALUES (p_user_id, p_asset_id, p_asset_name, p_quantity, p_price);
        ELSE
            UPDATE public.positions
            SET quantity = quantity + p_quantity,
                updated_at = now()
            WHERE user_id = p_user_id AND asset_id = p_asset_id;
        END IF;

    -- Handle SELL
    ELSIF p_direction = 'sell' THEN
        v_cost_cents := (p_total_cost * 100)::bigint;
        
        -- Check holdings
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
        UPDATE public.positions
        SET quantity = quantity - p_quantity,
            updated_at = now()
        WHERE user_id = p_user_id AND asset_id = p_asset_id;
        
        -- Clean up empty
        DELETE FROM public.positions 
        WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity <= 0;

        -- Credit Wallet Immediately
        UPDATE public.wallets
        SET balance = balance + v_cost_cents,
            updated_at = now()
        WHERE id = v_wallet_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid direction');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Trade placed successfully');
END;
$$;


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "market" "text" NOT NULL,
    "bid" numeric NOT NULL,
    "offer" numeric NOT NULL,
    "last_change" "text" DEFAULT 'none'::"text",
    "color" "text",
    "category" "text" DEFAULT 'football'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_settled" boolean DEFAULT false,
    "settled_date" "text"
);

CREATE TABLE IF NOT EXISTS "public"."company_bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "iban" "text" NOT NULL,
    "swift_bic" "text" NOT NULL,
    "bank_name" "text" NOT NULL,
    "account_name" "text" NOT NULL,
    "currency" character(3) DEFAULT 'EUR'::"bpchar" NOT NULL,
    "address_line" "text",
    "city" "text",
    "postal_code" "text",
    "country" "text",
    "country_code" character(2),
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "company_bank_accounts_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);

CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "headline" "text" NOT NULL,
    "source" "text" NOT NULL,
    "url" "text",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."news_updates" (
    "topic" "text" NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_id" "text" NOT NULL,
    "asset_name" "text" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "average_buy_price" numeric,
    "current_value" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "balance" numeric DEFAULT 0
);


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'success'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "raw_payload" "jsonb",
    "asset_id" "text",
    "asset_name" "text",
    "direction" "text",
    "price_per_unit" numeric,
    "quantity" numeric,
    "trade_status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "transactions_direction_check" CHECK (("direction" = ANY (ARRAY['buy'::"text", 'sell'::"text"]))),
    CONSTRAINT "transactions_trade_status_check" CHECK (("trade_status" = ANY (ARRAY['pending'::"text", 'win'::"text", 'loss'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."user_compliance" (
    "user_id" "uuid" NOT NULL,
    "kyc_status" "text",
    "kyc_started_at" timestamp with time zone,
    "kyc_reviewed_at" timestamp with time zone,
    "sumsub_applicant_id" "text",
    "sumsub_level" "text",
    "sumsub_reuse_token" "text",
    "consent_cooling_off" boolean DEFAULT true NOT NULL,
    "cooling_off_until" timestamp with time zone,
    "source_of_funds" "text",
    "source_of_funds_other" "text",
    "inbound_currency" character(3),
    "expected_monthly_volume_band" "text",
    "is_user_verified" boolean DEFAULT false NOT NULL,
    CONSTRAINT "uc_expected_monthly_volume_band_ck" CHECK (("expected_monthly_volume_band" = ANY (ARRAY['1–1,000'::"text", '1,001–5,000'::"text", '5,001–10,000'::"text", '10,000+'::"text"]))),
    CONSTRAINT "uc_inbound_currency_ck" CHECK (("inbound_currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "uc_sof_other_required_ck" CHECK ((("source_of_funds" IS NULL) OR ("source_of_funds" <> 'Other'::"text") OR (("source_of_funds" = 'Other'::"text") AND (COALESCE(NULLIF("source_of_funds_other", ''::"text"), ''::"text") <> ''::"text")))),
    CONSTRAINT "uc_source_of_funds_ck" CHECK (("source_of_funds" = ANY (ARRAY['Salary/Employment income'::"text", 'Savings'::"text", 'Business profits'::"text", 'Investment income (dividends/returns)'::"text", 'Sale of property/assets'::"text", 'Inheritance'::"text", 'Gift'::"text", 'Pension'::"text", 'Crypto trading/holdings'::"text", 'Other'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."user_crypto_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallet_address" "text" NOT NULL,
    "cryptocurrency" "text" NOT NULL,
    "network" "text" NOT NULL,
    "wallet_name" "text",
    "is_for_deposits" boolean DEFAULT true,
    "is_for_withdrawals" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_crypto_wallets_cryptocurrency_check" CHECK (("cryptocurrency" = ANY (ARRAY['BTC'::"text", 'ETH'::"text", 'USDT'::"text", 'USDC'::"text", 'BNB'::"text", 'SOL'::"text", 'ADA'::"text", 'DOT'::"text", 'LINK'::"text", 'UNI'::"text", 'AAVE'::"text", 'COMP'::"text", 'MKR'::"text", 'SUSHI'::"text", 'YFI'::"text", 'BAL'::"text", 'CRV'::"text", 'REN'::"text", 'KNC'::"text", 'ZRX'::"text", 'BAT'::"text", 'OMG'::"text", 'LRC'::"text", 'REP'::"text", 'STORJ'::"text", 'ANT'::"text", 'GNT'::"text", 'MLN'::"text", 'FUN'::"text", 'WAVES'::"text", 'LSK'::"text", 'ARK'::"text", 'STRAT'::"text", 'XEM'::"text", 'QTUM'::"text", 'BTG'::"text", 'ZEC'::"text", 'DASH'::"text", 'XMR'::"text", 'ETC'::"text", 'BTCP'::"text", 'BSV'::"text", 'BCH'::"text", 'LTC'::"text", 'XRP'::"text", 'TRX'::"text", 'NEO'::"text", 'GAS'::"text", 'ONT'::"text", 'XLM'::"text", 'VET'::"text", 'THETA'::"text", 'HBAR'::"text", 'FLOW'::"text", 'MANA'::"text", 'SAND'::"text", 'AXS'::"text", 'CHZ'::"text", 'ENJ'::"text", 'GALAX'::"text", 'DOGE'::"text", 'SHIB'::"text", 'CAKE'::"text", 'SUSHI'::"text", 'BAKE'::"text", 'BURGER'::"text", 'ALICE'::"text", 'FOR'::"text", 'BEL'::"text", 'LIT'::"text", 'SXP'::"text", 'TLM'::"text", 'RAMP'::"text", 'CHR'::"text", 'FIS'::"text", 'EPS'::"text", 'AUTO'::"text", 'TKO'::"text", 'PUNDIX'::"text", 'LINA'::"text", 'PERL'::"text", 'MDX'::"text", 'CTK'::"text", 'NULS'::"text", 'COS'::"text", 'MTL'::"text", 'TOMO'::"text", 'WAN'::"text", 'DREP'::"text", 'VITE'::"text", 'MBL'::"text", 'KMD'::"text", 'JST'::"text", 'SUN'::"text", 'HIVE'::"text", 'STEEM'::"text", 'BLZ'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."user_otp_verification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "otp_code" "text",
    "otp_expires_at" timestamp with time zone,
    "otp_attempts" integer DEFAULT 0 NOT NULL,
    "verified_at" timestamp with time zone,
    "update_attempts" integer DEFAULT 0
);


CREATE TABLE IF NOT EXISTS "public"."user_payment_details" (
    "user_id" "uuid" NOT NULL,
    "payment_method_type" "text" NOT NULL,
    "payment_method_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "is_verified" boolean DEFAULT false,
    "reference_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_payment_details_payment_method_type_check" CHECK (("payment_method_type" = ANY (ARRAY['bank_transfer'::"text", 'crypto_wallet'::"text", 'debit_card'::"text"])))
);


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" NOT NULL,
    "email" boolean,
    "whatsapp" boolean,
    "sms" boolean,
    "personalized_marketing" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "email" "text",
    "full_name" "text",
    "dob" "date",
    "phone_e164" "text",
    "whatsapp_phone_e164" "text",
    "address_line" "text",
    "city" "text",
    "region" "text",
    "postal_code" "text",
    "country" "text",
    "country_code" character(2),
    "source_ip" "inet",
    "is_admin" boolean DEFAULT false NOT NULL,
    "profile_update_attempts" integer DEFAULT 0,
    "verified_full_name" "text",
    CONSTRAINT "users_country_code_ck" CHECK ((("country_code" IS NULL) OR ("country_code" ~ '^[A-Z]{2}$'::"text")))
);



CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "currency" character(3) NOT NULL,
    "balance" bigint DEFAULT 0 NOT NULL,
    "reserved_cents" bigint DEFAULT 0 NOT NULL,
    "balance_numeric_backup" numeric,
    "available_cents" bigint GENERATED ALWAYS AS (("balance" - "reserved_cents")) STORED,
    CONSTRAINT "wallets_reserved_le_balance_check" CHECK ((("balance" >= 0) AND ("reserved_cents" >= 0) AND ("reserved_cents" <= "balance")))
);


ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_iban_key" UNIQUE ("iban");


ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."news_updates"
    ADD CONSTRAINT "news_updates_pkey" PRIMARY KEY ("topic");


ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_user_id_asset_id_key" UNIQUE ("user_id", "asset_id");


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."user_compliance"
    ADD CONSTRAINT "user_compliance_pkey" PRIMARY KEY ("user_id");


ALTER TABLE ONLY "public"."user_crypto_wallets"
    ADD CONSTRAINT "user_crypto_wallets_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."user_otp_verification"
    ADD CONSTRAINT "user_otp_verification_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."user_otp_verification"
    ADD CONSTRAINT "user_otp_verification_unique_channel" UNIQUE ("user_id", "channel");


ALTER TABLE ONLY "public"."user_payment_details"
    ADD CONSTRAINT "user_payment_details_pkey" PRIMARY KEY ("user_id", "payment_method_type", "payment_method_id");


ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");


ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_currency_key" UNIQUE ("user_id", "currency");



CREATE INDEX "idx_otp_user_channel" ON "public"."user_otp_verification" USING "btree" ("user_id", "channel");
CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");
CREATE INDEX "idx_users_country_code" ON "public"."users" USING "btree" ("country_code");
CREATE INDEX "idx_users_email_lower" ON "public"."users" USING "btree" ("lower"("email"));
CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone_e164");
CREATE OR REPLACE TRIGGER "trg_update_user_verified_status" AFTER INSERT OR DELETE OR UPDATE OF "verified_at", "channel" ON "public"."user_otp_verification" FOR EACH ROW EXECUTE FUNCTION "app_private"."update_user_verified_status"();



CREATE OR REPLACE TRIGGER trg_update_user_verified_status
AFTER INSERT OR DELETE OR UPDATE OF verified_at, channel
ON public.user_otp_verification
FOR EACH ROW
EXECUTE FUNCTION app_private.update_user_verified_status();

CREATE OR REPLACE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE OR REPLACE TRIGGER wallets_set_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."user_compliance"
    ADD CONSTRAINT "user_compliance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_otp_verification"
    ADD CONSTRAINT "user_otp_verification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_payment_details"
    ADD CONSTRAINT "user_payment_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all access" ON "public"."wallets" USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on positions" ON "public"."positions" TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access on transactions" ON "public"."transactions" TO "authenticated" USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access on assets" ON "public"."assets" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on news_articles" ON "public"."news_articles" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on news_updates" ON "public"."news_updates" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on positions" ON "public"."positions" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on transactions" ON "public"."transactions" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on user_compliance" ON "public"."user_compliance" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on users" ON "public"."users" FOR SELECT USING (true);

CREATE POLICY "Allow public read access on wallets" ON "public"."wallets" FOR SELECT USING (true);

CREATE POLICY "Allow service_role full access on assets" ON "public"."assets" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on news_articles" ON "public"."news_articles" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on news_updates" ON "public"."news_updates" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on otp" ON "public"."user_otp_verification" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on otp table" ON "public"."user_otp_verification" FOR SELECT USING (true);

CREATE POLICY "Allow service_role full access on positions" ON "public"."positions" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on transactions" ON "public"."transactions" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on user_compliance" ON "public"."user_compliance" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full access on wallets" ON "public"."wallets" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."user_preferences" FOR SELECT USING (true);

CREATE POLICY "Service role can manage all user payment details" ON "public"."user_payment_details" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage company bank accounts" ON "public"."company_bank_accounts" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage user crypto wallets" ON "public"."user_crypto_wallets" TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "Users can delete their own payment details" ON "public"."user_payment_details" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert their own crypto wallets" ON "public"."user_crypto_wallets" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Users can insert their own payment details" ON "public"."user_payment_details" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert their own transactions" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ("auth"."uid"())::"text"));

CREATE POLICY "Users can update their own crypto wallets" ON "public"."user_crypto_wallets" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "user_payment_details"."payment_method_id"
   FROM "public"."user_payment_details"
  WHERE (("user_payment_details"."user_id" = "auth"."uid"()) AND ("user_payment_details"."payment_method_type" = 'crypto_wallet'::"text")))));

CREATE POLICY "Users can update their own payment details" ON "public"."user_payment_details" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can view active company bank accounts" ON "public"."company_bank_accounts" FOR SELECT TO "authenticated" USING (("is_active" = true));

CREATE POLICY "Users can view their own crypto wallets" ON "public"."user_crypto_wallets" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "user_payment_details"."payment_method_id"
   FROM "public"."user_payment_details"
  WHERE (("user_payment_details"."user_id" = "auth"."uid"()) AND ("user_payment_details"."payment_method_type" = 'crypto_wallet'::"text")))));

CREATE POLICY "Users can view their own payment details" ON "public"."user_payment_details" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can view their own positions" ON "public"."positions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT TO "authenticated" USING (("user_id" = ("auth"."uid"())::"text"));



ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."news_articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."news_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_compliance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_crypto_wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_otp_verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_payment_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;

