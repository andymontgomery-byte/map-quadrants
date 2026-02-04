import { useState, useCallback, useMemo, useEffect } from 'react';
import FilterSelection from './components/FilterSelection';
import ReportHeader from './components/ReportHeader';
import QuadrantChart from './components/QuadrantChart';
import ChartFilters from './components/ChartFilters';
import DataTable from './components/DataTable';
import QuadrantLegend from './components/QuadrantLegend';
import { getUniqueValues } from './utils/csvParser';
import { filterData, processData, getChartEligibleStudents } from './utils/dataTransforms';

const BASE_URL = import.meta.env.BASE_URL;

// Sanitize string to match build script output
function sanitize(str) {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
}

function App() {
  // View state
  const [view, setView] = useState('selection'); // 'selection' or 'report'

  // Metadata state (small, loads fast)
  const [metadata, setMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState(null);

  // Report data state (loaded on demand)
  const [reportData, setReportData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Selection filters (for initial report generation)
  const [selection, setSelection] = useState({
    termname: '',
    schoolname: '',
    districtname: '',
    grades: [],
  });

  // Report-level filters (for interactive filtering in report view)
  const [reportFilters, setReportFilters] = useState({
    subjects: [],
    genders: [],
    ethnicities: [],
    showNames: true,
    showQuadrantColors: true,
    pointShapeBy: 'subject',
  });

  // Load metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      setMetadataLoading(true);
      setMetadataError(null);

      try {
        const response = await fetch(`${BASE_URL}data/metadata.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        setMetadataError(`Failed to load metadata: ${err.message}`);
      } finally {
        setMetadataLoading(false);
      }
    }

    loadMetadata();
  }, []);

  // Compute available options from metadata based on current selection
  const availableOptions = useMemo(() => {
    if (!metadata) return {};

    const terms = Object.keys(metadata.terms).sort();

    let districts = [];
    if (selection.termname && metadata.terms[selection.termname]) {
      districts = Object.keys(metadata.terms[selection.termname].districts).sort();
    }

    let schools = [];
    let schoolMeta = null;
    if (selection.termname && selection.districtname) {
      const districtData = metadata.terms[selection.termname]?.districts[selection.districtname];
      if (districtData) {
        schools = Object.keys(districtData.schools).sort();
        if (selection.schoolname) {
          schoolMeta = districtData.schools[selection.schoolname];
        }
      }
    }

    return {
      terms,
      districts,
      schools,
      grades: schoolMeta?.grades || [],
      subjects: schoolMeta?.subjects || [],
      genders: schoolMeta?.genders || [],
      ethnicities: schoolMeta?.ethnicities || [],
      studentCount: schoolMeta?.count || 0,
    };
  }, [metadata, selection]);

  // Load school data and generate report
  const handleGenerateReport = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);

    try {
      // Build path to data file
      const dataPath = `${BASE_URL}data/${sanitize(selection.termname)}/${sanitize(selection.districtname)}/${sanitize(selection.schoolname)}.json`;

      const response = await fetch(dataPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawData = await response.json();

      // Apply grade filter if selected
      let filteredData = rawData;
      if (selection.grades.length > 0) {
        filteredData = rawData.filter(r => selection.grades.includes(r.grade));
      }

      // Process data with calculations
      const processed = processData(filteredData, 'falltowinter');
      setReportData(processed);

      // Initialize report filters with all available values
      const subjects = getUniqueValues(processed, 'subject');
      const genders = getUniqueValues(processed, 'studentgender');
      const ethnicities = getUniqueValues(processed, 'studentethnicgroup');

      setReportFilters({
        subjects,
        genders,
        ethnicities,
        showNames: true,
        showQuadrantColors: true,
        pointShapeBy: 'subject',
      });

      setView('report');
    } catch (err) {
      setDataError(`Failed to load data: ${err.message}`);
    } finally {
      setDataLoading(false);
    }
  }, [selection]);

  // Filter report data based on report-level filters
  const filteredReportData = useMemo(() => {
    if (reportData.length === 0) return [];

    return filterData(reportData, {
      subjects: reportFilters.subjects,
      genders: reportFilters.genders,
      ethnicities: reportFilters.ethnicities,
    });
  }, [reportData, reportFilters]);

  // Get chart-eligible students (have both X and Y axis values)
  const chartData = useMemo(() => {
    return getChartEligibleStudents(filteredReportData);
  }, [filteredReportData]);

  // Available filter options in report view
  const reportFilterOptions = useMemo(() => {
    return {
      subjects: getUniqueValues(reportData, 'subject'),
      genders: getUniqueValues(reportData, 'studentgender'),
      ethnicities: getUniqueValues(reportData, 'studentethnicgroup'),
    };
  }, [reportData]);

  // Handle going back to filter selection
  const handleEditCriteria = useCallback(() => {
    setView('selection');
  }, []);

  // Render based on current view
  if (view === 'selection') {
    return (
      <div className="app">
        <FilterSelection
          isLoading={metadataLoading || dataLoading}
          error={metadataError || dataError}
          hasData={metadata !== null}
          availableOptions={availableOptions}
          selection={selection}
          onSelectionChange={setSelection}
          onGenerate={handleGenerateReport}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="report">
        <ReportHeader
          selection={selection}
          data={filteredReportData}
          onEditCriteria={handleEditCriteria}
        />

        <QuadrantLegend />

        <div className="report-content">
          <div className="quadrant-chart-container">
            <QuadrantChart
              data={chartData}
              showNames={reportFilters.showNames}
              showQuadrantColors={reportFilters.showQuadrantColors}
            />
          </div>

          <ChartFilters
            options={reportFilterOptions}
            filters={reportFilters}
            onFiltersChange={setReportFilters}
          />
        </div>

        <DataTable
          data={filteredReportData}
          showQuadrantColors={reportFilters.showQuadrantColors}
        />
      </div>
    </div>
  );
}

export default App;
