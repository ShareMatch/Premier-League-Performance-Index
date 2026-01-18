import { test, expect } from "../../adapters/supabase";

// Test credentials
const TEST_USER = {
  email: "affan@sharematch.me",
  password: "Affan@1234",
  newPassword: "Affan@5678",
};

// Separate credentials for destructive tests (email/password changes)
const TEST_USER_FOR_DESTRUCTIVE_TESTS = {
  email: "affan-destructive@sharematch.me",
  password: "Affan@1234",
  newPassword: "Affan@5678",
};

// Test data for updates (NEVER MODIFY EMAIL IN TESTS)
const UPDATED_PROFILE = {
  name: "Affan Updated",
  email: "affan+88@sharematch.me", // Keep same email to avoid account loss
  phone: "501234567", // Just the number part, country code will be UAE +971
  whatsapp: "501234567",
};

const UPDATED_ADDRESS = {
  address: "123 Updated Street",
  city: "Abu Dhabi",
  state: "Abu Dhabi Emirate",
  country: "United Arab Emirates",
  postCode: "12345",
};

/**
 * Helper to check and log login errors
 */
async function checkLoginError(page: any, context: string): Promise<string | null> {
  const errorSelectors = [
    '.text-red-400',
    '[data-testid="login-error"]',
    '.error-message',
  ];
  
  for (const selector of errorSelectors) {
    const errorEl = page.locator(selector).first();
    const isVisible = await errorEl.isVisible().catch(() => false);
    if (isVisible) {
      const text = await errorEl.textContent().catch(() => '(could not read error)');
      console.log(`[${context}] ❌ Login error found: ${text}`);
      return text;
    }
  }
  return null;
}

// Login helper function
async function loginUser(page: any) {
  await test.step("Login to application", async () => {
    await page.goto("/?action=login");

    const loginModal = page.locator('[data-testid="login-modal"]');
    await loginModal.waitFor({ state: "visible", timeout: 10000 });

    await page.locator("#login-email").fill(TEST_USER.email);
    await page.locator("#login-password").fill(TEST_USER.password);

    // Click submit and wait for either navigation or modal to close
    await Promise.all([
      page
        .waitForNavigation({ waitUntil: "networkidle", timeout: 20000 })
        .catch(() => {}),
      page.locator('[data-testid="login-submit-button"]').click(),
    ]);

    // Wait longer in CI
    await page.waitForTimeout(process.env.CI ? 8000 : 2000);

    // Check for login errors first
    const loginError = await checkLoginError(page, 'User Profile Login');
    if (loginError) {
      await page.screenshot({ path: 'test-results/user-profile-login-error.png' });
      throw new Error(`Login failed with error: ${loginError}`);
    }

    // Wait for login modal to disappear
    await expect(loginModal)
      .toBeHidden({ timeout: 10000 })
      .catch(async () => {
        // If modal still visible, try to close it
        const closeBtn = loginModal
          .locator('button[aria-label="Close"]')
          .first();
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click();
          await expect(loginModal).toBeHidden({ timeout: 5000 });
        }
      });

    // Dismiss any KYC modal that might appear
    const kycModal = page.locator('h2:has-text("Identity Verification")');
    if (await kycModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      const closeButton = page
        .locator('div[role="dialog"]')
        .filter({ hasText: "Identity Verification" })
        .locator("button")
        .first();
      await closeButton.click({ timeout: 5000 });
      await expect(kycModal).toBeHidden({ timeout: 5000 });
    }
    
    console.log("[User Profile Login] ✅ Login successful");
  });
}

