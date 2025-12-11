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
        // --- Initialization and Environment Variable Checks ---
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const sesRegion = Deno.env.get("SES_REGION") ?? "";
        const sesFromEmail = Deno.env.get("SES_FROM_EMAIL") ?? "";
        const sesAccessKey = Deno.env.get("SES_ACCESS_KEY") ?? "";
        const sesSecretKey = Deno.env.get("SES_SECRET_KEY") ?? "";

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
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        // Parse request body
        const body = await req.json() as { email: string };
        const email = String(body.email ?? "").trim().toLowerCase();

        if (!email) {
            return new Response(
                JSON.stringify({ error: "Email address is required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- NEW LOGIC: Fetch User ID and OTP State in ONE query ---
        const { data: userData, error: fetchErr } = await supabase
            .from("users")
            .select(`
                id, 
                full_name,
                otp_state:user_otp_verification!inner (verified_at, otp_attempts, otp_code)
            `)
            .eq("email", email)
            .eq("otp_state.channel", "email")
            .limit(1)
            .single();

        if (fetchErr || !userData) {
            console.error("User or OTP record not found:", fetchErr);
            return new Response(
                JSON.stringify({ error: "User not found or verification record missing." }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Extract current state
        const userId = userData.id;
        const currentOtpState = userData.otp_state?.[0] || { verified_at: null, otp_attempts: 0 };
        const currentAttempts = currentOtpState.otp_attempts || 0;
        
        // Check if already verified
        if (currentOtpState.verified_at) {
            return new Response(
                JSON.stringify({ error: "Email already verified." }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check max attempts
        if (currentAttempts >= MAX_ATTEMPTS) {
            return new Response(
                JSON.stringify({ error: "Maximum OTP attempts reached. Please contact support." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Generate OTP and expiry
        const otpCode = generateOtp();
        const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

        // --- NEW LOGIC: UPSERT OTP state into user_otp_verification ---
        const { error: updateErr } = await supabase
            .from("user_otp_verification")
            .upsert({
                user_id: userId,
                channel: "email",
                otp_code: otpCode,
                otp_expires_at: expiry,
                otp_attempts: currentAttempts + 1,
            }, { onConflict: 'user_id, channel' });

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
            userFullName: userData.full_name || "",
            otpCode,
            expiryMinutes: OTP_EXPIRY_MINUTES,
        });
        const emailSubject = generateOtpEmailSubject(otpCode);

        // Send email via SES
        const emailResult = await sendSESEmail({
            accessKey: sesAccessKey,
            secretKey: sesSecretKey,
            region: sesRegion,
            from: sesFromEmail,
            to: email,
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