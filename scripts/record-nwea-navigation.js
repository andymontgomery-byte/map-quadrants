#!/usr/bin/env node
/**
 * Record NWEA Navigation
 *
 * Records your clicks and actions as you navigate to the NWEA quadrant report.
 * Saves the recording as a replayable Playwright script.
 *
 * Usage:
 *   node scripts/record-nwea-navigation.js
 *
 * This will:
 * 1. Open a browser with recording enabled
 * 2. You navigate to the quadrant report manually
 * 3. Your actions are saved to scripts/nwea-recorded-actions.js
 * 4. Future runs can replay your exact navigation automatically
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const RECORDING_FILE = './scripts/nwea-recorded-actions.js';
const AUTH_FILE = './nwea-auth.json';

async function main() {
  console.log('🎬 NWEA Navigation Recorder\n');
  console.log('This will record your actions as you navigate NWEA.\n');

  // Check if we have saved auth
  const hasAuth = fs.existsSync(AUTH_FILE);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './test-screenshots/nwea-compare/' },
  };

  // Load saved auth if available
  if (hasAuth) {
    console.log('📂 Loading saved authentication...\n');
    contextOptions.storageState = AUTH_FILE;
  }

  const context = await browser.newContext(contextOptions);

  // Enable recording
  const actions = [];
  let lastUrl = '';

  const page = await context.newPage();

  // Track all actions
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (url !== lastUrl) {
        actions.push({ type: 'goto', url });
        lastUrl = url;
        console.log(`📍 Navigation: ${url}`);
      }
    }
  });

  page.on('click', (event) => {
    // This doesn't work directly, we need to use CDP
  });

  // Use CDP to capture clicks
  const client = await context.newCDPSession(page);

  await client.send('DOM.enable');
  await client.send('Overlay.enable');

  // Track clicks via Input domain
  await client.send('Input.setInterceptDrags', { enabled: true }).catch(() => {});

  // Create a simpler approach - inject a click tracker
  await page.addInitScript(() => {
    window.__recordedActions = window.__recordedActions || [];

    document.addEventListener('click', (e) => {
      const target = e.target;
      const selector = getSelector(target);
      const action = {
        type: 'click',
        selector: selector,
        x: e.clientX,
        y: e.clientY,
        text: target.textContent?.slice(0, 50),
        timestamp: Date.now()
      };
      window.__recordedActions.push(action);
      console.log('Click recorded:', selector);
    }, true);

    document.addEventListener('change', (e) => {
      const target = e.target;
      const action = {
        type: 'select',
        selector: getSelector(target),
        value: target.value,
        timestamp: Date.now()
      };
      window.__recordedActions.push(action);
    }, true);

    document.addEventListener('input', (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' && target.type === 'text') {
        const action = {
          type: 'fill',
          selector: getSelector(target),
          value: target.value,
          timestamp: Date.now()
        };
        // Debounce - only record final value
        window.__lastInput = action;
      }
    }, true);

    function getSelector(el) {
      if (el.id) return `#${el.id}`;
      if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
      if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c && !c.includes('hover') && !c.includes('active'));
        if (classes.length > 0) return `.${classes[0]}`;
      }
      return el.tagName.toLowerCase();
    }
  });

  console.log('🌐 Opening NWEA...\n');
  await page.goto('https://teach.mapnwea.org');

  console.log('═'.repeat(60));
  console.log('📝 INSTRUCTIONS:');
  console.log('═'.repeat(60));
  console.log('1. Log in to NWEA (if needed)');
  console.log('2. Navigate to the Achievement Status & Growth Quadrant Report');
  console.log('3. Select your criteria (Term, School, Grade, Growth Period)');
  console.log('4. Wait for the report to load');
  console.log('5. When done, come back here and press Enter');
  console.log('═'.repeat(60));
  console.log('\n⏳ Recording your actions... Press Enter when done.\n');

  // Wait for user to finish
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Collect recorded actions from the page
  const recordedActions = await page.evaluate(() => window.__recordedActions || []);

  // Save authentication state
  console.log('\n💾 Saving authentication state...');
  await context.storageState({ path: AUTH_FILE });

  // Take final screenshot
  const screenshotPath = './test-screenshots/nwea-compare/nwea-final-recording.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);

  // Generate replayable script
  const scriptContent = generateReplayScript(recordedActions, page.url());
  fs.writeFileSync(RECORDING_FILE, scriptContent);
  console.log(`\n✅ Recording saved to: ${RECORDING_FILE}`);

  // Also save raw actions for debugging
  fs.writeFileSync('./scripts/nwea-recorded-actions.json', JSON.stringify(recordedActions, null, 2));
  console.log('📋 Raw actions saved to: scripts/nwea-recorded-actions.json');

  await browser.close();

  console.log('\n🎉 Done! You can now run:');
  console.log('   node scripts/nwea-recorded-actions.js');
  console.log('   to replay this navigation automatically.\n');
}

function generateReplayScript(actions, finalUrl) {
  const clicks = actions.filter(a => a.type === 'click');
  const selects = actions.filter(a => a.type === 'select');

  return `#!/usr/bin/env node
/**
 * Auto-generated NWEA Navigation Script
 * Recorded on: ${new Date().toISOString()}
 *
 * This script replays the recorded navigation to NWEA quadrant report.
 */

import { chromium } from 'playwright';
import fs from 'fs';

const AUTH_FILE = './nwea-auth.json';
const SCREENSHOT_DIR = './test-screenshots/nwea-compare';

async function main() {
  console.log('🚀 Replaying NWEA navigation...\\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  });

  const page = await context.newPage();

  // Navigate to NWEA
  await page.goto('https://teach.mapnwea.org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check if we need to log in
  if (page.url().includes('login') || page.url().includes('auth')) {
    console.log('⚠️ Login required. Please log in manually...');
    await page.waitForURL(/.*(?:home|report|dashboard).*/, { timeout: 120000 });
    console.log('✅ Login detected!\\n');
    await context.storageState({ path: AUTH_FILE });
  }

  // Replay recorded clicks
  const recordedClicks = ${JSON.stringify(clicks, null, 2)};

  for (const action of recordedClicks) {
    try {
      console.log(\`Clicking: \${action.selector} (\${action.text?.slice(0, 30)}...)\`);

      // Try selector first, fall back to coordinates
      try {
        await page.click(action.selector, { timeout: 5000 });
      } catch (e) {
        await page.mouse.click(action.x, action.y);
      }

      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle').catch(() => {});
    } catch (e) {
      console.log(\`  ⚠️ Click failed: \${e.message}\`);
    }
  }

  // Handle selects
  const recordedSelects = ${JSON.stringify(selects, null, 2)};

  for (const action of recordedSelects) {
    try {
      console.log(\`Selecting: \${action.value} in \${action.selector}\`);
      await page.selectOption(action.selector, action.value);
      await page.waitForTimeout(500);
    } catch (e) {
      console.log(\`  ⚠️ Select failed: \${e.message}\`);
    }
  }

  // Wait for report to load
  console.log('\\n⏳ Waiting for report to load...');
  await page.waitForTimeout(3000);

  // Take screenshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = \`\${SCREENSHOT_DIR}/nwea-replay-\${timestamp}.png\`;
  await page.screenshot({ path: screenshotPath });
  console.log(\`\\n📸 Screenshot saved: \${screenshotPath}\`);

  await browser.close();
  console.log('\\n✅ Replay complete!');
}

main().catch(console.error);
`;
}

main().catch(console.error);
