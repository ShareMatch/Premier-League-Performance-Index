/**
 * Quality Evaluator Agent
 * 
 * Evaluates generated test code quality using multiple criteria:
 * - Syntax correctness
 * - Test structure
 * - Assertion quality
 * - Naming conventions
 * - Coverage completeness
 * - Maintainability
 * - Documentation
 * 
 * Based on the article's multi-dimensional quality assessment approach.
 */

import * as ts from 'typescript';

export interface QualityCriteria {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  details: string;
}

export interface QualityReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  criteria: QualityCriteria[];
  recommendations: string[];
  passesThreshold: boolean;
  evaluatedAt: string;
}

// Quality weights (must sum to 1.0)
const QUALITY_WEIGHTS = {
  syntaxCorrectness: 0.20,
  testStructure: 0.20,
  assertionQuality: 0.15,
  namingConventions: 0.10,
  coverageCompleteness: 0.15,
  maintainability: 0.10,
  documentation: 0.10,
};

// Minimum threshold to pass (0-100)
const QUALITY_THRESHOLD = 70;

/**
 * Quality Evaluator Agent
 */
export class QualityEvaluator {
  private thresholdScore: number;
  
  constructor(threshold?: number) {
    this.thresholdScore = threshold || QUALITY_THRESHOLD;
  }
  
  /**
   * Evaluate test code quality
   */
  evaluate(code: string, description?: string): QualityReport {
    console.log('\n📊 [QualityEvaluator] Evaluating test quality...');
    
    const criteria: QualityCriteria[] = [
      this.evaluateSyntax(code),
      this.evaluateStructure(code),
      this.evaluateAssertions(code),
      this.evaluateNaming(code),
      this.evaluateCoverage(code, description || ''),
      this.evaluateMaintainability(code),
      this.evaluateDocumentation(code),
    ];
    
    // Calculate weighted score
    const overallScore = criteria.reduce((sum, c) => {
      const normalizedScore = (c.score / c.maxScore) * 100;
      return sum + normalizedScore * c.weight;
    }, 0);
    
    const grade = this.scoreToGrade(overallScore);
    const recommendations = this.generateRecommendations(criteria);
    
    const report: QualityReport = {
      overallScore: Math.round(overallScore * 10) / 10,
      grade,
      criteria,
      recommendations,
      passesThreshold: overallScore >= this.thresholdScore,
      evaluatedAt: new Date().toISOString(),
    };
    
    this.printReport(report);
    
    return report;
  }
  
  /**
   * Evaluate syntax correctness
   */
  private evaluateSyntax(code: string): QualityCriteria {
    let score = 0;
    let details = '';
    
    try {
      // Create a TypeScript source file
      const sourceFile = ts.createSourceFile(
        'test.ts',
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );
      
      // Check for parse errors
      const diagnostics = (sourceFile as any).parseDiagnostics || [];
      
      if (diagnostics.length === 0) {
        score = 10;
        details = 'No syntax errors detected';
      } else {
        // Partial credit based on error count
        const errorPenalty = Math.min(diagnostics.length * 2, 8);
        score = 10 - errorPenalty;
        details = `${diagnostics.length} syntax issue(s) found`;
      }
    } catch (e: any) {
      score = 2;
      details = `Parse error: ${e.message.substring(0, 50)}`;
    }
    
    return {
      name: 'Syntax Correctness',
      weight: QUALITY_WEIGHTS.syntaxCorrectness,
      score,
      maxScore: 10,
      details,
    };
  }
  
