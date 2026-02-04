import { useCallback } from 'react';

function FilterSelection({
  isLoading,
  error,
  hasData,
  availableOptions,
  selection,
  onSelectionChange,
  onGenerate,
}) {
  const handleSelectionChange = useCallback((field, value) => {
    onSelectionChange(prev => {
      const updated = { ...prev, [field]: value };

      // Reset downstream selections when upstream changes
      if (field === 'termname') {
        updated.districtname = '';
        updated.schoolname = '';
        updated.grades = [];
        updated.growthPeriod = '';
      } else if (field === 'districtname') {
        updated.schoolname = '';
        updated.grades = [];
        updated.growthPeriod = '';
      } else if (field === 'schoolname') {
        updated.grades = [];
        updated.growthPeriod = '';
      }

      return updated;
    });
  }, [onSelectionChange]);

  const canGenerate = hasData &&
    selection.termname &&
    selection.districtname &&
    selection.schoolname &&
    selection.growthPeriod &&
    !isLoading;

  // Growth period display names
  const growthPeriodLabels = {
    falltowinter: 'Fall to Winter',
    falltospring: 'Fall to Spring',
    wintertospring: 'Winter to Spring',
    falltofall: 'Fall to Fall',
    wintertowinter: 'Winter to Winter',
    springtospring: 'Spring to Spring',
  };

  if (isLoading && !hasData) {
    return (
      <div className="filter-selection">
        <h1>MAP Quadrant Report</h1>
        <div className="loading">Loading</div>
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
          disabled={!hasData || isLoading}
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
          disabled={!hasData || !selection.termname || isLoading}
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
          disabled={!hasData || !selection.districtname || isLoading}
        >
          <option value="">Select a school...</option>
          {(availableOptions.schools || []).map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label htmlFor="growth-period-select">Growth Comparison Period</label>
        <select
          id="growth-period-select"
          value={selection.growthPeriod}
          onChange={(e) => handleSelectionChange('growthPeriod', e.target.value)}
          disabled={!hasData || !selection.schoolname || isLoading}
        >
          <option value="">Select a growth period...</option>
          {(availableOptions.growthPeriods || []).map(period => (
            <option key={period} value={period}>{growthPeriodLabels[period] || period}</option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label htmlFor="grade-select">Grade (optional)</label>
        <select
          id="grade-select"
          value={selection.grades[0] || ''}
          onChange={(e) => handleSelectionChange('grades', e.target.value ? [e.target.value] : [])}
          disabled={!hasData || !selection.schoolname || isLoading}
        >
          <option value="">All Grades</option>
          {(availableOptions.grades || []).map(grade => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
      </div>

      {selection.schoolname && selection.growthPeriod && availableOptions.studentCount > 0 && (
        <div className="selection-summary">
          <strong>{availableOptions.studentCount}</strong> students available
        </div>
      )}

      <button
        className="generate-btn"
        onClick={onGenerate}
        disabled={!canGenerate}
      >
        {isLoading ? 'Loading...' : 'Generate Report'}
      </button>
    </div>
  );
}

export default FilterSelection;
