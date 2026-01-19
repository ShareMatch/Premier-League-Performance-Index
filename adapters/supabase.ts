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

// Only load dotenv locally - in CI, env vars come from GitHub secrets
if (!process.env.CI) {
  dotenv.config();
}

// KYC Status type
type KycStatus = "approved" | "rejected" | "resubmission_requested" | "started" | "pending";

// KYC Status update type
type KycStatusUpdate = {
  kycStatus: KycStatus;
  applicantId?: string;
  level?: string;
  coolingOffUntil?: string;
  reviewedAt?: string;
};

// KYC Status response type
type KycStatusResponse = {
  kycStatus: string;
  applicantId: string | null;
  level: string | null;
  coolingOffUntil: string | null;
  reviewedAt: string | null;
};

// Types for the adapter
type SupabaseFixture = {
  client: SupabaseClient;
  createUser: (email: string, password: string, fullName?: string) => Promise<any | null>;
  getEmailOtp: (email: string) => Promise<string | null>;
  getWhatsAppOtp: (email: string) => Promise<string | null>;
  getUserByEmail: (email: string) => Promise<any | null>;
  deleteTestUser: (email: string) => Promise<boolean>;
  isUserVerified: (
    email: string,
  ) => Promise<{ email: boolean; whatsapp: boolean }>;
  ensureOtpRecords: (email: string) => Promise<boolean>;
  updateKycStatus: (email: string, status: KycStatusUpdate) => Promise<boolean>;
  updateVerifiedName: (email: string, fullName: string) => Promise<boolean>;
  getKycStatus: (email: string) => Promise<KycStatusResponse | null>;
};

