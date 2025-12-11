import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};


serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // --- Initialization ---
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ success: false, message: "Server configuration error" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse request body
        const body = await req.json() as { email?: string; password?: string };
        const email = body.email ? String(body.email).trim().toLowerCase() : "";
        const password = body.password ? String(body.password) : "";

        if (!email || !password) {
            return new Response(
                JSON.stringify({ success: false, message: "Email and password are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize admin client to check user verification status
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        let userId: string | null = null;
        let isFullyVerified = false;

        // --- STEP 1: Find User ID from Email (Robust Single Select) ---
        const { data: user, error: fetchUserErr } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (user && !fetchUserErr) {
            userId = user.id;

            // --- STEP 2: Check global verification status using the User ID ---
            const { data: complianceData, error: fetchComplianceErr } = await supabaseAdmin
                .from("user_compliance")
                .select("is_user_verified")
                .eq("user_id", userId)
                .single();

            // Check if data was found and the status is TRUE
            isFullyVerified = !fetchComplianceErr && complianceData?.is_user_verified === true;
        }


        // ----------------------------------------------------------------
        // Handle Block/Inconsistency/Auth Attempt (Unified Failure Flow)
        // ----------------------------------------------------------------

        if (!isFullyVerified) {
            // If the user is unverified OR if the user lookup failed entirely:
            // 1. Attempt the actual Supabase Auth sign-in. This is crucial for security.
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
            const { error: authError } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                // If Auth fails, return the standard security error.
                return new Response(
                    JSON.stringify({ success: false, message: "Invalid email or password" }),
                    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            
            // 2. If Auth succeeded but the user is NOT fully verified (i.e., isFullyVerified is false), 
            //    we block the login and return the mandatory verification message.
            if (userId && !isFullyVerified) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "Account not found or not fully verified. Please sign up again.",
                        requiresVerification: true,
                    }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // 3. If the code reaches here, it means Auth succeeded but the user record or compliance record 
            //    is inconsistent (e.g., auth exists, but user record does not).
            return new Response(
                JSON.stringify({ success: false, message: "Account configuration error. Please contact support." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- GLOBAL VERIFICATION PASSED: Attempt actual login (Only runs if isFullyVerified is TRUE) ---
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (authError || !authData.user) {
            // This should ideally not happen if the verification check passed, but included for safety.
            return new Response(
                JSON.stringify({ success: false, message: "Invalid email or password" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Login successful",
                user: {
                    id: authData.user.id,
                    email: authData.user.email,
                },
                session: authData.session,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Login error:", error);
        const message = error instanceof Error ? error.message : "Server error";
        return new Response(
            JSON.stringify({ success: false, message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});