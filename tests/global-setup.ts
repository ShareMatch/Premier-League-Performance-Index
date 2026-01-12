import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  console.log('Global setup running...');

  console.log('Global setup complete.');
}
