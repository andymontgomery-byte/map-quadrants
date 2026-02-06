#!/usr/bin/env node
/**
 * Save NWEA Authentication
 *
 * Opens browser, you log in, then saves auth state for future automated runs.
 */

import { chromium } from 'playwright';

const AUTH_FILE = './nwea-auth.json';

async function main() {
  console.log('🔐 NWEA Authentication Saver\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  console.log('🌐 Opening NWEA login page...\n');
  await page.goto('https://teach.mapnwea.org');

  console.log('═'.repeat(50));
  console.log('Please log in to NWEA in the browser window.');
  console.log('Press Enter here when you\'re logged in.');
  console.log('═'.repeat(50));

  await new Promise(resolve => process.stdin.once('data', resolve));

  // Save auth state
  await context.storageState({ path: AUTH_FILE });
  console.log(`\n✅ Authentication saved to: ${AUTH_FILE}`);

  await browser.close();
  console.log('\n🎉 Done! You can now run automated NWEA scripts.');
}

main().catch(console.error);
