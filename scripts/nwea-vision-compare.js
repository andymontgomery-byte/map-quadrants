#!/usr/bin/env node
/**
 * NWEA Vision Comparison Tool
 *
 * Uses Claude computer use to:
 * 1. Navigate to NWEA and take screenshots of their quadrant report
 * 2. Take screenshots of our app with the same criteria
 * 3. Compare them using Claude Vision
 *
 * Usage:
 *   ANTHROPIC_API_KEY=xxx node scripts/nwea-vision-compare.js
 *
 * Requirements:
 *   - npm install @anthropic-ai/sdk playwright
 *   - You'll need to log into NWEA manually in the browser that opens
 */

import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = './test-screenshots/nwea-compare';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

class ComputerUseAgent {
  constructor(page, anthropic) {
    this.page = page;
    this.anthropic = anthropic;
    this.screenshotCount = 0;
  }

  async takeScreenshot() {
    const filename = `screenshot-${++this.screenshotCount}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await this.page.screenshot({ path: filepath, fullPage: false });
    return fs.readFileSync(filepath);
  }

  async executeAction(action) {
    console.log(`  Executing: ${action.type}`, action);

    switch (action.type) {
      case 'click':
        await this.page.mouse.click(action.x, action.y);
        break;
      case 'type':
        await this.page.keyboard.type(action.text);
        break;
      case 'key':
        // Map common key names to Playwright format
        let key = action.key;
        key = key.replace('Ctrl+', 'Control+');
        key = key.replace('Cmd+', 'Meta+');
        await this.page.keyboard.press(key);
        break;
      case 'scroll':
        await this.page.mouse.wheel(0, action.delta_y || 300);
        break;
      case 'wait':
        await this.page.waitForTimeout(action.ms || 2000);
        break;
      case 'screenshot':
        // Just take a screenshot, no action needed
        break;
      default:
        console.log(`  Unknown action type: ${action.type}`);
    }

    // Wait for page to settle after action
    await this.page.waitForTimeout(500);
  }

  async runTask(goal, maxSteps = 30) {
    console.log(`\n🎯 Goal: ${goal}\n`);

    const messages = [];

    for (let step = 0; step < maxSteps; step++) {
      console.log(`\n--- Step ${step + 1} ---`);

      // Take screenshot
      const screenshot = await this.takeScreenshot();
      const screenshotBase64 = screenshot.toString('base64');

      // Build message
      const userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: screenshotBase64,
          },
        },
        {
          type: 'text',
          text: step === 0
            ? `Goal: ${goal}\n\nHere's the current screen. What action should I take? Respond with a JSON object with "thinking" (your reasoning), "action" (the action to take), and "done" (true if goal is complete).\n\nAction types:\n- {"type": "click", "x": 100, "y": 200} - click at coordinates\n- {"type": "type", "text": "hello"} - type text\n- {"type": "key", "key": "Enter"} - press a key\n- {"type": "scroll", "delta_y": 300} - scroll down (positive) or up (negative)\n- {"type": "wait", "ms": 2000} - wait for page to load\n- {"type": "screenshot"} - just observe, no action\n\nRespond ONLY with valid JSON.`
            : `Here's the current screen after the last action. What's next? Respond with JSON only.`,
        },
      ];

      messages.push({ role: 'user', content: userContent });

      // Call Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: messages,
      });

      const assistantMessage = response.content[0].text;
      messages.push({ role: 'assistant', content: assistantMessage });

      // Parse response
      let parsed;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log('  Failed to parse response:', assistantMessage);
        continue;
      }

      console.log(`  Thinking: ${parsed.thinking}`);

      if (parsed.done) {
        console.log('\n✅ Goal completed!');
        return true;
      }

      if (parsed.action) {
        await this.executeAction(parsed.action);
      }
    }

    console.log('\n⚠️ Max steps reached');
    return false;
  }
}

async function captureNWEAReport(agent, criteria) {
  const { term, district, school, grade, growthPeriod } = criteria;

  // Navigate to NWEA quadrant report with the given criteria
  const goal = `
    Navigate to the MAP Growth quadrant report on NWEA (teach.mapnwea.org).
    Select these criteria:
    - Term: ${term}
    - District: ${district}
    - School: ${school}
    - Grade: ${grade}
    - Growth Period: ${growthPeriod}

    Once the report loads with the quadrant chart and data table visible,
    let me know you're done so I can capture the final screenshot.

    If you see a login page, STOP and set done=true with a note that login is required.
  `;

  await agent.runTask(goal);

  // Take final screenshot (viewport only, not fullPage to avoid size issues)
  const finalScreenshot = path.join(SCREENSHOTS_DIR, `nwea-${school.toLowerCase().replace(/\s+/g, '-')}-${grade}.png`);
  await agent.page.screenshot({ path: finalScreenshot, fullPage: false });
  console.log(`\n📸 Saved NWEA screenshot: ${finalScreenshot}`);

  return finalScreenshot;
}

