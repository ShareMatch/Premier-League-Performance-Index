// Create this as: supabase/functions/test-get-reset-link/index.ts
// ⚠️ ONLY enable this in non-production environments!

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // SECURITY: Only allow in non-production
  const env = Deno.env.get("ENVIRONMENT") ?? "production";
  if (env === "production") {
    return new Response(
      JSON.stringify({ error: "Not available in production" }),
      { status: 403 },
    );
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const publicUrl = Deno.env.get("PUBLIC_URL") ?? "http://localhost:3000";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Generate a fresh recovery link
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: email.toLowerCase(),
        options: { redirectTo: publicUrl },
      });

    if (linkError || !linkData) {
      return new Response(
        JSON.stringify({ error: "Failed to generate link" }),
        { status: 500 },
      );
    }

    const resetLink = linkData.properties?.action_link;

    return new Response(
      JSON.stringify({
        resetLink,
        email: email.toLowerCase(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});
