import { useMemo } from 'react';
import { getTermLabels } from '../utils/termUtils';

function ReportHeader({ selection, data, onEditCriteria, growthPeriod }) {
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

  // Get dynamic growth period label using termUtils
  const growthPeriodDisplay = useMemo(() => {
    const labels = getTermLabels(selection.termname, growthPeriod);
    if (!labels.startLabel || !labels.endLabel) return '—';
    return `${labels.startLabel} - ${labels.endLabel}`;
  }, [selection.termname, growthPeriod]);

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
          <span className="criteria-value">
            {selection.districtname === '__all__' ? 'All Districts' : (selection.districtname || '—')}
          </span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">School:</span>
          <span className="criteria-value">
            {selection.schoolname === '__all__' ? 'All Schools' : (selection.schoolname || '—')}
          </span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">Norms Reference:</span>
          <span className="criteria-value">{normsReference}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">Growth Comparison Period:</span>
          <span className="criteria-value">{growthPeriodDisplay}</span>
        </div>

        <div className="criteria-item">
          <span className="criteria-label">Weeks of Instruction:</span>
          <span className="criteria-value">
            {weeksOfInstruction.fall} (Fall), {weeksOfInstruction.winter} (Winter)
          </span>
        </div>

        {selection.level && (
          <div className="criteria-item">
            <span className="criteria-label">Level:</span>
            <span className="criteria-value">{selection.level} (Grades {selection.grades.join(', ')})</span>
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