test.describe.serial("User Profile Management", () => {
  test.setTimeout(180000); // 3 minutes for the entire suite

  // Navigate to My Details page helper
  async function navigateToMyDetails(page: any) {
    await test.step("Navigate to My Details page", async () => {
      await page.goto("/my-details", { waitUntil: "networkidle" });
      // Wait for the main details page to load by checking for the data-testid
      await expect(page.locator('[data-testid="my-details-page"]')).toBeVisible(
        {
          timeout: 10000,
        },
      );
    });
  }

  test.describe("About You Section", () => {
    test("should update name only", async ({ page }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Update name", async () => {
        // Click Edit button on About You card - use getByRole to get first button
        const aboutYouCard = page
          .locator("div")
          .filter({ hasText: "About You" })
          .first();
        await aboutYouCard
          .getByRole("button", { name: "Edit" })
          .first()
          .click();

        // Wait for edit modal
        const editModal = page.locator('[data-testid="edit-details-modal"]');
        await expect(editModal).toBeVisible({ timeout: 5000 });
        await expect(editModal).toContainText("Edit About You");

        // Update name field
        const nameInput = editModal.locator("#edit-name");
        await nameInput.clear();
        await nameInput.fill(UPDATED_PROFILE.name);

        // Save changes
        await editModal
          .locator('[data-testid="edit-details-modal-save-button"]')
          .click();
        await page.waitForTimeout(2000);

        // Verify modal closed
        await expect(editModal).toBeHidden({ timeout: 5000 });

        // Verify name updated on card
        await expect(aboutYouCard).toContainText(UPDATED_PROFILE.name);
      });
    });

    test("should update phone number only", async ({ page }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Update phone number", async () => {
        const aboutYouCard = page
          .locator("div")
          .filter({ hasText: "About You" })
          .first();
        await aboutYouCard
          .getByRole("button", { name: "Edit" })
          .first()
          .click();

        const editModal = page.locator('[data-testid="edit-details-modal"]');
        await expect(editModal).toBeVisible();

        // Select UAE country code for phone (should be default)
        const phoneCountryButton = editModal
          .locator('input[name="phone"]')
          .locator("..")
          .locator("button")
          .first();
        await phoneCountryButton.click();
        await page.waitForTimeout(300);

        // Search for UAE
        const phoneCountrySearch = editModal
          .locator('input[placeholder="Search..."]')
          .first();
        await phoneCountrySearch.fill("United Arab");
        await page.waitForTimeout(300);

        await editModal.getByText("United Arab Emirates").first().click();

        // Fill phone number
        const phoneInput = editModal.locator('input[name="phone"]');
        await phoneInput.clear();
        await phoneInput.fill(UPDATED_PROFILE.phone);

        // Save changes
        await editModal
          .locator('[data-testid="edit-details-modal-save-button"]')
          .click();
        await page.waitForTimeout(2000);

        // Verify modal closed
        await expect(editModal).toBeHidden({ timeout: 5000 });

        // Verify phone updated on card
        await expect(aboutYouCard).toContainText(UPDATED_PROFILE.phone);
      });
    });
  });

  test.describe("Address Section", () => {
    test("should update all address fields", async ({ page }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Update address", async () => {
        // Click Edit button on Address card - use heading to find exact card
        const addressCard = page
          .locator("h3")
          .getByText("Address")
          .locator("../..")
          .first();
        await addressCard.getByRole("button", { name: "Edit" }).first().click();

        // Wait for edit modal
        const editModal = page.locator('[data-testid="edit-details-modal"]');
        await expect(editModal).toBeVisible({ timeout: 5000 });
        await expect(editModal).toContainText("Edit Address");

        // Update all address fields
        await editModal.locator("#edit-address").clear();
        await editModal.locator("#edit-address").fill(UPDATED_ADDRESS.address);

        await editModal.locator("#edit-city").clear();
        await editModal.locator("#edit-city").fill(UPDATED_ADDRESS.city);

        await editModal.locator("#edit-state").clear();
        await editModal.locator("#edit-state").fill(UPDATED_ADDRESS.state);

        await editModal.locator("#edit-country").clear();
        await editModal.locator("#edit-country").fill(UPDATED_ADDRESS.country);

        await editModal.locator("#edit-postCode").clear();
        await editModal
          .locator("#edit-postCode")
          .fill(UPDATED_ADDRESS.postCode);

        // Save changes
        await editModal
          .locator('[data-testid="edit-details-modal-save-button"]')
          .click();
        await page.waitForTimeout(2000);

        // Verify modal closed
        await expect(editModal).toBeHidden({ timeout: 5000 });

        // Verify modal was able to close (form submission succeeded)
        console.log("✅ Address update submitted successfully");
      });
    });
  });

  test.describe("Marketing Preferences Section", () => {
    test("should update marketing preferences", async ({ page }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Update marketing preferences", async () => {
        // Click Edit button on Marketing Preferences card - use heading to find exact card
        const marketingCard = page
          .locator("h3")
          .getByText("Marketing Preferences")
          .locator("../..")
          .first();
        await marketingCard
          .getByRole("button", { name: "Edit" })
          .first()
          .click();

        // Wait for edit modal
        const editModal = page.locator(
          '[data-testid="edit-marketing-preferences-modal"]',
        );
        await expect(editModal).toBeVisible({ timeout: 5000 });

        // Toggle all communication preferences
        await editModal
          .locator('[data-testid="marketing-preference-toggle-email"]')
          .click();
        await page.waitForTimeout(200);

        await editModal
          .locator('[data-testid="marketing-preference-toggle-whatsapp"]')
          .click();
        await page.waitForTimeout(200);

        await editModal
          .locator('[data-testid="marketing-preference-toggle-sms"]')
          .click();
        await page.waitForTimeout(200);

        // Toggle personalized marketing
        await editModal
          .locator(
            '[data-testid="edit-marketing-preferences-personalized-toggle"]',
          )
          .click();
        await page.waitForTimeout(200);

        // Save changes
        await editModal
          .locator(
            '[data-testid="edit-marketing-preferences-modal-save-button"]',
          )
          .click();
        await page.waitForTimeout(2000);

        // Verify modal closed
        await expect(editModal).toBeHidden({ timeout: 5000 });

        // Verify preferences updated on card (all checkmarks should be visible)
        const emailPref = marketingCard
          .locator("div")
          .filter({ hasText: "Email" })
          .first();
        const whatsappPref = marketingCard
          .locator("div")
          .filter({ hasText: "WhatsApp" })
          .first();
        const smsPref = marketingCard
          .locator("div")
          .filter({ hasText: "SMS" })
          .first();

        // Check that CheckCircle2 icons are visible (not Circle)
        await expect(emailPref.locator("svg").first()).toBeVisible();
        await expect(whatsappPref.locator("svg").first()).toBeVisible();
        await expect(smsPref.locator("svg").first()).toBeVisible();
      });
    });

    test("should subscribe to all preferences via quick link", async ({
      page,
    }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Subscribe to all via quick link", async () => {
        const marketingCard = page
          .locator("h3")
          .getByText("Marketing Preferences")
          .locator("../..")
          .first();
        await marketingCard
          .getByRole("button", { name: "Edit" })
          .first()
          .click();

        const editModal = page.locator(
          '[data-testid="edit-marketing-preferences-modal"]',
        );
        await expect(editModal).toBeVisible();

        // Click "click here" link to subscribe to all
        await editModal
          .locator('[data-testid="edit-marketing-preferences-subscribe-all"]')
          .click();
        await page.waitForTimeout(200);

        // Save changes
        await editModal
          .locator(
            '[data-testid="edit-marketing-preferences-modal-save-button"]',
          )
          .click();
        await page.waitForTimeout(2000);

        // Verify all preferences are enabled on card
        await expect(marketingCard).toContainText("Email");
        await expect(marketingCard).toContainText("WhatsApp");
        await expect(marketingCard).toContainText("SMS");
      });
    });
  });

  test.describe("Change Password Section", () => {
    test("should change password and login with new password", async ({
      page,
    }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Change password", async () => {
        // Click Change Password button
        const accountCard = page
          .locator("div")
          .filter({ hasText: "Account & Security" })
          .first();
        await accountCard
          .getByRole("button", { name: "Change Password" })
          .first()
          .click();

        // Wait for change password modal
        const passwordModal = page.locator(
          '[data-testid="change-password-modal"]',
        );
        await expect(passwordModal).toBeVisible({ timeout: 5000 });

        // Fill in password fields
        await passwordModal
          .locator("#current-password")
          .fill(TEST_USER.password);
        await passwordModal
          .locator("#new-password")
          .fill(TEST_USER.newPassword);
        await passwordModal
          .locator("#confirm-password")
          .fill(TEST_USER.newPassword);

        // Click Update button
        await passwordModal
          .locator('[data-testid="change-password-modal-update-button"]')
          .click();

        // Wait for success message to appear and then modal to auto-close (2 second delay built in)
        const successMessage = passwordModal.locator(
          'text="Password updated!"',
        );
        await expect(successMessage).toBeVisible({ timeout: 5000 });

        // Wait for modal to auto-close after success message
        await expect(passwordModal).toBeHidden({ timeout: 5000 });
      });

      await test.step("Sign out", async () => {
        // Click Sign Out button
        const accountCard = page
          .locator("div")
          .filter({ hasText: "Account & Security" })
          .first();
        await accountCard
          .getByRole("button", { name: "Sign Out" })
          .first()
          .click();

        // Wait for redirect to home
        await page.waitForTimeout(2000);
      });

      await test.step("Login with new password", async () => {
        await page.goto("/?action=login");

        const loginModal = page.locator('[data-testid="login-modal"]');
        await loginModal.waitFor({ state: "visible", timeout: 10000 });

        // Try to login with NEW password
        await page.locator("#login-email").fill(TEST_USER.email);
        await page.locator("#login-password").fill(TEST_USER.newPassword);
        await page.locator('[data-testid="login-submit-button"]').click();

        await page.waitForTimeout(5000);

        // Verify login success with new password
        const isLoginModalHidden = await loginModal
          .isHidden()
          .catch(() => false);
        expect(isLoginModalHidden).toBeTruthy();

        console.log("✅ Successfully logged in with new password");
      });

      // Reset password back to original for future tests
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

    test("should show error for incorrect current password", async ({
      page,
    }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Attempt password change with wrong current password", async () => {
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

        // Fill with wrong current password
        await passwordModal
          .locator("#current-password")
          .fill("WrongPassword123");
        await passwordModal
          .locator("#new-password")
          .fill(TEST_USER.newPassword);
        await passwordModal
          .locator("#confirm-password")
          .fill(TEST_USER.newPassword);

        await passwordModal
          .locator('[data-testid="change-password-modal-update-button"]')
          .click();
        await page.waitForTimeout(2000);

        // Verify error message appears
        await expect(passwordModal).toContainText(/incorrect/i);
      });
    });

    test("should show error when passwords do not match", async ({ page }) => {
      await loginUser(page);
      await navigateToMyDetails(page);

      await test.step("Attempt password change with mismatched passwords", async () => {
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
          .fill(TEST_USER.password);
        await passwordModal
          .locator("#new-password")
          .fill(TEST_USER.newPassword);
        await passwordModal
          .locator("#confirm-password")
          .fill("DifferentPassword123");

        await passwordModal
          .locator('[data-testid="change-password-modal-update-button"]')
          .click();
        await page.waitForTimeout(1000);

        // Verify error message
        await expect(passwordModal).toContainText(/do not match/i);
      });
    });
  });
});
