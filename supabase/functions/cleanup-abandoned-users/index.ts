/**
 * Cleanup Abandoned Users - Scheduled Cron Job
 * 
 * This function deletes users who have NOT completed BOTH email AND WhatsApp verification.
 * It should be scheduled to run daily via pg_cron or external cron service.
 * 
 * CLEANUP LOGIC:
 * - DELETE if: email_verified_at IS NULL OR whatsapp_phone_verified_at IS NULL
 * - KEEP if: email_verified_at IS NOT NULL AND whatsapp_phone_verified_at IS NOT NULL
 * 
 * In other words: Only fully verified users (both verifications complete) are kept.
 * Users with partial verification (one or none) are deleted after grace period.
 * 
 * Environment Variables:
 * - CLEANUP_GRACE_PERIOD_HOURS: Hours to wait before deleting (default: 24)
 * - CLEANUP_BATCH_SIZE: Max users to delete per run (default: 100)
 * - CLEANUP_API_KEY: Secret key to authorize cron calls
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CleanupResult {
  success: boolean;
  usersDeleted: number;
  walletsDeleted: number;
  authUsersDeleted: number;
  errors: string[];
  executionTimeMs: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const result: CleanupResult = {
    success: false,
    usersDeleted: 0,
    walletsDeleted: 0,
    authUsersDeleted: 0,
    errors: [],
    executionTimeMs: 0,
  };

  try {
    // --- Authorization ---
    // This endpoint should only be called by pg_cron or authorized systems
    const cleanupApiKey = Deno.env.get("CLEANUP_API_KEY") ?? "";
    const providedKey = req.headers.get("x-cleanup-api-key") ?? "";

    // Allow service role auth OR cleanup API key
    const authHeader = req.headers.get("authorization") ?? "";
    const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "INVALID");
    const isValidApiKey = cleanupApiKey && providedKey === cleanupApiKey;

    if (!isServiceRole && !isValidApiKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Configuration ---
    const gracePeriodHours = parseInt(Deno.env.get("CLEANUP_GRACE_PERIOD_HOURS") ?? "24");
    const batchSize = parseInt(Deno.env.get("CLEANUP_BATCH_SIZE") ?? "100");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      result.errors.push("Missing Supabase environment variables");
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // --- Calculate cutoff time ---
    const cutoffTime = new Date(Date.now() - gracePeriodHours * 60 * 60 * 1000).toISOString();

    // --- Find abandoned users ---
    // Users where:
    // - (email_verified_at IS NULL OR whatsapp_phone_verified_at IS NULL)
    // - AND created_at < cutoffTime (grace period passed)
    const { data: abandonedUsers, error: fetchError } = await supabase
      .from("users")
      .select("id, auth_user_id, email, created_at")
      .or("email_verified_at.is.null,whatsapp_phone_verified_at.is.null")
      .lt("created_at", cutoffTime)
      .limit(batchSize);

    if (fetchError) {
      result.errors.push(`Failed to fetch abandoned users: ${fetchError.message}`);
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!abandonedUsers || abandonedUsers.length === 0) {
      result.success = true;
      result.executionTimeMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({ ...result, message: "No abandoned users found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Delete users in batch ---
    for (const user of abandonedUsers) {
      try {
        // 1. Delete wallet (if exists)
        const { error: walletError } = await supabase
          .from("wallets")
          .delete()
          .eq("user_id", user.id);

        if (!walletError) {
          result.walletsDeleted++;
        } else if (!walletError.message.includes("No rows")) {
          result.errors.push(`Wallet delete error for user ${user.id}: ${walletError.message}`);
        }

        // 2. Delete public.users record
        const { error: userError } = await supabase
          .from("users")
          .delete()
          .eq("id", user.id);

        if (userError) {
          result.errors.push(`User delete error for ${user.id}: ${userError.message}`);
          continue; // Skip auth user deletion if public user delete failed
        }

        result.usersDeleted++;

        // 3. Delete auth.users record (if exists)
        if (user.auth_user_id) {
          const { error: authError } = await supabase.auth.admin.deleteUser(user.auth_user_id);

          if (authError) {
            // Auth user might already be deleted or not exist
            if (!authError.message.includes("not found")) {
              result.errors.push(`Auth delete error for ${user.auth_user_id}: ${authError.message}`);
            }
          } else {
            result.authUsersDeleted++;
          }
        }

      } catch (userError: unknown) {
        const errorMsg = userError instanceof Error ? userError.message : "Unknown error";
        result.errors.push(`Error processing user ${user.id}: ${errorMsg}`);
      }
    }

    result.success = result.errors.length === 0;
    result.executionTimeMs = Date.now() - startTime;

    // Log summary for monitoring
    console.log(`[Cleanup] Completed: ${result.usersDeleted} users, ${result.walletsDeleted} wallets, ${result.authUsersDeleted} auth users deleted in ${result.executionTimeMs}ms`);
    if (result.errors.length > 0) {
      console.error(`[Cleanup] Errors: ${result.errors.join("; ")}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    result.executionTimeMs = Date.now() - startTime;
    console.error(`[Cleanup] Fatal error: ${errorMsg}`);

    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

