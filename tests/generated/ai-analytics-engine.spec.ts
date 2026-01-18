import { test, expect } from "@playwright/test";

// Test credentials
const TEST_USER = {
  email: "affan@sharematch.me",
  password: "Affan@1234",
};

test.describe("AI Analytics Engine", () => {
  test.setTimeout(180000); // 3 minutes - AI generation can take time

  // Enforce desktop viewport
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test("should login, buy Arsenal tokens, then use AI Analytics Engine", async ({
    page,
  }) => {
    // Step 1: Login
    await test.step("Login to application", async () => {
      await page.goto("/?action=login");

      const loginModal = page.locator('[data-testid="login-modal"]');
      await loginModal.waitFor({ state: "visible", timeout: 10000 });

      await page.locator("#login-email").fill(TEST_USER.email);
      await page.locator("#login-password").fill(TEST_USER.password);

      // Click submit and wait for navigation
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: "networkidle", timeout: 20000 })
          .catch(() => {}),
        page.locator('[data-testid="login-submit-button"]').click(),
      ]);

      await page.waitForTimeout(3000);

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

      console.log("✅ Logged in successfully");

      // Dismiss KYC modal if it appears
      const kycModal = page.locator('h2:has-text("Identity Verification")');
      if (await kycModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("📋 KYC modal appeared, closing it...");
        await page.mouse.click(10, 10);
        await page.waitForTimeout(1000);
        if (await kycModal.isVisible().catch(() => false)) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(1000);
        }
      }
    });

    // Step 2: Navigate to Arsenal Asset Page
    await test.step("Navigate to Arsenal Asset Page", async () => {
      await page.goto("/asset/arsenal");

      // Handle potential alert modal from API failures
      const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
      if (await alertModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("Dismissing alert modal");
        const okButton = alertModal.locator('button:has-text("OK")');
        await okButton.click({ timeout: 5000 });
        await expect(alertModal).toBeHidden({ timeout: 5000 });
      }

      // Wait for asset page to load
      const assetPage = page.locator('[data-testid="asset-page"]');
      await expect(assetPage).toBeVisible({ timeout: 15000 });

      // Verify we're on Arsenal page
      await expect(
        page.locator("h1:visible").filter({ hasText: /Arsenal/i })
      ).toBeVisible();
      console.log("✅ Navigated to Arsenal asset page");
    });

    // Step 3: Buy Arsenal Tokens
    await test.step("Buy Arsenal 10 units", async () => {
      // Click Buy button
      const desktopBuyButton = page.locator(
        '[data-testid="asset-page-buy-desktop"]'
      );
      const mobileBuyButton = page.locator(
        '[data-testid="asset-page-buy-mobile"]'
      );

      if (await mobileBuyButton.isVisible()) {
        await mobileBuyButton.click();
      } else {
        await desktopBuyButton.click();
      }

      // Wait for Trade Slip to open
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');
      await expect(rightPanel).toBeVisible({ timeout: 5000 });

      const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
      await expect(tradeSlip).toBeVisible();
      await expect(tradeSlip).toContainText("Transaction Slip");
      await expect(tradeSlip).toContainText(/Arsenal/i);

      // Ensure we're on the Buy tab
      const buyTab = tradeSlip.locator('[data-testid="trade-slip-buy-tab"]');
      await buyTab.click();
      await page.waitForTimeout(500);

      // Enter quantity
      const quantityInput = tradeSlip.locator(
        '[data-testid="trade-slip-quantity-input"]'
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
        '[data-testid="trade-slip-confirm-button"]'
      );
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // Wait for countdown and confirmation
      await expect(confirmButton).toContainText("Confirming...", {
        timeout: 2000,
      });

      // Wait for transaction to complete
      await page.waitForTimeout(8000);

      // Verify trade slip closes after successful transaction
      await expect(tradeSlip).toBeHidden({ timeout: 5000 });
      console.log("✅ Bought 10 Arsenal tokens");
    });

    // Step 4: Click on AI Analytics Banner
    await test.step("Navigate to AI Analytics Engine via banner", async () => {
      // The AI Analytics Banner should be visible at the top
      const aiBanner = page.locator('button:has-text("AI Analytics Engine")');
      await expect(aiBanner).toBeVisible({ timeout: 10000 });

      // Click the banner
      await aiBanner.click();
      await page.waitForTimeout(2000);

      // Verify we're on the AI Analytics page
      await expect(
        page.locator("h1:has-text('AI Analytics Engine')")
      ).toBeVisible({ timeout: 10000 });
      console.log("✅ Navigated to AI Analytics Engine page");
    });

    // Step 5: Select EPL Market and Generate Analysis
    await test.step("Select EPL and generate analysis", async () => {
      // EPL should be selected by default, but let's click it to be sure
      const eplButton = page.locator("button:has-text('EPL')").first();
      await expect(eplButton).toBeVisible();
      await eplButton.click();
      await page.waitForTimeout(500);

      // Click Generate Analysis button
      const generateButton = page.locator(
        'button:has-text("Generate Analysis")'
      );
      await expect(generateButton).toBeVisible();
      await expect(generateButton).toBeEnabled();
      await generateButton.click();
      console.log("📊 Generating AI Analysis...");

      // Wait for loading state
      await expect(
        page.locator('button:has-text("Processing...")')
      ).toBeVisible({ timeout: 5000 });

      // Wait for analysis to complete (AI can take up to 60 seconds)
      await expect(
        page.locator('button:has-text("Generate Analysis")')
      ).toBeVisible({ timeout: 120000 });

      // Verify analysis content appeared
      const analysisContent = page.locator(
        ".bg-gray-900\\/50.border.border-white\\/10"
      );
      await expect(analysisContent).toBeVisible({ timeout: 10000 });

      // Check for actual content in the analysis
      const analysisText = await analysisContent.textContent();
      expect(analysisText).toBeTruthy();
      expect(analysisText!.length).toBeGreaterThan(100); // Should have substantial content

      console.log("✅ AI Analysis generated successfully");
      console.log(
        `📝 Analysis preview: ${analysisText?.substring(0, 200)}...`
      );

      // Verify the disclaimer is shown
      await expect(
        page.locator("text=AI-generated analysis is for informational purposes")
      ).toBeVisible();
    });

    // Step 6: Test other market selection
    await test.step("Test selecting different market (F1)", async () => {
      // Select F1 market
      const f1Button = page.locator("button:has-text('F1')").first();
      await expect(f1Button).toBeVisible();
      await f1Button.click();
      await page.waitForTimeout(500);

      // Generate analysis for F1
      const generateButton = page.locator(
        'button:has-text("Generate Analysis")'
      );
      await generateButton.click();
      console.log("📊 Generating F1 Analysis...");

      // Wait for loading state
      await expect(
        page.locator('button:has-text("Processing...")')
      ).toBeVisible({ timeout: 5000 });

      // Wait for analysis to complete
      await expect(
        page.locator('button:has-text("Generate Analysis")')
      ).toBeVisible({ timeout: 120000 });

      // Verify new analysis appeared
      const analysisContent = page.locator(
        ".bg-gray-900\\/50.border.border-white\\/10"
      );
      await expect(analysisContent).toBeVisible();

      console.log("✅ F1 Analysis generated successfully");
    });

    // Cleanup: Sell the Arsenal tokens we bought
    await test.step("Cleanup: Sell Arsenal tokens", async () => {
      await page.goto("/asset/arsenal");

      // Wait for asset page
      const assetPage = page.locator('[data-testid="asset-page"]');
      await expect(assetPage).toBeVisible({ timeout: 15000 });

      // Click Sell button
      const desktopSellButton = page.locator(
        '[data-testid="asset-page-sell-desktop"]'
      );
      const mobileSellButton = page.locator(
        '[data-testid="asset-page-sell-mobile"]'
      );

      if (await mobileSellButton.isVisible()) {
        await mobileSellButton.click();
      } else {
        await desktopSellButton.click();
      }

      // Wait for Trade Slip
      const rightPanel = page.locator('[data-testid="right-panel"]:visible');
      await expect(rightPanel).toBeVisible({ timeout: 5000 });

      const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
      
      // Check if sell error modal appears (user doesn't own tokens)
      const sellErrorModal = page.locator('[data-testid="sell-error-modal"]');
      if (await sellErrorModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("⚠️ No Arsenal tokens to sell (already sold or not purchased)");
        await page.locator('[data-testid="sell-error-modal-ok-button"]').click();
        return;
      }

      await expect(tradeSlip).toBeVisible();

      // Switch to Sell tab
      const sellTab = tradeSlip.locator('[data-testid="trade-slip-sell-tab"]');
      await sellTab.click();
      await page.waitForTimeout(500);

      // Enter quantity
      const quantityInput = tradeSlip.locator(
        '[data-testid="trade-slip-quantity-input"]'
      );
      await quantityInput.clear();
      await quantityInput.fill("10");

      // Accept terms
      const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
      await termsCheckbox.check({ force: true });

      // Confirm
      const confirmButton = tradeSlip.locator(
        '[data-testid="trade-slip-confirm-button"]'
      );
      await confirmButton.click();

      await page.waitForTimeout(8000);
      console.log("✅ Cleanup: Sold Arsenal tokens");
    });
  });
});
