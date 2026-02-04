import Papa from 'papaparse';

/**
 * Fetch and parse CSV from URL
 * @param {string} url - URL to fetch CSV from
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export function fetchAndParseCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          data: results.data,
          meta: results.meta,
          errors: results.errors
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Parse CSV file and return structured data
 * @param {File} file - CSV file to parse
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          data: results.data,
          meta: results.meta,
          errors: results.errors
        });
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Get unique values for a column
 * @param {Array} data - Parsed CSV data
 * @param {string} column - Column name
 * @returns {Array<string>} Sorted unique values
 */
export function getUniqueValues(data, column) {
  const values = new Set();
  for (const row of data) {
    const value = row[column];
    if (value && value.trim()) {
      values.add(value.trim());
    }
  }
  return Array.from(values).sort();
}

/**
 * Extract column names from parsed data
 * @param {Array} data - Parsed CSV data
 * @returns {Array<string>} Column names
 */
export function getColumnNames(data) {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0]);
}
