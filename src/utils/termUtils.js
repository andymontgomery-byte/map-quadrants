/**
 * Term and Growth Period Utilities
 *
 * Handles parsing term names and calculating dynamic table headers
 * based on selected growth period.
 */

/**
 * Parse a term name into components
 * @param {string} termname - e.g., "Winter 2025-2026"
 * @returns {{ season: string, startYear: number, endYear: number }}
 */
export function parseTerm(termname) {
  const match = termname?.match(/^(Fall|Winter|Spring)\s+(\d{4})-(\d{4})$/);
  if (!match) {
    return { season: '', startYear: 0, endYear: 0 };
  }
  return {
    season: match[1],
    startYear: parseInt(match[2], 10),
    endYear: parseInt(match[3], 10),
  };
}

/**
 * Get the short season code for column headers
 * @param {string} season - Full season name
 * @returns {string} Short code (FA, WI, SP)
 */
export function getSeasonCode(season) {
  const codes = {
    Fall: 'FA',
    Winter: 'WI',
    Spring: 'SP',
  };
  return codes[season] || season.substring(0, 2).toUpperCase();
}

/**
 * Calculate start and end term labels based on selected term and growth period
 *
 * @param {string} termname - Selected term, e.g., "Winter 2025-2026"
 * @param {string} growthPeriod - Growth period key, e.g., "falltowinter"
 * @returns {{
 *   startLabel: string,      // e.g., "Fall 2025"
 *   endLabel: string,        // e.g., "Winter 2026"
 *   startCode: string,       // e.g., "FA 2025"
 *   endCode: string,         // e.g., "WI 2026"
 *   startSeason: string,     // e.g., "Fall"
 *   endSeason: string,       // e.g., "Winter"
 *   startYear: number,       // e.g., 2025
 *   endYear: number          // e.g., 2026
 * }}
 */
export function getTermLabels(termname, growthPeriod) {
  const { season, startYear, endYear } = parseTerm(termname);

  if (!season || !growthPeriod) {
    return {
      startLabel: '',
      endLabel: '',
      startCode: '',
      endCode: '',
      startSeason: '',
      endSeason: '',
      startYear: 0,
      endYear: 0,
    };
  }

  // The end term is always the selected term
  let endSeason = season;
  let endTermYear = season === 'Fall' ? startYear : endYear;

  // Calculate start term based on growth period
  let startSeason = '';
  let startTermYear = 0;

  switch (growthPeriod) {
    case 'falltowinter':
      // Fall of same school year to Winter
      startSeason = 'Fall';
      startTermYear = startYear;
      endSeason = 'Winter';
      endTermYear = endYear;
      break;

    case 'falltospring':
      // Fall of same school year to Spring
      startSeason = 'Fall';
      startTermYear = startYear;
      endSeason = 'Spring';
      endTermYear = endYear;
      break;

    case 'wintertospring':
      // Winter to Spring of same school year
      startSeason = 'Winter';
      startTermYear = endYear; // Winter 2025 in "Spring 2024-2025" school year is actually Winter 2025
      endSeason = 'Spring';
      endTermYear = endYear;
      break;

    case 'falltofall':
      // Fall to Fall (year-over-year)
      startSeason = 'Fall';
      startTermYear = startYear - 1;
      endSeason = 'Fall';
      endTermYear = startYear;
      break;

    case 'wintertowinter':
      // Winter to Winter (year-over-year)
      startSeason = 'Winter';
      startTermYear = startYear; // Previous year's winter
      endSeason = 'Winter';
      endTermYear = endYear;
      break;

    case 'springtospring':
      // Spring to Spring (year-over-year)
      startSeason = 'Spring';
      startTermYear = startYear; // Previous year's spring
      endSeason = 'Spring';
      endTermYear = endYear;
      break;

    default:
      startSeason = season;
      startTermYear = startYear;
  }

  return {
    startLabel: `${startSeason} ${startTermYear}`,
    endLabel: `${endSeason} ${endTermYear}`,
    startCode: `${getSeasonCode(startSeason)} ${startTermYear}`,
    endCode: `${getSeasonCode(endSeason)} ${endTermYear}`,
    startSeason,
    endSeason,
    startYear: startTermYear,
    endYear: endTermYear,
  };
}

/**
 * Get growth period display name
 * @param {string} growthPeriod - Growth period key
 * @returns {string} Human-readable name
 */
export function getGrowthPeriodLabel(growthPeriod) {
  const labels = {
    falltowinter: 'Fall to Winter',
    falltospring: 'Fall to Spring',
    wintertospring: 'Winter to Spring',
    falltofall: 'Fall to Fall',
    wintertowinter: 'Winter to Winter',
    springtospring: 'Spring to Spring',
  };
  return labels[growthPeriod] || growthPeriod;
}

/**
 * Get the prior term name based on current term and growth period
 * Used to load prior term data for start term percentile
 *
 * @param {string} termname - Current term, e.g., "Winter 2025-2026"
 * @param {string} growthPeriod - Growth period key, e.g., "wintertowinter"
 * @returns {string|null} Prior term name, e.g., "Winter 2024-2025", or null if same school year
 */
export function getPriorTermName(termname, growthPeriod) {
  const { season, startYear, endYear } = parseTerm(termname);
  if (!season || !growthPeriod) return null;

  switch (growthPeriod) {
    case 'falltowinter':
      // Fall to Winter is same school year - prior term is Fall of same year
      return `Fall ${startYear}-${endYear}`;

    case 'falltospring':
      // Fall to Spring is same school year - prior term is Fall of same year
      return `Fall ${startYear}-${endYear}`;

    case 'wintertospring':
      // Winter to Spring is same school year - prior term is Winter of same year
      return `Winter ${startYear}-${endYear}`;

    case 'falltofall':
      // Fall to Fall is year-over-year - prior term is Fall of previous school year
      return `Fall ${startYear - 1}-${startYear}`;

    case 'wintertowinter':
      // Winter to Winter is year-over-year - prior term is Winter of previous school year
      return `Winter ${startYear - 1}-${startYear}`;

    case 'springtospring':
      // Spring to Spring is year-over-year - prior term is Spring of previous school year
      return `Spring ${startYear - 1}-${startYear}`;

    default:
      return null;
  }
}
