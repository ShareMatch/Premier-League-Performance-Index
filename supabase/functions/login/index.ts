import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "******";
  return phone.slice(0, 3) + " *** *** ** " + phone.slice(-2);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
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

    // Check user verification status
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from("users")
      .select("id, email, email_verified_at, whatsapp_phone_verified_at, whatsapp_phone_e164")
      .eq("email", email)
      .single();

    if (fetchErr || !user) {
      // User not found in our users table - still try to login via Supabase Auth
      // This allows the error to be "Invalid email or password" consistently
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const { error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return new Response(
          JSON.stringify({ success: false, message: "Invalid email or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If somehow auth succeeded but user not in users table, this is unexpected
      return new Response(
        JSON.stringify({ success: false, message: "Account configuration error. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is verified
    if (!user.email_verified_at) {
      const phone = user.whatsapp_phone_e164 || "";
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please verify your email address before logging in.",
          requiresVerification: true,
          verificationType: "email",
          email: email,
          whatsappData: {
            masked: maskPhone(phone),
            raw: phone,
          },
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if WhatsApp is verified
    if (!user.whatsapp_phone_verified_at) {
      const phone = user.whatsapp_phone_e164 || "";
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please verify your WhatsApp number before logging in.",
          requiresVerification: true,
          verificationType: "whatsapp",
          email: email,
          whatsappData: {
            masked: maskPhone(phone),
            raw: phone,
          },
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Both verifications passed - attempt actual login
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
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

