/**
 * Agentic Testing System v2 - Test Runner
 *
 * This test file runs the new multi-agent testing system.
 *
 * The system:
 * 1. Deep explores the app (clicks everything, records interactions)
 * 2. Assesses risk for each feature
 * 3. Creates test plans (NOT code yet)
 * 4. Generates Playwright test code
 * 5. Evaluates quality of generated tests
 *
 * Usage:
 *   npx playwright test tests/agentic-v2.spec.ts
 *
 * Note: This generates tests - it doesn't execute them.
 * After generation, run: npx playwright test tests/generated/
 */

import { test, expect } from "@playwright/test";
import * as path from "path";
import { createOrchestrator } from "../agents/v2";

// Define features to test
const FEATURES = [
  {
    url: "/",
    name: "Home Page",
    description: "Test the home page of the app",
  },
  {
    url: "/?action=login",
    name: "Login Flow",
  },
  {
    url: "/?action=signup",
    name: "Signup Flow",
  },
];

// Reference tests to seed knowledge base
const REFERENCE_TESTS = [
  path.join(process.cwd(), "tests", "real-signup-test.spec.ts"),
  path.join(process.cwd(), "tests", "real-login-test.spec.ts"),
];

test.describe("Agentic Testing System v2", () => {
  test.beforeAll(async () => {
    console.log("\n" + "═".repeat(60));
    console.log("🚀 AGENTIC TESTING SYSTEM v2");
    console.log('   Based on: "Agentic AI for Testing & Automation"');
    console.log("═".repeat(60));
  });

  test("seed knowledge base from reference tests", async ({ page }) => {
    test.setTimeout(60000);

    console.log("\n📚 Seeding knowledge base with reference tests...");

    const orchestrator = createOrchestrator(page, {
      skipExploration: true,
    });

    await orchestrator.init();
    await orchestrator.seedFromReferenceTests(REFERENCE_TESTS);

    console.log("✅ Knowledge base seeded");
  });

  test("generate Login Flow tests", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    const orchestrator = createOrchestrator(page, {
      qualityThreshold: 70,
      maxExplorationDepth: 3, // Faster exploration
      skipModals: ["signup-modal", "signup"],
    });

    await orchestrator.init();

    const result = await orchestrator.run("/?action=login", "Login Flow");

    // Verify generation succeeded
    expect(result.generatedTest.code).toContain("test(");
    expect(result.qualityReport.overallScore).toBeGreaterThan(50);

    console.log(`\n✅ Generated: ${result.generatedTest.filename}`);
    console.log(
      `   Quality: ${result.qualityReport.grade} (${result.qualityReport.overallScore})`
    );
  });

  test("debug: what is on the page?", async ({ page }) => {
    await page.goto("/?action=login");
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: "debug-login.png", fullPage: true });
    console.log("Screenshot saved to debug-login.png");

    // Check what's actually there
    const html = await page.content();
    console.log("Page HTML length:", html.length);
    console.log("Page title:", await page.title());
    console.log("Page URL:", page.url());

    // Count elements
    const allDivs = await page.locator("div").count();
    const allButtons = await page.locator("button").count();
    const allInputs = await page.locator("input").count();

    console.log("\n📊 Element counts:");
    console.log("  Divs:", allDivs);
    console.log("  Buttons:", allButtons);
    console.log("  Inputs:", allInputs);

    // Check for modal
    const modalByTestId = await page
      .locator('[data-testid="login-modal"]')
      .count();
    const modalByRole = await page.locator('[role="dialog"]').count();
    const modalByAria = await page.locator('[aria-modal="true"]').count();

    console.log("\n📦 Modal detection:");
    console.log('  [data-testid="login-modal"]:', modalByTestId);
    console.log('  [role="dialog"]:', modalByRole);
    console.log('  [aria-modal="true"]:', modalByAria);

    // If modal exists, check what's inside
    if (modalByTestId > 0) {
      const modal = page.locator('[data-testid="login-modal"]');
      const buttonsInModal = await modal.locator("button").count();
      const inputsInModal = await modal.locator("input").count();

      console.log("\n📦 Inside modal:");
      console.log("  Buttons:", buttonsInModal);
      console.log("  Inputs:", inputsInModal);

      // Get button texts
      const buttons = await modal.locator("button").all();
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].textContent();
        const visible = await buttons[i].isVisible();
        console.log(`  Button ${i}: "${text}" (visible: ${visible})`);
      }

      // Get input IDs
      const inputs = await modal.locator("input").all();
      for (let i = 0; i < inputs.length; i++) {
        const id = await inputs[i].getAttribute("id");
        const name = await inputs[i].getAttribute("name");
        const type = await inputs[i].getAttribute("type");
        const visible = await inputs[i].isVisible();
        console.log(
          `  Input ${i}: id="${id}" name="${name}" type="${type}" (visible: ${visible})`
        );
      }
    }

    // Check if app even loaded
    const bodyText = await page.locator("body").textContent();
    console.log("\nBody text (first 200 chars):", bodyText?.substring(0, 200));
  });

  test("generate Signup Flow tests", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    const orchestrator = createOrchestrator(page, {
      qualityThreshold: 70,
      maxExplorationDepth: 5,
      skipModals: ["login-modal", "login"],
    });

    await orchestrator.init();

    const result = await orchestrator.run("/?action=signup", "Signup Flow");

    expect(result.generatedTest.code).toContain("test(");
    expect(result.qualityReport.overallScore).toBeGreaterThan(50);

    console.log(`\n✅ Generated: ${result.generatedTest.filename}`);
    console.log(
      `   Quality: ${result.qualityReport.grade} (${result.qualityReport.overallScore})`
    );
  });

  test("generate all feature tests", async ({ page }) => {
    test.setTimeout(600000); // 10 minutes

    const orchestrator = createOrchestrator(page, {
      qualityThreshold: 70,
      maxExplorationDepth: 3,

      skipModals: ["login-modal", "login"],
    });

    await orchestrator.init();

    // Seed first
    await orchestrator.seedFromReferenceTests(REFERENCE_TESTS);

    // Run full pipeline
    const result = await orchestrator.runAll(FEATURES);

    // Verify results
    expect(result.features.length).toBe(FEATURES.length);
    expect(result.summary.avgQualityScore).toBeGreaterThan(50);

    console.log("\n📊 Generation Complete!");
    console.log(`   Total: ${result.summary.totalFeatures}`);
    console.log(`   Passed: ${result.summary.passed}`);
    console.log(`   Avg Score: ${result.summary.avgQualityScore}`);
  });
});

