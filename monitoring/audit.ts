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
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  failedTests: string[];
}

interface AuditReport {
  status: 'PASS' | 'FAIL';
  totalDuration: number;
  attempts: TestResult[];
  summary: string;
  persistentFailures: string[];
  flakyTests: string[];
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
    console.log("🚀 Starting  CI/CD Audit...");
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
      success: false,
      duration: 0,
      output: '',
      failedTests: []
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
      
      console.log(`✅ ${testFile} completed successfully`);
      console.log(stdout);

    } catch (error: any) {
      testResult.success = false;
      testResult.error = error.stderr || error.message || 'Unknown error';
      testResult.output = error.stdout || '';
      testResult.duration = Date.now() - startTime;
      testResult.failedTests = this.parseFailedTests(error.stdout || error.stderr || '');

      console.log(`❌ ${testFile} failed`);
      console.error(`Error: ${testResult.error}`);
      console.error(`Stdout: ${error.stdout || 'No stdout'}`);
      console.error(`Stderr: ${error.stderr || 'No stderr'}`);
    }

    this.results.push(testResult);
    return testResult.success;
  }

  private parseFailedTests(output: string): string[] {
    const failedTests: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse Playwright test failures
      if (line.includes('✗') || line.includes('failed')) {
        const match = line.match(/(\w+\s+>\s+.+)/);
        if (match) {
          failedTests.push(match[1].trim());
        }
      }

      // Parse specific error patterns
      if (line.includes('Error:') || line.includes('Timeout:') || line.includes('AssertionError:')) {
        failedTests.push(line.trim());
      }
    }

    return failedTests;
  }

  private generateReport(totalDuration: number): AuditReport {
    const successfulAttempts = this.results.filter(r => r.success).length;
    const status = successfulAttempts > 0 ? 'PASS' : 'FAIL';
    
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
      ? this.results.length === 1 
        ? `Tests passed on first attempt. All systems operational.`
        : `Tests passed after ${successfulAttempts} attempt(s). ${flakyTests.length} flaky tests detected.`
      : `All ${this.maxRetries} attempts failed. ${persistentFailures.length} persistent failures detected.`;

    return {
      status,
      totalDuration,
      attempts: this.results,
      summary,
      persistentFailures,
      flakyTests
    };
  }

  private async sendAuditReport(report: AuditReport): Promise<void> {
    const duration = (report.totalDuration / 1000).toFixed(2);
    const status = report.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const statusEmoji = report.status === 'PASS' ? '🟢' : '🚨';

    // Generate Markdown report for GitHub Actions
    let markdownReport = `# ${statusEmoji} CI/CD Audit Report

**Status:** ${status}  
**Total Duration:** ${duration}s  
**Attempts:** ${this.results.length}  
**Branch:** \`${process.env.GITHUB_REF_NAME || 'local'}\`  
**Commit:** \`${process.env.GITHUB_SHA?.substring(0, 7) || 'N/A'}\`

## Summary
${report.summary}

## Test Files
${this.testFiles.map(file => `- \`${path.basename(file)}\``).join('\n')}

## Attempt Results
`;

    this.results.forEach((result) => {
      const attemptStatus = result.success ? '✅' : '❌';
      const attemptDuration = (result.duration / 1000).toFixed(2);
      markdownReport += `\n### ${attemptStatus} Attempt ${result.attempt} (${attemptDuration}s)\n`;
      
      if (!result.success && result.failedTests.length > 0) {
        markdownReport += `\n**Failed Tests:**\n`;
        result.failedTests.slice(0, 10).forEach(failure => {
          markdownReport += `- \`${failure}\`\n`;
        });
        if (result.failedTests.length > 10) {
          markdownReport += `- ... and ${result.failedTests.length - 10} more\n`;
        }
      }
    });

    if (report.persistentFailures.length > 0) {
      markdownReport += `\n## 🔴 Persistent Failures (all ${this.maxRetries} attempts)\n`;
      report.persistentFailures.slice(0, 10).forEach(failure => {
        markdownReport += `- \`${failure}\`\n`;
      });
    }

    if (report.flakyTests.length > 0) {
      markdownReport += `\n## 🟡 Flaky Tests (intermittent)\n`;
      report.flakyTests.slice(0, 5).forEach(test => {
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
    };
    fs.writeFileSync(
      path.join(AUDIT_DIR, 'results.json'),
      JSON.stringify(jsonReport, null, 2),
      'utf-8'
    );

    // Generate Telegram message (shorter format)
    let telegramText = `
${statusEmoji} *ShareMatch CI/CD Audit Report*

*Status:* ${status}
*Duration:* ${duration}s
*Attempts:* ${this.results.length}

*Summary:* ${report.summary}

*Test Files:*
${this.testFiles.map(file => `• \`${path.basename(file)}\``).join('\n')}
`;

    this.results.forEach((result) => {
      const attemptStatus = result.success ? '✅' : '❌';
      const attemptDuration = (result.duration / 1000).toFixed(2);
      telegramText += `\n${attemptStatus} *Attempt ${result.attempt}* (${attemptDuration}s)`;
    });

    if (report.persistentFailures.length > 0) {
      telegramText += `\n\n*🔴 Persistent Failures:*\n`;
      report.persistentFailures.slice(0, 3).forEach(failure => {
        telegramText += `• \`${failure.substring(0, 50)}...\`\n`;
      });
    }

    telegramText += `\n*Branch:* \`${process.env.GITHUB_REF_NAME || 'local'}\``;
    telegramText += `\n*Commit:* \`${process.env.GITHUB_SHA?.substring(0, 7) || 'N/A'}\``;

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
