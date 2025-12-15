import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSendgridEmail } from "../_shared/sendgrid.ts";
import { generateOtpEmailHtml, generateOtpEmailSubject } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configurable via environment variables
const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("OTP_EXPIRY_MINUTES") ?? "10");
const MAX_UPDATE_ATTEMPTS = parseInt(Deno.env.get("EMAIL_UPDATE_MAX_ATTEMPTS") ?? "3");

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
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY") ?? "";
    const sendgridFromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "";

    // Validate required env vars
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!supabaseServiceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!sendgridApiKey) missingVars.push("SENDGRID_API_KEY");
    if (!sendgridFromEmail) missingVars.push("SENDGRID_FROM_EMAIL");

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
    const body = await req.json() as { currentEmail: string; newEmail: string };
    const currentEmail = String(body.currentEmail ?? "").trim().toLowerCase();
    const newEmail = String(body.newEmail ?? "").trim().toLowerCase();

    if (!currentEmail || !newEmail) {
      return new Response(
        JSON.stringify({ error: "Current and new email addresses are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate new email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user by current email
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, auth_user_id, full_name, email_verified_at, email_otp_attempts, email_update_attempts")
      .eq("email", currentEmail)
      .single();

    if (fetchErr || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is fully verified - can't change email after full verification
    const { data: userCompliance } = await supabase
      .from("user_compliance")
      .select("is_user_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userCompliance?.is_user_verified) {
      return new Response(
        JSON.stringify({ error: "Account is fully verified. Cannot change email." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check update attempts (rate limiting)
    const updateAttempts = user.email_update_attempts || 0;
    if (updateAttempts >= MAX_UPDATE_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Maximum email update attempts reached. Please contact support." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if new email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", newEmail)
      .neq("id", user.id)
      .single();

    if (existingUser) {
      // Check if the existing user is fully verified
      const { data: existingCompliance } = await supabase
        .from("user_compliance")
        .select("is_user_verified")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      // If existing user is fully verified, block the email change
      if (existingCompliance?.is_user_verified) {
        return new Response(
          JSON.stringify({ error: "This email belongs to an existing verified account. Please use a different email." }),
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
        email: newEmail,
        email_otp_code: otpCode,
        email_otp_expires_at: expiry,
        email_otp_attempts: 0, // Reset OTP attempts for new email
        email_update_attempts: updateAttempts + 1, // Track how many times they changed email
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error updating user email:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update auth.users email via admin API
    if (user.auth_user_id) {
      const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
        user.auth_user_id,
        { email: newEmail }
      );

      if (authUpdateErr) {
        console.error("Error updating auth email:", authUpdateErr);
        // Rollback public.users email
        await supabase
          .from("users")
          .update({ email: currentEmail })
          .eq("id", user.id);
        
        return new Response(
          JSON.stringify({ error: "Failed to update authentication email." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get optional config
    const logoImageUrl = Deno.env.get("LOGO_IMAGE_URL") ?? "https://rwa.sharematch.me/logos/mobile-header-logo-matched.png";

    // Generate email content using template
    const emailHtml = generateOtpEmailHtml({
      logoImageUrl,
      userFullName: user.full_name || "",
      otpCode,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });
    const emailSubject = generateOtpEmailSubject(otpCode);

    // Send email via SendGrid to new email
    const emailResult = await sendSendgridEmail({
      apiKey: sendgridApiKey,
      from: sendgridFromEmail,
      to: newEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (!emailResult.ok) {
      console.error("SendGrid error:", emailResult.status, emailResult.body);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Email updated. Verification code sent to ${newEmail}.`,
        newEmail,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in update-user-email:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

