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

            // Helper to get the primary footer button using exact name matching to avoid "Continue on phone" collision
            const getFooterButton = (text: string) => iframeLocator.locator('footer').getByRole('button', { name: text, exact: true });

            // Wait for the SDK to load
            console.log('Waiting for Sumsub SDK to initialize...');
            await iframeLocator.locator('main').waitFor({ state: 'visible', timeout: 30000 });

            // 1. Initial Warning/Intro Screen
            const warningContinue = getFooterButton('Continue');
            if (await warningContinue.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Screen: Initial screen detected');
                await expect(warningContinue).toBeEnabled({ timeout: 10000 });
                await warningContinue.click();
                console.log('Action: Clicked initial Continue');
            }

            // 2. Document Selection Screen
            console.log('Waiting for Document Selection screen...');
            const docTypeContainer = iframeLocator.locator('.RadioCheckContainer').filter({ hasText: 'ID card' });
            await docTypeContainer.waitFor({ state: 'visible', timeout: 20000 });

            // Click the specific text label to ensure we hit the clickable area
            await docTypeContainer.locator('div').filter({ hasText: 'ID card' }).first().click();
            console.log('Action: Selected ID card');

            const selectionContinue = getFooterButton('Continue');
            await expect(selectionContinue).toBeEnabled({ timeout: 10000 });
            await selectionContinue.click();
            console.log('Action: Clicked Selection Continue');

            // 3. Document Upload Screen
            console.log('Waiting for Upload screen...');
            const uploadFields = iframeLocator.locator('input[type="file"]');
            await expect(uploadFields.first()).toBeVisible({ timeout: 20000 });
            console.log('Screen: Upload detected');

            // 4. Upload front and back sides
            const frontFilePath = path.join(process.cwd(), 'fixtures/Germany-ID_front.png');
            const backFilePath = path.join(process.cwd(), 'fixtures/Germany-ID_back.png');

            console.log(`Uploading Front side: ${frontFilePath}`);
            await uploadFields.first().setInputFiles(frontFilePath);
            await page.waitForTimeout(2000);

            console.log(`Uploading Back side: ${backFilePath}`);
            await uploadFields.last().setInputFiles(backFilePath);

            // 5. Final Submission (Continue button in footer)
            console.log('Waiting for uploads to process...');
            const finalContinue = getFooterButton('Continue');
            await expect(finalContinue).toBeEnabled({ timeout: 30000 });
            await finalContinue.click();
            console.log('Action: Clicked final Continue');

            // 6. Final Confirmation step if it appears (sometimes there's another "Continue" or "Submit")
            // Based on user feedback, we should check and click all footer buttons if they appear
            const submitButton = getFooterButton('Submit');
            if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log('Action: Clicked Submit');
                await submitButton.click();
            }

            // 7. Verify success message inside iframe
            const successHeader = iframeLocator.locator('h1:has-text("Your profile has been verified")');
            await expect(successHeader).toBeVisible({ timeout: 60000 });
            console.log('KYC flow confirmed as verified');
        });

        // Step 5: Final verification outside iframe
        await test.step('Verify KYC modal state and Close', async () => {
            await page.waitForTimeout(3000);
            // Specifically target the close button in the Identity Verification modal header
            const closeButton = page.locator('div[role="dialog"]').filter({ hasText: 'Identity Verification' }).locator('button').filter({ has: page.locator('svg, img') }).first();

            if (await closeButton.isVisible()) {
                await closeButton.click();
                console.log('Modal closed manually');
            }
        });


    });
});