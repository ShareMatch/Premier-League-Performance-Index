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
    const auth = await verifyApiKey(req, "subscription:write");

    if (auth.ownerType !== "subscriber") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    /* ---------- Payload ---------- */
    const body = await req.json();

    if (!body || !Array.isArray(body.prices) || body.prices.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400 }
      );
    }

    const prices = body.prices;

    /* ---------- Processing ---------- */
    for (const item of prices) {
      if (
        !item.subscriber_asset_code ||
        typeof item.subscription_price !== "number"
      ) {
        continue;
      }

      /* --- Resolve subscriber → MISA asset IDs --- */
      const { data: assetRows, error: fetchError } = await supabase
        .from("subscriber_index_assets")
        .select("market_index_seasons_asset_id")
        .eq("external_ref_code", item.subscriber_asset_code)
        .eq("subscriber_id", auth.ownerId);

      if (fetchError) {
        console.error(fetchError);
        throw new Error("Failed to resolve subscriber asset");
      }

      if (!assetRows || assetRows.length === 0) {
        continue; // silently skip unknown assets
      }

      const misaIds = assetRows.map(
        (row) => row.market_index_seasons_asset_id
      );

      /* --- Update MISA subscription price --- */
      const { error: updateError } = await supabase
        .from("market_index_seasons_asset")
        .update({
          subscription_price: item.subscription_price,
          subscribed_at: new Date().toISOString()
        })
        .in("id", misaIds);

      if (updateError) {
        console.error(updateError);
        throw new Error("Failed to update subscription price");
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
