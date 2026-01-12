/**
 * Self-Healer Agent
 * 
 * This agent automatically fixes broken selectors and test failures.
 * 
 * Healing strategies:
 * - Selector healing: Find alternative selectors when one breaks
 * - Timing healing: Add/adjust waits when timing issues occur
 * - Data healing: Refresh test data when data issues occur
 * 
 * Based on the article's self-healing architecture.
 */

import { Page } from '@playwright/test';
import type { SelectorInfo, ErrorPattern } from './knowledge-store';
import { KnowledgeStore, getKnowledgeStore } from './knowledge-store';

export type FailureType = 'selector' | 'timing' | 'data' | 'logic' | 'environment' | 'unknown';

export interface TestFailure {
  testName: string;
  errorMessage: string;
  selector?: string;
  stackTrace?: string;
  pageUrl?: string;
  timestamp: string;
}

export interface HealingResult {
  success: boolean;
  failureType: FailureType;
  originalSelector?: string;
  newSelector?: string;
  fix?: string;
  confidence: number; // 0-1
  explanation: string;
}

export interface HealingReport {
  failure: TestFailure;
  result: HealingResult;
  attemptedStrategies: string[];
  shouldEscalate: boolean;
}

/**
 * Selector Healer - finds alternative selectors
 */
class SelectorHealer {
  private knowledgeStore: KnowledgeStore;
  
  constructor(store: KnowledgeStore) {
    this.knowledgeStore = store;
  }
  
  /**
   * Find alternative selector when one breaks
   */
  async heal(page: Page, brokenSelector: string): Promise<HealingResult> {
    console.log(`   [SelectorHealer] Attempting to heal: ${brokenSelector}`);
    
    // Strategy 1: Check knowledge store for alternatives
    const knownAlternatives = await this.knowledgeStore.getSelectorAlternatives(brokenSelector);
    
    for (const alt of knownAlternatives) {
      for (const selector of alt.alternatives) {
        const found = await this.testSelector(page, selector);
        if (found) {
          return {
            success: true,
            failureType: 'selector',
            originalSelector: brokenSelector,
            newSelector: selector,
            confidence: 0.9,
            explanation: `Found known alternative: ${selector}`,
          };
        }
      }
    }
    
    // Strategy 2: Try common transformations
    const transformations = this.generateTransformations(brokenSelector);
    
    for (const newSelector of transformations) {
      const found = await this.testSelector(page, newSelector);
      if (found) {
        // Store the new working selector
        await this.knowledgeStore.storeSelector({
          type: 'selector',
          selector: newSelector,
          elementType: 'unknown',
          description: `Healed from ${brokenSelector}`,
          reliability: 0.8,
          lastVerified: new Date().toISOString(),
          alternatives: [brokenSelector],
        });
        
        return {
          success: true,
          failureType: 'selector',
          originalSelector: brokenSelector,
          newSelector,
          confidence: 0.75,
          explanation: `Found via transformation: ${newSelector}`,
        };
      }
    }
    
    // Strategy 3: Semantic search on page
    const semanticResult = await this.findSemanticMatch(page, brokenSelector);
    if (semanticResult) {
      return {
        success: true,
        failureType: 'selector',
        originalSelector: brokenSelector,
        newSelector: semanticResult.selector,
        confidence: semanticResult.confidence,
        explanation: `Found semantic match: ${semanticResult.selector}`,
      };
    }
    
    return {
      success: false,
      failureType: 'selector',
      originalSelector: brokenSelector,
      confidence: 0,
      explanation: 'No alternative selector found',
    };
  }
  
