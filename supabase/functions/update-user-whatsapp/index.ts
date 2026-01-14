import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendWhatsAppOtp, formatPhoneForWhatsApp } from "../_shared/whatsapp.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configurable via environment variables
const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("WHATSAPP_OTP_EXPIRY_MINUTES") ?? "2");
const MAX_UPDATE_ATTEMPTS = parseInt(Deno.env.get("WHATSAPP_UPDATE_MAX_ATTEMPTS") ?? "3");

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authContext = await requireAuthUser(req);
    if (authContext.error) {
      return new Response(
        JSON.stringify({ error: authContext.error.message }),
        { status: authContext.error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = authContext.supabase;

    const wabaProfileId = Deno.env.get("WABA_PROFILE_ID");
    const wabaApiKey = Deno.env.get("WABA_API_KEY");
    const missingVars: string[] = [];
    if (!wabaProfileId) missingVars.push("WABA_PROFILE_ID");
    if (!wabaApiKey) missingVars.push("WABA_API_KEY");

    if (missingVars.length > 0) {
      console.error("Missing env vars:", missingVars);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body - identify user by email
    const body = await req.json() as { email: string; newWhatsappPhone: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const newWhatsappPhone = String(body.newWhatsappPhone ?? "").trim();

    if (!email || !newWhatsappPhone) {
      return new Response(
        JSON.stringify({ error: "Email and new WhatsApp phone are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic phone validation - must start with + and have digits
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(newWhatsappPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Please include country code (e.g., +1234567890)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (email !== authContext.publicUser.email) {
      return new Response(
        JSON.stringify({ error: "Authenticated user does not match provided email." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, whatsapp_phone_e164, whatsapp_phone_verified_at, whatsapp_otp_attempts, whatsapp_update_attempts, email_verified_at")
      .eq("id", authContext.publicUser.id)
      .single();

    if (fetchErr || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is verified first
    if (!user.email_verified_at) {
      return new Response(
        JSON.stringify({ error: "Please verify your email first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is fully verified - can't change WhatsApp after full verification
    const { data: userCompliance } = await supabase
      .from("user_compliance")
      .select("is_user_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userCompliance?.is_user_verified) {
      return new Response(
        JSON.stringify({ error: "Account is fully verified. Cannot change WhatsApp number." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check update attempts (rate limiting)
    const updateAttempts = user.whatsapp_update_attempts || 0;
    if (updateAttempts >= MAX_UPDATE_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Maximum WhatsApp update attempts reached. Please contact support." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if new WhatsApp phone already exists
    const { data: existingUserWithPhone } = await supabase
      .from("users")
      .select("id")
      .eq("whatsapp_phone_e164", newWhatsappPhone)
      .neq("id", user.id)
      .single();

    if (existingUserWithPhone) {
      // Check if the existing user is fully verified
      const { data: existingCompliance } = await supabase
        .from("user_compliance")
        .select("is_user_verified")
        .eq("user_id", existingUserWithPhone.id)
        .maybeSingle();

      // If existing user is fully verified, block the phone change
      if (existingCompliance?.is_user_verified) {
        return new Response(
          JSON.stringify({ error: "This WhatsApp number belongs to an existing verified account. Please use a different number." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // If existing user is not fully verified, allow overwriting (don't return error)
    }

    // Generate new OTP
    const otpCode = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

    // Update user in public.users table
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        whatsapp_phone_e164: newWhatsappPhone,
        whatsapp_otp_code: otpCode,
        whatsapp_otp_expires_at: expiry,
        whatsapp_otp_attempts: 0, // Reset OTP attempts for new phone
        whatsapp_update_attempts: updateAttempts + 1, // Track how many times they changed phone
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error updating WhatsApp phone:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update WhatsApp number." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send WhatsApp OTP to new number
    const sendResult = await sendWhatsAppOtp({
      mobileNumber: formatPhoneForWhatsApp(newWhatsappPhone),
      otpCode: otpCode,
      profileId: wabaProfileId,
      apiKey: wabaApiKey,
    });

    if (!sendResult.ok) {
      console.error("WhatsApp send error:", sendResult.error, sendResult.body);
      // Rollback the phone update
      await supabase
        .from("users")
        .update({ whatsapp_phone_e164: user.whatsapp_phone_e164 })
        .eq("id", user.id);
      
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `WhatsApp number updated. OTP sent to ${newWhatsappPhone}.`,
        newWhatsappPhone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-user-whatsapp:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

