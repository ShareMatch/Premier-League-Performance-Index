import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publicCors } from "../_shared/cors.ts";

// Parse User-Agent to extract device info
function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
    const result = { deviceType: "desktop", browser: "Unknown", os: "Unknown" };
    
    if (!ua) return result;
    
    // Detect OS
    if (/Windows/i.test(ua)) result.os = "Windows";
    else if (/Macintosh|Mac OS/i.test(ua)) result.os = "macOS";
    else if (/iPhone|iPad/i.test(ua)) result.os = "iOS";
    else if (/Android/i.test(ua)) result.os = "Android";
    else if (/Linux/i.test(ua)) result.os = "Linux";
    
    // Detect Browser
    if (/Edg\//i.test(ua)) result.browser = "Edge";
    else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) result.browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) result.browser = "Safari";
    else if (/Firefox/i.test(ua)) result.browser = "Firefox";
    else if (/Opera|OPR/i.test(ua)) result.browser = "Opera";
    
    // Detect Device Type
    if (/Mobile|iPhone|Android.*Mobile/i.test(ua)) result.deviceType = "mobile";
    else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) result.deviceType = "tablet";
    else result.deviceType = "desktop";
    
    return result;
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
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
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

            // 2. If user exists but is NOT fully verified, treat as "account doesn't exist"
            // This prevents information leakage about which emails have accounts
            if (userId && !isFullyVerified) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "No account found with this email. Please sign up to create an account.",
                    }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // If user exists in auth but not in our users table, this indicates incomplete registration
            if (!userId) {
                console.log("Auth succeeded but no user record found for email:", email, "auth_user_id:", authData?.user?.id);
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: "Account setup incomplete. Please complete registration or contact support."
                    }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
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

        // --- Store login in login_history table ---
        const clientIp = req.headers.get("cf-connecting-ip") || 
                         req.headers.get("x-real-ip") || 
                         req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                         null;
        const userAgent = req.headers.get("user-agent") || "";
        const deviceInfo = parseUserAgent(userAgent);

        // Insert login record (fire and forget - don't block the response)
        supabaseAdmin
            .from("login_history")
            .insert({
                user_id: userId,
                auth_user_id: authData.user.id,
                ip_address: clientIp,
                device_type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
            })
            .then(({ error: insertError }) => {
                if (insertError) {
                    console.error("Failed to store login history:", insertError);
                } else {
                    console.log("Login history stored for user:", userId);
                }
            });

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