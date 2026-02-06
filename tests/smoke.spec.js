import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-screenshots');

// Expected growth period options by term type
const EXPECTED_GROWTH_PERIODS = {
  Winter: ['Fall to Winter', 'Winter to Winter'],
  Spring: ['Fall to Spring', 'Winter to Spring', 'Spring to Spring'],
  Fall: ['Fall to Fall'],
};

// Expected table headers based on term + growth period
const EXPECTED_HEADERS = {
  'Winter 2025-2026': {
    falltowinter: { start: 'Fall 2025', end: 'Winter 2026', endCode: 'WI 2026' },
    wintertowinter: { start: 'Winter 2025', end: 'Winter 2026', endCode: 'WI 2026' },
  },
  'Spring 2024-2025': {
    falltospring: { start: 'Fall 2024', end: 'Spring 2025', endCode: 'SP 2025' },
    wintertospring: { start: 'Winter 2025', end: 'Spring 2025', endCode: 'SP 2025' },
    springtospring: { start: 'Spring 2024', end: 'Spring 2025', endCode: 'SP 2025' },
  },
};

// Expected table column structure (must match exactly)
// Note: <br> tags become empty string in textContent, so multi-line headers are concatenated
// Columns with {endCode} placeholder will be replaced dynamically based on growth period
const EXPECTED_COLUMNS = {
  tier1: [
    { text: '', colspan: 4 },
    { text: 'Achievement Status', colspan: 4 },
    { text: 'Growth', colspan: 8 },
  ],
  // tier2 is validated dynamically based on growth period selection
  tier2: null, // Will be checked dynamically
  tier3: [
    'Quadrant',
    'Student NameStudent ID',
    '{endCode}Grade',      // Dynamic: "WI 2026Grade" for Winter 2025-2026 falltowinter
    '{endCode}Date',       // Dynamic: "WI 2026Date" for Winter 2025-2026 falltowinter
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

    // Step 3b: Verify growth period options are correct for Winter term
    const growthPeriodSelect = page.locator('#growth-period-select');
    await expect(growthPeriodSelect).toBeEnabled();

    // Get available growth period options (excluding placeholder)
    const allOptions = await growthPeriodSelect.locator('option').allTextContents();
    const growthOptions = allOptions.filter(opt => opt !== 'Select a growth period...');
    console.log('Available growth periods:', growthOptions);

    // Determine term type from selected term
    const termType = 'Winter'; // Winter 2025-2026
    const expectedOptions = EXPECTED_GROWTH_PERIODS[termType];

    // Verify at least one expected option is available
    const hasValidOption = growthOptions.some(opt => expectedOptions.includes(opt));
    expect(hasValidOption, `${termType} term should have one of: ${expectedOptions.join(', ')}`).toBe(true);

    // Verify no invalid options are present
    for (const opt of growthOptions) {
      const isValid = expectedOptions.includes(opt);
      expect(isValid, `Unexpected growth period "${opt}" for ${termType} term`).toBe(true);
    }

    // Select Fall to Winter
    await growthPeriodSelect.selectOption('falltowinter');

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

    const tier2Texts = [];
    for (let i = 0; i < tier2Count; i++) {
      const th = tier2Headers.nth(i);
      const text = (await th.textContent()).trim();
      const colspan = await th.getAttribute('colspan') || '1';
      tier2Texts.push(text);
      console.log(`  [${i}] "${text}" (colspan=${colspan})`);
    }

    // Validate tier 2 headers match expected for this term + growth period
    const expectedHeaders = EXPECTED_HEADERS['Winter 2025-2026']?.falltowinter;
    if (expectedHeaders) {
      // Tier 2 should have: [empty], [startLabel], [endLabel], "Student", "Comparative"
      expect(tier2Texts[1], `Tier 2 start term should be "${expectedHeaders.start}"`).toBe(expectedHeaders.start);
      expect(tier2Texts[2], `Tier 2 end term should be "${expectedHeaders.end}"`).toBe(expectedHeaders.end);
      console.log(`✓ Tier 2 headers validated: ${expectedHeaders.start} → ${expectedHeaders.end}`);
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

    // Build expected columns with dynamic endCode
    const endCode = expectedHeaders?.endCode || 'WI 2026';
    const expectedTier3 = EXPECTED_COLUMNS.tier3.map(col =>
      col.replace('{endCode}', endCode)
    );

    // Verify each column name (normalize expected too)
    for (let i = 0; i < expectedTier3.length; i++) {
      const expected = expectedTier3[i].replace(/\n/g, ' ').trim();
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

  test('All Districts with specific school filters correctly', async ({ page }) => {
    // This test verifies that selecting "All Districts" with a specific school
    // only loads data for that school, not all schools

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    // Select Winter 2025-2026
    await page.locator('#term-select').selectOption('Winter 2025-2026');

    // Select "All Districts"
    await page.locator('#district-select').selectOption('__all__');

    // Select specific school "Alpha Austin"
    await page.locator('#school-select').selectOption('Alpha Austin');

    // Select growth period
    await page.locator('#growth-period-select').selectOption('falltowinter');

    // Select Grade 4
    await page.locator('#grade-select').selectOption('4');

    // Generate report
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Verify the report header shows correct selections
    const header = page.locator('.report-header');
    await expect(header).toContainText('All Districts');
    await expect(header).toContainText('Alpha Austin');

    // KEY ASSERTION: Alpha Austin Grade 4 should have exactly 73 students
    // NOT 504 (which would indicate data from all schools is being loaded)
    const totalStudentsText = await header.locator('.criteria-item:has-text("Total Students")').textContent();
    const studentCount = parseInt(totalStudentsText.match(/\d+/)?.[0] || '0');

    console.log(`\nAll Districts + Alpha Austin + Grade 4: ${studentCount} students (expected: 73)`);
    expect(studentCount, `Should only include Alpha Austin Grade 4 students (73), got ${studentCount}`).toBe(73);
  });

  test('Unchecking all subjects hides all students from chart', async ({ page }) => {
    // This test verifies that unchecking all subject filters removes all points from the chart

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    // Generate a report
    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('falltowinter');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Verify chart has points initially
    const initialPointCount = await page.locator('.student-point').count();
    console.log(`\nInitial chart points: ${initialPointCount}`);
    expect(initialPointCount).toBeGreaterThan(0);

    // Click "Deselect All" button in Subject section to uncheck all subjects
    const subjectSection = page.locator('.filter-section:has-text("Subject")');
    const deselectBtn = subjectSection.locator('button:has-text("Deselect All")');
    await deselectBtn.click();
    console.log('Clicked "Deselect All" for subjects');

    // Wait for UI to update
    await page.waitForTimeout(300);

    // KEY ASSERTION: Chart should have ZERO points when all subjects are unchecked
    const finalPointCount = await page.locator('.student-point').count();
    console.log(`Chart points after unchecking all subjects: ${finalPointCount} (expected: 0)`);
    expect(finalPointCount, `Chart should show 0 points when all subjects unchecked, got ${finalPointCount}`).toBe(0);
  });

  test('Student without growth data shows empty growth columns, not zeros', async ({ page }) => {
    // Ackerson, Anya (001-2379) has no Winter-to-Winter growth data
    // Growth columns should be empty, NOT show "0" or calculated values
    // Start term (W25) columns should show "***" or be empty since no W25 test exists

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    // Generate report: Alpha Austin, Winter 2025-2026, Winter to Winter, Grade 5
    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('5');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Ackerson, Anya in the table
    const row = page.locator('.data-table tbody tr:has-text("001-2379")').first();
    await expect(row).toBeVisible();
    const cells = row.locator('td');

    // Column indices (0-indexed):
    // 4: Start term RIT Range (W25)
    // 5: Start term Percentile Range (W25)
    // 8: Projected RIT Score
    // 9: Projected Growth
    // 10: Observed Growth

    // BUG 1: Start term columns (W25) should be empty/*** when no prior test exists
    const startRitCell = cells.nth(4);
    const startRitText = await startRitCell.textContent();
    console.log(`\nAckerson, Anya - Start term RIT: "${startRitText}" (expected: "—" or "***")`);
    // Should NOT show calculated values like "236-243-250"
    expect(
      startRitText.trim() === '—' || startRitText.trim() === '***' || startRitText.trim() === '',
      `Start term RIT should be empty when no prior test, got "${startRitText}"`
    ).toBe(true);

    // BUG 2: Growth columns should be empty when no growth data exists
    const projectedRitCell = cells.nth(8);
    const projectedRitText = await projectedRitCell.textContent();
    console.log(`Ackerson, Anya - Projected RIT: "${projectedRitText}" (expected: "—" or empty)`);
    expect(
      projectedRitText.trim() === '—' || projectedRitText.trim() === '',
      `Projected RIT should be empty when no growth data, got "${projectedRitText}"`
    ).toBe(true);

    const projectedGrowthCell = cells.nth(9);
    const projectedGrowthText = await projectedGrowthCell.textContent();
    console.log(`Ackerson, Anya - Projected Growth: "${projectedGrowthText}" (expected: "—" or empty, NOT "0")`);
    expect(
      projectedGrowthText.trim() === '—' || projectedGrowthText.trim() === '',
      `Projected Growth should be empty when no growth data, got "${projectedGrowthText}"`
    ).toBe(true);

    const observedGrowthCell = cells.nth(10);
    const observedGrowthText = await observedGrowthCell.textContent();
    console.log(`Ackerson, Anya - Observed Growth: "${observedGrowthText}" (expected: "—" or empty, NOT "0")`);
    expect(
      observedGrowthText.trim() === '—' || observedGrowthText.trim() === '',
      `Observed Growth should be empty when no growth data, got "${observedGrowthText}"`
    ).toBe(true);
  });

  test('RIT Score Range uses ±1*SE, not ±2*SE', async ({ page }) => {
    // Ackerson, Anya (001-2379): RIT=243, SE=3.26
    // NWEA shows: 240-243-246 (±3, which is ±1*SE)
    // NOT: 236-243-250 (which would be ±2*SE)

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('5');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Ackerson, Anya row
    const row = page.locator('.data-table tbody tr:has-text("001-2379")').first();
    const cells = row.locator('td');

    // Column 6: End term (W26) RIT Range
    const endRitCell = cells.nth(6);
    const endRitText = await endRitCell.textContent();
    console.log(`\nAckerson, Anya - End term RIT Range: "${endRitText}"`);

    // RIT=243, SE=3.26 → range should be 240-243-246 (±1*SE ≈ ±3)
    // NOT 236-243-250 (±2*SE ≈ ±7)
    expect(endRitText).toContain('240');
    expect(endRitText).toContain('243');
    expect(endRitText).toContain('246');
    expect(endRitText, 'RIT range should use ±1*SE (240-243-246), not ±2*SE').not.toContain('236');
  });

  test('Achievement Percentile shows correct value', async ({ page }) => {
    // Ackerson, Anya: Percentile=96
    // We show just the bold percentile (no range, since we don't have NWEA norm tables)

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('5');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Ackerson, Anya row
    const row = page.locator('.data-table tbody tr:has-text("001-2379")').first();
    const cells = row.locator('td');

    // Column 7: End term Percentile
    const pctCell = cells.nth(7);
    const pctText = await pctCell.textContent();
    console.log(`\nAckerson, Anya - Achievement Percentile: "${pctText}"`);

    // Should show just the percentile value (96)
    expect(pctText.trim()).toBe('96');
  });

  test('Ajouz Duke - Start term percentile range shows actual values', async ({ page }) => {
    // Tests cross-term data loading: Winter 2024-2025 percentile for Winter-to-Winter growth

    // Ajouz, Duke (001-0408) W2W: Start term (W25) percentile should show range, not "—"
    // NWEA shows: 94-96-97

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('5');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Ajouz, Duke row
    const row = page.locator('.data-table tbody tr:has-text("001-0408")').first();
    const cells = row.locator('td');

    // Column 5: Start term Percentile Range (W25)
    const startPctCell = cells.nth(5);
    const startPctText = await startPctCell.textContent();
    console.log(`\nAjouz, Duke - Start term Percentile Range: "${startPctText}" (expected: 94-96-97 or similar)`);

    // Should NOT be "—" - should show actual percentile range
    expect(startPctText.trim(), 'Start term percentile should show range, not "—"').not.toBe('—');
    // Prior term percentile is 97 from Winter 2024-2025 data, so range is 95-97-99
    expect(startPctText).toContain('97');
    console.log(`\nAjouz, Duke - Start term Percentile Range: "${startPctText}" (verified: contains 97)`);
  });

  test('Ajouz Duke - Growth Index shows observed minus projected, not CGI', async ({ page }) => {
    // Growth Index = Observed Growth - Projected Growth = 6 - 7 = -1
    // NOT the Conditional Growth Index (-0.17)

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('5');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Ajouz, Duke row
    const row = page.locator('.data-table tbody tr:has-text("001-0408")').first();
    const cells = row.locator('td');

    // Column 12: Growth Index (under Student section)
    // Should be: Observed Growth - Projected Growth = 6 - 7 = -1
    const growthIndexCell = cells.nth(12);
    const growthIndexText = await growthIndexCell.textContent();
    console.log(`\nAjouz, Duke - Growth Index: "${growthIndexText}" (expected: -1)`);

    // Should show -1, NOT -0.17 (which is the Conditional Growth Index)
    expect(growthIndexText.trim(), 'Growth Index should be observed-projected (-1), not CGI (-0.17)').toBe('-1');
  });

  test('End term percentile shows correct value', async ({ page }) => {
    // Ajouz, Duke: Percentile 94
    // We show just the bold percentile (no range)

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('5');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Ajouz, Duke row
    const row = page.locator('.data-table tbody tr:has-text("001-0408")').first();
    const cells = row.locator('td');

    // Column 7: End term Percentile
    const endPctCell = cells.nth(7);
    const endPctText = await endPctCell.textContent();
    console.log(`\nAjouz, Duke - End term Percentile: "${endPctText}" (expected: 94)`);

    // Should show just the percentile value (94)
    expect(endPctText.trim()).toBe('94');
  });

  test('Deduplication uses lowest SE, then most recent date', async ({ page }) => {
    // Per NWEA docs: use lowest standard error, then most recent date, then highest RIT
    // Signor, Wyatt (001-0571) has Math tests:
    //   - 2026-01-28: RIT 211, SE 3.26, W2W_obs=3
    //   - 2026-02-03: RIT 206, SE 3.26, W2W_obs=-2
    // Same SE, so tiebreaker is most recent date → Feb 3 (RIT 206, W2W=-2)

    await page.goto('/');
    await expect(page.locator('.loading')).toBeHidden({ timeout: 30000 });

    // Generate report for Alpha Austin, Winter 2025-2026, Winter to Winter
    await page.locator('#term-select').selectOption('Winter 2025-2026');
    await page.locator('#district-select').selectOption('Alpha');
    await page.locator('#school-select').selectOption('Alpha Austin');
    await page.locator('#growth-period-select').selectOption('wintertowinter');
    await page.locator('#grade-select').selectOption('4');
    await page.locator('.generate-btn').click();
    await expect(page.locator('.report-header')).toBeVisible({ timeout: 10000 });

    // Find Math K-12 section
    const mathSection = page.locator('.subject-group-header:has-text("Math K-12")');
    await expect(mathSection).toBeVisible();

    // Find the Math row for student 001-0571
    const allRows = page.locator('.data-table tbody tr');
    const rowCount = await allRows.count();

    let mathRowIndex = -1;
    let foundMathHeader = false;
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const text = await row.textContent();
      if (text.includes('Math K-12')) {
        foundMathHeader = true;
      } else if (foundMathHeader && text.includes('001-0571') && text.includes('Signor')) {
        mathRowIndex = i;
        break;
      } else if (foundMathHeader && text.includes('students')) {
        break;
      }
    }

    expect(mathRowIndex, 'Should find Signor, Wyatt in Math K-12 section').toBeGreaterThan(-1);
    const studentRow = allRows.nth(mathRowIndex);

    // Get the observed growth value - should be -2 (from lowest SE + most recent: Feb 3, RIT 206)
    const cells = studentRow.locator('td');
    const observedGrowthCell = cells.nth(10);
    const observedGrowth = await observedGrowthCell.textContent();

    console.log(`\nSignor, Wyatt (001-0571) Math - Observed Growth: ${observedGrowth} (expected: -2)`);

    // Same SE, tiebreaker is most recent date: Feb 3 (RIT 206) has W2W observed growth = -2
    expect(observedGrowth.trim(), 'Should use lowest SE then most recent date (Feb 3, RIT 206, growth -2)').toBe('-2');
  });
});
