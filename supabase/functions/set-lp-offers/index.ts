import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

/* ---------------- Supabase Client ---------------- */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* ---------------- Handler ---------------- */
serve(async (req) => {
  try {
    /* ---------- API Key Auth ---------- */
    const auth = await verifyApiKey(req, "lp:offers:write");

    if (auth.ownerType !== "lp") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    /* ---------- Payload ---------- */
    const body = await req.json();

    if (!body || !Array.isArray(body.offers) || body.offers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400 }
      );
    }

    /* ---------- Processing ---------- */
    for (const offer of body.offers) {
      const {
        lp_asset_code,
        buy_offer_price,
        sell_offer_price,
        units
      } = offer;

      if (!lp_asset_code || !units || units <= 0) {
        continue;
      }

      /* --- Resolve LP asset ownership --- */
      const { data: lpAssets, error: assetError } = await supabase
        .from("liquidity_provider_index_assets")
        .select("id, market_index_seasons_asset_id")
        .eq("external_lp_asset_ref", lp_asset_code)
        .eq("liquidity_provider_id", auth.ownerId);

      if (assetError) {
        console.error(assetError);
        throw new Error("Failed to resolve LP asset");
      }

      if (!lpAssets || lpAssets.length === 0) {
        continue;
      }

      const lpAsset = lpAssets[0];

      /* --- Create LP Offer --- */
      const { data: lpOffer, error: offerError } = await supabase
        .from("liquidity_provider_offers")
        .insert({
          liquidity_provider_index_assets_id: lpAsset.id,
          buy_offer_price,
          sell_offer_price,
          offered_units: units
        })
        .select()
        .single();

      if (offerError) {
        console.error(offerError);
        throw new Error("Failed to create LP offer");
      }

      /* --- Deactivate previous active offers --- */
      await supabase
        .from("trading_asset_lp_offers")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq("market_index_seasons_asset_id", lpAsset.market_index_seasons_asset_id)
        .eq("is_active", true);

      /* --- Activate new offer --- */
      const { error: linkError } = await supabase
        .from("trading_asset_lp_offers")
        .insert({
          market_index_seasons_asset_id: lpAsset.market_index_seasons_asset_id,
          liquidity_provider_offers_id: lpOffer.id,
          is_active: true,
          activated_at: new Date().toISOString()
        });

      if (linkError) {
        console.error(linkError);
        throw new Error("Failed to activate LP offer");
      }
    }

    /* ---------- Success ---------- */
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unauthorized"
      }),
      { status: 401 }
    );
  }
});
