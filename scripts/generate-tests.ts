#!/usr/bin/env npx tsx
/**
 * Local Test Generation Script
 * 
 * This script generates Playwright tests using the Groq-powered Test Writer Agent.
 * It handles rate limits by running sequentially and adding delays between API calls.
 * 
 * Usage:
 *   npm run generate-tests           # Generate all tests
 *   npm run generate-tests -- login  # Generate only login tests
 *   npm run generate-tests -- signup # Generate only signup tests
 * 
 * The generated tests are saved to tests/ and should be committed to git.
 * CI/CD will then run these pre-generated tests (no LLM calls in CI).
 */

import { chromium } from '@playwright/test';
import { createTestWriter, CONFIG } from '../agents/test-writer-agent';
import { getTestableFeatures } from '../agents/app-context';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Test Generation Script (Local Only)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🔧 Model: ${CONFIG.GROQ_MODEL}`);
  console.log(`⏱️  Delay between calls: ${CONFIG.DELAY_BETWEEN_CALLS_MS / 1000}s`);
  console.log(`🔄 Max retries on rate limit: ${CONFIG.MAX_RETRIES}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('');

  // Check for GROQ_API_KEY
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ Error: GROQ_API_KEY not found in environment.');
    console.error('   Please add GROQ_API_KEY to your .env file.');
    process.exit(1);
  }

  // Check if dev server is running
  console.log(`🔗 Checking if dev server is running at ${BASE_URL}...`);
  try {
    const response = await fetch(BASE_URL, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log('✅ Dev server is running!\n');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error: Dev server is not running!');
    console.error('');
    console.error('   Please start the dev server first:');
    console.error('   $ npm run dev');
    console.error('');
    console.error(`   Then run this script again.`);
    console.error('');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const featureFilter = args[0]?.toLowerCase();

  // Get features to generate
  let features = getTestableFeatures();
  
  if (featureFilter) {
    features = features.filter(f => 
      f.name.toLowerCase().includes(featureFilter)
    );
    
    if (features.length === 0) {
      console.error(`❌ No features found matching: "${featureFilter}"`);
      console.error('   Available features:');
      getTestableFeatures().forEach(f => console.error(`   - ${f.name}`));
      process.exit(1);
    }
  }

  console.log('📋 Features to generate:');
  features.forEach(f => console.log(`   - ${f.name}`));
  console.log('');

  // Launch browser with baseURL configured
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
  });
  const page = await context.newPage();

  // Create test writer agent
  const agent = createTestWriter(page);

  // Track results
  const results: { feature: string; success: boolean; file?: string; error?: string }[] = [];

  try {
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      
      console.log('');
      console.log('═'.repeat(60));
      console.log(`📌 [${i + 1}/${features.length}] ${feature.name}`);
      console.log('═'.repeat(60));

      try {
        const filepath = await agent.generateTests(feature.url, feature.name);
        results.push({ feature: feature.name, success: true, file: filepath });
      } catch (error: any) {
        console.error(`❌ Failed: ${error.message}`);
        results.push({ feature: feature.name, success: false, error: error.message });
      }

      // Add delay between features (except for last one)
      if (i < features.length - 1) {
        const delaySeconds = Math.ceil(CONFIG.DELAY_BETWEEN_CALLS_MS / 1000);
        console.log(`\n⏳ Waiting ${delaySeconds}s before next feature...`);
        await new Promise(r => setTimeout(r, CONFIG.DELAY_BETWEEN_CALLS_MS));
      }
    }
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                     Generation Summary                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   📁 ${r.feature}: ${r.file}`);
  });

  if (failed.length > 0) {
    console.log('');
    console.log(`❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   ⚠️  ${r.feature}: ${r.error}`);
    });
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('');

  if (successful.length > 0) {
    console.log('📝 Next steps:');
    console.log('   1. Review the generated test files');
    console.log('   2. Run them locally: npm run test:e2e');
    console.log('   3. Commit them: git add tests/ && git commit -m "Update generated tests"');
    console.log('   4. Push to trigger CI');
  }

  // Exit with error code if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

