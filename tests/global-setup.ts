import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Test user credentials - must match all test files
const TEST_USER = {
  email: 'affan@sharematch.me',
  password: 'Affan@1234',
  fullName: 'Affan Parkar',
  phone: '561164259',
};

export default async function globalSetup(config: FullConfig) {
  console.log('Global setup running...');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Global Setup] Supabase not configured, skipping user setup');
    console.log('Global setup complete.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Check if user already exists in public.users table
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id, email, auth_user_id')
      .eq('email', TEST_USER.email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      console.log(`[Global Setup] ✅ Test user already exists: ${TEST_USER.email}`);
      console.log('Global setup complete.');
      return;
    }

    console.log(`[Global Setup] Test user not found, creating: ${TEST_USER.email}`);

    // Check if user exists in auth but not in users table
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(
      u => u.email?.toLowerCase() === TEST_USER.email.toLowerCase()
    );

    let authUserId: string;

    if (existingAuthUser) {
      console.log(`[Global Setup] Found existing auth user: ${existingAuthUser.id}`);
      authUserId = existingAuthUser.id;
    } else {
      // Create user in Supabase Auth
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true, // Auto-confirm for tests
        user_metadata: {
          full_name: TEST_USER.fullName,
        },
      });

      if (createError) {
        console.error('[Global Setup] Failed to create auth user:', createError.message);
        console.log('Global setup complete.');
        return;
      }

      authUserId = newAuthUser.user.id;
      console.log(`[Global Setup] Created auth user: ${authUserId}`);
    }

    // Create user in public.users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        email: TEST_USER.email.toLowerCase(),
        full_name: TEST_USER.fullName,
        auth_user_id: authUserId,
        phone_number: TEST_USER.phone,
        country_code: '+971',
      });

    if (insertError) {
      // User might already exist due to trigger, check again
      if (insertError.code === '23505') { // Unique violation
        console.log('[Global Setup] User already exists in users table (created by trigger)');
      } else {
        console.error('[Global Setup] Failed to create user record:', insertError.message);
      }
    } else {
      console.log(`[Global Setup] ✅ Created user record in public.users`);
    }

    // Ensure OTP verification records exist
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', TEST_USER.email.toLowerCase())
      .single();

    if (userData) {
      // Create email OTP record
      await supabase
        .from('user_otp_verification')
        .upsert({
          user_id: userData.id,
          channel: 'email',
          otp_attempts: 0,
          verified_at: new Date().toISOString(),
        }, { onConflict: 'user_id,channel' });

      // Create WhatsApp OTP record
      await supabase
        .from('user_otp_verification')
        .upsert({
          user_id: userData.id,
          channel: 'whatsapp',
          otp_attempts: 0,
          verified_at: new Date().toISOString(),
        }, { onConflict: 'user_id,channel' });

      console.log('[Global Setup] ✅ OTP verification records created/updated');
    }

    console.log(`[Global Setup] ✅ Test user ready: ${TEST_USER.email}`);

  } catch (err: any) {
    console.error('[Global Setup] Error:', err.message);
  }

  console.log('Global setup complete.');
}