  /**
   * Test if a selector finds an element
   */
  private async testSelector(page: Page, selector: string): Promise<boolean> {
    try {
      const count = await page.locator(selector).count();
      return count > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate selector transformations to try
   */
  private generateTransformations(selector: string): string[] {
    const transformations: string[] = [];
    
    // If it's an ID selector, try data-testid
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      transformations.push(`[data-testid="${id}"]`);
      transformations.push(`[id="${id}"]`);
      transformations.push(`[name="${id}"]`);
    }
    
    // If it's a data-testid, try ID
    if (selector.includes('data-testid')) {
      const match = selector.match(/data-testid=["']([^"']+)["']/);
      if (match) {
        transformations.push(`#${match[1]}`);
        transformations.push(`[id="${match[1]}"]`);
      }
    }
    
    // If it's a class selector, try partial match
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      transformations.push(`[class*="${className}"]`);
    }
    
    // Try button role with text
    if (selector.includes('button')) {
      const textMatch = selector.match(/has-text\(["']([^"']+)["']\)/);
      if (textMatch) {
        transformations.push(`role=button[name="${textMatch[1]}"]`);
        transformations.push(`button >> text="${textMatch[1]}"`);
      }
    }
    
    // If it has text matching, try getByText
    if (selector.includes(':has-text(')) {
      const textMatch = selector.match(/:has-text\(["']([^"']+)["']\)/);
      if (textMatch) {
        transformations.push(`text="${textMatch[1]}"`);
        transformations.push(`text=${textMatch[1]}`);
      }
    }
    
    return transformations;
  }
  
  /**
   * Find element by semantic similarity
   */
  private async findSemanticMatch(
    page: Page,
    brokenSelector: string
  ): Promise<{ selector: string; confidence: number } | null> {
    // Extract hints from the broken selector
    let searchText = '';
    
    // Get text from has-text
    const textMatch = brokenSelector.match(/has-text\(["']([^"']+)["']\)/);
    if (textMatch) {
      searchText = textMatch[1];
    }
    
    // Get ID as search text
    if (brokenSelector.startsWith('#')) {
      searchText = brokenSelector.slice(1).replace(/-/g, ' ');
    }
    
    if (!searchText) return null;
    
    // Search for elements with similar text
    try {
      const elements = await page.locator(`*:has-text("${searchText}")`).all();
      
      for (const el of elements.slice(0, 5)) {
        // Get attributes to build selector
        const testId = await el.getAttribute('data-testid').catch(() => null);
        const id = await el.getAttribute('id').catch(() => null);
        const role = await el.getAttribute('role').catch(() => null);
        
        if (testId) {
          return {
            selector: `[data-testid="${testId}"]`,
            confidence: 0.8,
          };
        }
        if (id) {
          return {
            selector: `#${id}`,
            confidence: 0.7,
          };
        }
        if (role) {
          return {
            selector: `[role="${role}"]:has-text("${searchText}")`,
            confidence: 0.6,
          };
        }
      }
    } catch {
      // Ignore errors
    }
    
    return null;
  }
}

/**
 * Timing Healer - fixes timing-related issues
 */
class TimingHealer {
  /**
   * Suggest timing fixes for failures
   */
  heal(failure: TestFailure): HealingResult {
    const errorLower = failure.errorMessage.toLowerCase();
    
    // Timeout errors
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
      return {
        success: true,
        failureType: 'timing',
        fix: 'Increase timeout or add explicit wait',
        confidence: 0.8,
        explanation: 'Timeout detected - suggest increasing wait time',
      };
    }
    
    // Element not ready
    if (errorLower.includes('not ready') || errorLower.includes('detached')) {
      return {
        success: true,
        failureType: 'timing',
        fix: 'Add waitForSelector before interaction',
        confidence: 0.7,
        explanation: 'Element timing issue - add wait before interaction',
      };
    }
    
    // Navigation issues
    if (errorLower.includes('navigation') || errorLower.includes('load')) {
      return {
        success: true,
        failureType: 'timing',
        fix: 'Add waitForLoadState or increase navigation timeout',
        confidence: 0.6,
        explanation: 'Navigation timing issue',
      };
    }
    
    return {
      success: false,
      failureType: 'timing',
      confidence: 0,
      explanation: 'Not a timing-related issue',
    };
  }
}

/**
 * Data Healer - fixes test data issues
 */
