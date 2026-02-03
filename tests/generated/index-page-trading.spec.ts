import { test, expect, Page } from "@playwright/test";

// Test credentials
const TEST_USER = {
  email: "affan@sharematch.me",
  password: "Affan@1234",
};

/**
 * Helper to check and log login errors
 */
async function checkLoginError(
  page: Page,
  context: string,
): Promise<string | null> {
  // Only check for the specific login error element inside the login modal
  const loginError = page.locator('[data-testid="login-error"]');
  const isVisible = await loginError.isVisible().catch(() => false);

  if (isVisible) {
    const text = await loginError.textContent().catch(() => "");
    console.log(`[${context}] ❌ Login error found: ${text}`);
    return text;
  }

  return null;
}

/**
 * Helper to dismiss KYC modal if it appears
 * The KYC modal has class "fixed inset-0 z-50" and contains "Identity Verification" or "ShieldCheck"
 */
async function dismissKycModal(page: Page): Promise<void> {
  // Look for the modal container with fixed positioning and z-50
  const modalOverlay = page.locator('div.fixed.inset-0.z-50').first();
  
  if (await modalOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("📋 Modal overlay detected, attempting to close...");
    
    // Method 1: Try clicking the X button (close button in header)
    const closeButton = modalOverlay.locator('button').filter({ has: page.locator('svg.lucide-x, svg[class*="w-6"][class*="h-6"]') }).first();
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log("  → Clicking X close button");
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    // Method 2: If still visible, try clicking the backdrop (bg-black/70)
    if (await modalOverlay.isVisible().catch(() => false)) {
      const backdrop = modalOverlay.locator('div.absolute.inset-0.bg-black\\/70').first();
      if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log("  → Clicking backdrop");
        await backdrop.click({ position: { x: 5, y: 5 }, force: true });
        await page.waitForTimeout(500);
      }
    }
    
    // Method 3: If still visible, try pressing Escape
    if (await modalOverlay.isVisible().catch(() => false)) {
      console.log("  → Pressing Escape");
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Method 4: Try clicking any "Close" or "Cancel" button text
    if (await modalOverlay.isVisible().catch(() => false)) {
      const textCloseButton = modalOverlay.locator('button:has-text("Close"), button:has-text("Cancel"), button:has-text("Skip")').first();
      if (await textCloseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log("  → Clicking text close button");
        await textCloseButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Verify modal is closed
    const stillVisible = await modalOverlay.isVisible().catch(() => false);
    if (stillVisible) {
      console.log("⚠️ Modal still visible after all attempts, continuing anyway");
    } else {
      console.log("✅ Modal closed successfully");
    }
  }
}

/**
 * Helper to dismiss any blocking alert modal
 */
async function dismissAlertModal(page: Page): Promise<void> {
  const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
  if (await alertModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("⚠️ Alert modal appeared, dismissing...");
    const okButton = alertModal.locator('button:text("OK")');
    if (await okButton.isVisible().catch(() => false)) {
      await okButton.click();
      await expect(alertModal).toBeHidden({ timeout: 3000 });
    }
    console.log("✅ Alert modal dismissed");
  }
}

/**
 * Helper to wait for skeleton loading to complete
 */
async function waitForSkeletonToLoad(page: Page): Promise<void> {
  // Wait for any animate-pulse elements to disappear (skeleton loading)
  // Give the page time to start showing skeletons first
  await page.waitForTimeout(500);
  
  // Wait for order book rows to appear (not skeletons)
  const orderBookRow = page.locator('[data-testid^="order-book-row-"]').first();
  await orderBookRow.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
    console.log("⚠️ Order book rows not found, continuing anyway");
  });
  
  console.log("✅ Page loaded, skeletons complete");
}

/**
 * Helper to handle order confirmation modal
 */
