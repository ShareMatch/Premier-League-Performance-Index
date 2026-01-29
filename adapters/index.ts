/**
 * Adapters Index
 * 
 * Combines all adapters (fixtures) into a single test export
 */
import { test as base, expect } from '@playwright/test';
import { test as sumsubTest } from './sumsub';
import { test as supabaseTest } from './supabase';

// Merge all fixtures into a single test object
// This allows tests to use: { page, sumsub, supabaseAdapter }
type SumsubFixtures = Parameters<Parameters<typeof sumsubTest.extend>[0]['sumsub']>[0] extends { sumsub: infer T } ? never :
  { sumsub: Awaited<ReturnType<Exclude<Parameters<typeof sumsubTest['_fixtures']['sumsub']>, undefined>>> };

// KYC Status types
type KycStatus = "approved" | "rejected" | "resubmission_requested" | "started" | "pending";
type KycStatusUpdate = {
  kycStatus: KycStatus;
  applicantId?: string;
  level?: string;
  coolingOffUntil?: string;
  reviewedAt?: string;
};
type KycStatusResponse = {
  kycStatus: string;
  applicantId: string | null;
  level: string | null;
  coolingOffUntil: string | null;
  reviewedAt: string | null;
};

// Simple combined test with both fixtures
export const test = base.extend<{
  sumsub: {
    checkApplicantStatus: (externalUserId: string) => Promise<string>;
    getApplicantReviewResult: (externalUserId: string) => Promise<{ status: string; reviewAnswer: string }>;
    deleteApplicant: (externalUserId: string) => Promise<void>;
  };
  supabaseAdapter: {
    client: any;
    createUser: (email: string, password: string, fullName?: string) => Promise<any | null>;
    getEmailOtp: (email: string) => Promise<string | null>;
    getWhatsAppOtp: (email: string) => Promise<string | null>;
    getUserByEmail: (email: string) => Promise<any | null>;
    deleteTestUser: (email: string) => Promise<boolean>;
    isUserVerified: (email: string) => Promise<{ email: boolean; whatsapp: boolean }>;
    updateKycStatus: (email: string, status: KycStatusUpdate) => Promise<boolean>;
    updateVerifiedName: (email: string, fullName: string) => Promise<boolean>;
    getKycStatus: (email: string) => Promise<KycStatusResponse | null>;
  };
}>({
  // Inherit sumsub fixture
  sumsub: async ({ }, use) => {
    // Re-use the sumsub fixture logic
    const { test: innerTest } = await import('./sumsub');
    // For simplicity, we'll create the tools inline
    const axios = (await import('axios')).default;
    const crypto = await import('crypto');
    // Only load dotenv locally - in CI, env vars come from GitHub secrets
    if (!process.env.CI) {
      const dotenv = await import('dotenv');
      dotenv.config();
    }

    const signRequest = (method: string, url: string, body: string = '') => {
      const ts = Math.floor(Date.now() / 1000);
      const secretKey = process.env.SUMSUB_SECRET_KEY;
      if (!secretKey) {
        return {
          'X-App-Token': process.env.SUMSUB_APP_TOKEN || '',
          'X-App-Access-Sig': '',
          'X-App-Access-Ts': ts.toString(),
        };
      }
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(ts + method.toUpperCase() + url + body)
        .digest('hex');
      return {
        'X-App-Token': process.env.SUMSUB_APP_TOKEN!,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': ts.toString(),
      };
    };

    const tools = {
      checkApplicantStatus: async (externalUserId: string): Promise<string> => {
        try {
          const url = `/resources/applicants/-;externalUserId=${externalUserId}/one`;
          const headers = signRequest('GET', url);
          const response = await axios.get(`https://api.sumsub.com${url}`, { headers });
          return response.data?.review?.reviewStatus || 'init';
        } catch (error: any) {
          console.error('[Error] Sumsub API check failed:', error.message);
          return 'ERROR';
        }
      },
      getApplicantReviewResult: async (externalUserId: string): Promise<{ status: string; reviewAnswer: string }> => {
        try {
          const url = `/resources/applicants/-;externalUserId=${externalUserId}/one`;
          const headers = signRequest('GET', url);
          const response = await axios.get(`https://api.sumsub.com${url}`, { headers });
          return {
            status: response.data?.review?.reviewStatus || 'init',
            reviewAnswer: response.data?.review?.reviewResult?.reviewAnswer || 'NONE',
          };
        } catch (error: any) {
          console.error('[Error] Sumsub review result failed:', error.message);
          return { status: 'ERROR', reviewAnswer: 'ERROR' };
        }
      },
      deleteApplicant: async (externalUserId: string): Promise<void> => {
        try {
          const url = `/resources/applicants/-;externalUserId=${externalUserId}`;
          const headers = signRequest('DELETE', url);
          await axios.delete(`https://api.sumsub.com${url}`, { headers });
        } catch (error: any) {
          console.error('[Error] Sumsub delete failed:', error.message);
        }
      },
    };

    await use(tools);
  },

  // Inherit supabaseAdapter fixture
  supabaseAdapter: async ({ }, use) => {
    const { createClient } = await import('@supabase/supabase-js');
    // Only load dotenv locally - in CI, env vars come from GitHub secrets
    if (!process.env.CI) {
      const dotenv = await import('dotenv');
      dotenv.config();
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[Supabase Adapter] Not configured, using mock');
      await use({
        client: null,
        createUser: async () => null,
        getEmailOtp: async () => null,
        getWhatsAppOtp: async () => null,
        getUserByEmail: async () => null,
        deleteTestUser: async () => false,
        isUserVerified: async () => ({ email: false, whatsapp: false }),
        updateKycStatus: async () => false,
        updateVerifiedName: async () => false,
        getKycStatus: async () => null,
      });
      return;
    }

    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const adapter = {
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
            console.error('[Supabase] Error creating auth user:', error);
            return null;
          }

          const authUser = data.user;
          console.log(`[Supabase] Created auth user: ${email} (${authUser.id})`);

          // Also create in public.users table (app's user table)
          // Note: email_verified/whatsapp_verified are NOT columns in users table
          // Verification status is tracked in user_otp_verification table
          const { data: publicUser, error: publicError } = await client
            .from('users')
            .upsert({
              auth_user_id: authUser.id,
              email: email.toLowerCase(),
              full_name: fullName,
              created_at: new Date().toISOString(),
            }, { onConflict: 'email' })
            .select()
            .single();

          if (publicError) {
            console.error('[Supabase] Error creating public.users entry:', publicError);
            // Still return auth user even if public.users insert fails
            return authUser;
          }
          
          console.log(`[Supabase] Created public.users entry: ${publicUser?.id}`);

          // Create verification records in user_otp_verification table (mark as verified for tests)
          const userId = publicUser?.id;
          if (userId) {
            // Create email verification record (ignoreDuplicates for idempotency)
            const { error: emailOtpError } = await client
              .from('user_otp_verification')
              .upsert({
                user_id: userId,
                channel: 'email',
                otp_attempts: 0,
                verified_at: new Date().toISOString(),
              }, { onConflict: 'user_id,channel', ignoreDuplicates: false });

            if (emailOtpError) {
              console.error('[Supabase] Error creating email OTP record:', emailOtpError);
            }

            // Create whatsapp verification record
            const { error: whatsappOtpError } = await client
              .from('user_otp_verification')
              .upsert({
                user_id: userId,
                channel: 'whatsapp',
                otp_attempts: 0,
                verified_at: new Date().toISOString(),
              }, { onConflict: 'user_id,channel', ignoreDuplicates: false });

            if (whatsappOtpError) {
              console.error('[Supabase] Error creating whatsapp OTP record:', whatsappOtpError);
            }

            console.log(`[Supabase] Created OTP verification records for user: ${userId}`);
          }

          return authUser;
        } catch (err) {
          console.error('[Supabase] Exception creating user:', err);
          return null;
        }
      },
      getEmailOtp: async (email: string) => {
        try {
          const { data } = await client
            .from('users')
            .select('id, otp_state:user_otp_verification!inner(otp_code)')
            .eq('email', email.toLowerCase())
            .eq('otp_state.channel', 'email')
            .single();
          return (data as any)?.otp_state?.[0]?.otp_code || null;
        } catch { return null; }
      },
      getWhatsAppOtp: async (email: string) => {
        try {
          const { data } = await client
            .from('users')
            .select('id, otp_state:user_otp_verification!inner(otp_code)')
            .eq('email', email.toLowerCase())
            .eq('otp_state.channel', 'whatsapp')
            .single();
          return (data as any)?.otp_state?.[0]?.otp_code || null;
        } catch { return null; }
      },
      getUserByEmail: async (email: string) => {
        try {
          const { data } = await client
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
          return data;
        } catch { return null; }
      },
      deleteTestUser: async (email: string) => {
        try {
          const { data: user } = await client
            .from('users')
            .select('id, auth_user_id')
            .eq('email', email.toLowerCase())
            .single();
          if (!user) return true;
          if (user.auth_user_id) {
            await client.auth.admin.deleteUser(user.auth_user_id);
          }
          await client.from('users').delete().eq('id', user.id);
          return true;
        } catch { return false; }
      },
      isUserVerified: async (email: string) => {
        try {
          const { data } = await client
            .from('users')
            .select(`
              email_otp_state:user_otp_verification!inner(verified_at),
              whatsapp_otp_state:user_otp_verification!inner(verified_at)
            `)
            .eq('email', email.toLowerCase())
            .eq('email_otp_state.channel', 'email')
            .eq('whatsapp_otp_state.channel', 'whatsapp')
            .single();
          return {
            email: !!(data as any)?.email_otp_state?.[0]?.verified_at,
            whatsapp: !!(data as any)?.whatsapp_otp_state?.[0]?.verified_at,
          };
        } catch { return { email: false, whatsapp: false }; }
      },

      /**
       * Update KYC compliance status in user_compliance table
       */
      updateKycStatus: async (email: string, status: KycStatusUpdate): Promise<boolean> => {
        try {
          // Get user ID from email
          const { data: userData, error: userError } = await client
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

          if (userError || !userData) {
            console.log('[Supabase] No user found for:', email);
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
            .from('user_compliance')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!compliance) {
            // Create new compliance record
            const { error: insertError } = await client
              .from('user_compliance')
              .insert({
                user_id: userId,
                ...updateData,
              });

            if (insertError) {
              console.error('[Supabase] Error creating compliance record:', insertError);
              return false;
            }
            console.log(`[Supabase] Created compliance record for: ${email}`);
          } else {
            // Update existing record
            const { error: updateError } = await client
              .from('user_compliance')
              .update(updateData)
              .eq('user_id', userId);

            if (updateError) {
              console.error('[Supabase] Error updating compliance:', updateError);
              return false;
            }
            console.log(`[Supabase] Updated KYC status to ${status.kycStatus} for: ${email}`);
          }

          return true;
        } catch (err) {
          console.error('[Supabase] Error updating KYC status:', err);
          return false;
        }
      },

      /**
       * Update user's full_name with verified name from KYC
       */
      updateVerifiedName: async (email: string, fullName: string): Promise<boolean> => {
        try {
          const { error: updateError } = await client
            .from('users')
            .update({ full_name: fullName })
            .eq('email', email.toLowerCase());

          if (updateError) {
            console.error('[Supabase] Error updating verified name:', updateError);
            return false;
          }

          console.log(`[Supabase] Updated full_name to: ${fullName} for: ${email}`);
          return true;
        } catch (err) {
          console.error('[Supabase] Error updating verified name:', err);
          return false;
        }
      },

      /**
       * Get KYC compliance status for a user
       */
      getKycStatus: async (email: string): Promise<KycStatusResponse | null> => {
        try {
          // Get user ID from email
          const { data: userData, error: userError } = await client
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

          if (userError || !userData) {
            return null;
          }

          const { data: compliance, error: complianceError } = await client
            .from('user_compliance')
            .select('kyc_status, sumsub_applicant_id, sumsub_level, cooling_off_until, kyc_reviewed_at')
            .eq('user_id', userData.id)
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
          console.error('[Supabase] Error getting KYC status:', err);
          return null;
        }
      },
    };

    await use(adapter);
  },
});

export { expect };