class DataHealer {
  /**
   * Identify and suggest fixes for data issues
   */
  heal(failure: TestFailure): HealingResult {
    const errorLower = failure.errorMessage.toLowerCase();
    
    // Duplicate data
    if (errorLower.includes('already exists') || errorLower.includes('duplicate')) {
      return {
        success: true,
        failureType: 'data',
        fix: 'Clean up test data before test or use unique identifiers',
        confidence: 0.9,
        explanation: 'Duplicate data detected - add cleanup step',
      };
    }
    
    // Missing data
    if (errorLower.includes('not found') || errorLower.includes('does not exist')) {
      return {
        success: true,
        failureType: 'data',
        fix: 'Create required test data in setup',
        confidence: 0.8,
        explanation: 'Missing prerequisite data - add setup step',
      };
    }
    
    // Stale data
    if (errorLower.includes('stale') || errorLower.includes('expired')) {
      return {
        success: true,
        failureType: 'data',
        fix: 'Refresh test data before test',
        confidence: 0.7,
        explanation: 'Stale data - refresh before test',
      };
    }
    
    return {
      success: false,
      failureType: 'data',
      confidence: 0,
      explanation: 'Not a data-related issue',
    };
  }
}

/**
 * Self-Healer Agent
 */
export class SelfHealer {
  private knowledgeStore: KnowledgeStore | null = null;
  private selectorHealer: SelectorHealer | null = null;
  private timingHealer: TimingHealer;
  private dataHealer: DataHealer;
  private healingHistory: HealingReport[] = [];
  
  constructor() {
    this.timingHealer = new TimingHealer();
    this.dataHealer = new DataHealer();
  }
  
  /**
   * Initialize with knowledge store
   */
  async init(): Promise<void> {
    this.knowledgeStore = await getKnowledgeStore();
    this.selectorHealer = new SelectorHealer(this.knowledgeStore);
    console.log('[SelfHealer] Initialized with knowledge store');
  }
  
  /**
   * Classify a failure
   */
  classifyFailure(failure: TestFailure): FailureType {
    const error = failure.errorMessage.toLowerCase();
    
    // Selector issues
    if (
      error.includes('locator') ||
      error.includes('selector') ||
      error.includes('element') ||
      error.includes('not found') && error.includes('page')
    ) {
      return 'selector';
    }
    
    // Timing issues
    if (
      error.includes('timeout') ||
      error.includes('timed out') ||
      error.includes('detached') ||
      error.includes('not ready')
    ) {
      return 'timing';
    }
    
    // Data issues
    if (
      error.includes('already exists') ||
      error.includes('duplicate') ||
      error.includes('not found') && !error.includes('page') ||
      error.includes('invalid data')
    ) {
      return 'data';
    }
    
    // Logic issues (assertions)
    if (
      error.includes('expect') ||
      error.includes('assertion') ||
      error.includes('equal') ||
      error.includes('match')
    ) {
      return 'logic';
    }
    
    // Environment issues
    if (
      error.includes('network') ||
      error.includes('connection') ||
      error.includes('refused') ||
      error.includes('econnrefused')
    ) {
      return 'environment';
    }
    
    return 'unknown';
  }
  
  /**
   * Attempt to heal a failure
   */
  async heal(failure: TestFailure, page?: Page): Promise<HealingReport> {
    console.log(`\n🔧 [SelfHealer] Analyzing failure: ${failure.testName}`);
    console.log(`   Error: ${failure.errorMessage.substring(0, 100)}`);
    
    if (!this.selectorHealer && this.knowledgeStore === null) {
      await this.init();
    }
    
    const failureType = this.classifyFailure(failure);
    console.log(`   Classified as: ${failureType}`);
    
    const attemptedStrategies: string[] = [];
    let result: HealingResult;
    
    switch (failureType) {
      case 'selector':
        if (page && this.selectorHealer && failure.selector) {
          attemptedStrategies.push('selector_healing');
          result = await this.selectorHealer.heal(page, failure.selector);
        } else {
          result = {
            success: false,
            failureType: 'selector',
            confidence: 0,
            explanation: 'Cannot heal selector without page context',
          };
        }
        break;
      
      case 'timing':
        attemptedStrategies.push('timing_healing');
        result = this.timingHealer.heal(failure);
        break;
      
      case 'data':
        attemptedStrategies.push('data_healing');
        result = this.dataHealer.heal(failure);
        break;
      
      case 'logic':
        // Logic errors should not be auto-healed - escalate to human
        attemptedStrategies.push('logic_analysis');
        result = {
          success: false,
          failureType: 'logic',
          confidence: 0,
          explanation: 'Logic/assertion errors require human review',
        };
        break;
      
      case 'environment':
        attemptedStrategies.push('environment_check');
        result = {
          success: false,
          failureType: 'environment',
          confidence: 0,
          explanation: 'Environment issues require infrastructure fix',
        };
        break;
      
      default:
        result = {
          success: false,
          failureType: 'unknown',
          confidence: 0,
          explanation: 'Unable to classify or heal this failure',
        };
    }
    
    // Store error pattern for future reference
    if (this.knowledgeStore && result.success) {
      await this.storeErrorPattern(failure, result);
    }
    
    const report: HealingReport = {
      failure,
      result,
      attemptedStrategies,
      shouldEscalate: !result.success || result.confidence < 0.7 || failureType === 'logic',
    };
    
    this.healingHistory.push(report);
    
    // Print result
    if (result.success) {
      console.log(`   ✅ Healing successful (confidence: ${result.confidence})`);
      console.log(`   Fix: ${result.fix || result.newSelector}`);
    } else {
      console.log(`   ❌ Healing failed: ${result.explanation}`);
      if (report.shouldEscalate) {
        console.log(`   ⚠️ Escalating to human review`);
      }
    }
    
    return report;
  }
  
