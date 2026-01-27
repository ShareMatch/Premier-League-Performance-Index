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

export async function verifyApiKey(
  req: Request,
  requiredScope: string
) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing API key");
  }

  const rawKey = authHeader.replace("Bearer ", "");
  const salt = Deno.env.get("API_KEY_SALT")!;
  const keyHash = await sha256(rawKey + salt);

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("api_key_hash", keyHash)
    .eq("is_active", true)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    throw new Error("Invalid API key");
  }

  if (!data.scopes.includes(requiredScope)) {
    throw new Error("Insufficient scope");
  }

  return {
    ownerType: data.owner_type,
    ownerId: data.owner_id,
    scopes: data.scopes
  };
}
