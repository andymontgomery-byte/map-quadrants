/**
 * Quadrant colors and definitions
 */
export const QUADRANT_COLORS = {
  highHigh: '#d4ead8',    // High Achievement / High Growth - Light Green (top-right)
  lowHigh: '#fef0d5',     // Low Achievement / High Growth - Light Yellow/Tan (top-left)
  lowLow: '#fce8e7',      // Low Achievement / Low Growth - Light Pink (bottom-left)
  highLow: '#fefde6',     // High Achievement / Low Growth - Very Pale Yellow (bottom-right)
};

export const QUADRANT_LABELS = {
  highHigh: { achievement: 'High', growth: 'High', name: 'High Achievement / High Growth' },
  lowHigh: { achievement: 'Low', growth: 'High', name: 'Low Achievement / High Growth' },
  lowLow: { achievement: 'Low', growth: 'Low', name: 'Low Achievement / Low Growth' },
  highLow: { achievement: 'High', growth: 'Low', name: 'High Achievement / Low Growth' },
};

/**
 * Subject colors for chart points
 */
export const SUBJECT_COLORS = {
  'Math': '#2E8B57',           // Green (NWEA)
  'Math K-12': '#2E8B57',      // Green (NWEA)
  'Language Arts': '#4169E1',  // Blue
  'Language': '#4169E1',       // Blue
  'Language Usage': '#999999', // Gray (NWEA)
  'Reading': '#6A0DAD',        // Purple (NWEA)
  'Science': '#DC143C',        // Red (NWEA)
  'Science K-12': '#DC143C',   // Red (NWEA)
};

/**
 * Subject marker shapes for chart (matching NWEA ASG report)
 * 'cross' = +, 'square' = ■, 'circle' = ●, 'diamond' = ◆
 */
export const SUBJECT_SHAPES = {
  'Math': 'cross',
  'Math K-12': 'cross',
  'Language Arts': 'square',
  'Language': 'square',
  'Language Usage': 'circle',
  'Reading': 'square',
  'Science': 'diamond',
  'Science K-12': 'diamond',
};

/**
 * Determine which quadrant a student belongs to
 * @param {number} achievementPercentile - X-axis value (testpercentile)
 * @param {number} growthPercentile - Y-axis value (conditionalgrowthpercentile)
 * @returns {string} Quadrant key
 */
export function getQuadrant(achievementPercentile, growthPercentile) {
  const highAchievement = achievementPercentile >= 50;
  const highGrowth = growthPercentile >= 50;

  if (highAchievement && highGrowth) return 'highHigh';
  if (!highAchievement && highGrowth) return 'lowHigh';
  if (!highAchievement && !highGrowth) return 'lowLow';
  return 'highLow';
}

/**
 * Get quadrant color for a student
 * @param {Object} student - Student data with winterPercentile and conditionalGrowthPercentile
 * @returns {string} Hex color
 */
export function getQuadrantColor(student) {
  const quadrant = getQuadrant(
    student.winterPercentile,
    student.conditionalGrowthPercentile
  );
  return QUADRANT_COLORS[quadrant];
}

/**
 * Get subject color for a student
 * @param {Object} student - Student data with subject or course
 * @returns {string} Hex color
 */
export function getSubjectColor(student) {
  const key = student.course || student.subject;
  return SUBJECT_COLORS[key] || '#888888';
}

/**
 * Get subject marker shape
 * @param {Object} student - Student data with subject or course
 * @returns {string} Shape type: 'cross', 'square', 'circle', 'diamond'
 */
export function getSubjectShape(student) {
  const key = student.course || student.subject;
  return SUBJECT_SHAPES[key] || 'cross';
}

/**
 * Count students per quadrant
 * @param {Array} students - Array of processed student data
 * @returns {Object} Counts by quadrant
 */
export function countByQuadrant(students) {
  const counts = {
    highHigh: 0,
    lowHigh: 0,
    lowLow: 0,
    highLow: 0,
  };

  for (const student of students) {
    if (student.winterPercentile !== null && student.conditionalGrowthPercentile !== null) {
      const quadrant = getQuadrant(student.winterPercentile, student.conditionalGrowthPercentile);
      counts[quadrant]++;
    }
  }

  return counts;
}

/**
 * Calculate chart position (0-100 scale to pixel coordinates)
 * @param {number} value - Percentile value (0-100)
 * @param {number} size - Chart size in pixels
 * @param {number} padding - Chart padding
 * @returns {number} Pixel position
 */
export function percentileToPixel(value, size, padding = 0) {
  const chartArea = size - 2 * padding;
  return padding + (value / 100) * chartArea;
}

/**
 * Resolve overlapping labels using simple collision detection
 * @param {Array} points - Array of {x, y, label} objects
 * @param {number} minDistance - Minimum distance between labels
 * @returns {Array} Points with adjusted label positions
 */
export function resolveOverlaps(points, minDistance = 20) {
  const adjusted = points.map(p => ({ ...p, labelOffsetX: 5, labelOffsetY: -5 }));

  // Simple greedy adjustment
  for (let i = 0; i < adjusted.length; i++) {
    for (let j = i + 1; j < adjusted.length; j++) {
      const dx = Math.abs(adjusted[i].x - adjusted[j].x);
      const dy = Math.abs(adjusted[i].y - adjusted[j].y);

      if (dx < minDistance && dy < minDistance) {
        // Move j's label down
        adjusted[j].labelOffsetY += minDistance;
      }
    }
  }

  return adjusted;
}
