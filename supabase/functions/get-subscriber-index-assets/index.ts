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
    const auth = await verifyApiKey(req, "subscription:read");

    if (auth.ownerType !== "subscriber") {
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

    /* ---------------- QUERY (CORRECT JOIN GRAPH) ---------------- */
    const { data, error } = await supabase
      .from("subscriber_index_assets")
      .select(`
        units,
        market_index_seasons_asset!inner (
          external_ref_code,
          market_index_seasons_id,
          assets!inner (
            name
          )
        )
      `)
      .eq("subscriber_id", auth.ownerId)
      .eq(
        "market_index_seasons_asset.market_index_seasons_id",
        season.id
      );

    if (error) throw error;

    /* ---------------- RESPONSE ---------------- */
    return new Response(
      JSON.stringify({
        data: data.map(row => ({
          asset_ref_code:
            row.market_index_seasons_asset.external_ref_code,
          asset_name:
            row.market_index_seasons_asset.assets.name,
          units: row.units
        }))
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("SUBSCRIBER ASSET READ ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
