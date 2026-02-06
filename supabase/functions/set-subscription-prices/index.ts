import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    /* ---------- Issuer / System Auth ---------- */
    const auth = await verifyApiKey(req, "issuer:assets:write");

    if (auth.ownerType !== "issuer") {
      return new Response(
        JSON.stringify({ error: "Issuer access only" }),
        { status: 403 }
      );
    }

    /* ---------- Payload ---------- */
    const body = await req.json();
    const { market_index_season_code, assets } = body;

    if (!market_index_season_code || !Array.isArray(assets)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400 }
      );
    }

    /* ---------- Resolve Market Index Season ---------- */
    const { data: season, error: seasonError } = await supabase
      .from("market_index_seasons")
      .select("id")
      .eq("external_ref_code", market_index_season_code)
      .single();

    if (seasonError || !season) {
      throw new Error("Invalid market index season");
    }

    /* ---------- Fetch all assets in this season ---------- */
    const { data: seasonAssets, error: assetsError } = await supabase
      .from("market_index_seasons_asset")
      .select("external_ref_code, asset_id, assets(name)")
      .eq("market_index_seasons_id", season.id);

    if (assetsError) throw assetsError;

    const providedRefCodes = new Set(
      assets
        .filter((a) => a?.asset_reference_code)
        .map((a) => a.asset_reference_code)
    );

    /* ---------- Detect missing assets ---------- */
    const missingAssets = seasonAssets.filter(
      (a) => !providedRefCodes.has(a.external_ref_code)
    );

    if (missingAssets.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Subscription prices missing for some assets in market index season ${market_index_season_code}`,
          missing_assets: missingAssets.map((a) => ({
            asset_reference_code: a.external_ref_code,
            asset_name: a.assets?.name ?? null
          }))
        }),
        { status: 400 }
      );
    }

    /* ---------- Update Subscription Prices ---------- */
    for (const item of assets) {
      if (
        !item.asset_reference_code ||
        typeof item.subscription_price !== "number"
      ) {
        return new Response(
          JSON.stringify({
            error: "Invalid asset entry",
            asset_reference_code: item?.asset_reference_code ?? null
          }),
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("market_index_seasons_asset")
        .update({
          subscription_price: item.subscription_price,
          last_change: new Date().toISOString()
        })
        .eq("external_ref_code", item.asset_reference_code)
        .eq("market_index_seasons_id", season.id);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("ISSUER SUBSCRIPTION PRICE ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
