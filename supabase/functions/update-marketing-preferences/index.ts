import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuthUser } from "../_shared/require-auth.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Channels that users can update (excludes OTP channels)
const ALLOWED_CHANNELS = ["email", "whatsapp", "sms", "personalized_marketing"] as const;
type AllowedChannel = typeof ALLOWED_CHANNELS[number];

interface UpdatePreferencesPayload {
    email: string; // User's email to identify them
    preferences: {
        email?: boolean;
        whatsapp?: boolean;
        sms?: boolean;
        personalized_marketing?: boolean;
    };
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authContext = await requireAuthUser(req);
        if (authContext.error) {
            return new Response(
                JSON.stringify({ error: authContext.error.message }),
                { status: authContext.error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        const body: UpdatePreferencesPayload = await req.json();
        const { email, preferences } = body;

        const normalizedEmail = email?.toLowerCase().trim();
        if (normalizedEmail !== authContext.publicUser.email) {
            return new Response(
                JSON.stringify({ error: "Email mismatch" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!email) {
            return new Response(
                JSON.stringify({ error: "Email is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!preferences) {
            return new Response(
                JSON.stringify({ error: "Preferences object is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Find user by email
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .single();

        if (userError || !user) {
            console.error("User lookup error:", userError);
            return new Response(
                JSON.stringify({ error: "User not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const userId = user.id;
        if (userId !== authContext.publicUser.id) {
            return new Response(
                JSON.stringify({ error: "Forbidden" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Upsert each preference that was provided
        const upsertPromises: Promise<any>[] = [];
        
        for (const channel of ALLOWED_CHANNELS) {
            if (preferences[channel] !== undefined) {
                upsertPromises.push(
                    supabase.rpc("upsert_user_preference", {
                        p_user_id: userId,
                        p_channel: channel,
                        p_permission: preferences[channel],
                    })
                );
            }
        }

        // Wait for all upserts
        const results = await Promise.all(upsertPromises);
        
        // Check for errors
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            console.error("Upsert errors:", errors.map(e => e.error));
            return new Response(
                JSON.stringify({ error: "Failed to update some preferences" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch updated preferences using helper function
        const { data: updatedPrefs, error: fetchError } = await supabase
            .rpc("get_user_preferences", { p_user_id: userId });

        if (fetchError) {
            console.error("Fetch error:", fetchError);
        }

        return new Response(
            JSON.stringify({
                ok: true,
                message: "Marketing preferences updated successfully",
                preferences: updatedPrefs || {},
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
