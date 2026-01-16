import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publicCors } from "../_shared/cors.ts";

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
        const body = await req.json() as { email: string; token: string };
        const email = String(body.email ?? "").trim().toLowerCase();
        const token = String(body.token ?? "").trim();

        if (!email || !token) {
            return new Response(
                JSON.stringify({ error: "Email and verification code are required." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- NEW LOGIC: Fetch all required data in a single JOIN ---
        // Fetch user ID, auth ID, phone, and BOTH OTP verification states
        const { data: userData, error: fetchErr } = await supabase
            .from("users")
            .select(`
                id, 
                auth_user_id,
                whatsapp_phone_e164,
                email_otp_state:user_otp_verification!inner(verified_at, otp_code, otp_expires_at),
                whatsapp_otp_state:user_otp_verification!inner(verified_at)
            `)
            .eq("email", email)
            .eq("email_otp_state.channel", "email")
            .eq("whatsapp_otp_state.channel", "whatsapp")
            .single();

        if (fetchErr || !userData) {
            console.error("Verification data fetch error:", fetchErr);
            return new Response(
                JSON.stringify({ error: "User or verification record not found." }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const emailOtpState = userData.email_otp_state?.[0] || {};
        const whatsappVerifiedAt = userData.whatsapp_otp_state?.[0]?.verified_at;

        // --- Check if already verified (uses the new verified_at location) ---
        if (emailOtpState.verified_at) {
            const nextStep = whatsappVerifiedAt ? "dashboard" : "whatsapp";

            let whatsappData = null;
            if (!whatsappVerifiedAt && userData.whatsapp_phone_e164) {
                whatsappData = {
                    masked: maskPhone(userData.whatsapp_phone_e164),
                    raw: userData.whatsapp_phone_e164,
                };
            }

            return new Response(
                JSON.stringify({
                    ok: true,
                    message: "Email already verified.",
                    nextStep,
                    whatsappData,
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- Verify OTP code ---
        if (emailOtpState.otp_code !== token) {
            return new Response(
                JSON.stringify({ error: "Invalid verification code." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check expiry
        if (!emailOtpState.otp_expires_at || new Date(emailOtpState.otp_expires_at).getTime() < Date.now()) {
            return new Response(
                JSON.stringify({ error: "Verification code has expired." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- NEW LOGIC: Update verification status in user_otp_verification ---
        const { error: updateErr } = await supabase
            .from("user_otp_verification")
            .update({
                verified_at: new Date().toISOString(),
                otp_code: null,
                otp_expires_at: null,
                otp_attempts: 0,
            })
            .eq("user_id", userData.id)
            .eq("channel", "email"); // Target the specific channel record

        if (updateErr) {
            console.error("Error updating verification status:", updateErr);
            return new Response(
                JSON.stringify({ error: "Verification successful but failed to update status." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Also confirm email in Supabase Auth if auth_user_id exists
        if (userData.auth_user_id) {
            const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
                userData.auth_user_id,
                { email_confirm: true }
            );

            if (authUpdateErr) {
                console.error("Error confirming email in Supabase Auth:", authUpdateErr);
                // Don't fail the request, just log the error
            }
        }

        // Prepare WhatsApp data for next step (Always directs to WhatsApp after successful email verification)
        let whatsappData = null;
        if (userData.whatsapp_phone_e164) {
            whatsappData = {
                masked: maskPhone(userData.whatsapp_phone_e164),
                raw: userData.whatsapp_phone_e164,
            };
        }


        return new Response(
            JSON.stringify({
                ok: true,
                message: "Email verified successfully.",
                nextStep: "whatsapp",
                whatsappData,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Error in verify-email-otp:", error);
        const message = error instanceof Error ? error.message : "Server error";
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});