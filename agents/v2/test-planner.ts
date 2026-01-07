/**
 * Test Planner Agent
 * 
 * This agent creates test plans (NOT code) based on:
 * - Risk assessment (from RiskAssessor)
 * - Exploration data (from DeepExplorer)
 * - Context from knowledge store (RAG)
 * - Reference test patterns
 * 
 * Output: Structured test scenarios with steps, expected results,
 * and required data - ready for the CodeGenerator agent.
 */

import * as dotenv from 'dotenv';
import type { RiskAssessment } from './risk-assessor';
import type { ExplorationState } from './intelligent-deep-explorer';
import type { TestPattern } from './knowledge-store';
import { KnowledgeStore, getKnowledgeStore } from './knowledge-store';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Types for test plans
export interface TestStep {
  order: number;
  action: 'navigate' | 'click' | 'fill' | 'select' | 'check' | 'wait' | 'verify' | 'api_verify';
  target?: string; // Selector or description
  value?: string; // Value to fill or select
  description: string;
}

export interface TestAssertion {
  type: 'visible' | 'hidden' | 'text' | 'url' | 'api_response' | 'database';
  target: string;
  expected: string;
  description: string;
}

export interface TestScenario {
  id: string;
  name: string;
  type: 'happy_path' | 'negative' | 'edge_case' | 'security' | 'performance';
  priority: number; // 1-5 where 1 is highest
  preconditions: string[];
  steps: TestStep[];
  assertions: TestAssertion[];
  testData: Record<string, string>;
  cleanup: string[];
  tags: string[];
}

export interface TestPlan {
  featureName: string;
  description: string;
  riskLevel: string;
  createdAt: string;
  scenarios: TestScenario[];
  sharedSetup: string[];
  sharedCleanup: string[];
  requiredFixtures: string[];
}

export interface PlannerOptions {
  /** Features/modals to exclude from test generation (already tested separately) */
  excludeFeatures?: string[];
}

/**
 * Call Groq API for planning
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
      temperature: 0.3,
      max_tokens: 3000,
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
 * Test Planner Agent
 */
export class TestPlanner {
  private knowledgeStore: KnowledgeStore | null = null;

  /**
   * Initialize with knowledge store
   */
  async init(): Promise<void> {
    this.knowledgeStore = await getKnowledgeStore();
    console.log('[TestPlanner] Initialized with knowledge store');
  }

  /**
   * Create a test plan for a feature
   */
  async createPlan(
    riskAssessment: RiskAssessment,
    explorationState?: ExplorationState,
    options?: PlannerOptions
  ): Promise<TestPlan> {
    console.log(`\n📝 [TestPlanner] Creating plan for: ${riskAssessment.featureName}`);
    
    if (options?.excludeFeatures?.length) {
      console.log(`   ⏭️  Excluding features: ${options.excludeFeatures.join(', ')}`);
    }

    if (!this.knowledgeStore) {
      await this.init();
    }

    // Get relevant context from knowledge store
    const context = await this.gatherContext(riskAssessment.featureName);

    // Determine scenario types based on risk
    const scenarioTypes = this.determineScenarioTypes(riskAssessment);

    // Generate scenarios using LLM
    let scenarios = await this.generateScenarios(
      riskAssessment,
      scenarioTypes,
      context,
      explorationState,
      options?.excludeFeatures
    );

    // HARD FILTER: Remove any scenarios that match exclusion patterns
    // (LLMs don't reliably follow exclusion instructions)
    if (options?.excludeFeatures?.length) {
      const beforeCount = scenarios.length;
      scenarios = this.filterExcludedScenarios(scenarios, options.excludeFeatures);
      const removedCount = beforeCount - scenarios.length;
      if (removedCount > 0) {
        console.log(`   🗑️  Removed ${removedCount} excluded scenarios`);
      }
      
      // If ALL scenarios were filtered, generate fallback scenarios based on exploration
      if (scenarios.length === 0 && explorationState) {
        console.log(`   ⚠️  All scenarios filtered! Generating from exploration data...`);
        scenarios = this.generateScenariosFromExploration(
          riskAssessment.featureName,
          explorationState,
          options.excludeFeatures
        );
      }
    }

    // Determine required fixtures
    const fixtures = this.determineFixtures(scenarios);

    const plan: TestPlan = {
      featureName: riskAssessment.featureName,
      description: riskAssessment.reasoning,
      riskLevel: riskAssessment.riskLevel,
      createdAt: new Date().toISOString(),
      scenarios,
      sharedSetup: this.generateSharedSetup(riskAssessment.featureName),
      sharedCleanup: this.generateSharedCleanup(riskAssessment.featureName),
      requiredFixtures: fixtures,
    };

    console.log(`   Created ${scenarios.length} scenarios`);
    console.log(`   Types: ${[...new Set(scenarios.map(s => s.type))].join(', ')}`);

    return plan;
  }

