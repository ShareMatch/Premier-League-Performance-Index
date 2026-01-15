import { Page } from "@playwright/test";
import { Explorer, createExplorer } from "./explorer";
import type { ExplorationState } from "./explorer";
import { RiskAssessor, createRiskAssessor } from "./risk-assessor";
import type { RiskAssessment } from "./risk-assessor";
import { TestPlanner, createTestPlanner } from "./test-planner";
import type { TestPlan } from "./test-planner";
import { CodeGenerator, createCodeGenerator } from "./code-generator";
import type { GeneratedTest } from "./code-generator";
import { QualityEvaluator, createQualityEvaluator } from "./quality-evaluator";
import type { QualityReport } from "./quality-evaluator";
import { SelfHealer, createSelfHealer } from "./self-healer";
import { KnowledgeStore, getKnowledgeStore } from "./knowledge-store";
import * as fs from "fs";
import * as path from "path";

// Types for orchestrator configuration and results
export interface OrchestratorConfig {
  outputDir?: string;
  qualityThreshold?: number;
  maxExplorationDepth?: number;
  skipExploration?: boolean;
  skipQualityCheck?: boolean;
  skipModals?: string[];
  minScenarioCount?: number;
  autoLogin?: boolean;
}

export interface OrchestratorResult {
  feature: string;
  url: string;
  exploration: ExplorationState | undefined;
  riskAssessment: RiskAssessment;
  testPlan: TestPlan;
  generatedTest: GeneratedTest;
  qualityReport: QualityReport;
  passedQualityCheck: boolean;
  duration: number;
  timestamp: string;
}

export interface FullRunResult {
  features: OrchestratorResult[];
  summary: {
    totalFeatures: number;
    passed: number;
    failed: number;
    avgQualityScore: number;
    totalDuration: number;
  };
  reports: {
    riskAssessment: string;
    quality: string;
  };
}

export class IntelligentOrchestrator {
  private page: Page;
  private config: OrchestratorConfig;
  private knowledgeStore: KnowledgeStore | null = null;

  private explorer: Explorer | null = null;
  private riskAssessor: RiskAssessor;
  private planner: TestPlanner;
  private generator: CodeGenerator;
  private evaluator: QualityEvaluator;
  private healer: SelfHealer;

  constructor(page: Page, config?: OrchestratorConfig) {
    this.page = page;
    this.config = {
      outputDir:
        config?.outputDir || path.join(process.cwd(), "tests", "generated"),
      qualityThreshold: config?.qualityThreshold || 70,
      maxExplorationDepth: config?.maxExplorationDepth || 5,
      skipExploration: config?.skipExploration || false,
      skipQualityCheck: config?.skipQualityCheck || false,
      skipModals: config?.skipModals || [],
      minScenarioCount: config?.minScenarioCount,
      autoLogin: config?.autoLogin || false,
    };

    this.riskAssessor = createRiskAssessor();
    this.planner = createTestPlanner();
    this.generator = createCodeGenerator(this.config.outputDir);
    this.evaluator = createQualityEvaluator(this.config.qualityThreshold);
    this.healer = createSelfHealer();
  }

  /**
   * Initialize all agents
   */
  async init(): Promise<void> {
    console.log(
      "\n🚀 [IntelligentOrchestrator] Initializing with LangGraph..."
    );

    this.knowledgeStore = await getKnowledgeStore();

    this.explorer = createExplorer(this.page, {
      maxDepth: this.config.maxExplorationDepth,
      skipModals: this.config.skipModals,
    });
    await this.explorer.init();

    if (this.config.skipModals && this.config.skipModals.length > 0) {
      console.log(
        `   ⏭️  Skipping modals: ${this.config.skipModals.join(", ")}`
      );
    }

    await this.planner.init();
    await this.generator.init();
    await this.healer.init();

    console.log("   ✅ All agents initialized (LangGraph + LangSmith)");
    console.log(`   📊 View traces at: https://smith.langchain.com`);
    console.log(`   📁 Output: ${this.config.outputDir}`);
  }

