create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create schema if not exists "app_private";

create extension if not exists "citext" with schema "public";

create extension if not exists "http" with schema "public";

create extension if not exists "moddatetime" with schema "public";


  create table "public"."assets" (
    "id" integer not null,
    "name" text not null,
    "market" text not null,
    "bid" numeric not null,
    "offer" numeric not null,
    "last_change" text default 'none'::text,
    "color" text,
    "category" text default 'football'::text,
    "updated_at" timestamp with time zone default now(),
    "is_settled" boolean default false,
    "settled_date" text
      );


alter table "public"."assets" enable row level security;


  create table "public"."company_bank_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "iban" text not null,
    "swift_bic" text not null,
    "bank_name" text not null,
    "account_name" text not null,
    "currency" character(3) not null default 'EUR'::bpchar,
    "address_line" text,
    "city" text,
    "postal_code" text,
    "country" text,
    "country_code" character(2),
    "is_active" boolean default true,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."company_bank_accounts" enable row level security;


  create table "public"."news_articles" (
    "id" uuid not null default gen_random_uuid(),
    "topic" text not null,
    "headline" text not null,
    "source" text not null,
    "url" text,
    "published_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."news_articles" enable row level security;


  create table "public"."news_updates" (
    "topic" text not null,
    "last_updated_at" timestamp with time zone default now()
      );


alter table "public"."news_updates" enable row level security;


  create table "public"."positions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "asset_id" text not null,
    "asset_name" text not null,
    "quantity" numeric not null default 0,
    "average_buy_price" numeric,
    "current_value" numeric,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."positions" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "balance" numeric default 0
      );



  create table "public"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "amount" numeric not null,
    "type" text not null,
    "status" text default 'success'::text,
    "created_at" timestamp without time zone default now(),
    "raw_payload" jsonb,
    "asset_id" text,
    "asset_name" text,
    "direction" text,
    "price_per_unit" numeric,
    "quantity" numeric,
    "trade_status" text default 'pending'::text
      );


alter table "public"."transactions" enable row level security;


  create table "public"."user_compliance" (
    "user_id" uuid not null,
    "kyc_status" text,
    "kyc_started_at" timestamp with time zone,
    "kyc_reviewed_at" timestamp with time zone,
    "sumsub_applicant_id" text,
    "sumsub_level" text,
    "sumsub_reuse_token" text,
    "consent_cooling_off" boolean not null default true,
    "cooling_off_until" timestamp with time zone,
    "source_of_funds" text,
    "source_of_funds_other" text,
    "inbound_currency" character(3),
    "expected_monthly_volume_band" text,
    "is_user_verified" boolean not null default false
      );


alter table "public"."user_compliance" enable row level security;


  create table "public"."user_crypto_wallets" (
    "id" uuid not null default gen_random_uuid(),
    "wallet_address" text not null,
    "cryptocurrency" text not null,
    "network" text not null,
    "wallet_name" text,
    "is_for_deposits" boolean default true,
    "is_for_withdrawals" boolean default true,
    "is_verified" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_crypto_wallets" enable row level security;


  create table "public"."user_otp_verification" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "channel" text not null,
    "otp_code" text,
    "otp_expires_at" timestamp with time zone,
    "otp_attempts" integer not null default 0,
    "verified_at" timestamp with time zone,
    "update_attempts" integer default 0
      );


alter table "public"."user_otp_verification" enable row level security;


  create table "public"."user_payment_details" (
    "user_id" uuid not null,
    "payment_method_type" text not null,
    "payment_method_id" uuid not null,
    "is_primary" boolean default false,
    "is_verified" boolean default false,
    "reference_number" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_payment_details" enable row level security;


  create table "public"."user_preferences" (
    "id" uuid not null,
    "email" boolean,
    "whatsapp" boolean,
    "sms" boolean,
    "personalized_marketing" boolean,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_preferences" enable row level security;


  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "auth_user_id" uuid,
    "email" text,
    "full_name" text,
    "dob" date,
    "phone_e164" text,
    "whatsapp_phone_e164" text,
    "address_line" text,
    "city" text,
    "region" text,
    "postal_code" text,
    "country" text,
    "country_code" character(2),
    "source_ip" inet,
    "is_admin" boolean not null default false,
    "profile_update_attempts" integer default 0
      );


alter table "public"."users" enable row level security;


  create table "public"."wallets" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp without time zone default now(),
    "user_id" uuid not null,
    "currency" character(3) not null,
    "balance" bigint not null default 0,
    "reserved_cents" bigint not null default 0,
    "balance_numeric_backup" numeric,
    "available_cents" bigint generated always as ((balance - reserved_cents)) stored
      );


