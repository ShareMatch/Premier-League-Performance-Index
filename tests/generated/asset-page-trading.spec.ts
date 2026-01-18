import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_USER = {
    email: 'affan@sharematch.me',
    password: 'Affan@1234',
};

/**
 * Helper to check and log login errors
 */
async function checkLoginError(page: Page, context: string): Promise<string | null> {
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

test.describe.configure({ mode: 'serial' });


test.describe('Asset Page Trading Flow - Complete Buy/Sell', () => {
    test.setTimeout(120000);

    // Enforce desktop viewport to avoid strict mode violations with duplicate responsive elements
    test.use({
        viewport: { width: 1280, height: 800 },
    });

    test('should complete full trading cycle on asset page: login, navigate to Man City, buy tokens, and sell tokens', async ({ page }) => {
        // Capture console logs to debug application logic
        // page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        // 1. Login Flow
        await test.step('Login to application', async () => {
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
            const loginError = await checkLoginError(page, 'Asset Page Trading Login');
            if (loginError) {
                await page.screenshot({ path: 'test-results/asset-trading-login-error.png' });
                expect(loginError, `Login failed with error: ${loginError}`).toBeNull();
            }

            // Verify modals are closed (adapted from index test)
            const verificationModal = page.locator('[data-testid="verification-modal"]');
            const isLoginModalHidden = await loginModal.isHidden().catch(() => false);
            const isVerificationModalVisible = await verificationModal.isVisible().catch(() => false);

            console.log(`[Asset Trading Test] Modal hidden: ${isLoginModalHidden}, Verification visible: ${isVerificationModalVisible}`);

            if (!isLoginModalHidden && !isVerificationModalVisible) {
                await page.waitForTimeout(5000);
                const isLoginModalHiddenRetry = await loginModal.isHidden().catch(() => false);
                const isVerificationModalVisibleRetry = await verificationModal.isVisible().catch(() => false);
                expect(isLoginModalHiddenRetry || isVerificationModalVisibleRetry).toBeTruthy();
            } else {
                expect(isLoginModalHidden || isVerificationModalVisible).toBeTruthy();
            }

            // Handle potential error alert after login
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing login error alert');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust selector if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }
        });

        // 2. Navigate to Man City Asset Page (Correct slug is man-city)
        await test.step('Navigate to Man City Asset Page', async () => {
            await page.goto('/asset/man-city');

            // Handle potential alert modal from API failures
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing unexpected alert modal');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust selector if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }

            // Wait for asset page to load
            const assetPage = page.locator('[data-testid="asset-page"]');
            await expect(assetPage).toBeVisible({ timeout: 15000 });

            // Verify we're on the correct asset page
            // Use specific locator and ensure it's visible to avoid matching hidden mobile/desktop duplicates
            await expect(page.locator('h1:visible').filter({ hasText: /Manchester City|Man City/i })).toBeVisible();
        });

        // 3. Attempt to Sell Man City from Asset Page (Expect Error - User doesn't own it yet)
        await test.step('Attempt to sell asset not owned from asset page', async () => {
            // On mobile, use the mobile sell button
            const mobileSellButton = page.locator('[data-testid="asset-page-sell-mobile"]');
            const desktopSellButton = page.locator('[data-testid="asset-page-sell-desktop"]');

            // Click whichever button is visible
            if (await mobileSellButton.isVisible()) {
                await mobileSellButton.click();
            } else {
                await desktopSellButton.click();
            }

            // Wait for either error modal or trade slip to open
            await page.waitForTimeout(1000);

            // Check if sell error modal appears
            const errorModal = page.locator('[data-testid="sell-error-modal"]');
            const isErrorVisible = await errorModal.isVisible().catch(() => false);

            if (isErrorVisible) {
                await expect(errorModal).toContainText('You cannot sell');
                await expect(errorModal).toContainText(/Manchester City|Man City/i);

                // Close Modal
                await page.locator('[data-testid="sell-error-modal-ok-button"]').click();
                await expect(errorModal).toBeHidden();
            }
        });

        // 4. Buy Man City Tokens from Asset Page (Complete Transaction)
        await test.step('Complete Man City token purchase from asset page', async () => {
            // Click Buy button on asset page
            const mobileBuyButton = page.locator('[data-testid="asset-page-buy-mobile"]');
            const desktopBuyButton = page.locator('[data-testid="asset-page-buy-desktop"]');

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
            await expect(tradeSlip).toContainText('Transaction Slip');
            await expect(tradeSlip).toContainText(/Manchester City|Man City/i);

            // Ensure we're on the Buy tab
            const buyTab = tradeSlip.locator('[data-testid="trade-slip-buy-tab"]');
            await buyTab.click();
            await page.waitForTimeout(500);

            // Enter quantity
            const quantityInput = tradeSlip.locator('[data-testid="trade-slip-quantity-input"]');
            await quantityInput.clear();
            await quantityInput.fill('15');

            // Verify calculations are visible
            await expect(tradeSlip.locator('text=Subtotal:')).toBeVisible();

            // Accept Terms & Conditions
            const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
            await termsCheckbox.check({ force: true });
            await expect(termsCheckbox).toBeChecked();

            // Click Confirm Transaction button
            const confirmButton = tradeSlip.locator('[data-testid="trade-slip-confirm-button"]');
            await expect(confirmButton).toBeEnabled();
            await confirmButton.click();

            // Wait for countdown (5 seconds) and automatic confirmation
            await expect(confirmButton).toContainText('Confirming...', { timeout: 2000 });

            // Wait for transaction to complete (countdown + processing time)
            await page.waitForTimeout(8000);

            // Verify trade slip closes after successful transaction
            await expect(tradeSlip).toBeHidden({ timeout: 5000 });
        });

        // 5. Verify Purchase in Portfolio
        await test.step('Verify Man City tokens in portfolio', async () => {
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            await expect(rightPanel).toBeVisible();

            const portfolioButton = rightPanel.locator('[data-testid="right-panel-portfolio-tab"]');
            if (await portfolioButton.isVisible()) {
                await portfolioButton.click();
            }

            // Look for Man City in portfolio
            await expect(rightPanel).toContainText(/Manchester City|Man City/i, { timeout: 5000 });
            await expect(rightPanel).toContainText('15 units');
        });

        // 6. Navigate back to Asset Page (Actually, we are already there, just verify)
        await test.step('Verify we are still on Man City asset page', async () => {
            // No need to goto, it causes unneeded reload and race conditions
            const assetPage = page.locator('[data-testid="asset-page"]');
            await expect(assetPage).toBeVisible({ timeout: 15000 });
            await expect(page.locator('h1:visible').filter({ hasText: /Manchester City|Man City/i })).toBeVisible();
        });

        // 7. Sell Man City Tokens from Asset Page (Complete Transaction)
        await test.step('Complete Man City token sale from asset page', async () => {
            // First, ensure the portfolio in the side panel is showing the units
            // This guarantees the App state has updated before we click Sell
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            await expect(rightPanel).toContainText(/Manchester City|Man City/i, { timeout: 10000 });
            await expect(rightPanel).toContainText('15 units', { timeout: 10000 });

            const desktopSellButton = page.locator('[data-testid="asset-page-sell-desktop"]');

            // Click Sell
            await desktopSellButton.click();

            // Wait for either Trade Slip OR Sell Error Modal (to debug)
            const sellErrorModal = page.locator('[data-testid="sell-error-modal"]');

            await Promise.race([
                rightPanel.locator('[data-testid="trade-slip"]').waitFor({ state: 'visible' }),
                sellErrorModal.waitFor({ state: 'visible' })
            ]).catch(() => console.log('Timed out waiting for TradeSlip or ErrorModal'));

            // Check if Sell Error Modal appeared (unexpected)
            if (await sellErrorModal.isVisible()) {
                const errorText = await sellErrorModal.textContent();
                console.error(`Unexpected Sell Error Modal: ${errorText}`);
                console.log('Failing test because Sell Error Modal appeared');
                throw new Error(`Sell failed: ${errorText}`);
            }

            // Expect Trade Slip
            const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
            await expect(tradeSlip).toBeVisible();

            // Ensure we're on the Sell tab
            const sellTab = tradeSlip.locator('[data-testid="trade-slip-sell-tab"]');
            await sellTab.click();
            await page.waitForTimeout(500);

            // Enter quantity to sell (all 15 units)
            const quantityInput = tradeSlip.locator('[data-testid="trade-slip-quantity-input"]');
            await quantityInput.clear();
            await quantityInput.fill('15');

            // Verify fee breakdown is visible for sell orders
            await expect(tradeSlip.locator('text=Processing Fee')).toBeVisible();
            await expect(tradeSlip.locator('text=You Receive:')).toBeVisible();

            // Accept Terms & Conditions
            const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
            await termsCheckbox.check({ force: true });
            await expect(termsCheckbox).toBeChecked();

            // Click Confirm Transaction button
            const confirmButton = tradeSlip.locator('[data-testid="trade-slip-confirm-button"]');
            await expect(confirmButton).toBeEnabled();
            await confirmButton.click();

            // Wait for countdown and automatic confirmation
            await expect(confirmButton).toContainText('Confirming...', { timeout: 2000 });

            // Wait for transaction to complete
            await page.waitForTimeout(8000);

            // Verify trade slip closes after successful transaction
            await expect(tradeSlip).toBeHidden({ timeout: 5000 });
        });

        // 8. Verify Man City removed from Portfolio
        await test.step('Verify Man City tokens sold', async () => {
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');

            // Portfolio should either not contain Man City or show 0 units
            const hasManCity = await rightPanel.locator('text=/Manchester City|Man City/i').count();

            if (hasManCity > 0) {
                // If Man City still appears, verify it's in history
                const historyTab = rightPanel.locator('[data-testid="right-panel-history-tab"]');
                await historyTab.click();
                await expect(rightPanel).toContainText(/Manchester City|Man City/i);
                await expect(rightPanel).toContainText('sell');
            }
        });

        // 9. Check Transaction History
        await test.step('Verify transactions in history', async () => {
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            const historyTab = rightPanel.locator('[data-testid="right-panel-history-tab"]');
            await historyTab.click();

            // Should see both buy and sell transactions
            await expect(rightPanel).toContainText(/Manchester City|Man City/i);

            // Look for transaction type indicators
            const transactions = rightPanel.locator('text=/buy|sell/i');
            await expect(transactions.first()).toBeVisible();
        });

        // 10. Test Back Navigation
        await test.step('Test back navigation from asset page', async () => {
            // Click back button (mobile or desktop)
            const mobileBackButton = page.locator('[data-testid="asset-page-back-mobile"]');
            const desktopBackButton = page.locator('[data-testid="asset-page-back-desktop"]');

            if (await mobileBackButton.isVisible()) {
                await mobileBackButton.click();
            } else {
                await desktopBackButton.click();
            }

            // Wait for navigation - should go back to previous page
            await page.waitForTimeout(2000);

            // Verify we're no longer on the asset page
            const assetPage = page.locator('[data-testid="asset-page"]');
            const isAssetPageVisible = await assetPage.isVisible().catch(() => false);

            // We should either be on a market page or home page
            expect(isAssetPageVisible).toBeFalsy();
        });
    });

    test('should handle trading different assets: Liverpool', async ({ page }) => {
        await test.step('Login', async () => {
            await page.goto("/?action=login");
            const loginModal = page.locator('[data-testid="login-modal"]');
            await loginModal.waitFor({ state: "visible", timeout: 10000 });
            await page.locator("#login-email").fill(TEST_USER.email);
            await page.locator("#login-password").fill(TEST_USER.password);
            await page.locator('[data-testid="login-submit-button"]').click();
            await page.waitForTimeout(5000);

            // Handle potential error alert after login
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing login error alert');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust selector if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }
        });

        await test.step('Navigate to Liverpool asset page', async () => {
            await page.goto('/asset/liverpool');

            // Handle potential alert modal from API failures
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing unexpected alert modal');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust selector if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }

            const assetPage = page.locator('[data-testid="asset-page"]');
            await expect(assetPage).toBeVisible({ timeout: 15000 });
            await expect(page.locator('h1:visible').filter({ hasText: /Liverpool/i })).toBeVisible();
        });

        await test.step('Buy Liverpool tokens', async () => {
            const mobileBuyButton = page.locator('[data-testid="asset-page-buy-mobile"]');
            const desktopBuyButton = page.locator('[data-testid="asset-page-buy-desktop"]');

            if (await mobileBuyButton.isVisible()) {
                await mobileBuyButton.click();
            } else {
                await desktopBuyButton.click();
            }

            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            await expect(rightPanel).toBeVisible({ timeout: 5000 });

            const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
            const quantityInput = tradeSlip.locator('[data-testid="trade-slip-quantity-input"]');
            await quantityInput.fill('5');

            const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
            await termsCheckbox.check({ force: true });

            const confirmButton = tradeSlip.locator('[data-testid="trade-slip-confirm-button"]');
            await confirmButton.click();
            await expect(confirmButton).toContainText('Confirming...', { timeout: 2000 });
            await page.waitForTimeout(8000);
        });

        await test.step('Verify Liverpool in portfolio', async () => {
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            const portfolioButton = rightPanel.locator('[data-testid="right-panel-portfolio-tab"]');
            if (await portfolioButton.isVisible()) {
                await portfolioButton.click();
            }

            await expect(rightPanel).toContainText(/Liverpool/i, { timeout: 5000 });
            await expect(rightPanel).toContainText('5 units');
        });
    });

    test('should handle share functionality on asset page', async ({ page }) => {
        await test.step('Login', async () => {
            await page.goto("/?action=login");
            const loginModal = page.locator('[data-testid="login-modal"]');
            await loginModal.waitFor({ state: "visible", timeout: 10000 });
            await page.locator("#login-email").fill(TEST_USER.email);
            await page.locator("#login-password").fill(TEST_USER.password);
            await page.locator('[data-testid="login-submit-button"]').click();
            await page.waitForTimeout(5000);

            // Handle potential error alert after login
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing login error alert');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust selector if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }
        });

        await test.step('Navigate to asset page and test share', async () => {
            await page.goto('/asset/arsenal');

            // Handle potential alert modal from API failures
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing unexpected alert modal');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust selector if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }

            const assetPage = page.locator('[data-testid="asset-page"]');
            await expect(assetPage).toBeVisible({ timeout: 15000 });

            // Setup dialog handler for alert
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('Link copied to clipboard');
                await dialog.accept();
            });

            // Click share button (it should be visible on both mobile and desktop)
            const shareButtons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
            const shareButton = shareButtons.nth(1); // Second button is typically share

            // Try to click share button if visible
            const shareButtonVisible = await shareButton.isVisible().catch(() => false);
            if (shareButtonVisible) {
                await shareButton.click();
                await page.waitForTimeout(1000);
            }
        });
    });

});