/**
 * Deduplicate data based on growthmeasureyn or highest RIT score
 * @param {Array} rows - Raw CSV rows
 * @returns {Array} Deduplicated rows
 */
export function deduplicateData(rows) {
  // Check if this data has growthmeasureyn populated
  const hasGrowthMeasure = rows.some(r => r.growthmeasureyn === 'true');

  if (hasGrowthMeasure) {
    // Use NWEA's official growth measure designation
    return rows.filter(r => r.growthmeasureyn === 'true');
  }

  // Fallback for terms without growthmeasureyn - keep highest RIT per student+subject
  const groups = {};
  for (const row of rows) {
    const key = `${row.studentid}|${row.subject}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return Object.values(groups).map(group =>
    group.reduce((best, curr) => {
      const currScore = parseFloat(curr.testritscore) || 0;
      const bestScore = parseFloat(best.testritscore) || 0;
      return currScore > bestScore ? curr : best;
    })
  );
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

    // Subject filter (array)
    if (filters.subjects && filters.subjects.length > 0) {
      if (!filters.subjects.includes(row.subject)) return false;
    }

    // Gender filter (array)
    if (filters.genders && filters.genders.length > 0) {
      if (!filters.genders.includes(row.studentgender)) return false;
    }

    // Ethnicity filter (array)
    if (filters.ethnicities && filters.ethnicities.length > 0) {
      if (!filters.ethnicities.includes(row.studentethnicgroup)) return false;
    }

    return true;
  });
}

/**
 * Calculate derived values for a student row
 * @param {Object} row - Raw student data row
 * @param {string} growthPeriod - Growth period prefix (e.g., 'falltowinter')
 * @returns {Object} Row with calculated values
 */
export function calculateDerivedValues(row, growthPeriod = 'falltowinter') {
  const testritscore = parseFloat(row.testritscore) || null;
  const teststandarderror = parseFloat(row.teststandarderror) || 0;
  const observedGrowth = parseFloat(row[`${growthPeriod}observedgrowth`]) || 0;
  const projectedGrowth = parseFloat(row[`${growthPeriod}projectedgrowth`]) || 0;

  // Calculate Fall RIT (subtract observed growth from winter score)
  const fallRIT = testritscore !== null ? testritscore - observedGrowth : null;

  // Calculate Projected RIT (fall + projected growth)
  const projectedRIT = fallRIT !== null ? fallRIT + projectedGrowth : null;

  // Calculate RIT ranges (±2*SE)
  const winterRITLow = testritscore !== null ? Math.round((testritscore - 2 * teststandarderror) * 10) / 10 : null;
  const winterRITHigh = testritscore !== null ? Math.round((testritscore + 2 * teststandarderror) * 10) / 10 : null;

  return {
    ...row,
    // Achievement Status - Fall
    fallRIT: fallRIT !== null ? Math.round(fallRIT) : null,

    // Achievement Status - Winter
    winterRIT: testritscore !== null ? Math.round(testritscore) : null,
    winterRITLow,
    winterRITHigh,
    winterPercentile: parseFloat(row.testpercentile) || null,

    // Growth - Student
    projectedRIT: projectedRIT !== null ? Math.round(projectedRIT) : null,
    projectedGrowth: projectedGrowth,
    observedGrowth: observedGrowth,
    growthSE: parseFloat(row[`${growthPeriod}observedgrowthse`]) || null,

    // Growth - Comparative
    metProjectedGrowth: row[`${growthPeriod}metprojectedgrowth`] || null,
    conditionalGrowthIndex: parseFloat(row[`${growthPeriod}conditionalgrowthindex`]) || null,
    conditionalGrowthPercentile: parseFloat(row[`${growthPeriod}conditionalgrowthpercentile`]) || null,
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
 * @returns {Array} Processed data
 */
export function processData(data, growthPeriod = 'falltowinter') {
  return data.map(row => calculateDerivedValues(row, growthPeriod));
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
