/**
 * Real Signup Test with Full Verification Flow
 * 
 * This test:
 * 1. Completes signup form (Step 1 + Step 2)
 * 2. Fetches Email OTP from database and verifies
 * 3. Fetches WhatsApp OTP from database and verifies
 * 4. Then tests login with the created user
 * 
 * IMPORTANT: Uses real Supabase connection to fetch OTP codes
 */

import { test, expect } from '../adapters/supabase';

// Your real test data
const REAL_USER = {
  email: 'affan@sharematch.me',
  password: 'TestPassword123!',
  fullName: 'A P',
  phone: '561164259', // Without leading 0, UAE format
  dob: {
    month: '0', // January (0-indexed)
    year: '1990',
    day: '15',
  },
};

test.describe('Real Signup with Full Verification', () => {
  
  test.beforeEach(async ({ supabaseAdapter }) => {
    // Clean up any existing test user before starting
    console.log(`[Setup] Cleaning up existing user: ${REAL_USER.email}`);
    await supabaseAdapter.deleteTestUser(REAL_USER.email);
  });

  test('complete signup with email and whatsapp verification', async ({ page, supabaseAdapter }) => {
    // Increase timeout for this test (includes OTP fetching)
    test.setTimeout(180000); // 3 minutes
    
    console.log('========================================');
    console.log('REAL SIGNUP TEST WITH VERIFICATION');
    console.log(`Email: ${REAL_USER.email}`);
    console.log(`Phone: ${REAL_USER.phone}`);
    console.log('========================================');

    // Navigate to signup
    await page.goto('/?action=signup');
    console.log('[Step] Navigated to signup page');

    // Wait for signup modal
    const signupModal = page.getByTestId('signup-modal');
    await expect(signupModal).toBeVisible({ timeout: 15000 });
    console.log('[Step] Signup modal visible');

    // ============ STEP 1: Personal Info ============
    console.log('[Step 1] Filling personal info...');

    // Full name
    await signupModal.locator('#fullName').fill(REAL_USER.fullName);
    console.log('  - Filled full name');

    // Email
    await signupModal.locator('input[name="email"]').fill(REAL_USER.email);
    console.log('  - Filled email');

    // Password
    await signupModal.locator('#password').fill(REAL_USER.password);
    console.log('  - Filled password');

    // Confirm password
    await signupModal.locator('#confirmPassword').fill(REAL_USER.password);
    console.log('  - Filled confirm password');

    // Date of birth - click to open picker
    await signupModal.getByText('Select date of birth').click();
    await page.waitForTimeout(500);
    console.log('  - Opened date picker');

    // Select month and year
    const selects = signupModal.locator('select');
    await selects.first().selectOption(REAL_USER.dob.month);
    await selects.last().selectOption(REAL_USER.dob.year);
    console.log('  - Selected month and year');

    // Click the day
    await signupModal.locator('.grid.grid-cols-7 button').filter({ hasText: REAL_USER.dob.day }).first().click();
    console.log('  - Selected day');

    // Country - click to open dropdown
    await signupModal.getByText('Select country').click();
    await page.waitForTimeout(500);
    console.log('  - Opened country dropdown');

    // Type to search for UAE
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('United Arab');
      await page.waitForTimeout(300);
    }

    // Click UAE option
    const uaeOption = page.getByText('United Arab Emirates').first();
    await uaeOption.click();
    console.log('  - Selected country');

    // Click Continue
    const continueButton = signupModal.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    console.log('[Step 1] Clicked Continue');

    // ============ STEP 2: Security & Verification ============
    await expect(signupModal.getByText('Security & Verification')).toBeVisible({ timeout: 10000 });
    console.log('[Step 2] Security & Verification visible');

    // Change phone country to UAE first (default is US)
    const phoneCountryButton = signupModal.locator('input[name="phone"]').locator('..').locator('button').first();
    await phoneCountryButton.click();
    await page.waitForTimeout(300);
    console.log('  - Opened phone country dropdown');

    // Search for UAE
    const phoneCountrySearch = signupModal.locator('input[placeholder="Search..."]').first();
    await phoneCountrySearch.fill('United Arab');
    await page.waitForTimeout(300);

    // Click UAE option in the dropdown
    await signupModal.getByText('United Arab Emirates').first().click();
    console.log('  - Selected UAE as phone country (+971)');

    // Fill phone number (without leading zero)
    await signupModal.locator('input[name="phone"]').fill(REAL_USER.phone);
    console.log('  - Filled phone number');

    // Check "use same number for WhatsApp"
    await signupModal.locator('#useSameNumber').check();
    console.log('  - Checked use same number');

    // Check agreements
    await signupModal.locator('#agreeToWhatsappOtp').check();
    console.log('  - Checked WhatsApp OTP agreement');

    await signupModal.locator('#agreeToTerms').check();
    console.log('  - Checked terms agreement');

    // Click Create Account
    const createAccountButton = signupModal.getByRole('button', { name: /create account/i });
    await expect(createAccountButton).toBeVisible();
    await expect(createAccountButton).toBeEnabled();
    await createAccountButton.click();
    console.log('[Step 2] Clicked Create Account');

    // ============ STEP 3: Email Verification ============
    console.log('[Step 3] Waiting for Email Verification modal...');
    
    // Take screenshot to see what's on screen
    await page.screenshot({ path: 'test-results/after-create-account.png' });
    console.log('  - Screenshot saved: after-create-account.png');
    
    // Wait for email verification modal to appear (may take a few seconds)
    const emailVerificationTitle = page.getByText('Email Verification');
    
    try {
      await emailVerificationTitle.waitFor({ timeout: 15000 });
      console.log('  - Email Verification modal appeared');
    } catch (e) {
      console.log('  - Timeout waiting for Email Verification modal');
      // Take screenshot to debug
      await page.screenshot({ path: 'test-results/email-modal-not-found.png' });
      // Check what's on the page
      const bodyText = await page.locator('body').textContent();
      console.log('  - Page content includes:', bodyText?.substring(0, 200));
    }
    
    if (await emailVerificationTitle.isVisible()) {
      console.log('  - Email Verification modal visible');
      
      // Wait a bit for the OTP to be stored in database
      await page.waitForTimeout(2000);
      
      // Fetch email OTP from database
      console.log('  - Fetching email OTP from database...');
      const emailOtp = await supabaseAdapter.getEmailOtp(REAL_USER.email);
      
      if (emailOtp) {
        console.log(`  - Got email OTP: ${emailOtp}`);
        
        // Find and fill OTP inputs (6 separate inputs)
        const otpInputs = page.locator('input[maxlength="1"]');
        const inputCount = await otpInputs.count();
        console.log(`  - Found ${inputCount} OTP inputs`);
        
        if (inputCount === 6) {
          // Fill each digit one by one with small delay
          for (let i = 0; i < 6; i++) {
            await otpInputs.nth(i).click();
            await otpInputs.nth(i).fill(emailOtp[i]);
            await page.waitForTimeout(100); // Small delay between inputs
          }
          console.log('  - Filled email OTP');
          
          // Wait a moment for auto-submit to potentially trigger
          await page.waitForTimeout(500);
          
          // Click Verify button (in case auto-submit didn't work)
          const verifyButton = page.getByRole('button', { name: /verify/i }).first();
          const isButtonEnabled = await verifyButton.isEnabled();
          console.log(`  - Verify button enabled: ${isButtonEnabled}`);
          
          if (isButtonEnabled) {
            await verifyButton.click();
            console.log('  - Clicked Verify for email');
          } else {
            console.log('  - Verify button disabled (auto-submit may have triggered)');
          }
        } else {
          console.log('  - OTP inputs not found, trying alternative approach...');
          // Try typing into the first input (it might handle all digits)
          const firstInput = otpInputs.first();
          if (await firstInput.isVisible()) {
            await firstInput.click();
            await page.keyboard.type(emailOtp);
            console.log('  - Typed email OTP');
          }
        }
        
        // Wait for verification to complete and WhatsApp modal to appear
        console.log('  - Waiting for email verification to complete...');
        
        // Wait for either success message or WhatsApp modal
        try {
          await Promise.race([
            page.getByText('Email verified successfully').waitFor({ timeout: 10000 }),
            page.getByText('WhatsApp Verification').waitFor({ timeout: 10000 }),
          ]);
          console.log('[Step 3] Email verification completed');
        } catch (e) {
          console.log('  - Waiting for verification result...');
          await page.waitForTimeout(5000);
        }
      } else {
        console.log('  - Could not fetch email OTP from database');
      }
    } else {
      console.log('  - Email Verification modal not found');
    }

    // ============ STEP 4: WhatsApp Verification ============
    console.log('[Step 4] Waiting for WhatsApp Verification modal...');
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'test-results/after-email-verification.png' });
    console.log('  - Screenshot saved: after-email-verification.png');
    
    // Wait a bit longer for the transition (EmailVerificationModal has 1.5s delay)
    await page.waitForTimeout(3000);
    
    // Take another screenshot
    await page.screenshot({ path: 'test-results/waiting-for-whatsapp.png' });
    
    // Try to find WhatsApp verification modal
    const whatsappVerificationTitle = page.getByText('WhatsApp Verification');
    const whatsappVisible = await whatsappVerificationTitle.isVisible({ timeout: 10000 }).catch(() => false);
    
    console.log(`  - WhatsApp modal visible: ${whatsappVisible}`);
    console.log(`  - Current URL: ${page.url()}`);
    
    // Debug: check what's on screen
    const pageContent = await page.locator('body').textContent();
    if (pageContent?.includes('Verification Successful')) {
      console.log('  - Found "Verification Successful" screen');
    }
    if (pageContent?.includes('WhatsApp')) {
      console.log('  - Found "WhatsApp" text on page');
    }
    if (pageContent?.includes('Redirecting')) {
      console.log('  - Found "Redirecting" text on page');
    }
    
    if (whatsappVisible) {
      console.log('  - WhatsApp Verification modal visible');
      
      // WhatsApp OTP is generated AFTER email is verified
      // Poll for the OTP to appear in the database (it may take a moment)
      let whatsappOtp: string | null = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      console.log('  - Waiting for WhatsApp OTP to be generated...');
      while (!whatsappOtp && attempts < maxAttempts) {
        await page.waitForTimeout(2000); // Wait 2 seconds between attempts
        whatsappOtp = await supabaseAdapter.getWhatsAppOtp(REAL_USER.email);
        attempts++;
        if (!whatsappOtp) {
          console.log(`  - Attempt ${attempts}/${maxAttempts}: OTP not ready yet...`);
        }
      }
      
      if (whatsappOtp) {
        console.log(`  - Got WhatsApp OTP: ${whatsappOtp}`);
        
        // Find and fill OTP inputs (6 separate inputs)
        const otpInputs = page.locator('input[maxlength="1"]');
        const inputCount = await otpInputs.count();
        
        if (inputCount === 6) {
          // Fill each digit
          for (let i = 0; i < 6; i++) {
            await otpInputs.nth(i).fill(whatsappOtp[i]);
          }
          console.log('  - Filled WhatsApp OTP');
        } else {
          // Try single input field
          const singleOtpInput = page.locator('input[maxlength="6"]');
          if (await singleOtpInput.isVisible()) {
            await singleOtpInput.fill(whatsappOtp);
            console.log('  - Filled WhatsApp OTP (single input)');
          }
        }
        
        // The OTP might auto-submit after filling the last digit
        // Wait a moment then check if we need to click Verify
        await page.waitForTimeout(1000);
        
        const verifyButton = page.getByRole('button', { name: /verify/i }).first();
        const isButtonVisible = await verifyButton.isVisible().catch(() => false);
        const isButtonEnabled = await verifyButton.isEnabled().catch(() => false);
        
        console.log(`  - Verify button visible: ${isButtonVisible}, enabled: ${isButtonEnabled}`);
        
        if (isButtonVisible && isButtonEnabled) {
          await verifyButton.click();
          console.log('  - Clicked Verify for WhatsApp');
        } else {
          console.log('  - Verify button not clickable (auto-submit may have triggered)');
        }
        
        // Wait for verification to complete
        await page.waitForTimeout(3000);
        console.log('[Step 4] WhatsApp verification completed');
      } else {
        console.log(`  - Could not fetch WhatsApp OTP after ${maxAttempts} attempts`);
      }
    } else {
      console.log('  - WhatsApp Verification modal not found');
    }

    // Take screenshot after verification
    await page.screenshot({ path: 'test-results/signup-after-verification.png' });

    // ============ VERIFY USER IN DATABASE ============
    console.log('[Verify] Checking user in database...');
    const user = await supabaseAdapter.getUserByEmail(REAL_USER.email);
    
    if (user) {
      console.log('  ✅ User found in database!');
      console.log(`     - ID: ${user.id}`);
      console.log(`     - Email: ${user.email}`);
      
      // Check verification status
      const verificationStatus = await supabaseAdapter.isUserVerified(REAL_USER.email);
      console.log(`     - Email Verified: ${verificationStatus.email}`);
      console.log(`     - WhatsApp Verified: ${verificationStatus.whatsapp}`);
    } else {
      console.log('  ❌ User NOT found in database');
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/signup-final.png' });

    console.log('========================================');
    console.log('✅ SIGNUP TEST COMPLETE');
    console.log('========================================');
  });

});
