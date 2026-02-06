import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyApiKey } from "../_shared/_auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    /* ----------------------------------
       AUTH
    ---------------------------------- */
    const auth = await verifyApiKey(req, "lp:offers:write");

    if (!auth || auth.ownerType !== "lp") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized LP access"
        }),
        { status: 403 }
      );
    }

    /* ----------------------------------
       PAYLOAD
    ---------------------------------- */
    const body = await req.json().catch(() => ({}));
    const { market_index_season_code, offers } = body;

    if (
      typeof market_index_season_code !== "string" ||
      !Array.isArray(offers) ||
      offers.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid payload structure"
        }),
        { status: 400 }
      );
    }

    /* ----------------------------------
       STRUCTURAL VALIDATION ONLY
    ---------------------------------- */
    for (const o of offers) {
      if (
        typeof o.asset_reference_code !== "string" ||
        typeof o.buy_offer_price !== "number" ||
        typeof o.sell_offer_price !== "number"
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid offer object",
            invalid_offer: o ?? null
          }),
          { status: 400 }
        );
      }
    }

    /* ----------------------------------
       RPC
    ---------------------------------- */
    const { data, error } = await supabase.rpc(
      "set_lp_bulk_offer_prices",
      {
        p_lp_id: auth.ownerId,
        p_market_index_season_code: market_index_season_code,
        p_offers: offers
      }
    );

    if (error) {
      console.error("RPC ERROR:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: error.details ? JSON.parse(error.details) : null
        }),
        { status: 400 }
      );
    }

    /* ----------------------------------
       SUCCESS
    ---------------------------------- */
    return new Response(
      JSON.stringify({
        success: true,
        ...data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err: any) {
    console.error("LP OFFER EDGE ERROR:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message ?? "Unknown error"
      }),
      { status: 400 }
    );
  }
});