  /**
   * Evaluate test structure
   */
  private evaluateStructure(code: string): QualityCriteria {
    let score = 0;
    const checks: string[] = [];
    
    // Check for test.describe block
    if (/test\.describe\s*\(/.test(code)) {
      score += 2;
      checks.push('✅ Has test.describe block');
    } else {
      checks.push('❌ Missing test.describe block');
    }
    
    // Check for test() calls
    const testMatches = code.match(/test\s*\(['"]/g) || [];
    if (testMatches.length > 0) {
      score += 2;
      checks.push(`✅ Has ${testMatches.length} test(s)`);
    } else {
      checks.push('❌ No test() calls found');
    }
    
    // Check for beforeEach/afterEach
    if (/test\.beforeEach|beforeEach\s*\(/.test(code)) {
      score += 1.5;
      checks.push('✅ Has beforeEach setup');
    }
    if (/test\.afterEach|afterEach\s*\(/.test(code)) {
      score += 1.5;
      checks.push('✅ Has afterEach cleanup');
    }
    
    // Check for proper async/await usage
    if (/async\s*\(.*\)\s*=>|async\s+function/.test(code)) {
      score += 1;
      checks.push('✅ Uses async/await');
    }
    
    // Check for proper imports
    if (/import\s*{[^}]*test[^}]*}\s*from/.test(code)) {
      score += 2;
      checks.push('✅ Has proper imports');
    }
    
    return {
      name: 'Test Structure',
      weight: QUALITY_WEIGHTS.testStructure,
      score: Math.min(score, 10),
      maxScore: 10,
      details: checks.join(', '),
    };
  }
  
  /**
   * Evaluate assertion quality
   */
  private evaluateAssertions(code: string): QualityCriteria {
    let score = 0;
    const checks: string[] = [];
    
    // Count assertions
    const expectMatches = code.match(/expect\s*\(/g) || [];
    const assertionCount = expectMatches.length;
    
    if (assertionCount === 0) {
      checks.push('❌ No assertions found');
    } else if (assertionCount === 1) {
      score += 4;
      checks.push('⚠️ Only 1 assertion (minimal)');
    } else if (assertionCount <= 3) {
      score += 6;
      checks.push(`✅ ${assertionCount} assertions`);
    } else {
      score += 8;
      checks.push(`✅ ${assertionCount} comprehensive assertions`);
    }
    
    // Check for visibility assertions
    if (/toBeVisible|toBeHidden/.test(code)) {
      score += 1;
      checks.push('✅ Has visibility assertions');
    }
    
    // Check for text/content assertions
    if (/toContainText|toHaveText|toHaveValue/.test(code)) {
      score += 1;
      checks.push('✅ Has content assertions');
    }
    
    // Check for timeout parameters
    if (/timeout:\s*\d+/.test(code)) {
      score += 0.5;
      checks.push('✅ Has explicit timeouts');
    }
    
    return {
      name: 'Assertion Quality',
      weight: QUALITY_WEIGHTS.assertionQuality,
      score: Math.min(score, 10),
      maxScore: 10,
      details: checks.join(', '),
    };
  }
  
  /**
   * Evaluate naming conventions
   */
  private evaluateNaming(code: string): QualityCriteria {
    let score = 5; // Start neutral
    const checks: string[] = [];
    
    // Check test names are descriptive (not just "test1")
    const testNames = code.match(/test\s*\(\s*['"](.*?)['"]/g) || [];
    let goodNames = 0;
    
    for (const match of testNames) {
      const name = match.match(/['"](.*?)['"]/)?.[1] || '';
      if (name.length > 10 && /\s/.test(name)) {
        goodNames++;
      }
    }
    
    if (testNames.length > 0) {
      const nameQuality = goodNames / testNames.length;
      if (nameQuality >= 0.8) {
        score += 3;
        checks.push('✅ Descriptive test names');
      } else if (nameQuality >= 0.5) {
        score += 1.5;
        checks.push('⚠️ Some test names could be more descriptive');
      } else {
        checks.push('❌ Test names are not descriptive');
      }
    }
    
    // Check for camelCase variables
    if (/const\s+[a-z][a-zA-Z0-9]*\s*=/.test(code)) {
      score += 1;
      checks.push('✅ Uses camelCase');
    }
    
    // Check for meaningful variable names
    const variables = code.match(/const\s+([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    const shortVars = variables.filter(v => {
      const name = v.replace('const ', '');
      return name.length < 3 && !['e', 'i', 'j', 'k'].includes(name);
    });
    
    if (shortVars.length === 0) {
      score += 1;
      checks.push('✅ No cryptic variable names');
    }
    
    return {
      name: 'Naming Conventions',
      weight: QUALITY_WEIGHTS.namingConventions,
      score: Math.min(score, 10),
      maxScore: 10,
      details: checks.join(', '),
    };
  }
  
  /**
   * Evaluate coverage completeness
   */
  private evaluateCoverage(code: string, description: string): QualityCriteria {
    let score = 0;
    const checks: string[] = [];
    
    const content = code + description;
    
    // Check for happy path
    if (/valid|success|correct|happy.path/i.test(content)) {
      score += 3;
      checks.push('✅ Has happy path');
    }
    
    // Check for negative cases
    if (/invalid|fail|error|wrong|negative/i.test(content)) {
      score += 2;
      checks.push('✅ Has negative cases');
    }
    
    // Check for edge cases
    if (/edge|boundary|limit|empty|null|zero/i.test(content)) {
      score += 2;
      checks.push('✅ Has edge cases');
    }
    
    // Check for security considerations
    if (/security|auth|permission|unauthorized/i.test(content)) {
      score += 1.5;
      checks.push('✅ Has security tests');
    }
    
    // Check for multiple scenarios
    const testCount = (code.match(/test\s*\(['"]/g) || []).length;
    if (testCount >= 3) {
      score += 1.5;
      checks.push(`✅ Multiple scenarios (${testCount})`);
    }
    
    if (score < 3) {
      checks.push('⚠️ Coverage may be incomplete');
    }
    
    return {
      name: 'Coverage Completeness',
      weight: QUALITY_WEIGHTS.coverageCompleteness,
      score: Math.min(score, 10),
      maxScore: 10,
      details: checks.join(', '),
    };
  }
  
  /**
   * Evaluate maintainability
   */
  private evaluateMaintainability(code: string): QualityCriteria {
    let score = 5; // Start neutral
    const checks: string[] = [];
    
    // Check for page object pattern or helper functions
    if (/const\s+\w+\s*=\s*page\.locator|function\s+\w+/.test(code)) {
      score += 2;
      checks.push('✅ Uses helper functions/locators');
    }
    
    // Check for hardcoded strings vs constants
    const hardcodedSelectors = (code.match(/locator\s*\(\s*['"]/g) || []).length;
    const selectorConstants = (code.match(/const\s+\w+Selector|const\s+\w+Locator/gi) || []).length;
    
    if (selectorConstants > 0) {
      score += 1.5;
      checks.push('✅ Uses selector constants');
    } else if (hardcodedSelectors > 5) {
      score -= 1;
      checks.push('⚠️ Many hardcoded selectors');
    }
    
    // Check for data-testid usage (stable selectors)
    if (/data-testid|getByTestId/.test(code)) {
      score += 1.5;
      checks.push('✅ Uses data-testid selectors');
    }
    
    // Check line count (too long = harder to maintain)
    const lineCount = code.split('\n').length;
    if (lineCount < 100) {
      score += 1;
      checks.push('✅ Reasonable file length');
    } else if (lineCount > 300) {
      score -= 1;
      checks.push('⚠️ File may be too long');
    }
    
    return {
      name: 'Maintainability',
      weight: QUALITY_WEIGHTS.maintainability,
      score: Math.min(Math.max(score, 0), 10),
      maxScore: 10,
      details: checks.join(', '),
    };
  }
  
  /**
   * Evaluate documentation
   */
  private evaluateDocumentation(code: string): QualityCriteria {
    let score = 0;
    const checks: string[] = [];
    
    // Check for file header comment
    if (/^\/\*\*[\s\S]*?\*\//.test(code.trim())) {
      score += 3;
      checks.push('✅ Has header comment');
    }
    
    // Check for inline comments
    const commentLines = (code.match(/\/\/\s*.+/g) || []).length;
    if (commentLines >= 5) {
      score += 3;
      checks.push(`✅ Good inline comments (${commentLines})`);
    } else if (commentLines >= 2) {
      score += 1.5;
      checks.push('⚠️ Some comments');
    } else {
      checks.push('❌ Few/no comments');
    }
    
    // Check for console.log progress indicators
    if (/console\.log\s*\(\s*['"`]\[/.test(code)) {
      score += 2;
      checks.push('✅ Has progress logging');
    }
    
    // Check for describe block description
    if (/describe\s*\(\s*['"`].{10,}['"`]/.test(code)) {
      score += 2;
      checks.push('✅ Descriptive test suite name');
    }
    
    return {
      name: 'Documentation',
      weight: QUALITY_WEIGHTS.documentation,
      score: Math.min(score, 10),
      maxScore: 10,
      details: checks.join(', '),
    };
  }
  
  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * Generate recommendations based on criteria scores
   */
  private generateRecommendations(criteria: QualityCriteria[]): string[] {
    const recommendations: string[] = [];
    
    for (const c of criteria) {
      const percentage = (c.score / c.maxScore) * 100;
      
      if (percentage < 50) {
        recommendations.push(...this.getRecommendationsFor(c.name, 'poor'));
      } else if (percentage < 70) {
        recommendations.push(...this.getRecommendationsFor(c.name, 'fair'));
      }
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }
  
  /**
   * Get specific recommendations for a criterion
   */
  private getRecommendationsFor(criterionName: string, level: 'poor' | 'fair'): string[] {
    const recs: Record<string, Record<string, string[]>> = {
      'Syntax Correctness': {
        poor: ['Fix TypeScript syntax errors before proceeding', 'Validate code compiles successfully'],
        fair: ['Review and fix remaining syntax issues'],
      },
      'Test Structure': {
        poor: ['Add test.describe block for organization', 'Add beforeEach/afterEach for setup/cleanup'],
        fair: ['Consider adding more structured setup/teardown'],
      },
      'Assertion Quality': {
        poor: ['Add meaningful assertions to validate behavior', 'Use expect() to verify expected outcomes'],
        fair: ['Add more assertions for comprehensive validation'],
      },
      'Naming Conventions': {
        poor: ['Use descriptive test names that explain what is tested', 'Follow camelCase naming convention'],
        fair: ['Make test names more descriptive'],
      },
      'Coverage Completeness': {
        poor: ['Add tests for happy path, error cases, and edge cases', 'Increase scenario coverage'],
        fair: ['Consider adding edge case tests'],
      },
      'Maintainability': {
        poor: ['Extract repeated selectors to constants', 'Use data-testid for stable selectors'],
        fair: ['Consider using page object pattern for complex tests'],
      },
      'Documentation': {
        poor: ['Add header comment explaining test purpose', 'Add inline comments for complex logic'],
        fair: ['Add more inline comments for clarity'],
      },
    };
    
    return recs[criterionName]?.[level] || [];
  }
  
  /**
   * Print quality report
   */
  private printReport(report: QualityReport): void {
    const icon = report.passesThreshold ? '✅' : '❌';
    const gradeIcon = {
      A: '🌟',
      B: '👍',
      C: '📝',
      D: '⚠️',
      F: '❌',
    }[report.grade];
    
    console.log(`\n${icon} Quality Report: ${gradeIcon} Grade ${report.grade} (${report.overallScore}/100)`);
    console.log('─'.repeat(50));
    
    for (const c of report.criteria) {
      const barLength = Math.round((c.score / c.maxScore) * 20);
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      console.log(`   ${c.name.padEnd(25)} ${bar} ${c.score}/${c.maxScore}`);
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n📋 Recommendations:');
      for (const rec of report.recommendations) {
        console.log(`   • ${rec}`);
      }
    }
  }
}

/**
 * Create a quality evaluator instance
 */
export function createQualityEvaluator(threshold?: number): QualityEvaluator {
  return new QualityEvaluator(threshold);
}

export default QualityEvaluator;

