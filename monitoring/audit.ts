import { exec } from 'child_process';
import { promisify } from 'util';
import { sendTelegramMessage } from './notify';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

function getCommitMessage(): string {
  if (process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE) {
    return process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE.split('\n')[0];
  }
  return process.env.GITHUB_COMMIT_MESSAGE || 'N/A';
}

/* ---------------------------------------------
   Setup
--------------------------------------------- */

const AUDIT_DIR = 'audit-reports';
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'unknown';
}

interface TestResult {
  testFile: string;
  attempt: number;
  success: boolean;
  duration: number;
  stdout: string;
  stderr?: string;
  testCases: TestCaseResult[];
  failedTests: string[];
  summaryText?: string;
}

interface AuditReport {
  status: 'PASS' | 'FAIL';
  totalDurationMs: number;
  attemptsByFile: Map<string, TestResult[]>;
  summary: string;
  persistentFailures: string[];
  flakyTests: string[];
}

/* ---------------------------------------------
   Audit Runner
--------------------------------------------- */

class Audit {
  private testFiles = [
    'tests/generated/home-page.spec.ts',
    'tests/generated/login-flow.spec.ts',
    'tests/generated/signup-flow.spec.ts'
  ];

  private maxRetries = 3;
  private resultsByFile: Map<string, TestResult[]> = new Map();

  async runAudit(): Promise<void> {
    console.log('Starting CI/CD Audit...');
    const startTime = Date.now();

    for (const testFile of this.testFiles) {
      this.resultsByFile.set(testFile, []);
      console.log(`\nTesting: ${testFile}`);

      let passed = false;

      for (let attempt = 1; attempt <= this.maxRetries && !passed; attempt++) {
        console.log(`Attempt ${attempt}/${this.maxRetries}`);
        const result = await this.runSingleTest(testFile, attempt);
        this.resultsByFile.get(testFile)!.push(result);

        if (result.success) {
          passed = true;
          console.log(`${path.basename(testFile)} passed on attempt ${attempt}`);
        } else {
          console.log(`${path.basename(testFile)} failed on attempt ${attempt}`);
        }
      }
    }

    const report = this.generateReport(Date.now() - startTime);
    await this.writeAndSendReport(report);

    if (report.status === 'FAIL') process.exit(1);
  }

  /* ---------------------------------------------
     Single Test Execution
  --------------------------------------------- */

  private async runSingleTest(testFile: string, attempt: number): Promise<TestResult> {
    const start = Date.now();
    const env = { ...process.env, CI: 'true', ATTEMPT: attempt.toString() };

    try {
      const { stdout, stderr } = await execAsync(
        `npx playwright test ${testFile} --reporter=line`,
        { env, maxBuffer: 1024 * 1024 * 10, timeout: 300000 }
      );

      const parsed = this.parseOutput(stdout + (stderr ? '\n' + stderr : ''));

      return {
        testFile,
        attempt,
        success: parsed.failedCount === 0,
        duration: Date.now() - start,
        stdout,
        stderr,
        testCases: parsed.testCases,
        failedTests: parsed.failedTests,
        summaryText: parsed.summaryText
      };
    } catch (err: any) {
      const stdout = err.stdout || '';
      const stderr = err.stderr || err.message || '';
      const parsed = this.parseOutput(stdout + '\n' + stderr);

      return {
        testFile,
        attempt,
        success: false,
        duration: Date.now() - start,
        stdout,
        stderr,
        testCases: parsed.testCases,
        failedTests: parsed.failedTests,
        summaryText: parsed.summaryText
      };
    }
  }

  /* ---------------------------------------------
     Playwright Output Parser
  --------------------------------------------- */