  /**
   * Run the full pipeline for a single feature
   */
  async run(url: string, featureName: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    console.log("\n" + "=".repeat(60));
    console.log(`🎯 Processing: ${featureName} (Intelligent Mode)`);
    console.log(`   URL: ${url}`);
    console.log("=".repeat(60));

    // Step 0: Authentication (if requested)
    if (this.config.autoLogin) {
      console.log("\n🔐 Step 0: Authenticating before exploration...");
      const success = await this.performLogin();
      if (!success) {
        console.log("   ❌ Authentication failed, continuing as guest...");
      } else {
        console.log("   ✅ Authenticated successfully");
      }
    }

    if (!this.explorer) {
      await this.init();
    }

    // Step 1: Intelligent Exploration (LangGraph)
    let exploration: any;
    if (!this.config.skipExploration) {
      console.log("\n📍 Step 1: Intelligent Exploration (LangGraph)");
      exploration = await this.explorer!.explore(url);

      // Print learned patterns
      console.log("\n   🧠 Learned Patterns:");
      for (const [type, pattern] of exploration.learnedPatterns) {
        console.log(
          `      - ${type}: ${(pattern.confidence * 100).toFixed(
            0
          )}% confidence`
        );
      }
    } else {
      console.log("\n📍 Step 1: Exploration skipped");
    }

    // Step 2: Risk Assessment
    console.log("\n📍 Step 2: Risk Assessment");
    const riskAssessment = await this.riskAssessor.assessFeature(
      featureName,
      `Test generation for ${featureName} at ${url}`
    );

    // Apply minScenarioCount override if configured
    if (
      this.config.minScenarioCount &&
      this.config.minScenarioCount >
        riskAssessment.testingRecommendations.scenarioCount
    ) {
      console.log(
        `   📊 Overriding scenario count: ${riskAssessment.testingRecommendations.scenarioCount} → ${this.config.minScenarioCount}`
      );
      riskAssessment.testingRecommendations.scenarioCount =
        this.config.minScenarioCount;
    }

    // Step 3: Test Planning
    console.log("\n📍 Step 3: Test Planning");

    // Convert skipModals to exclude features for test planning
    // e.g., ['login-modal', 'signup-modal'] -> ['login', 'signup', 'Login Flow', 'Signup Flow']
    const excludeFeatures = this.getExcludeFeatures();

    const testPlan = await this.planner.createPlan(
      riskAssessment,
      exploration,
      {
        excludeFeatures,
        minScenarioCount: this.config.minScenarioCount,
      }
    );
    await this.planner.storePlanAsPatterns(testPlan);

    // Step 4: Code Generation
    console.log("\n📍 Step 4: Code Generation");
    const generatedTest = await this.generator.generateFromPlan(testPlan);

    // Step 5: Quality Evaluation
    console.log("\n📍 Step 5: Quality Evaluation");
    const qualityReport = this.evaluator.evaluate(
      generatedTest.code,
      `${featureName} - ${testPlan.scenarios.map((s) => s.name).join(", ")}`
    );

    const duration = Date.now() - startTime;

    const result: OrchestratorResult = {
      feature: featureName,
      url,
      exploration,
      riskAssessment,
      testPlan,
      generatedTest,
      qualityReport,
      passedQualityCheck: qualityReport.passesThreshold,
      duration,
      timestamp: new Date().toISOString(),
    };

    this.printResultSummary(result);

    return result;
  }

