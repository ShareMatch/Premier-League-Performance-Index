import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSESEmail } from "../_shared/ses.ts";
import { generateOtpEmailHtml, generateOtpEmailSubject } from "../_shared/email-templates.ts";
import { sendWhatsAppOtp, formatPhoneForWhatsApp } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configurable via environment variables
const EMAIL_OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("OTP_EXPIRY_MINUTES") ?? "5");
const WHATSAPP_OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("WHATSAPP_OTP_EXPIRY_MINUTES") ?? "5");
const MAX_UPDATE_ATTEMPTS = parseInt(Deno.env.get("PROFILE_UPDATE_MAX_ATTEMPTS") ?? "5");

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface UpdatePayload {
  // Identify user by current email
  currentEmail: string;
  // Fields that can be updated
  newEmail?: string;
  fullName?: string;
  dob?: string;
  countryOfResidence?: string;
  phone?: string;
  whatsappPhone?: string;
  // Whether to send verification OTP for changed email/phone
  sendEmailOtp?: boolean;
  sendWhatsAppOtp?: boolean;
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
    const sesRegion = Deno.env.get("SES_REGION") ?? "";
    const sesFromEmail = Deno.env.get("SES_FROM_EMAIL") ?? "";
    const sesAccessKey = Deno.env.get("SES_ACCESS_KEY") ?? "";
    const sesSecretKey = Deno.env.get("SES_SECRET_KEY") ?? "";
    const wabaProfileId = Deno.env.get("WABA_PROFILE_ID") ?? "";
    const wabaApiKey = Deno.env.get("WABA_API_KEY") ?? "";

    // Validate required env vars
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
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
    const body: UpdatePayload = await req.json();
    const currentEmail = String(body.currentEmail ?? "").trim().toLowerCase();

    if (!currentEmail) {
      return new Response(
        JSON.stringify({ error: "Current email is required to identify user." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user by current email
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, auth_user_id, full_name, email, whatsapp_phone_e164, profile_update_attempts")
      .eq("email", currentEmail)
      .single();

    if (fetchErr || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check update attempts (rate limiting)
    const updateAttempts = user.profile_update_attempts || 0;
    if (updateAttempts >= MAX_UPDATE_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Maximum profile update attempts reached. Please contact support." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update object for public.users
    const updateData: Record<string, unknown> = {
      profile_update_attempts: updateAttempts + 1,
    };

    // Track what changed
    let emailChanged = false;
    let whatsappChanged = false;
    const newEmail = body.newEmail ? String(body.newEmail).trim().toLowerCase() : null;
    const newWhatsappPhone = body.whatsappPhone ? String(body.whatsappPhone).trim() : null;

    // Handle email change
    if (newEmail && newEmail !== currentEmail) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if new email already exists
      const { count: emailCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("email", newEmail)
        .neq("id", user.id);

      if (emailCount && emailCount > 0) {
        return new Response(
          JSON.stringify({ error: "This email is already registered." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      updateData.email = newEmail;
      emailChanged = true;
    }

    // Handle WhatsApp phone change
    if (newWhatsappPhone && newWhatsappPhone !== user.whatsapp_phone_e164) {
      // Validate phone format
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(newWhatsappPhone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format. Please include country code (e.g., +1234567890)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if new phone already exists
      const { count: phoneCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("whatsapp_phone_e164", newWhatsappPhone)
        .neq("id", user.id);

      if (phoneCount && phoneCount > 0) {
        return new Response(
          JSON.stringify({ error: "This WhatsApp number is already registered." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      updateData.whatsapp_phone_e164 = newWhatsappPhone;
      whatsappChanged = true;
    }

    // Handle other field updates
    if (body.fullName) {
      updateData.full_name = String(body.fullName).trim();
    }
    if (body.dob) {
      updateData.dob = String(body.dob).trim();
    }
    if (body.countryOfResidence) {
      updateData.country = String(body.countryOfResidence).trim();
    }
    if (body.phone) {
      const phoneE164 = String(body.phone).trim();
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (phoneRegex.test(phoneE164)) {
        updateData.phone_e164 = phoneE164;
      }
    }

    // Update user in database
    const { error: updateErr } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error updating user:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update profile." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update auth.users email if changed
    if (emailChanged && user.auth_user_id) {
      const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
        user.auth_user_id,
        { email: newEmail! }
      );

      if (authUpdateErr) {
        console.error("Error updating auth email:", authUpdateErr);
        // Rollback public.users email
        await supabase
          .from("users")
          .update({ email: currentEmail, email_verified_at: user.email_verified_at })
          .eq("id", user.id);

        return new Response(
          JSON.stringify({ error: "Failed to update authentication email." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send OTPs if requested
    let emailOtpSent = false;
    let whatsappOtpSent = false;

    // Send email OTP if email changed or explicitly requested
    if ((emailChanged || body.sendEmailOtp) && sesRegion && sesFromEmail && sesAccessKey && sesSecretKey) {
      const otpCode = generateOtp();
      const expiry = new Date(Date.now() + EMAIL_OTP_EXPIRY_MINUTES * 60000).toISOString();
      const targetEmail = newEmail || currentEmail;

      // Upsert OTP into user_otp_verification (channel = 'email')
      await supabase
        .from("user_otp_verification")
        .upsert({
          user_id: user.id,
          channel: "email",
          otp_code: otpCode,
          otp_expires_at: expiry,
          otp_attempts: 0,
          update_attempts: 0,
        }, { onConflict: 'user_id,channel' });

      // Send email
      const logoImageUrl = Deno.env.get("LOGO_IMAGE_URL") ?? "https://sharematch.com/logo.png";
      const emailHtml = generateOtpEmailHtml({
        logoImageUrl,
        userFullName: (updateData.full_name as string) || user.full_name || "",
        otpCode,
        expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES,
      });

      const emailResult = await sendSESEmail({
        accessKey: sesAccessKey,
        secretKey: sesSecretKey,
        region: sesRegion,
        from: sesFromEmail,
        to: targetEmail,
        subject: generateOtpEmailSubject(otpCode),
        html: emailHtml,
      });

      emailOtpSent = emailResult.ok;
    }

    // Send WhatsApp OTP if phone changed or explicitly requested
    if ((whatsappChanged || body.sendWhatsAppOtp) && wabaProfileId && wabaApiKey) {
      const otpCode = generateOtp();
      const expiry = new Date(Date.now() + WHATSAPP_OTP_EXPIRY_MINUTES * 60000).toISOString();
      const targetPhone = newWhatsappPhone || user.whatsapp_phone_e164;

      if (targetPhone) {
        // Upsert OTP into user_otp_verification (channel = 'whatsapp')
        await supabase
          .from("user_otp_verification")
          .upsert({
            user_id: user.id,
            channel: "whatsapp",
            otp_code: otpCode,
            otp_expires_at: expiry,
            otp_attempts: 0,
            update_attempts: 0,
          }, { onConflict: 'user_id,channel' });

        // Send WhatsApp
        const sendResult = await sendWhatsAppOtp({
          mobileNumber: formatPhoneForWhatsApp(targetPhone),
          otpCode,
          profileId: wabaProfileId,
          apiKey: wabaApiKey,
        });

        whatsappOtpSent = sendResult.ok;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Profile updated successfully.",
        emailChanged,
        whatsappChanged,
        emailOtpSent,
        whatsappOtpSent,
        newEmail: emailChanged ? newEmail : undefined,
        newWhatsappPhone: whatsappChanged ? newWhatsappPhone : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-user-profile:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