  private parseOutput(raw: string) {
    const lines = raw.split('\n');
    const testCases: TestCaseResult[] = [];
    const failedTests: string[] = [];

    let failedCount = 0;
    let summaryText: string | undefined;

    const testLine = /^\[\d+\/\d+\].*›.*›\s(.+)$/;

    for (const line of lines) {
      const trimmed = line.trim();

      const testMatch = line.match(testLine);
      if (testMatch) {
        const name = testMatch[1].trim();
        if (!testCases.find(t => t.name === name)) {
          testCases.push({ name, status: 'unknown' });
        }
      }

      if (trimmed.startsWith('✗') || trimmed.includes('failed')) {
        const name = trimmed.replace(/^✗/, '').trim();
        failedTests.push(name);
      }

      if (trimmed.match(/\d+\s+passed/) || trimmed.match(/\d+\s+failed/)) {
        summaryText = trimmed;
        const failedMatch = trimmed.match(/(\d+)\s+failed/);
        failedCount = failedMatch ? Number(failedMatch[1]) : 0;
      }
    }

    // Assign statuses
    testCases.forEach(tc => {
      tc.status = failedTests.some(f => f.includes(tc.name))
        ? 'failed'
        : 'passed';
    });

    return {
      testCases,
      failedTests: Array.from(new Set(failedTests)),
      failedCount,
      summaryText
    };
  }

  /* ---------------------------------------------
     Report Aggregation
  --------------------------------------------- */

  private generateReport(totalDurationMs: number): AuditReport {
    const persistentFailures: string[] = [];
    const flakyTests: string[] = [];

    for (const [file, attempts] of this.resultsByFile.entries()) {
      const failures = new Map<string, number>();

      attempts.forEach(a => {
        a.testCases.forEach(tc => {
          if (tc.status === 'failed') {
            failures.set(tc.name, (failures.get(tc.name) || 0) + 1);
          }
        });
      });

      failures.forEach((count, testName) => {
        if (count === this.maxRetries) {
          persistentFailures.push(`${path.basename(file)}: ${testName}`);
        } else {
          flakyTests.push(`${path.basename(file)}: ${testName}`);
        }
      });
    }

    const allFilesPassed = Array.from(this.resultsByFile.values())
      .every(attempts => attempts.some(a => a.success));

    return {
      status: allFilesPassed ? 'PASS' : 'FAIL',
      totalDurationMs,
      attemptsByFile: this.resultsByFile,
      summary: `${this.resultsByFile.size}/${this.testFiles.length} test files executed`,
      persistentFailures,
      flakyTests
    };
  }

  /* ---------------------------------------------
     Output & Notifications
  --------------------------------------------- */

  private async writeAndSendReport(report: AuditReport): Promise<void> {
    const durationSec = (report.totalDurationMs / 1000).toFixed(2);

    let md = `CI/CD Audit Report

Status: ${report.status}
Duration: ${durationSec}s
Branch: ${process.env.GITHUB_REF_NAME || 'local'}
Commit Message: ${getCommitMessage()}

`;

    for (const [file, attempts] of report.attemptsByFile.entries()) {
      md += `## ${path.basename(file)}\n`;

      for (const a of attempts) {
        md += `Attempt ${a.attempt}: ${a.success ? 'PASS' : 'FAIL'} (${(a.duration / 1000).toFixed(2)}s)\n`;
        if (a.summaryText) md += `Summary: ${a.summaryText}\n`;

        a.testCases.forEach(tc => {
          md += `- [${tc.status.toUpperCase()}] ${tc.name}\n`;
        });

        md += '\n';
      }
    }

    if (report.persistentFailures.length) {
      md += `Persistent Failures:\n`;
      report.persistentFailures.forEach(f => md += `- ${f}\n`);
    }

    fs.writeFileSync(path.join(AUDIT_DIR, 'summary.md'), md, 'utf-8');

    let telegram = `ShareMatch CI/CD Audit Report

Status: ${report.status}
Duration: ${durationSec}s
Commit Message: ${getCommitMessage()}

`;

    for (const [file, attempts] of report.attemptsByFile.entries()) {
      telegram += `${path.basename(file)}\n`;
      attempts.forEach(a => {
        telegram += `Attempt ${a.attempt}: ${a.success ? 'PASS' : 'FAIL'} (${(a.duration / 1000).toFixed(2)}s)\n`;
        if (a.failedTests.length) {
          telegram += `Failed tests: ${a.failedTests.slice(0, 5).join(', ')}\n`;
        }
      });
      telegram += '\n';
    }

    await sendTelegramMessage(telegram);
  }
}

/* ---------------------------------------------
   Entrypoint
--------------------------------------------- */

if (import.meta.url === `file://${process.argv[1]}`) {
  new Audit().runAudit().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
  });
}

export { Audit };
