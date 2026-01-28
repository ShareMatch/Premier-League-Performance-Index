import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  const { data, error } = await supabase
    .from("market_index_seasons")
    .select("external_ref_code, status")
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      data: data.map(s => ({
        market_index_season_code: s.external_ref_code,
        name: s.name,
        status: s.status
      }))
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
