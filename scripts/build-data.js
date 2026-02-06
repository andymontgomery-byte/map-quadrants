#!/usr/bin/env node
/**
 * Build script to pre-process CSV data into:
 * 1. metadata.json - Cascading dropdown options
 * 2. data/{term}/{district}/{school}.json - Filtered data slices
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_CSV = process.argv[2] || 'public/data.csv';
const OUTPUT_DIR = 'public/data';

// Ensure output directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Sanitize string for use as filename
function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
}

// Deduplicate rows per term
// Per NWEA documentation: https://teach.mapnwea.org/impl/maphelp/Content/Data/DataMissingWrong_Invalid.htm
// 1. If growthmeasureyn='true' exists, use those rows
// 2. Otherwise, use lowest teststandarderror (most reliable measurement)
// 3. If SEs are equal, use most recent date or highest RIT
function deduplicateTermData(rows) {
  const hasGrowthMeasure = rows.some(r => r.growthmeasureyn === 'true');

  if (hasGrowthMeasure) {
    return rows.filter(r => r.growthmeasureyn === 'true');
  }

  // Fallback: lowest standard error (SE), then most recent date, then highest RIT
  const groups = {};
  for (const row of rows) {
    const key = `${row.studentid}|${row.subject}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return Object.values(groups).map(group => {
    return group.reduce((best, curr) => {
      const currSE = parseFloat(curr.teststandarderror) || 999;
      const bestSE = parseFloat(best.teststandarderror) || 999;

      // Primary: lowest SE
      if (currSE < bestSE) return curr;
      if (currSE > bestSE) return best;

      // Secondary: most recent date (YYYY-MM-DD sorts correctly as string)
      const currDate = curr.teststartdate || '';
      const bestDate = best.teststartdate || '';
      if (currDate > bestDate) return curr;
      if (currDate < bestDate) return best;

      // Tertiary: highest RIT
      const currScore = parseFloat(curr.testritscore) || 0;
      const bestScore = parseFloat(best.testritscore) || 0;
      return currScore > bestScore ? curr : best;
    });
  });
}

async function main() {
  console.log(`Reading CSV from: ${INPUT_CSV}`);

  const csvContent = fs.readFileSync(INPUT_CSV, 'utf-8');
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Parsed ${rows.length} rows`);

  // Build hierarchical metadata structure
  // metadata.terms[term].districts[district].schools[school] = { grades, subjects, count }
  const metadata = {
    terms: {}
  };

  // Group rows by term → district → school
  const hierarchy = {};

  for (const row of rows) {
    const term = row.termname;
    const district = row.districtname;
    const school = row.schoolname;

    if (!term || !district || !school) continue;

    if (!hierarchy[term]) hierarchy[term] = {};
    if (!hierarchy[term][district]) hierarchy[term][district] = {};
    if (!hierarchy[term][district][school]) hierarchy[term][district][school] = [];

    hierarchy[term][district][school].push(row);
  }

  // Process each term/district/school combination
  let totalFiles = 0;
  let totalRows = 0;

  for (const [term, districts] of Object.entries(hierarchy)) {
    metadata.terms[term] = { districts: {} };

    for (const [district, schools] of Object.entries(districts)) {
      metadata.terms[term].districts[district] = { schools: {} };

      for (const [school, schoolRows] of Object.entries(schools)) {
        // Deduplicate rows for this school
        const dedupedRows = deduplicateTermData(schoolRows);

        // Extract available filter values
        const grades = [...new Set(dedupedRows.map(r => r.grade).filter(Boolean))].sort();
        const subjects = [...new Set(dedupedRows.map(r => r.subject).filter(Boolean))].sort();
        const genders = [...new Set(dedupedRows.map(r => r.studentgender).filter(Boolean))].sort();
        const ethnicities = [...new Set(dedupedRows.map(r => r.studentethnicgroup).filter(Boolean))].sort();

        // Detect available growth periods based on which columns have data
        const growthPeriods = [];
        const hasData = (col) => dedupedRows.some(r => r[col] && r[col] !== '');

        if (hasData('falltowinterconditionalgrowthpercentile')) growthPeriods.push('falltowinter');
        if (hasData('falltospringconditionalgrowthpercentile')) growthPeriods.push('falltospring');
        if (hasData('wintertospringconditionalgrowthpercentile')) growthPeriods.push('wintertospring');
        if (hasData('falltofallconditionalgrowthpercentile')) growthPeriods.push('falltofall');
        if (hasData('wintertowinterconditionalgrowthpercentile')) growthPeriods.push('wintertowinter');
        if (hasData('springtospringconditionalgrowthpercentile')) growthPeriods.push('springtospring');

        // Store metadata
        metadata.terms[term].districts[district].schools[school] = {
          count: dedupedRows.length,
          grades,
          subjects,
          genders,
          ethnicities,
          growthPeriods
        };

        // Write data slice to file
        const termDir = path.join(OUTPUT_DIR, sanitize(term));
        const districtDir = path.join(termDir, sanitize(district));
        ensureDir(districtDir);

        const dataFile = path.join(districtDir, `${sanitize(school)}.json`);
        fs.writeFileSync(dataFile, JSON.stringify(dedupedRows));

        totalFiles++;
        totalRows += dedupedRows.length;
      }
    }
  }

  // Write metadata file
  ensureDir(OUTPUT_DIR);
  const metadataFile = path.join(OUTPUT_DIR, 'metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

  console.log(`\nBuild complete:`);
  console.log(`  - Metadata: ${metadataFile}`);
  console.log(`  - Data files: ${totalFiles}`);
  console.log(`  - Total rows: ${totalRows}`);
  console.log(`\nMetadata size: ${(fs.statSync(metadataFile).size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
