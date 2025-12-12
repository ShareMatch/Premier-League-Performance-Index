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
    // Get environment variables
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
    const body = await req.json() as { email?: string };
    const email = body.email ? String(body.email).trim().toLowerCase() : "";

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: find user by email
    const { data: user, error: fetchUserErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (fetchUserErr || !user) {
      return new Response(
        JSON.stringify({
          exists: false,
          emailVerified: false,
          whatsappVerified: false,
          fullyVerified: false,
          kyc_status: "unverified",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Check email verification from user_otp_verification table
    const { data: emailVerification, error: emailErr } = await supabase
      .from("user_otp_verification")
      .select("verified_at")
      .eq("user_id", user.id)
      .eq("channel", "email")
      .not("verified_at", "is", null)
      .maybeSingle();

    // Step 3: Check WhatsApp verification from user_otp_verification table
    const { data: whatsappVerification, error: whatsappErr } = await supabase
      .from("user_otp_verification")
      .select("verified_at")
      .eq("user_id", user.id)
      .eq("channel", "whatsapp")
      .not("verified_at", "is", null)
      .maybeSingle();

    // Step 4: fetch derived verification from user_compliance
    const { data: compliance, error: complianceErr } = await supabase
      .from("user_compliance")
      .select("is_user_verified, kyc_status")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailVerified = emailVerification?.verified_at !== null;
    const whatsappVerified = whatsappVerification?.verified_at !== null;
    const derivedVerified = compliance?.is_user_verified === true;
    const kycStatus = compliance?.kyc_status || "unverified";
    const fullyVerified = derivedVerified || (emailVerified && whatsappVerified);

    return new Response(
      JSON.stringify({
        exists: true,
        emailVerified,
        whatsappVerified,
        fullyVerified,
        kyc_status: kycStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

