import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSESEmail } from "../_shared/ses.ts";
import { generateOtpEmailHtml, generateOtpEmailSubject } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configurable via environment variables
const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("OTP_EXPIRY_MINUTES") ?? "10");
const MAX_ATTEMPTS = parseInt(Deno.env.get("OTP_MAX_ATTEMPTS") ?? "5");

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
    const sesRegion = Deno.env.get("SES_REGION") ?? "";
    const sesFromEmail = Deno.env.get("SES_FROM_EMAIL") ?? "";
    const sesAccessKey = Deno.env.get("SES_ACCESS_KEY") ?? "";
    const sesSecretKey = Deno.env.get("SES_SECRET_KEY") ?? "";

    // Validate required env vars
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!supabaseServiceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!sesRegion) missingVars.push("SES_REGION");
    if (!sesFromEmail) missingVars.push("SES_FROM_EMAIL");
    if (!sesAccessKey) missingVars.push("SES_ACCESS_KEY");
    if (!sesSecretKey) missingVars.push("SES_SECRET_KEY");

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
    // email: The user's current email (to look up the user)
    // targetEmail: The email to send OTP to (optional, defaults to email) - used for email changes
    // forProfileChange: Skip "already verified" check for profile changes
    const body = await req.json() as { email: string; targetEmail?: string; forProfileChange?: boolean };
    const email = String(body.email ?? "").trim().toLowerCase();
    const targetEmail = body.targetEmail ? String(body.targetEmail).trim().toLowerCase() : email;
    const forProfileChange = body.forProfileChange === true;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate target email format if different from current
    if (targetEmail !== email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(targetEmail)) {
        return new Response(
          JSON.stringify({ error: "Invalid target email format." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if target email is already registered to another user
      const { count: existingCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("email", targetEmail);

      if (existingCount && existingCount > 0) {
        return new Response(
          JSON.stringify({ error: "This email is already registered to another account." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user from database by current email
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, full_name, email_verified_at, email_otp_attempts")
      .eq("email", email)
      .single();

    if (fetchErr || !user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already verified (skip this check for profile changes)
    if (user.email_verified_at && !forProfileChange) {
      return new Response(
        JSON.stringify({ error: "Email already verified." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts
    if (user.email_otp_attempts >= MAX_ATTEMPTS) {
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
        email_otp_code: otpCode,
        email_otp_expires_at: expiry,
        email_otp_attempts: user.email_otp_attempts + 1,
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error storing OTP:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get optional config
    const logoImageUrl = Deno.env.get("LOGO_IMAGE_URL") ?? "https://sharematch.com/logo.png";

    // Generate email content using template
    const emailHtml = generateOtpEmailHtml({
      logoImageUrl,
      userFullName: user.full_name || "",
      otpCode,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });
    const emailSubject = generateOtpEmailSubject(otpCode);

    // Send email via SES - send to targetEmail (which may be different from user's current email)
    const emailResult = await sendSESEmail({
      accessKey: sesAccessKey,
      secretKey: sesSecretKey,
      region: sesRegion,
      from: sesFromEmail,
      to: targetEmail, // Send to target email (new email for profile changes)
      subject: emailSubject,
      html: emailHtml,
    });

    if (!emailResult.ok) {
      console.error("SES error:", emailResult.status, emailResult.body);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    return new Response(
      JSON.stringify({
        ok: true,
        message: `Verification code sent. Expires in ${OTP_EXPIRY_MINUTES} minute(s).`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-email-otp:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

