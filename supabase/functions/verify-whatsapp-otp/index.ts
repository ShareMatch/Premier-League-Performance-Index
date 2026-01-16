import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publicCors } from "../_shared/cors.ts";

// Mask phone function kept as is
function maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return phone || "";
    return phone.slice(0, 3) + " *** *** ** " + phone.slice(-2);
}

serve(async (req: Request) => {
    const corsHeaders = publicCors(req.headers.get('origin'));

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // --- Initialization ---
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !supabaseServiceKey) {
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
        const body = await req.json() as { phone?: string; token: string; email?: string };
        const phone = body.phone ? String(body.phone).trim() : null;
        const token = String(body.token ?? "").trim();
        const email = body.email ? String(body.email).trim().toLowerCase() : null;

        if (!token) {
            return new Response(
                JSON.stringify({ error: "Verification code is required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!phone && !email) {
            return new Response(
                JSON.stringify({ error: "Phone number or email is required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- NEW LOGIC: Fetch User ID, Email Verified Status, and WhatsApp OTP State ---
        // We need: user.id, email_verified_at, and whatsapp OTP state (code, expiry, verified_at)
        let query = supabase
            .from("users")
            .select(`
                id, 
                email_otp_state:user_otp_verification!inner(verified_at),
                whatsapp_otp_state:user_otp_verification!inner(verified_at, otp_code, otp_expires_at)
            `)
            .eq("email_otp_state.channel", "email") // Ensure we filter for the email state
            .eq("whatsapp_otp_state.channel", "whatsapp"); // Ensure we filter for the whatsapp state
        
        // Apply filter based on input (either email or phone)
        if (email) {
            query = query.eq("email", email);
        } else if (phone) {
            query = query.eq("whatsapp_phone_e164", phone);
        }
        
        const { data: userData, error: fetchErr } = await query.single();

        if (fetchErr || !userData) {
            console.error("Verification data fetch error:", fetchErr);
            return new Response(
                JSON.stringify({ error: "User or verification record not found." }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Extract states
        const userId = userData.id;
        const emailVerifiedAt = userData.email_otp_state?.[0]?.verified_at;
        const whatsappOtpState = userData.whatsapp_otp_state?.[0] || {};

        // --- TEST MODE: Accept "123456" as valid OTP for automated testing ---
        const testMode = Deno.env.get("TEST_MODE") === "true";
        const isTestBypass = testMode && token === "123456";
        if (isTestBypass) {
            console.log("🧪 TEST MODE: Bypassing WhatsApp OTP verification with test code 123456");
        }
        
        // Check if email is verified first (Pre-requisite check)
        if (!emailVerifiedAt) {
            return new Response(
                JSON.stringify({ error: "Please verify your email first." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if WhatsApp already verified
        if (whatsappOtpState.verified_at) {
            return new Response(
                JSON.stringify({
                    ok: true,
                    message: "WhatsApp already verified.",
                    nextStep: "login", // Final step reached
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify OTP code (skip if test bypass)
        if (!isTestBypass && whatsappOtpState.otp_code !== token) {
            return new Response(
                JSON.stringify({ error: "Invalid verification code." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check expiry (skip if test bypass)
        if (!isTestBypass && (!whatsappOtpState.otp_expires_at || new Date(whatsappOtpState.otp_expires_at).getTime() < Date.now())) {
            return new Response(
                JSON.stringify({ error: "Verification code has expired." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- NEW LOGIC: Update verification status in user_otp_verification ---
        // This is the CRITICAL UPDATE that completes the second factor.
        const { error: updateErr } = await supabase
            .from("user_otp_verification")
            .update({
                verified_at: new Date().toISOString(),
                otp_code: null,
                otp_expires_at: null,
                otp_attempts: 0,
            })
            .eq("user_id", userId)
            .eq("channel", "whatsapp"); // Target the specific channel record

        if (updateErr) {
            console.error("Error updating WhatsApp verification status:", updateErr);
            return new Response(
                JSON.stringify({ error: "Verification successful but failed to update status." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // NOTE: The database trigger will automatically update user_compliance.is_user_verified = TRUE 
        // because both 'email' and 'whatsapp' now have a non-null verified_at timestamp.

        return new Response(
            JSON.stringify({
                ok: true,
                message: "WhatsApp verified successfully. You can now login.",
                nextStep: "login",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Error in verify-whatsapp-otp:", error);
        const message = error instanceof Error ? error.message : "Server error";
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});