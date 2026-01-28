import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const auth = await verifyApiKey(req, "subscription:write");

    if (auth.ownerType !== "subscriber") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    const body = await req.json();
    const { market_index_season_code, prices } = body;

    if (!market_index_season_code || !Array.isArray(prices)) {
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

    for (const item of prices) {
      if (
        !item.subscriber_asset_code ||
        typeof item.subscription_price !== "number"
      ) {
        continue;
      }

      /* Resolve subscriber assets → MISA */
      const { data: assets, error: assetError } = await supabase
        .from("subscriber_index_assets")
        .select("market_index_seasons_asset_id")
        .eq("external_ref_code", item.subscriber_asset_code)
        .eq("subscriber_id", auth.ownerId);

      if (assetError) throw assetError;
      if (!assets || assets.length === 0) continue;

      const misaIds = assets.map(a => a.market_index_seasons_asset_id);

      /* Update MISA live prices */
      const { error: updateError } = await supabase
        .from("market_index_seasons_asset")
        .update({
          subscription_price: item.subscription_price,
          buy_price: item.subscription_price,
          sell_price: item.subscription_price,
          subscribed_at: new Date().toISOString(),
          last_change: new Date().toISOString()
        })
        .in("id", misaIds);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("SUBSCRIPTION PRICE ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
