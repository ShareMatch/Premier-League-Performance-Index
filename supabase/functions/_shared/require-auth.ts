import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AuthUserContext {
  authUserId: string;
  publicUser: {
    id: string;
    email: string | null;
    whatsapp_phone_e164: string | null;
  };
  supabase: ReturnType<typeof createClient>;
  error?: { status: number; message: string };
}

export const requireAuthUser = async (req: Request): Promise<AuthUserContext> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authUserId: "", publicUser: { id: "", email: null, whatsapp_phone_e164: null }, supabase: null as any, error: { status: 401, message: "Authorization header missing" } };
  }

  const token = authHeader.split(" ")[1];
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return { authUserId: "", publicUser: { id: "", email: null, whatsapp_phone_e164: null }, supabase: null as any, error: { status: 500, message: "Missing Supabase credentials" } };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) {
    return { authUserId: "", publicUser: { id: "", email: null, whatsapp_phone_e164: null }, supabase, error: { status: 401, message: "Invalid session" } };
  }

  const { data: publicUser, error: userErr } = await supabase
    .from("users")
    .select("id, email, whatsapp_phone_e164")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (userErr || !publicUser) {
    return { authUserId: "", publicUser: { id: "", email: null, whatsapp_phone_e164: null }, supabase, error: { status: 404, message: "Public user not found" } };
  }

  return {
    authUserId: userData.user.id,
    publicUser: publicUser as AuthUserContext["publicUser"],
    supabase,
  };
};
