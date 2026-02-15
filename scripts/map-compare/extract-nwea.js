/**
 * NWEA Data Extraction Script
 *
 * Run via: openclaw browser evaluate --file extract-nwea.js
 *
 * Extracts structured data from the NWEA ASG Quadrant Report page.
 * Returns JSON with header metadata and all student rows with named fields.
 */
(() => {
  const result = {
    source: 'nwea',
    extractedAt: new Date().toISOString(),
    header: {},
    students: [],
    subjects: [],
    errors: [],
  };

  // --- Header Extraction ---
  // NWEA report header has metadata in various elements (td, span, div).
  // We look for known label patterns and extract the associated values.
  try {
    const extractField = (label) => {
      // Try structured table cells first
      const cells = document.querySelectorAll('td, th, span, div');
      for (const cell of cells) {
        const text = cell.textContent?.trim();
        if (text && text.includes(label)) {
          // The value might be in the same cell after the label, or in the next sibling
          const afterLabel = text.split(label).pop()?.trim().replace(/^[:\s]+/, '');
          if (afterLabel && afterLabel.length < 200) return afterLabel;

          // Check next sibling
          const next = cell.nextElementSibling;
          if (next) {
            const val = next.textContent?.trim();
            if (val) return val;
          }
        }
      }
      return null;
    };

    result.header = {
      termTested: extractField('Term Tested'),
      district: extractField('District'),
      school: extractField('School'),
      normsReference: extractField('Norms Reference'),
      growthComparisonPeriod: extractField('Growth Comparison'),
      weeksOfInstruction: extractField('Weeks of Instruction'),
    };
  } catch (e) {
    result.errors.push(`Header extraction error: ${e.message}`);
  }

  // --- Table Extraction ---
  // NWEA uses either standard <table> or ARIA role-based table markup.
  // Student rows have 16+ cells. Subject group headers have fewer cells or a single spanning cell.
  try {
    // Find all table rows -- try both selectors
    const tableRows = document.querySelectorAll('table tbody tr, [role="row"]');
    let currentSubject = null;

    for (const row of tableRows) {
      const cells = row.querySelectorAll('td, [role="cell"]');

      // Skip header rows (th-only rows)
      if (cells.length === 0) continue;

      // Subject group header detection:
      // - Usually 1-2 cells with a spanning colspan, containing a subject name
      // - Or a row with a single cell that has text like "Mathematics" or "Reading"
      if (cells.length <= 3) {
        const text = row.textContent?.trim();
        if (text && text.length < 100 && !text.match(/^\d/)) {
          // Likely a subject group header
          currentSubject = text.replace(/[:\d\s]+students?$/i, '').trim();
          if (currentSubject && !result.subjects.includes(currentSubject)) {
            result.subjects.push(currentSubject);
          }
        }
        continue;
      }

      // Student data row -- extract all 16 fields
      const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

      // The first cell might be a quadrant color indicator (colored box, possibly empty text)
      // Get background color from the first cell or its child
      let quadrantColor = '';
      try {
        const firstCell = cells[0];
        const colorEl = firstCell.querySelector('[style*="background"], div, span') || firstCell;
        const bg = window.getComputedStyle(colorEl).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          quadrantColor = bg;
        }
      } catch (_) { /* ignore color extraction errors */ }

      // Parse student name and ID from the name cell (index 1)
      // Format: "Last, First\nID" or "Last, First ID"
      const nameCell = cells[1];
      let studentName = '';
      let studentId = '';
      if (nameCell) {
        const nameParts = nameCell.textContent?.trim().split('\n').map(s => s.trim()).filter(Boolean);
        if (nameParts && nameParts.length >= 2) {
          studentName = nameParts[0];
          studentId = nameParts[nameParts.length - 1];
        } else if (nameParts && nameParts.length === 1) {
          // Might be "Last, First  12345" with spaces
          const match = nameParts[0].match(/^(.+?)\s{2,}(\d+)$/);
          if (match) {
            studentName = match[1].trim();
            studentId = match[2].trim();
          } else {
            studentName = nameParts[0];
          }
        }
      }

      // Parse RIT range values -- extract the bold (middle) value
      const parseRITRange = (text) => {
        if (!text || text === '\u2014' || text === '***' || text === '-') return { low: null, mid: null, high: null, raw: text };
        // Pattern: "175-180-185" or "175 - 180 - 185"
        const match = text.match(/(\d+)\s*[-\u2013]\s*(\d+)\s*[-\u2013]\s*(\d+)/);
        if (match) {
          return { low: parseInt(match[1]), mid: parseInt(match[2]), high: parseInt(match[3]), raw: text };
        }
        // Single number
        const single = text.match(/^(\d+)$/);
        if (single) return { low: null, mid: parseInt(single[1]), high: null, raw: text };
        return { low: null, mid: null, high: null, raw: text };
      };

      // Parse percentile range -- extract bold (middle) value
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
        // Keep raw cell values for debugging
        _raw: cellTexts,
      };

      result.students.push(student);
    }
  } catch (e) {
    result.errors.push(`Table extraction error: ${e.message}`);
  }

  return JSON.stringify(result, null, 2);
})();
