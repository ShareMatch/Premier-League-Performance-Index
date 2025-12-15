// ---------- edit-user-profile/index.ts ----------
// Simple profile update function - NO OTP sending
// Used after verification is complete to just update user data
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EditPayload {
  // Identify user by current email
  currentEmail: string;
  // Fields that can be updated
  newEmail?: string;
  fullName?: string;
  dob?: string;
  countryOfResidence?: string;
  phone?: string;
  whatsappPhone?: string;
  // Skip verification reset - use when the new email/whatsapp was already verified via OTP
  emailAlreadyVerified?: boolean;
  whatsappAlreadyVerified?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Validate required env vars
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse request body
    const body: EditPayload = await req.json();
    const currentEmail = String(body.currentEmail ?? "").trim().toLowerCase();

    console.log("=== edit-user-profile called ===");
    console.log("currentEmail:", currentEmail);
    console.log("payload:", JSON.stringify(body));

    if (!currentEmail) {
      return new Response(
        JSON.stringify({ error: "Current email is required to identify user." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user by current email
    const { data: user, error: fetchErr } = await supabase
      .from("users")
      .select("id, auth_user_id, full_name, email, whatsapp_phone_e164")
      .eq("email", currentEmail)
      .single();

    if (fetchErr || !user) {
      console.error("User not found:", fetchErr);
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update object for public.users
    const updateData: Record<string, unknown> = {};

    // Track what changed
    let emailChanged = false;
    let whatsappChanged = false;
    const newEmail = body.newEmail ? String(body.newEmail).trim().toLowerCase() : null;
    const newWhatsappPhone = body.whatsappPhone ? String(body.whatsappPhone).trim() : null;

    // Handle email change
    if (newEmail && newEmail !== currentEmail) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if new email already exists (for a different user)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", newEmail)
        .neq("id", user.id)
        .single();

      if (existingUser) {
        // Check if the existing user is fully verified
        const { data: existingCompliance } = await supabase
          .from("user_compliance")
          .select("is_user_verified")
          .eq("user_id", existingUser.id)
          .maybeSingle();

        // If existing user is fully verified, block the email change
        if (existingCompliance?.is_user_verified) {
          return new Response(
            JSON.stringify({ error: "Account with this email already exists. Please use a different email." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      updateData.email = newEmail;
      emailChanged = true;
    }

    // Handle WhatsApp phone change
    if (newWhatsappPhone && newWhatsappPhone !== user.whatsapp_phone_e164) {
      // Validate phone format
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(newWhatsappPhone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format. Please include country code (e.g., +1234567890)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if new phone already exists (for a different user)
      const { data: existingUserWithPhone } = await supabase
        .from("users")
        .select("id")
        .eq("whatsapp_phone_e164", newWhatsappPhone)
        .neq("id", user.id)
        .single();

      if (existingUserWithPhone) {
        // Check if the existing user is fully verified
        const { data: existingCompliance } = await supabase
          .from("user_compliance")
          .select("is_user_verified")
          .eq("user_id", existingUserWithPhone.id)
          .maybeSingle();

        // If existing user is fully verified, block the phone change
        if (existingCompliance?.is_user_verified) {
          return new Response(
            JSON.stringify({ error: "Account with this phone number already exists. Please use a different number." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      updateData.whatsapp_phone_e164 = newWhatsappPhone;
      whatsappChanged = true;
    }

    // Handle other field updates
    if (body.fullName) {
      updateData.full_name = String(body.fullName).trim();
    }
    if (body.dob) {
      updateData.dob = String(body.dob).trim();
    }
    if (body.countryOfResidence) {
      updateData.country = String(body.countryOfResidence).trim();
    }
    if (body.phone) {
      const phoneE164 = String(body.phone).trim();
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      console.log("Phone update check:", { phone: phoneE164, matchesE164: phoneRegex.test(phoneE164) });
      if (phoneRegex.test(phoneE164)) {
        updateData.phone_e164 = phoneE164;
      } else if (phoneE164.length > 0) {
        // Only return error if user actually provided a phone number
        return new Response(
          JSON.stringify({ error: "Invalid phone format. Please include country code (e.g., +971561234567)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No changes to update." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Updating user with:", JSON.stringify(updateData));

    // Update user in database
    const { error: updateErr } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id);

    if (updateErr) {
      console.error("Error updating user:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update profile." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update auth.users email if changed
    if (emailChanged && user.auth_user_id) {
      const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
        user.auth_user_id,
        { email: newEmail! }
      );

      if (authUpdateErr) {
        console.error("Error updating auth email:", authUpdateErr);
        // Continue anyway - user record is updated
        console.log("Proceeding despite auth email update failure - user record updated successfully");
      }
    }

    console.log("Profile updated successfully");

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Profile updated successfully.",
        emailChanged,
        whatsappChanged,
        newEmail: emailChanged ? newEmail : undefined,
        newWhatsappPhone: whatsappChanged ? newWhatsappPhone : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in edit-user-profile:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
