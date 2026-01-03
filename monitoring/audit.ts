
import { exec } from 'child_process';
import { promisify } from 'util';
import { sendTelegramMessage } from './notify';

const execAsync = promisify(exec);

async function runAudit() {
    console.log("🚀 Starting Daily Health & Compliance Audit...");
    const startTime = Date.now();
    let status = "✅ PASS";
    let summary = "";
    let failedTests: string[] = [];

    try {
        // Run Playwright Tests
        console.log("Running Playwright E2E Tests...");
        const { stdout, stderr } = await execAsync('npx playwright test', {
            env: { ...process.env, CI: 'true' },
            maxBuffer: 1024 * 1024 * 10
        });

        console.log(stdout);

        // If we get here, tests passed (exec throws on non-zero exit code)
        summary = "All systems operational. Compliance checks passed.";

    } catch (error: any) {
        status = "❌ FAIL";
        summary = "Issues detected in daily audit.";

        // Parse error output to find failed tests
        const output = error.stdout || error.stderr || "";
        // Basic extraction of failed lines (this is a heuristic)
        if (output.includes("Error:")) {
            failedTests.push("Test Suite Failed - Check logs.");
        }
        console.error("Test execution failed:", output);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const report = `
${status === '✅ PASS' ? '🟢' : '🚨'} *ShareMatch Daily Audit Report*

*Status:* ${status}
*Duration:* ${duration}s

${summary}

*Checks Performed:*
• Shariah Compliance Scan (Forbidden words)
• Authentication Flow
• Critical Path (Trading/Asset Pages)
• Broken Link Detection
`;

    console.log("Sending Telegram Report...");
    await sendTelegramMessage(report);
    console.log("Done.");

    if (status !== "✅ PASS") {
        process.exit(1);
    }
}

runAudit();
