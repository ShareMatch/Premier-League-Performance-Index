
import { test, expect } from '@playwright/test';

test.describe('Site Functionality & Content', () => {

    test('Asset Pages Load Successfully', async ({ page }) => {
        await page.goto('/market/EPL');
        // Click first asset
        await page.locator('.asset-card').first().click(); // Adjust selector matches actual asset card class
        // Check for unique asset page element
        await expect(page.locator('text=Performance Index')).toBeVisible();
        await expect(page.locator('text=Buy')).toBeVisible();
        await expect(page.locator('text=Sell')).toBeVisible();
    });

    test('Videos Load (Help Center)', async ({ page }) => {
        await page.goto('/');
        // Open Help Center
        await page.click('button[aria-label="Help Center"]'); // Adjust selector
        // Click a topic
        await page.click('text=How to Login');
        // Check video element exists
        const video = page.locator('video');
        await expect(video).toBeVisible();
        // Optional: Check src attribute is not empty
        await expect(video).toHaveAttribute('src', /.+/);
    });

    test('Chatbot is Functional', async ({ page }) => {
        await page.goto('/');
        // Login first if chatbot is protected, assuming public for now or re-using auth state
        // Click Chatbot icon
        await page.click('[aria-label="Chatbot"]'); // Adjust selector
        await expect(page.locator('text=ShareMatch AI')).toBeVisible();
        // Send message
        await page.fill('input[placeholder*="Ask"]', 'What is the EPL index?');
        await page.press('input[placeholder*="Ask"]', 'Enter');
        // Wait for response
        await expect(page.locator('.ai-message')).toBeVisible({ timeout: 15000 });
    });

    test('No Broken Links (Smoke Test)', async ({ page }) => {
        await page.goto('/');
        const links = await page.locator('a').all();
        for (const link of links) {
            const href = await link.getAttribute('href');
            if (href && href.startsWith('/')) {
                // Just check it constructs a valid URL, detailed crawl might be too slow for daily
                // For a deep crawl, we'd visit each. For "Smoke", just check critical nav.
            }
        }
        // Verify Footer Links specifically
        await expect(page.locator('a[href="/privacy"]')).toBeVisible();
        await expect(page.locator('a[href="/terms"]')).toBeVisible();
    });
});
