// ---------- send-email-otp/index.ts ----------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { generateOtpEmailHtml, generateOtpEmailSubject } from "../_shared/email-templates.ts";
import { sendSendgridEmail } from "../_shared/sendgrid.ts"; // NEW
import { publicCors } from "../_shared/cors.ts";

const OTP_EXPIRY_MINUTES = parseInt(Deno.env.get("OTP_EXPIRY_MINUTES") ?? "10");
const MAX_ATTEMPTS = parseInt(Deno.env.get("OTP_MAX_ATTEMPTS") ?? "5");

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req: Request) => {
    const corsHeaders = publicCors(req.headers.get('origin'));

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
        const targetEmail = (body.targetEmail ?? "").trim().toLowerCase();
        // Handle both boolean true and string "true" for robustness
        const forProfileChange = body.forProfileChange === true || body.forProfileChange === "true";

        // Debug logging - v3 with more detail
        console.log("=== send-email-otp v3 ===");
        console.log("Request body:", JSON.stringify(body));
        console.log("Parsed values:", { email, targetEmail, forProfileChange });
        console.log("forProfileChange raw value:", body.forProfileChange, "type:", typeof body.forProfileChange);

        if (!email) {
            return new Response(
                JSON.stringify({ error: "Email is required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Determine which email to send OTP to
        const sendToEmail = forProfileChange && targetEmail ? targetEmail : email;

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

        // Debug logging - detailed check
        console.log("OTP state from DB:", JSON.stringify(currentOtpState));
        console.log("Decision check:", {
            forProfileChange,
            verified_at: currentOtpState.verified_at,
            willBlock: !forProfileChange && currentOtpState.verified_at,
            reason: forProfileChange ? "BYPASS (profile change)" : (currentOtpState.verified_at ? "BLOCK (already verified)" : "ALLOW (not verified)")
        });

        // For profile changes, skip the "already verified" check and allow re-verification
        // For initial signup, block if already verified
        if (!forProfileChange && currentOtpState.verified_at) {
            console.log(">>> BLOCKING: Email already verified and forProfileChange is false");
            return new Response(
                JSON.stringify({ error: "Email already verified." }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // For profile changes, reset attempts; otherwise enforce max attempts
        const attemptsToUse = forProfileChange ? 0 : currentAttempts;
        if (!forProfileChange && currentAttempts >= MAX_ATTEMPTS) {
            return new Response(
                JSON.stringify({ error: "Maximum OTP attempts reached." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // -- GENERATE OTP --
        const otpCode = generateOtp();
        const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

        // -- UPSERT OTP STATE --
        // For profile changes: reset verified_at and attempts
        const { error: updateErr } = await supabase
            .from("user_otp_verification")
            .upsert({
                user_id: userId,
                channel: "email",
                otp_code: otpCode,
                otp_expires_at: expiry,
                otp_attempts: forProfileChange ? 1 : currentAttempts + 1,
                verified_at: forProfileChange ? null : undefined, // Reset for profile change
            }, { onConflict: "user_id, channel" });

        if (updateErr) {
            console.error(updateErr);
            return new Response(
                JSON.stringify({ error: "Failed to update OTP state." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // -- GENERATE EMAIL BODY --
        const logoImageUrl = "https://rwa.sharematch.me/logos/white_wordmark_logo_on_green-no-bg.png";

        const emailHtml = generateOtpEmailHtml({
            logoImageUrl,
            userFullName: userData.full_name ?? "",
            otpCode,
            expiryMinutes: OTP_EXPIRY_MINUTES,
        });

        const emailSubject = generateOtpEmailSubject(otpCode);

        // -- SEND VIA SENDGRID --
        // Send to the target email (either the current email or new email for profile changes)
        const emailResult = await sendSendgridEmail({
            apiKey: sendgridApiKey,
            from: sendgridFromEmail,
            to: sendToEmail,
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
