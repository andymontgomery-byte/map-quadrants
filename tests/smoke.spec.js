import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-screenshots');

test.describe('MAP Quadrant Report Smoke Test', () => {
  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test('Alpha Austin Winter 2025-2026 report generation', async ({ page }) => {
    // Step 1: Load the app
    await page.goto('/');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-initial-load.png'),
      fullPage: false
    });

    // Step 2: Wait for data to load (loading indicator disappears)
    await expect(page.locator('h1')).toContainText('MAP Quadrant Report');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-data-loaded.png'),
      fullPage: false
    });

    // Step 3: Select Term - Winter 2025-2026
    const termSelect = page.locator('#term-select');
    await expect(termSelect).toBeEnabled();
    await termSelect.selectOption('Winter 2025-2026');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-term-selected.png'),
      fullPage: false
    });

    // Step 4: Select District - Alpha
    const districtSelect = page.locator('#district-select');
    await districtSelect.selectOption('Alpha');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-district-selected.png'),
      fullPage: false
    });

    // Step 5: Select School - Alpha Austin
    const schoolSelect = page.locator('#school-select');
    await expect(schoolSelect).toBeEnabled();
    await schoolSelect.selectOption('Alpha Austin');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-school-selected.png'),
      fullPage: false
    });

    // Step 6: Click Generate Report
    const generateBtn = page.locator('.generate-btn');
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Step 7: Wait for report to render
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.quadrant-chart')).toBeVisible();
    await expect(page.locator('.data-table')).toBeVisible();

    // Wait a moment for chart to fully render
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-report-generated.png'),
      fullPage: false
    });

    // Step 8: Verify report header content
    const header = page.locator('.report-header');
    await expect(header).toContainText('Winter 2025-2026');
    await expect(header).toContainText('Alpha');
    await expect(header).toContainText('Alpha Austin');

    // Step 9: Verify quadrant chart has data points
    const dataPoints = page.locator('.student-point');
    const pointCount = await dataPoints.count();
    expect(pointCount).toBeGreaterThan(0);
    console.log(`Chart contains ${pointCount} student data points`);

    // Step 10: Verify data table has rows
    const tableRows = page.locator('.data-table tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`Table contains ${rowCount} rows`);

    // Step 11: Screenshot of just the chart
    const chartElement = page.locator('.quadrant-chart');
    await chartElement.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-chart-detail.png')
    });

    // Step 12: Scroll to table and screenshot
    await page.locator('.data-table-container').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-table-detail.png')
    });

    // Step 13: Test filter interaction - uncheck a subject
    const firstSubjectCheckbox = page.locator('.chart-filters .filter-section').nth(1).locator('input[type="checkbox"]').first();
    await firstSubjectCheckbox.uncheck();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09-filter-applied.png'),
      fullPage: false
    });

    // Step 14: Test "Show student names" toggle
    const showNamesCheckbox = page.locator('#show-names');
    await showNamesCheckbox.uncheck();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '10-names-hidden.png'),
      fullPage: false
    });

    // Step 15: Edit criteria button works
    const editBtn = page.locator('.edit-criteria-btn');
    await editBtn.click();
    await expect(page.locator('.filter-selection')).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '11-back-to-selection.png'),
      fullPage: false
    });

    console.log(`\n✅ Smoke test passed!`);
    console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`\nFor vision-based validation, review screenshots with:`);
    console.log(`  - Compare 06-report-generated.png against reference design`);
    console.log(`  - Verify quadrant colors, axes, and data point positioning`);
  });
});
