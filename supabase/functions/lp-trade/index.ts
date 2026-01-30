import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const auth = await verifyApiKey(req, "lp:trade");

    if (auth.ownerType !== "lp") {
      return new Response(
        JSON.stringify({ error: "Invalid entity type" }),
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { market_index_season_code } = body;

    const { data, error } = await supabase.rpc(
      "lp_primary_trade",
      {
        p_lp_id: auth.ownerId,
        p_market_index_season_code: market_index_season_code ?? null
      }
    );

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_assets: data.length,
        details: data
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("LP TRADE ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
