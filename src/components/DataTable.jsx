import { useState, useMemo, useCallback } from 'react';
import { getQuadrant } from '../utils/quadrantLogic';
import { groupBySubject } from '../utils/dataTransforms';

function DataTable({ data, showQuadrantColors }) {
  const [sortConfig, setSortConfig] = useState({ key: 'studentName', direction: 'asc' });
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  // Group data by course/subject
  const groupedData = useMemo(() => {
    return groupBySubject(data);
  }, [data]);

  // Sort data within each group
  const sortedGroupedData = useMemo(() => {
    const sorted = {};
    for (const [group, rows] of Object.entries(groupedData)) {
      sorted[group] = [...rows].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // String comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (sortConfig.direction === 'asc') {
          return aVal.localeCompare(bVal);
        }
        return bVal.localeCompare(aVal);
      });
    }
    return sorted;
  }, [groupedData, sortConfig]);

  // Handle sort
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Toggle group collapse
  const toggleGroup = useCallback((group) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  }, []);

  // Get row class based on quadrant
  const getRowClass = (student) => {
    if (!showQuadrantColors) return '';

    const quadrant = getQuadrant(student.winterPercentile, student.conditionalGrowthPercentile);
    const classMap = {
      highHigh: 'row-high-high',
      lowHigh: 'row-low-high',
      lowLow: 'row-low-low',
      highLow: 'row-high-low',
    };
    return classMap[quadrant] || '';
  };

  // Format Met Projected Growth value
  const formatMetGrowth = (value) => {
    if (!value) return '—';
    const isYes = value.toLowerCase().startsWith('yes');
    return (
      <span className={isYes ? 'met-yes' : 'met-no'}>
        {value}
      </span>
    );
  };

  // Sort icon
  const SortIcon = ({ columnKey }) => {
    const isActive = sortConfig.key === columnKey;
    const icon = isActive && sortConfig.direction === 'desc' ? '▼' : '▲';
    return (
      <span className={`sort-icon ${isActive ? 'active' : ''}`}>
        {icon}
      </span>
    );
  };

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          {/* Tier 1 - Main Categories */}
          <tr className="header-tier-1">
            <th colSpan={4}>Student Information</th>
            <th colSpan={4}>Achievement Status - Fall 2025</th>
            <th colSpan={5}>Achievement Status - Winter 2026</th>
            <th colSpan={4}>Growth - Student</th>
            <th colSpan={4}>Growth - Comparative</th>
          </tr>

          {/* Tier 2 - Sub Categories */}
          <tr className="header-tier-2">
            <th colSpan={4}></th>
            <th colSpan={4}>RIT Score</th>
            <th colSpan={3}>RIT Score</th>
            <th colSpan={2}>Percentile</th>
            <th colSpan={4}></th>
            <th colSpan={4}></th>
          </tr>

          {/* Tier 3 - Column Headers */}
          <tr className="header-tier-3">
            <th onClick={() => handleSort('studentName')}>
              Student Name <SortIcon columnKey="studentName" />
            </th>
            <th onClick={() => handleSort('studentid')}>
              Student ID <SortIcon columnKey="studentid" />
            </th>
            <th onClick={() => handleSort('grade')}>
              Grade <SortIcon columnKey="grade" />
            </th>
            <th onClick={() => handleSort('teststartdate')}>
              Test Date <SortIcon columnKey="teststartdate" />
            </th>

            {/* Fall Achievement */}
            <th onClick={() => handleSort('fallRIT')} className="numeric">
              RIT <SortIcon columnKey="fallRIT" />
            </th>
            <th className="numeric">Range Low</th>
            <th className="numeric">Range High</th>
            <th className="numeric">Percentile</th>

            {/* Winter Achievement */}
            <th onClick={() => handleSort('winterRIT')} className="numeric">
              RIT <SortIcon columnKey="winterRIT" />
            </th>
            <th className="numeric">Range Low</th>
            <th className="numeric">Range High</th>
            <th onClick={() => handleSort('winterPercentile')} className="numeric">
              Percentile <SortIcon columnKey="winterPercentile" />
            </th>
            <th>Quintile</th>

            {/* Growth - Student */}
            <th onClick={() => handleSort('projectedRIT')} className="numeric">
              Proj. RIT <SortIcon columnKey="projectedRIT" />
            </th>
            <th onClick={() => handleSort('projectedGrowth')} className="numeric">
              Proj. Growth <SortIcon columnKey="projectedGrowth" />
            </th>
            <th onClick={() => handleSort('observedGrowth')} className="numeric">
              Obs. Growth <SortIcon columnKey="observedGrowth" />
            </th>
            <th className="numeric">Growth SE</th>

            {/* Growth - Comparative */}
            <th onClick={() => handleSort('metProjectedGrowth')}>
              Met Proj. <SortIcon columnKey="metProjectedGrowth" />
            </th>
            <th onClick={() => handleSort('conditionalGrowthIndex')} className="numeric">
              CGI <SortIcon columnKey="conditionalGrowthIndex" />
            </th>
            <th onClick={() => handleSort('conditionalGrowthPercentile')} className="numeric">
              CGP <SortIcon columnKey="conditionalGrowthPercentile" />
            </th>
            <th>Quintile</th>
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
                <td colSpan={21}>
                  <span className="expand-icon">
                    {collapsedGroups.has(group) ? '+' : '−'}
                  </span>
                  {group} ({rows.length} students)
                </td>
              </tr>

              {/* Group Rows */}
              {!collapsedGroups.has(group) && rows.map((student, idx) => (
                <tr
                  key={`${student.studentid}-${student.subject}-${idx}`}
                  className={getRowClass(student)}
                >
                  <td>{student.studentName}</td>
                  <td>{student.studentid}</td>
                  <td>{student.grade}</td>
                  <td>{student.teststartdate}</td>

                  {/* Fall Achievement */}
                  <td className="numeric">{student.fallRIT ?? '—'}</td>
                  <td className="numeric">—</td>
                  <td className="numeric">—</td>
                  <td className="numeric">—</td>

                  {/* Winter Achievement */}
                  <td className="numeric">{student.winterRIT ?? '—'}</td>
                  <td className="numeric">{student.winterRITLow?.toFixed(0) ?? '—'}</td>
                  <td className="numeric">{student.winterRITHigh?.toFixed(0) ?? '—'}</td>
                  <td className="numeric">{student.winterPercentile ?? '—'}</td>
                  <td>{student.achievementquintile || '—'}</td>

                  {/* Growth - Student */}
                  <td className="numeric">{student.projectedRIT ?? '—'}</td>
                  <td className="numeric">{student.projectedGrowth?.toFixed(1) ?? '—'}</td>
                  <td className="numeric">{student.observedGrowth?.toFixed(1) ?? '—'}</td>
                  <td className="numeric">{student.growthSE?.toFixed(2) ?? '—'}</td>

                  {/* Growth - Comparative */}
                  <td>{formatMetGrowth(student.metProjectedGrowth)}</td>
                  <td className="numeric">{student.conditionalGrowthIndex?.toFixed(2) ?? '—'}</td>
                  <td className="numeric">{student.conditionalGrowthPercentile ?? '—'}</td>
                  <td>{student.growthQuintile || '—'}</td>
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
