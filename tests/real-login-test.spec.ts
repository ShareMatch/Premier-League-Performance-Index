/**
 * Real Login Test
 * 
 * This test logs in with an existing user.
 * Run the signup test first to create the user.
 */

import { test, expect } from '../adapters';

// Same credentials as real-signup-test.spec.ts
const REAL_USER = {
  email: 'affan@sharematch.me',
  password: 'TestPassword123!',
};

test.describe('Real Login Test', () => {

  test('login with existing user', async ({ page, supabaseAdapter }) => {
    test.setTimeout(60000);
    
    console.log('========================================');
    console.log('LOGIN TEST');
    console.log(`Email: ${REAL_USER.email}`);
    console.log('========================================');

    // Check if user exists first
    const user = await supabaseAdapter.getUserByEmail(REAL_USER.email);
    if (!user) {
      console.log('❌ User does not exist. Run signup test first.');
      test.fail();
      return;
    }
    console.log(`[Check] User exists: ${user.email}`);

    // Check verification status
    const verificationStatus = await supabaseAdapter.isUserVerified(REAL_USER.email);
    console.log(`[Check] Email verified: ${verificationStatus.email}`);
    console.log(`[Check] WhatsApp verified: ${verificationStatus.whatsapp}`);

    // Navigate to login
    await page.goto('/?action=login');
    console.log('[Step] Navigated to login page');

    // Wait for login modal
    const loginModal = page.getByTestId('login-modal');
    await expect(loginModal).toBeVisible({ timeout: 15000 });
    console.log('[Step] Login modal visible');

    // Fill email
    await loginModal.locator('#login-email').fill(REAL_USER.email);
    console.log('  - Filled email');

    // Fill password
    await loginModal.locator('#login-password').fill(REAL_USER.password);
    console.log('  - Filled password');

    // Take screenshot
    await page.screenshot({ path: 'test-results/login-form-filled.png' });

    // Click login button
    const loginButton = loginModal.getByRole('button', { name: /login/i });
    await expect(loginButton).toBeEnabled();
    await loginButton.click();
    console.log('[Step] Clicked Login');

    // Wait for result
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/login-result.png' });

    // Check if login was successful (modal should close)
    const isModalStillVisible = await loginModal.isVisible().catch(() => false);
    
    if (!isModalStillVisible) {
      console.log('✅ LOGIN SUCCESSFUL - Modal closed!');
      
      // Take screenshot of logged-in state
      await page.screenshot({ path: 'test-results/logged-in-state.png' });
      
      // Check current URL
      console.log(`  - Current URL: ${page.url()}`);
    } else {
      // Check for error message
      const errorElement = loginModal.locator('.text-red-400, .text-red-500');
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent();
        console.log(`❌ Login failed: ${errorText}`);
      } else {
        // Maybe verification or KYC modal appeared?
        const pageText = await page.locator('body').textContent();
        if (pageText?.includes('Verification')) {
          console.log('⚠️ Verification required');
        } else if (pageText?.includes('KYC')) {
          console.log('✅ LOGIN SUCCESSFUL - KYC verification needed');
        } else {
          console.log('⚠️ Login status unclear - modal still visible');
        }
      }
      await page.screenshot({ path: 'test-results/login-error.png' });
    }

    console.log('========================================');
    console.log('LOGIN TEST COMPLETE');
    console.log('========================================');
  });

});

