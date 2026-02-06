#!/usr/bin/env node
/**
 * Simple Screenshot Comparison Tool
 *
 * Compares two screenshots using Claude Vision to find differences.
 *
 * Usage:
 *   node scripts/compare-screenshots.js <nwea-screenshot> <our-screenshot>
 *   node scripts/compare-screenshots.js ./nwea.png ./ours.png
 *
 * Or compare a directory of paired screenshots:
 *   node scripts/compare-screenshots.js --dir ./test-screenshots/nwea-compare
 *   (expects nwea-*.png and our-app-*.png pairs)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

async function compareImages(anthropic, nweaPath, ourPath) {
  console.log(`\n🔍 Comparing:`);
  console.log(`   NWEA: ${nweaPath}`);
  console.log(`   Ours: ${ourPath}\n`);

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
          text: `I'm comparing two educational assessment reports. Image 1 is the official NWEA MAP Growth report. Image 2 is our clone implementation.

Please analyze both images carefully and identify ALL differences:

## 1. Data Accuracy
- Any numbers, percentiles, RIT scores, or values that don't match
- Calculated fields that are incorrect (Growth Index, ranges, etc.)
- Missing or extra data rows

## 2. Table Structure
- Column headers that don't match
- Column order differences
- Missing or extra columns
- Row grouping differences

## 3. Chart Comparison (if visible)
- Quadrant colors
- Axis labels and ranges
- Data point positions
- Legend differences

## 4. Visual Styling
- Font differences
- Color mismatches
- Spacing/alignment issues
- Border/line differences

## 5. Missing Features
- Elements in NWEA that we're missing
- Interactive features we lack

For each issue, be SPECIFIC:
- Exact location (row name, column header)
- What NWEA shows vs what we show
- Severity (critical/major/minor)

Format as a prioritized list of fixes needed.`,
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

  return response.content[0].text;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/compare-screenshots.js <nwea-screenshot> <our-screenshot>
  node scripts/compare-screenshots.js --dir <directory>

Examples:
  node scripts/compare-screenshots.js ./nwea-report.png ./our-report.png
  node scripts/compare-screenshots.js --dir ./test-screenshots/nwea-compare
`);
    process.exit(1);
  }

  const anthropic = new Anthropic();

  if (args[0] === '--dir') {
    // Compare all paired screenshots in directory
    const dir = args[1] || './test-screenshots/nwea-compare';
    const files = fs.readdirSync(dir);

    const nweaFiles = files.filter(f => f.startsWith('nwea-') && f.endsWith('.png'));

    for (const nweaFile of nweaFiles) {
      const baseName = nweaFile.replace('nwea-', '').replace('.png', '');
      const ourFile = `our-app-${baseName}.png`;

      if (files.includes(ourFile)) {
        const analysis = await compareImages(
          anthropic,
          path.join(dir, nweaFile),
          path.join(dir, ourFile)
        );

        console.log('─'.repeat(80));
        console.log(analysis);
        console.log('─'.repeat(80));

        // Save analysis
        const analysisPath = path.join(dir, `analysis-${baseName}.md`);
        fs.writeFileSync(analysisPath, `# Comparison: ${baseName}\n\n${analysis}`);
        console.log(`\n📝 Saved: ${analysisPath}\n`);
      }
    }
  } else {
    // Compare two specific files
    const [nweaPath, ourPath] = args;

    if (!fs.existsSync(nweaPath)) {
      console.error(`Error: NWEA screenshot not found: ${nweaPath}`);
      process.exit(1);
    }
    if (!fs.existsSync(ourPath)) {
      console.error(`Error: Our screenshot not found: ${ourPath}`);
      process.exit(1);
    }

    const analysis = await compareImages(anthropic, nweaPath, ourPath);

    console.log('─'.repeat(80));
    console.log(analysis);
    console.log('─'.repeat(80));

    // Save analysis
    const analysisPath = './comparison-analysis.md';
    fs.writeFileSync(analysisPath, `# Screenshot Comparison\n\n${analysis}`);
    console.log(`\n📝 Saved: ${analysisPath}`);
  }
}

main().catch(console.error);
