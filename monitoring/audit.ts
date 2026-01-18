import { exec } from 'child_process';
import { promisify } from 'util';
import { sendTelegramMessage } from './notify';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Ensure audit-reports directory exists
const AUDIT_DIR = 'audit-reports';
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

interface TestResult {
  attempt: number;
  testFile: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  failedTests: string[];
  passedTests: string[];
  totalTests: number;
}

interface AuditReport {
  status: 'PASS' | 'FAIL';
  totalDuration: number;
  attempts: TestResult[];
  summary: string;
  persistentFailures: string[];
  flakyTests: string[];
  fileResults: Map<string, TestResult[]>;
}

class Audit {
  // Test files in execution order
  private testFiles = [
    'tests/generated/signup-flow.spec.ts',
    'tests/generated/login-flow.spec.ts',
    'tests/generated/kyc-flow.spec.ts',
    'tests/generated/home-page.spec.ts',
    'tests/generated/user-profile-page.spec.ts',
    'tests/generated/index-page-trading.spec.ts',
    'tests/generated/asset-page-trading.spec.ts',
    'tests/generated/twilio.spec.ts',
    'tests/generated/my-media-inbox.spec.ts',
    'tests/generated/forgot-password.spec.ts'
  ];

  private results: TestResult[] = [];

  async runAudit(): Promise<void> {
    console.log("🚀 Starting CI/CD Audit...");
    console.log(`📋 Running ${this.testFiles.length} test files in order...\n`);
    const startTime = Date.now();

    // Run each test file once (no retries)
    for (let i = 0; i < this.testFiles.length; i++) {
      const testFile = this.testFiles[i];
      console.log(`\n[${i + 1}/${this.testFiles.length}] 📋 Testing: ${testFile}`);

      const success = await this.runSingleTest(testFile, 1);

      if (success) {
        console.log(`✅ ${testFile} passed`);
      } else {
        console.log(`❌ ${testFile} failed`);
      }
    }

    const report = this.generateReport(Date.now() - startTime);
    await this.sendAuditReport(report);

    if (report.status === 'FAIL') {
      process.exit(1);
    }
  }

  private async runSingleTest(testFile: string, attempt: number): Promise<boolean> {
    const testResult: TestResult = {
      attempt,
      testFile,
      success: false,
      duration: 0,
      output: '',
      failedTests: [],
      passedTests: [],
      totalTests: 0
    };

    const startTime = Date.now();

    try {
      console.log(`Running ${testFile}...`);

      const { stdout, stderr } = await execAsync(
        `npx playwright test ${testFile} --reporter=line`,
        {
          env: { ...process.env, CI: 'true' },
          maxBuffer: 1024 * 1024 * 50, // Increased buffer to 50MB
          timeout: 600000 // Increased timeout to 10 minutes per test file
        }
      );

      testResult.success = true;
      testResult.output = stdout;
      testResult.duration = Date.now() - startTime;

      // Parse passed tests
      const testInfo = this.parseTestResults(stdout, stderr);
      testResult.passedTests = testInfo.passedTests;
      testResult.totalTests = testInfo.totalTests;

      console.log(`✅ ${testFile} completed in ${(testResult.duration / 1000).toFixed(2)}s`);
      console.log(stdout);

    } catch (error: any) {
      testResult.success = false;
      testResult.error = error.stderr || error.message || 'Unknown error';
      testResult.output = error.stdout || '';
      testResult.duration = Date.now() - startTime;

      // Parse test results from output
      const testInfo = this.parseTestResults(error.stdout || '', error.stderr || '');
      testResult.failedTests = testInfo.failedTests;
      testResult.passedTests = testInfo.passedTests;
      testResult.totalTests = testInfo.totalTests;

      console.log(`❌ ${testFile} failed after ${(testResult.duration / 1000).toFixed(2)}s`);
      if (testResult.failedTests.length > 0) {
        console.log(`   Failed tests: ${testResult.failedTests.join(', ')}`);
      }
      if (error.stdout) {
        console.log(error.stdout);
      }
    }

    this.results.push(testResult);
    return testResult.success;
  }

