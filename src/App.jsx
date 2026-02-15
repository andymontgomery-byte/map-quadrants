import { useState, useCallback, useMemo, useEffect } from 'react';
import FilterSelection from './components/FilterSelection';
import ReportHeader from './components/ReportHeader';
import QuadrantChart from './components/QuadrantChart';
import ChartFilters from './components/ChartFilters';
import DataTable from './components/DataTable';
import { getUniqueValues } from './utils/csvParser';
import { filterData, processData, getChartEligibleStudents } from './utils/dataTransforms';
import { getPriorTermName, getTermLabels } from './utils/termUtils';

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
    level: '',
    grades: [],
    growthPeriod: '',
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
      const termData = metadata.terms[selection.termname];

      if (selection.districtname === '__all__') {
        // All districts selected - collect all schools from all districts
        const allSchools = new Set();
        const aggregatedMeta = { grades: new Set(), subjects: new Set(), genders: new Set(), ethnicities: new Set(), growthPeriods: new Set(), count: 0 };

        for (const districtData of Object.values(termData.districts)) {
          for (const [schoolName, schoolData] of Object.entries(districtData.schools)) {
            allSchools.add(schoolName);
            if (selection.schoolname === '__all__' || selection.schoolname === schoolName) {
              schoolData.grades?.forEach(g => aggregatedMeta.grades.add(g));
              schoolData.subjects?.forEach(s => aggregatedMeta.subjects.add(s));
              schoolData.genders?.forEach(g => aggregatedMeta.genders.add(g));
              schoolData.ethnicities?.forEach(e => aggregatedMeta.ethnicities.add(e));
              schoolData.growthPeriods?.forEach(gp => aggregatedMeta.growthPeriods.add(gp));
              aggregatedMeta.count += schoolData.count || 0;
            }
          }
        }
        schools = Array.from(allSchools).sort();
        if (selection.schoolname === '__all__' || selection.schoolname) {
          schoolMeta = {
            grades: Array.from(aggregatedMeta.grades).sort(),
            subjects: Array.from(aggregatedMeta.subjects).sort(),
            genders: Array.from(aggregatedMeta.genders).sort(),
            ethnicities: Array.from(aggregatedMeta.ethnicities).sort(),
            growthPeriods: Array.from(aggregatedMeta.growthPeriods).sort(),
            count: aggregatedMeta.count,
          };
        }
      } else {
        // Specific district selected
        const districtData = termData?.districts[selection.districtname];
        if (districtData) {
          schools = Object.keys(districtData.schools).sort();

          if (selection.schoolname === '__all__') {
            // All schools in this district
            const aggregatedMeta = { grades: new Set(), subjects: new Set(), genders: new Set(), ethnicities: new Set(), growthPeriods: new Set(), count: 0 };
            for (const schoolData of Object.values(districtData.schools)) {
              schoolData.grades?.forEach(g => aggregatedMeta.grades.add(g));
              schoolData.subjects?.forEach(s => aggregatedMeta.subjects.add(s));
              schoolData.genders?.forEach(g => aggregatedMeta.genders.add(g));
              schoolData.ethnicities?.forEach(e => aggregatedMeta.ethnicities.add(e));
              schoolData.growthPeriods?.forEach(gp => aggregatedMeta.growthPeriods.add(gp));
              aggregatedMeta.count += schoolData.count || 0;
            }
            schoolMeta = {
              grades: Array.from(aggregatedMeta.grades).sort(),
              subjects: Array.from(aggregatedMeta.subjects).sort(),
              genders: Array.from(aggregatedMeta.genders).sort(),
              ethnicities: Array.from(aggregatedMeta.ethnicities).sort(),
              growthPeriods: Array.from(aggregatedMeta.growthPeriods).sort(),
              count: aggregatedMeta.count,
            };
          } else if (selection.schoolname) {
            schoolMeta = districtData.schools[selection.schoolname];
          }
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
      growthPeriods: schoolMeta?.growthPeriods || [],
      studentCount: schoolMeta?.count || 0,
    };
  }, [metadata, selection]);

  // Load school data and generate report
  const handleGenerateReport = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);

    try {
      // Determine which files to load based on selection
      const filesToLoad = [];
      const termData = metadata?.terms[selection.termname];

      if (selection.districtname === '__all__') {
        // All districts selected
        for (const [districtName, districtData] of Object.entries(termData?.districts || {})) {
          if (selection.schoolname === '__all__') {
            // All districts + all schools: load everything
            for (const schoolName of Object.keys(districtData.schools || {})) {
              filesToLoad.push({
                path: `${BASE_URL}data/${sanitize(selection.termname)}/${sanitize(districtName)}/${sanitize(schoolName)}.json`,
                district: districtName,
                school: schoolName,
              });
            }
          } else {
            // All districts + specific school: only load that school if it exists in this district
            if (districtData.schools[selection.schoolname]) {
              filesToLoad.push({
                path: `${BASE_URL}data/${sanitize(selection.termname)}/${sanitize(districtName)}/${sanitize(selection.schoolname)}.json`,
                district: districtName,
                school: selection.schoolname,
              });
            }
          }
        }
      } else if (selection.schoolname === '__all__') {
        // Load all schools from selected district
        const districtData = termData?.districts[selection.districtname];
        for (const schoolName of Object.keys(districtData?.schools || {})) {
          filesToLoad.push({
            path: `${BASE_URL}data/${sanitize(selection.termname)}/${sanitize(selection.districtname)}/${sanitize(schoolName)}.json`,
            district: selection.districtname,
            school: schoolName,
          });
        }
      } else {
        // Load single school
        filesToLoad.push({
          path: `${BASE_URL}data/${sanitize(selection.termname)}/${sanitize(selection.districtname)}/${sanitize(selection.schoolname)}.json`,
          district: selection.districtname,
          school: selection.schoolname,
        });
      }

      // Fetch all files in parallel
      const responses = await Promise.all(
        filesToLoad.map(async (file) => {
          const response = await fetch(file.path);
          if (!response.ok) throw new Error(`HTTP ${response.status} loading ${file.school}`);
          const data = await response.json();
          return data;
        })
      );

      // Merge all data
      const rawData = responses.flat();

      // Apply grade filter if selected
      let filteredData = rawData;
      if (selection.grades.length > 0) {
        filteredData = rawData.filter(r => selection.grades.includes(r.grade));
      }

      // Process data with calculations using selected growth period
      const growthPeriod = selection.growthPeriod || 'falltowinter';

      // Try to load prior term data for start term percentile
      let priorTermLookup = null;
      const priorTermName = getPriorTermName(selection.termname, growthPeriod);

      if (priorTermName && metadata?.terms[priorTermName]) {
        try {
          // Build list of prior term files to load (same schools)
          const priorFilesToLoad = [];
          const priorTermData = metadata.terms[priorTermName];

          for (const file of filesToLoad) {
            // Check if the school exists in the prior term
            const districtData = priorTermData?.districts[file.district];
            if (districtData?.schools[file.school]) {
              priorFilesToLoad.push({
                path: `${BASE_URL}data/${sanitize(priorTermName)}/${sanitize(file.district)}/${sanitize(file.school)}.json`,
                district: file.district,
                school: file.school,
              });
            }
          }

          if (priorFilesToLoad.length > 0) {
            const priorResponses = await Promise.all(
              priorFilesToLoad.map(async (file) => {
                try {
                  const response = await fetch(file.path);
                  if (response.ok) {
                    return await response.json();
                  }
                } catch (e) {
                  // Silently ignore missing prior term data
                }
                return [];
              })
            );

            // Build lookup map: studentid|subject -> prior term data
            const priorData = priorResponses.flat();
            priorTermLookup = {};
            for (const row of priorData) {
              const key = `${row.studentid}|${row.subject}`;
              // Keep the most recent prior term record per student/subject
              if (!priorTermLookup[key] || row.teststartdate > priorTermLookup[key].teststartdate) {
                priorTermLookup[key] = row;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load prior term data:', e);
        }
      }

      const termLabels = getTermLabels(selection.termname, growthPeriod);
      const processed = processData(filteredData, growthPeriod, priorTermLookup, termLabels.startSeason, termLabels.endSeason);
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
  }, [selection, metadata]);

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
          growthPeriod={selection.growthPeriod}
        />

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
          termname={selection.termname}
          growthPeriod={selection.growthPeriod}
        />
      </div>
    </div>
  );
}

export default App;
