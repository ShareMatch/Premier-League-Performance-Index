/**
 * Seed Test
 * 
 * This is the seed test that sets up the environment for the AI agents.
 * The Planner agent will use this as a template for generated tests.
 * 
 * IMPORTANT: Run `npm run dev` first before running these tests!
 * The app must be running on localhost:3000
 */
import { test, expect } from '../adapters';

test.describe('Seed Test - Environment Setup', () => {
  
  test('can navigate to the app', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Verify the app loads (wait for content to render)
    await expect(page).toHaveTitle(/ShareMatch/i);
  });

  test('can open login modal via query param', async ({ page }) => {
    // The app uses query params to trigger modals (see TopBar.tsx useEffect)
    // Navigate with ?action=login to open login modal
    await page.goto('/?action=login');
    
    // Wait for the login modal to appear using data-testid
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
  });

  test('can open login modal via button click', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Click "Log In" button in the header
    const loginButton = page.getByRole('button', { name: /log in/i });
    await loginButton.click();
    
    // Verify login modal appears using data-testid
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
  });

  test('can open signup modal via query param', async ({ page }) => {
    // Navigate with ?action=signup to open signup modal
    await page.goto('/?action=signup');
    
    // Wait for signup modal to appear using data-testid
    await expect(page.getByTestId('signup-modal')).toBeVisible({ timeout: 10000 });
  });

  test('can verify Sumsub API connection', async ({ sumsub }) => {
    // Skip if Sumsub credentials are not configured
    const hasCredentials = process.env.SUMSUB_APP_TOKEN && process.env.SUMSUB_SECRET_KEY;
    if (!hasCredentials) {
      console.log('[Audit] Skipping Sumsub test - credentials not configured');
      test.skip();
      return;
    }

    // This test verifies the Sumsub adapter works
    const testUserId = 'test-user-sandbox';
    const status = await sumsub.checkApplicantStatus(testUserId);
    console.log('[Audit] Sumsub connection test - Status:', status);
    
    // Status could be 'ERROR' if user doesn't exist, which is expected for new sandbox
    expect(['init', 'pending', 'completed', 'ERROR']).toContain(status);
  });

  test('can verify Supabase adapter connection', async ({ supabaseAdapter }) => {
    // Skip if Supabase credentials are not configured
    if (!supabaseAdapter.client) {
      console.log('[Audit] Skipping Supabase test - credentials not configured');
      test.skip();
      return;
    }

    // Test the adapter works
    const status = await supabaseAdapter.isUserVerified('nonexistent@test.com');
    console.log('[Audit] Supabase adapter test - Result:', status);
    
    expect(status).toHaveProperty('email');
    expect(status).toHaveProperty('whatsapp');
  });

});

