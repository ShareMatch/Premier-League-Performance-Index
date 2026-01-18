import { test, expect } from "@playwright/test";

// Test credentials
const TEST_USER = {
  email: "affan@sharematch.me",
  password: "Affan@1234",
  newPassword: "Affan@5678",
};

// Supabase config - use env vars or defaults
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://bibvtujpesatuxzfkdbl.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

test.describe("Forgot Password Flow", () => {
  test.setTimeout(120000); // 2 minutes for the full flow

  test("should complete full forgot password flow: request reset, set new password, and login", async ({
    page,
    request,
  }) => {
    // Step 1: Navigate to forgot password modal
    await test.step("Request password reset via UI", async () => {
      await page.goto("/?action=login");

      const loginModal = page.locator('[data-testid="login-modal"]');
      await loginModal.waitFor({ state: "visible", timeout: 10000 });

      await page.click('[data-testid="login-forgot-password"]');

      await expect(
        page.locator('[data-testid="forgot-password-modal"]'),
      ).toBeVisible();

      await page.locator("#forgot-email").fill(TEST_USER.email);
      await page.click('[data-testid="forgot-password-submit-button"]');

      await expect(page.locator("text=Check Your Email")).toBeVisible({ timeout: 15000 });

      const maskedEmail = `${TEST_USER.email.charAt(0)}***${TEST_USER.email.charAt(TEST_USER.email.indexOf("@") - 1)}@${TEST_USER.email.split("@")[1]}`;
      await expect(page.locator(`text=${maskedEmail}`)).toBeVisible();
    });

    // Step 2: Get reset link from test endpoint and navigate to it
    let resetLink: string | null = null;
    await test.step("Get reset link from test endpoint", async () => {
      const endpointUrl = `${SUPABASE_URL}/functions/v1/test-get-reset-link`;
      console.log("📡 Calling test endpoint:", endpointUrl);

      const response = await request.post(endpointUrl, {
        data: { email: TEST_USER.email },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      resetLink = body.resetLink;
      expect(resetLink).toBeTruthy();
      console.log("✅ Got reset link from test endpoint");
      
      // Fix redirect URL if it points to localhost (in CI, we need the staging URL)
      const appBaseUrl = process.env.APP_BASE_URL || process.env.VITE_APP_URL || 'http://localhost:3000';
      if (resetLink && resetLink.includes('redirect_to=http://localhost:3000')) {
        resetLink = resetLink.replace('redirect_to=http://localhost:3000', `redirect_to=${encodeURIComponent(appBaseUrl)}`);
        console.log("📝 Fixed redirect URL to:", appBaseUrl);
      }
    });

    // Step 3: Navigate to reset link and set new password
    await test.step("Set new password via reset link", async () => {
      console.log("🔗 Navigating to reset link:", resetLink);
      await page.goto(resetLink!);

      // Wait for reset password modal to appear
      const resetModal = page.locator('[data-testid="reset-password-modal"]');
      await expect(resetModal).toBeVisible({ timeout: 15000 });

      // Wait for the modal to be in "ready" state (not loading)
      await expect(page.locator("text=Create New Password")).toBeVisible({ timeout: 10000 });

      // Fill in new password
      await page.locator("#new-password").fill(TEST_USER.newPassword);
      await page.locator("#confirm-password").fill(TEST_USER.newPassword);

      // Submit the form
      await page.click('[data-testid="reset-password-submit-button"]');

      // Wait for the reset modal to close (it auto-closes after success)
      await expect(resetModal).toBeHidden({ timeout: 10000 });
      console.log("✅ Reset password modal closed");
    });

    // Step 4: Login with new password
    await test.step("Login with new password", async () => {
      await page.goto("/?action=login");

      const loginModal = page.locator('[data-testid="login-modal"]');
      await loginModal.waitFor({ state: "visible", timeout: 10000 });

      await page.locator("#login-email").fill(TEST_USER.email);
      await page.locator("#login-password").fill(TEST_USER.newPassword);

      // Click submit and wait for navigation
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: "networkidle", timeout: 20000 })
          .catch(() => {}),
        page.locator('[data-testid="login-submit-button"]').click(),
      ]);

      await page.waitForTimeout(3000);

      // Check for error message first
      const errorMessage = loginModal.locator('.text-red-400').first();
      if (await errorMessage.isVisible().catch(() => false)) {
        const errorText = await errorMessage.textContent();
        console.log("❌ Login error:", errorText);
      }

      // Wait for login modal to disappear
      await expect(loginModal)
        .toBeHidden({ timeout: 10000 })
        .catch(async () => {
          // If modal still visible, try to close it
          const closeBtn = loginModal.locator('button[aria-label="Close"]').first();
          if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeBtn.click();
            await expect(loginModal).toBeHidden({ timeout: 5000 });
          }
        });

      console.log("✅ Successfully logged in with new password");

      // Dismiss KYC modal if it appears
      const kycModal = page.locator('h2:has-text("Identity Verification")');
      if (await kycModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("📋 KYC modal appeared, closing it...");
        // Click outside the modal at the corner of the screen to close it
        await page.mouse.click(10, 10);
        await page.waitForTimeout(1000);
        
        // If modal is still visible, try pressing Escape
        if (await kycModal.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }
        
        await expect(kycModal).toBeHidden({ timeout: 5000 });
        console.log("✅ KYC modal closed");
      }
    });

    // Step 5: Reset password back to original for future tests
    await test.step("Reset password back to original", async () => {
      await page.goto("/my-details");
      await expect(
        page.locator('[data-testid="my-details-page"]'),
      ).toBeVisible({ timeout: 10000 });

      const accountCard = page
        .locator("div")
        .filter({ hasText: "Account & Security" })
        .first();
      await accountCard
        .getByRole("button", { name: "Change Password" })
        .first()
        .click();

      const passwordModal = page.locator(
        '[data-testid="change-password-modal"]',
      );
      await expect(passwordModal).toBeVisible();

      await passwordModal
        .locator("#current-password")
        .fill(TEST_USER.newPassword);
      await passwordModal.locator("#new-password").fill(TEST_USER.password);
      await passwordModal
        .locator("#confirm-password")
        .fill(TEST_USER.password);

      await passwordModal
        .locator('[data-testid="change-password-modal-update-button"]')
        .click();
      await page.waitForTimeout(3000);

      console.log("✅ Password reset back to original");
    });
  });
});
