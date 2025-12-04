import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone || "";
  return phone.slice(0, 3) + " *** *** ** " + phone.slice(-2);
}

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
    const body = await req.json() as { email: string; token: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const token = String(body.token ?? "").trim();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: "Email and verification code are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from database
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, auth_user_id, email_otp_code, email_otp_expires_at, email_verified_at, whatsapp_phone_verified_at, whatsapp_phone_e164")
      .eq("email", email)
      .single();

    if (fetchErr || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified
    if (user.email_verified_at) {
      const nextStep = user.whatsapp_phone_verified_at ? "dashboard" : "whatsapp";

      // Return WhatsApp data for redirect if needed
      let whatsappData = null;
      if (!user.whatsapp_phone_verified_at && user.whatsapp_phone_e164) {
        whatsappData = {
          masked: maskPhone(user.whatsapp_phone_e164),
          raw: user.whatsapp_phone_e164,
        };
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Email already verified.",
          nextStep,
          whatsappData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP code
    if (user.email_otp_code !== token) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (!user.email_otp_expires_at || new Date(user.email_otp_expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update verification status
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        email_verified_at: new Date().toISOString(),
        email_otp_code: null,
        email_otp_expires_at: null,
        email_otp_attempts: 0,
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error updating verification status:", updateErr);
      return new Response(
        JSON.stringify({ error: "Verification successful but failed to update status." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also confirm email in Supabase Auth if auth_user_id exists
    if (user.auth_user_id) {
      const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
        user.auth_user_id,
        { email_confirm: true }
      );

      if (authUpdateErr) {
        console.error("Error confirming email in Supabase Auth:", authUpdateErr);
        // Don't fail the request, just log the error
      }
    }

    // Prepare WhatsApp data for next step
    let whatsappData = null;
    if (user.whatsapp_phone_e164) {
      whatsappData = {
        masked: maskPhone(user.whatsapp_phone_e164),
        raw: user.whatsapp_phone_e164,
      };
    }


    return new Response(
      JSON.stringify({
        ok: true,
        message: "Email verified successfully.",
        nextStep: "whatsapp",
        whatsappData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in verify-email-otp:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

