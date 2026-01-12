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

// Simple combined test with both fixtures
export const test = base.extend<{
  sumsub: {
    checkApplicantStatus: (externalUserId: string) => Promise<string>;
    getApplicantReviewResult: (externalUserId: string) => Promise<{ status: string; reviewAnswer: string }>;
    deleteApplicant: (externalUserId: string) => Promise<void>;
  };
  supabaseAdapter: {
    client: any;
    createUser: (email: string, password: string) => Promise<any | null>;
    getEmailOtp: (email: string) => Promise<string | null>;
    getWhatsAppOtp: (email: string) => Promise<string | null>;
    getUserByEmail: (email: string) => Promise<any | null>;
    deleteTestUser: (email: string) => Promise<boolean>;
    isUserVerified: (email: string) => Promise<{ email: boolean; whatsapp: boolean }>;
  };
}>({
  // Inherit sumsub fixture
  sumsub: async ({ }, use) => {
    // Re-use the sumsub fixture logic
    const { test: innerTest } = await import('./sumsub');
    // For simplicity, we'll create the tools inline
    const axios = (await import('axios')).default;
    const crypto = await import('crypto');
    const dotenv = await import('dotenv');
    dotenv.config();

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
    const dotenv = await import('dotenv');
    dotenv.config();

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
      });
      return;
    }

    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const adapter = {
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
            console.error('[Supabase] Error creating user:', error);
            return null;
          }

          console.log(`[Supabase] Created test user: ${email}`);
          return data.user;
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
    };

    await use(adapter);
  },
});

export { expect };

