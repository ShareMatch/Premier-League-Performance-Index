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
            console.error(`[send-whatsapp-otp] Missing required environment variables:`, missingVars);
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
        const body = await req.json() as { phone?: string; email?: string; targetPhone?: string; forProfileChange?: boolean };
        const phone = body.phone ? String(body.phone).trim() : null;
        const email = body.email ? String(body.email).trim().toLowerCase() : null;
        const targetPhone = body.targetPhone ? String(body.targetPhone).trim() : null;
        const forProfileChange = body.forProfileChange === true;

        if (!phone && !email) {
            console.error(`[send-whatsapp-otp] Validation failed: Neither phone nor email provided`);
            return new Response(
                JSON.stringify({ error: "Phone number or email is required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- NEW LOGIC: Fetch User, Email Verified Status, and WhatsApp OTP State ---
        let query = supabase
            .from("users")
            .select(`
                id,
                email_otp_state:user_otp_verification!left(verified_at),
                whatsapp_phone_e164,
                whatsapp_otp_state:user_otp_verification!left(verified_at, otp_attempts)
            `);

        if (email) {
            query = query.eq("email", email);
        } else if (phone) {
            query = query.eq("whatsapp_phone_e164", phone);
        }

        // Filter the joined OTP state to the correct channels
        query = query
            .eq("email_otp_state.channel", "email")
            .eq("whatsapp_otp_state.channel", "whatsapp");

        const { data: userData, error: fetchErr } = await query.limit(1).single();

        if (fetchErr || !userData) {
            console.error(`[send-whatsapp-otp] User lookup failed:`, fetchErr);
            return new Response(
                JSON.stringify({ error: "User not found or verification record missing." }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const userId = userData.id;
        const emailVerifiedAt = userData.email_otp_state?.[0]?.verified_at;
        const whatsappOtpState = userData.whatsapp_otp_state?.[0] || { verified_at: null, otp_attempts: 0 };
        const currentAttempts = whatsappOtpState.otp_attempts || 0;

        // Check if email is verified first (uses new email verified location)
        if (!emailVerifiedAt) {
            console.error(`[send-whatsapp-otp] Email not verified for user ${userId}`);
            return new Response(
                JSON.stringify({ error: "Please verify your email first." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // For profile changes, skip the "already verified" check and allow re-verification
        // For initial signup, block if already verified
        if (!forProfileChange && whatsappOtpState.verified_at) {
            console.error(`[send-whatsapp-otp] WhatsApp already verified for user ${userId}`);
            return new Response(
                JSON.stringify({ error: "WhatsApp number already verified." }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // For profile changes, reset attempts; otherwise enforce max attempts
        if (!forProfileChange && currentAttempts >= MAX_ATTEMPTS) {
            console.error(`[send-whatsapp-otp] Max OTP attempts reached for user ${userId}: ${currentAttempts}/${MAX_ATTEMPTS}`);
            return new Response(
                JSON.stringify({ error: "Maximum OTP attempts reached. Please contact support." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Generate OTP and expiry
        const otpCode = generateOtp();
        const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();

        // --- NEW LOGIC: UPSERT OTP state into user_otp_verification ---
        // For profile changes: reset verified_at and attempts
        const upsertData = {
            user_id: userId,
            channel: "whatsapp",
            otp_code: otpCode,
            otp_expires_at: expiry,
            otp_attempts: forProfileChange ? 1 : currentAttempts + 1,
            verified_at: forProfileChange ? null : undefined, // Reset for profile change
        };

        const { error: updateErr } = await supabase
            .from("user_otp_verification")
            .upsert(upsertData, { onConflict: 'user_id, channel' }); // Conflict keys match the UNIQUE constraint

        if (updateErr) {
            console.error(`[send-whatsapp-otp] Error storing OTP in database for user ${userId}:`, updateErr);
            return new Response(
                JSON.stringify({ error: "Failed to generate OTP." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get WhatsApp phone number - use targetPhone for profile changes if provided
        const whatsappPhone = (forProfileChange && targetPhone) ? targetPhone : (userData.whatsapp_phone_e164 || phone);

        if (!whatsappPhone) {
            console.error(`[send-whatsapp-otp] No WhatsApp phone number available for user ${userId}`);
            return new Response(
                JSON.stringify({ error: "No WhatsApp phone number found." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Send WhatsApp OTP
        const sendResult = await sendWhatsAppOtp({
            mobileNumber: formatPhoneForWhatsApp(whatsappPhone),
            otpCode: otpCode,
            profileId: wabaProfileId,
            apiKey: wabaApiKey,
        });

        if (!sendResult.ok) {
            console.error(`[send-whatsapp-otp] WhatsApp API call failed for user ${userId}:`, sendResult.error);
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
        console.error(`[send-whatsapp-otp] Unexpected error:`, error instanceof Error ? error.message : String(error));
        return new Response(
            JSON.stringify({ error: "Server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});