  /**
   * Store successful healing as error pattern
   */
  private async storeErrorPattern(failure: TestFailure, result: HealingResult): Promise<void> {
    if (!this.knowledgeStore) return;
    
    const pattern: ErrorPattern = {
      type: 'error_pattern',
      errorMessage: failure.errorMessage.substring(0, 100),
      cause: result.failureType,
      fix: result.fix || result.newSelector || result.explanation,
      occurrences: 1,
    };
    
    await this.knowledgeStore.storeErrorPattern(pattern);
  }
  
  /**
   * Check if a failure should be auto-healed
   */
  shouldHeal(failure: TestFailure): boolean {
    const failureType = this.classifyFailure(failure);
    
    // Never auto-heal logic errors
    if (failureType === 'logic') {
      return false;
    }
    
    // Don't heal critical security-related tests
    if (
      failure.testName.toLowerCase().includes('security') ||
      failure.testName.toLowerCase().includes('auth')
    ) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get healing statistics
   */
  getStats(): {
    totalAttempts: number;
    successRate: number;
    byType: Record<FailureType, { attempts: number; successes: number }>;
  } {
    const byType: Record<FailureType, { attempts: number; successes: number }> = {
      selector: { attempts: 0, successes: 0 },
      timing: { attempts: 0, successes: 0 },
      data: { attempts: 0, successes: 0 },
      logic: { attempts: 0, successes: 0 },
      environment: { attempts: 0, successes: 0 },
      unknown: { attempts: 0, successes: 0 },
    };
    
    for (const report of this.healingHistory) {
      const type = report.result.failureType;
      byType[type].attempts++;
      if (report.result.success) {
        byType[type].successes++;
      }
    }
    
    const totalAttempts = this.healingHistory.length;
    const totalSuccesses = this.healingHistory.filter(r => r.result.success).length;
    
    return {
      totalAttempts,
      successRate: totalAttempts > 0 ? totalSuccesses / totalAttempts : 0,
      byType,
    };
  }
  
  /**
   * Generate healing report
   */
  generateReport(): string {
    const stats = this.getStats();
    
    let report = `# Self-Healing Report
Generated: ${new Date().toISOString()}

## Summary
- Total Healing Attempts: ${stats.totalAttempts}
- Success Rate: ${(stats.successRate * 100).toFixed(1)}%

## By Failure Type
`;

    for (const [type, data] of Object.entries(stats.byType)) {
      if (data.attempts > 0) {
        const rate = ((data.successes / data.attempts) * 100).toFixed(1);
        report += `- **${type}**: ${data.successes}/${data.attempts} (${rate}%)\n`;
      }
    }

    report += `
## Recent Healing Actions
`;

    for (const h of this.healingHistory.slice(-10)) {
      const icon = h.result.success ? '✅' : '❌';
      report += `- ${icon} ${h.failure.testName}: ${h.result.explanation}\n`;
    }

    return report;
  }
}

/**
 * Create a self-healer instance
 */
export function createSelfHealer(): SelfHealer {
  return new SelfHealer();
}

export default SelfHealer;

