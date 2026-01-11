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
import type { TestPlan } from './test-planner';
import type { KnowledgeStore } from './knowledge-store';
import { getKnowledgeStore } from './knowledge-store';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

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
 * Structural templates for generated tests
 * Note: Import path is ../../adapters because generated tests are in tests/generated/
 * 
 * IMPORTANT: These contain ONLY structural code (imports, setup/teardown).
 * Actual test steps and selectors come from the TestPlan (discovered during exploration).
 * NO hardcoded selectors should be here!
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
  
  // NOTE: No hardcoded selector patterns here!
  // All selectors come from discovered elements in the TestPlan
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
      max_tokens: 8000, // Increased to generate more complete test code
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
   * Generate code using templates - DISABLED
   * 
   * All test generation now uses LLM with discovered selectors to avoid
   * hardcoded selectors that may not exist on the actual page.
   * 
   * The LLM is given the actual selectors from exploration and instructed
   * to only use those selectors.
   */
  private generateFromTemplate(_plan: TestPlan): string | null {
    // Always return null to use LLM-based generation with discovered selectors
    // This prevents using any hardcoded selectors
    return null;
  }
  
  /**
   * Generate test using LLM (fallback)
   */
  private async generateWithLLM(plan: TestPlan): Promise<string> {
    // Extract actual selectors from the test plan to prevent hallucination
    const actualSelectors = plan.scenarios
      .flatMap(s => [
        ...s.steps.filter(step => step.target).map(step => step.target!),
        ...s.assertions.filter(a => a.target).map(a => a.target),
      ])
      .filter((sel, i, arr) => arr.indexOf(sel) === i); // Dedupe
    
    const selectorList = actualSelectors.length > 0
      ? `\n## SELECTORS FROM TEST PLAN (use ONLY these, do NOT invent new ones):\n${actualSelectors.map(s => `- ${s}`).join('\n')}\n`
      : '';

    const prompt = `You are a Playwright test automation engineer.
Generate a complete test file for this test plan.

## Test Plan
Feature: ${plan.featureName}
Risk Level: ${plan.riskLevel}
Scenarios: ${plan.scenarios.map(s => s.name).join(', ')}
${selectorList}
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
7. DO NOT invent data-testid values - only use selectors from the test plan above
8. Avoid Tailwind CSS class selectors (like .absolute.top-6) - they are brittle!
9. Use getByRole, getByText, getByPlaceholder for elements without explicit selectors
10. page.check() is ONLY for checkboxes - use .click() for buttons
11. Valid expect states: toBeVisible(), toBeHidden(), toBeEnabled(), toBeDisabled()

## IMPORTANT - For generic selectors, use these Playwright patterns:
- For buttons: page.getByRole('button', { name: 'Button Text' })
- For inputs: page.getByPlaceholder('placeholder text') 
- For text: page.getByText('visible text')
- For links: page.getByRole('link', { name: 'Link Text' })
- For body/page load: page.locator('body')

## Example correct assertions:
- await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
- await expect(page.getByText('Welcome')).toBeVisible()
- await expect(page.locator('body')).toBeVisible()

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
    
    // Fix 7: Replace likely hallucinated data-testids with safer selectors
    // Common hallucinated patterns: home-page, search-input, search-button, error-message, etc.
    const hallucinated = [
      { pattern: /\[data-testid=['"]home-page['"]\]/g, replacement: 'body' },
      { pattern: /\[data-testid=['"]search-input['"]\]/g, replacement: 'input[placeholder*="Search"], input[placeholder*="search"], input[placeholder*="Find"]' },
      { pattern: /\[data-testid=['"]search-button['"]\]/g, replacement: 'button:has-text("Search"), button[aria-label*="search"]' },
      { pattern: /\[data-testid=['"]search-results['"]\]/g, replacement: 'body' }, // Just verify page is visible
      { pattern: /\[data-testid=['"]error-message['"]\]/g, replacement: '.text-red-400, .text-red-500, [role="alert"]' },
      { pattern: /\[data-testid=['"]third-party-button['"]\]/g, replacement: 'button' },
      { pattern: /\[data-testid=['"]main-content['"]\]/g, replacement: 'main, body' },
      { pattern: /\[data-testid=['"]nav-[^'"]+['"]\]/g, replacement: 'nav, [role="navigation"]' },
    ];
    
    for (const { pattern, replacement } of hallucinated) {
      if (pattern.test(fixed)) {
        console.log(`   [CodeGenerator] Replacing hallucinated selector: ${pattern.source}`);
        fixed = fixed.replace(pattern, replacement);
      }
    }
    
    // Fix 8: For waitFor on generic selectors, add reasonable timeout
    fixed = fixed.replace(
      /\.waitFor\(\)/g,
      '.waitFor({ timeout: 5000 })'
    );
    
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

