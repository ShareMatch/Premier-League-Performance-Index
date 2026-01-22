import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";
import { restrictedCors } from "../_shared/cors.ts";
import { sendSendgridEmail } from "../_shared/sendgrid.ts";
import { generateOrderConfirmationEmailHtml, generateOrderConfirmationEmailSubject } from "../_shared/email-templates.ts";

type TradeDirection = "buy" | "sell";

interface PlaceTradePayload {
  marketTradingAssetId: string;
  direction: TradeDirection;
  price: number;
  quantity: number;
  totalCost: number;
}

serve(async (req) => {
  const corsHeaders = restrictedCors(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authContext = await requireAuthUser(req);

    if (authContext.error) {
      return new Response(
        JSON.stringify({ error: authContext.error.message }),
        {
          status: authContext.error.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = (await req.json()) as PlaceTradePayload | null;

    if (
      !payload ||
      !payload.marketTradingAssetId ||
      !payload.direction ||
      (payload.direction !== "buy" && payload.direction !== "sell") ||
      typeof payload.price !== "number" ||
      typeof payload.quantity !== "number" ||
      typeof payload.totalCost !== "number"
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid trade payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authContext.publicUser.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authenticated user not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await authContext.supabase.rpc("place_trade", {
      p_user_id: userId,
      p_market_trading_asset_id: payload.marketTradingAssetId,
      p_direction: payload.direction,
      p_price: payload.price,
      p_quantity: payload.quantity,
      p_total_cost: payload.totalCost,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to place trade" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEND CONFIRMATION EMAIL ─────────────────────────────
    try {
      const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
      const sendgridFromEmail = Deno.env.get("SENDGRID_FROM_EMAIL");

      if (sendgridApiKey && sendgridFromEmail && authContext.publicUser.email) {
        // Fetch asset and user details for the email
        const [assetRes, userRes] = await Promise.all([
          authContext.supabase
            .from("market_index_trading_assets")
            .select("assets!inner(name)")
            .eq("id", payload.marketTradingAssetId)
            .single(),
          authContext.supabase
            .from("users")
            .select("full_name")
            .eq("id", userId)
            .single()
        ]);

        const assetName = assetRes.data?.assets?.name || "Unknown Asset";
        const userFullName = userRes.data?.full_name || "Valued User";
        const orderId = data?.orderId || `ORD-${Date.now()}`;

        const emailHtml = generateOrderConfirmationEmailHtml({
          logoImageUrl: "https://rwa.sharematch.me/logos/white_wordmark_logo_on_green-no-bg.png",
          userFullName,
          orderId,
          assetName,
          side: payload.direction,
          units: payload.quantity,
          pricePerUnit: payload.price,
          totalAmount: payload.totalCost
        });

        await sendSendgridEmail({
          apiKey: sendgridApiKey,
          from: sendgridFromEmail,
          to: authContext.publicUser.email,
          subject: generateOrderConfirmationEmailSubject(orderId, payload.direction),
          html: emailHtml
        });
      }
    } catch (emailErr) {
      // Don't fail the trade if email fails, just log it
      console.error("Failed to send confirmation email:", emailErr);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
