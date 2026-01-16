import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSendgridEmail } from "../_shared/sendgrid.ts";
import { buildResetEmailHTML } from "../_shared/email-templates.ts";

import { publicCors } from "../_shared/cors.ts";

// Neutral response to prevent email enumeration attacks
const neutralResponse = (corsHeaders: any) =>
  new Response(
    JSON.stringify({
      ok: true,
      message: "If an account exists with this email, a reset link has been sent.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

serve(async (req: Request) => {
  const corsHeaders = publicCors(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY") ?? "";
    const sendgridFromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "";
    const publicUrl = Deno.env.get("PUBLIC_URL") ?? "https://www.sharematch.co";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return neutralResponse(corsHeaders);
    }

    if (!sendgridApiKey || !sendgridFromEmail) {
      console.error("Missing SendGrid configuration");
      return neutralResponse(corsHeaders);
    }

    // Parse request body
    const body = await req.json() as { email?: string; redirectUrl?: string };
    const emailRaw = body.email?.toString().trim();

    if (!emailRaw) {
      return neutralResponse(corsHeaders);
    }

    const email = emailRaw.toLowerCase();
    console.log("🔵 [forgot-password] Processing request for:", email);

    // Determine the redirect URL (priority: body > env > default)
    // NOTE: Don't use origin header as it might be from a different domain making the API call
    const baseUrl = body.redirectUrl || publicUrl;
    const cleanBaseUrl = baseUrl.replace(/\/$/, "").split("#")[0].split("?")[0];
    
    console.log("🔵 [forgot-password] Redirect URL from body:", body.redirectUrl);
    console.log("🔵 [forgot-password] Base URL for redirect:", cleanBaseUrl);

    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check if user exists in auth.users table
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = authUser?.users?.some(u => u.email?.toLowerCase() === email);

    if (authError || !userExists) {
      console.log("🟡 [forgot-password] User not found - returning neutral response");
      return neutralResponse(corsHeaders);
    }

    console.log("🟢 [forgot-password] User found for email:", email);

    // Generate the password reset link using Supabase Admin API
    // The redirectTo should point to your app's base URL
    // NOTE: Supabase will append #access_token=...&type=recovery to the URL
    // We detect type=recovery in the hash on the frontend to open the reset modal
    const redirectTo = cleanBaseUrl;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData) {
      console.error("🔴 [forgot-password] generateLink error:", linkError);
      return neutralResponse(corsHeaders);
    }

    console.log("🟢 [forgot-password] Reset link generated");

    // The action_link from generateLink is the full magic link
    const resetLink = linkData.properties?.action_link;

    if (!resetLink) {
      console.error("🔴 [forgot-password] No action_link in response");
      return neutralResponse(corsHeaders);
    }

    // Build the email HTML using the simplified template
    const logoImageUrl = Deno.env.get("LOGO_IMAGE_URL") ?? "https://sharematch.me/white_wordmark_logo_on_black_copy-removebg-preview.png";
    const emailHtml = buildResetEmailHTML(resetLink, logoImageUrl);
    const emailSubject = "Reset your ShareMatch password";

    console.log("🔵 [forgot-password] Sending email via SendGrid...");

    // Send the email via SendGrid
    const sendgridResult = await sendSendgridEmail({
      apiKey: sendgridApiKey,
      from: sendgridFromEmail,
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("🟢 [forgot-password] SendGrid result:", {
      ok: sendgridResult.ok,
      status: sendgridResult.status,
    });

    if (!sendgridResult.ok) {
      console.error("🔴 [forgot-password] SendGrid error:", sendgridResult.body);
    }

    // Always return neutral response
    return neutralResponse(corsHeaders);

  } catch (error: unknown) {
    console.error("🔴 [forgot-password] Unexpected error:", error);
    // Always return neutral response even on error
    return neutralResponse(corsHeaders);
  }
});

