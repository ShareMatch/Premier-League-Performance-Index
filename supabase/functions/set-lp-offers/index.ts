import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const auth = await verifyApiKey(req, "lp:offers:write");

    if (auth.ownerType !== "lp") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    const body = await req.json();
    const { market_index_season_code, offers } = body;

    if (!market_index_season_code || !Array.isArray(offers)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400 }
      );
    }

    /* Resolve season */
    const { data: season, error: seasonError } = await supabase
      .from("market_index_seasons")
      .select("id")
      .eq("external_ref_code", market_index_season_code)
      .single();

    if (seasonError || !season) {
      throw new Error("Invalid market index season");
    }

    let createdOffers = 0;

    for (const offer of offers) {
      const {
        lp_asset_code,
        buy_offer_price,
        sell_offer_price,
        units
      } = offer;

      if (!lp_asset_code || units <= 0) {
        throw new Error("Invalid offer payload");
      }

      /* Resolve LP asset */
      const { data: lpAsset, error: lpAssetError } = await supabase
        .from("liquidity_provider_index_assets")
        .select("id, market_index_seasons_asset_id, units")
        .eq("external_lp_asset_ref", lp_asset_code)
        .eq("liquidity_provider_id", auth.ownerId)
        .single();

      if (lpAssetError || !lpAsset) {
        throw new Error(`LP asset not found: ${lp_asset_code}`);
      }

      if (units > lpAsset.units) {
        throw new Error(`Insufficient units`);
      }

      /* Insert LP offer */
      const { data: lpOffer, error: lpOfferError } = await supabase
        .from("liquidity_provider_offers")
        .insert({
          liquidity_provider_index_assets_id: lpAsset.id,
          buy_offer_price,
          sell_offer_price,
          offered_units: units
        })
        .select()
        .single();

      if (lpOfferError || !lpOffer) {
        throw new Error("Failed to create LP offer");
      }

      /* Deactivate previous offers */
      await supabase
        .from("trading_asset_lp_offers")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq("market_index_seasons_asset_id", lpAsset.market_index_seasons_asset_id)
        .eq("is_active", true);

      /* Activate new offer */
      await supabase
        .from("trading_asset_lp_offers")
        .insert({
          market_index_seasons_asset_id: lpAsset.market_index_seasons_asset_id,
          liquidity_provider_offers_id: lpOffer.id,
          is_active: true,
          activated_at: new Date().toISOString()
        });

      /* 🔥 UPDATE MISA LIVE PRICES */
      await supabase
        .from("market_index_seasons_asset")
        .update({
          buy_price: sell_offer_price,   // LP sells → user buys
          sell_price: buy_offer_price,   // LP buys → user sells
          last_change: new Date().toISOString()
        })
        .eq("id", lpAsset.market_index_seasons_asset_id);

      createdOffers++;
    }

    return new Response(
      JSON.stringify({ success: true, createdOffers }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("LP OFFER ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
