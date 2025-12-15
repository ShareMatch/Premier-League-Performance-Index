// ---------- send-email-otp/index.ts ----------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { generateOtpEmailHtml, generateOtpEmailSubject } from "../_shared/email-templates.ts";
import { sendSendgridEmail } from "../_shared/sendgrid.ts"; // NEW

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("OTP_EXPIRY_MINUTES") ?? "10");
const MAX_ATTEMPTS = parseInt(Deno.env.get("OTP_MAX_ATTEMPTS") ?? "5");

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // -- ENV VARS --
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY") ?? "";
        const sendgridFromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "";

        const missingVars = [];
        if (!supabaseUrl) missingVars.push("SUPABASE_URL");
        if (!supabaseServiceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
        if (!sendgridApiKey) missingVars.push("SENDGRID_API_KEY");
        if (!sendgridFromEmail) missingVars.push("SENDGRID_FROM_EMAIL");

        if (missingVars.length > 0) {
            console.error("Missing ENV vars:", missingVars);
            return new Response(
                JSON.stringify({ error: "Server misconfigured" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        const body = await req.json();
        const email = (body.email ?? "").trim().toLowerCase();

        if (!email) {
            return new Response(
                JSON.stringify({ error: "Email is required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // -- FETCH USER + OTP STATE IN ONE QUERY --
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

        if (fetchErr || !userData) {
            return new Response(
                JSON.stringify({ error: "User not found or OTP record missing." }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const userId = userData.id;
        const currentOtpState = userData.otp_state?.[0] || {};
        const currentAttempts = currentOtpState.otp_attempts ?? 0;

        if (currentOtpState.verified_at) {
            return new Response(
                JSON.stringify({ error: "Email already verified." }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (currentAttempts >= MAX_ATTEMPTS) {
            return new Response(
                JSON.stringify({ error: "Maximum OTP attempts reached." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // -- GENERATE OTP --
        const otpCode = generateOtp();
        const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

        // -- UPSERT OTP STATE --
        const { error: updateErr } = await supabase
            .from("user_otp_verification")
            .upsert({
                user_id: userId,
                channel: "email",
                otp_code: otpCode,
                otp_expires_at: expiry,
                otp_attempts: currentAttempts + 1,
            }, { onConflict: "user_id, channel" });

        if (updateErr) {
            console.error(updateErr);
            return new Response(
                JSON.stringify({ error: "Failed to update OTP state." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // -- GENERATE EMAIL BODY --
        const logoImageUrl = Deno.env.get("LOGO_IMAGE_URL") ?? "https://rwa.sharematch.me/logos/mobile-header-logo-matched.png";

        const emailHtml = generateOtpEmailHtml({
            logoImageUrl,
            userFullName: userData.full_name ?? "",
            otpCode,
            expiryMinutes: OTP_EXPIRY_MINUTES,
        });

        const emailSubject = generateOtpEmailSubject(otpCode);

        // -- SEND VIA SENDGRID --
        const emailResult = await sendSendgridEmail({
            apiKey: sendgridApiKey,
            from: sendgridFromEmail,
            to: email,
            subject: emailSubject,
            html: emailHtml,
        });

        if (!emailResult.ok) {
            console.error("SendGrid Error:", emailResult.status, emailResult.body);
            return new Response(
                JSON.stringify({ error: "Failed to send email." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                ok: true,
                message: `Verification code sent. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: "Server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