test.describe("Deep Exploration Only", () => {
  test("explore login modal", async ({ page }) => {
    test.setTimeout(120000);

    const { createDeepExplorer } = await import("../agents/v2");

    const explorer = createDeepExplorer(page, {
      maxDepth: 4,
    });

    await explorer.init();

    const state = await explorer.explore("/?action=login");

    console.log("\n📊 Exploration Results:");
    console.log(`   Elements: ${state.exploredElements.size}`);
    console.log(`   Interactions: ${state.interactionLogs.length}`);
    console.log(`   Selectors: ${state.discoveredSelectors.size}`);

    // Should have found login form elements
    const selectors = Array.from(state.discoveredSelectors.keys());
    expect(
      selectors.some((s) => s.includes("email") || s.includes("login"))
    ).toBeTruthy();
  });

  test("explore signup modal", async ({ page }) => {
    test.setTimeout(180000);

    const { createDeepExplorer } = await import("../agents/v2");

    const explorer = createDeepExplorer(page, {
      maxDepth: 4,
    });

    await explorer.init();

    const state = await explorer.explore("/?action=signup");

    console.log("\n📊 Exploration Results:");
    console.log(`   Elements: ${state.exploredElements.size}`);
    console.log(`   Interactions: ${state.interactionLogs.length}`);
    console.log(`   Selectors: ${state.discoveredSelectors.size}`);

    console.log("\n📋 Discovered Selectors:");
    for (const [selector, info] of state.discoveredSelectors) {
      console.log(`   - ${selector}: ${info.description || info.elementType}`);
    }
  });
});

test.describe("Single Feature Generation", () => {
  test("generate Home Page tests only", async ({ page }) => {
    // Long timeout for deep exploration (depth: 50) + LLM calls
    test.setTimeout(1800000); // 30 minutes

    const orchestrator = createOrchestrator(page, {
      qualityThreshold: 0.5,
      maxExplorationDepth: 50, 
      skipModals: ["login-modal", "signup-modal", "login", "signup"],
      minScenarioCount: 20,
    });

    await orchestrator.init();

    const result = await orchestrator.run("/", "Home Page");

    expect(result.generatedTest.code).toContain("test(");
    expect(result.qualityReport.overallScore).toBeGreaterThan(50);

    const hasLoginScenario = result.testPlan.scenarios.some(
      (s) =>
        s.name.toLowerCase().includes("login") ||
        s.name.toLowerCase().includes("sign in")
    );
    const hasSignupScenario = result.testPlan.scenarios.some(
      (s) =>
        s.name.toLowerCase().includes("signup") ||
        s.name.toLowerCase().includes("sign up") ||
        s.name.toLowerCase().includes("register")
    );

    if (hasLoginScenario || hasSignupScenario) {
      console.log(
        "⚠️  Warning: Login/Signup scenarios were generated despite skipModals"
      );
    } else {
      console.log("✅ No login/signup scenarios generated (as expected)");
    }

    console.log(`\n✅ Generated: ${result.generatedTest.filename}`);
    console.log(
      `   Quality: ${result.qualityReport.grade} (${result.qualityReport.overallScore})`
    );
    console.log(`   Scenarios: ${result.testPlan.scenarios.length}`);
    console.log(
      `   Elements explored: ${result.exploration?.exploredElements.size || 0}`
    );
  });
});

