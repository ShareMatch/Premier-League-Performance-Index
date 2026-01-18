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
    // ========================================
    // STEP 1: ALWAYS DELETE EXISTING USER FIRST
    // This ensures a fresh user with correct password every run
    // ========================================
    console.log('[Global Setup] Step 1: Checking for existing user to delete...');
    
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id, email, auth_user_id')
      .eq('email', TEST_USER.email.toLowerCase())
      .maybeSingle();

    if (queryError) {
      console.error('[Global Setup] Error querying users table:', queryError.message);
    }

    if (existingUser) {
      console.log(`[Global Setup] Found existing user in public.users: ${existingUser.email}`);
      
      // Delete from auth.users first (cascade will handle related tables or we do it manually)
      if (existingUser.auth_user_id) {
        console.log(`[Global Setup] Deleting auth user: ${existingUser.auth_user_id}`);
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(existingUser.auth_user_id);
        if (deleteAuthError) {
          console.error('[Global Setup] Error deleting auth user:', deleteAuthError.message);
        } else {
          console.log('[Global Setup] ✅ Deleted auth user');
        }
      }
      
      // Delete from public.users (if not cascaded)
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', existingUser.id);
      
      if (deleteUserError) {
        console.error('[Global Setup] Error deleting public user:', deleteUserError.message);
      } else {
        console.log('[Global Setup] ✅ Deleted public user');
      }
      
      // Wait for deletions to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      // Check if auth user exists without public.users entry
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('[Global Setup] Error listing auth users:', listError.message);
      }
      
      const orphanAuthUser = authUsers?.users?.find(
        u => u.email?.toLowerCase() === TEST_USER.email.toLowerCase()
      );
      
      if (orphanAuthUser) {
        console.log(`[Global Setup] Found orphan auth user (no public.users entry): ${orphanAuthUser.id}`);
        const { error: deleteOrphanError } = await supabase.auth.admin.deleteUser(orphanAuthUser.id);
        if (deleteOrphanError) {
          console.error('[Global Setup] Error deleting orphan auth user:', deleteOrphanError.message);
        } else {
          console.log('[Global Setup] ✅ Deleted orphan auth user');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // ========================================
    // STEP 2: CREATE NEW AUTH USER
    // ========================================
    console.log('[Global Setup] Step 2: Creating new auth user...');
    
    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true, // Auto-confirm for tests
      user_metadata: {
        full_name: TEST_USER.fullName,
      },
    });

    if (createError) {
      console.error('[Global Setup] ❌ Failed to create auth user:', createError.message);
      console.error('[Global Setup] ❌ Error code:', createError.status);
      console.log('Global setup complete.');
      return;
    }

    const authUserId = newAuthUser.user.id;
    console.log(`[Global Setup] ✅ Created auth user: ${authUserId}`);

    // ========================================
    // STEP 3: WAIT FOR DB TRIGGER TO CREATE public.users
    // ========================================
    console.log('[Global Setup] Step 3: Waiting for database trigger...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ========================================
    // STEP 4: VERIFY OR MANUAL INSERT INTO public.users
    // ========================================
    console.log('[Global Setup] Step 4: Verifying user in public.users...');
    
    const { data: userAfterTrigger, error: triggerCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', TEST_USER.email.toLowerCase())
      .maybeSingle();

    if (triggerCheckError) {
      console.error('[Global Setup] Error checking trigger result:', triggerCheckError.message);
    }

    let userId: string;

    if (userAfterTrigger) {
      console.log('[Global Setup] ✅ User was created by database trigger');
      userId = userAfterTrigger.id;
    } else {
      console.log('[Global Setup] Trigger did not create user, manual insert...');
      
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

      if (insertError) {
        console.error('[Global Setup] ❌ Insert error code:', insertError.code);
        console.error('[Global Setup] ❌ Insert error message:', insertError.message);
        console.error('[Global Setup] ❌ Insert error details:', insertError.details);
        console.error('[Global Setup] ❌ Insert error hint:', insertError.hint);
        
        // One more check - maybe trigger ran late
        const { data: lateUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', TEST_USER.email.toLowerCase())
          .maybeSingle();
        
        if (lateUser) {
          console.log('[Global Setup] ✅ User appeared (late trigger)');
          userId = lateUser.id;
        } else {
          console.error('[Global Setup] ❌ FATAL: Could not create user in public.users');
          console.log('Global setup complete.');
          return;
        }
      } else {
        console.log(`[Global Setup] ✅ Created user in public.users: ${insertedUser?.id}`);
        userId = insertedUser!.id;
      }
    }

    // ========================================
    // STEP 5: ENSURE OTP RECORDS
    // ========================================
    console.log('[Global Setup] Step 5: Creating OTP records...');
    await ensureOtpRecords(supabase, userId);

    // ========================================
    // STEP 6: FINAL VERIFICATION
    // ========================================
    console.log('[Global Setup] Step 6: Final verification...');
    
    const { data: finalVerify, error: finalError } = await supabase
      .from('users')
      .select('id, email, auth_user_id')
      .eq('email', TEST_USER.email.toLowerCase())
      .single();

    if (finalVerify) {
      console.log(`[Global Setup] ✅✅✅ VERIFIED: Test user ready!`);
      console.log(`[Global Setup]   - Email: ${finalVerify.email}`);
      console.log(`[Global Setup]   - User ID: ${finalVerify.id}`);
      console.log(`[Global Setup]   - Auth ID: ${finalVerify.auth_user_id}`);
      console.log(`[Global Setup]   - Password: ${TEST_USER.password}`);
    } else {
      console.error('[Global Setup] ❌❌❌ FINAL VERIFICATION FAILED!');
      console.error('[Global Setup] Error:', finalError?.message);
    }

  } catch (err: any) {
    console.error('[Global Setup] ❌ Exception:', err.message);
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
    } else {
      console.log('[Global Setup] ✅ Email OTP record created');
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
    } else {
      console.log('[Global Setup] ✅ WhatsApp OTP record created');
    }

  } catch (err: any) {
    console.warn('[Global Setup] Error creating OTP records:', err.message);
  }
}
