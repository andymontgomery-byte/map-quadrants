import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-screenshots');

// Expected table column structure (must match exactly)
// Note: <br> tags become empty string in textContent, so multi-line headers are concatenated
const EXPECTED_COLUMNS = {
  tier1: [
    { text: '', colspan: 4 },
    { text: 'Achievement Status', colspan: 4 },
    { text: 'Growth', colspan: 8 },
  ],
  tier2: [
    { text: '', colspan: 4 },
    { text: 'Winter 2025', colspan: 2 },
    { text: 'Winter 2026', colspan: 2 },
    { text: 'Student', colspan: 5 },
    { text: 'Comparative', colspan: 3 },
  ],
  tier3: [
    'Quadrant',
    'Student NameStudent ID',
    'WI 2026Grade',
    'WI 2026Date',
    'RIT ScoreRange',
    'AchievementPercentile Range',
    'RIT ScoreRange',
    'AchievementPercentile Range',
    'ProjectedRIT Score',
    'ProjectedGrowth',
    'ObservedGrowth',
    'ObservedGrowth SE',
    'GrowthIndex',
    'MetProjectedGrowth',
    'ConditionalGrowthIndex',
    'ConditionalGrowthPercentile',
  ],
};

test.describe('MAP Quadrant Report Smoke Test', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test('Alpha Austin Winter 2025-2026 report generation', async ({ page }) => {
    // Step 1: Load the app
    await page.goto('/');

    // Step 2: Wait for data to load
    await expect(page.locator('h1')).toContainText('MAP Quadrant Report');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    // Step 3: Select filters
    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');

    // Step 4: Generate report
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.data-table')).toBeVisible();
    await page.waitForTimeout(500);

    // Step 5: Verify report header
    const header = page.locator('.report-header');
    await expect(header).toContainText('Winter 2025-2026');
    await expect(header).toContainText('Alpha Austin');

    // Step 6: Verify chart has data
    const pointCount = await page.locator('.student-point').count();
    expect(pointCount).toBeGreaterThan(0);
    console.log(`Chart contains ${pointCount} student data points`);

    // Step 7: Verify table has data
    const rowCount = await page.locator('.data-table tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`Table contains ${rowCount} rows`);

    // Step 8: VERIFY TABLE COLUMN STRUCTURE
    console.log('\nVerifying table column structure...');

    // Check tier 1 headers
    const tier1Headers = page.locator('.data-table .header-tier-1 th');
    const tier1Count = await tier1Headers.count();
    console.log(`Tier 1 headers: ${tier1Count}`);

    for (let i = 0; i < tier1Count; i++) {
      const th = tier1Headers.nth(i);
      const text = (await th.textContent()).trim();
      const colspan = await th.getAttribute('colspan') || '1';
      console.log(`  [${i}] "${text}" (colspan=${colspan})`);
    }

    // Check tier 2 headers
    const tier2Headers = page.locator('.data-table .header-tier-2 th');
    const tier2Count = await tier2Headers.count();
    console.log(`Tier 2 headers: ${tier2Count}`);

    for (let i = 0; i < tier2Count; i++) {
      const th = tier2Headers.nth(i);
      const text = (await th.textContent()).trim();
      const colspan = await th.getAttribute('colspan') || '1';
      console.log(`  [${i}] "${text}" (colspan=${colspan})`);
    }

    // Check tier 3 headers (column names)
    const tier3Headers = page.locator('.data-table .header-tier-3 th');
    const tier3Count = await tier3Headers.count();
    console.log(`Tier 3 headers: ${tier3Count}`);

    const actualColumns = [];
    for (let i = 0; i < tier3Count; i++) {
      const th = tier3Headers.nth(i);
      // Get text, remove sort icons, normalize whitespace
      let text = (await th.textContent()).trim();
      text = text.replace(/[▲▼]/g, '').trim().replace(/\s+/g, ' ');
      actualColumns.push(text);
      console.log(`  [${i}] "${text}"`);
    }

    // Verify column count matches expected
    expect(tier3Count).toBe(EXPECTED_COLUMNS.tier3.length);

    // Verify each column name (normalize expected too)
    for (let i = 0; i < EXPECTED_COLUMNS.tier3.length; i++) {
      const expected = EXPECTED_COLUMNS.tier3[i].replace(/\n/g, ' ').trim();
      const actual = actualColumns[i];
      expect(actual, `Column ${i} mismatch: expected "${expected}", got "${actual}"`).toBe(expected);
    }

    // Step 9: Verify first actual data row structure (skip group headers)
    const dataRows = page.locator('.data-table tbody tr:not(.subject-group-header)');
    const firstDataRow = dataRows.first();
    const cells = firstDataRow.locator('td');
    const cellCount = await cells.count();

    console.log(`\nFirst data row has ${cellCount} cells`);
    expect(cellCount).toBe(EXPECTED_COLUMNS.tier3.length);

    // Step 10: Screenshots
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-report.png') });

    await page.locator('.data-table-container').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-table.png') });

    console.log(`\n✅ Smoke test passed!`);
    console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  });
});