  private parseTestResults(stdout: string, stderr: string): {
    failedTests: string[],
    passedTests: string[],
    totalTests: number
  } {
    const failedTests: string[] = [];
    const passedTests: string[] = [];
    const combinedOutput = stdout + '\n' + stderr;
    const lines = combinedOutput.split('\n');

    // Extract all test names from the chromium test lines
    const testNames = new Set<string>();
    for (const line of lines) {
      // Match format: [chromium] › path › Suite › Test name
      const match = line.match(/\[chromium\]\s*›.*?›\s*(.+?)\s*›\s*(.+?)(?:\s*\(retry|$)/);
      if (match) {
        const testName = match[2].trim();
        if (testName && !testName.includes('(retry')) {
          testNames.add(testName);
        }
      }
    }

    // Find the failed tests section
    let inFailedSection = false;
    for (const line of lines) {
      // Look for "X failed" line to start capturing failures
      if (line.match(/^\s*\d+\s+failed/)) {
        inFailedSection = true;
        continue;
      }

      // If we're in the failed section, capture test names
      if (inFailedSection) {
        // Match: [chromium] › path › Suite › Test name
        const failMatch = line.match(/\[chromium\]\s*›.*?›\s*(.+?)\s*›\s*(.+?)$/);
        if (failMatch) {
          const testName = failMatch[2].trim();
          if (testName) {
            failedTests.push(testName);
          }
        }

        // Stop at the "passed" line
        if (line.match(/^\s*\d+\s+passed/)) {
          break;
        }
      }
    }

    // Parse summary line: "8 passed (20.4s)" or "3 passed, 2 failed (15.2s)"
    const summaryMatch = combinedOutput.match(/(\d+)\s+passed(?:,?\s+(\d+)\s+failed)?/);
    let passedCount = 0;
    let failedCount = 0;

    if (summaryMatch) {
      passedCount = parseInt(summaryMatch[1]);
      failedCount = summaryMatch[2] ? parseInt(summaryMatch[2]) : 0;
    }

    // Determine which tests passed (all tests that aren't failed)
    testNames.forEach(testName => {
      if (!failedTests.includes(testName)) {
        passedTests.push(testName);
      }
    });

    const totalTests = passedCount + failedCount;

    return { failedTests, passedTests, totalTests };
  }

  private generateReport(totalDuration: number): AuditReport {
    // Group results by test file
    const fileResults = new Map<string, TestResult[]>();

    this.results.forEach(result => {
      if (!fileResults.has(result.testFile)) {
        fileResults.set(result.testFile, []);
      }
      fileResults.get(result.testFile)!.push(result);
    });

    // Determine overall status
    const successfulFiles = Array.from(fileResults.entries())
      .filter(([_, results]) => results.some(r => r.success))
      .map(([file, _]) => file);

    const failedFiles = Array.from(fileResults.entries())
      .filter(([_, results]) => !results.some(r => r.success))
      .map(([file, _]) => file);

    const status = successfulFiles.length === this.testFiles.length ? 'PASS' : 'FAIL';

    // Collect all failed tests
    const allFailures = this.results.flatMap(r => r.failedTests);
    const persistentFailures = [...new Set(allFailures)]; // Unique failures

    const summary = status === 'PASS'
      ? `✅ All ${this.testFiles.length} test files passed!`
      : `${successfulFiles.length}/${this.testFiles.length} test files passed. ${failedFiles.length} failed.`;

    return {
      status,
      totalDuration,
      attempts: this.results,
      summary,
      persistentFailures,
      flakyTests: [], // No retries, so no flaky tests
      fileResults
    };
  }

  private async getCommitMessage(): Promise<string> {
    try {
      const { stdout } = await execAsync('git log -1 --pretty=%B');
      return stdout.trim().split('\n')[0]; // First line of commit message
    } catch (error) {
      return 'N/A';
    }
  }

  private async sendAuditReport(report: AuditReport): Promise<void> {
    const duration = (report.totalDuration / 1000).toFixed(2);
    const status = report.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const statusEmoji = report.status === 'PASS' ? '🟢' : '🚨';
    const commitMessage = await this.getCommitMessage();

    // Generate Markdown report for GitHub Actions
    let markdownReport = `# ${statusEmoji} CI/CD Audit Report

**Status:** ${status}  
**Total Duration:** ${duration}s  
**Test Files:** ${this.testFiles.length}  
**Branch:** \`${process.env.GITHUB_REF_NAME || 'local'}\`  
**Commit:** \`${process.env.GITHUB_SHA?.substring(0, 7) || 'N/A'}\`
**Commit Message:** ${commitMessage}

## Summary
${report.summary}

## Test Files Status
${this.testFiles.map(file => {
      const results = report.fileResults.get(file) || [];
      const success = results.some(r => r.success);
      const fileStatus = success ? '✅' : '❌';
      const fileName = path.basename(file);
      const result = results[0];
      const durationStr = result ? ` (${(result.duration / 1000).toFixed(1)}s)` : '';
      return `${fileStatus} ${fileName}${durationStr}`;
    }).join('\n')}

## Detailed Results
`;

    // Group results by test file
    for (const [testFile, fileResults] of report.fileResults.entries()) {
      const fileName = path.basename(testFile);
      const result = fileResults[0];
      if (!result) continue;

      const fileStatus = result.success ? '✅' : '❌';
      const fileDuration = (result.duration / 1000).toFixed(2);
      markdownReport += `\n### ${fileStatus} ${fileName} (${fileDuration}s)\n`;

      if (result.success && result.passedTests.length > 0) {
        markdownReport += `\n**Passed Tests (${result.passedTests.length}):**\n`;
        result.passedTests.forEach(test => {
          markdownReport += `- ✅ ${test}\n`;
        });
      }

      if (!result.success && result.failedTests.length > 0) {
        markdownReport += `\n**Failed Tests (${result.failedTests.length}):**\n`;
        result.failedTests.forEach(test => {
          markdownReport += `- ❌ ${test}\n`;
        });
      }
    }

    if (report.persistentFailures.length > 0) {
      markdownReport += `\n## 🔴 Failed Tests\n`;
      report.persistentFailures.forEach(failure => {
        markdownReport += `- \`${failure}\`\n`;
      });
    }

    // Save markdown report to file
    const summaryPath = path.join(AUDIT_DIR, 'summary.md');
    fs.writeFileSync(summaryPath, markdownReport, 'utf-8');
    console.log(`📄 Audit report saved to: ${summaryPath}`);

    // Save JSON report for programmatic access
    const jsonReport = {
      timestamp: new Date().toISOString(),
      status: report.status,
      duration: report.totalDuration,
      attempts: this.results,
      persistentFailures: report.persistentFailures,
      flakyTests: report.flakyTests,
      branch: process.env.GITHUB_REF_NAME || 'local',
      commit: process.env.GITHUB_SHA?.substring(0, 7) || 'N/A',
      commitMessage: commitMessage
    };
    fs.writeFileSync(
      path.join(AUDIT_DIR, 'results.json'),
      JSON.stringify(jsonReport, null, 2),
      'utf-8'
    );

    // Generate Telegram message with comprehensive details
    let telegramText = `${statusEmoji} *ShareMatch CI/CD Audit Report*

*Status:* ${status}
*Duration:* ${duration}s
*Test Files:* ${this.testFiles.length}

*Summary:* ${report.summary}

*Results:*
`;

    // Add results for each test file
    for (const [testFile, fileResults] of report.fileResults.entries()) {
      const fileName = path.basename(testFile).replace('.spec.ts', '');
      const result = fileResults[0];
      if (!result) continue;

      const fileStatus = result.success ? '✅' : '❌';
      const fileDuration = (result.duration / 1000).toFixed(1);

      telegramText += `${fileStatus} *${fileName}* (${fileDuration}s)\n`;

      // Show failed tests if any
      if (!result.success && result.failedTests.length > 0) {
        result.failedTests.forEach(test => {
          const shortTest = test.length > 40 ? test.substring(0, 37) + '...' : test;
          telegramText += `   ❌ ${shortTest}\n`;
        });
      }
    }

    if (report.persistentFailures.length > 0) {
      telegramText += `\n*🔴 Failed Tests:*\n`;
      report.persistentFailures.forEach(failure => {
        const shortFailure = failure.length > 40 ? failure.substring(0, 37) + '...' : failure;
        telegramText += `• ${shortFailure}\n`;
      });
    }

    telegramText += `\n*Branch:* \`${process.env.GITHUB_REF_NAME || 'local'}\``;
    telegramText += `\n*Commit:* ${commitMessage}`;

    console.log("📤 Sending audit report to Telegram...");
    const sent = await sendTelegramMessage(telegramText);
    if (sent) {
      console.log("✅ Audit report sent successfully.");
    }
  }
}

// Run the audit
if (import.meta.url === `file://${process.argv[1]}`) {
  const audit = new Audit();
  audit.runAudit().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

export { Audit };