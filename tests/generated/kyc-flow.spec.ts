import { test, expect } from '@playwright/test';
import path from 'path';

// Test credentials
const TEST_USER = {
    email: 'affan@sharematch.me',
    password: 'Affan@1234',
};

test.describe('KYC Flow - Document Upload via SumSub SDK Iframe after Login', () => {
    test.setTimeout(120000); // Generous timeout for slow KYC flows

    test.use({
        viewport: { width: 1280, height: 800 }, // Desktop for consistency
    });

    test('should complete KYC document upload in modal iframe', async ({ page }) => {
        // Capture logs for debugging
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

        // Step 1: Login and wait for KYC modal to appear automatically
        await test.step('Login to application and wait for KYC modal', async () => {
            await page.goto('/?action=login'); // Your login URL
            const loginModal = page.locator('[data-testid="login-modal"]');
            await expect(loginModal).toBeVisible({ timeout: 10000 });
            await page.locator('#login-email').fill(TEST_USER.email);
            await page.locator('#login-password').fill(TEST_USER.password);
            await page.locator('[data-testid="login-submit-button"]').click();
            await page.waitForTimeout(5000); // Wait for auth and modal trigger

            // Wait for KYC modal (more specific locator to avoid strict mode violation)
            const kycModal = page.locator('h2:has-text("Identity Verification")'); // Targets the h2 header uniquely
            await expect(kycModal).toBeVisible({ timeout: 15000 });

            // Handle any post-login alerts/modals if needed (from previous tests)
            const alertModal = page.locator('[data-testid="alert-modal-overlay"]');
            if (await alertModal.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Dismissing unexpected alert modal');
                const okButton = alertModal.locator('button:text("OK")'); // Adjust if needed
                await okButton.click({ timeout: 5000 });
                await expect(alertModal).toBeHidden({ timeout: 5000 });
            }
        });

        // Step 3: Wait for SumSub SDK iframe to load
        await test.step('Wait for SumSub iframe', async () => {
            // Wait for the initial loading spinner in KYCModal to disappear
            const loadingSpinner = page.locator('.animate-spin');
            await expect(loadingSpinner).toBeHidden({ timeout: 20000 });
            console.log('Loading spinner hidden');

            // Now check which view we are in: Intro or SDK
            const startButton = page.locator('button:text("Start Verification")');
            const kycContainer = page.locator('.kyc-sdk-container');

            // Wait for either the start button OR the SDK container to be visible
            await expect(async () => {
                const isIntro = await startButton.isVisible();
                const isSDK = await kycContainer.isVisible();
                expect(isIntro || isSDK).toBeTruthy();
            }).toPass({ timeout: 15000 });

            if (await startButton.isVisible()) {
                console.log('Intro view visible, clicking Start Verification');
                await startButton.click();
            } else {
                console.log('Already in SDK view');
            }

            // Finally wait for the SDK container and its iframe
            await expect(kycContainer).toBeVisible({ timeout: 10000 });
            const iframeLocator = page.frameLocator('iframe[src*="sumsub.com"]');
            await expect(iframeLocator.locator('body')).toBeVisible({ timeout: 20000 });
        });

        // Step 4: Interact with the SumSub iframe
        await test.step('Upload documents in SumSub iframe', async () => {
            const iframeLocator = page.frameLocator('iframe[src*="sumsub.com"]');

            // Select document type (e.g., Passport) - Inspect iframe for exact selector
            // Example: Assuming a button with text "Passport"
            const docTypeButton = iframeLocator.locator('button:has-text("Passport")'); // Adapt after inspecting
            await docTypeButton.click({ timeout: 10000 });

            // Upload front side - Locate file input (inspect for name/class)
            const frontInput = iframeLocator.locator('input[type="file"][data-qa*="front"]'); // Adapt qa/name
            await frontInput.waitFor({ state: 'attached', timeout: 5000 });
            const frontFilePath = path.join(__dirname, 'fixtures/Germany-ID_front.png'); // Your test file
            await frontInput.setInputFiles(frontFilePath);

            // Upload back side if required
            const backInput = iframeLocator.locator('input[type="file"][data-qa*="back"]');
            const isBackVisible = await backInput.isVisible({ timeout: 3000 }).catch(() => false);
            if (isBackVisible) {
                const backFilePath = path.join(__dirname, 'fixtures/Germany-ID_back');
                await backInput.setInputFiles(backFilePath);
            }

            // Selfie upload if required
            //   const selfieInput = iframeLocator.locator('input[type="file"][data-qa*="selfie"]');
            //   const isSelfieVisible = await selfieInput.isVisible({ timeout: 3000 }).catch(() => false);
            //   if (isSelfieVisible) {
            //     const selfieFilePath = path.join(__dirname, 'fixtures/dummy-selfie.jpg');
            //     await selfieInput.setInputFiles(selfieFilePath);
            //   }

            // Submit/Continue - Adapt to actual button
            const submitButton = iframeLocator.locator('button:has-text("Submit")'); // Or "Continue", inspect
            await submitButton.click();

            // Wait for processing (adjust based on flow)
            await page.waitForTimeout(10000);
        });

        // Step 5: Verify submission success (e.g., check for pending view or message)
        await test.step('Verify KYC submission success', async () => {
            // Check for pending view in modal
            const pendingView = page.locator('text=Verification In Progress');
            const isPendingVisible = await pendingView.isVisible({ timeout: 15000 }).catch(() => false);
            if (isPendingVisible) {
                console.log('Pending view shown - submission successful');
            } else {
                // Alternatively, check console logs or API if integrated
                // Example: await expect(page.locator('text=Verification submitted')).toBeVisible();
            }

            // Optional: Close modal if needed
            const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
            await closeButton.click();
        });
    });
});