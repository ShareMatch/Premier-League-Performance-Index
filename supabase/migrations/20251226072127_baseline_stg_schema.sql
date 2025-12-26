


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app_private";


ALTER SCHEMA "app_private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."preference_channel" AS ENUM (
    'email',
    'whatsapp',
    'sms',
    'personalized_marketing',
    'email_otp',
    'whatsapp_otp'
);


ALTER TYPE "public"."preference_channel" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app_private"."update_user_verified_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    v_user_id uuid;
    v_is_verified boolean;
begin
    v_user_id := coalesce(new.user_id, old.user_id);

    select
        count(case when channel = 'email' and verified_at is not null then 1 end) = 1
        and
        count(case when channel = 'whatsapp' and verified_at is not null then 1 end) = 1
    into v_is_verified
    from public.user_otp_verification
    where user_id = v_user_id;

    update public.user_compliance
    set is_user_verified = v_is_verified
    where user_id = v_user_id;

    return null;
end;
$$;


ALTER FUNCTION "app_private"."update_user_verified_status"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."execute_trade"("p_user_id" "uuid", "p_direction" "text", "p_total_cost" numeric, "p_asset_id" "text", "p_asset_name" "text", "p_price" numeric, "p_quantity" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_preferences"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT COALESCE(
        jsonb_object_agg(channel::text, permission),
        '{}'::jsonb
    )
    FROM public.user_preferences
    WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_preferences"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_trade"("p_user_id" "uuid", "p_market_trading_asset_id" "uuid", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_wallet_id uuid;
    v_balance bigint;
    v_reserved bigint;
    v_available bigint;
    v_cost_cents bigint;
    v_current_qty numeric;
BEGIN
    -- Get wallet
    SELECT id, balance, reserved_cents
    INTO v_wallet_id, v_balance, v_reserved
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
            user_id,
            amount,
            type,
            status,
            market_trading_asset_id,
            direction,
            price_per_unit,
            quantity,
            trade_status
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
        SELECT quantity
        INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id
          AND market_trading_asset_id = p_market_trading_asset_id;

        IF v_current_qty IS NULL THEN
            INSERT INTO public.positions (
                user_id,
                market_trading_asset_id,
                quantity,
                average_buy_price
            )
            VALUES (
                p_user_id,
                p_market_trading_asset_id,
                p_quantity,
                p_price
            );
        ELSE
            UPDATE public.positions
            SET quantity = quantity + p_quantity,
                updated_at = now()
            WHERE user_id = p_user_id
              AND market_trading_asset_id = p_market_trading_asset_id;
        END IF;

    -- Handle SELL
    ELSIF p_direction = 'sell' THEN
        v_cost_cents := (p_total_cost * 100)::bigint;

        -- Check holdings
        SELECT quantity
        INTO v_current_qty
        FROM public.positions
        WHERE user_id = p_user_id
          AND market_trading_asset_id = p_market_trading_asset_id;

        IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient holdings');
        END IF;

        -- Insert transaction
        INSERT INTO public.transactions (
            user_id,
            amount,
            type,
            status,
            market_trading_asset_id,
            direction,
            price_per_unit,
            quantity,
            trade_status
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
        WHERE user_id = p_user_id
          AND market_trading_asset_id = p_market_trading_asset_id;

        -- Clean up empty positions
        DELETE FROM public.positions
        WHERE user_id = p_user_id
          AND market_trading_asset_id = p_market_trading_asset_id
          AND quantity <= 0;

        -- Credit wallet
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


ALTER FUNCTION "public"."place_trade"("p_user_id" "uuid", "p_market_trading_asset_id" "uuid", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_user_preference"("p_user_id" "uuid", "p_channel" "text", "p_permission" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id, channel, permission)
    VALUES (p_user_id, p_channel::preference_channel, p_permission)
    ON CONFLICT (user_id, channel)
    DO UPDATE SET 
        permission = EXCLUDED.permission,
        updated_at = now();
END;
$$;


ALTER FUNCTION "public"."upsert_user_preference"("p_user_id" "uuid", "p_channel" "text", "p_permission" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."asset_facts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_name" "text" NOT NULL,
    "market" "text",
    "fact" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."asset_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "market_index_trading_asset_id" "uuid" NOT NULL,
    "price" numeric NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_trade" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."asset_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "team" "text",
    "logo_url" "text",
    "color" "text",
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "primary_color" "text",
    "secondary_color" "text"
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


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


ALTER TABLE "public"."company_bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."index_trading_asset_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "market_index_trading_asset_id" "uuid" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."index_trading_asset_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "ip_address" "inet",
    "device_type" "text",
    "browser" "text",
    "os" "text"
);


ALTER TABLE "public"."login_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."market_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_index_seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "season_token" "text",
    "is_settled" boolean DEFAULT false NOT NULL,
    "settled_at" timestamp with time zone,
    "settlement_status" "text",
    "settlement_price" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "market_index_id" "uuid" NOT NULL,
    "stage" "text",
    CONSTRAINT "market_index_seasons_stage_check" CHECK (("stage" = ANY (ARRAY['open'::"text", 'closed'::"text", 'settled'::"text"]))),
    CONSTRAINT "market_index_seasons_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."market_index_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_index_trading_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "market_index_season_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "buy" numeric NOT NULL,
    "sell" numeric NOT NULL,
    "units" numeric NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_settled" boolean DEFAULT false,
    "settlement_price" numeric,
    "last_change" timestamp with time zone DEFAULT "now"(),
    "stage" "text",
    "avatar_class" "text",
    "primary_color" "text",
    "secondary_color" "text",
    CONSTRAINT "market_index_trading_assets_stage_check" CHECK (("stage" = ANY (ARRAY['primary'::"text", 'secondary'::"text", 'settled'::"text"])))
);


ALTER TABLE "public"."market_index_trading_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_indexes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "market_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "token" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."market_indexes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_sub_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "market_group_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."market_sub_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."markets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "market_sub_group_id" "uuid",
    "status" "text" NOT NULL,
    "market_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."markets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "headline" "text" NOT NULL,
    "source" "text" NOT NULL,
    "url" "text",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_updates" (
    "topic" "text" NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quantity" numeric DEFAULT 0 NOT NULL,
    "average_buy_price" numeric,
    "current_value" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "market_trading_asset_id" "uuid" NOT NULL
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."trading_assets_dashboard" AS
 SELECT "t"."id" AS "market_index_trading_asset_id",
    ((("s"."start_date" || ' (ID: '::"text") || "left"(("s"."market_index_id")::"text", 10)) || '...)'::"text") AS "season_market_index",
    "a"."name" AS "asset_name",
    "t"."buy",
    "t"."sell",
    "t"."status",
    "t"."updated_at"
   FROM (("public"."market_index_trading_assets" "t"
     JOIN "public"."assets" "a" ON (("t"."asset_id" = "a"."id")))
     JOIN "public"."market_index_seasons" "s" ON (("t"."market_index_season_id" = "s"."id")));


ALTER VIEW "public"."trading_assets_dashboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "amount" numeric NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'success'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "raw_payload" "jsonb",
    "direction" "text",
    "price_per_unit" numeric,
    "quantity" numeric,
    "trade_status" "text" DEFAULT 'pending'::"text",
    "user_id" "uuid" NOT NULL,
    "market_trading_asset_id" "uuid" NOT NULL,
    CONSTRAINT "transactions_direction_check" CHECK (("direction" = ANY (ARRAY['buy'::"text", 'sell'::"text"]))),
    CONSTRAINT "transactions_trade_status_check" CHECK (("trade_status" = ANY (ARRAY['pending'::"text", 'win'::"text", 'loss'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


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


ALTER TABLE "public"."user_compliance" OWNER TO "postgres";


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


ALTER TABLE "public"."user_crypto_wallets" OWNER TO "postgres";


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


ALTER TABLE "public"."user_otp_verification" OWNER TO "postgres";


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


ALTER TABLE "public"."user_payment_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "channel" "public"."preference_channel" NOT NULL,
    "permission" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


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
    "display_name" "text",
    CONSTRAINT "users_country_code_ck" CHECK ((("country_code" IS NULL) OR ("country_code" ~ '^[A-Z]{2}$'::"text")))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


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


ALTER TABLE "public"."wallets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."asset_facts"
    ADD CONSTRAINT "asset_facts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_ledger"
    ADD CONSTRAINT "asset_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_iban_key" UNIQUE ("iban");



ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."index_trading_asset_profile"
    ADD CONSTRAINT "index_trading_asset_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_groups"
    ADD CONSTRAINT "market_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_indexes"
    ADD CONSTRAINT "market_indexes_market_id_token_key" UNIQUE ("market_id", "token");



ALTER TABLE ONLY "public"."market_indexes"
    ADD CONSTRAINT "market_indexes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_index_seasons"
    ADD CONSTRAINT "market_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_sub_groups"
    ADD CONSTRAINT "market_sub_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_index_trading_assets"
    ADD CONSTRAINT "market_trading_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."markets"
    ADD CONSTRAINT "markets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_articles"
    ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_updates"
    ADD CONSTRAINT "news_updates_pkey" PRIMARY KEY ("topic");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_unique_user_channel" UNIQUE ("user_id", "channel");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_currency_key" UNIQUE ("user_id", "currency");



CREATE INDEX "idx_asset_ledger_recorded_at" ON "public"."asset_ledger" USING "btree" ("recorded_at");



CREATE INDEX "idx_asset_ledger_trading_asset_id" ON "public"."asset_ledger" USING "btree" ("market_index_trading_asset_id");



CREATE INDEX "idx_login_history_auth_user_id" ON "public"."login_history" USING "btree" ("auth_user_id");



CREATE INDEX "idx_login_history_created_at" ON "public"."login_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_login_history_ip_address" ON "public"."login_history" USING "btree" ("ip_address");



CREATE INDEX "idx_login_history_user_id" ON "public"."login_history" USING "btree" ("user_id");



CREATE INDEX "idx_market_index_seasons_index_id" ON "public"."market_index_seasons" USING "btree" ("market_index_id");



CREATE INDEX "idx_market_index_trading_assets_season_id" ON "public"."market_index_trading_assets" USING "btree" ("market_index_season_id");



CREATE INDEX "idx_market_indexes_market_id" ON "public"."market_indexes" USING "btree" ("market_id");



CREATE INDEX "idx_otp_user_channel" ON "public"."user_otp_verification" USING "btree" ("user_id", "channel");



CREATE INDEX "idx_user_preferences_channel" ON "public"."user_preferences" USING "btree" ("channel");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_users_country_code" ON "public"."users" USING "btree" ("country_code");



CREATE INDEX "idx_users_email_lower" ON "public"."users" USING "btree" ("lower"("email"));



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone_e164");



CREATE OR REPLACE TRIGGER "trg_update_user_verified_status" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_otp_verification" FOR EACH ROW EXECUTE FUNCTION "app_private"."update_user_verified_status"();



CREATE OR REPLACE TRIGGER "trg_wallets_updated_at" BEFORE UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "update_index_trading_asset_profile_updated_at" BEFORE UPDATE ON "public"."index_trading_asset_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_preferences_set_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"('updated_at');



ALTER TABLE ONLY "public"."asset_ledger"
    ADD CONSTRAINT "asset_ledger_market_index_trading_asset_id_fkey" FOREIGN KEY ("market_index_trading_asset_id") REFERENCES "public"."market_index_trading_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."index_trading_asset_profile"
    ADD CONSTRAINT "index_trading_asset_profile_market_index_trading_asset_id_fkey" FOREIGN KEY ("market_index_trading_asset_id") REFERENCES "public"."market_index_trading_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_index_seasons"
    ADD CONSTRAINT "market_index_seasons_market_index_id_fkey" FOREIGN KEY ("market_index_id") REFERENCES "public"."market_indexes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_index_trading_assets"
    ADD CONSTRAINT "market_index_trading_assets_market_index_season_id_fkey" FOREIGN KEY ("market_index_season_id") REFERENCES "public"."market_index_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_indexes"
    ADD CONSTRAINT "market_indexes_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_sub_groups"
    ADD CONSTRAINT "market_sub_groups_market_group_id_fkey" FOREIGN KEY ("market_group_id") REFERENCES "public"."market_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_index_trading_assets"
    ADD CONSTRAINT "market_trading_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id");



ALTER TABLE ONLY "public"."markets"
    ADD CONSTRAINT "markets_market_sub_group_id_fkey" FOREIGN KEY ("market_sub_group_id") REFERENCES "public"."market_sub_groups"("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_market_trading_asset_id_fkey" FOREIGN KEY ("market_trading_asset_id") REFERENCES "public"."market_index_trading_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_market_trading_asset_id_fkey" FOREIGN KEY ("market_trading_asset_id") REFERENCES "public"."market_index_trading_assets"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_compliance"
    ADD CONSTRAINT "user_compliance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_otp_verification"
    ADD CONSTRAINT "user_otp_verification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_payment_details"
    ADD CONSTRAINT "user_payment_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all access" ON "public"."wallets" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anonymous inserts" ON "public"."asset_facts" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anonymous select" ON "public"."asset_facts" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow authenticated users full access on positions" ON "public"."positions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users full access on transactions" ON "public"."transactions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access on news_articles" ON "public"."news_articles" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on news_updates" ON "public"."news_updates" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on positions" ON "public"."positions" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on transactions" ON "public"."transactions" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on user_compliance" ON "public"."user_compliance" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow service_role full access on news_articles" ON "public"."news_articles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on news_updates" ON "public"."news_updates" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on otp" ON "public"."user_otp_verification" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on otp table" ON "public"."user_otp_verification" FOR SELECT USING (true);



CREATE POLICY "Allow service_role full access on positions" ON "public"."positions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on transactions" ON "public"."transactions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on user_compliance" ON "public"."user_compliance" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service_role full access on users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Public can read market indexes" ON "public"."market_indexes" FOR SELECT USING (true);



CREATE POLICY "Public read asset_ledger" ON "public"."asset_ledger" FOR SELECT USING (true);



CREATE POLICY "Public read assets" ON "public"."assets" FOR SELECT USING (true);



CREATE POLICY "Public read market_groups" ON "public"."market_groups" FOR SELECT USING (true);



CREATE POLICY "Public read market_seasons" ON "public"."market_index_seasons" FOR SELECT USING (true);



CREATE POLICY "Public read market_sub_groups" ON "public"."market_sub_groups" FOR SELECT USING (true);



CREATE POLICY "Public read market_trading_assets" ON "public"."market_index_trading_assets" FOR SELECT USING (true);



CREATE POLICY "Public read markets" ON "public"."markets" FOR SELECT USING (true);



CREATE POLICY "Public read positions" ON "public"."positions" FOR SELECT USING (true);



CREATE POLICY "Public read transactions" ON "public"."transactions" FOR SELECT USING (true);



CREATE POLICY "Service role can insert" ON "public"."login_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage all user payment details" ON "public"."user_payment_details" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage company bank accounts" ON "public"."company_bank_accounts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage user crypto wallets" ON "public"."user_crypto_wallets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own payment details" ON "public"."user_payment_details" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own crypto wallets" ON "public"."user_crypto_wallets" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert their own payment details" ON "public"."user_payment_details" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own marketing preferences" ON "public"."user_preferences" FOR UPDATE USING ((("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) AND ("channel" <> ALL (ARRAY['email_otp'::"public"."preference_channel", 'whatsapp_otp'::"public"."preference_channel"])))) WITH CHECK ((("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))) AND ("channel" <> ALL (ARRAY['email_otp'::"public"."preference_channel", 'whatsapp_otp'::"public"."preference_channel"]))));



CREATE POLICY "Users can update their own crypto wallets" ON "public"."user_crypto_wallets" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "user_payment_details"."payment_method_id"
   FROM "public"."user_payment_details"
  WHERE (("user_payment_details"."user_id" = "auth"."uid"()) AND ("user_payment_details"."payment_method_type" = 'crypto_wallet'::"text")))));



CREATE POLICY "Users can update their own payment details" ON "public"."user_payment_details" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view active company bank accounts" ON "public"."company_bank_accounts" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can view own login history" ON "public"."login_history" FOR SELECT USING (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own crypto wallets" ON "public"."user_crypto_wallets" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "user_payment_details"."payment_method_id"
   FROM "public"."user_payment_details"
  WHERE (("user_payment_details"."user_id" = "auth"."uid"()) AND ("user_payment_details"."payment_method_type" = 'crypto_wallet'::"text")))));