test.describe("Knowledge Store Verification", () => {
  test("verify selectors stored in ChromaDB", async () => {
    test.setTimeout(30000);

    const { getKnowledgeStore } = await import("../agents/v2");

    const store = await getKnowledgeStore();

    const results = await store.query("login email password", "selector", 10);

    console.log("\n📊 ChromaDB Contents:");
    console.log(`   Found ${results.length} selector(s)`);

    for (const item of results) {
      if (item.type === "selector") {
        console.log(
          `   - ${item.selector}: ${item.description || item.elementType}`
        );
      }
    }

    expect(results.length).toBeGreaterThan(0);
  });
});

test.describe("Risk Assessment Only", () => {
  test("assess feature risks", async () => {
    test.setTimeout(60000);

    const { createRiskAssessor } = await import("../agents/v2");

    const assessor = createRiskAssessor();

    const features = [
      {
        name: "Login Flow",
        description: "User authentication with email and password",
      },
      {
        name: "Signup Flow",
        description: "User registration with email, phone, OTP verification",
      },
      {
        name: "KYC Verification",
        description: "Identity verification with Sumsub integration",
      },
      {
        name: "Buy/Sell Assets",
        description: "Financial transactions for trading shares",
      },
    ];

    const assessments = await assessor.assessMultipleFeatures(features);

    console.log("\n" + assessor.getReport(assessments));

    const kycRisk = assessments.find((a) => a.featureName.includes("KYC"));
    const tradingRisk = assessments.find((a) => a.featureName.includes("Buy"));

    expect(kycRisk?.riskLevel).toBe("HIGH");
    expect(tradingRisk?.riskLevel).toBe("HIGH");
  });
});

test.describe("Quality Evaluation Only", () => {
  test("evaluate test code quality", async () => {
    const { createQualityEvaluator } = await import("../agents/v2");

    const evaluator = createQualityEvaluator(70);

    const goodCode = `
import { test, expect } from '../adapters';

const TEST_USER = {
  email: \`test.\${Date.now()}@example.com\`,
  password: 'TestPassword123!',
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ supabaseAdapter }) => {
    await supabaseAdapter.deleteTestUser(TEST_USER.email);
  });

  test('login with valid credentials', async ({ page, supabaseAdapter }) => {
    console.log('[Test] Starting login test');
    
    // Navigate to login
    await page.goto('/?action=login');
    
    // Wait for modal
    await expect(page.getByTestId('login-modal')).toBeVisible({ timeout: 10000 });
    
    // Fill credentials
    await page.locator('#login-email').fill(TEST_USER.email);
    await page.locator('#login-password').fill(TEST_USER.password);
    
    // Submit
    await page.getByRole('button', { name: /login/i }).click();
    
    // Verify
    await expect(page.getByTestId('login-modal')).toBeHidden({ timeout: 10000 });
    
    console.log('[Test] Login successful');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    console.log('[Test] Testing invalid credentials');
    
    await page.goto('/?action=login');
    await expect(page.getByTestId('login-modal')).toBeVisible();
    
    await page.locator('#login-email').fill('fake@test.com');
    await page.locator('#login-password').fill('wrongpass');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page.locator('.text-red-400')).toBeVisible();
    
    console.log('[Test] Error message displayed');
  });
});
`;

    const report = evaluator.evaluate(goodCode, "Login Flow tests");

    console.log(`\nQuality Score: ${report.overallScore}`);
    console.log(`Grade: ${report.grade}`);
    console.log(`Passes: ${report.passesThreshold}`);

    expect(report.overallScore).toBeGreaterThan(70);
    expect(report.grade).toMatch(/[ABC]/);
  });

  test("evaluate poor quality code", async () => {
    const { createQualityEvaluator } = await import("../agents/v2");

    const evaluator = createQualityEvaluator(70);

    // Poor test code
    const poorCode = `
import { test } from '@playwright/test';

test('test1', async ({ page }) => {
  await page.goto('/');
});
`;

    const report = evaluator.evaluate(poorCode, "Minimal test");

    console.log(`\nQuality Score: ${report.overallScore}`);
    console.log(`Grade: ${report.grade}`);

    expect(report.overallScore).toBeLessThan(50);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});
