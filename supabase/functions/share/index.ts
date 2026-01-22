import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { restrictedCors } from "../_shared/cors.ts";

function generateShortCode() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

serve(async (req) => {
    const corsHeaders = restrictedCors(req.headers.get("origin"));

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const url = new URL(req.url);

        // GET: Resolve and Redirect
        if (req.method === "GET") {
            const code = url.searchParams.get("code");
            if (!code) {
                return new Response("Code required", { status: 400, headers: corsHeaders });
            }

            const { data: tradingAsset, error } = await supabase
                .from("market_index_trading_assets")
                .select(`
          id,
          assets!inner (
            name
          ),
          market_index_seasons!inner (
            market_indexes!inner (
              markets!inner (
                market_token
              )
            )
          )
        `)
                .eq("short_code", code)
                .single();

            if (error || !tradingAsset) {
                console.error("Resolve error:", error);
                return new Response("Link not found", { status: 404, headers: corsHeaders });
            }

            const asset = tradingAsset.assets;
            const marketIndex = tradingAsset.market_index_seasons.market_indexes;
            const marketToken = marketIndex.markets.market_token;

            const slug = asset.name.toLowerCase().replace(/\s+/g, "-");
            const longPath = `/asset/${marketToken}/${slug}`;

            const baseUrl = Deno.env.get("BASE_URL") || url.origin;
            return Response.redirect(`${baseUrl}${longPath}`, 301);
        }

        // POST: Generate Short Link
        if (req.method === "POST") {
            const { asset_id } = await req.json();
            if (!asset_id) {
                return new Response(JSON.stringify({ error: "asset_id required" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            // Check for existing code
            const { data: existing } = await supabase
                .from("market_index_trading_assets")
                .select("short_code")
                .eq("id", asset_id)
                .single();

            if (existing?.short_code) {
                return new Response(JSON.stringify({ short_code: existing.short_code }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Generate a few times if collision occurs
            let short_code = "";
            let isUnique = false;
            let attempts = 0;

            while (!isUnique && attempts < 5) {
                short_code = generateShortCode();
                const { data: collision } = await supabase
                    .from("market_index_trading_assets")
                    .select("id")
                    .eq("short_code", short_code)
                    .maybeSingle();

                if (!collision) isUnique = true;
                attempts++;
            }

            const { error: updateError } = await supabase
                .from("market_index_trading_assets")
                .update({ short_code })
                .eq("id", asset_id);

            if (updateError) {
                throw updateError;
            }

            return new Response(JSON.stringify({ short_code }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    } catch (err) {
        console.error("Share function error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
