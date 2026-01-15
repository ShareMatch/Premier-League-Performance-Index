/**
 * Test Writer Agent
 * 
 * This agent explores your app and writes test files automatically.
 * It uses Groq to understand the UI and generate Playwright test code.
 * 
 * Now with:
 * - App Context injection for accurate selectors and flow knowledge
 * - Rate limit handling with retry logic
 * - Smaller model for higher rate limits
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getAppContextForPrompt, getTestableFeatures, APP_CONTEXT } from './app-context';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Use smaller model with higher rate limits (30k TPM vs 12k TPM)
const GROQ_MODEL = 'llama-3.1-8b-instant';

// Rate limit settings
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 10000; // 10 seconds
const DELAY_BETWEEN_CALLS_MS = 5000; // 5 seconds between API calls

interface TestPlan {
  testName: string;
  description: string;
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  steps: string[];
  expectedResults: string[];
  needsBackendVerification: boolean;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Groq API with retry logic for rate limits
 */
async function callGroq(prompt: string, retryCount = 0): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured in .env file');
  }

  console.log(`🧠 Calling Groq API (${prompt.length} chars, attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Check for rate limit error (429)
      if (response.status === 429) {
        if (retryCount < MAX_RETRIES) {
          // Parse retry-after from error message if available
          let waitTime = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
          
          try {
            const errorData = JSON.parse(responseText);
            const message = errorData.error?.message || '';
            const match = message.match(/try again in (\d+\.?\d*)s/);
            if (match) {
              waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
            }
          } catch {}
          
          console.log(`⏳ Rate limited. Waiting ${Math.round(waitTime / 1000)}s before retry...`);
          await sleep(waitTime);
          return callGroq(prompt, retryCount + 1);
        } else {
          throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries. Try again later.`);
        }
      }

      console.error('❌ Groq API Error:', responseText);
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      } catch (e) {
        if (e instanceof Error && e.message.includes('Groq API error')) throw e;
        throw new Error(`Groq API error: ${response.status}\n${responseText}`);
      }
    }

    const data = JSON.parse(responseText);
    console.log('✅ Groq API call successful');
    return data.choices[0]?.message?.content || '';
  } catch (error: any) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error: Cannot reach Groq API. Check your internet connection.');
    }
    throw error;
  }
}

/**
 * Explore a page and understand what's testable
 */
async function explorePage(page: Page, url: string): Promise<string> {
  console.log(`🔍 Exploring: ${url}`);
  
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  // Wait a bit for modals to appear if triggered by URL params
  await page.waitForTimeout(1000);

  // Extract page information
  const pageInfo = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form')).map((form, i) => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => {
        const el = input as HTMLInputElement;
        return {
          type: el.type || 'text',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          required: el.required,
          testId: el.getAttribute('data-testid') || '',
          disabled: el.disabled,
        };
      });
      
      const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]')).map(btn => {
        const el = btn as HTMLButtonElement;
        return {
          text: el.innerText?.trim() || el.getAttribute('value') || '',
          testId: el.getAttribute('data-testid') || '',
          disabled: el.disabled,
          type: el.type || 'button',
        };
      });

      return { formIndex: i, inputs, buttons };
    });

    const modals = Array.from(document.querySelectorAll('[role="dialog"], [data-testid*="modal"]')).map(modal => {
      return {
        testId: modal.getAttribute('data-testid') || '',
        visible: (modal as HTMLElement).offsetParent !== null
      };
    });

    const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).map(btn => {
      const el = btn as HTMLButtonElement;
      return {
        text: el.innerText?.trim() || '',
        testId: el.getAttribute('data-testid') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        disabled: el.disabled,
      };
    }).filter(b => b.text || b.testId);

    return {
      url: window.location.href,
      title: document.title,
      forms,
      modals,
      buttons: buttons.slice(0, 15),
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean).slice(0, 10)
    };
  });

  return JSON.stringify(pageInfo, null, 2);
}

/**
 * Ask Groq to generate a test plan with app context
 */
