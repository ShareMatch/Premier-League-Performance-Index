/**
 * Code Generator Agent
 * 
 * This agent generates Playwright test code from test plans.
 * It does NOT execute tests - only generates code.
 * 
 * Uses:
 * - Reference tests as templates (real-signup-test.spec.ts, real-login-test.spec.ts)
 * - Test plans from TestPlanner
 * - Context from knowledge store
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { TestPlan, TestScenario, TestStep, TestAssertion } from './test-planner';
import type { KnowledgeStore } from './knowledge-store';
import { getKnowledgeStore } from './knowledge-store';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface GeneratedTest {
  filename: string;
  code: string;
  plan: TestPlan;
  metadata: {
    generatedAt: string;
    scenarioCount: number;
    linesOfCode: number;
  };
}

/**
 * Reference test templates extracted from existing tests
 * Note: Import path is ../../adapters because generated tests are in tests/generated/
 */
const REFERENCE_TEMPLATES = {
  imports: `import { test, expect } from '../../adapters';`,
  
  testUserSetup: `
const TEST_USER = {
  email: \`test.\${Date.now()}@example.com\`,
  password: 'TestPassword123!',
  fullName: 'Test User',
  phone: '501234567',
  dob: { month: '0', year: '1990', day: '15' },
};`,

  beforeEach: `
  test.beforeEach(async ({ supabaseAdapter }) => {
    // Clean up any existing test user
    console.log(\`[Setup] Cleaning up test user: \${TEST_USER.email}\`);
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });`,

  afterEach: `
  test.afterEach(async ({ supabaseAdapter }) => {
    // Clean up test user after test
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });`,

  loginModalPattern: `
    // Navigate to login
    await page.goto('/?action=login');
    console.log('[Step] Navigated to login page');

    // Wait for login modal
    const loginModal = page.getByTestId('login-modal');
    await expect(loginModal).toBeVisible({ timeout: 15000 });
    console.log('[Step] Login modal visible');

    // Fill credentials
    await loginModal.locator('#login-email').fill(email);
    await loginModal.locator('#login-password').fill(password);

    // Click login
    const loginButton = loginModal.getByRole('button', { name: /login/i });
    await expect(loginButton).toBeEnabled();
    await loginButton.click();
    console.log('[Step] Clicked Login');`,

  signupStep1Pattern: `
    // Navigate to signup
    await page.goto('/?action=signup');
    const signupModal = page.getByTestId('signup-modal');
    await expect(signupModal).toBeVisible({ timeout: 15000 });

    // Step 1: Personal Info
    await signupModal.locator('#fullName').fill(fullName);
    await signupModal.locator('input[name="email"]').fill(email);
    await signupModal.locator('#password').fill(password);
    await signupModal.locator('#confirmPassword').fill(password);

    // Date of birth
    await signupModal.getByText('Select date of birth').click();
    await page.waitForTimeout(500);
    const selects = signupModal.locator('select');
    await selects.first().selectOption(dob.month);
    await selects.last().selectOption(dob.year);
    await signupModal.locator('.grid.grid-cols-7 button').filter({ hasText: dob.day }).first().click();

    // Country
    await signupModal.getByText('Select country').click();
    await page.waitForTimeout(500);
    await page.getByText('United Arab Emirates').first().click();

    // Continue
    await signupModal.getByRole('button', { name: /continue/i }).click();`,

  otpVerificationPattern: `
    // Wait for OTP modal
    const otpInput = page.locator('input[maxlength="1"]');
    await expect(otpInput.first()).toBeVisible({ timeout: 15000 });

    // Fetch OTP from database
    const otp = await supabaseAdapter.getEmailOtp(email);
    if (otp) {
      // Fill OTP digits
      for (let i = 0; i < 6; i++) {
        await otpInput.nth(i).fill(otp[i]);
      }
      // Click verify
      await page.getByRole('button', { name: /verify/i }).first().click();
    }`,
};

