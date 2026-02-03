import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const auth = await verifyApiKey(req, "subscription:execute");

    if (auth.ownerType !== "subscriber") {
      return new Response(
        JSON.stringify({ error: "Subscriber access only" }),
        { status: 403 }
      );
    }

    const body = await req.json();
    const { market_index_season_code, assets } = body;

    if (!market_index_season_code || !Array.isArray(assets)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "subscriber_assets_subscription",
      {
        p_subscriber_id: auth.ownerId,
        p_market_index_season_code: market_index_season_code,
        p_assets: assets
      }
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        subscribed_assets: data.length,
        details: data
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("SUBSCRIPTION ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
