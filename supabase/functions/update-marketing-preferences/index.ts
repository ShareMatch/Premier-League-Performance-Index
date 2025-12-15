import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UpdatePreferencesPayload {
    email: string; // User's email to identify them
    preferences: {
        email: boolean;
        whatsapp: boolean;
        sms: boolean;
        personalized_marketing: boolean;
    };
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
        });

        const body: UpdatePreferencesPayload = await req.json();
        const { email, preferences } = body;

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

        // Upsert user preferences
        const { error: upsertError } = await supabase
            .from("user_preferences")
            .upsert({
                id: userId,
                email: preferences.email ?? false,
                whatsapp: preferences.whatsapp ?? false,
                sms: preferences.sms ?? false,
                personalized_marketing: preferences.personalized_marketing ?? false,
            }, { onConflict: "id" });

        if (upsertError) {
            console.error("Upsert error:", upsertError);
            return new Response(
                JSON.stringify({ error: "Failed to update preferences", details: upsertError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch updated preferences
        const { data: updatedPrefs, error: fetchError } = await supabase
            .from("user_preferences")
            .select("*")
            .eq("id", userId)
            .single();

        if (fetchError) {
            console.error("Fetch error:", fetchError);
        }

        return new Response(
            JSON.stringify({
                ok: true,
                message: "Marketing preferences updated successfully",
                preferences: updatedPrefs,
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
