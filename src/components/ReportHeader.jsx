import { useMemo } from 'react';

function ReportHeader({ selection, data, onEditCriteria }) {
  // Get weeks of instruction from first row of data
  const weeksOfInstruction = useMemo(() => {
    if (!data || data.length === 0) return { fall: '—', winter: '—' };

    const row = data[0];
    return {
      fall: row.wiselectedayfall || '—',
      winter: row.wiselectedaywinter || '—',
    };
  }, [data]);

  // Get norms reference from first row
  const normsReference = useMemo(() => {
    if (!data || data.length === 0) return '—';
    return data[0].normsreferencedata ? `${data[0].normsreferencedata} Norms` : '—';
  }, [data]);

  // Parse term for growth period display
  const growthPeriod = useMemo(() => {
    const term = selection.termname || '';
    // Extract year range, e.g., "Winter 2025-2026" -> "Fall 2025 - Winter 2026"
    const match = term.match(/(\w+)\s+(\d{4})-(\d{4})/);
    if (!match) return '—';

    const [, season, startYear, endYear] = match;

    if (season === 'Winter') {
      return `Fall ${startYear} - Winter ${endYear}`;
    } else if (season === 'Spring') {
      return `Fall ${startYear} - Spring ${endYear}`;
    }
    return '—';
  }, [selection.termname]);

  return (
    <div className="report-header">
      <div className="report-header-top">
        <div className="report-title">Achievement Status and Growth Summary Report</div>
        <div className="report-header-actions">
          <button className="edit-criteria-btn" onClick={onEditCriteria}>
            Edit Report Criteria
          </button>
        </div>
      </div>

      <div className="report-criteria">
        <div className="criteria-item">
          <span className="criteria-label">Term Tested:</span>
          <span className="criteria-value">{selection.termname || '—'}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">District:</span>
          <span className="criteria-value">{selection.districtname || '—'}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">School:</span>
          <span className="criteria-value">{selection.schoolname || '—'}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">Norms Reference:</span>
          <span className="criteria-value">{normsReference}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">Growth Comparison Period:</span>
          <span className="criteria-value">{growthPeriod}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">Weeks of Instruction:</span>
          <span className="criteria-value">
            {weeksOfInstruction.fall} (Fall), {weeksOfInstruction.winter} (Winter)
          </span>
        </div>

        {selection.grades && selection.grades.length > 0 && (
          <div className="criteria-item">
            <span className="criteria-label">Grade:</span>
            <span className="criteria-value">{selection.grades.join(', ')}</span>
          </div>
        )}

        <div className="criteria-item">
          <span className="criteria-label">Total Students:</span>
          <span className="criteria-value">{data.length}</span>
        </div>
      </div>
    </div>
  );
}

export default ReportHeader;