async function handleOrderConfirmation(
  page: Page,
  expectedAsset: string,
  expectedSide: "buy" | "sell",
) {
  console.log(`[Order Confirmation] Waiting for confirmation modal...`);

  // Wait for confirmation modal to appear
  const confirmModal = page.locator('[data-testid="order-confirmation-modal"]');
  await expect(confirmModal).toBeVisible({ timeout: 10000 });

  // Verify modal content
  await expect(confirmModal).toContainText("Order Confirmed");
  await expect(confirmModal).toContainText(expectedAsset);
  await expect(confirmModal).toContainText(
    expectedSide === "buy" ? "Buy" : "Sell",
  );

  console.log(
    `[Order Confirmation] Modal verified for ${expectedSide} ${expectedAsset}`,
  );

  // Close the modal by clicking Done button
  const doneButton = confirmModal.locator('button:has-text("Done")');
  await expect(doneButton).toBeVisible();
  await doneButton.click();

  // Wait for modal to close
  await expect(confirmModal).toBeHidden({ timeout: 5000 });
  console.log(`[Order Confirmation] Modal closed`);
}

test.describe("Index Page Trading Flow - Complete Buy/Sell", () => {
  test.setTimeout(120000);

  // Enforce desktop viewport to avoid strict mode violations with duplicate responsive elements
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test("should complete full trading cycle: login, buy tokens, and sell tokens", async ({
    page,
  }) => {
    // 1. Login Flow
    await test.step("Login to application", async () => {
      await page.goto("/?action=login");

      // Wait for login modal
      const loginModal = page.locator('[data-testid="login-modal"]');
      await loginModal.waitFor({ state: "visible", timeout: 10000 });

      // Fill credentials
      await page.locator("#login-email").fill(TEST_USER.email);
      await page.locator("#login-password").fill(TEST_USER.password);
      await page.locator('[data-testid="login-submit-button"]').click();

      // Wait for login processing (longer in CI)
      await page.waitForTimeout(process.env.CI ? 8000 : 5000);

      // Check for login errors first
      const loginError = await checkLoginError(page, "Trading Test Login");
      if (loginError) {
        await page.screenshot({ path: "test-results/trading-login-error.png" });
        expect(loginError, `Login failed with error: ${loginError}`).toBeNull();
      }

      // Verify modals are closed
      const verificationModal = page.locator(
        '[data-testid="verification-modal"]',
      );
      const isLoginModalHidden = await loginModal.isHidden().catch(() => false);
      const isVerificationModalVisible = await verificationModal
        .isVisible()
        .catch(() => false);

      console.log(
        `[Trading Test] Modal hidden: ${isLoginModalHidden}, Verification visible: ${isVerificationModalVisible}`,
      );

      if (!isLoginModalHidden && !isVerificationModalVisible) {
        // Retry check after a moment
        await page.waitForTimeout(5000);
        const isLoginModalHiddenRetry = await loginModal
          .isHidden()
          .catch(() => false);
        const isVerificationModalVisibleRetry = await verificationModal
          .isVisible()
          .catch(() => false);
        expect(
          isLoginModalHiddenRetry || isVerificationModalVisibleRetry,
        ).toBeTruthy();
      } else {
        expect(isLoginModalHidden || isVerificationModalVisible).toBeTruthy();
      }
      
      // Dismiss KYC modal if it appears after login
      await dismissKycModal(page);
      
      // Dismiss any alert modals
      await dismissAlertModal(page);
    });

    // 2. Navigate to EPL Index Page
    await test.step("Navigate to EPL Index", async () => {
      await page.goto("/market/EPL");
      
      // Dismiss KYC modal if it appears after navigation
      await dismissKycModal(page);
      
      // Dismiss any alert modals
      await dismissAlertModal(page);
      
      await expect(
        page.getByRole("heading", { name: /Premier League/i }),
      ).toBeVisible({ timeout: 15000 });
      
      // Wait for skeleton loading to complete
      await waitForSkeletonToLoad(page);
      
      await expect(page.getByText("Asset", { exact: true })).toBeVisible();
    });

    // 3. Attempt to Sell Arsenal (Expect Error - User doesn't own it yet)
    await test.step("Attempt to sell asset not owned", async () => {
      // Aggressively dismiss any modals that might be blocking
      await dismissKycModal(page);
      await dismissAlertModal(page);
      await page.waitForTimeout(1000);
      await dismissKycModal(page);
      
      const arsenalRow = page
        .locator('[data-testid^="order-book-row-"]')
        .filter({ hasText: "Arsenal" })
        .first();
      await expect(arsenalRow).toBeVisible({ timeout: 10000 });

      // Dismiss any modal right before clicking
      await dismissKycModal(page);
      
      const sellButton = arsenalRow.locator('[data-testid^="sell-button-"]');
      
      // Try clicking, if blocked by modal, dismiss and retry
      try {
        await sellButton.click({ timeout: 5000 });
      } catch (e) {
        console.log("Sell button click blocked, dismissing modals and retrying...");
        await dismissKycModal(page);
        await dismissAlertModal(page);
        await sellButton.click({ timeout: 10000 });
      }

      // Wait a moment for the modal to appear
      await page.waitForTimeout(500);
      
      // Verify Sell Error Modal
      const errorModal = page.locator('[data-testid="sell-error-modal"]');
      await expect(errorModal).toBeVisible({ timeout: 10000 });
      await expect(errorModal).toContainText("You cannot sell");
      await expect(errorModal).toContainText("Arsenal");

      // Close Modal
      await page.locator('[data-testid="sell-error-modal-ok-button"]').click();
      await expect(errorModal).toBeHidden();
    });

    // 4. Buy Arsenal Tokens (Complete Transaction)
    await test.step("Complete Arsenal token purchase", async () => {
      // Dismiss any modals before clicking buy
      await dismissKycModal(page);
      await dismissAlertModal(page);
      
      // Find Arsenal row and click Buy
      const arsenalRow = page
        .locator('[data-testid^="order-book-row-"]')
        .filter({ hasText: "Arsenal" })
        .first();
      const buyButton = arsenalRow.locator('[data-testid^="buy-button-"]');
      
      // Try clicking, if blocked by modal, dismiss and retry
      try {
        await buyButton.click({ timeout: 5000 });
      } catch (e) {
        console.log("Buy button click blocked, dismissing modals and retrying...");
        await dismissKycModal(page);
        await dismissAlertModal(page);
        await buyButton.click({ timeout: 10000 });
      }

      // Wait for Trade Slip to open
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');
      await expect(rightPanel).toBeVisible({ timeout: 10000 });

      const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
      await expect(tradeSlip).toBeVisible();
      await expect(tradeSlip).toContainText("Transaction Slip");
      await expect(tradeSlip).toContainText("Arsenal");

      // Ensure we're on the Buy tab
      const buyTab = tradeSlip.locator('[data-testid="trade-slip-buy-tab"]');
      await buyTab.click();
      await page.waitForTimeout(500);

      // Enter quantity
      const quantityInput = tradeSlip.locator(
        '[data-testid="trade-slip-quantity-input"]',
      );
      await quantityInput.clear();
      await quantityInput.fill("10");

      // Verify calculations are visible
      await expect(tradeSlip.locator("text=Subtotal:")).toBeVisible();

      // Accept Terms & Conditions
      const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
      await termsCheckbox.check({ force: true });
      await expect(termsCheckbox).toBeChecked();

      // Click Confirm Transaction button
      const confirmButton = tradeSlip.locator(
        '[data-testid="trade-slip-confirm-button"]',
      );
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // Wait for processing to start
      await expect(confirmButton).toContainText(/Processing\.\.\.|Confirming\.\.\./, {
        timeout: 5000,
      });

      // Wait for transaction to complete
      await page.waitForTimeout(5000);

      // Verify trade slip closes after successful transaction
      await expect(tradeSlip).toBeHidden({ timeout: 5000 });

      // Handle the NEW order confirmation modal
      await handleOrderConfirmation(page, "Arsenal", "buy");
    });

    // 5. Verify Purchase in Portfolio
    await test.step("Verify Arsenal tokens in portfolio", async () => {
      // Use :visible to avoid strict mode violations
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');
      await expect(rightPanel).toBeVisible();

      const portfolioButton = rightPanel.locator(
        '[data-testid="right-panel-portfolio-tab"]',
      );
      if (await portfolioButton.isVisible()) {
        await portfolioButton.click();
      }

      // Look for Arsenal in portfolio
      await expect(rightPanel).toContainText("Arsenal", { timeout: 5000 });
      await expect(rightPanel).toContainText("10 units");
    });

    // 6. Sell Arsenal Tokens (Complete Transaction)
    await test.step("Complete Arsenal token sale via Portfolio", async () => {
      // Dismiss any modals before interacting
      await dismissKycModal(page);
      await dismissAlertModal(page);
      
      // Use :visible to avoid strict mode violations
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');

      // Find Arsenal row in portfolio and click it to open trade slip
      const arsenalRow = rightPanel
        .locator("div")
        .filter({ hasText: "Arsenal" })
        .last();
      await arsenalRow.click();

      // Wait for Trade Slip to open
      const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
      await expect(tradeSlip).toBeVisible({ timeout: 10000 });

      // Ensure we're on the Sell tab
      const sellTab = tradeSlip.locator('[data-testid="trade-slip-sell-tab"]');
      await sellTab.click();
      await page.waitForTimeout(500);

      // Enter quantity to sell (all 10 units)
      const quantityInput = tradeSlip.locator(
        '[data-testid="trade-slip-quantity-input"]',
      );
      await quantityInput.clear();
      await quantityInput.fill("10");

      // Verify fee breakdown is visible for sell orders
      await expect(tradeSlip.locator("text=Processing Fee")).toBeVisible();
      await expect(tradeSlip.locator("text=You Receive:")).toBeVisible();

      // Accept Terms & Conditions
      const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
      await termsCheckbox.check({ force: true });
      await expect(termsCheckbox).toBeChecked();

      // Click Confirm Transaction button
      const confirmButton = tradeSlip.locator(
        '[data-testid="trade-slip-confirm-button"]',
      );
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // Wait for processing to start
      await expect(confirmButton).toContainText(/Processing\.\.\.|Confirming\.\.\./, {
        timeout: 5000,
      });

      // Wait for transaction to complete
      await page.waitForTimeout(5000);

      // Verify trade slip closes after successful transaction
      await expect(tradeSlip).toBeHidden({ timeout: 5000 });

      // Handle the NEW order confirmation modal
      await handleOrderConfirmation(page, "Arsenal", "sell");
    });

    // 7. Verify Arsenal removed from Portfolio
    await test.step("Verify Arsenal tokens sold", async () => {
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');

      // Portfolio should either not contain Arsenal or show 0 units
      // or show "No active positions" if it was the only holding
      const hasArsenal = await rightPanel.locator("text=Arsenal").count();

      if (hasArsenal > 0) {
        // If Arsenal still appears, verify it shows 0 units or is in history
        const historyTab = rightPanel.locator(
          '[data-testid="right-panel-history-tab"]',
        );
        await historyTab.click();
        await expect(rightPanel).toContainText("Arsenal");
        await expect(rightPanel).toContainText("sell");
      }
    });

    // 8. Check Transaction History
    await test.step("Verify transactions in history", async () => {
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');
      const historyTab = rightPanel.locator(
        '[data-testid="right-panel-history-tab"]',
      );
      await historyTab.click();

      // Should see both buy and sell transactions
      await expect(rightPanel).toContainText("Arsenal");

      // Look for transaction type indicators
      const transactions = rightPanel.locator("text=/buy|sell/i");
      await expect(transactions.first()).toBeVisible();
    });
  });

  test("should handle insufficient funds gracefully", async ({ page }) => {
    await test.step("Login", async () => {
      await page.goto("/?action=login");
      const loginModal = page.locator('[data-testid="login-modal"]');
      await loginModal.waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#login-email").fill(TEST_USER.email);
      await page.locator("#login-password").fill(TEST_USER.password);
      await page.locator('[data-testid="login-submit-button"]').click();

      // Wait for login processing (longer in CI)
      await page.waitForTimeout(process.env.CI ? 8000 : 5000);

      // Check for login errors first
      const loginError = await checkLoginError(
        page,
        "Insufficient Funds Test Login",
      );
      if (loginError) {
        await page.screenshot({
          path: "test-results/insufficient-funds-login-error.png",
        });
        expect(loginError, `Login failed with error: ${loginError}`).toBeNull();
      }

      // Verify login succeeded - modal should close
      const verificationModal = page.locator(
        '[data-testid="verification-modal"]',
      );
      const isLoginModalHidden = await loginModal.isHidden().catch(() => false);
      const isVerificationModalVisible = await verificationModal
        .isVisible()
        .catch(() => false);

      console.log(
        `[Insufficient Funds Test] Modal hidden: ${isLoginModalHidden}, Verification visible: ${isVerificationModalVisible}`,
      );

      if (!isLoginModalHidden && !isVerificationModalVisible) {
        // Retry check after a moment
        await page.waitForTimeout(5000);
        const isLoginModalHiddenRetry = await loginModal
          .isHidden()
          .catch(() => false);
        const isVerificationModalVisibleRetry = await verificationModal
          .isVisible()
          .catch(() => false);
        expect(
          isLoginModalHiddenRetry || isVerificationModalVisibleRetry,
        ).toBeTruthy();
      } else {
        expect(isLoginModalHidden || isVerificationModalVisible).toBeTruthy();
      }
      
      // Dismiss KYC modal if it appears after login
      await dismissKycModal(page);
      
      // Dismiss any alert modals
      await dismissAlertModal(page);
    });

    await test.step("Navigate to EPL", async () => {
      await page.goto("/market/EPL");
      
      // Wait for page to stabilize and dismiss any modals
      await page.waitForTimeout(2000);
      await dismissKycModal(page);
      await dismissAlertModal(page);
      
      // Wait a bit more for delayed modals
      await page.waitForTimeout(1000);
      await dismissKycModal(page);
      
      await expect(
        page.getByRole("heading", { name: /Premier League/i }),
      ).toBeVisible({ timeout: 15000 });
      
      // Wait for skeleton loading to complete
      await waitForSkeletonToLoad(page);
      
      // Dismiss any modals that appeared during loading
      await dismissKycModal(page);
      
      // Wait for order book to load
      await expect(page.getByText("Asset", { exact: true })).toBeVisible();
    });

    await test.step("Attempt to buy with excessive quantity", async () => {
      // Aggressively dismiss any modals that might be blocking
      await dismissKycModal(page);
      await dismissAlertModal(page);
      
      // Wait a moment for any delayed modals
      await page.waitForTimeout(1000);
      await dismissKycModal(page);
      
      // Wait for order book to load
      const arsenalRow = page
        .locator('[data-testid^="order-book-row-"]')
        .filter({ hasText: "Arsenal" })
        .first();
      await expect(arsenalRow).toBeVisible({ timeout: 10000 });

      // Dismiss any modal one more time right before clicking
      await dismissKycModal(page);
      
      const buyButton = arsenalRow.locator('[data-testid^="buy-button-"]');
      
      // Try clicking, if blocked by modal, dismiss and retry
      try {
        await buyButton.click({ timeout: 5000 });
      } catch (e) {
        console.log("Buy button click blocked, dismissing modals and retrying...");
        await dismissKycModal(page);
        await dismissAlertModal(page);
        await buyButton.click({ timeout: 10000 });
      }

      // Clicking buy navigates to asset page first, wait for it
      const assetPage = page.locator('[data-testid="asset-page"]');
      await expect(assetPage).toBeVisible({ timeout: 15000 });
      
      // Dismiss any modals that might appear after navigation
      await dismissKycModal(page);
      await dismissAlertModal(page);

      // Use :visible to avoid strict mode violations
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');
      await expect(rightPanel).toBeVisible({ timeout: 10000 });
      const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
      await expect(tradeSlip).toBeVisible({ timeout: 10000 });

      // Try to buy 10000 tokens (likely exceeds wallet balance)
      const quantityInput = tradeSlip.locator(
        '[data-testid="trade-slip-quantity-input"]',
      );
      await quantityInput.fill("10000");

      // Accept terms
      const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
      await termsCheckbox.check({ force: true });

      // Try to confirm
      const confirmButton = tradeSlip.locator(
        '[data-testid="trade-slip-confirm-button"]',
      );
      await confirmButton.click();

      // Should show insufficient funds error as inline message in the trade slip
      // (The TradeSlip component shows this error inline, not as a modal)
      await expect(tradeSlip.locator("text=/insufficient funds/i")).toBeVisible({
        timeout: 3000,
      });

      // Verify the error message contains the expected text
      await expect(
        tradeSlip.locator("text=/You need .* but only have/i"),
      ).toBeVisible();

      // Verify the confirm button is still visible (user can adjust quantity)
      await expect(confirmButton).toBeVisible();
    });
  });
});
