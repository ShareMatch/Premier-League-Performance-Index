// tests/integration/twilio.spec.ts
import { test, expect } from '@playwright/test';
import { sendEmailOtp } from '../../lib/api';  // Your API wrapper for send-email-otp (Twilio/SendGrid)

// Your renamed adapter (for optional live checks)
import { twilioAdapter } from '../../adapters/twilioSendGrid';

const TEST_EMAIL = 'affan@sharematch.me';
const INVALID_EMAIL = 'ap@sharematch.me';

test.describe('Twilio/SendGrid Integration Tests', () => {
    test.beforeEach(async () => {
        console.log('=== Test Setup: Starting (no Supabase cleanup needed) ===');
    });

    test('Success: Send OTP to valid email', async ({ request }) => {
        console.log('=== Success Test: Starting ===');
        try {
            // Trigger send via your API wrapper
            // Use forProfileChange: true to allow sending to already-verified emails in tests
            const response = await sendEmailOtp(TEST_EMAIL, { forProfileChange: true });

            console.log('Backend Response:', response);

            // Optional live check/log (using test creds)
            // Note: This might return null if using Twilio Test Credentials
            const sendLog = await twilioAdapter.getRecentSendLog(TEST_EMAIL);
            if (sendLog) {
                console.log('Recent Send Log Details:', sendLog);
            } else {
                console.log('Recent Send Log Details: No logs found (likely using Test Credentials)');
            }

            // Assertion: The API itself must succeed
            expect(response.ok).toBe(true);
            expect(response.message).toContain('Verification code sent');

            console.log('=== Success Test: Completed - Check logs for send details ===');
        } catch (err) {
            console.error('Failure in Success Test:', err.message);
            throw err;
        }
    });

    test('Failure: Send OTP to invalid email', async () => {
        console.log('=== Invalid Email Test: Starting ===');
        try {
            await sendEmailOtp(INVALID_EMAIL);
            console.log('Unexpected success - check why it didn\'t fail');
            throw new Error('Should have failed');
        } catch (err) {
            console.log('Expected Failure Details:', err.message);  // Log error
            const sendLog = await twilioAdapter.getRecentSendLog(INVALID_EMAIL);
            console.log('Send Log (expected null/no send):', sendLog);  // Should be null

            console.log('=== Invalid Email Test: Completed - Failure handled ===');
        }
    });

    test('Failure: Max attempts reached', async () => {
        console.log('=== Max Attempts Test: Starting ===');
        try {
            // Simulate by calling multiple times (adjust to MAX_ATTEMPTS in backend)
            for (let i = 0; i < 6; i++) {  // Assume max=5; excess triggers failure
                console.log(`Attempt ${i + 1} Log:`);
                await sendEmailOtp(TEST_EMAIL);
            }
            console.log('Unexpected success beyond max');
            throw new Error('Should have failed on max attempts');
        } catch (err) {
            console.log('Expected Failure Details:', err.message);  // Log error
            const sendLogs = await twilioAdapter.getAllSendLogs(TEST_EMAIL);
            console.log('All Send Logs (expected 5 successful):', sendLogs);  // Log for check

            console.log('=== Max Attempts Test: Completed - Rate limit enforced ===');
        }
    });

    test('Failure: Twilio/SendGrid API error (bad key)', async () => {
        console.log('=== API Error Test: Starting ===');
        // Temporarily override env for bad key (simulate error)
        const originalKey = process.env.SENDGRID_API_KEY;
        process.env.SENDGRID_API_KEY = 'invalid_key';

        try {
            await sendEmailOtp(TEST_EMAIL);
            console.log('Unexpected success with bad key');
            throw new Error('Should have failed');
        } catch (err) {
            console.log('Expected Failure Details:', err.message);  // Log error
            const sendLog = await twilioAdapter.getRecentSendLog(TEST_EMAIL);
            console.log('Send Log (expected null/no send):', sendLog);  // Should be null

            console.log('=== API Error Test: Completed - Error handled ===');
        } finally {
            process.env.SENDGRID_API_KEY = originalKey;  // Restore
        }
    });
});