CREATE POLICY "Users can view their own payment details" ON "public"."user_payment_details" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own positions" ON "public"."positions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "all public role read access on wallet" ON "public"."wallets" FOR SELECT USING (true);



ALTER TABLE "public"."asset_facts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asset_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."index_trading_asset_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_index_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_index_trading_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_indexes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."market_sub_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."markets" ENABLE ROW LEVEL SECURITY;


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




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_trade"("p_user_id" "uuid", "p_direction" "text", "p_total_cost" numeric, "p_asset_id" "text", "p_asset_name" "text", "p_price" numeric, "p_quantity" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."execute_trade"("p_user_id" "uuid", "p_direction" "text", "p_total_cost" numeric, "p_asset_id" "text", "p_asset_name" "text", "p_price" numeric, "p_quantity" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_trade"("p_user_id" "uuid", "p_direction" "text", "p_total_cost" numeric, "p_asset_id" "text", "p_asset_name" "text", "p_price" numeric, "p_quantity" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_preferences"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_preferences"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_preferences"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."moddatetime"() TO "postgres";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "anon";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."place_trade"("p_user_id" "uuid", "p_market_trading_asset_id" "uuid", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."place_trade"("p_user_id" "uuid", "p_market_trading_asset_id" "uuid", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_trade"("p_user_id" "uuid", "p_market_trading_asset_id" "uuid", "p_direction" "text", "p_price" numeric, "p_quantity" numeric, "p_total_cost" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_preference"("p_user_id" "uuid", "p_channel" "text", "p_permission" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_preference"("p_user_id" "uuid", "p_channel" "text", "p_permission" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_preference"("p_user_id" "uuid", "p_channel" "text", "p_permission" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."asset_facts" TO "anon";
GRANT ALL ON TABLE "public"."asset_facts" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_facts" TO "service_role";



GRANT ALL ON TABLE "public"."asset_ledger" TO "anon";
GRANT ALL ON TABLE "public"."asset_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."company_bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."company_bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."company_bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."index_trading_asset_profile" TO "anon";
GRANT ALL ON TABLE "public"."index_trading_asset_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."index_trading_asset_profile" TO "service_role";



GRANT ALL ON TABLE "public"."login_history" TO "anon";
GRANT ALL ON TABLE "public"."login_history" TO "authenticated";
GRANT ALL ON TABLE "public"."login_history" TO "service_role";



GRANT ALL ON TABLE "public"."market_groups" TO "anon";
GRANT ALL ON TABLE "public"."market_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."market_groups" TO "service_role";



GRANT ALL ON TABLE "public"."market_index_seasons" TO "anon";
GRANT ALL ON TABLE "public"."market_index_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."market_index_seasons" TO "service_role";



GRANT ALL ON TABLE "public"."market_index_trading_assets" TO "anon";
GRANT ALL ON TABLE "public"."market_index_trading_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."market_index_trading_assets" TO "service_role";



GRANT ALL ON TABLE "public"."market_indexes" TO "anon";
GRANT ALL ON TABLE "public"."market_indexes" TO "authenticated";
GRANT ALL ON TABLE "public"."market_indexes" TO "service_role";



GRANT ALL ON TABLE "public"."market_sub_groups" TO "anon";
GRANT ALL ON TABLE "public"."market_sub_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."market_sub_groups" TO "service_role";



GRANT ALL ON TABLE "public"."markets" TO "anon";
GRANT ALL ON TABLE "public"."markets" TO "authenticated";
GRANT ALL ON TABLE "public"."markets" TO "service_role";



GRANT ALL ON TABLE "public"."news_articles" TO "anon";
GRANT ALL ON TABLE "public"."news_articles" TO "authenticated";
GRANT ALL ON TABLE "public"."news_articles" TO "service_role";



GRANT ALL ON TABLE "public"."news_updates" TO "anon";
GRANT ALL ON TABLE "public"."news_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."news_updates" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON TABLE "public"."trading_assets_dashboard" TO "anon";
GRANT ALL ON TABLE "public"."trading_assets_dashboard" TO "authenticated";
GRANT ALL ON TABLE "public"."trading_assets_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_compliance" TO "anon";
GRANT ALL ON TABLE "public"."user_compliance" TO "authenticated";
GRANT ALL ON TABLE "public"."user_compliance" TO "service_role";



GRANT ALL ON TABLE "public"."user_crypto_wallets" TO "anon";
GRANT ALL ON TABLE "public"."user_crypto_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_crypto_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."user_otp_verification" TO "anon";
GRANT ALL ON TABLE "public"."user_otp_verification" TO "authenticated";
GRANT ALL ON TABLE "public"."user_otp_verification" TO "service_role";



GRANT ALL ON TABLE "public"."user_payment_details" TO "anon";
GRANT ALL ON TABLE "public"."user_payment_details" TO "authenticated";
GRANT ALL ON TABLE "public"."user_payment_details" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


