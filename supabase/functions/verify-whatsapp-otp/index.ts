import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse request body
    // forProfileChange: Skip "already verified" check for profile changes (changing to new number)
    const body = await req.json() as { phone?: string; token: string; email?: string; forProfileChange?: boolean };
    const phone = body.phone ? String(body.phone).trim() : null;
    const token = String(body.token ?? "").trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const forProfileChange = body.forProfileChange === true;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Verification code is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: "Phone number or email is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query to find user
    let query = supabase
      .from("users")
      .select("id, whatsapp_otp_code, whatsapp_otp_expires_at, whatsapp_phone_verified_at, email_verified_at");

    if (email) {
      query = query.eq("email", email);
    } else if (phone) {
      query = query.eq("whatsapp_phone_e164", phone);
    }

    const { data: user, error: fetchErr } = await query.single();

    if (fetchErr || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is verified first (skip for profile changes if already logged in)
    if (!user.email_verified_at && !forProfileChange) {
      return new Response(
        JSON.stringify({ error: "Please verify your email first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if WhatsApp already verified (skip for profile changes - user is changing to new number)
    if (user.whatsapp_phone_verified_at && !forProfileChange) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: "WhatsApp already verified.",
          nextStep: "login",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP code
    if (user.whatsapp_otp_code !== token) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (!user.whatsapp_otp_expires_at || new Date(user.whatsapp_otp_expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update verification status
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        whatsapp_phone_verified_at: new Date().toISOString(),
        whatsapp_otp_code: null,
        whatsapp_otp_expires_at: null,
        whatsapp_otp_attempts: 0,
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error updating WhatsApp verification status:", updateErr);
      return new Response(
        JSON.stringify({ error: "Verification successful but failed to update status." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    return new Response(
      JSON.stringify({
        ok: true,
        message: "WhatsApp verified successfully. You can now login.",
        nextStep: "login",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-whatsapp-otp:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