  /**
   * Convert skipModals config to exclude features for test planning
   * e.g., ['login-modal', 'signup'] -> ['login', 'signup', 'Login Flow', 'Signup Flow', 'authentication']
   */
  private getExcludeFeatures(): string[] {
    const skipModals = this.config.skipModals || [];
    if (skipModals.length === 0) return [];

    const excludeSet = new Set<string>();

    for (const modal of skipModals) {
      // Add the modal ID as-is
      excludeSet.add(modal);

      // Extract base name (e.g., 'login-modal' -> 'login')
      const baseName = modal.replace("-modal", "").replace("_modal", "");
      excludeSet.add(baseName);

      // Add common variations
      if (baseName === "login" || baseName === "signin") {
        excludeSet.add("login");
        excludeSet.add("Login Flow");
        excludeSet.add("Login");
        excludeSet.add("authentication");
        excludeSet.add("sign in");
      }

      if (baseName === "signup" || baseName === "register") {
        excludeSet.add("signup");
        excludeSet.add("Signup Flow");
        excludeSet.add("Signup");
        excludeSet.add("registration");
        excludeSet.add("sign up");
        excludeSet.add("create account");
      }
    }

    return Array.from(excludeSet);
  }

  /**
   * Run for multiple features
   */
  async runAll(
    features: Array<{ url: string; name: string }>
  ): Promise<FullRunResult> {
    console.log("\n" + "═".repeat(60));
    console.log("🚀 INTELLIGENT AGENTIC TESTING - FULL RUN");
    console.log(`   Features: ${features.length}`);
    console.log(`   Mode: LangGraph + LangSmith`);
    console.log("═".repeat(60));

    const startTime = Date.now();
    const results: OrchestratorResult[] = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      console.log(
        `\n[${i + 1}/${features.length}] Processing ${feature.name}...`
      );

      try {
        const result = await this.run(feature.url, feature.name);
        results.push(result);
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
      }

      if (i < features.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.passedQualityCheck).length;
    const avgScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.qualityReport.overallScore, 0) /
          results.length
        : 0;

    const fullResult: FullRunResult = {
      features: results,
      summary: {
        totalFeatures: features.length,
        passed,
        failed: features.length - passed,
        avgQualityScore: Math.round(avgScore * 10) / 10,
        totalDuration,
      },
      reports: {
        riskAssessment: this.riskAssessor.getReport(
          results.map((r) => r.riskAssessment)
        ),
        quality: this.generateQualityReport(results),
      },
    };

    await this.saveReports(fullResult);
    this.printFinalSummary(fullResult);

