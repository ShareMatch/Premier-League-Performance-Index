import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parsePhoneNumberFromString } from "https://esm.sh/libphonenumber-js@1.10.53";
import { publicCors } from "../_shared/cors.ts";

interface RegistrationPayload {
    full_name: string;
    email: string;
    phone: string;
    whatsapp_phone?: string;
    dob: string;
    country_of_residence: string;
    password: string;
    receive_otp_sms?: boolean;
    agree_to_terms?: boolean;
    email_marketing?: boolean;
    whatsapp_marketing?: boolean;
    company?: string; // Honeypot
    referral_code?: string;
}

// --- HELPER FUNCTIONS (Database Accessors) ---

// Helper function to check the derived status from user_compliance.is_user_verified
async function isUserFullyVerified(supabase: any, userId: string): Promise<boolean> {
    if (!userId) return false;
    const { data: compliance, error } = await supabase
        .from("user_compliance")
        .select("is_user_verified")
        .eq("user_id", userId)
        .single();
    
    // Treat error (like record not found) as not verified
    return !error && compliance?.is_user_verified === true; 
}

// Helper function to handle cleanup (rollback) of user records
async function cleanupUserRecords(supabase: any, userId: string, authUserId: string | null) {
    console.log(`Starting cleanup for user ID: ${userId}`);
    
    // Delete child records first to satisfy potential FK constraints
    await supabase.from("user_payment_details").delete().eq("user_id", userId);
    await supabase.from("wallets").delete().eq("user_id", userId);
    await supabase.from("user_compliance").delete().eq("user_id", userId);
    await supabase.from("user_otp_verification").delete().eq("user_id", userId);
    
    // Delete core user record
    await supabase.from("users").delete().eq("id", userId);
    
    // Delete Auth record
    if (authUserId) {
        console.log(`Deleting associated auth user: ${authUserId}`);
        try {
            await supabase.auth.admin.deleteUser(authUserId);
        } catch (authDeleteErr) {
            console.error(`Failed to delete auth user ${authUserId}:`, authDeleteErr);
            // Don't fail the whole cleanup if auth delete fails
        }
    }
}