  /**
   * Gather context from knowledge store
   */
  private async gatherContext(featureName: string): Promise<string> {
    if (!this.knowledgeStore) return '';

    // Get relevant test patterns
    const patterns = await this.knowledgeStore.getTestPatternsForFeature(featureName);

    // Get relevant explorations
    const explorations = await this.knowledgeStore.query(
      `Feature ${featureName} elements interactions`,
      'exploration',
      10
    );

    let context = '';

    if (patterns.length > 0) {
      context += '\n## Reference Test Patterns:\n';
      for (const p of patterns as TestPattern[]) {
        context += `- ${p.testName}: ${p.steps.join(' → ')}\n`;
      }
    }

    if (explorations.length > 0) {
      context += '\n## Explored Elements:\n';
      for (const e of explorations) {
        if (e.type === 'exploration') {
          context += `- ${e.elementType}: ${e.selector} - ${e.text}\n`;
        }
      }
    }

    return context;
  }

  /**
   * Determine which scenario types to include based on risk
   */
  private determineScenarioTypes(
    risk: RiskAssessment
  ): Array<TestScenario['type']> {
    const types: Array<TestScenario['type']> = ['happy_path'];

    if (risk.testingRecommendations.includeNegativeTests) {
      types.push('negative');
    }

    if (risk.testingRecommendations.includeEdgeCases) {
      types.push('edge_case');
    }

    if (risk.testingRecommendations.includeSecurityTests) {
      types.push('security');
    }

    if (risk.testingRecommendations.includePerformanceTests) {
      types.push('performance');
    }

    return types;
  }

  /**
   * Generate scenarios directly from exploration data when LLM fails
   */
  private generateScenariosFromExploration(
    featureName: string,
    explorationState: ExplorationState,
    excludeFeatures: string[]
  ): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const excludePatterns = new Set(excludeFeatures.map(f => f.toLowerCase()));
    
    // Add login/signup patterns
    if (excludePatterns.has('login') || excludePatterns.has('login-modal')) {
      excludePatterns.add('log in');
      excludePatterns.add('sign in');
    }
    if (excludePatterns.has('signup') || excludePatterns.has('signup-modal')) {
      excludePatterns.add('sign up');
      excludePatterns.add('join now');
      excludePatterns.add('register');
    }
    
    // Group elements by type for scenario generation
    const buttons: string[] = [];
    const inputs: string[] = [];
    const links: string[] = [];
    
    for (const [selector, info] of explorationState.discoveredSelectors) {
      const desc = (info.description || '').toLowerCase();
      const sel = selector.toLowerCase();
      
      // Skip excluded elements
      let isExcluded = false;
      for (const pattern of excludePatterns) {
        if (desc.includes(pattern) || sel.includes(pattern)) {
          isExcluded = true;
          break;
        }
      }
      if (isExcluded) continue;
      
      if (info.elementType === 'button') {
        buttons.push(info.description || selector);
      } else if (info.elementType === 'input') {
        inputs.push(info.description || selector);
      } else if (info.elementType === 'link') {
        links.push(info.description || selector);
      }
    }
    
