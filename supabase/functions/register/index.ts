import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RegistrationPayload {
  full_name: string;
  email: string;
  phone: string;
  whatsapp_phone?: string;
  dob: string;
  country_of_residence: string;
  password: string;
  referral_code?: string | null;
  receive_otp_sms?: boolean;
  agree_to_terms?: boolean;
  // Honeypot field
  company?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse request body
    const body: RegistrationPayload = await req.json();

    // --- Honeypot check (spam prevention) ---
    if (body.company && String(body.company).trim()) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Extract and normalize fields ---
    const fullName = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const whatsappPhone = body.whatsapp_phone ? String(body.whatsapp_phone).trim() : phone;
    const dob = String(body.dob ?? "").trim();
    const country = String(body.country_of_residence ?? "").trim();
    const password = String(body.password ?? "").trim();
    const referralCode = body.referral_code ? String(body.referral_code).trim() : null;
    const receiveOtpSms = body.receive_otp_sms === true;
    const agreeToTerms = body.agree_to_terms === true;

    // --- Validation ---
    const required: { field: string; value: string }[] = [
      { field: "full_name", value: fullName },
      { field: "email", value: email },
      { field: "phone", value: phone },
      { field: "dob", value: dob },
      { field: "country", value: country },
      { field: "password", value: password },
    ];

    const missing = required.filter((r) => !r.value).map((r) => r.field);
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agreement validation
    if (!receiveOtpSms) {
      return new Response(
        JSON.stringify({ error: "You must agree to receive WhatsApp messages for OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agreeToTerms) {
      return new Response(
        JSON.stringify({ error: "You must agree to the Terms of Service and Privacy Policy" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Age validation (must be 18+)
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return new Response(
        JSON.stringify({ error: "You must be at least 18 years old to register" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Check for duplicates ---
    const duplicates: string[] = [];

    // Check email
    const { count: emailCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("email", email);
    if (emailCount && emailCount > 0) duplicates.push("email");

    // Check phone
    const { count: phoneCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("phone_e164", phone);
    if (phoneCount && phoneCount > 0) duplicates.push("phone");

    // Check WhatsApp if different from phone
    if (phone !== whatsappPhone) {
      const { count: whatsappCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("whatsapp_phone_e164", whatsappPhone);
      if (whatsappCount && whatsappCount > 0) duplicates.push("whatsapp_phone");
    }

    if (duplicates.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Account already exists with this information",
          duplicates,
          message: duplicates.includes("email")
            ? "An account with this email already exists. Please login instead."
            : "An account with this phone number already exists.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Get request metadata ---
    const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") ||
                     null;
    const userAgent = req.headers.get("user-agent") || null;

    // --- Create user in public.users table FIRST ---
    // IMPORTANT: email_verified_at and whatsapp_phone_verified_at are NULL
    // This ensures our custom verification flow works
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .insert([
        {
          full_name: fullName,
          email,
          phone_e164: phone,
          whatsapp_phone_e164: whatsappPhone,
          dob,
          country,
          // Verification fields - explicitly NULL
          email_verified_at: null,
          whatsapp_phone_verified_at: null,
          email_otp_code: null,
          email_otp_expires_at: null,
          email_otp_attempts: 0,
          whatsapp_otp_code: null,
          whatsapp_otp_expires_at: null,
          whatsapp_otp_attempts: 0,
          // Metadata
          source_ip: sourceIp,
          user_agent: userAgent,
          consent_cooling_off: true,
          // KYC fields - null initially
          kyc_status: null,
          country_code: null,
          address_line: null,
          city: null,
          region: null,
          postal_code: null,
          source_of_funds: null,
          inbound_currency: null,
          expected_monthly_volume_band: null,
        },
      ])
      .select("id")
      .single();

    if (userErr || !userRow) {
      console.error("User insert error:", userErr);
      return new Response(
        JSON.stringify({ error: "Failed to create user record", details: userErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userRow.id;

    // --- Create auth user WITHOUT email confirmation ---
    // Setting email_confirm to false prevents auto-verification
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // CRITICAL: Don't auto-confirm email
      user_metadata: {
        full_name: fullName,
        phone: phone,
        public_user_id: userId,
      },
    });

    if (authErr || !authData?.user) {
      console.error("Auth create error:", authErr);
      // Rollback: delete the user we just created
      await supabase.from("users").delete().eq("id", userId);
      return new Response(
        JSON.stringify({ error: "Failed to create authentication", details: authErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUserId = authData.user.id;

    // --- Link auth user to public.users ---
    const { error: linkErr } = await supabase
      .from("users")
      .update({ auth_user_id: authUserId })
      .eq("id", userId);

    if (linkErr) {
      console.error("Link error:", linkErr);
      // Attempt cleanup
      await supabase.auth.admin.deleteUser(authUserId);
      await supabase.from("users").delete().eq("id", userId);
      return new Response(
        JSON.stringify({ error: "Failed to link authentication", details: linkErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Create wallet ---
    const { error: walletErr } = await supabase.from("wallets").insert([
      {
        user_id: userId,
        currency: "USD",
        balance: 1000000, // $10,000.00 in cents (demo balance)
        reserved_cents: 0,
        full_name: fullName,
        email,
        phone,
        dob,
        country,
      },
    ]);

    if (walletErr) {
      console.error("Wallet creation error:", walletErr);
      // Continue anyway - wallet can be created later
      // Don't fail the registration for this
    }

    // Store referral code for future processing
    if (referralCode) {
      // Referral code handling will be implemented in future iteration
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

