import { useCallback } from 'react';
import { SUBJECT_COLORS } from '../utils/quadrantLogic';

function ChartFilters({ options, filters, onFiltersChange }) {
  const handleCheckboxToggle = useCallback((category, value) => {
    onFiltersChange(prev => {
      const current = prev[category] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: newValues };
    });
  }, [onFiltersChange]);

  const handleToggleChange = useCallback((field, value) => {
    onFiltersChange(prev => ({ ...prev, [field]: value }));
  }, [onFiltersChange]);

  return (
    <div className="chart-filters">
      {/* Display Options */}
      <div className="filter-section">
        <div className="filter-checkbox">
          <input
            type="checkbox"
            id="show-names"
            checked={filters.showNames}
            onChange={(e) => handleToggleChange('showNames', e.target.checked)}
          />
          <label htmlFor="show-names">Show student names</label>
        </div>

        <div className="filter-checkbox">
          <input
            type="checkbox"
            id="show-colors"
            checked={filters.showQuadrantColors}
            onChange={(e) => handleToggleChange('showQuadrantColors', e.target.checked)}
          />
          <label htmlFor="show-colors">Show quadrant colors</label>
        </div>
      </div>

      {/* Subject Filter */}
      <div className="filter-section">
        <div className="filter-section-title">Subjects and Courses shown</div>

        {(options.subjects || []).map(subject => (
          <div key={subject} className="filter-checkbox">
            <input
              type="checkbox"
              id={`subject-${subject}`}
              checked={filters.subjects?.includes(subject) || false}
              onChange={() => handleCheckboxToggle('subjects', subject)}
            />
            <div
              className="color-indicator"
              style={{ backgroundColor: SUBJECT_COLORS[subject] || '#888' }}
            />
            <label htmlFor={`subject-${subject}`}>{subject}</label>
          </div>
        ))}
      </div>

      {/* Gender Filter */}
      <div className="filter-section">
        <div className="filter-section-title">Genders shown</div>

        {(options.genders || []).map(gender => (
          <div key={gender} className="filter-checkbox">
            <input
              type="checkbox"
              id={`gender-${gender}`}
              checked={filters.genders?.includes(gender) || false}
              onChange={() => handleCheckboxToggle('genders', gender)}
            />
            <label htmlFor={`gender-${gender}`}>
              {gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : gender || 'Not Specified'}
            </label>
          </div>
        ))}
      </div>

      {/* Ethnicity Filter */}
      <div className="filter-section">
        <div className="filter-section-title">Ethnicities shown</div>

        {(options.ethnicities || []).map(ethnicity => (
          <div key={ethnicity} className="filter-checkbox">
            <input
              type="checkbox"
              id={`ethnicity-${ethnicity}`}
              checked={filters.ethnicities?.includes(ethnicity) || false}
              onChange={() => handleCheckboxToggle('ethnicities', ethnicity)}
            />
            <label htmlFor={`ethnicity-${ethnicity}`}>{ethnicity || 'Not Specified or Other'}</label>
          </div>
        ))}
      </div>

      {/* Point Shape By */}
      <div className="filter-section">
        <div className="filter-section-title">Point shape by:</div>

        <div className="filter-radio">
          <input
            type="radio"
            id="shape-subject"
            name="pointShapeBy"
            value="subject"
            checked={filters.pointShapeBy === 'subject'}
            onChange={(e) => handleToggleChange('pointShapeBy', e.target.value)}
          />
          <label htmlFor="shape-subject">Subject (color)</label>
        </div>

        <div className="filter-radio">
          <input
            type="radio"
            id="shape-gender"
            name="pointShapeBy"
            value="gender"
            checked={filters.pointShapeBy === 'gender'}
            onChange={(e) => handleToggleChange('pointShapeBy', e.target.value)}
          />
          <label htmlFor="shape-gender">Gender</label>
        </div>

        <div className="filter-radio">
          <input
            type="radio"
            id="shape-ethnicity"
            name="pointShapeBy"
            value="ethnicity"
            checked={filters.pointShapeBy === 'ethnicity'}
            onChange={(e) => handleToggleChange('pointShapeBy', e.target.value)}
          />
          <label htmlFor="shape-ethnicity">Ethnicity</label>
        </div>
      </div>
    </div>
  );
}

export default ChartFilters;
