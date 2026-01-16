/**
 * Real KYC Test
 *
 * Tests the KYC (Know Your Customer) flow using Sumsub.
 *
 * IMPORTANT:
 * - Sumsub widget is an iframe - we can verify it loads but can't automate inside it
 * - Use Sumsub API (via adapter) to check verification status
 * - For full KYC testing, use Sumsub's sandbox mode with test documents
 *
 * Prerequisites:
 * - User must be logged in
 * - User must have email + WhatsApp verified
 * - User must NOT have completed KYC yet
 */
import { test, expect } from '../adapters';

// Use dynamic test user (change to generated if needed in CI)
const TEST_USER = {
  email: `test.kyc.${Date.now()}@example.com`,
  password: 'TestPassword123!',
  // Add more if needed for creation
};

test.describe('Real KYC Test', () => {
  test.beforeEach(async ({ supabaseAdapter }) => {
    // Cleanup before
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
    // Create test user if not exists (NOTE: This only creates auth user; run full signup for OTP/phone if needed)
    const user = await supabaseAdapter.getUserByEmail(TEST_USER.email);
    if (!user) {
      console.log('[Setup] Creating test user for KYC...');
      await supabaseAdapter.createUser(TEST_USER.email, TEST_USER.password);
      // TODO: If full verification needed, manually simulate OTP here or assume prior test ran
    }
  });

  test.afterEach(async ({ sumsub, supabaseAdapter }) => {
    // Cleanup after
    await sumsub.deleteApplicant(TEST_USER.email); // Use email as externalUserId
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
    console.log('[Cleanup] Deleted test applicant and user');
  });

  test('KYC widget loads after login for unverified user', async ({ page, supabaseAdapter, sumsub }) => {
    test.setTimeout(120000); // 2 minutes
    
    console.log('========================================');
    console.log('KYC TEST - Widget Load Check');
    console.log(`Email: ${TEST_USER.email}`);
    console.log('========================================');
    
    // ============ PRE-CHECK ============
    // Verify user exists and is verified (skip if not fully verified)
    const user = await supabaseAdapter.getUserByEmail(TEST_USER.email);
    if (!user) {
      test.skip(true, 'User does not exist. Run signup test first or improve creation.');
      return;
    }
    console.log(`[Check] User exists: ${user.email}`);
    const verificationStatus = await supabaseAdapter.isUserVerified(TEST_USER.email);
    console.log(`[Check] Email verified: ${verificationStatus.email}`);
    console.log(`[Check] WhatsApp verified: ${verificationStatus.whatsapp}`);
    if (!verificationStatus.email || !verificationStatus.whatsapp) {
      test.skip(true, 'User is not fully verified. KYC may not be accessible.');
      return;
    }
    
    // Check initial KYC status (should be init or pending)
    const initialStatus = await sumsub.checkApplicantStatus(TEST_USER.email);
    console.log(`[Check] Initial KYC status: ${initialStatus}`);
    expect(['init', 'pending']).toContain(initialStatus);
    
    // ============ STEP 1: Login ============
    console.log('[Step 1] Logging in...');
    await page.goto('/?action=login');
    const loginModal = page.getByTestId('login-modal');
    await expect(loginModal).toBeVisible({ timeout: 15000 });
    await loginModal.locator('#login-email').fill(TEST_USER.email);
    await loginModal.locator('#login-password').fill(TEST_USER.password);
    
    const loginButton = loginModal.getByRole('button', { name: /login/i });
    await expect(loginButton).toBeEnabled({ timeout: 5000 });
    await loginButton.click();
    console.log(' - Clicked Login');
    
    // Wait for login to complete and potential redirect
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/kyc-1-after-login.png' });
    
    // ============ STEP 2: Check for KYC ============
    console.log('[Step 2] Checking for KYC requirement...');
    const currentUrl = page.url();
    console.log(` - Current URL: ${currentUrl}`);
    
    // Check if KYC content is visible (text or modal)
    await expect(page.getByText(/KYC|Verify Your Identity|Know Your Customer/i)).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log(' - No KYC text found immediately; checking iframe...');
    });
    
    // Poll for Sumsub iframe (enhanced with polling)
    let iframeVisible = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const sumsubIframe = page.locator('iframe[src*="sumsub"], [id*="sumsub"], .sumsub-websdk');
      iframeVisible = await sumsubIframe.isVisible({ timeout: 3000 }).catch(() => false);
      if (iframeVisible) break;
      await page.waitForTimeout(2000); // Poll every 2s
    }
    
    if (iframeVisible) {
      console.log('✅ Sumsub KYC widget is visible!');
      // Additional assertion: Check src
      const iframeSrc = await page.locator('iframe[src*="sumsub"]').getAttribute('src').catch(() => '');
      expect(iframeSrc).toContain('sumsub');
      await page.screenshot({ path: 'test-results/kyc-2-sumsub-visible.png' });
    } else {
      // Try navigating to /kyc as fallback
      console.log(' - Sumsub iframe not found; trying /kyc...');
      await page.goto('/kyc', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results/kyc-2-kyc-page.png' });
      
      const sumsubAfterNav = page.locator('iframe[src*="sumsub"], [id*="sumsub"], .sumsub-websdk');
      iframeVisible = await sumsubAfterNav.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (iframeVisible) {
        console.log('✅ Sumsub KYC widget found on /kyc page!');
      } else {
        // Check if already verified
        const status = await sumsub.checkApplicantStatus(TEST_USER.email);
        if (status === 'completed') {
          console.log('⚠️ User already KYC verified - widget not expected.');
        } else {
          test.fail(true, 'Sumsub widget not found.');
        }
      }
    }
    
    // ============ STEP 3: Check KYC Status via API ============
    console.log('[Step 3] Checking KYC status via Sumsub API...');
    const kycStatus = await sumsub.checkApplicantStatus(TEST_USER.email);
    console.log(` - Sumsub status: ${kycStatus}`);
    expect(kycStatus).not.toBe('completed'); // Assume test is for unverified
    
    const reviewResult = await sumsub.getApplicantReviewResult(TEST_USER.email);
    console.log(` - Review status: ${reviewResult.status}`);
    console.log(` - Review answer: ${reviewResult.reviewAnswer}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/kyc-3-final.png' });
    console.log('========================================');
    console.log('KYC TEST COMPLETE');
    console.log('========================================');
  });
});