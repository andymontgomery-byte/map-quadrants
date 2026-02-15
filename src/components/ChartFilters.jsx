import { useCallback } from 'react';
import { SUBJECT_COLORS, SUBJECT_SHAPES } from '../utils/quadrantLogic';

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

        {(options.subjects || []).map(subject => {
          const color = SUBJECT_COLORS[subject] || '#888';
          const shape = SUBJECT_SHAPES[subject] || 'cross';
          return (
            <div key={subject} className="filter-checkbox">
              <input
                type="checkbox"
                id={`subject-${subject}`}
                checked={filters.subjects?.includes(subject) || false}
                onChange={() => handleCheckboxToggle('subjects', subject)}
              />
              <label htmlFor={`subject-${subject}`}>{subject}</label>
              <svg width="14" height="14" viewBox="0 0 14 14" className="shape-indicator">
                {shape === 'cross' && (
                  <>
                    <line x1="2" y1="7" x2="12" y2="7" stroke={color} strokeWidth="2" />
                    <line x1="7" y1="2" x2="7" y2="12" stroke={color} strokeWidth="2" />
                  </>
                )}
                {shape === 'square' && (
                  <rect x="3" y="3" width="8" height="8" fill={color} />
                )}
                {shape === 'circle' && (
                  <circle cx="7" cy="7" r="4" fill={color} />
                )}
                {shape === 'diamond' && (
                  <polygon points="7,2 12,7 7,12 2,7" fill={color} />
                )}
              </svg>
            </div>
          );
        })}
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
