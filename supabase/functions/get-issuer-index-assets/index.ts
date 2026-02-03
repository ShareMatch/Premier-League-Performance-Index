import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    /* ---------------- Auth ---------------- */
    const auth = await verifyApiKey(req, "issuer:assets:read");

    if (auth.ownerType !== "issuer") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    /* ---------------- Params ---------------- */
    const url = new URL(req.url);
    const marketIndexSeasonCode =
      url.searchParams.get("market_index_season_code");

    if (!marketIndexSeasonCode) {
      return new Response(
        JSON.stringify({ error: "market_index_season_code required" }),
        { status: 400 }
      );
    }

    /* ---------------- Resolve Market Index Season ---------------- */
    const { data: season, error: seasonError } = await supabase
      .from("market_index_seasons")
      .select("id")
      .eq("external_ref_code", marketIndexSeasonCode)
      .single();

    if (seasonError || !season) {
      throw new Error("Invalid market index season");
    }

    /* ---------------- Fetch Issuer Index Assets ---------------- */
    // First, get the relevant market_index_seasons_asset_ids
    const { data: misaIdsData, error: misaIdsError } = await supabase
      .from("market_index_seasons_asset")
      .select("id")
      .eq("market_index_seasons_id", season.id);

    if (misaIdsError) throw misaIdsError;
    const relevantMisaIds = misaIdsData.map((misa) => misa.id);

    // Then, fetch issuer_index_assets using these IDs
    const { data, error } = await supabase
      .from("issuer_index_assets")
      .select(`
        units,
        market_index_seasons_asset:market_index_seasons_asset_id (
          external_ref_code,
          subscription_price,
          min_value,
          max_value,
          assets:asset_id (
            name
          )
        )
      `)
      .eq("issuer_id", auth.ownerId)
      .in("market_index_seasons_asset_id", relevantMisaIds);

    if (error) throw error;

    /* ---------------- Shape Response ---------------- */
    const assets = (data ?? []).map((row: any) => ({
      asset_reference_code:
        row.market_index_seasons_asset.external_ref_code,
      asset_name:
        row.market_index_seasons_asset.assets.name,
      units: row.units,
      subscription_price:
        row.market_index_seasons_asset.subscription_price,
      min_value: row.market_index_seasons_asset.min_value,
      max_value: row.market_index_seasons_asset.max_value
    }));

    return new Response(
      JSON.stringify({
        market_index_season_code: marketIndexSeasonCode,
        assets
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("ISSUER ASSETS GET ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
