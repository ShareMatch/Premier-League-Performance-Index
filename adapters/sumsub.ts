/**
 * Sumsub Adapter (Playwright Fixture)
 * 
 * This adapter wraps the Sumsub API and exposes simple tools
 * that the AI Agent can use to verify backend state.
 */
import { test as base } from '@playwright/test';
import axios from 'axios';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

// Define what the "Sumsub Tool" looks like to the Agent
type SumsubFixture = {
  checkApplicantStatus: (externalUserId: string) => Promise<string>;
  getApplicantReviewResult: (externalUserId: string) => Promise<{ status: string; reviewAnswer: string }>;
  deleteApplicant: (externalUserId: string) => Promise<void>;
};

// Helper to sign requests (Sumsub requires HMAC signatures)
const signRequest = (method: string, url: string, body: string = '') => {
  const ts = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', process.env.SUMSUB_SECRET_KEY!)
    .update(ts + method.toUpperCase() + url + body)
    .digest('hex');
  return {
    'X-App-Token': process.env.SUMSUB_APP_TOKEN!,
    'X-App-Access-Sig': signature,
    'X-App-Access-Ts': ts.toString(),
  };
};

const BASE_URL = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

// Extend Playwright's test object to include our new tool
export const test = base.extend<{ sumsub: SumsubFixture }>({
  sumsub: async ({}, use) => {
    // This is the implementation the Agent will use
    const tools: SumsubFixture = {
      
      /**
       * TOOL 1: Check if a user's verification status
       * Returns: 'init', 'pending', 'prechecked', 'queued', 'completed', 'onHold'
       */
      checkApplicantStatus: async (externalUserId: string): Promise<string> => {
        const url = `/resources/applicants/-;externalUserId=${externalUserId}/status`;
        try {
          const headers = signRequest('GET', url);
          const response = await axios.get(`${BASE_URL}${url}`, { headers });
          console.log(`[Observer] Sumsub API Status for ${externalUserId}:`, response.data.reviewStatus);
          return response.data.reviewStatus;
        } catch (error: any) {
          console.error('[Error] Sumsub API check failed:', error.message);
          return 'ERROR';
        }
      },

      /**
       * TOOL 2: Get the review result (GREEN/RED)
       * Returns: { status: 'completed', reviewAnswer: 'GREEN' | 'RED' }
       */
      getApplicantReviewResult: async (externalUserId: string) => {
        const url = `/resources/applicants/-;externalUserId=${externalUserId}/status`;
        try {
          const headers = signRequest('GET', url);
          const response = await axios.get(`${BASE_URL}${url}`, { headers });
          console.log(`[Observer] Sumsub Review Result for ${externalUserId}:`, {
            status: response.data.reviewStatus,
            answer: response.data.reviewResult?.reviewAnswer
          });
          return {
            status: response.data.reviewStatus,
            reviewAnswer: response.data.reviewResult?.reviewAnswer || 'PENDING'
          };
        } catch (error: any) {
          console.error('[Error] Sumsub API review result failed:', error.message);
          return { status: 'ERROR', reviewAnswer: 'ERROR' };
        }
      },

      /**
       * TOOL 3: Cleanup - Reset state for next test
       */
      deleteApplicant: async (externalUserId: string): Promise<void> => {
        const url = `/resources/applicants/-;externalUserId=${externalUserId}`;
        try {
          const headers = signRequest('DELETE', url);
          await axios.delete(`${BASE_URL}${url}`, { headers });
          console.log(`[Action] Successfully deleted/reset user ${externalUserId}`);
        } catch (error: any) {
          console.error('[Error] Failed to delete applicant:', error.message);
        }
      }
    };

    await use(tools);
  },
});

export { expect } from '@playwright/test';