alter table "public"."wallets" enable row level security;

CREATE UNIQUE INDEX assets_pkey ON public.assets USING btree (id);

CREATE UNIQUE INDEX company_bank_accounts_iban_key ON public.company_bank_accounts USING btree (iban);

CREATE UNIQUE INDEX company_bank_accounts_pkey ON public.company_bank_accounts USING btree (id);

CREATE INDEX idx_otp_user_channel ON public.user_otp_verification USING btree (user_id, channel);

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);

CREATE INDEX idx_users_country_code ON public.users USING btree (country_code);

CREATE INDEX idx_users_email_lower ON public.users USING btree (lower(email));

CREATE INDEX idx_users_phone ON public.users USING btree (phone_e164);

CREATE UNIQUE INDEX news_articles_pkey ON public.news_articles USING btree (id);

CREATE UNIQUE INDEX news_updates_pkey ON public.news_updates USING btree (topic);

CREATE UNIQUE INDEX positions_pkey ON public.positions USING btree (id);

CREATE UNIQUE INDEX positions_user_id_asset_id_key ON public.positions USING btree (user_id, asset_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX user_compliance_pkey ON public.user_compliance USING btree (user_id);

CREATE UNIQUE INDEX user_crypto_wallets_pkey ON public.user_crypto_wallets USING btree (id);

CREATE UNIQUE INDEX user_otp_verification_pkey ON public.user_otp_verification USING btree (id);

CREATE UNIQUE INDEX user_otp_verification_unique_channel ON public.user_otp_verification USING btree (user_id, channel);

CREATE UNIQUE INDEX user_payment_details_pkey ON public.user_payment_details USING btree (user_id, payment_method_type, payment_method_id);

CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (id);

CREATE UNIQUE INDEX users_auth_user_id_key ON public.users USING btree (auth_user_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX wallets_pkey ON public.wallets USING btree (id);

CREATE UNIQUE INDEX wallets_user_id_currency_key ON public.wallets USING btree (user_id, currency);

alter table "public"."assets" add constraint "assets_pkey" PRIMARY KEY using index "assets_pkey";

alter table "public"."company_bank_accounts" add constraint "company_bank_accounts_pkey" PRIMARY KEY using index "company_bank_accounts_pkey";

alter table "public"."news_articles" add constraint "news_articles_pkey" PRIMARY KEY using index "news_articles_pkey";

alter table "public"."news_updates" add constraint "news_updates_pkey" PRIMARY KEY using index "news_updates_pkey";

alter table "public"."positions" add constraint "positions_pkey" PRIMARY KEY using index "positions_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."user_compliance" add constraint "user_compliance_pkey" PRIMARY KEY using index "user_compliance_pkey";

alter table "public"."user_crypto_wallets" add constraint "user_crypto_wallets_pkey" PRIMARY KEY using index "user_crypto_wallets_pkey";

alter table "public"."user_otp_verification" add constraint "user_otp_verification_pkey" PRIMARY KEY using index "user_otp_verification_pkey";

alter table "public"."user_payment_details" add constraint "user_payment_details_pkey" PRIMARY KEY using index "user_payment_details_pkey";

alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY using index "user_preferences_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."wallets" add constraint "wallets_pkey" PRIMARY KEY using index "wallets_pkey";

alter table "public"."company_bank_accounts" add constraint "company_bank_accounts_currency_check" CHECK ((currency ~ '^[A-Z]{3}$'::text)) not valid;

alter table "public"."company_bank_accounts" validate constraint "company_bank_accounts_currency_check";

alter table "public"."company_bank_accounts" add constraint "company_bank_accounts_iban_key" UNIQUE using index "company_bank_accounts_iban_key";

alter table "public"."positions" add constraint "positions_user_id_asset_id_key" UNIQUE using index "positions_user_id_asset_id_key";

alter table "public"."positions" add constraint "positions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."positions" validate constraint "positions_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."transactions" add constraint "transactions_direction_check" CHECK ((direction = ANY (ARRAY['buy'::text, 'sell'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_direction_check";

alter table "public"."transactions" add constraint "transactions_trade_status_check" CHECK ((trade_status = ANY (ARRAY['pending'::text, 'win'::text, 'loss'::text, 'cancelled'::text, 'completed'::text]))) not valid;

alter table "public"."transactions" validate constraint "transactions_trade_status_check";

alter table "public"."user_compliance" add constraint "uc_expected_monthly_volume_band_ck" CHECK ((expected_monthly_volume_band = ANY (ARRAY['1–1,000'::text, '1,001–5,000'::text, '5,001–10,000'::text, '10,000+'::text]))) not valid;

alter table "public"."user_compliance" validate constraint "uc_expected_monthly_volume_band_ck";

alter table "public"."user_compliance" add constraint "uc_inbound_currency_ck" CHECK ((inbound_currency ~ '^[A-Z]{3}$'::text)) not valid;

alter table "public"."user_compliance" validate constraint "uc_inbound_currency_ck";

alter table "public"."user_compliance" add constraint "uc_sof_other_required_ck" CHECK (((source_of_funds IS NULL) OR (source_of_funds <> 'Other'::text) OR ((source_of_funds = 'Other'::text) AND (COALESCE(NULLIF(source_of_funds_other, ''::text), ''::text) <> ''::text)))) not valid;

alter table "public"."user_compliance" validate constraint "uc_sof_other_required_ck";

alter table "public"."user_compliance" add constraint "uc_source_of_funds_ck" CHECK ((source_of_funds = ANY (ARRAY['Salary/Employment income'::text, 'Savings'::text, 'Business profits'::text, 'Investment income (dividends/returns)'::text, 'Sale of property/assets'::text, 'Inheritance'::text, 'Gift'::text, 'Pension'::text, 'Crypto trading/holdings'::text, 'Other'::text]))) not valid;

alter table "public"."user_compliance" validate constraint "uc_source_of_funds_ck";

alter table "public"."user_compliance" add constraint "user_compliance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_compliance" validate constraint "user_compliance_user_id_fkey";

alter table "public"."user_crypto_wallets" add constraint "user_crypto_wallets_cryptocurrency_check" CHECK ((cryptocurrency = ANY (ARRAY['BTC'::text, 'ETH'::text, 'USDT'::text, 'USDC'::text, 'BNB'::text, 'SOL'::text, 'ADA'::text, 'DOT'::text, 'LINK'::text, 'UNI'::text, 'AAVE'::text, 'COMP'::text, 'MKR'::text, 'SUSHI'::text, 'YFI'::text, 'BAL'::text, 'CRV'::text, 'REN'::text, 'KNC'::text, 'ZRX'::text, 'BAT'::text, 'OMG'::text, 'LRC'::text, 'REP'::text, 'STORJ'::text, 'ANT'::text, 'GNT'::text, 'MLN'::text, 'FUN'::text, 'WAVES'::text, 'LSK'::text, 'ARK'::text, 'STRAT'::text, 'XEM'::text, 'QTUM'::text, 'BTG'::text, 'ZEC'::text, 'DASH'::text, 'XMR'::text, 'ETC'::text, 'BTCP'::text, 'BSV'::text, 'BCH'::text, 'LTC'::text, 'XRP'::text, 'TRX'::text, 'NEO'::text, 'GAS'::text, 'ONT'::text, 'XLM'::text, 'VET'::text, 'THETA'::text, 'HBAR'::text, 'FLOW'::text, 'MANA'::text, 'SAND'::text, 'AXS'::text, 'CHZ'::text, 'ENJ'::text, 'GALAX'::text, 'DOGE'::text, 'SHIB'::text, 'CAKE'::text, 'SUSHI'::text, 'BAKE'::text, 'BURGER'::text, 'ALICE'::text, 'FOR'::text, 'BEL'::text, 'LIT'::text, 'SXP'::text, 'TLM'::text, 'RAMP'::text, 'CHR'::text, 'FIS'::text, 'EPS'::text, 'AUTO'::text, 'TKO'::text, 'PUNDIX'::text, 'LINA'::text, 'PERL'::text, 'MDX'::text, 'CTK'::text, 'NULS'::text, 'COS'::text, 'MTL'::text, 'TOMO'::text, 'WAN'::text, 'DREP'::text, 'VITE'::text, 'MBL'::text, 'KMD'::text, 'JST'::text, 'SUN'::text, 'HIVE'::text, 'STEEM'::text, 'BLZ'::text]))) not valid;

alter table "public"."user_crypto_wallets" validate constraint "user_crypto_wallets_cryptocurrency_check";

alter table "public"."user_otp_verification" add constraint "user_otp_verification_unique_channel" UNIQUE using index "user_otp_verification_unique_channel";

alter table "public"."user_otp_verification" add constraint "user_otp_verification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_otp_verification" validate constraint "user_otp_verification_user_id_fkey";

alter table "public"."user_payment_details" add constraint "user_payment_details_payment_method_type_check" CHECK ((payment_method_type = ANY (ARRAY['bank_transfer'::text, 'crypto_wallet'::text, 'debit_card'::text]))) not valid;

alter table "public"."user_payment_details" validate constraint "user_payment_details_payment_method_type_check";

alter table "public"."user_payment_details" add constraint "user_payment_details_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_payment_details" validate constraint "user_payment_details_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_id_fkey" FOREIGN KEY (id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_id_fkey";

alter table "public"."users" add constraint "users_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."users" validate constraint "users_auth_user_id_fkey";

alter table "public"."users" add constraint "users_auth_user_id_key" UNIQUE using index "users_auth_user_id_key";

alter table "public"."users" add constraint "users_country_code_ck" CHECK (((country_code IS NULL) OR (country_code ~ '^[A-Z]{2}$'::text))) not valid;

alter table "public"."users" validate constraint "users_country_code_ck";

alter table "public"."wallets" add constraint "wallets_reserved_le_balance_check" CHECK (((balance >= 0) AND (reserved_cents >= 0) AND (reserved_cents <= balance))) not valid;

alter table "public"."wallets" validate constraint "wallets_reserved_le_balance_check";

alter table "public"."wallets" add constraint "wallets_user_id_currency_key" UNIQUE using index "wallets_user_id_currency_key";

alter table "public"."wallets" add constraint "wallets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."wallets" validate constraint "wallets_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION app_private.place_trade(p_user_id uuid, p_asset_id text, p_asset_name text, p_direction text, p_price numeric, p_quantity numeric, p_total_cost numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.execute_trade(p_user_id uuid, p_direction text, p_total_cost numeric, p_asset_id text, p_asset_name text, p_price numeric, p_quantity numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
-- Your existing DECLARE block
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_n8n_from_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  payload jsonb;
  _resp jsonb;
begin
  -- Build simplified payload for n8n
  payload := jsonb_build_object(
    'event', TG_OP,
    'table', TG_TABLE_NAME,
    'at', now(),
    'user', jsonb_build_object(
      'id',          NEW.id,
      'full_name',   NEW.full_name,
      'email',       NEW.email,
      'phone_e164',  NEW.phone_e164,
      'dob',         NEW.dob
    )
  );

  -- Post to your new n8n webhook
  select (extensions.http_post(
    url          := 'https://sm-n8n-prod-u57860.vm.elestio.app/webhook/new-registration',
    content_type := 'application/json',
    content      := payload::text,
    headers      := '{"Content-Type":"application/json"}'
  )).content::jsonb
  into _resp;

  return NEW;

exception when others then
  perform pg_notify('app_warnings', 'notify_n8n_from_users failed: ' || sqlerrm);
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.place_trade(p_user_id uuid, p_asset_id text, p_asset_name text, p_direction text, p_price numeric, p_quantity numeric, p_total_cost numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- CREATE OR REPLACE FUNCTION public.transactions_notify_n8n()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- AS $function$
-- begin
--   begin
--     perform net.http_post(
--       url := 'https://n8n-pi8sd-u38477.vm.elestio.app/webhook/supabase/transactions-created',
--       headers := jsonb_build_object(
--         'Content-Type','application/json',
--         'X-Sharematch-Secret','9595f3a282fbbe6c3c7591c029eefc983560038616f3ef2f'
--       ),
--       body := row_to_json(NEW)::text,
--       timeout_milliseconds := 5000
--     );
--   exception when others then
--     raise notice 'n8n webhook failed: %', SQLERRM;
--   end;

--   return NEW;
-- end;
-- $function$
-- ;

grant delete on table "public"."assets" to "anon";

grant insert on table "public"."assets" to "anon";

grant references on table "public"."assets" to "anon";

grant select on table "public"."assets" to "anon";

grant trigger on table "public"."assets" to "anon";

grant truncate on table "public"."assets" to "anon";

grant update on table "public"."assets" to "anon";

grant delete on table "public"."assets" to "authenticated";

grant insert on table "public"."assets" to "authenticated";

grant references on table "public"."assets" to "authenticated";

grant select on table "public"."assets" to "authenticated";

grant trigger on table "public"."assets" to "authenticated";

grant truncate on table "public"."assets" to "authenticated";

grant update on table "public"."assets" to "authenticated";

grant delete on table "public"."assets" to "service_role";

grant insert on table "public"."assets" to "service_role";

grant references on table "public"."assets" to "service_role";

grant select on table "public"."assets" to "service_role";

grant trigger on table "public"."assets" to "service_role";

grant truncate on table "public"."assets" to "service_role";

grant update on table "public"."assets" to "service_role";

grant delete on table "public"."company_bank_accounts" to "anon";

grant insert on table "public"."company_bank_accounts" to "anon";

grant references on table "public"."company_bank_accounts" to "anon";

grant select on table "public"."company_bank_accounts" to "anon";

grant trigger on table "public"."company_bank_accounts" to "anon";

grant truncate on table "public"."company_bank_accounts" to "anon";

grant update on table "public"."company_bank_accounts" to "anon";

grant delete on table "public"."company_bank_accounts" to "authenticated";

grant insert on table "public"."company_bank_accounts" to "authenticated";

grant references on table "public"."company_bank_accounts" to "authenticated";

grant select on table "public"."company_bank_accounts" to "authenticated";

grant trigger on table "public"."company_bank_accounts" to "authenticated";

grant truncate on table "public"."company_bank_accounts" to "authenticated";

grant update on table "public"."company_bank_accounts" to "authenticated";

grant delete on table "public"."company_bank_accounts" to "service_role";

grant insert on table "public"."company_bank_accounts" to "service_role";

grant references on table "public"."company_bank_accounts" to "service_role";

grant select on table "public"."company_bank_accounts" to "service_role";

grant trigger on table "public"."company_bank_accounts" to "service_role";

grant truncate on table "public"."company_bank_accounts" to "service_role";

grant update on table "public"."company_bank_accounts" to "service_role";

grant delete on table "public"."news_articles" to "anon";

grant insert on table "public"."news_articles" to "anon";

grant references on table "public"."news_articles" to "anon";

grant select on table "public"."news_articles" to "anon";

grant trigger on table "public"."news_articles" to "anon";

grant truncate on table "public"."news_articles" to "anon";

grant update on table "public"."news_articles" to "anon";

grant delete on table "public"."news_articles" to "authenticated";

grant insert on table "public"."news_articles" to "authenticated";

grant references on table "public"."news_articles" to "authenticated";

grant select on table "public"."news_articles" to "authenticated";

grant trigger on table "public"."news_articles" to "authenticated";

grant truncate on table "public"."news_articles" to "authenticated";

grant update on table "public"."news_articles" to "authenticated";

grant delete on table "public"."news_articles" to "service_role";

grant insert on table "public"."news_articles" to "service_role";

grant references on table "public"."news_articles" to "service_role";

grant select on table "public"."news_articles" to "service_role";

grant trigger on table "public"."news_articles" to "service_role";

grant truncate on table "public"."news_articles" to "service_role";

grant update on table "public"."news_articles" to "service_role";

grant delete on table "public"."news_updates" to "anon";

grant insert on table "public"."news_updates" to "anon";

grant references on table "public"."news_updates" to "anon";

grant select on table "public"."news_updates" to "anon";

grant trigger on table "public"."news_updates" to "anon";

grant truncate on table "public"."news_updates" to "anon";

grant update on table "public"."news_updates" to "anon";

grant delete on table "public"."news_updates" to "authenticated";

grant insert on table "public"."news_updates" to "authenticated";

grant references on table "public"."news_updates" to "authenticated";

grant select on table "public"."news_updates" to "authenticated";

grant trigger on table "public"."news_updates" to "authenticated";

grant truncate on table "public"."news_updates" to "authenticated";

grant update on table "public"."news_updates" to "authenticated";

grant delete on table "public"."news_updates" to "service_role";

grant insert on table "public"."news_updates" to "service_role";

grant references on table "public"."news_updates" to "service_role";

grant select on table "public"."news_updates" to "service_role";

grant trigger on table "public"."news_updates" to "service_role";

grant truncate on table "public"."news_updates" to "service_role";

grant update on table "public"."news_updates" to "service_role";

grant delete on table "public"."positions" to "anon";

grant insert on table "public"."positions" to "anon";

grant references on table "public"."positions" to "anon";

grant select on table "public"."positions" to "anon";

grant trigger on table "public"."positions" to "anon";

grant truncate on table "public"."positions" to "anon";

grant update on table "public"."positions" to "anon";

grant delete on table "public"."positions" to "authenticated";

grant insert on table "public"."positions" to "authenticated";

grant references on table "public"."positions" to "authenticated";

grant select on table "public"."positions" to "authenticated";

grant trigger on table "public"."positions" to "authenticated";

grant truncate on table "public"."positions" to "authenticated";

grant update on table "public"."positions" to "authenticated";

grant delete on table "public"."positions" to "service_role";

grant insert on table "public"."positions" to "service_role";

grant references on table "public"."positions" to "service_role";

grant select on table "public"."positions" to "service_role";

grant trigger on table "public"."positions" to "service_role";

grant truncate on table "public"."positions" to "service_role";

grant update on table "public"."positions" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

grant delete on table "public"."user_compliance" to "anon";

grant insert on table "public"."user_compliance" to "anon";

grant references on table "public"."user_compliance" to "anon";

grant select on table "public"."user_compliance" to "anon";

grant trigger on table "public"."user_compliance" to "anon";

grant truncate on table "public"."user_compliance" to "anon";

grant update on table "public"."user_compliance" to "anon";

grant delete on table "public"."user_compliance" to "authenticated";

grant insert on table "public"."user_compliance" to "authenticated";

grant references on table "public"."user_compliance" to "authenticated";

grant select on table "public"."user_compliance" to "authenticated";

grant trigger on table "public"."user_compliance" to "authenticated";

grant truncate on table "public"."user_compliance" to "authenticated";

grant update on table "public"."user_compliance" to "authenticated";

grant delete on table "public"."user_compliance" to "service_role";

grant insert on table "public"."user_compliance" to "service_role";

grant references on table "public"."user_compliance" to "service_role";

grant select on table "public"."user_compliance" to "service_role";

grant trigger on table "public"."user_compliance" to "service_role";

grant truncate on table "public"."user_compliance" to "service_role";

grant update on table "public"."user_compliance" to "service_role";

grant delete on table "public"."user_crypto_wallets" to "anon";

grant insert on table "public"."user_crypto_wallets" to "anon";

grant references on table "public"."user_crypto_wallets" to "anon";

grant select on table "public"."user_crypto_wallets" to "anon";

grant trigger on table "public"."user_crypto_wallets" to "anon";

grant truncate on table "public"."user_crypto_wallets" to "anon";

grant update on table "public"."user_crypto_wallets" to "anon";

grant delete on table "public"."user_crypto_wallets" to "authenticated";

grant insert on table "public"."user_crypto_wallets" to "authenticated";

grant references on table "public"."user_crypto_wallets" to "authenticated";

grant select on table "public"."user_crypto_wallets" to "authenticated";

grant trigger on table "public"."user_crypto_wallets" to "authenticated";

grant truncate on table "public"."user_crypto_wallets" to "authenticated";

grant update on table "public"."user_crypto_wallets" to "authenticated";

grant delete on table "public"."user_crypto_wallets" to "service_role";

grant insert on table "public"."user_crypto_wallets" to "service_role";

grant references on table "public"."user_crypto_wallets" to "service_role";

grant select on table "public"."user_crypto_wallets" to "service_role";

grant trigger on table "public"."user_crypto_wallets" to "service_role";

grant truncate on table "public"."user_crypto_wallets" to "service_role";

grant update on table "public"."user_crypto_wallets" to "service_role";

grant delete on table "public"."user_otp_verification" to "anon";

grant insert on table "public"."user_otp_verification" to "anon";

grant references on table "public"."user_otp_verification" to "anon";

grant select on table "public"."user_otp_verification" to "anon";

grant trigger on table "public"."user_otp_verification" to "anon";

grant truncate on table "public"."user_otp_verification" to "anon";

grant update on table "public"."user_otp_verification" to "anon";

grant delete on table "public"."user_otp_verification" to "authenticated";

grant insert on table "public"."user_otp_verification" to "authenticated";

grant references on table "public"."user_otp_verification" to "authenticated";

grant select on table "public"."user_otp_verification" to "authenticated";

grant trigger on table "public"."user_otp_verification" to "authenticated";

grant truncate on table "public"."user_otp_verification" to "authenticated";

grant update on table "public"."user_otp_verification" to "authenticated";

grant delete on table "public"."user_otp_verification" to "service_role";

grant insert on table "public"."user_otp_verification" to "service_role";

grant references on table "public"."user_otp_verification" to "service_role";

grant select on table "public"."user_otp_verification" to "service_role";

grant trigger on table "public"."user_otp_verification" to "service_role";

grant truncate on table "public"."user_otp_verification" to "service_role";

grant update on table "public"."user_otp_verification" to "service_role";

grant delete on table "public"."user_payment_details" to "anon";

grant insert on table "public"."user_payment_details" to "anon";

grant references on table "public"."user_payment_details" to "anon";

grant select on table "public"."user_payment_details" to "anon";

grant trigger on table "public"."user_payment_details" to "anon";

grant truncate on table "public"."user_payment_details" to "anon";

grant update on table "public"."user_payment_details" to "anon";

grant delete on table "public"."user_payment_details" to "authenticated";

grant insert on table "public"."user_payment_details" to "authenticated";

grant references on table "public"."user_payment_details" to "authenticated";

grant select on table "public"."user_payment_details" to "authenticated";

grant trigger on table "public"."user_payment_details" to "authenticated";

grant truncate on table "public"."user_payment_details" to "authenticated";

grant update on table "public"."user_payment_details" to "authenticated";

grant delete on table "public"."user_payment_details" to "service_role";

grant insert on table "public"."user_payment_details" to "service_role";

grant references on table "public"."user_payment_details" to "service_role";

grant select on table "public"."user_payment_details" to "service_role";

grant trigger on table "public"."user_payment_details" to "service_role";

grant truncate on table "public"."user_payment_details" to "service_role";

grant update on table "public"."user_payment_details" to "service_role";

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";

grant delete on table "public"."user_preferences" to "authenticated";

grant insert on table "public"."user_preferences" to "authenticated";

grant references on table "public"."user_preferences" to "authenticated";

grant select on table "public"."user_preferences" to "authenticated";

grant trigger on table "public"."user_preferences" to "authenticated";

grant truncate on table "public"."user_preferences" to "authenticated";

grant update on table "public"."user_preferences" to "authenticated";

grant delete on table "public"."user_preferences" to "service_role";

grant insert on table "public"."user_preferences" to "service_role";

grant references on table "public"."user_preferences" to "service_role";

grant select on table "public"."user_preferences" to "service_role";

grant trigger on table "public"."user_preferences" to "service_role";

grant truncate on table "public"."user_preferences" to "service_role";

grant update on table "public"."user_preferences" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."wallets" to "anon";

grant insert on table "public"."wallets" to "anon";

grant references on table "public"."wallets" to "anon";

grant select on table "public"."wallets" to "anon";

grant trigger on table "public"."wallets" to "anon";

grant truncate on table "public"."wallets" to "anon";

grant update on table "public"."wallets" to "anon";

grant delete on table "public"."wallets" to "authenticated";

grant insert on table "public"."wallets" to "authenticated";

grant references on table "public"."wallets" to "authenticated";

grant select on table "public"."wallets" to "authenticated";

grant trigger on table "public"."wallets" to "authenticated";

grant truncate on table "public"."wallets" to "authenticated";

grant update on table "public"."wallets" to "authenticated";

grant delete on table "public"."wallets" to "service_role";

grant insert on table "public"."wallets" to "service_role";

grant references on table "public"."wallets" to "service_role";

grant select on table "public"."wallets" to "service_role";

grant trigger on table "public"."wallets" to "service_role";

grant truncate on table "public"."wallets" to "service_role";

grant update on table "public"."wallets" to "service_role";


  create policy "Allow public read access on assets"
  on "public"."assets"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on assets"
  on "public"."assets"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage company bank accounts"
  on "public"."company_bank_accounts"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can view active company bank accounts"
  on "public"."company_bank_accounts"
  as permissive
  for select
  to authenticated
using ((is_active = true));



  create policy "Allow public read access on news_articles"
  on "public"."news_articles"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on news_articles"
  on "public"."news_articles"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow public read access on news_updates"
  on "public"."news_updates"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on news_updates"
  on "public"."news_updates"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow authenticated users full access on positions"
  on "public"."positions"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow public read access on positions"
  on "public"."positions"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on positions"
  on "public"."positions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can view their own positions"
  on "public"."positions"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Allow authenticated users full access on transactions"
  on "public"."transactions"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow public read access on transactions"
  on "public"."transactions"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on transactions"
  on "public"."transactions"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can insert their own transactions"
  on "public"."transactions"
  as permissive
  for insert
  to authenticated
with check ((user_id = (auth.uid())::text));



  create policy "Users can view their own transactions"
  on "public"."transactions"
  as permissive
  for select
  to authenticated
using ((user_id = (auth.uid())::text));



  create policy "Allow public read access on user_compliance"
  on "public"."user_compliance"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on user_compliance"
  on "public"."user_compliance"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage user crypto wallets"
  on "public"."user_crypto_wallets"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can insert their own crypto wallets"
  on "public"."user_crypto_wallets"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can update their own crypto wallets"
  on "public"."user_crypto_wallets"
  as permissive
  for update
  to authenticated
using ((id IN ( SELECT user_payment_details.payment_method_id
   FROM public.user_payment_details
  WHERE ((user_payment_details.user_id = auth.uid()) AND (user_payment_details.payment_method_type = 'crypto_wallet'::text)))));



  create policy "Users can view their own crypto wallets"
  on "public"."user_crypto_wallets"
  as permissive
  for select
  to authenticated
using ((id IN ( SELECT user_payment_details.payment_method_id
   FROM public.user_payment_details
  WHERE ((user_payment_details.user_id = auth.uid()) AND (user_payment_details.payment_method_type = 'crypto_wallet'::text)))));



  create policy "Allow service_role full access on otp table"
  on "public"."user_otp_verification"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on otp"
  on "public"."user_otp_verification"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role can manage all user payment details"
  on "public"."user_payment_details"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can delete their own payment details"
  on "public"."user_payment_details"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can insert their own payment details"
  on "public"."user_payment_details"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "Users can update their own payment details"
  on "public"."user_payment_details"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can view their own payment details"
  on "public"."user_payment_details"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Enable read access for all users"
  on "public"."user_preferences"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public read access on users"
  on "public"."users"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on users"
  on "public"."users"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Allow all access"
  on "public"."wallets"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Allow public read access on wallets"
  on "public"."wallets"
  as permissive
  for select
  to public
using (true);



  create policy "Allow service_role full access on wallets"
  on "public"."wallets"
  as permissive
  for all
  to service_role
using (true)
with check (true);


-- CREATE TRIGGER "transactions-insert-to-n8n" AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.transactions_notify_n8n();

CREATE TRIGGER trg_update_user_verified_status AFTER INSERT OR DELETE OR UPDATE OF verified_at, channel ON public.user_otp_verification FOR EACH ROW EXECUTE FUNCTION app_private.update_user_verified_status();

CREATE TRIGGER "users-insert-to-n8n" AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_from_users();

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.moddatetime();