    // Generate navigation test
    scenarios.push({
      id: 'nav-1',
      name: `Navigate to ${featureName}`,
      type: 'happy_path',
      priority: 1,
      preconditions: ['User is not logged in'],
      steps: [
        { order: 1, action: 'navigate', target: '/', description: `Navigate to ${featureName}` },
        { order: 2, action: 'wait', description: 'Wait for page to load' },
      ],
      assertions: [
        { type: 'visible', target: 'body', expected: 'true', description: 'Page loads successfully' },
      ],
      testData: {},
      cleanup: [],
      tags: ['navigation', 'smoke'],
    });
    
    // Generate button interaction tests (limit to top 5)
    const topButtons = buttons.slice(0, 5);
    for (let i = 0; i < topButtons.length; i++) {
      scenarios.push({
        id: `btn-${i + 1}`,
        name: `Click ${topButtons[i]} button`,
        type: 'happy_path',
        priority: 2,
        preconditions: ['User is on home page'],
        steps: [
          { order: 1, action: 'navigate', target: '/', description: 'Navigate to home page' },
          { order: 2, action: 'click', target: topButtons[i], description: `Click ${topButtons[i]} button` },
          { order: 3, action: 'wait', description: 'Wait for response' },
        ],
        assertions: [
          { type: 'visible', target: 'body', expected: 'true', description: 'Page remains stable' },
        ],
        testData: {},
        cleanup: [],
        tags: ['interaction', 'button'],
      });
    }
    
    // Generate search test if search input exists
    const searchInput = inputs.find(i => i.toLowerCase().includes('search') || i.toLowerCase().includes('find'));
    if (searchInput) {
      scenarios.push({
        id: 'search-1',
        name: 'Search functionality',
        type: 'happy_path',
        priority: 2,
        preconditions: ['User is on home page'],
        steps: [
          { order: 1, action: 'navigate', target: '/', description: 'Navigate to home page' },
          { order: 2, action: 'fill', target: searchInput, value: 'test search', description: 'Enter search term' },
          { order: 3, action: 'wait', description: 'Wait for search results' },
        ],
        assertions: [
          { type: 'visible', target: 'body', expected: 'true', description: 'Search completes' },
        ],
        testData: { searchTerm: 'test search' },
        cleanup: [],
        tags: ['search', 'input'],
      });
    }
    
