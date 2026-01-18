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

  console.log(`[Global Setup] Using Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

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

    if (queryError) {
      console.error('[Global Setup] Error querying users table:', queryError.message);
    }

    if (existingUser) {
      console.log(`[Global Setup] ✅ Test user already exists in public.users: ${TEST_USER.email}`);
      
      // Still ensure OTP records exist
      await ensureOtpRecords(supabase, existingUser.id);
      
      console.log('Global setup complete.');
      return;
    }

    console.log(`[Global Setup] Test user not found in public.users, creating: ${TEST_USER.email}`);

    // Check if user exists in auth but not in users table
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[Global Setup] Error listing auth users:', listError.message);
    }
    
    const existingAuthUser = authUsers?.users?.find(
      u => u.email?.toLowerCase() === TEST_USER.email.toLowerCase()
    );

    let authUserId: string;

    if (existingAuthUser) {
      console.log(`[Global Setup] Found existing auth user: ${existingAuthUser.id}`);
      authUserId = existingAuthUser.id;
      
      // Update the user to ensure email is confirmed
      const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
        email_confirm: true,
      });
      if (updateError) {
        console.warn('[Global Setup] Could not confirm email:', updateError.message);
      } else {
        console.log('[Global Setup] ✅ Confirmed email for existing auth user');
      }
    } else {
      // Create user in Supabase Auth
      console.log('[Global Setup] Creating new auth user...');
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
      console.log(`[Global Setup] ✅ Created auth user: ${authUserId}`);
    }

    // Wait a bit for any database triggers to run
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check again if user was created by trigger
    const { data: userAfterTrigger } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_USER.email.toLowerCase())
      .maybeSingle();

    if (userAfterTrigger) {
      console.log('[Global Setup] ✅ User was created by database trigger');
      await ensureOtpRecords(supabase, userAfterTrigger.id);
      console.log(`[Global Setup] ✅ Test user ready: ${TEST_USER.email}`);
      console.log('Global setup complete.');
      return;
    }

    // Create user in public.users table manually
    // Column names from actual schema:
    // - phone_e164 (not phone_number) - E.164 format like +971561164259
    // - country_code is char(2) like 'AE' (not '+971')
    console.log('[Global Setup] Creating user record in public.users...');
    
    const insertData = {
      email: TEST_USER.email.toLowerCase(),
      full_name: TEST_USER.fullName,
      auth_user_id: authUserId,
      phone_e164: `+971${TEST_USER.phone}`,  // E.164 format
      country_code: 'AE',  // 2-letter country code
    };
    
    console.log('[Global Setup] Insert data:', insertData);
    
    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert(insertData)
      .select('id')
      .single();

    console.log('[Global Setup] Insert result - data:', insertedUser, 'error:', insertError);

    if (insertError) {
      console.log('[Global Setup] ❌ Insert error code:', insertError.code);
      console.log('[Global Setup] ❌ Insert error message:', insertError.message);
      console.log('[Global Setup] ❌ Insert error details:', insertError.details);
      console.log('[Global Setup] ❌ Insert error hint:', insertError.hint);
      
      // User might already exist due to trigger, check again
      if (insertError.code === '23505') { // Unique violation
        console.log('[Global Setup] User already exists in users table (race condition with trigger)');
        const { data: existingUserRetry } = await supabase
          .from('users')
          .select('id')
          .eq('email', TEST_USER.email.toLowerCase())
          .single();
        if (existingUserRetry) {
          await ensureOtpRecords(supabase, existingUserRetry.id);
        }
      }
    } else {
      console.log(`[Global Setup] ✅ Created user record in public.users with id: ${insertedUser?.id}`);
      if (insertedUser) {
        await ensureOtpRecords(supabase, insertedUser.id);
      }
    }

    // VERIFY the user was actually created
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_USER.email.toLowerCase())
      .maybeSingle();
    
    if (verifyUser) {
      console.log(`[Global Setup] ✅ VERIFIED: User exists in public.users: ${verifyUser.email} (id: ${verifyUser.id})`);
    } else {
      console.log('[Global Setup] ❌ VERIFICATION FAILED: User NOT found in public.users after insert!');
      console.log('[Global Setup] ❌ Verify error:', verifyError);
    }

    console.log(`[Global Setup] Test user setup complete: ${TEST_USER.email}`);

  } catch (err: any) {
    console.error('[Global Setup] Error:', err.message);
    console.error('[Global Setup] Stack:', err.stack);
  }

  console.log('Global setup complete.');
}

async function ensureOtpRecords(supabase: any, userId: string) {
  try {
    // Create/update email OTP record
    const { error: emailOtpError } = await supabase
      .from('user_otp_verification')
      .upsert({
        user_id: userId,
        channel: 'email',
        otp_attempts: 0,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'user_id,channel' });

    if (emailOtpError) {
      console.warn('[Global Setup] Could not create email OTP record:', emailOtpError.message);
    }

    // Create/update WhatsApp OTP record
    const { error: whatsappOtpError } = await supabase
      .from('user_otp_verification')
      .upsert({
        user_id: userId,
        channel: 'whatsapp',
        otp_attempts: 0,
        verified_at: new Date().toISOString(),
      }, { onConflict: 'user_id,channel' });

    if (whatsappOtpError) {
      console.warn('[Global Setup] Could not create WhatsApp OTP record:', whatsappOtpError.message);
    }

    console.log('[Global Setup] ✅ OTP verification records created/updated');
  } catch (err: any) {
    console.warn('[Global Setup] Error creating OTP records:', err.message);
  }
}