async function captureOurReport(page, criteria) {
  const { term, district, school, grade, growthPeriod } = criteria;

  await page.goto('https://andymontgomery-byte.github.io/map-quadrants/');
  await page.waitForLoadState('networkidle');

  // Select criteria
  await page.selectOption('#term-select', term);
  await page.waitForTimeout(500);
  await page.selectOption('#district-select', district);
  await page.waitForTimeout(500);
  await page.selectOption('#school-select', school);
  await page.waitForTimeout(500);

  // Map growth period to select value
  const growthPeriodMap = {
    'Fall to Winter': 'falltowinter',
    'Winter to Winter': 'wintertowinter',
    'Fall to Spring': 'falltospring',
  };
  await page.selectOption('#growth-period-select', growthPeriodMap[growthPeriod] || 'falltowinter');
  await page.waitForTimeout(500);

  if (grade) {
    await page.selectOption('#grade-select', grade);
    await page.waitForTimeout(500);
  }

  // Generate report
  await page.click('.generate-btn');
  await page.waitForSelector('.report-header', { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Take screenshot (viewport only to avoid size issues with Claude API)
  const screenshotPath = path.join(SCREENSHOTS_DIR, `our-app-${school.toLowerCase().replace(/\s+/g, '-')}-${grade}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`\n📸 Saved our app screenshot: ${screenshotPath}`);

  return screenshotPath;
}

async function compareReports(anthropic, nweaPath, ourPath) {
  console.log('\n🔍 Comparing reports with Claude Vision...\n');

  const nweaImage = fs.readFileSync(nweaPath);
  const ourImage = fs.readFileSync(ourPath);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'I\'m comparing two educational assessment reports. Image 1 is the official NWEA MAP Growth report. Image 2 is our clone implementation. Please analyze both and identify ALL differences:\n\n1. **Data Differences**: Any numbers, percentiles, or values that don\'t match\n2. **Layout Differences**: Column order, spacing, alignment issues\n3. **Visual Differences**: Colors, fonts, styling that don\'t match\n4. **Missing Elements**: Anything in NWEA that\'s missing from ours\n5. **Extra Elements**: Anything we have that NWEA doesn\'t\n\nBe specific - mention exact row/column locations and values. Format as a clear list of issues to fix.',
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: nweaImage.toString('base64'),
          },
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: ourImage.toString('base64'),
          },
        },
      ],
    }],
  });

  const analysis = response.content[0].text;

  // Save analysis to file
  const analysisPath = path.join(SCREENSHOTS_DIR, 'comparison-analysis.md');
  fs.writeFileSync(analysisPath, `# NWEA vs Our App Comparison\n\n${analysis}`);
  console.log(analysis);
  console.log(`\n📝 Analysis saved to: ${analysisPath}`);

  return analysis;
}

async function main() {
  const anthropic = new Anthropic();

  // Test criteria - adjust as needed
  const criteria = {
    term: 'Winter 2025-2026',
    district: 'Alpha',
    school: 'Alpha Austin',
    grade: '5',
    growthPeriod: 'Winter to Winter',
  };

  console.log('🚀 Starting NWEA Vision Comparison\n');
  console.log('Criteria:', criteria);

  const browser = await chromium.launch({
    headless: false,  // Need to see browser for login
    slowMo: 100,
    args: ['--start-maximized'],  // Make browser visible
  });

  try {
    // Create two browser contexts
    const nweaContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const ourContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const nweaPage = await nweaContext.newPage();
    const ourPage = await ourContext.newPage();

    // Navigate to NWEA (will need manual login)
    console.log('\n📍 Opening NWEA - please log in manually if needed...');
    await nweaPage.goto('https://teach.mapnwea.org', { waitUntil: 'domcontentloaded' });
    await nweaPage.waitForTimeout(2000); // Let page render

    // Take a screenshot so user can see it's working
    console.log('📸 NWEA login page loaded. Screenshot saved.\n');
    await nweaPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'nwea-login.png') });

    // Create computer use agent for NWEA navigation
    const agent = new ComputerUseAgent(nweaPage, anthropic);

    // Wait for user to log in - check for successful login
    console.log('⏳ Please log in to NWEA in the browser window that opened...');
    console.log('   The browser should be visible on your screen.');
    console.log('   Waiting up to 3 minutes for login...\n');

    // Wait until we're past the login page (URL changes or specific element appears)
    try {
      await nweaPage.waitForURL(/.*(?:home|report|dashboard|class|adminPage).*/, { timeout: 180000 });
      console.log('✅ Login detected! Proceeding with navigation...\n');
    } catch (e) {
      // Check if we're still on login page
      const currentUrl = nweaPage.url();
      console.log(`⚠️ Login timeout. Current URL: ${currentUrl}`);
      if (currentUrl.includes('login') || currentUrl.includes('auth')) {
        console.log('   Still on login page. Please log in faster next time.\n');
      }
    }

    await nweaPage.waitForTimeout(3000); // Let page settle

    // Capture NWEA report using computer use
    const nweaScreenshot = await captureNWEAReport(agent, criteria);

    // Capture our report
    const ourScreenshot = await captureOurReport(ourPage, criteria);

    // Compare using Claude Vision
    await compareReports(anthropic, nweaScreenshot, ourScreenshot);

  } finally {
    await browser.close();
  }
}

// Run if called directly
main().catch(console.error);