    return fullResult;
  }

  private printResultSummary(result: OrchestratorResult): void {
    const icon = result.passedQualityCheck ? "✅" : "⚠️";

    console.log("\n" + "─".repeat(60));
    console.log(`${icon} ${result.feature} - Complete`);
    console.log(
      `   Risk: ${result.riskAssessment.riskLevel} | Quality: ${result.qualityReport.grade} (${result.qualityReport.overallScore})`
    );
    console.log(
      `   Scenarios: ${result.testPlan.scenarios.length} | Lines: ${result.generatedTest.metadata.linesOfCode}`
    );
    console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log("─".repeat(60));
  }

  private printFinalSummary(result: FullRunResult): void {
    console.log("\n" + "═".repeat(60));
    console.log("📊 FINAL SUMMARY (Intelligent Mode)");
    console.log("═".repeat(60));
    console.log(`   Features: ${result.summary.totalFeatures}`);
    console.log(`   ✅ Passed: ${result.summary.passed}`);
    console.log(`   ⚠️ Review: ${result.summary.failed}`);
    console.log(`   📈 Avg Quality: ${result.summary.avgQualityScore}`);
    console.log(
      `   ⏱️ Duration: ${(result.summary.totalDuration / 1000).toFixed(1)}s`
    );
    console.log(`   📊 LangSmith: https://smith.langchain.com`);
    console.log("═".repeat(60));
  }

  private generateQualityReport(results: OrchestratorResult[]): string {
    return `# Test Quality Report (Intelligent Mode)\nGenerated: ${new Date().toISOString()}\n`;
  }

  private async saveReports(result: FullRunResult): Promise<void> {
    const reportsDir = path.join(this.config.outputDir!, "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportsDir, "summary.json"),
      JSON.stringify(result.summary, null, 2),
      "utf-8"
    );
  }

  getHealer(): SelfHealer {
    return this.healer;
  }

  /**
   * Seed knowledge store from reference test files
   */
  async seedFromReferenceTests(testPaths: string[]): Promise<void> {
    console.log("\n📚 [Orchestrator] Seeding from reference tests...");

    for (const testPath of testPaths) {
      try {
        if (!fs.existsSync(testPath)) {
          console.log(`   ⚠️ File not found: ${testPath}`);
          continue;
        }

        const content = fs.readFileSync(testPath, "utf-8");
        const filename = path.basename(testPath);

        // Extract test patterns
        const testPattern = {
          type: "test_pattern" as const,
          featureName: filename
            .replace(".spec.ts", "")
            .replace("real-", "")
            .replace("-test", ""),
          testName: `Reference test from ${filename}`,
          steps: this.extractSteps(content),
          assertions: this.extractAssertions(content),
          selectors: this.extractSelectors(content),
          sourceFile: filename,
        };

        if (this.knowledgeStore) {
          await this.knowledgeStore.storePattern(testPattern);
        }

        console.log(`   ✅ Seeded from: ${filename}`);
      } catch (error: any) {
        console.log(`   ❌ Error seeding ${testPath}: ${error.message}`);
      }
    }

    console.log("   ✅ Seeding complete");
  }

  private extractSteps(code: string): string[] {
    const steps: string[] = [];
    const patterns = [
      /await page\.goto\(['"`]([^'"`]+)['"`]\)/g,
      /await page\.click\(['"`]([^'"`]+)['"`]\)/g,
      /await page\.fill\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`]\)/g,
      /await expect\(([^)]+)\)\./g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        steps.push(match[0]);
      }
    }

    return steps.slice(0, 20);
  }

  private extractAssertions(code: string): string[] {
    const assertions: string[] = [];
    const pattern = /expect\([^)]+\)\.[^;]+/g;

    let match;
    while ((match = pattern.exec(code)) !== null) {
      assertions.push(match[0]);
    }

    return assertions.slice(0, 10);
  }

  private extractSelectors(code: string): string[] {
    const selectors: string[] = [];
    const patterns = [
      /\[data-testid=['"]([^'"]+)['"]\]/g,
      /#([a-zA-Z][a-zA-Z0-9-_]*)/g,
      /getByRole\(['"]([^'"]+)['"]/g,
      /getByTestId\(['"]([^'"]+)['"]\)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        selectors.push(match[1]);
      }
    }

    return [...new Set(selectors)];
  }

  /**
   * Perform automatic login using test credentials
   */
  async performLogin(): Promise<boolean> {
    try {
      // Hardcoded test credentials as requested
      const TEST_USER = {
        email: "affan@sharematch.me",
        password: "Affan@1234",
      };

      console.log(`   🔑 Logging in as: ${TEST_USER.email}`);

      // Navigate to login
      await this.page.goto("/?action=login");

      // Wait for modal
      const loginModal = this.page.locator('[data-testid="login-modal"]');
      await loginModal.waitFor({ timeout: 10000 });

      // Fill and submit
      await this.page.locator("#login-email").fill(TEST_USER.email);
      await this.page.locator("#login-password").fill(TEST_USER.password);
      await this.page.locator('[data-testid="login-submit-button"]').click();

      // Wait for navigation or modal to close
      // We expect either the login modal to disappear or a verification modal to appear
      await this.page.waitForTimeout(5000);

      const verificationModal = this.page.locator(
        '[data-testid="verification-modal"]'
      );

      const isLoginModalHidden = await loginModal.isHidden().catch(() => false);
      const isVerificationModalVisible = await verificationModal
        .isVisible()
        .catch(() => false);

      if (isLoginModalHidden || isVerificationModalVisible) {
        return true;
      }

      // Retry check
      await this.page.waitForTimeout(5000);
      return (
        (await loginModal.isHidden()) || (await verificationModal.isVisible())
      );
    } catch (error: any) {
      console.error(`   ❌ Login error: ${error.message}`);
      return false;
    }
  }
}

export function createIntelligentOrchestrator(
  page: Page,
  config?: OrchestratorConfig
): IntelligentOrchestrator {
  return new IntelligentOrchestrator(page, config);
}

export default IntelligentOrchestrator;
