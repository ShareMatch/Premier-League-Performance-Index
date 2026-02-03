// ---------- send-email-otp/index.ts ----------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { generateOtpEmailHtml, generateOtpEmailSubject } from "../_shared/email-templates.ts";
import { sendSendgridEmail } from "../_shared/sendgrid.ts";
import { publicCors } from "../_shared/cors.ts";

const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("OTP_EXPIRY_MINUTES") ?? "10");
const MAX_ATTEMPTS = parseInt(Deno.env.get("OTP_MAX_ATTEMPTS") ?? "5");

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
  const corsHeaders = publicCors(req.headers.get("origin"));

  const requestStart = Date.now();
  console.log("⏱️ [START] send-email-otp");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---------------- ENV ----------------
    const envStart = Date.now();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY") ?? "";
    const sendgridFromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "";

    console.log("⏱️ ENV load:", Date.now() - envStart, "ms");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ---------------- BODY PARSE ----------------
    const bodyStart = Date.now();
    const body = await req.json();
    console.log("⏱️ Body parse:", Date.now() - bodyStart, "ms");

    const email = (body.email ?? "").trim().toLowerCase();
    const targetEmail = (body.targetEmail ?? "").trim().toLowerCase();
    const forProfileChange = body.forProfileChange === true || body.forProfileChange === "true";

    const sendToEmail = forProfileChange && targetEmail ? targetEmail : email;

    // ---------------- DB FETCH ----------------
    const fetchStart = Date.now();

    const { data: userData, error: fetchErr } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        otp_state:user_otp_verification!inner (
          verified_at,
          otp_attempts,
          otp_code
        )
      `)
      .eq("email", email)
      .eq("otp_state.channel", "email")
      .single();

    console.log("⏱️ DB fetch (user + otp):", Date.now() - fetchStart, "ms");

    if (fetchErr || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found or OTP record missing." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.id;
    const currentOtpState = userData.otp_state?.[0] || {};
    const currentAttempts = currentOtpState.otp_attempts ?? 0;

    if (!forProfileChange && currentOtpState.verified_at) {
      return new Response(
        JSON.stringify({ error: "Email already verified." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!forProfileChange && currentAttempts >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: "Maximum OTP attempts reached." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------- OTP UPSERT ----------------
    const otpStart = Date.now();

    const otpCode = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

    const { error: updateErr } = await supabase
      .from("user_otp_verification")
      .upsert(
        {
          user_id: userId,
          channel: "email",
          otp_code: otpCode,
          otp_expires_at: expiry,
          otp_attempts: forProfileChange ? 1 : currentAttempts + 1,
          verified_at: forProfileChange ? null : undefined,
        },
        { onConflict: "user_id, channel" }
      );

    console.log("⏱️ OTP upsert:", Date.now() - otpStart, "ms");

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update OTP state." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------------- EMAIL TEMPLATE ----------------
    const templateStart = Date.now();

    const emailHtml = generateOtpEmailHtml({
      logoImageUrl: "https://rwa.sharematch.me/logos/white_wordmark_logo_on_green-no-bg.png",
      userFullName: userData.full_name ?? "",
      otpCode,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });

    const emailSubject = generateOtpEmailSubject(otpCode);

    console.log("⏱️ Email template gen:", Date.now() - templateStart, "ms");

    // ---------------- SENDGRID ----------------
    const emailStart = Date.now();

    const emailResult = await sendSendgridEmail({
      apiKey: sendgridApiKey,
      from: sendgridFromEmail,
      to: sendToEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("⏱️ SendGrid call:", Date.now() - emailStart, "ms");

    if (!emailResult.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("⏱️ TOTAL request time:", Date.now() - requestStart, "ms");

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Verification code sent. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    console.log("⏱️ TOTAL (error):", Date.now() - requestStart, "ms");

    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
