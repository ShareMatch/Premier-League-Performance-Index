import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parsePhoneNumberFromString } from "https://esm.sh/libphonenumber-js@1.10.53";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Normalize phone numbers to E.164 format
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
    const body = await req.json() as { whatsappPhone?: string; excludeUserId?: string };
    const rawPhone = body.whatsappPhone ? String(body.whatsappPhone).trim() : "";
    const excludeUserId = body.excludeUserId ? String(body.excludeUserId).trim() : null;

    if (!rawPhone) {
      return new Response(
        JSON.stringify({ error: "WhatsApp phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize the phone number
    const whatsappPhone = normalizePhone(rawPhone);
    console.log("Checking WhatsApp status for:", whatsappPhone);

    // Find user by WhatsApp phone, optionally excluding a user ID (for edit scenarios)
    let query = supabase
      .from("users")
      .select("id")
      .eq("whatsapp_phone_e164", whatsappPhone);
    
    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data: user, error: fetchUserErr } = await query.single();

    if (fetchUserErr || !user) {
      return new Response(
        JSON.stringify({
          exists: false,
          whatsappVerified: false,
          fullyVerified: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check WhatsApp verification from user_otp_verification table
    const { data: whatsappVerification } = await supabase
      .from("user_otp_verification")
      .select("verified_at")
      .eq("user_id", user.id)
      .eq("channel", "whatsapp")
      .not("verified_at", "is", null)
      .maybeSingle();

    // Fetch verification status from user_compliance
    const { data: compliance } = await supabase
      .from("user_compliance")
      .select("is_user_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    const whatsappVerified = whatsappVerification?.verified_at !== null;
    const isUserVerified = compliance?.is_user_verified === true;
    const fullyVerified = isUserVerified;

    return new Response(
      JSON.stringify({
        exists: true,
        whatsappVerified,
        fullyVerified,
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