    console.log(`   ✅ Generated ${scenarios.length} scenarios from exploration data`);
    return scenarios;
  }

  /**
   * Filter out scenarios that match exclusion patterns
   * This is a hard filter that runs AFTER LLM generation
   */
  private filterExcludedScenarios(
    scenarios: TestScenario[],
    excludeFeatures: string[]
  ): TestScenario[] {
    // Build regex patterns for matching
    const patterns = excludeFeatures.map(f => f.toLowerCase());
    
    // Also add common variations
    const allPatterns = new Set(patterns);
    if (patterns.some(p => p.includes('login') || p.includes('signin'))) {
      allPatterns.add('login');
      allPatterns.add('log in');
      allPatterns.add('sign in');
      allPatterns.add('signin');
      allPatterns.add('authentication');
      allPatterns.add('authenticate');
      allPatterns.add('credentials');
    }
    if (patterns.some(p => p.includes('signup') || p.includes('register'))) {
      allPatterns.add('signup');
      allPatterns.add('sign up');
      allPatterns.add('register');
      allPatterns.add('registration');
      allPatterns.add('create account');
      allPatterns.add('new account');
    }

    return scenarios.filter(scenario => {
      const nameLC = scenario.name.toLowerCase();
      const tagsLC = scenario.tags.map(t => t.toLowerCase());
      const stepsText = scenario.steps.map(s => s.description.toLowerCase()).join(' ');
      
      // Check if scenario matches any exclusion pattern
      for (const pattern of allPatterns) {
        if (nameLC.includes(pattern) || 
            tagsLC.some(t => t.includes(pattern)) ||
            stepsText.includes(pattern)) {
          console.log(`      ❌ Excluding scenario: "${scenario.name}" (matches: ${pattern})`);
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Generate test scenarios using LLM
   */
  private async generateScenarios(
    risk: RiskAssessment,
    scenarioTypes: Array<TestScenario['type']>,
    context: string,
    explorationState?: ExplorationState,
    excludeFeatures?: string[]
  ): Promise<TestScenario[]> {
    // Format discovered selectors with emphasis on USING THEM
    const discoveredSelectors = explorationState
      ? Array.from(explorationState.discoveredSelectors.entries())
          .map(([sel, info]) => ({
            selector: sel,
            type: info.elementType,
            description: info.description || '',
          }))
      : [];

    const explorationInfo = discoveredSelectors.length > 0
      ? `\n## DISCOVERED SELECTORS (YOU MUST USE ONLY THESE - DO NOT INVENT SELECTORS):
${discoveredSelectors.map(s => `- ${s.type}: "${s.selector}" - ${s.description}`).join('\n')}

⚠️ CRITICAL: Only use selectors from the list above. Do NOT invent data-testid values that are not listed.
If you need a selector for an element not in the list, use generic Playwright locators like:
- page.getByRole('button', { name: 'Button Text' })
- page.getByText('Some visible text')
- page.getByPlaceholder('placeholder text')
- page.locator('button:has-text("text")')
`
      : '';

    // Build exclusion warning if features should be excluded
    const exclusionWarning = excludeFeatures?.length
      ? `\n## IMPORTANT - DO NOT INCLUDE THESE FEATURES (already tested separately):\n${excludeFeatures.map(f => `- ${f}`).join('\n')}\nDo NOT generate any scenarios related to: ${excludeFeatures.join(', ')}\n`
      : '';

    // Only include auth context for auth-related features
    const featureLower = risk.featureName.toLowerCase();
    const isAuthFeature = featureLower.includes('login') || featureLower.includes('signup') || 
                          featureLower.includes('auth') || featureLower.includes('register');
    
    const authContext = isAuthFeature ? `
## Auth-specific Selectors (only for login/signup features):
- Login modal: data-testid="login-modal"
- Signup modal: data-testid="signup-modal"
- Email input (login): #login-email
- Password input (login): #login-password
- Error messages: .text-red-400 or .text-red-500
` : '';

    // Build example based on feature type
    const exampleScenario = isAuthFeature ? `
    {
      "id": "login_valid_credentials",
      "name": "Login with valid email and password",
      "type": "happy_path",
      "priority": 1,
      "preconditions": ["User exists in database"],
      "steps": [
        { "order": 1, "action": "navigate", "target": "/?action=login", "description": "Open login modal" },
        { "order": 2, "action": "wait", "target": "[data-testid='login-modal']", "description": "Wait for modal" },
        { "order": 3, "action": "fill", "target": "#login-email", "value": "{email}", "description": "Enter email" }
      ],
      "assertions": [
        { "type": "hidden", "target": "[data-testid='login-modal']", "expected": "modal closes", "description": "Modal closes" }
      ],
      "testData": { "email": "test@example.com", "password": "TestPassword123!" },
      "cleanup": [],
      "tags": ["auth", "login"]
    }` : `
    {
      "id": "page_loads_correctly",
      "name": "Page loads and displays main content",
      "type": "happy_path",
      "priority": 1,
      "preconditions": [],
      "steps": [
        { "order": 1, "action": "navigate", "target": "/", "description": "Navigate to page" },
        { "order": 2, "action": "wait", "description": "Wait for content to load" }
      ],
      "assertions": [
        { "type": "visible", "target": "body", "expected": "true", "description": "Page content is visible" }
      ],
      "testData": {},
      "cleanup": [],
      "tags": ["smoke", "navigation"]
    }`;

    const prompt = `You are a QA test planner. Create detailed test scenarios for this feature.

## Feature: ${risk.featureName}
${risk.reasoning}
${exclusionWarning}
## Risk Level: ${risk.riskLevel}
Risk Factors: ${risk.factors.map(f => f.factor).join(', ')}

## Required Scenario Types: ${scenarioTypes.join(', ')}
Total scenarios needed: ${risk.testingRecommendations.scenarioCount}

${context}
${explorationInfo}
${authContext}

## SELECTOR RULES:
1. ONLY use selectors from the "DISCOVERED SELECTORS" list above
2. If no discovered selector exists for an element, use:
   - getByRole('button', { name: 'text' }) for buttons
   - getByText('text') for text content
   - getByPlaceholder('text') for inputs
   - locator('tag:has-text("text")') for generic elements
3. DO NOT invent data-testid or ID values that are not in the discovered list
4. For visible text on page, use getByText() or :has-text() patterns

Generate test scenarios as JSON array. Each scenario should have:
1. Unique ID (snake_case)
2. Descriptive name
3. Type (from the required types)
4. Detailed steps with REAL selectors from discovered list
5. Clear assertions
6. Required test data

Respond ONLY with valid JSON:
{
  "scenarios": [${exampleScenario}
  ]
}`;

    try {
      const response = await callGroq(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.scenarios || [];
      }
    } catch (e: any) {
      console.log(`   [LLM] Planning failed: ${e.message}`);
    }

    // Return minimal fallback scenarios
    return this.createFallbackScenarios(risk);
  }

  /**
   * Create fallback scenarios if LLM fails
   */
  private createFallbackScenarios(risk: RiskAssessment): TestScenario[] {
    const featureLower = risk.featureName.toLowerCase();

    if (featureLower.includes('login')) {
      return [
        {
          id: 'login_happy_path',
          name: 'Login with valid credentials',
          type: 'happy_path',
          priority: 1,
          preconditions: ['User exists', 'User is verified'],
          steps: [
            { order: 1, action: 'navigate', target: '/?action=login', description: 'Open login page' },
            { order: 2, action: 'fill', target: '#login-email', value: '{email}', description: 'Enter email' },
            { order: 3, action: 'fill', target: '#login-password', value: '{password}', description: 'Enter password' },
            { order: 4, action: 'click', target: 'button:has-text("Login")', description: 'Click login' },
          ],
          assertions: [
            { type: 'hidden', target: '[data-testid="login-modal"]', expected: 'closed', description: 'Modal closes' },
          ],
          testData: { email: 'test@example.com', password: 'TestPassword123!' },
          cleanup: [],
          tags: ['login', 'auth'],
        },
        {
          id: 'login_invalid_credentials',
          name: 'Login with invalid credentials shows error',
          type: 'negative',
          priority: 2,
          preconditions: [],
          steps: [
            { order: 1, action: 'navigate', target: '/?action=login', description: 'Open login page' },
            { order: 2, action: 'fill', target: '#login-email', value: 'nonexistent@test.com', description: 'Enter invalid email' },
            { order: 3, action: 'fill', target: '#login-password', value: 'wrongpassword', description: 'Enter wrong password' },
            { order: 4, action: 'click', target: 'button:has-text("Login")', description: 'Click login' },
          ],
          assertions: [
            { type: 'visible', target: 'text="Invalid login credentials"', expected: 'error shown', description: 'Error message appears' },
          ],
          testData: {},
          cleanup: [],
          tags: ['login', 'negative'],
        },
      ];
    }

    // Generic fallback
    return [
      {
        id: `${risk.featureName.toLowerCase().replace(/\s+/g, '_')}_happy_path`,
        name: `${risk.featureName} - Happy Path`,
        type: 'happy_path',
        priority: 1,
        preconditions: [],
        steps: [
          { order: 1, action: 'navigate', target: '/', description: 'Open app' },
        ],
        assertions: [],
        testData: {},
        cleanup: [],
        tags: [risk.featureName.toLowerCase()],
      },
    ];
  }

  /**
   * Determine required fixtures based on scenarios
   */
  private determineFixtures(scenarios: TestScenario[]): string[] {
    const fixtures = new Set<string>();

    fixtures.add('page'); // Always needed

    for (const scenario of scenarios) {
      // Check for database operations
      if (scenario.preconditions.some(p => p.includes('database') || p.includes('exists'))) {
        fixtures.add('supabaseAdapter');
      }

      // Check for API verifications
      if (scenario.assertions.some(a => a.type === 'api_response' || a.type === 'database')) {
        fixtures.add('supabaseAdapter');
      }

      // Check for KYC/Sumsub
      if (scenario.tags.includes('kyc') || scenario.name.toLowerCase().includes('kyc')) {
        fixtures.add('sumsub');
      }
    }

    return Array.from(fixtures);
  }

  /**
   * Generate shared setup steps
   */
  private generateSharedSetup(featureName: string): string[] {
    const setup: string[] = [];
    const lower = featureName.toLowerCase();

    if (lower.includes('login') || lower.includes('signup')) {
      setup.push('Clean up test user if exists');
    }

    return setup;
  }

  /**
   * Generate shared cleanup steps
   */
  private generateSharedCleanup(featureName: string): string[] {
    const cleanup: string[] = [];
    const lower = featureName.toLowerCase();

    if (lower.includes('signup') || lower.includes('register')) {
      cleanup.push('Delete created test user');
    }

    return cleanup;
  }

  /**
   * Store test plan as patterns in knowledge store
   */
  async storePlanAsPatterns(plan: TestPlan): Promise<void> {
    if (!this.knowledgeStore) {
      await this.init();
    }

    for (const scenario of plan.scenarios) {
      const pattern: TestPattern = {
        type: 'test_pattern',
        featureName: plan.featureName,
        testName: scenario.name,
        steps: scenario.steps.map(s => `${s.action}: ${s.target || ''} ${s.value || ''}`),
        assertions: scenario.assertions.map(a => `${a.type}: ${a.target}`),
        selectors: scenario.steps
          .filter(s => s.target && s.target.startsWith('[') || s.target?.startsWith('#'))
          .map(s => s.target!),
        sourceFile: 'generated',
      };

      await this.knowledgeStore!.storeTestPattern(pattern);
    }

    console.log(`   Stored ${plan.scenarios.length} patterns in knowledge store`);
  }

  /**
   * Format plan as markdown for review
   */
  formatPlanAsMarkdown(plan: TestPlan): string {
    let md = `# Test Plan: ${plan.featureName}

**Risk Level:** ${plan.riskLevel}
**Created:** ${plan.createdAt}
**Description:** ${plan.description}

## Required Fixtures
${plan.requiredFixtures.map(f => `- \`${f}\``).join('\n')}

## Shared Setup
${plan.sharedSetup.map(s => `- ${s}`).join('\n') || '_None_'}

## Shared Cleanup
${plan.sharedCleanup.map(c => `- ${c}`).join('\n') || '_None_'}

---

## Test Scenarios

`;

    for (const scenario of plan.scenarios) {
      const typeIcon = {
        happy_path: '✅',
        negative: '❌',
        edge_case: '⚠️',
        security: '🔒',
        performance: '⚡',
      }[scenario.type];

      md += `### ${typeIcon} ${scenario.name}
**ID:** \`${scenario.id}\`
**Type:** ${scenario.type}
**Priority:** ${scenario.priority}
**Tags:** ${scenario.tags.map(t => `\`${t}\``).join(', ')}

#### Preconditions
${scenario.preconditions.map(p => `- ${p}`).join('\n') || '_None_'}

#### Steps
| # | Action | Target | Value | Description |
|---|--------|--------|-------|-------------|
${scenario.steps.map(s => `| ${s.order} | ${s.action} | ${s.target || '-'} | ${s.value || '-'} | ${s.description} |`).join('\n')}

#### Assertions
${scenario.assertions.map(a => `- **${a.type}:** ${a.target} → ${a.expected}`).join('\n')}

#### Test Data
\`\`\`json
${JSON.stringify(scenario.testData, null, 2)}
\`\`\`

---

`;
    }

    return md;
  }
}

/**
 * Create a test planner instance
 */
export function createTestPlanner(): TestPlanner {
  return new TestPlanner();
}

export default TestPlanner;

