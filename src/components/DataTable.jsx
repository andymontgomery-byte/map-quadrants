import { useState, useMemo, useCallback } from 'react';
import { getQuadrant, QUADRANT_COLORS } from '../utils/quadrantLogic';
import { groupBySubject } from '../utils/dataTransforms';

function DataTable({ data, showQuadrantColors }) {
  const [sortConfig, setSortConfig] = useState({ key: 'studentName', direction: 'asc' });
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Group data by course/subject
  const groupedData = useMemo(() => groupBySubject(data), [data]);

  // Sort data within each group
  const sortedGroupedData = useMemo(() => {
    const sorted = {};
    for (const [group, rows] of Object.entries(groupedData)) {
      sorted[group] = [...rows].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        aVal = String(aVal ?? '').toLowerCase();
        bVal = String(bVal ?? '').toLowerCase();
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return sorted;
  }, [groupedData, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const toggleGroup = useCallback((group) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) newSet.delete(group);
      else newSet.add(group);
      return newSet;
    });
  }, []);

  // Get quadrant color for a student
  const getQuadrantColorForStudent = (student) => {
    if (!showQuadrantColors) return '#ffffff';
    const quadrant = getQuadrant(student.winterPercentile, student.conditionalGrowthPercentile);
    return QUADRANT_COLORS[quadrant];
  };

  // Get row class based on quadrant
  const getRowClass = (student) => {
    if (!showQuadrantColors) return '';
    const quadrant = getQuadrant(student.winterPercentile, student.conditionalGrowthPercentile);
    return `row-${quadrant.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  };

  // Format RIT range as "low-mid-high" with mid bolded
  const formatRITRange = (rit, se) => {
    if (rit == null) return '—';
    const low = Math.round(rit - 2 * (se || 0));
    const high = Math.round(rit + 2 * (se || 0));
    return (
      <span>
        {low}-<strong>{Math.round(rit)}</strong>-{high}
      </span>
    );
  };

  // Format percentile range
  const formatPercentileRange = (percentile, se) => {
    if (percentile == null) return '—';
    // Estimate range based on SE (rough approximation)
    const seEstimate = se || 3;
    const low = Math.max(1, Math.round(percentile - seEstimate * 5));
    const high = Math.min(99, Math.round(percentile + seEstimate * 5));
    return (
      <span>
        {low}-<strong>{Math.round(percentile)}</strong>-{high}
      </span>
    );
  };

  // Format date as M/D/YY
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parseInt(parts[1])}/${parseInt(parts[2])}/${parts[0].slice(2)}`;
  };

  // Format Met Projected Growth
  const formatMetGrowth = (value) => {
    if (!value) return '—';
    const isYes = value.toLowerCase().startsWith('yes');
    return <span className={isYes ? 'met-yes' : 'met-no'}>{isYes ? 'Yes' : 'No'}</span>;
  };

  const SortIcon = ({ columnKey }) => {
    const isActive = sortConfig.key === columnKey;
    const icon = isActive && sortConfig.direction === 'desc' ? '▼' : '▲';
    return <span className={`sort-icon ${isActive ? 'active' : ''}`}>{icon}</span>;
  };

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          {/* Tier 1 */}
          <tr className="header-tier-1">
            <th colSpan={4}></th>
            <th colSpan={4}>Achievement Status</th>
            <th colSpan={8}>Growth</th>
          </tr>

          {/* Tier 2 */}
          <tr className="header-tier-2">
            <th colSpan={4}></th>
            <th colSpan={2}>Winter 2025</th>
            <th colSpan={2}>Winter 2026</th>
            <th colSpan={5}>Student</th>
            <th colSpan={3}>Comparative</th>
          </tr>

          {/* Tier 3 - Column Headers */}
          <tr className="header-tier-3">
            <th>Quadrant</th>
            <th onClick={() => handleSort('studentName')}>
              Student Name<br />Student ID <SortIcon columnKey="studentName" />
            </th>
            <th onClick={() => handleSort('grade')}>
              WI 2026<br />Grade <SortIcon columnKey="grade" />
            </th>
            <th onClick={() => handleSort('teststartdate')}>
              WI 2026<br />Date <SortIcon columnKey="teststartdate" />
            </th>
            <th className="numeric">
              RIT Score<br />Range
            </th>
            <th className="numeric">
              Achievement<br />Percentile Range
            </th>
            <th className="numeric">
              RIT Score<br />Range
            </th>
            <th className="numeric">
              Achievement<br />Percentile Range
            </th>
            <th onClick={() => handleSort('projectedRIT')} className="numeric">
              Projected<br />RIT Score <SortIcon columnKey="projectedRIT" />
            </th>
            <th onClick={() => handleSort('projectedGrowth')} className="numeric">
              Projected<br />Growth <SortIcon columnKey="projectedGrowth" />
            </th>
            <th onClick={() => handleSort('observedGrowth')} className="numeric">
              Observed<br />Growth <SortIcon columnKey="observedGrowth" />
            </th>
            <th className="numeric">
              Observed<br />Growth SE
            </th>
            <th onClick={() => handleSort('conditionalGrowthIndex')} className="numeric">
              Growth<br />Index <SortIcon columnKey="conditionalGrowthIndex" />
            </th>
            <th onClick={() => handleSort('metProjectedGrowth')}>
              Met<br />Projected<br />Growth <SortIcon columnKey="metProjectedGrowth" />
            </th>
            <th className="numeric">
              Conditional<br />Growth<br />Index
            </th>
            <th onClick={() => handleSort('conditionalGrowthPercentile')} className="numeric">
              Conditional<br />Growth<br />Percentile <SortIcon columnKey="conditionalGrowthPercentile" />
            </th>
          </tr>
        </thead>

        <tbody>
          {Object.entries(sortedGroupedData).map(([group, rows]) => (
            <>
              {/* Group Header */}
              <tr
                key={`group-${group}`}
                className="subject-group-header"
                onClick={() => toggleGroup(group)}
              >
                <td colSpan={16}>
                  <span className="expand-icon">
                    {collapsedGroups.has(group) ? '▸' : '▾'}
                  </span>
                  <strong>{group}:</strong> {rows.length} students
                </td>
              </tr>

              {/* Group Rows */}
              {!collapsedGroups.has(group) && rows.map((student, idx) => (
                <tr
                  key={`${student.studentid}-${student.subject}-${idx}`}
                  className={getRowClass(student)}
                >
                  {/* Quadrant color box */}
                  <td>
                    <div
                      className="quadrant-box"
                      style={{ backgroundColor: getQuadrantColorForStudent(student) }}
                    />
                  </td>

                  {/* Student Name / ID */}
                  <td>
                    <div>{student.studentName}</div>
                    <div className="student-id">{student.studentid}</div>
                  </td>

                  {/* Grade */}
                  <td>{student.grade}</td>

                  {/* Test Date */}
                  <td>{formatDate(student.teststartdate)}</td>

                  {/* Winter 2025 (Fall/previous) Achievement */}
                  <td className="numeric">{formatRITRange(student.fallRIT, student.teststandarderror)}</td>
                  <td className="numeric">{formatPercentileRange(null, null)}</td>

                  {/* Winter 2026 Achievement */}
                  <td className="numeric">{formatRITRange(student.winterRIT, parseFloat(student.teststandarderror))}</td>
                  <td className="numeric">{formatPercentileRange(student.winterPercentile, parseFloat(student.teststandarderror))}</td>

                  {/* Growth - Student */}
                  <td className="numeric">{student.projectedRIT ?? '—'}</td>
                  <td className="numeric">{student.projectedGrowth?.toFixed(0) ?? '—'}</td>
                  <td className="numeric">{student.observedGrowth?.toFixed(0) ?? '—'}</td>
                  <td className="numeric">{student.growthSE?.toFixed(1) ?? '—'}</td>
                  <td className="numeric">{student.conditionalGrowthIndex != null ? Math.round(student.conditionalGrowthIndex * 100) / 100 : '—'}</td>

                  {/* Growth - Comparative */}
                  <td>{formatMetGrowth(student.metProjectedGrowth)}</td>
                  <td className="numeric">{student.conditionalGrowthIndex?.toFixed(2) ?? '—'}</td>
                  <td className="numeric">{student.conditionalGrowthPercentile ?? '—'}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