/**
 * Call Groq API for code generation
 */
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Code Generator Agent
 */
export class CodeGenerator {
  private knowledgeStore: KnowledgeStore | null = null;
  private outputDir: string;
  
  constructor(outputDir?: string) {
    this.outputDir = outputDir || path.join(process.cwd(), 'tests', 'generated');
  }
  
  /**
   * Initialize with knowledge store
   */
  async init(): Promise<void> {
    this.knowledgeStore = await getKnowledgeStore();
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log(`[CodeGenerator] Initialized, output: ${this.outputDir}`);
  }
  
  /**
   * Generate test code from a plan
   */
  async generateFromPlan(plan: TestPlan): Promise<GeneratedTest> {
    console.log(`\n💻 [CodeGenerator] Generating code for: ${plan.featureName}`);
    
    if (!this.knowledgeStore) {
      await this.init();
    }
    
    // Generate test code
    const code = await this.generateTestCode(plan);
    
    // Create filename
    const filename = `${plan.featureName.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
    const filepath = path.join(this.outputDir, filename);
    
    // Add header comment
    const fullCode = this.addHeader(code, plan);
    
    // Save to file
    fs.writeFileSync(filepath, fullCode, 'utf-8');
    console.log(`   Saved: ${filepath}`);
    
    const result: GeneratedTest = {
      filename,
      code: fullCode,
      plan,
      metadata: {
        generatedAt: new Date().toISOString(),
        scenarioCount: plan.scenarios.length,
        linesOfCode: fullCode.split('\n').length,
      },
    };
    
    return result;
  }
  
  /**
   * Generate test code
   */
  private async generateTestCode(plan: TestPlan): Promise<string> {
    // First try template-based generation
    const templateCode = this.generateFromTemplate(plan);
    
    if (templateCode) {
      console.log('   Using template-based generation');
      return templateCode;
    }
    
    // Fall back to LLM generation
    console.log('   Using LLM-based generation');
    return await this.generateWithLLM(plan);
  }
  
  /**
   * Generate code using templates (preferred for known patterns)
   */
  private generateFromTemplate(plan: TestPlan): string | null {
    const featureLower = plan.featureName.toLowerCase();
    
    if (featureLower.includes('login')) {
      return this.generateLoginTest(plan);
    }
    
    if (featureLower.includes('signup') || featureLower.includes('register')) {
      return this.generateSignupTest(plan);
    }
    
    return null;
  }
  
  /**
   * Generate login test from template
   */
  private generateLoginTest(plan: TestPlan): string {
    let code = `${REFERENCE_TEMPLATES.imports}

${REFERENCE_TEMPLATES.testUserSetup}

test.describe('${plan.featureName}', () => {
${REFERENCE_TEMPLATES.beforeEach}
${REFERENCE_TEMPLATES.afterEach}

`;

    for (const scenario of plan.scenarios) {
      code += this.generateScenarioCode(scenario, 'login');
    }

    code += `});
`;

    return code;
  }
  
  /**
   * Generate signup test from template
   */
  private generateSignupTest(plan: TestPlan): string {
    let code = `${REFERENCE_TEMPLATES.imports}

${REFERENCE_TEMPLATES.testUserSetup}

test.describe('${plan.featureName}', () => {
${REFERENCE_TEMPLATES.beforeEach}
${REFERENCE_TEMPLATES.afterEach}

`;

    for (const scenario of plan.scenarios) {
      code += this.generateScenarioCode(scenario, 'signup');
    }

    code += `});
`;

    return code;
  }
  
  /**
   * Generate code for a single scenario
   */
  private generateScenarioCode(scenario: TestScenario, context: 'login' | 'signup' | 'generic'): string {
    const fixtures = this.determineFixturesForScenario(scenario);
    const fixtureParam = fixtures.length > 1 
      ? `{ ${fixtures.join(', ')} }`
      : `{ ${fixtures[0]} }`;
    
    let code = `
  test('${scenario.name}', async (${fixtureParam}) => {
    console.log('[Test] Starting: ${scenario.name}');
`;

    // Add timeout for complex tests
    if (scenario.steps.length > 5) {
      code += `    test.setTimeout(120000);\n\n`;
    }

    // Generate step code
    for (const step of scenario.steps) {
      code += this.generateStepCode(step, scenario.testData);
    }

    // Generate assertion code
    code += `\n    // Assertions\n`;
    for (const assertion of scenario.assertions) {
      code += this.generateAssertionCode(assertion);
    }

    // Add screenshot
    code += `\n    await page.screenshot({ path: 'test-results/${scenario.id}.png' });\n`;
    
    code += `    console.log('[Test] Completed: ${scenario.name}');
  });
`;

    return code;
  }
  
  /**
   * Generate code for a test step
   */
  private generateStepCode(step: TestStep, testData: Record<string, string>): string {
    // Replace placeholders in value
    let value = step.value || '';
    for (const [key, val] of Object.entries(testData)) {
      value = value.replace(`{${key}}`, val);
    }
    
    switch (step.action) {
      case 'navigate':
        return `
    // ${step.description}
    await page.goto('${step.target}');
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'click':
        return `
    // ${step.description}
    await page.locator('${step.target}').click();
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'fill':
        // Use testData values
        const fillValue = value.startsWith('{') 
          ? `TEST_USER.${value.slice(1, -1)}`
          : `'${value}'`;
        return `
    // ${step.description}
    await page.locator('${step.target}').fill(${fillValue.includes('TEST_USER') ? fillValue : `'${value}'`});
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'select':
        return `
    // ${step.description}
    await page.locator('${step.target}').selectOption('${value}');
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'check':
        return `
    // ${step.description}
    await page.locator('${step.target}').check();
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'wait':
        if (step.target) {
          return `
    // ${step.description}
    await expect(page.locator('${step.target}')).toBeVisible({ timeout: 10000 });
    console.log('[Step ${step.order}] ${step.description}');
`;
        }
        return `
    // ${step.description}
    await page.waitForTimeout(${value || 1000});
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'verify':
        return `
    // ${step.description}
    await expect(page.locator('${step.target}')).toBeVisible();
    console.log('[Step ${step.order}] ${step.description}');
`;

      case 'api_verify':
        return `
    // ${step.description}
    // TODO: Add API verification for ${step.target}
    console.log('[Step ${step.order}] ${step.description}');
`;

      default:
        return `
    // ${step.description} (${step.action})
    // TODO: Implement ${step.action}
`;
    }
  }
  
  /**
   * Generate code for an assertion
   */
  private generateAssertionCode(assertion: TestAssertion): string {
    switch (assertion.type) {
      case 'visible':
        return `    await expect(page.locator('${assertion.target}')).toBeVisible({ timeout: 10000 });
    console.log('[Assert] ${assertion.description}');
`;

      case 'hidden':
        return `    await expect(page.locator('${assertion.target}')).toBeHidden({ timeout: 10000 });
    console.log('[Assert] ${assertion.description}');
`;

      case 'text':
        return `    await expect(page.locator('${assertion.target}')).toContainText('${assertion.expected}');
    console.log('[Assert] ${assertion.description}');
`;

      case 'url':
        return `    expect(page.url()).toContain('${assertion.expected}');
    console.log('[Assert] ${assertion.description}');
`;

      case 'api_response':
      case 'database':
        return `    // ${assertion.description}
    // const result = await supabaseAdapter.${assertion.target};
    // expect(result).toBeTruthy();
    console.log('[Assert] ${assertion.description}');
`;

      default:
        return `    // TODO: Assert ${assertion.type}: ${assertion.target}
`;
    }
  }
  
  /**
   * Determine fixtures needed for a scenario
   */
  private determineFixturesForScenario(scenario: TestScenario): string[] {
    const fixtures = ['page'];
    
    // Check if supabaseAdapter is needed
    const needsSupabase = 
      scenario.preconditions.some(p => p.includes('database') || p.includes('exists')) ||
      scenario.assertions.some(a => a.type === 'database' || a.type === 'api_response') ||
      scenario.cleanup.length > 0;
    
    if (needsSupabase) {
      fixtures.push('supabaseAdapter');
    }
    
    // Check for KYC/Sumsub
    if (scenario.tags.includes('kyc')) {
      fixtures.push('sumsub');
    }
    
    return fixtures;
  }
  
  /**
   * Generate test using LLM (fallback)
   */
  private async generateWithLLM(plan: TestPlan): Promise<string> {
    const prompt = `You are a Playwright test automation engineer.
Generate a complete test file for this test plan.

## Test Plan
Feature: ${plan.featureName}
Risk Level: ${plan.riskLevel}
Scenarios: ${plan.scenarios.map(s => s.name).join(', ')}

## Reference Code Style (MUST follow exactly):
\`\`\`typescript
${REFERENCE_TEMPLATES.imports}

${REFERENCE_TEMPLATES.testUserSetup}

test.describe('Feature Name', () => {
  ${REFERENCE_TEMPLATES.beforeEach}
  ${REFERENCE_TEMPLATES.afterEach}

  test('test name', async ({ page, supabaseAdapter }) => {
    console.log('[Test] Starting...');
    // test steps here
    console.log('[Test] Completed');
  });
});
\`\`\`

## Scenarios to Implement:
${JSON.stringify(plan.scenarios, null, 2)}

## CRITICAL Playwright API Rules (MUST follow):
1. Use EXACT import: ${REFERENCE_TEMPLATES.imports}
2. NEVER use page.toHaveSelector() - it doesn't exist!
3. For visibility checks, use: await expect(page.locator('selector')).toBeVisible()
4. For waiting, use: await page.locator('selector').waitFor()
5. For clicks, use: await page.locator('selector').click()
6. For filling inputs, use: await page.locator('selector').fill('value')
7. Prefer data-testid selectors: [data-testid="name"]
8. Avoid Tailwind CSS class selectors (like .absolute.top-6) - they are brittle!
9. Use getByRole, getByText, getByTestId for stable selectors
10. page.check() is ONLY for checkboxes - use .click() for buttons
11. Valid expect states: toBeVisible(), toBeHidden(), toBeEnabled(), toBeDisabled()

## Example correct assertions:
- await expect(page.locator('[data-testid="submit"]')).toBeVisible()
- await expect(page.getByRole('button', { name: 'Login' })).toBeEnabled()
- await expect(page.getByText('Welcome')).toBeVisible()

Generate ONLY the TypeScript code, no explanations:`;

    try {
      const response = await callGroq(prompt);
      
      // Extract code block if present
      const codeMatch = response.match(/```typescript\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/);
      
      let code: string;
      if (codeMatch) {
        code = codeMatch[1];
      } else if (response.trim().startsWith('import')) {
        code = response;
      } else {
        const importMatch = response.match(/import[\s\S]*/);
        code = importMatch ? importMatch[0] : response;
      }
      
      // Post-process to fix common LLM mistakes
      code = this.fixCommonLLMErrors(code);
      
      return code;
    } catch (e: any) {
      console.log(`   [LLM] Code generation failed: ${e.message}`);
      return this.generateMinimalTest(plan);
    }
  }
  
  /**
   * Fix common LLM mistakes in generated Playwright code
   */
  private fixCommonLLMErrors(code: string): string {
    let fixed = code;
    
    // Fix 1: Replace invalid page.toHaveSelector() with correct API
    // Pattern: await expect(page).toHaveSelector('selector', { state: 'visible' })
    fixed = fixed.replace(
      /await expect\(page\)\.toHaveSelector\(['"]([^'"]+)['"],?\s*\{[^}]*\}\)/g,
      "await expect(page.locator('$1')).toBeVisible()"
    );
    fixed = fixed.replace(
      /await expect\(page\)\.toHaveSelector\(['"]([^'"]+)['"]\)/g,
      "await expect(page.locator('$1')).toBeVisible()"
    );
    
    // Fix 2: Replace page.check() on buttons with page.click()
    // page.check() should only be used on checkboxes
    fixed = fixed.replace(
      /await page\.check\(['"]button[^'"]*['"]\)/g,
      (match) => match.replace('.check(', '.click(')
    );
    
    // Fix 3: Replace invalid state values
    fixed = fixed.replace(/\{ state: ['"]compliant['"] \}/g, '');
    fixed = fixed.replace(/\{ state: ['"]accessible['"] \}/g, '');
    
    // Fix 4: Fix brittle Tailwind class selectors (convert to more stable locators)
    // Replace selectors like 'button.absolute.top-6' with role-based selectors
    fixed = fixed.replace(
      /page\.locator\(['"]button\.absolute\.top-6['"]\)/g,
      "page.locator('button').first()"
    );
    fixed = fixed.replace(
      /page\.waitForSelector\(['"]button\.absolute\.top-6['"]\)/g,
      "page.locator('button').first().waitFor()"
    );
    fixed = fixed.replace(
      /page\.click\(['"]button\.absolute\.top-6['"]\)/g,
      "page.locator('button').first().click()"
    );
    
    // Fix 5: Fix invalid import paths
    if (fixed.includes("from '../adapters'") && !fixed.includes("from '../../adapters'")) {
      // Check context - if in tests/generated/, need ../../adapters
      fixed = fixed.replace("from '../adapters'", "from '../../adapters'");
    }
    
    // Fix 6: Remove empty option objects
    fixed = fixed.replace(/, \{\s*\}/g, '');
    
    console.log('   [CodeGenerator] Applied LLM error corrections');
    return fixed;
  }
  
  /**
   * Generate minimal test as last resort
   */
  private generateMinimalTest(plan: TestPlan): string {
    return `${REFERENCE_TEMPLATES.imports}

// Minimal generated test - needs manual enhancement
test.describe('${plan.featureName}', () => {
  test('placeholder test', async ({ page }) => {
    console.log('[Test] ${plan.featureName} - needs implementation');
    await page.goto('/');
    // TODO: Implement test scenarios:
    ${plan.scenarios.map(s => `// - ${s.name}`).join('\n    ')}
  });
});
`;
  }
  
  /**
   * Add header comment to generated code
   */
  private addHeader(code: string, plan: TestPlan): string {
    const header = `/**
 * ${plan.featureName} Tests
 * 
 * Auto-generated by CodeGenerator Agent
 * Generated at: ${new Date().toISOString()}
 * Risk Level: ${plan.riskLevel}
 * 
 * Scenarios:
${plan.scenarios.map(s => ` *   - ${s.name} (${s.type})`).join('\n')}
 * 
 * DO NOT EDIT DIRECTLY - regenerate using the test planner
 */

`;
    return header + code;
  }
  
  /**
   * Generate tests for multiple plans
   */
  async generateFromPlans(plans: TestPlan[]): Promise<GeneratedTest[]> {
    const results: GeneratedTest[] = [];
    
    for (const plan of plans) {
      try {
        const result = await this.generateFromPlan(plan);
        results.push(result);
      } catch (e: any) {
        console.log(`   ❌ Failed to generate ${plan.featureName}: ${e.message}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return results;
  }
}

/**
 * Create a code generator instance
 */
export function createCodeGenerator(outputDir?: string): CodeGenerator {
  return new CodeGenerator(outputDir);
}

export default CodeGenerator;

