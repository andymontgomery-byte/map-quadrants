import { useState, useCallback, useMemo, useEffect } from 'react';
import FilterSelection from './components/FilterSelection';
import ReportHeader from './components/ReportHeader';
import QuadrantChart from './components/QuadrantChart';
import ChartFilters from './components/ChartFilters';
import DataTable from './components/DataTable';
import QuadrantLegend from './components/QuadrantLegend';
import { fetchAndParseCSV, getUniqueValues } from './utils/csvParser';
import { deduplicateData, filterData, processData, getChartEligibleStudents } from './utils/dataTransforms';

const DATA_URL = import.meta.env.BASE_URL + 'data.csv';

function App() {
  // View state
  const [view, setView] = useState('selection'); // 'selection' or 'report'

  // Data state
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Load CSV data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, errors } = await fetchAndParseCSV(DATA_URL);

        if (errors.length > 0) {
          console.warn('CSV parse warnings:', errors);
        }

        // Deduplicate the data
        const deduplicated = deduplicateData(data);
        setRawData(deduplicated);

      } catch (err) {
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Get available options from raw data
  const availableOptions = useMemo(() => {
    if (rawData.length === 0) return {};

    return {
      terms: getUniqueValues(rawData, 'termname'),
      districts: getUniqueValues(rawData, 'districtname'),
      schools: getUniqueValues(rawData, 'schoolname'),
      grades: getUniqueValues(rawData, 'grade'),
      subjects: getUniqueValues(rawData, 'subject'),
      genders: getUniqueValues(rawData, 'studentgender'),
      ethnicities: getUniqueValues(rawData, 'studentethnicgroup'),
    };
  }, [rawData]);

  // Filter schools by selected district
  const filteredSchools = useMemo(() => {
    if (!selection.districtname || rawData.length === 0) return availableOptions.schools || [];

    const schoolsInDistrict = new Set();
    for (const row of rawData) {
      if (row.districtname === selection.districtname && row.schoolname) {
        schoolsInDistrict.add(row.schoolname);
      }
    }
    return Array.from(schoolsInDistrict).sort();
  }, [rawData, selection.districtname, availableOptions.schools]);

  // Generate report - apply selection filters
  const handleGenerateReport = useCallback(() => {
    // Initialize report filters with all available values checked
    const filteredBySelection = filterData(rawData, selection);
    const subjects = getUniqueValues(filteredBySelection, 'subject');
    const genders = getUniqueValues(filteredBySelection, 'studentgender');
    const ethnicities = getUniqueValues(filteredBySelection, 'studentethnicgroup');

    setReportFilters({
      subjects: subjects,
      genders: genders,
      ethnicities: ethnicities,
      showNames: true,
      showQuadrantColors: true,
      pointShapeBy: 'subject',
    });

    setView('report');
  }, [rawData, selection]);

  // Process data for report display
  const reportData = useMemo(() => {
    if (view !== 'report' || rawData.length === 0) return [];

    // Apply selection filters first
    let data = filterData(rawData, selection);

    // Apply report-level filters
    data = filterData(data, {
      subjects: reportFilters.subjects,
      genders: reportFilters.genders,
      ethnicities: reportFilters.ethnicities,
    });

    // Calculate derived values
    return processData(data, 'falltowinter');
  }, [rawData, selection, reportFilters, view]);

  // Get chart-eligible students (have both X and Y axis values)
  const chartData = useMemo(() => {
    return getChartEligibleStudents(reportData);
  }, [reportData]);

  // Available filter options in report view (from selection-filtered data)
  const reportFilterOptions = useMemo(() => {
    if (view !== 'report' || rawData.length === 0) return {};

    const filteredBySelection = filterData(rawData, selection);

    return {
      subjects: getUniqueValues(filteredBySelection, 'subject'),
      genders: getUniqueValues(filteredBySelection, 'studentgender'),
      ethnicities: getUniqueValues(filteredBySelection, 'studentethnicgroup'),
    };
  }, [rawData, selection, view]);

  // Handle going back to filter selection
  const handleEditCriteria = useCallback(() => {
    setView('selection');
  }, []);

  // Render based on current view
  if (view === 'selection') {
    return (
      <div className="app">
        <FilterSelection
          isLoading={isLoading}
          error={error}
          hasData={rawData.length > 0}
          availableOptions={availableOptions}
          filteredSchools={filteredSchools}
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
          data={reportData}
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
          data={reportData}
          showQuadrantColors={reportFilters.showQuadrantColors}
        />
      </div>
    </div>
  );
}

export default App;
