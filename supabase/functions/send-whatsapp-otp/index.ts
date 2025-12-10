import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppOtp, formatPhoneForWhatsApp, maskPhone } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configurable via environment variables
const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("WHATSAPP_OTP_EXPIRY_MINUTES") ?? "2");
const MAX_ATTEMPTS = parseInt(Deno.env.get("WHATSAPP_OTP_MAX_ATTEMPTS") ?? "5");

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    const wabaProfileId = Deno.env.get("WABA_PROFILE_ID") ?? "";
    const wabaApiKey = Deno.env.get("WABA_API_KEY") ?? "";

    // Validate required env vars
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!supabaseServiceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!wabaProfileId) missingVars.push("WABA_PROFILE_ID");
    if (!wabaApiKey) missingVars.push("WABA_API_KEY");

    if (missingVars.length > 0) {
      console.error("Missing env vars:", missingVars);
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
    // phone/email: Used to identify the user
    // targetPhone: The phone number to send OTP to (for phone changes). Defaults to user's current number
    // forProfileChange: Skip "already verified" check for profile changes
    const body = await req.json() as { phone?: string; email?: string; targetPhone?: string; forProfileChange?: boolean };
    const phone = body.phone ? String(body.phone).trim() : null;
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const targetPhone = body.targetPhone ? String(body.targetPhone).trim() : null;
    const forProfileChange = body.forProfileChange === true;

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ error: "Phone number or email is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If targetPhone is specified, validate format and check it's not already registered
    if (targetPhone) {
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(targetPhone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if target phone is already registered to another user
      const { count: existingCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("whatsapp_phone_e164", targetPhone);

      if (existingCount && existingCount > 0) {
        return new Response(
          JSON.stringify({ error: "This WhatsApp number is already registered to another account." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build query to find user
    let query = supabase
      .from("users")
      .select("id, whatsapp_phone_e164, whatsapp_phone_verified_at, whatsapp_otp_attempts, email_verified_at");

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

    // Check if WhatsApp already verified (skip for profile changes - allow changing to new number)
    if (user.whatsapp_phone_verified_at && !forProfileChange) {
      return new Response(
        JSON.stringify({ error: "WhatsApp number already verified." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts
    const currentAttempts = user.whatsapp_otp_attempts || 0;
    if (currentAttempts >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Maximum OTP attempts reached. Please contact support." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP and expiry
    const otpCode = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

    // Store OTP in database
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        whatsapp_otp_code: otpCode,
        whatsapp_otp_expires_at: expiry,
        whatsapp_otp_attempts: currentAttempts + 1,
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error storing OTP:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp phone number - use targetPhone if provided (for profile changes)
    const whatsappPhone = targetPhone || user.whatsapp_phone_e164 || phone;

    if (!whatsappPhone) {
      return new Response(
        JSON.stringify({ error: "No WhatsApp phone number found." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send WhatsApp OTP to the target number
    const sendResult = await sendWhatsAppOtp({
      mobileNumber: formatPhoneForWhatsApp(whatsappPhone),
      otpCode: otpCode,
      profileId: wabaProfileId,
      apiKey: wabaApiKey,
    });

    if (!sendResult.ok) {
      console.error("WhatsApp send error:", sendResult.error, sendResult.body);
      return new Response(
        JSON.stringify({ error: "Failed to send WhatsApp message. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    const maskedPhone = maskPhone(whatsappPhone);

    return new Response(
      JSON.stringify({
        ok: true,
        message: `OTP sent to WhatsApp ${maskedPhone}. Expires in ${OTP_EXPIRY_MINUTES} minute(s).`,
        maskedPhone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-whatsapp-otp:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