// --- MAIN SERVE FUNCTION ---
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
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        const body: RegistrationPayload = await req.json();

        // --- Extract and normalize fields ---
        const fullName = String(body.full_name ?? "").trim();
        const email = String(body.email ?? "").trim().toLowerCase();
        
        // Normalize phone numbers to E.164 format using libphonenumber-js
        // This properly handles all international formats
        const normalizePhone = (phoneStr: string): string => {
            const trimmed = String(phoneStr ?? "").trim();
            if (!trimmed) return "";
            
            try {
                const parsed = parsePhoneNumberFromString(trimmed);
                if (parsed && parsed.isValid()) {
                    return parsed.format("E.164");
                }
            } catch (e) {
                console.log("Phone parsing error:", e);
            }
            
            // Fallback: strip leading zeros after country code
            const match = trimmed.match(/^(\+\d+?)0*(\d+)$/);
            if (match) {
                return `${match[1]}${match[2]}`;
            }
            return trimmed;
        };
        
        const phone = normalizePhone(body.phone);
        const whatsappPhone = body.whatsapp_phone ? normalizePhone(body.whatsapp_phone) : phone;
        const dob = String(body.dob ?? "").trim();
        const country = String(body.country_of_residence ?? "").trim();
        const password = String(body.password ?? "").trim();
        const referralCode = body.referral_code ? String(body.referral_code).trim() : null;
        
        // ... (Validation and duplicate checks remain the same) ...

        // --- Check for existing user (Email) and handle abandonment ---
        const { data: existingUser } = await supabase
            .from("users")
            .select("id, auth_user_id")
            .eq("email", email)
            .single();

        if (existingUser) {
            const isVerified = await isUserFullyVerified(supabase, existingUser.id);
            if (isVerified) {
                return new Response(
                    JSON.stringify({
                        error: "Account already exists",
                        message: "An account with this email already exists. Please login instead.",
                        duplicates: ["email"],
                    }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            // Clean up incomplete user records
            await cleanupUserRecords(supabase, existingUser.id, existingUser.auth_user_id);
        }

        // --- Check for existing user (WhatsApp) and handle abandonment ---
        const { data: existingWhatsAppUser } = await supabase
            .from("users")
            .select("id, auth_user_id")
            .eq("whatsapp_phone_e164", whatsappPhone)
            .single();

        if (existingWhatsAppUser) {
            const isVerified = await isUserFullyVerified(supabase, existingWhatsAppUser.id);
            if (isVerified) {
                return new Response(
                    JSON.stringify({
                        error: "WhatsApp number already exists",
                        message: "An account with this WhatsApp number already exists.",
                        duplicates: ["whatsapp_phone"],
                    }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            // Clean up incomplete user records (only if different from email user already cleaned)
            if (!existingUser || existingWhatsAppUser.id !== existingUser.id) {
                await cleanupUserRecords(supabase, existingWhatsAppUser.id, existingWhatsAppUser.auth_user_id);
            }
        }

        // Note: We don't proactively check for orphaned auth users here
        // because listUsers() is expensive. Instead, we handle auth creation
        // failures below by cleaning up conflicting auth users.
        
        // --- Get request metadata ---
        const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
        const userAgent = req.headers.get("user-agent") || null;

        let userId: string;
        let authUserId: string;

        // --- Create auth user WITHOUT email confirmation (Standard Supabase Auth) ---
        let authData;
        let authErr;

        try {
            const result = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: false,
                user_metadata: { full_name: fullName, phone: phone },
            });
            authData = result.data;
            authErr = result.error;
        } catch (createErr) {
            authErr = createErr;
        }

        // Handle duplicate email errors by cleaning up conflicting auth user
        if (authErr && (authErr.message?.includes('already been registered') ||
                       authErr.message?.includes('already exists') ||
                       authErr.message?.includes('User already registered'))) {
            console.log("Auth user creation failed due to duplicate email, attempting cleanup...");

            try {
                // Try to find and delete the conflicting auth user
                const { data: authUsers } = await supabase.auth.admin.listUsers();
                const conflictingUser = authUsers?.users?.find(user => user.email === email);

                if (conflictingUser) {
                    console.log(`Deleting conflicting auth user: ${conflictingUser.id}`);
                    await supabase.auth.admin.deleteUser(conflictingUser.id);

                    // Retry auth user creation
                    console.log("Retrying auth user creation...");
                    const retryResult = await supabase.auth.admin.createUser({
                        email,
                        password,
                        email_confirm: false,
                        user_metadata: { full_name: fullName, phone: phone },
                    });

                    authData = retryResult.data;
                    authErr = retryResult.error;
                }
            } catch (cleanupErr) {
                console.error("Failed to cleanup conflicting auth user:", cleanupErr);
            }
        }

        if (authErr || !authData?.user) {
            console.error("Auth create error:", authErr);
            return new Response(
                JSON.stringify({ error: "Failed to create authentication account. Please try again." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        authUserId = authData.user.id;

        // --- 1. Create user in public.users table (Core Profile) ---
        const userPayload = {
            full_name: fullName,
            display_name: fullName,
            email,
            phone_e164: phone,
            whatsapp_phone_e164: whatsappPhone,
            dob,
            country,
            source_ip: sourceIp,
            // user_agent: userAgent, // Assuming this is kept
            auth_user_id: authUserId,
            referral_code: referralCode, 
        };

        const { data: userRow, error: userErr } = await supabase
            .from("users")
            .insert([userPayload])
            .select("id")
            .single();

        if (userErr || !userRow) {
            console.error("User insert error:", userErr);
            await supabase.auth.admin.deleteUser(authUserId);
            return new Response(
                JSON.stringify({ error: "Failed to create user record", details: userErr?.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        userId = userRow.id;

        // --- 2. Create initial user_compliance record ---
        const compliancePayload = {
            user_id: userId,
            consent_cooling_off: true,
            kyc_status: 'unverified',
            is_user_verified: false,
        };

        const { error: complianceErr } = await supabase
            .from("user_compliance")
            .insert([compliancePayload]);
            
        if (complianceErr) {
            console.error("Compliance insert error:", complianceErr);
            await cleanupUserRecords(supabase, userId, authUserId);
            return new Response(
                JSON.stringify({ error: "Failed to create compliance record", details: complianceErr?.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- 3. CREATE INITIAL OTP VERIFICATION RECORDS (NEW CRITICAL STEP) ---
        const otpRecordsPayload = [
            { user_id: userId, channel: "email" },
            { user_id: userId, channel: "whatsapp" }
        ];

        const { error: otpInsertErr } = await supabase
            .from("user_otp_verification")
            .insert(otpRecordsPayload);

        if (otpInsertErr) {
            console.error("OTP initialization error:", otpInsertErr);
            // Rollback everything if verification tracking fails
            await cleanupUserRecords(supabase, userId, authUserId);
            return new Response(
                JSON.stringify({ error: "Failed to initialize verification records." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- 4. Create wallet (Normalized) ---
        const { error: walletErr } = await supabase.from("wallets").insert([
            {
                user_id: userId,
                currency: "USD",
                balance: 1000000, 
                reserved_cents: 0,
            },
        ]);

        if (walletErr) {
            console.error("Wallet creation error (non-fatal):", walletErr);
        }

        // --- 5. Create user_preferences based on user's marketing consent ---
        const preferencesPayload = [
            { user_id: userId, channel: "email", permission: body.email_marketing ?? false },
            { user_id: userId, channel: "whatsapp", permission: body.whatsapp_marketing ?? false },
            { user_id: userId, channel: "sms", permission: false },
            { user_id: userId, channel: "personalized_marketing", permission: (body.email_marketing || body.whatsapp_marketing) ?? false },
            { user_id: userId, channel: "email_otp", permission: true },  // OTP channels default to true
            { user_id: userId, channel: "whatsapp_otp", permission: true },
        ];

        const { error: prefsErr } = await supabase
            .from("user_preferences")
            .insert(preferencesPayload);

        if (prefsErr) {
            console.error("User preferences creation error (non-fatal):", prefsErr);
            // Non-fatal - user can still register, preferences will use defaults
        }

        // --- Return success ---
        return new Response(
            JSON.stringify({
                ok: true,
                user_id: userId,
                auth_user_id: authUserId,
                email: email,
                requires_verification: true,
                message: "Registration successful. Please verify your email.",
            }),
            { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("Unhandled error:", error);
        const message = error instanceof Error ? error.message : "Server error";
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});