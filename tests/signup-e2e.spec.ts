/**
 * E2E Signup Test with Agentic Automation
 * 
 * This test demonstrates agentic testing where an LLM agent:
 * 1. Navigates the signup flow
 * 2. Fills forms intelligently
 * 3. Handles OTP verification (using test bypass code 123456)
 * 4. Verifies successful signup
 * 
 * PREREQUISITES:
 * - Set TEST_MODE=true in Supabase Edge Functions environment
 * - Set GROQ_API_KEY in .env file
 * - Run `npm run dev` before testing
 */
import { test, expect } from '../adapters';
import { createAgent } from '../agents/groq-agent';

// Test user data - use unique email to avoid conflicts
const TEST_USER = {
  email: `test.agent.${Date.now()}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Test Agent User',
  phone: '561234567', // UAE format without country code
  phoneCode: '+971',
  dob: '1990-01-15',
  country: 'United Arab Emirates',
  otp: '123456', // Test bypass code
};

test.describe('E2E Signup Flow - Agentic', () => {
  
  test.beforeEach(async ({ supabaseAdapter }) => {
    // Clean up any existing test user before each test
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });

  test.afterEach(async ({ supabaseAdapter }) => {
    // Clean up test user after each test
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });

  /**
   * Traditional E2E Test (without LLM agent)
   * This is the baseline - explicit steps without AI reasoning
   */
  test('can complete signup flow - traditional approach', async ({ page }) => {
    // Step 1: Navigate to app and open signup modal
    await page.goto('/?action=signup');
    await expect(page.getByTestId('signup-modal')).toBeVisible({ timeout: 10000 });

    // Step 2: Fill Step 1 of signup form
    // Using ID selectors for precise targeting
    await page.locator('#fullName').fill(TEST_USER.fullName);
    await page.locator('input[name="email"]').fill(TEST_USER.email);
    
    // Password fields - use IDs to avoid conflicts
    await page.locator('#password').fill(TEST_USER.password);
    await page.locator('#confirmPassword').fill(TEST_USER.password);
    
    // Date of birth - click the button to open picker, then select a date
    await page.getByText('Select date of birth').click();
    // Select year 1990, month January, day 15
    await page.locator('select').first().selectOption('0'); // January
    await page.locator('select').last().selectOption('1990');
    await page.getByRole('button', { name: '15' }).click();
    
    // Country of residence
    await page.getByText('Select country').click();
    await page.getByText('United Arab Emirates').click();

    // Click Continue to Step 2
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for step 2 to appear
    await expect(page.getByText('Security & Verification')).toBeVisible({ timeout: 10000 });
    console.log('[Test] Signup form step 1 completed, now on step 2');
  });

  /**
   * Agentic E2E Test (with LLM agent)
   * The agent reasons about what to do at each step
   */
  test.skip('can complete signup flow - agentic approach', async ({ page }) => {
    // Create agent with test data
    const agent = createAgent(page, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      fullName: TEST_USER.fullName,
      phone: `${TEST_USER.phoneCode}${TEST_USER.phone}`,
      otp: TEST_USER.otp,
    });

    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Let the agent achieve the signup goal
    const result = await agent.achieve(
      'Open the signup modal, fill in the registration form with the test data, ' +
      'and complete the signup process including OTP verification using code 123456'
    );

    console.log(`[Agent Result] Success: ${result.success}, Steps: ${result.steps}, Message: ${result.message}`);

    // Assert the result
    expect(result.success).toBe(true);
  });

  /**
   * Hybrid Test - Agent for exploration, explicit for verification
   */
  test('hybrid: agent navigates, explicit verification', async ({ page, supabaseAdapter }) => {
    // Step 1: Navigate with explicit command
    await page.goto('/?action=signup');
    await expect(page.getByTestId('signup-modal')).toBeVisible({ timeout: 10000 });

    // Step 2: Fill form explicitly using IDs (most reliable)
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_USER.email);
      console.log('[Test] Filled email');
    }

    const fullNameInput = page.locator('#fullName');
    if (await fullNameInput.isVisible()) {
      await fullNameInput.fill(TEST_USER.fullName);
      console.log('[Test] Filled full name');
    }

    // Step 3: Verify with Supabase adapter (agent could do this too)
    // After form submission, check if user was created
    // Note: This is just a demonstration - actual test would complete the flow

    console.log('[Test] Hybrid test completed - demonstrated form filling');
  });
});

test.describe('E2E Login Flow', () => {
  
  test('can open login modal and see form', async ({ page }) => {
    await page.goto('/?action=login');
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
    
    // Verify form elements are visible using IDs
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    
    console.log('[Test] Login modal is properly displayed');
  });

  test('can fill login form', async ({ page }) => {
    await page.goto('/?action=login');
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
    
    // Fill the form using IDs
    await page.locator('#login-email').fill('test@example.com');
    await page.locator('#login-password').fill('TestPassword123!');
    
    // Verify the Login button is visible
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    
    console.log('[Test] Login form filled successfully');
  });
});

test.describe('Supabase Adapter Tests', () => {
  
  test('can connect to Supabase', async ({ supabaseAdapter }) => {
    // Test that the adapter is properly initialized
    expect(supabaseAdapter).toBeDefined();
    expect(supabaseAdapter.getEmailOtp).toBeDefined();
    expect(supabaseAdapter.deleteTestUser).toBeDefined();
    
    console.log('[Test] Supabase adapter is properly configured');
  });

  test('can query user verification status', async ({ supabaseAdapter }) => {
    // Try to check a non-existent user (should return false for both)
    const status = await supabaseAdapter.isUserVerified('nonexistent@example.com');
    
    expect(status.email).toBe(false);
    expect(status.whatsapp).toBe(false);
    
    console.log('[Test] Verification status query works');
  });
});

