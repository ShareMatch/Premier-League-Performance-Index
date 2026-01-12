/**
 * App Exploration Test
 *
 * This test explores your SPA by:
 * - Clicking on navigation menus
 * - Interacting with Buy/Sell buttons
 * - Opening modals
 * - Capturing all API calls and console logs
 *
 * Use this to discover what features need testing.
 */
import { test, expect } from '@playwright/test';
import { createExplorer } from '../agents/app-explorer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix for ES modules - __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('App Exploration', () => {
  test('explore app and generate report', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           ShareMatch App Exploration                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    const explorer = createExplorer(page);

    // Crawl the app by interacting with elements
    const results = await explorer.crawl(15);

    // Generate report
    const report = explorer.generateReport();

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'test-results', 'exploration-report.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           EXPLORATION COMPLETE                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Interactions: ${results.interactions.length}`);
    console.log(`📡 API calls: ${results.apiCalls.length}`);
    console.log(`🔲 Modals opened: ${results.modalsOpened.join(', ') || 'None'}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('');
    console.log(`📄 Report saved to: test-results/exploration-report.md`);
    console.log('');

    // Basic assertions
    expect(results.apiCalls.length).toBeGreaterThan(0);
    expect(results.interactions.length).toBeGreaterThan(0);
  });

  test('explore with login', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       ShareMatch Authenticated Exploration                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    const explorer = createExplorer(page);
    await explorer.startMonitoring();

    // Step 1: Login
    console.log('[Step 1] Logging in...');
    await page.goto('http://localhost:3000/?action=login');
    await page.waitForTimeout(2000);

    const loginModal = page.getByTestId('login-modal');
    const isLoginVisible = await loginModal.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLoginVisible) {
      await loginModal.locator('#login-email').fill('affan@sharematch.me');
      await loginModal.locator('#login-password').fill('TestPassword123!');
      await loginModal.getByRole('button', { name: /login/i }).click();

      await page.waitForTimeout(5000);
      console.log('  ✅ Login attempted');

      // Check if login succeeded (modal should close)
      const stillVisible = await loginModal.isVisible().catch(() => false);
      if (!stillVisible) {
        console.log('  ✅ Login successful!');
      } else {
        console.log('  ⚠️ Login modal still visible - may have failed');
      }
    } else {
      console.log('  ⚠️ Login modal not found');
    }

    // Step 2: Explore authenticated pages
    console.log('');
    console.log('[Step 2] Exploring authenticated features...');
    await explorer.exploreAuthenticated();

    // Step 3: Try navigating around
    console.log('');
    console.log('[Step 3] Exploring navigation...');
    await explorer.exploreNavigation();

    // Generate and save report
    const report = explorer.generateReport();
    const reportPath = path.join(__dirname, '..', 'test-results', 'auth-exploration-report.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);

    const results = explorer.getResults();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       AUTHENTICATED EXPLORATION COMPLETE                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Interactions: ${results.interactions.length}`);
    console.log(`📡 API calls: ${results.apiCalls.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    console.log('');
    console.log(`📄 Report saved to: test-results/auth-exploration-report.md`);
    console.log('');

    expect(results.apiCalls.length).toBeGreaterThan(0);
  });
});
