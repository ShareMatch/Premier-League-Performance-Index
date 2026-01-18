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

test.describe('Index Page Trading Flow - Complete Buy/Sell', () => {
    test.setTimeout(120000);

    test('should complete full trading cycle: login, buy tokens, and sell tokens', async ({ page }) => {
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
            const loginError = await checkLoginError(page, 'Trading Test Login');
            if (loginError) {
                await page.screenshot({ path: 'test-results/trading-login-error.png' });
                expect(loginError, `Login failed with error: ${loginError}`).toBeNull();
            }

            // Verify modals are closed
            const verificationModal = page.locator('[data-testid="verification-modal"]');
            const isLoginModalHidden = await loginModal.isHidden().catch(() => false);
            const isVerificationModalVisible = await verificationModal.isVisible().catch(() => false);

            console.log(`[Trading Test] Modal hidden: ${isLoginModalHidden}, Verification visible: ${isVerificationModalVisible}`);

            if (!isLoginModalHidden && !isVerificationModalVisible) {
                // Retry check after a moment
                await page.waitForTimeout(5000);
                const isLoginModalHiddenRetry = await loginModal.isHidden().catch(() => false);
                const isVerificationModalVisibleRetry = await verificationModal.isVisible().catch(() => false);
                expect(isLoginModalHiddenRetry || isVerificationModalVisibleRetry).toBeTruthy();
            } else {
                expect(isLoginModalHidden || isVerificationModalVisible).toBeTruthy();
            }
        });

        // 2. Navigate to EPL Index Page
        await test.step('Navigate to EPL Index', async () => {
            await page.goto('/market/EPL');
            await expect(page.getByRole('heading', { name: /Premier League/i })).toBeVisible({ timeout: 15000 });
            await expect(page.getByText('Asset', { exact: true })).toBeVisible();
        });

        // 3. Attempt to Sell Arsenal (Expect Error - User doesn't own it yet)
        await test.step('Attempt to sell asset not owned', async () => {
            const arsenalRow = page.locator('[data-testid^="order-book-row-"]').filter({ hasText: 'Arsenal' }).first();
            await expect(arsenalRow).toBeVisible();

            const sellButton = arsenalRow.locator('[data-testid^="sell-button-"]');
            await sellButton.click();

            // Verify Sell Error Modal
            const errorModal = page.locator('[data-testid="sell-error-modal"]');
            await expect(errorModal).toBeVisible();
            await expect(errorModal).toContainText('You cannot sell');
            await expect(errorModal).toContainText('Arsenal');

            // Close Modal
            await page.locator('[data-testid="sell-error-modal-ok-button"]').click();
            await expect(errorModal).toBeHidden();
        });

        // 4. Buy Arsenal Tokens (Complete Transaction)
        await test.step('Complete Arsenal token purchase', async () => {
            // Find Arsenal row and click Buy
            const arsenalRow = page.locator('[data-testid^="order-book-row-"]').filter({ hasText: 'Arsenal' }).first();
            const buyButton = arsenalRow.locator('[data-testid^="buy-button-"]');
            await buyButton.click();

            // Wait for Trade Slip to open
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            await expect(rightPanel).toBeVisible({ timeout: 5000 });

            const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
            await expect(tradeSlip).toBeVisible();
            await expect(tradeSlip).toContainText('Transaction Slip');
            await expect(tradeSlip).toContainText('Arsenal');

            // Ensure we're on the Buy tab
            const buyTab = tradeSlip.locator('[data-testid="trade-slip-buy-tab"]');
            await buyTab.click();
            await page.waitForTimeout(500);

            // Enter quantity
            const quantityInput = tradeSlip.locator('[data-testid="trade-slip-quantity-input"]');
            await quantityInput.clear();
            await quantityInput.fill('10');

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
        await test.step('Verify Arsenal tokens in portfolio', async () => {
            // Use :visible to avoid strict mode violations
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            await expect(rightPanel).toBeVisible();

            const portfolioButton = rightPanel.locator('[data-testid="right-panel-portfolio-tab"]');
            if (await portfolioButton.isVisible()) {
                await portfolioButton.click();
            }

            // Look for Arsenal in portfolio
            await expect(rightPanel).toContainText('Arsenal', { timeout: 5000 });
            await expect(rightPanel).toContainText('10 units');
        });

        // 6. Sell Arsenal Tokens (Complete Transaction)
        await test.step('Complete Arsenal token sale via Portfolio', async () => {
            // Use :visible to avoid strict mode violations
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');

            // Find Arsenal row in portfolio and click it to open trade slip
            const arsenalRow = rightPanel.locator('div').filter({ hasText: 'Arsenal' }).last();
            await arsenalRow.click();

            // Wait for Trade Slip to open
            const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
            await expect(tradeSlip).toBeVisible();

            // Ensure we're on the Sell tab
            const sellTab = tradeSlip.locator('[data-testid="trade-slip-sell-tab"]');
            await sellTab.click();
            await page.waitForTimeout(500);

            // Enter quantity to sell (all 10 units)
            const quantityInput = tradeSlip.locator('[data-testid="trade-slip-quantity-input"]');
            await quantityInput.clear();
            await quantityInput.fill('10');

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

        // 7. Verify Arsenal removed from Portfolio
        await test.step('Verify Arsenal tokens sold', async () => {
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');

            // Portfolio should either not contain Arsenal or show 0 units
            // or show "No active positions" if it was the only holding
            const hasArsenal = await rightPanel.locator('text=Arsenal').count();

            if (hasArsenal > 0) {
                // If Arsenal still appears, verify it shows 0 units or is in history
                const historyTab = rightPanel.locator('[data-testid="right-panel-history-tab"]');
                await historyTab.click();
                await expect(rightPanel).toContainText('Arsenal');
                await expect(rightPanel).toContainText('sell');
            }
        });

        // 8. Check Transaction History
        await test.step('Verify transactions in history', async () => {
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            const historyTab = rightPanel.locator('[data-testid="right-panel-history-tab"]');
            await historyTab.click();

            // Should see both buy and sell transactions
            await expect(rightPanel).toContainText('Arsenal');

            // Look for transaction type indicators
            const transactions = rightPanel.locator('text=/buy|sell/i');
            await expect(transactions.first()).toBeVisible();
        });

        // 9. Check Info Popup
        // await test.step('Check Info Popup', async () => {
        //     const infoButton = page.locator('[data-testid="info-popup-trigger"]');
        //     await expect(infoButton).toBeVisible();
        //     await infoButton.click();

        //     const infoPopup = page.locator('[data-testid="info-popup"]');
        //     await expect(infoPopup).toBeVisible();
        //     await expect(infoPopup).toContainText('Premier League');

        //     await page.locator('[data-testid="info-popup-close-button"]').click();
        //     await expect(infoPopup).toBeHidden();
        // });
    });

    test('should handle insufficient funds gracefully', async ({ page }) => {
        await test.step('Login', async () => {
            await page.goto("/?action=login");
            const loginModal = page.locator('[data-testid="login-modal"]');
            await loginModal.waitFor({ state: "visible", timeout: 10000 });
            await page.locator("#login-email").fill(TEST_USER.email);
            await page.locator("#login-password").fill(TEST_USER.password);
            await page.locator('[data-testid="login-submit-button"]').click();
            
            // Wait for login processing (longer in CI)
            await page.waitForTimeout(process.env.CI ? 8000 : 5000);

            // Check for login errors first
            const loginError = await checkLoginError(page, 'Insufficient Funds Test Login');
            if (loginError) {
                await page.screenshot({ path: 'test-results/insufficient-funds-login-error.png' });
                expect(loginError, `Login failed with error: ${loginError}`).toBeNull();
            }

            // Verify login succeeded - modal should close
            const verificationModal = page.locator('[data-testid="verification-modal"]');
            const isLoginModalHidden = await loginModal.isHidden().catch(() => false);
            const isVerificationModalVisible = await verificationModal.isVisible().catch(() => false);

            console.log(`[Insufficient Funds Test] Modal hidden: ${isLoginModalHidden}, Verification visible: ${isVerificationModalVisible}`);

            if (!isLoginModalHidden && !isVerificationModalVisible) {
                // Retry check after a moment
                await page.waitForTimeout(5000);
                const isLoginModalHiddenRetry = await loginModal.isHidden().catch(() => false);
                const isVerificationModalVisibleRetry = await verificationModal.isVisible().catch(() => false);
                expect(isLoginModalHiddenRetry || isVerificationModalVisibleRetry).toBeTruthy();
            } else {
                expect(isLoginModalHidden || isVerificationModalVisible).toBeTruthy();
            }
        });

        await test.step('Navigate to EPL', async () => {
            await page.goto('/market/EPL');
            await expect(page.getByRole('heading', { name: /Premier League/i })).toBeVisible({ timeout: 15000 });
            // Wait for order book to load
            await expect(page.getByText('Asset', { exact: true })).toBeVisible();
        });

        await test.step('Attempt to buy with excessive quantity', async () => {
            // Wait for order book to load
            const arsenalRow = page.locator('[data-testid^="order-book-row-"]').filter({ hasText: 'Arsenal' }).first();
            await expect(arsenalRow).toBeVisible({ timeout: 10000 });
            
            const buyButton = arsenalRow.locator('[data-testid^="buy-button-"]');
            await buyButton.click();

            // Use :visible to avoid strict mode violations
            const rightPanel = page.locator('[data-testid="right-panel"]:visible');
            await expect(rightPanel).toBeVisible({ timeout: 5000 });
            const tradeSlip = rightPanel.locator('[data-testid="trade-slip"]');
            await expect(tradeSlip).toBeVisible();

            // Try to buy 10000 tokens (likely exceeds wallet balance)
            const quantityInput = tradeSlip.locator('[data-testid="trade-slip-quantity-input"]');
            await quantityInput.fill('10000');

            // Accept terms
            const termsCheckbox = tradeSlip.locator('input[type="checkbox"]');
            await termsCheckbox.check({ force: true });

            // Try to confirm
            const confirmButton = tradeSlip.locator('[data-testid="trade-slip-confirm-button"]');
            await confirmButton.click();

            // Should show insufficient funds error
            await expect(page.locator('text=/insufficient funds/i')).toBeVisible({ timeout: 3000 });
        });
    });
});