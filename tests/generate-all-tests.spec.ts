/**
 * Test Generator Bootstrap
 * 
 * This test uses the Test Writer Agent to automatically generate
 * all other tests by exploring your application.
 * 
 * The agent now uses App Context (agents/app-context.ts) to inject
 * correct selectors, error messages, and flow knowledge into Groq prompts.
 * 
 * Run this once to generate your test suite, then run the generated tests.
 * 
 * Usage:
 *   npx playwright test tests/generate-all-tests.spec.ts
 * 
 * Note: KYC is excluded because it requires login first (not a standalone page).
 */
import { test } from '@playwright/test';
import { createTestWriter } from '../agents/test-writer-agent';
import { getTestableFeatures } from '../agents/app-context';

test.describe('Test Generation (with App Context)', () => {
  
  test('generate tests for login flow', async ({ page }) => {
    const agent = createTestWriter(page);
    
    await agent.generateTests(
      '/?action=login',
      'Login Flow'
    );
  });

  test('generate tests for signup flow', async ({ page }) => {
    const agent = createTestWriter(page);
    
    await agent.generateTests(
      '/?action=signup',
      'Signup Flow'
    );
  });

  // KYC is intentionally NOT included here.
  // KYC requires the user to be logged in first.
  // See agents/app-context.ts for details on the KYC flow.
  // 
  // To test KYC:
  // 1. First complete signup and verification
  // 2. Login with verified user
  // 3. Then check if Sumsub widget appears
  //
  // Example in reference test: tests/reference-signup-flow.spec.ts

  test('generate all testable features', async ({ page }) => {
    const agent = createTestWriter(page);
    
    // This will generate tests for login and signup only
    // KYC is excluded from testable features
    const features = getTestableFeatures();
    console.log('\n📋 Testable features:');
    features.forEach(f => console.log(`   - ${f.name}: ${f.description}`));
    console.log('\n⚠️  KYC is NOT included (requires login first)\n');
    
    await agent.generateAllTests();
  });

});
