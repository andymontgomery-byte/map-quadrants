import { useCallback } from 'react';

function FilterSelection({
  isLoading,
  error,
  hasData,
  availableOptions,
  filteredSchools,
  selection,
  onSelectionChange,
  onGenerate,
}) {
  const handleSelectionChange = useCallback((field, value) => {
    onSelectionChange(prev => {
      const updated = { ...prev, [field]: value };

      // Reset dependent fields
      if (field === 'districtname') {
        updated.schoolname = '';
      }

      return updated;
    });
  }, [onSelectionChange]);

  const canGenerate = hasData &&
    selection.termname &&
    selection.districtname &&
    selection.schoolname;

  if (isLoading) {
    return (
      <div className="filter-selection">
        <h1>MAP Quadrant Report</h1>
        <div className="loading">Loading data</div>
      </div>
    );
  }

  return (
    <div className="filter-selection">
      <h1>MAP Quadrant Report</h1>
      <p>Select criteria to generate the report.</p>

      {error && <div className="error">{error}</div>}

      <div className="filter-row">
        <label htmlFor="term-select">Term Tested</label>
        <select
          id="term-select"
          value={selection.termname}
          onChange={(e) => handleSelectionChange('termname', e.target.value)}
          disabled={!hasData}
        >
          <option value="">Select a term...</option>
          {(availableOptions.terms || []).map(term => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label htmlFor="district-select">District</label>
        <select
          id="district-select"
          value={selection.districtname}
          onChange={(e) => handleSelectionChange('districtname', e.target.value)}
          disabled={!hasData}
        >
          <option value="">Select a district...</option>
          {(availableOptions.districts || []).map(district => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label htmlFor="school-select">School</label>
        <select
          id="school-select"
          value={selection.schoolname}
          onChange={(e) => handleSelectionChange('schoolname', e.target.value)}
          disabled={!hasData || !selection.districtname}
        >
          <option value="">Select a school...</option>
          {filteredSchools.map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label htmlFor="grade-select">Grade (optional)</label>
        <select
          id="grade-select"
          value={selection.grades[0] || ''}
          onChange={(e) => handleSelectionChange('grades', e.target.value ? [e.target.value] : [])}
          disabled={!hasData}
        >
          <option value="">All Grades</option>
          {(availableOptions.grades || []).map(grade => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
      </div>

      <button
        className="generate-btn"
        onClick={onGenerate}
        disabled={!canGenerate}
      >
        Generate Report
      </button>
    </div>
  );
}

export default FilterSelection;