async function generateTestPlan(pageInfo: string, feature: string): Promise<TestPlan> {
  const appContext = getAppContextForPrompt();
  
  const prompt = `You are a QA engineer analyzing a web application.

${appContext}

## Current Page Information (from browser exploration)
${pageInfo}

## Your Task
Create a comprehensive test plan for: ${feature}

Based on the app context AND page structure, identify:
1. All testable scenarios (happy path and edge cases)
2. Required user interactions (clicks, form fills, etc.)
3. Expected outcomes (using the ACTUAL error messages from app context)
4. Whether backend verification is needed

IMPORTANT:
- Use the EXACT selectors from the app context above
- Use the EXACT error messages from the app context above
- Do NOT invent selectors or error messages
- For login: button is disabled until both fields are filled
- For signup: it's a 2-step process

Respond ONLY with valid JSON in this format:
{
  "testName": "Feature Name",
  "description": "What this feature does",
  "scenarios": [
    {
      "name": "scenario name",
      "steps": ["step 1", "step 2"],
      "expectedResults": ["result 1", "result 2"],
      "needsBackendVerification": true
    }
  ]
}

Limit to 4-5 most important scenarios. Focus on:
1. Happy path (valid input)
2. Invalid credentials/input
3. Empty fields
4. One edge case

JSON response:`;

  const response = await callGroq(prompt);
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('LLM Response:', response);
    throw new Error('Failed to parse test plan from LLM response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Ask Groq to generate Playwright test code with app context
 */
async function generateTestCode(testPlan: TestPlan, pageInfo: string): Promise<string> {
  const appContext = getAppContextForPrompt();
  
  const prompt = `You are an expert Playwright test automation engineer.

${appContext}

## Test Plan to Implement
${JSON.stringify(testPlan, null, 2)}

## Current Page Structure (for reference)
${pageInfo}

## Your Task
Generate a complete Playwright test file that implements this test plan.

## CRITICAL REQUIREMENTS

1. **Import**: Use ONLY this import:
\`\`\`typescript
import { test, expect } from '../adapters';
\`\`\`

2. **Selectors**: Use the EXACT selectors from the app context above:
   - Login email: \`page.locator('#login-email')\`
   - Login password: \`page.locator('#login-password')\`
   - Signup fullName: \`page.locator('#fullName')\`
   - Signup email: \`page.locator('input[name="email"]')\`
   - etc.

3. **Button State**: Always wait for buttons to be enabled before clicking:
\`\`\`typescript
await expect(page.getByRole('button', { name: /login/i })).toBeEnabled();
await page.getByRole('button', { name: /login/i }).click();
\`\`\`

4. **Error Messages**: Use the EXACT error messages from app context, e.g.:
   - "${APP_CONTEXT.errorMessages.login.invalidCredentials}"
   - "${APP_CONTEXT.errorMessages.signup.emailInvalid}"

5. **Test Data**: Use unique emails:
\`\`\`typescript
const TEST_USER = {
  email: \`test.\${Date.now()}@example.com\`,
  password: '${APP_CONTEXT.testData.passwordExample}',
};
\`\`\`

6. **Cleanup**: Include beforeEach/afterEach:
\`\`\`typescript
test.beforeEach(async ({ supabaseAdapter }) => {
  await supabaseAdapter.deleteTestUser(TEST_USER.email);
});
\`\`\`

7. **Backend Verification**: When needed:
\`\`\`typescript
const user = await supabaseAdapter.getUserByEmail(TEST_USER.email);
expect(user).not.toBeNull();
\`\`\`

8. **Navigation**: For login modal:
\`\`\`typescript
await page.goto('/?action=login');
await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
\`\`\`

9. **Console Logging**: Add progress logs:
\`\`\`typescript
console.log('[Test] Starting scenario...');
console.log('[Test] Scenario completed successfully');
\`\`\`

## Complete Example

\`\`\`typescript
import { test, expect } from '../adapters';

const TEST_USER = {
  email: \`test.\${Date.now()}@example.com\`,
  password: '${APP_CONTEXT.testData.passwordExample}',
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ supabaseAdapter }) => {
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });

  test.afterEach(async ({ supabaseAdapter }) => {
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });

  test('valid login with existing user', async ({ page, supabaseAdapter }) => {
    console.log('[Test] Starting valid login test');
    
    // Create test user first
    await supabaseAdapter.createUser(TEST_USER.email, TEST_USER.password);
    
    // Navigate to login
    await page.goto('/?action=login');
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
    
    // Fill form
    await page.locator('#login-email').fill(TEST_USER.email);
    await page.locator('#login-password').fill(TEST_USER.password);
    
    // Wait for button to be enabled then click
    await expect(page.getByRole('button', { name: /login/i })).toBeEnabled();
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for result
    await page.waitForTimeout(2000);
    
    console.log('[Test] Login test completed');
  });

  test('invalid credentials shows error', async ({ page }) => {
    console.log('[Test] Starting invalid credentials test');
    
    await page.goto('/?action=login');
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
    
    // Fill with invalid credentials
    await page.locator('#login-email').fill('nonexistent@example.com');
    await page.locator('#login-password').fill('wrongpassword');
    
    await expect(page.getByRole('button', { name: /login/i })).toBeEnabled();
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check for error message
    await expect(page.getByText('${APP_CONTEXT.errorMessages.login.invalidCredentials}')).toBeVisible({ timeout: 5000 });
    
    console.log('[Test] Invalid credentials test completed');
  });
});
\`\`\`

Now generate the complete test file for the test plan above. Output ONLY the TypeScript code, no explanations:`;

  // Add delay before this call to avoid rate limits
  await sleep(DELAY_BETWEEN_CALLS_MS);
  
  const response = await callGroq(prompt);
  
  // Extract code block
  const codeMatch = response.match(/```typescript\n([\s\S]*?)\n```/) || 
                    response.match(/```\n([\s\S]*?)\n```/);
  
  if (codeMatch) {
    return codeMatch[1];
  }
  
  // If no code block, check if response starts with import
  if (response.trim().startsWith('import')) {
    return response;
  }
  
  // Try to extract just the code portion
  const importMatch = response.match(/import[\s\S]*/);
  if (importMatch) {
    return importMatch[0];
  }
  
  console.warn('⚠️ Could not extract code block, using full response');
  return response;
}

/**
 * Save test file to disk
 */
function saveTestFile(filename: string, code: string): string {
  const testsDir = path.join(process.cwd(), 'tests');
  
  // Ensure tests directory exists
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  const filepath = path.join(testsDir, filename);
  
  // Add header comment
  const header = `/**
 * Auto-generated test file
 * Generated at: ${new Date().toISOString()}
 * Generated by: Test Writer Agent (Groq + App Context)
 * 
 * Uses selectors and error messages from agents/app-context.ts
 */\n\n`;

  fs.writeFileSync(filepath, header + code, 'utf-8');
  
  console.log(`✅ Test file saved: ${filepath}`);
  return filepath;
}

/**
 * Main Test Writer Agent Class
 */
export class TestWriterAgent {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Explore and generate tests for a feature
   */
  async generateTests(url: string, featureName: string): Promise<string> {
    console.log(`\n🤖 Test Writer Agent (with App Context)`);
    console.log(`📋 Task: Generate tests for "${featureName}"`);
    console.log(`🌐 URL: ${url}`);
    console.log(`🔧 Model: ${GROQ_MODEL} (higher rate limits)\n`);

    // Step 1: Explore the page
    console.log('Step 1: Exploring page...');
    const pageInfo = await explorePage(this.page, url);

    // Step 2: Generate test plan with app context
    console.log('Step 2: Generating test plan (with app context)...');
    const testPlan = await generateTestPlan(pageInfo, featureName);
    console.log(`📝 Test plan created:`);
    console.log(`   - ${testPlan.scenarios.length} scenarios`);
    console.log(`   - Test name: ${testPlan.testName}`);
    testPlan.scenarios.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.name}`);
    });

    // Step 3: Generate test code with app context
    console.log('Step 3: Generating test code (with app context)...');
    const testCode = await generateTestCode(testPlan, pageInfo);

    // Step 4: Save to file
    console.log('Step 4: Saving test file...');
    const filename = `${featureName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
    const filepath = saveTestFile(filename, testCode);

    console.log(`\n✅ Test generation complete!`);
    console.log(`📁 File: ${filepath}`);
    console.log(`\n🚀 Run with: npx playwright test ${filepath}\n`);

    return filepath;
  }

  /**
   * Generate tests for all testable features (excludes KYC)
   * Runs sequentially to avoid rate limits
   */
  async generateAllTests(): Promise<string[]> {
    console.log(`\n🤖 Generating tests for all testable features`);
    console.log(`🔧 Model: ${GROQ_MODEL} (higher rate limits)`);
    console.log('ℹ️  Note: KYC is excluded (requires login first)');
    console.log('⏳ Running sequentially to avoid rate limits\n');

    const generatedFiles: string[] = [];
    const features = getTestableFeatures();

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📌 Feature ${i + 1}/${features.length}: ${feature.name}`);
        console.log(`   ${feature.description}`);
        console.log('='.repeat(60));
        
        const filepath = await this.generateTests(feature.url, feature.name);
        generatedFiles.push(filepath);
        
        // Add delay between features to avoid rate limits
        if (i < features.length - 1) {
          console.log(`\n⏳ Waiting ${DELAY_BETWEEN_CALLS_MS / 1000}s before next feature...`);
          await sleep(DELAY_BETWEEN_CALLS_MS);
        }
      } catch (error: any) {
        console.error(`\n❌ Failed to generate tests for ${feature.name}:`);
        console.error(`   ${error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Generated ${generatedFiles.length}/${features.length} test files!`);
    console.log('='.repeat(60));
    
    generatedFiles.forEach(f => console.log(`   📁 ${f}`));
    
    return generatedFiles;
  }
}

/**
 * Factory function
 */
export function createTestWriter(page: Page): TestWriterAgent {
  return new TestWriterAgent(page);
}

/**
 * Export configuration for scripts
 */
export const CONFIG = {
  GROQ_MODEL,
  MAX_RETRIES,
  INITIAL_RETRY_DELAY_MS,
  DELAY_BETWEEN_CALLS_MS,
};
