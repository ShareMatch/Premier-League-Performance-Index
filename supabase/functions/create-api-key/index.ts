import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const encoder = new TextEncoder();

async function sha256(input: string): Promise<string> {
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  try {
    /* ---------------- Admin Auth ---------------- */
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey !== Deno.env.get("ADMIN_MASTER_KEY")) {
      return new Response("Unauthorized", { status: 401 });
    }

    /* ---------------- Payload ---------------- */
    const { entity_type, entity_id } = await req.json();

    if (!["subscriber", "lp", "issuer"].includes(entity_type)) {
      return new Response("Invalid entity_type", { status: 400 });
    }

    if (!entity_id) {
      return new Response("entity_id required", { status: 400 });
    }

    /* ---------------- Generate API Key ---------------- */
    const rawKey = "sm_live_" + crypto.randomUUID().replaceAll("-", "");
    const salt = Deno.env.get("API_KEY_SALT")!;
    const keyHash = await sha256(rawKey + salt);

    /* ---------------- Scopes (FINAL) ---------------- */
    let scopes: string[] = [];

    switch (entity_type) {
      case "subscriber":
        scopes = [
          "subscription:read",
          "subscription:execute"
        ];
        break;

      case "lp":
        scopes = [
          "lp:offers:write",
          "lp:offers:read",
          "lp:trade"
        ];
        break;

      case "issuer":
        scopes = [
          "issuer:assets:read",
          "issuer:assets:write",
          "issuer:issuance:write"
        ];
        break;
    }

    /* ---------------- Store Hash ---------------- */
    const { error } = await supabase.rpc("create_api_key", {
      p_owner_type: entity_type,
      p_owner_id: entity_id,
      p_api_key_hash: keyHash,
      p_scopes: scopes
    });

    if (error) {
      console.error("API KEY CREATION ERROR:", error);
      return new Response("Failed to create key", { status: 500 });
    }

    /* ---------------- Return ONCE ---------------- */
    return new Response(
      JSON.stringify({
        api_key: rawKey,
        warning: "Store this securely. It will never be shown again."
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return new Response("Server error", { status: 500 });
  }
});
