/**
 * Supabase Adapter for Agentic Testing
 *
 * This adapter provides direct database access for testing purposes:
 * - Read OTPs from user_otp_verification table
 * - Clean up test users after tests
 * - Query user verification status
 */
import { test as base } from "@playwright/test";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

// Types for the adapter
type SupabaseFixture = {
  client: SupabaseClient;
  createUser: (email: string, password: string) => Promise<any | null>;
  getEmailOtp: (email: string) => Promise<string | null>;
  getWhatsAppOtp: (email: string) => Promise<string | null>;
  getUserByEmail: (email: string) => Promise<any | null>;
  deleteTestUser: (email: string) => Promise<boolean>;
  isUserVerified: (
    email: string
  ) => Promise<{ email: boolean; whatsapp: boolean }>;
};

// Create Supabase client
const createSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "[Supabase Adapter] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    throw new Error("Supabase configuration missing. Check .env file.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
};

export const test = base.extend<{ supabaseAdapter: SupabaseFixture }>({
  supabaseAdapter: async ({}, use) => {
    let client: SupabaseClient;

    try {
      client = createSupabaseClient();
    } catch (error) {
      // Provide a mock adapter if Supabase isn't configured
      console.warn("[Supabase Adapter] Not configured, using mock");
      const mockAdapter: SupabaseFixture = {
        client: null as any,
        createUser: async () => null,
        getEmailOtp: async () => null,
        getWhatsAppOtp: async () => null,
        getUserByEmail: async () => null,
        deleteTestUser: async () => false,
        isUserVerified: async () => ({ email: false, whatsapp: false }),
      };
      await use(mockAdapter);
      return;
    }

    const adapter: SupabaseFixture = {
      client,

      createUser: async (email: string, password: string) => {
        try {
          // Create user in Supabase Auth
          const { data, error } = await client.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for tests
          });

          if (error) {
            console.error("[Supabase] Error creating user:", error);
            return null;
          }

          console.log(`[Supabase] Created test user: ${email}`);
          return data.user;
        } catch (err) {
          console.error("[Supabase] Exception creating user:", err);
          return null;
        }
      },

      /**
       * Get the current email OTP for a user
       */
      getEmailOtp: async (email: string): Promise<string | null> => {
        try {
          const { data, error } = await client
            .from("users")
            .select(
              `
              id,
              otp_state:user_otp_verification!inner(otp_code)
            `
            )
            .eq("email", email.toLowerCase())
            .eq("otp_state.channel", "email")
            .single();

          if (error || !data) {
            console.log("[Supabase] No email OTP found for:", email);
            return null;
          }

          const otpCode = (data as any).otp_state?.[0]?.otp_code;
          console.log("[Supabase] Found email OTP for:", email);
          return otpCode || null;
        } catch (err) {
          console.error("[Supabase] Error fetching email OTP:", err);
          return null;
        }
      },

      /**
       * Get the current WhatsApp OTP for a user
       */
      getWhatsAppOtp: async (email: string): Promise<string | null> => {
        try {
          const { data, error } = await client
            .from("users")
            .select(
              `
              id,
              otp_state:user_otp_verification!inner(otp_code)
            `
            )
            .eq("email", email.toLowerCase())
            .eq("otp_state.channel", "whatsapp")
            .single();

          if (error || !data) {
            console.log("[Supabase] No WhatsApp OTP found for:", email);
            return null;
          }

          const otpCode = (data as any).otp_state?.[0]?.otp_code;
          console.log("[Supabase] Found WhatsApp OTP for:", email);
          return otpCode || null;
        } catch (err) {
          console.error("[Supabase] Error fetching WhatsApp OTP:", err);
          return null;
        }
      },

      /**
       * Get user by email
       */
      getUserByEmail: async (email: string): Promise<any | null> => {
        try {
          const { data, error } = await client
            .from("users")
            .select("*")
            .eq("email", email.toLowerCase())
            .single();

          if (error || !data) return null;
          return data;
        } catch (err) {
          console.error("[Supabase] Error fetching user:", err);
          return null;
        }
      },

      /**
       * Delete a test user (for cleanup after tests)
       */
      deleteTestUser: async (email: string): Promise<boolean> => {
        try {
          // First get the user to find their auth_user_id
          const { data: user } = await client
            .from("users")
            .select("id, auth_user_id")
            .eq("email", email.toLowerCase())
            .single();

          if (!user) {
            console.log("[Supabase] No user found to delete:", email);
            return true; // Already deleted
          }

          // Delete from auth.users (cascades to public.users via trigger/FK)
          if (user.auth_user_id) {
            const { error: authError } = await client.auth.admin.deleteUser(
              user.auth_user_id
            );
            if (authError) {
              console.error("[Supabase] Error deleting auth user:", authError);
            }
          }

          // Also delete from public.users directly (in case no cascade)
          const { error: deleteError } = await client
            .from("users")
            .delete()
            .eq("id", user.id);

          if (deleteError) {
            console.error("[Supabase] Error deleting user:", deleteError);
            return false;
          }

          console.log("[Supabase] Deleted test user:", email);
          return true;
        } catch (err) {
          console.error("[Supabase] Error in deleteTestUser:", err);
          return false;
        }
      },

      /**
       * Check if user's email and WhatsApp are verified
       */
      isUserVerified: async (
        email: string
      ): Promise<{ email: boolean; whatsapp: boolean }> => {
        try {
          const { data, error } = await client
            .from("users")
            .select(
              `
              email_otp_state:user_otp_verification!inner(verified_at),
              whatsapp_otp_state:user_otp_verification!inner(verified_at)
            `
            )
            .eq("email", email.toLowerCase())
            .eq("email_otp_state.channel", "email")
            .eq("whatsapp_otp_state.channel", "whatsapp")
            .single();

          if (error || !data) {
            return { email: false, whatsapp: false };
          }

          const emailVerified = !!(data as any).email_otp_state?.[0]
            ?.verified_at;
          const whatsappVerified = !!(data as any).whatsapp_otp_state?.[0]
            ?.verified_at;

          return { email: emailVerified, whatsapp: whatsappVerified };
        } catch (err) {
          console.error("[Supabase] Error checking verification status:", err);
          return { email: false, whatsapp: false };
        }
      },
    };

    await use(adapter);
  },
});

export { expect } from "@playwright/test";
