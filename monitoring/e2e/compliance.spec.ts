
import { test, expect } from '@playwright/test';

// List of forbidden terms (Shariah compliance)
const FORBIDDEN_TERMS = [
    'bet',
    'betting',
    'gamble',
    'gambling',
    'wager',
    'stake',
    'win money',
    'jackpot',
    'casino',
    'luck',
    'chance'
];

test.describe('Shariah Compliance Content Scan', () => {
    const pagesToCheck = [
        '/',
        '/market/EPL',
        '/portfolio',
        '/help-center' // If accessible via URL, otherwise via modal interaction
    ];

    for (const path of pagesToCheck) {
        test(`Scan ${path} for forbidden terms`, async ({ page }) => {
            await page.goto(path);

            // Get all text content
            const content = await page.innerText('body');
            const lowerContent = content.toLowerCase();

            const violations: string[] = [];

            FORBIDDEN_TERMS.forEach(term => {
                // Simple distinct word boundary check to avoid false positives (e.g., "better" matching "bet")
                // This is a basic regex, might need refinement
                const regex = new RegExp(`\\b${term}\\b`, 'i');
                if (regex.test(content)) {
                    // Double check context - sometimes "stake" is used in "stakeholder" (handled by \b boundary), 
                    // or legitimate financial context.
                    // For now, flag strict violations.
                    violations.push(term);
                }
            });

            expect(violations, `Found forbidden terms on ${path}: ${violations.join(', ')}`).toHaveLength(0);
        });
    }
});
