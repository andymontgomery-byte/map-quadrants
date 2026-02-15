/**
 * Local App Data Extraction Script
 *
 * Run via: openclaw browser evaluate --file extract-app.js
 *
 * Extracts structured data from our MAP Quadrant Report app.
 * Target URL: https://andymontgomery-byte.github.io/map-quadrants/
 * Returns JSON with header metadata, student rows, and chart data.
 */
(() => {
  const result = {
    source: 'app',
    extractedAt: new Date().toISOString(),
    header: {},
    students: [],
    subjects: [],
    chart: [],
    errors: [],
  };

  // --- Header Extraction ---
  // Our app uses .report-header with .criteria-item elements
  try {
    const criteriaItems = document.querySelectorAll('.report-header .criteria-item');
    for (const item of criteriaItems) {
      const label = item.querySelector('.criteria-label')?.textContent?.trim().replace(/:$/, '');
      const value = item.querySelector('.criteria-value')?.textContent?.trim();
      if (label && value) {
        // Normalize label to camelCase key
        const key = label
          .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
          .replace(/^(.)/, c => c.toLowerCase());
        result.header[key] = value;
      }
    }
  } catch (e) {
    result.errors.push(`Header extraction error: ${e.message}`);
  }

  // --- Table Extraction ---
  // Our app uses .data-table with tbody tr rows.
  // Subject group headers have class .subject-group-header.
  // Student rows have 16 td cells.
  try {
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    let currentSubject = null;

    for (const row of tableRows) {
      // Subject group header
      if (row.classList.contains('subject-group-header')) {
        const text = row.textContent?.trim();
        // Format: "Subject Name: N students"
        const match = text?.match(/^(.+?):\s*\d+\s*students?$/i);
        currentSubject = match ? match[1].trim() : text;
        if (currentSubject && !result.subjects.includes(currentSubject)) {
          result.subjects.push(currentSubject);
        }
        continue;
      }

      const cells = row.querySelectorAll('td');
      if (cells.length < 4) continue;

      const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

      // Quadrant color from the .quadrant-box element
      let quadrantColor = '';
      try {
        const quadrantBox = cells[0]?.querySelector('.quadrant-box');
        if (quadrantBox) {
          quadrantColor = quadrantBox.style.backgroundColor || '';
        }
      } catch (_) { /* ignore */ }

      // Student name and ID
      const nameCell = cells[1];
      let studentName = '';
      let studentId = '';
      if (nameCell) {
        const nameDiv = nameCell.querySelector('div:not(.student-id)');
        const idDiv = nameCell.querySelector('.student-id');
        studentName = nameDiv?.textContent?.trim() || '';
        studentId = idDiv?.textContent?.trim() || '';
        // Fallback: parse from full cell text
        if (!studentName && !studentId) {
          const parts = nameCell.textContent?.trim().split('\n').map(s => s.trim()).filter(Boolean);
          if (parts && parts.length >= 2) {
            studentName = parts[0];
            studentId = parts[1];
          }
        }
      }

      // Parse RIT range -- our app renders "low-BOLD-high" via JSX
      // The text content comes through as "low-mid-high"
      const parseRITRange = (text) => {
        if (!text || text === '\u2014' || text === '***' || text === '-') return { low: null, mid: null, high: null, raw: text };
        const match = text.match(/(\d+)\s*[-\u2013]\s*(\d+)\s*[-\u2013]\s*(\d+)/);
        if (match) {
          return { low: parseInt(match[1]), mid: parseInt(match[2]), high: parseInt(match[3]), raw: text };
        }
        const single = text.match(/^(\d+)$/);
        if (single) return { low: null, mid: parseInt(single[1]), high: null, raw: text };
        return { low: null, mid: null, high: null, raw: text };
      };

      const parsePercentileRange = (text) => {
        if (!text || text === '\u2014' || text === '***' || text === '-') return { low: null, mid: null, high: null, raw: text };
        const match = text.match(/(\d+)\s*[-\u2013]\s*(\d+)\s*[-\u2013]\s*(\d+)/);
        if (match) {
          return { low: parseInt(match[1]), mid: parseInt(match[2]), high: parseInt(match[3]), raw: text };
        }
        const single = text.match(/^(\d+)$/);
        if (single) return { low: null, mid: parseInt(single[1]), high: null, raw: text };
        return { low: null, mid: null, high: null, raw: text };
      };

      const parseNumber = (text) => {
        if (!text || text === '\u2014' || text === '-' || text === '***') return null;
        const cleaned = text.replace(/[^\d.\-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      const student = {
        subject: currentSubject,
        quadrantColor,
        studentName,
        studentId,
        grade: cellTexts[2] || '',
        date: cellTexts[3] || '',
        startRIT: parseRITRange(cellTexts[4]),
        startPercentile: parsePercentileRange(cellTexts[5]),
        endRIT: parseRITRange(cellTexts[6]),
        endPercentile: parsePercentileRange(cellTexts[7]),
        projectedRIT: parseNumber(cellTexts[8]),
        projectedGrowth: parseNumber(cellTexts[9]),
        observedGrowth: parseNumber(cellTexts[10]),
        observedGrowthSE: parseNumber(cellTexts[11]),
        growthIndex: parseNumber(cellTexts[12]),
        metProjectedGrowth: cellTexts[13] || null,
        conditionalGrowthIndex: parseNumber(cellTexts[14]),
        conditionalGrowthPercentile: parseNumber(cellTexts[15]),
        _raw: cellTexts,
      };

      result.students.push(student);
    }
  } catch (e) {
    result.errors.push(`Table extraction error: ${e.message}`);
  }

  // --- Chart Data Extraction ---
  // SVG chart with .student-point circles, each has a <title> with metadata
  try {
    const points = document.querySelectorAll('.student-point');
    for (const point of points) {
      const cx = parseFloat(point.getAttribute('cx'));
      const cy = parseFloat(point.getAttribute('cy'));
      const title = point.querySelector('title')?.textContent?.trim() || '';
      const fill = point.getAttribute('fill') || '';

      // Parse title: "Name\nSubject\nAchievement: X%\nGrowth: Y%"
      const titleLines = title.split('\n').map(s => s.trim());
      const achievementMatch = title.match(/Achievement:\s*(\d+)%/);
      const growthMatch = title.match(/Growth:\s*(\d+)%/);

      result.chart.push({
        cx,
        cy,
        fill,
        name: titleLines[0] || '',
        subject: titleLines[1] || '',
        achievementPercentile: achievementMatch ? parseInt(achievementMatch[1]) : null,
        growthPercentile: growthMatch ? parseInt(growthMatch[1]) : null,
      });
    }
  } catch (e) {
    result.errors.push(`Chart extraction error: ${e.message}`);
  }

  return JSON.stringify(result, null, 2);
})();
