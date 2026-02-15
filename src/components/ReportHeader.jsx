import { useMemo, useCallback } from 'react';
import { getTermLabels } from '../utils/termUtils';

function ReportHeader({ selection, data, onEditCriteria, growthPeriod }) {
  const handlePrint = useCallback(() => window.print(), []);

  const handleExport = useCallback(() => {
    if (!data || data.length === 0) return;
    const headers = [
      'Student Name', 'Student ID', 'Grade', 'Subject', 'Course',
      'Test Date', 'Start RIT', 'Start Percentile', 'End RIT', 'End Percentile',
      'Projected RIT', 'Projected Growth', 'Observed Growth', 'Growth SE',
      'Met Projected Growth', 'Conditional Growth Index', 'Conditional Growth Percentile'
    ];
    const rows = data.map(s => [
      s.studentName, s.studentid, s.grade, s.subject, s.course,
      s.teststartdate, s.fallRIT, s.startTermPercentile, s.winterRIT, s.winterPercentile,
      s.projectedRIT, s.projectedGrowth, s.observedGrowth, s.growthSE,
      s.metProjectedGrowth, s.conditionalGrowthIndex, s.conditionalGrowthPercentile
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAP_Quadrant_Report_${selection.termname || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, selection.termname]);
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
    return data[0].normsreferencedata ? `${data[0].normsreferencedata} Norms.` : '—';
  }, [data]);

  // Get dynamic growth period label using termUtils
  const termLabels = useMemo(() => {
    return getTermLabels(selection.termname, growthPeriod);
  }, [selection.termname, growthPeriod]);

  const growthPeriodDisplay = useMemo(() => {
    if (!termLabels.startLabel || !termLabels.endLabel) return '—';
    return `${termLabels.startLabel} - ${termLabels.endLabel}`;
  }, [termLabels]);

  // Format weeks of instruction like NWEA: "Start - 1(Fall 2025) End - 20(Winter 2026)"
  const weeksDisplay = useMemo(() => {
    const startLabel = termLabels.startLabel || 'Start';
    const endLabel = termLabels.endLabel || 'End';
    return `Start - ${weeksOfInstruction.fall} (${startLabel})\nEnd - ${weeksOfInstruction.winter} (${endLabel})`;
  }, [weeksOfInstruction, termLabels]);

  return (
    <div className="report-header">
      <div className="report-header-top">
        <div className="report-title">Achievement Status & Growth Summary with Quadrant Chart</div>
        <div className="report-header-actions">
          <button className="header-action-btn" onClick={handlePrint}>
            Print this Report
          </button>
          <button className="header-action-btn" onClick={handleExport}>
            Export to Spreadsheet
          </button>
          <button className="header-action-btn" onClick={onEditCriteria}>
            Edit Report Criteria
          </button>
        </div>
      </div>

      <div className="report-criteria-grid">
        <div className="criteria-col">
          <div className="criteria-row">
            <span className="criteria-label">Term Tested:</span>
            <span className="criteria-value">{selection.termname || '—'}</span>
          </div>
          <div className="criteria-row">
            <span className="criteria-label">District:</span>
            <span className="criteria-value">
              {selection.districtname === '__all__' ? 'All Districts' : (selection.districtname || '—')}
            </span>
          </div>
          <div className="criteria-row">
            <span className="criteria-label">School:</span>
            <span className="criteria-value">
              {selection.schoolname === '__all__' ? 'All Schools' : (selection.schoolname || '—')}
            </span>
          </div>
          <div className="criteria-row">
            <span className="criteria-label">Instructor:</span>
            <span className="criteria-value">[Instructor Name]</span>
          </div>
        </div>

        <div className="criteria-col">
          <div className="criteria-row">
            <span className="criteria-label">Norms Reference Data:</span>
            <span className="criteria-value">{normsReference}</span>
          </div>
          <div className="criteria-row">
            <span className="criteria-label">Growth Comparison Period:</span>
            <span className="criteria-value">{growthPeriodDisplay}</span>
          </div>
          <div className="criteria-row">
            <span className="criteria-label">Weeks of Instruction:</span>
            <span className="criteria-value" style={{ whiteSpace: 'pre-line' }}>{weeksDisplay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportHeader;
