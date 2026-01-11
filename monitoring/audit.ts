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
  private testFiles = [
    'tests/generated/home-page.spec.ts',
    'tests/generated/login-flow.spec.ts', 
    'tests/generated/signup-flow.spec.ts'
  ];

  private maxRetries = 3;
  private results: TestResult[] = [];

  async runAudit(): Promise<void> {
    console.log("🚀 Starting CI/CD Audit...");
    const startTime = Date.now();

    // Run each test file individually with retry logic
    for (const testFile of this.testFiles) {
      console.log(`\n📋 Testing: ${testFile}`);
      
      let fileSuccess = false;
      let attempts = 0;
      
      while (!fileSuccess && attempts < this.maxRetries) {
        attempts++;
        console.log(`Attempt ${attempts}/${this.maxRetries} for ${testFile}`);
        
        const success = await this.runSingleTest(testFile, attempts);
        
        if (success) {
          fileSuccess = true;
          if (attempts === 1) {
            console.log(`✅ ${testFile} passed on first attempt`);
          } else {
            console.log(`✅ ${testFile} passed after ${attempts} attempts`);
          }
          break; // Exit retry loop on success
        } else {
          console.log(`❌ ${testFile} failed on attempt ${attempts}`);
        }
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
          env: { ...process.env, CI: 'true', ATTEMPT: attempt.toString() },
          maxBuffer: 1024 * 1024 * 10,
          timeout: 300000
        }
      );

      testResult.success = true;
      testResult.output = stdout;
      testResult.duration = Date.now() - startTime;
      
      // Parse passed tests
      const testInfo = this.parseTestResults(stdout);
      testResult.passedTests = testInfo.passedTests;
      testResult.totalTests = testInfo.totalTests;
      
      console.log(`✅ ${testFile} completed successfully`);
      console.log(stdout);

    } catch (error: any) {
      testResult.success = false;
      testResult.error = error.stderr || error.message || 'Unknown error';
      testResult.output = error.stdout || '';
      testResult.duration = Date.now() - startTime;
      
      // Parse test results from output
      const testInfo = this.parseTestResults(error.stdout || error.stderr || '');
      testResult.failedTests = testInfo.failedTests;
      testResult.passedTests = testInfo.passedTests;
      testResult.totalTests = testInfo.totalTests;

      console.log(`❌ ${testFile} failed`);
      console.error(`Error: ${testResult.error}`);
      console.error(`Stdout: ${error.stdout || 'No stdout'}`);
      console.error(`Stderr: ${error.stderr || 'No stderr'}`);
    }

    this.results.push(testResult);
    return testResult.success;
  }

  private parseTestResults(output: string): { 
    failedTests: string[], 
    passedTests: string[],
    totalTests: number 
  } {
    const failedTests: string[] = [];
    const passedTests: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse test names from Playwright output
      // Format: [1/8] [chromium] › tests/generated/home-page.spec.ts:41:3 › Home Page › Test name
      const testMatch = line.match(/\[chromium\]\s*›.*?›\s*(.*?)\s*›\s*(.*?)$/);
      if (testMatch) {
        const testName = testMatch[2].trim();
        
        // Check if this test failed
        if (lines.some(l => l.includes(testName) && (l.includes('✗') || l.includes('failed')))) {
          failedTests.push(testName);
        } else {
          passedTests.push(testName);
        }
      }
    }

    // Parse summary line: "8 passed (20.4s)" or "3 passed, 2 failed (15.2s)"
    const summaryMatch = output.match(/(\d+)\s+passed(?:,\s+(\d+)\s+failed)?/);
    let totalTests = passedTests.length + failedTests.length;
    if (summaryMatch) {
      totalTests = parseInt(summaryMatch[1]) + (summaryMatch[2] ? parseInt(summaryMatch[2]) : 0);
    }

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

    const status = successfulFiles.length === this.testFiles.length ? 'PASS' : 'FAIL';
    
    // Find persistent failures (failed in all attempts)
    const allFailures = this.results.flatMap(r => r.failedTests);
    const failureCounts = new Map<string, number>();
    
    allFailures.forEach(failure => {
      failureCounts.set(failure, (failureCounts.get(failure) || 0) + 1);
    });

    const persistentFailures = Array.from(failureCounts.entries())
      .filter(([_, count]) => count === this.maxRetries)
      .map(([failure, _]) => failure);

    const flakyTests = Array.from(failureCounts.entries())
      .filter(([_, count]) => count > 0 && count < this.maxRetries)
      .map(([failure, _]) => failure);

    const summary = status === 'PASS' 
      ? `${successfulFiles.length}/${this.testFiles.length} test files passed. ${flakyTests.length} flaky tests detected.`
      : `${successfulFiles.length}/${this.testFiles.length} test files passed. ${persistentFailures.length} persistent failures detected.`;

    return {
      status,
      totalDuration,
      attempts: this.results,
      summary,
      persistentFailures,
      flakyTests,
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
**Attempts:** ${this.results.length}  
**Branch:** \`${process.env.GITHUB_REF_NAME || 'local'}\`  
**Commit:** \`${process.env.GITHUB_SHA?.substring(0, 7) || 'N/A'}\`
**Commit Message:** ${commitMessage}

## Summary
${report.summary}

## Test Files Status
${this.testFiles.map(file => {
  const results = report.fileResults.get(file) || [];
  const success = results.some(r => r.success);
  const status = success ? '✅' : '❌';
  const fileName = path.basename(file);
  return `${status} ${fileName}`;
}).join('\n')}

## Detailed Results
`;

    // Group results by test file
    for (const [testFile, fileResults] of report.fileResults.entries()) {
      const fileName = path.basename(testFile);
      markdownReport += `\n### ${fileName}\n`;
      
      fileResults.forEach((result) => {
        const attemptStatus = result.success ? '✅' : '❌';
        const attemptDuration = (result.duration / 1000).toFixed(2);
        markdownReport += `\n#### ${attemptStatus} Attempt ${result.attempt} (${attemptDuration}s) - ${result.totalTests} tests\n`;
        
        if (result.success && result.passedTests.length > 0) {
          markdownReport += `\n**Passed Tests:**\n`;
          result.passedTests.forEach(test => {
            markdownReport += `- ✅ ${test}\n`;
          });
        }
        
        if (!result.success && result.failedTests.length > 0) {
          markdownReport += `\n**Failed Tests:**\n`;
          result.failedTests.forEach(test => {
            markdownReport += `- ❌ ${test}\n`;
          });
        }
      });
    }

    if (report.persistentFailures.length > 0) {
      markdownReport += `\n## 🔴 Persistent Failures (all ${this.maxRetries} attempts)\n`;
      report.persistentFailures.forEach(failure => {
        markdownReport += `- \`${failure}\`\n`;
      });
    }

    if (report.flakyTests.length > 0) {
      markdownReport += `\n## 🟡 Flaky Tests (intermittent)\n`;
      report.flakyTests.forEach(test => {
        markdownReport += `- \`${test}\`\n`;
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
*Total Attempts:* ${this.results.length}

*Summary:* ${report.summary}

`;

    // Add detailed results for each test file
    for (const [testFile, fileResults] of report.fileResults.entries()) {
      const fileName = path.basename(testFile).replace('.spec.ts', '');
      
      fileResults.forEach((result) => {
        const attemptStatus = result.success ? '✅' : '❌';
        const attemptDuration = (result.duration / 1000).toFixed(2);
        
        telegramText += `\n${attemptStatus} *${fileName}*\nAttempt ${result.attempt} (${attemptDuration}s) - ${result.totalTests} tests\n`;
        
        // Show failed tests if any
        if (!result.success && result.failedTests.length > 0) {
          telegramText += `*Failed:*\n`;
          result.failedTests.slice(0, 3).forEach(test => {
            const shortTest = test.length > 50 ? test.substring(0, 47) + '...' : test;
            telegramText += `  • ${shortTest}\n`;
          });
          if (result.failedTests.length > 3) {
            telegramText += `  • ... and ${result.failedTests.length - 3} more\n`;
          }
        }
      });
    }

    if (report.persistentFailures.length > 0) {
      telegramText += `\n*🔴 Persistent Failures:*\n`;
      report.persistentFailures.slice(0, 3).forEach(failure => {
        const shortFailure = failure.length > 50 ? failure.substring(0, 47) + '...' : failure;
        telegramText += `• ${shortFailure}\n`;
      });
      if (report.persistentFailures.length > 3) {
        telegramText += `• ... and ${report.persistentFailures.length - 3} more\n`;
      }
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