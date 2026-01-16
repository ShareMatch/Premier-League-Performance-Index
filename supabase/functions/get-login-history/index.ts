import { restrictedCors } from "../_shared/cors.ts";
import { requireAuthUser } from "../_shared/require-auth.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

interface LoginHistoryResult {
  id: string;
  created_at: string;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

// Dynamic CORS headers
// const corsHeaders will be set dynamically in the function

Deno.serve(async (req: Request) => {
  const corsHeaders = restrictedCors(req.headers.get('origin'));

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const authCheck = await requireAuthUser(req);
    if (authCheck.error) {
      return new Response(
        JSON.stringify({ error: authCheck.error.message }),
        { status: authCheck.error.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { user_id, limit = 5 } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use the authenticated client from auth context
    const supabase = authCheck.supabase;

    const { data: ownerUser, error: ownerError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authCheck.authUserId)
      .maybeSingle();

    if (ownerError || !ownerUser || ownerUser.id !== user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Query login history using the helper function
    const { data: loginHistory, error } = await supabase.rpc("get_user_login_history", {
      p_user_id: user_id,
      p_limit: limit,
    });

    if (error) {
      console.error("Error fetching login history:", error);
      
      // Fallback to direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from("login_history")
        .select("id, created_at, ip_address, device_type, browser, os")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (directError) {
        return new Response(
          JSON.stringify({ logins: [], error: directError.message }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const logins = (directData || []).map((log: LoginHistoryResult) => formatLoginEntry(log));
      return new Response(JSON.stringify({ logins }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format the login history for frontend
    const logins = (loginHistory || []).map((log: LoginHistoryResult) => formatLoginEntry(log));

    console.log(`Found ${logins.length} login events for user ${user_id}`);

    return new Response(JSON.stringify({ logins }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in get-login-history function:", error);
    
    return new Response(
      JSON.stringify({ logins: [], error: "Server error" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Helper to format login entry for frontend
function formatLoginEntry(log: LoginHistoryResult) {
  // Build device string
  let device = "Unknown device";
  if (log.browser && log.os) {
    device = `${log.browser} on ${log.os}`;
  } else if (log.browser) {
    device = log.browser;
  } else if (log.os) {
    device = log.os;
  }

  return {
    id: log.id,
    timestamp: log.created_at,
    ip: log.ip_address || "Unknown",
    device,
    deviceType: log.device_type || "unknown",
    successful: true,  // We only store successful logins
  };
}
