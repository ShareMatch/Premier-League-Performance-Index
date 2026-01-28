import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    /* ---------------- AUTH ---------------- */
    const auth = await verifyApiKey(req, "lp:offers:read");

    if (auth.ownerType !== "lp") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    /* ---------------- PARAMS ---------------- */
    const url = new URL(req.url);
    const seasonCode = url.searchParams.get("market_index_season_code");

    if (!seasonCode) {
      return new Response(
        JSON.stringify({ error: "market_index_season_code is required" }),
        { status: 400 }
      );
    }

    /* ---------------- RESOLVE SEASON ---------------- */
    const { data: season, error: seasonError } = await supabase
      .from("market_index_seasons")
      .select("id")
      .eq("external_ref_code", seasonCode)
      .single();

    if (seasonError || !season) {
      throw new Error("Invalid market index season");
    }

    /* ---------------- QUERY (STRICT INVENTORY) ---------------- */
    const { data, error } = await supabase
      .from("liquidity_provider_index_assets")
      .select(`
        external_lp_asset_ref,
        units,
        market_index_seasons_asset!inner (
          external_ref_code,
          market_index_seasons_id,
          assets!inner (
            name
          )
        )
      `)
      .eq("liquidity_provider_id", auth.ownerId)
      .eq(
        "market_index_seasons_asset.market_index_seasons_id",
        season.id
      );

    if (error) throw error;

    /* ---------------- RESPONSE ---------------- */
    return new Response(
      JSON.stringify({
        data: data.map(row => ({
          lp_asset_ref_code: row.external_lp_asset_ref,
          asset_name:
            row.market_index_seasons_asset.assets.name,
          units: row.units
        }))
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("LP INVENTORY READ ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
