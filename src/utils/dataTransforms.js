import { lookupPercentile } from './normsLookup.js';

/**
 * Deduplicate data based on growthmeasureyn or highest RIT score
 * Processes per-term to handle mixed historical/current data
 * @param {Array} rows - Raw CSV rows
 * @returns {Array} Deduplicated rows
 */
export function deduplicateData(rows) {
  // Group by term first
  const byTerm = {};
  for (const row of rows) {
    const term = row.termname || 'unknown';
    if (!byTerm[term]) byTerm[term] = [];
    byTerm[term].push(row);
  }

  const result = [];

  // Process each term separately
  for (const [term, termRows] of Object.entries(byTerm)) {
    // Check if this term has growthmeasureyn populated
    const hasGrowthMeasure = termRows.some(r => r.growthmeasureyn === 'true');

    if (hasGrowthMeasure) {
      // Use NWEA's official growth measure designation for this term
      result.push(...termRows.filter(r => r.growthmeasureyn === 'true'));
    } else {
      // Fallback: keep highest RIT per student+subject for this term
      const groups = {};
      for (const row of termRows) {
        const key = `${row.studentid}|${row.subject}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }

      for (const group of Object.values(groups)) {
        const best = group.reduce((best, curr) => {
          const currScore = parseFloat(curr.testritscore) || 0;
          const bestScore = parseFloat(best.testritscore) || 0;
          return currScore > bestScore ? curr : best;
        });
        result.push(best);
      }
    }
  }

  return result;
}

/**
 * Filter data by criteria
 * @param {Array} data - CSV data
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered data
 */
export function filterData(data, filters) {
  return data.filter(row => {
    // Term filter
    if (filters.termname && row.termname !== filters.termname) return false;

    // School filter
    if (filters.schoolname && row.schoolname !== filters.schoolname) return false;

    // District filter
    if (filters.districtname && row.districtname !== filters.districtname) return false;

    // Grade filter (can be array)
    if (filters.grades && filters.grades.length > 0) {
      if (!filters.grades.includes(row.grade)) return false;
    }

    // Subject filter (array) - empty array means filter out everything
    if (Array.isArray(filters.subjects)) {
      if (filters.subjects.length === 0 || !filters.subjects.includes(row.subject)) return false;
    }

    // Gender filter (array) - empty array means filter out everything
    if (Array.isArray(filters.genders)) {
      if (filters.genders.length === 0 || !filters.genders.includes(row.studentgender)) return false;
    }

    // Ethnicity filter (array) - empty array means filter out everything
    if (Array.isArray(filters.ethnicities)) {
      if (filters.ethnicities.length === 0 || !filters.ethnicities.includes(row.studentethnicgroup)) return false;
    }

    return true;
  });
}

/**
 * Safely parse a numeric value, returning null for empty/invalid strings
 * @param {*} value - Value to parse
 * @returns {number|null} Parsed number or null
 */
function safeParseFloat(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Derive the start-term grade for year-over-year growth periods.
 * Students promote one grade between start and end terms.
 * @param {string} currentGrade - Current grade (e.g., "5", "K", "1")
 * @returns {string} Prior grade (e.g., "4", "K", "K")
 */
function deriveStartGrade(currentGrade) {
  const num = parseInt(currentGrade, 10);
  if (!isNaN(num) && num > 0) return String(num - 1);
  // Grade K or 0 — can't go lower
  return currentGrade;
}

/**
 * Calculate derived values for a student row
 * @param {Object} row - Raw student data row
 * @param {string} growthPeriod - Growth period prefix (e.g., 'falltowinter')
 * @returns {Object} Row with calculated values
 */
export function calculateDerivedValues(row, growthPeriod = 'falltowinter') {
  const testritscore = safeParseFloat(row.testritscore);
  const teststandarderror = safeParseFloat(row.teststandarderror) ?? 0;

  // Get growth values - null if not present (don't default to 0!)
  const observedGrowthRaw = row[`${growthPeriod}observedgrowth`];
  const projectedGrowthRaw = row[`${growthPeriod}projectedgrowth`];
  const observedGrowth = safeParseFloat(observedGrowthRaw);
  const projectedGrowth = safeParseFloat(projectedGrowthRaw);

  // Determine if growth data exists for this growth period
  const hasGrowthData = observedGrowth !== null || projectedGrowth !== null;

  // Calculate Start term RIT only if growth data exists (otherwise no prior term test)
  const startRIT = (hasGrowthData && testritscore !== null && observedGrowth !== null)
    ? testritscore - observedGrowth
    : null;

  // Calculate Projected RIT only if growth data exists
  const projectedRIT = (hasGrowthData && startRIT !== null && projectedGrowth !== null)
    ? startRIT + projectedGrowth
    : null;

  return {
    ...row,
    // Flag indicating if growth data exists
    hasGrowthData,

    // Achievement Status - Start term (only if growth data exists)
    fallRIT: startRIT !== null ? Math.round(startRIT) : null,

    // Achievement Status - End term (Winter)
    winterRIT: testritscore !== null ? Math.round(testritscore) : null,
    winterPercentile: safeParseFloat(row.testpercentile),
    teststandarderror: teststandarderror,

    // Growth - Student (null if no growth data, NOT 0)
    projectedRIT: projectedRIT !== null ? Math.round(projectedRIT) : null,
    projectedGrowth: projectedGrowth,
    observedGrowth: observedGrowth,
    growthSE: safeParseFloat(row[`${growthPeriod}observedgrowthse`]),

    // Growth - Comparative
    metProjectedGrowth: row[`${growthPeriod}metprojectedgrowth`] || null,
    conditionalGrowthIndex: safeParseFloat(row[`${growthPeriod}conditionalgrowthindex`]),
    conditionalGrowthPercentile: safeParseFloat(row[`${growthPeriod}conditionalgrowthpercentile`]),
    growthQuintile: row[`${growthPeriod}growthquintile`] || null,

    // Display values
    studentName: `${row.studentlastname}, ${row.studentfirstname}`,
    studentNameShort: `${row.studentlastname}, ${(row.studentfirstname || '')[0] || ''}`,
  };
}

/**
 * Process all data with calculations
 * @param {Array} data - Raw CSV data
 * @param {string} growthPeriod - Growth period
 * @param {Object} priorTermLookup - Optional map of studentid|subject -> prior term data
 * @param {string} startSeason - Start season name (e.g., "Fall", "Winter") for norms lookup
 * @returns {Array} Processed data
 */
export function processData(data, growthPeriod = 'falltowinter', priorTermLookup = null, startSeason = null) {
  return data.map(row => {
    const processed = calculateDerivedValues(row, growthPeriod);

    // Get prior term SE from prior term lookup (still needed for range display)
    if (priorTermLookup && processed.hasGrowthData) {
      const key = `${row.studentid}|${row.subject}`;
      const priorData = priorTermLookup[key];
      if (priorData) {
        processed.startTermSE = safeParseFloat(priorData.teststandarderror);
      }
    }

    // Derive startTermPercentile
    // Year-over-year periods (W2W, F2F, S2S): use 2025 norms lookup because
    // the prior CSV percentile was scored with older norms at a different grade
    // Same-year periods (F2W, F2S, W2S): use prior CSV percentile directly
    // since it was already scored with current norms at test time
    const isYearOverYear = ['wintertowinter', 'falltofall', 'springtospring'].includes(growthPeriod);

    if (isYearOverYear && processed.hasGrowthData && processed.fallRIT != null && startSeason) {
      const startRIT = processed.fallRIT;
      const startGrade = deriveStartGrade(row.grade);
      const normsPercentile = lookupPercentile(row.subject, startSeason, startGrade, startRIT);
      if (normsPercentile != null) {
        processed.startTermPercentile = normsPercentile;
        const se = processed.startTermSE || 0;
        if (se > 0) {
          processed.startTermPercentileLow = lookupPercentile(row.subject, startSeason, startGrade, startRIT - se);
          processed.startTermPercentileHigh = lookupPercentile(row.subject, startSeason, startGrade, startRIT + se);
        }
      } else if (priorTermLookup) {
        const key = `${row.studentid}|${row.subject}`;
        const priorData = priorTermLookup[key];
        if (priorData) {
          processed.startTermPercentile = safeParseFloat(priorData.testpercentile);
        }
      }
    } else if (priorTermLookup && processed.hasGrowthData) {
      const key = `${row.studentid}|${row.subject}`;
      const priorData = priorTermLookup[key];
      if (priorData) {
        processed.startTermPercentile = safeParseFloat(priorData.testpercentile);
      }
    }

    return processed;
  });
}


/**
 * Get students eligible for chart (have both X and Y axis values)
 * @param {Array} data - Processed data
 * @returns {Array} Chart-eligible students
 */
export function getChartEligibleStudents(data) {
  return data.filter(row =>
    row.winterPercentile !== null &&
    row.conditionalGrowthPercentile !== null
  );
}

/**
 * Group data by subject/course for table display
 * @param {Array} data - Processed data
 * @returns {Object} Grouped data {subject: Array<rows>}
 */
export function groupBySubject(data) {
  const groups = {};
  for (const row of data) {
    const key = row.course || row.subject;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  return groups;
}

/**
 * Sort data by column
 * @param {Array} data - Data to sort
 * @param {string} column - Column name
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted data
 */
export function sortData(data, column, direction = 'asc') {
  return [...data].sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];

    // Handle numeric values
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Handle strings
    aVal = String(aVal || '').toLowerCase();
    bVal = String(bVal || '').toLowerCase();

    if (direction === 'asc') {
      return aVal.localeCompare(bVal);
    }
    return bVal.localeCompare(aVal);
  });
}
