
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('Login with staging credentials', async ({ page }) => {
        await page.goto('/');

        // Click Login Button
        await page.click('button:has-text("Login")');

        // Fill credentials
        // Note: Adjust selectors based on actual DOM ID/Classes
        await page.fill('input[type="email"]', 'pachira.dev@gmail.com');
        await page.fill('input[type="password"]', 'test.123');

        // Submit
        await page.click('button[type="submit"]'); // Adjust selector if needed

        // Verify login success - e.g., check for Profile icon or "Wallet"
        // Waiting for a selector that only appears when logged in
        await expect(page.locator('text=Wallet')).toBeVisible({ timeout: 10000 });
    });
});
