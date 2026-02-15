/**
 * NWEA 2025 Norms Lookup
 *
 * Converts (subject, season, grade, RIT) → percentile using the 2025 norms table.
 * The norms table maps percentile → RIT; this module inverts that lookup.
 */

import { NORMS_2025 } from './normsData.js';

// Map CSV subject names to norms column prefixes
const SUBJECT_MAP = {
  'Mathematics': 'Math',
  'Math K-12': 'Math',
  'Math 6+': 'Math',
  'Math': 'Math',
  'Reading': 'Read',
  'Language Usage': 'Lang',
  'Language': 'Lang',
  'Science - General Science': 'Scie',
  'Science K-12': 'Scie',
  'General Science': 'Scie',
  'Science': 'Scie',
};

// Map season names to norms column codes
const SEASON_MAP = {
  'Fall': 'Fal',
  'Winter': 'Win',
  'Spring': 'Spr',
};

/**
 * Build the norms column key from subject, season, and grade.
 * @param {string} subject - CSV subject name (e.g., "Mathematics")
 * @param {string} season - Season name (e.g., "Winter")
 * @param {string} grade - Grade string (e.g., "5", "K", "10")
 * @returns {string|null} Column key (e.g., "Math_Win_G5") or null if unmapped
 */
function buildKey(subject, season, grade) {
  const subjectCode = SUBJECT_MAP[subject];
  const seasonCode = SEASON_MAP[season];
  if (!subjectCode || !seasonCode) return null;

  const gradeCode = `G${grade === 'K' ? 'K' : grade}`;
  return `${subjectCode}_${seasonCode}_${gradeCode}`;
}

/**
 * Look up the percentile for a given RIT score using 2025 norms.
 *
 * The norms array is sorted ascending (percentile 1 at index 0, percentile 99 at index 98).
 * For a given RIT, we find the highest percentile whose RIT value ≤ the input RIT.
 * This "floor" method matches NWEA's approach within ±1 percentile.
 *
 * @param {string} subject - CSV subject name (e.g., "Mathematics", "Reading")
 * @param {string} season - Season name (e.g., "Fall", "Winter", "Spring")
 * @param {string} grade - Grade string (e.g., "5", "K")
 * @param {number} rit - RIT score to look up
 * @returns {number|null} Percentile (1-99) or null if lookup unavailable
 */
export function lookupPercentile(subject, season, grade, rit) {
  const key = buildKey(subject, season, grade);
  if (!key) return null;

  const ritArray = NORMS_2025[key];
  if (!ritArray) return null;

  const ritRounded = Math.round(rit);

  // If RIT is below the lowest entry (percentile 1), return 1
  if (ritRounded <= ritArray[0]) return 1;
  // If RIT is at or above the highest entry (percentile 99), return 99
  if (ritRounded >= ritArray[98]) return 99;

  // Binary search for the highest index where ritArray[index] <= ritRounded
  let lo = 0;
  let hi = 98;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1; // ceil division
    if (ritArray[mid] <= ritRounded) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  // Nearest-neighbor: if RIT falls between entries, pick the closer one (ties go up)
  if (lo < 98 && ritArray[lo] < ritRounded) {
    const distBelow = ritRounded - ritArray[lo];
    const distAbove = ritArray[lo + 1] - ritRounded;
    if (distAbove <= distBelow) {
      lo = lo + 1;
    }
  }

  // lo is the index; percentile = index + 1
  return lo + 1;
}

/**
 * Check if norms lookup is available for a given subject/season/grade combo.
 * @param {string} subject - CSV subject name
 * @param {string} season - Season name
 * @param {string} grade - Grade string
 * @returns {boolean}
 */
export function hasNormsData(subject, season, grade) {
  const key = buildKey(subject, season, grade);
  return key !== null && key in NORMS_2025;
}