// Create Supabase client
const createSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "[Supabase Adapter] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
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
        ensureOtpRecords: async () => false,
        updateKycStatus: async () => false,
        updateVerifiedName: async () => false,
        getKycStatus: async () => null,
      };
      await use(mockAdapter);
      return;
    }

    const adapter: SupabaseFixture = {
      client,

      createUser: async (email: string, password: string, fullName: string = 'Test User') => {
        try {
          // Create user in Supabase Auth
          const { data, error } = await client.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for tests
          });

          if (error) {
            console.error("[Supabase] Error creating auth user:", error);
            return null;
          }

          const authUser = data.user;
          console.log(`[Supabase] Created auth user: ${email} (${authUser.id})`);

          // Also create in public.users table (app's user table)
          const { data: publicUser, error: publicError } = await client
            .from('users')
            .upsert({
              auth_user_id: authUser.id,
              email: email.toLowerCase(),
              full_name: fullName,
              email_verified: true,
              whatsapp_verified: true,
              created_at: new Date().toISOString(),
            }, { onConflict: 'email' })
            .select()
            .single();

          if (publicError) {
            console.error('[Supabase] Error creating public.users entry:', publicError);
            // Still return auth user even if public.users insert fails
          } else {
            console.log(`[Supabase] Created public.users entry: ${publicUser?.id}`);
          }

          return authUser;
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
          // First get the user_id from email
          const { data: userData, error: userError } = await client
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase())
            .single();

          if (userError || !userData) {
            console.log("[Supabase] No user found for:", email);
            return null;
          }

          console.log("[Supabase] Looking for OTP for user_id:", userData.id);

          // Now get the OTP from user_otp_verification
          const { data: otpData, error: otpError } = await client
            .from("user_otp_verification")
            .select("otp_code, otp_expires_at, verified_at")
            .eq("user_id", userData.id)
            .eq("channel", "email")
            .single();

          console.log("[Supabase] OTP query result:", {
            data: otpData,
            error: otpError,
          });

          if (otpError || !otpData) {
            console.log("[Supabase] No email OTP record found for:", email);
            return null;
          }

          const otpCode = (otpData as any).otp_code;
          console.log("[Supabase] OTP code from DB:", otpCode);

          if (otpCode) {
            console.log(
              "[Supabase] Found email OTP for:",
              email,
              "OTP:",
              otpCode,
            );
          } else {
            console.log(
              "[Supabase] OTP record exists but otp_code is null for:",
              email,
            );
          }
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
          // First get the user_id from email
          const { data: userData, error: userError } = await client
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase())
            .single();

          if (userError || !userData) {
            console.log("[Supabase] No user found for:", email);
            return null;
          }

          // Now get the OTP from user_otp_verification
          const { data: otpData, error: otpError } = await client
            .from("user_otp_verification")
            .select("otp_code")
            .eq("user_id", userData.id)
            .eq("channel", "whatsapp")
            .single();

          if (otpError || !otpData) {
            console.log("[Supabase] No WhatsApp OTP found for:", email);
            return null;
          }

          const otpCode = (otpData as any).otp_code;
          if (otpCode) {
            console.log(
              "[Supabase] Found WhatsApp OTP for:",
              email,
              "OTP:",
              otpCode,
            );
          }
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
              user.auth_user_id,
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
        email: string,
      ): Promise<{ email: boolean; whatsapp: boolean }> => {
        try {
          const { data, error } = await client
            .from("users")
            .select(
              `
              email_otp_state:user_otp_verification!inner(verified_at),
              whatsapp_otp_state:user_otp_verification!inner(verified_at)
            `,
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

      /**
       * Ensure OTP records exist for a user (creates them if missing)
       * This is needed for profile updates where send-email-otp may fail
       * if the user doesn't have existing OTP verification records.
       */
      ensureOtpRecords: async (email: string): Promise<boolean> => {
        try {
          // First get the user_id from email
          const { data: userData, error: userError } = await client
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase())
            .single();

          if (userError || !userData) {
            console.log("[Supabase] No user found for:", email);
            return false;
          }

          const userId = userData.id;

          // Check if email OTP record exists
          const { data: emailOtp } = await client
            .from("user_otp_verification")
            .select("id")
            .eq("user_id", userId)
            .eq("channel", "email")
            .maybeSingle();

          // Create email OTP record if it doesn't exist
          if (!emailOtp) {
            const { error: emailInsertError } = await client
              .from("user_otp_verification")
              .insert({
                user_id: userId,
                channel: "email",
                otp_attempts: 0,
                verified_at: new Date().toISOString(), // Mark as verified since user exists
              });

            if (emailInsertError) {
              console.error(
                "[Supabase] Error creating email OTP record:",
                emailInsertError,
              );
              return false;
            }
            console.log("[Supabase] Created email OTP record for:", email);
          }

          // Check if WhatsApp OTP record exists
          const { data: whatsappOtp } = await client
            .from("user_otp_verification")
            .select("id")
            .eq("user_id", userId)
            .eq("channel", "whatsapp")
            .maybeSingle();

          // Create WhatsApp OTP record if it doesn't exist
          if (!whatsappOtp) {
            const { error: whatsappInsertError } = await client
              .from("user_otp_verification")
              .insert({
                user_id: userId,
                channel: "whatsapp",
                otp_attempts: 0,
                verified_at: new Date().toISOString(), // Mark as verified since user exists
              });

            if (whatsappInsertError) {
              console.error(
                "[Supabase] Error creating WhatsApp OTP record:",
                whatsappInsertError,
              );
              return false;
            }
            console.log("[Supabase] Created WhatsApp OTP record for:", email);
          }

          return true;
        } catch (err) {
          console.error("[Supabase] Error ensuring OTP records:", err);
          return false;
        }
      },

      /**
       * Update KYC compliance status in user_compliance table
       * @param email User's email
       * @param status KYC status update object
       */
      updateKycStatus: async (
        email: string,
        status: {
          kycStatus: "approved" | "rejected" | "resubmission_requested" | "started" | "pending";
          applicantId?: string;
          level?: string;
          coolingOffUntil?: string;
          reviewedAt?: string;
        },
      ): Promise<boolean> => {
        try {
          // Get user ID from email
          const { data: userData, error: userError } = await client
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase())
            .single();

          if (userError || !userData) {
            console.log("[Supabase] No user found for:", email);
            return false;
          }

          const userId = userData.id;

          // Build update object
          const updateData: Record<string, any> = {
            kyc_status: status.kycStatus,
          };

          if (status.applicantId) {
            updateData.sumsub_applicant_id = status.applicantId;
          }
          if (status.level) {
            updateData.sumsub_level = status.level;
          }
          if (status.coolingOffUntil) {
            updateData.cooling_off_until = status.coolingOffUntil;
          }
          if (status.reviewedAt) {
            updateData.kyc_reviewed_at = status.reviewedAt;
          }

          // Check if compliance record exists
          const { data: compliance } = await client
            .from("user_compliance")
            .select("user_id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!compliance) {
            // Create new compliance record
            const { error: insertError } = await client
              .from("user_compliance")
              .insert({
                user_id: userId,
                ...updateData,
              });

            if (insertError) {
              console.error("[Supabase] Error creating compliance record:", insertError);
              return false;
            }
            console.log(`[Supabase] Created compliance record for: ${email}`);
          } else {
            // Update existing record
            const { error: updateError } = await client
              .from("user_compliance")
              .update(updateData)
              .eq("user_id", userId);

            if (updateError) {
              console.error("[Supabase] Error updating compliance:", updateError);
              return false;
            }
            console.log(`[Supabase] Updated KYC status to ${status.kycStatus} for: ${email}`);
          }

          return true;
        } catch (err) {
          console.error("[Supabase] Error updating KYC status:", err);
          return false;
        }
      },

      /**
       * Update user's full_name with verified name from KYC
       * @param email User's email
       * @param fullName Verified full name
       */
      updateVerifiedName: async (email: string, fullName: string): Promise<boolean> => {
        try {
          const { error: updateError } = await client
            .from("users")
            .update({ full_name: fullName })
            .eq("email", email.toLowerCase());

          if (updateError) {
            console.error("[Supabase] Error updating verified name:", updateError);
            return false;
          }

          console.log(`[Supabase] Updated full_name to: ${fullName} for: ${email}`);
          return true;
        } catch (err) {
          console.error("[Supabase] Error updating verified name:", err);
          return false;
        }
      },

      /**
       * Get KYC compliance status for a user
       * @param email User's email
       */
      getKycStatus: async (email: string): Promise<{
        kycStatus: string;
        applicantId: string | null;
        level: string | null;
        coolingOffUntil: string | null;
        reviewedAt: string | null;
      } | null> => {
        try {
          // Get user ID from email
          const { data: userData, error: userError } = await client
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase())
            .single();

          if (userError || !userData) {
            return null;
          }

          const { data: compliance, error: complianceError } = await client
            .from("user_compliance")
            .select("kyc_status, sumsub_applicant_id, sumsub_level, cooling_off_until, kyc_reviewed_at")
            .eq("user_id", userData.id)
            .maybeSingle();

          if (complianceError || !compliance) {
            return null;
          }

          return {
            kycStatus: compliance.kyc_status,
            applicantId: compliance.sumsub_applicant_id,
            level: compliance.sumsub_level,
            coolingOffUntil: compliance.cooling_off_until,
            reviewedAt: compliance.kyc_reviewed_at,
          };
        } catch (err) {
          console.error("[Supabase] Error getting KYC status:", err);
          return null;
        }
      },
    };

    await use(adapter);
  },
});

export { expect } from "@playwright/test";
