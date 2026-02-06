# MAP Quadrant Report - Data Mapping Document

## Overview
This document maps every value displayed in the MAP Quadrant Report to its source in the CSV data export.

---

## Part 1: Report Header

### Header Fields
| Display Field | CSV Column | Col # | Example Value |
|---------------|------------|-------|---------------|
| Teacher Name | `teachername` | 145 | `Guajardo, Gaby` |
| Term Tested | `termname` | 1 | `Winter 2025-2026` |
| District | `districtname` | 2 | `Alpha` |
| School | `schoolname` | 4 | `Alpha Austin` |
| Norms Reference Date | `normsreferencedata` | 11 | `2025` |
| Fall Weeks of Instruction | `wiselectedayfall` | 12 | `4` |
| Winter Weeks of Instruction | `wiselectedaywinter` | 13 | `20` |
| Spring Weeks of Instruction | `wiselectedayspring` | 14 | (empty) |

### Growth Comparison Period
**Not a single column** - derived from which growth columns have data.

The report header shows "Fall 2025 - Winter 2026" when using `falltowinter*` columns.

---

## Part 2: Quadrant Chart

### Axes

| Axis | CSV Column | Col # | Range | Description |
|------|------------|-------|-------|-------------|
| **X-axis** (horizontal) | `testpercentile` | 26 | 0-100 | Achievement Percentile for the END term |
| **Y-axis** (vertical) | `{period}conditionalgrowthpercentile` | varies | 0-100 | Conditional Growth Percentile |

### Y-axis Column by Growth Period
| Growth Period | CSV Column | Col # |
|---------------|------------|-------|
| Fall to Winter | `falltowinterconditionalgrowthpercentile` | 42 |
| Fall to Spring | `falltospringconditionalgrowthpercentile` | 49 |
| Winter to Spring | `wintertospringconditionalgrowthpercentile` | 63 |
| Fall to Fall | `falltofallconditionalgrowthpercentile` | 35 |
| Winter to Winter | `wintertowinterconditionalgrowthpercentile` | 56 |
| Spring to Spring | `springtospringconditionalgrowthpercentile` | 70 |

### Quadrant Determination
| Quadrant | X Condition | Y Condition | Color |
|----------|-------------|-------------|-------|
| High Achievement / High Growth | ≥ 50 | ≥ 50 | Green |
| Low Achievement / High Growth | < 50 | ≥ 50 | Yellow |
| Low Achievement / Low Growth | < 50 | < 50 | Pink/Red |
| High Achievement / Low Growth | ≥ 50 | < 50 | Pale Green |

### Student Point Labels
| Field | CSV Columns | Format |
|-------|-------------|--------|
| Student Name | `studentlastname`, `studentfirstname` | `{lastname}, {firstname initial}` |

---

## Part 3: Chart Filter Panel

### Subject Checkboxes
| Display | CSV `subject` Value | CSV `course` Value | Color Indicator |
|---------|---------------------|--------------------|----|
| Math K-12 | `Math` | `Math K-12` | Yellow |
| Language Arts | `Language Arts` or `Language` | `Language Usage` | Blue |
| Reading | `Reading` | `Reading` | Red |
| Language Usage | `Language` | `Language Usage` | Purple |
| Science K-12 | `Science` | `Science K-12` | Green |

### Gender Checkboxes
| Display | CSV `studentgender` Value |
|---------|---------------------------|
| Female | `F` |
| Male | `M` |

### Ethnicity Checkboxes
| Display | CSV `studentethnicgroup` Value |
|---------|--------------------------------|
| Not Specified or Other | `Not Specified or Other` |
| White | `White` |
| Multi-ethnic | `Multi-ethnic` |
| American Indian or Alaska Native | `American Indian or Alaska Native` |

---

## Part 4: Data Table

### Student Identification Columns
| Table Column | CSV Column | Col # | Example |
|--------------|------------|-------|---------|
| Student Name | `studentlastname`, `studentfirstname` | 148, 149 | `Shinar, Edgar` |
| Student ID | `studentid` | 6 | `001-0428` |
| WI 2026 Grade | `grade` | 155 | `6` |
| WI 2026 Date | `teststartdate` | 21 | `2026-02-02` |

### Achievement Status - Fall Column Group

These values are **CALCULATED** from Winter data:

| Table Column | Calculation | Example |
|--------------|-------------|---------|
| Fall RIT Score | `testritscore - falltowinterobservedgrowth` | `236 - 4 = 232` |
| Fall RIT Range Low | `Fall RIT - 2 * teststandarderror` | `232 - 6.7 = 225` |
| Fall RIT Range High | `Fall RIT + 2 * teststandarderror` | `232 + 6.7 = 239` |
| Fall Achievement Percentile | Not available in export | — |

**Note:** Fall Achievement Percentile requires the Fall term record, which may not be in this export. If fall-to-winter growth data exists, the Fall RIT can be calculated, but the Fall percentile would need a separate lookup.

### Achievement Status - Winter Column Group
| Table Column | CSV Column | Col # | Example |
|--------------|------------|-------|---------|
| Winter RIT Score | `testritscore` | 24 | `236` |
| Winter RIT Range Low | `testritscore - 2 * teststandarderror` | 24, 25 | `236 - 6.7 = 229` |
| Winter RIT Range High | `testritscore + 2 * teststandarderror` | 24, 25 | `236 + 6.7 = 243` |
| Winter Achievement Percentile | `testpercentile` | 26 | `94` |
| Achievement Quintile | `achievementquintile` | 27 | `High` |

### Growth - Student Column Group

**Column varies by Growth Period.** Using Fall-to-Winter as example:

| Table Column | CSV Column | Col # | Example |
|--------------|------------|-------|---------|
| Projected RIT Score | `(testritscore - falltowinterobservedgrowth) + falltowinterprojectedgrowth` | calc | `232 + 1 = 233` |
| Projected Growth | `falltowinterprojectedgrowth` | 37 | `1.0` |
| Observed Growth | `falltowinterobservedgrowth` | 38 | `4.0` |
| Growth SE | `falltowinterobservedgrowthse` | 39 | `4.67` |

### Growth - Comparative Column Group

| Table Column | CSV Column | Col # | Example |
|--------------|------------|-------|---------|
| Met Projected Growth | `falltowintermetprojectedgrowth` | 40 | `Yes`, `No`, `Yes*`, `No*` |
| Conditional Growth Index | `falltowinterconditionalgrowthindex` | 41 | `0.62` |
| Conditional Growth Percentile | `falltowinterconditionalgrowthpercentile` | 42 | `73` |
| Growth Quintile | `falltowintergrowthquintile` | 43 | `HiAvg` |

---

## Part 5: Growth Period Column Reference

### Fall to Winter (cols 37-43)
| Field | Column Name | Col # |
|-------|-------------|-------|
| Projected Growth | `falltowinterprojectedgrowth` | 37 |
| Observed Growth | `falltowinterobservedgrowth` | 38 |
| Observed Growth SE | `falltowinterobservedgrowthse` | 39 |
| Met Projected Growth | `falltowintermetprojectedgrowth` | 40 |
| Conditional Growth Index | `falltowinterconditionalgrowthindex` | 41 |
| Conditional Growth Percentile | `falltowinterconditionalgrowthpercentile` | 42 |
| Growth Quintile | `falltowintergrowthquintile` | 43 |

### Fall to Spring (cols 44-50)
| Field | Column Name | Col # |
|-------|-------------|-------|
| Projected Growth | `falltospringprojectedgrowth` | 44 |
| Observed Growth | `falltospringobservedgrowth` | 45 |
| Observed Growth SE | `falltospringobservedgrowthse` | 46 |
| Met Projected Growth | `falltospringmetprojectedgrowth` | 47 |
| Conditional Growth Index | `falltospringconditionalgrowthindex` | 48 |
| Conditional Growth Percentile | `falltospringconditionalgrowthpercentile` | 49 |
| Growth Quintile | `falltospringgrowthquintile` | 50 |

### Winter to Spring (cols 58-64)
| Field | Column Name | Col # |
|-------|-------------|-------|
| Projected Growth | `wintertospringprojectedgrowth` | 58 |
| Observed Growth | `wintertospringobservedgrowth` | 59 |
| Observed Growth SE | `wintertospringobservedgrowthse` | 60 |
| Met Projected Growth | `wintertospringmetprojectedgrowth` | 61 |
| Conditional Growth Index | `wintertospringconditionalgrowthindex` | 62 |
| Conditional Growth Percentile | `wintertospringconditionalgrowthpercentile` | 63 |
| Growth Quintile | `wintertospringgrowthquintile` | 64 |

---

## Part 6: Verification Example

### Student: Shinar, Edgar (001-0428) - Reading

**Raw CSV Values:**
```
studentid: 001-0428
studentlastname: Shinar
studentfirstname: Edgar
subject: Reading
teststartdate: 2026-02-02
testritscore: 236
teststandarderror: 3.35
testpercentile: 94
falltowinterprojectedgrowth: 1.0
falltowinterobservedgrowth: 4.0
falltowinterobservedgrowthse: 4.67
falltowintermetprojectedgrowth: Yes*
falltowinterconditionalgrowthindex: 0.62
falltowinterconditionalgrowthpercentile: 73.0
```

**Calculated Values:**
```
Fall RIT Score: 236 - 4 = 232
Projected RIT Score: 232 + 1 = 233
Winter RIT Range: 229-236-243 (236 ± 2*3.35)
```

**Chart Position:**
```
X (Achievement Percentile): 94
Y (Conditional Growth Percentile): 73
Quadrant: High Achievement / High Growth (green)
```

---

## Part 7: Dynamic Table Headers

The table headers dynamically change based on the selected **growth period**. The header terms are calculated from the term name and growth period using `src/utils/termUtils.js`.

### Header Calculation Logic

Given a term like "Winter 2025-2026" (startYear=2025, endYear=2026):

| Growth Period | Start Header | End Header | Tier 3 Code |
|---------------|--------------|------------|-------------|
| Fall to Winter | Fall 2025 | Winter 2026 | WI 2026 |
| Winter to Winter | Winter 2025 | Winter 2026 | WI 2026 |
| Fall to Spring | Fall 2024 | Spring 2025 | SP 2025 |
| Winter to Spring | Winter 2025 | Spring 2025 | SP 2025 |
| Spring to Spring | Spring 2024 | Spring 2025 | SP 2025 |
| Fall to Fall | Fall 2024 | Fall 2025 | FA 2025 |

### Table Structure

**Tier 1** (static):
- Empty (4 cols)
- "Achievement Status" (4 cols)
- "Growth" (8 cols)

**Tier 2** (dynamic based on growth period):
- Empty (4 cols)
- Start Term: e.g., "Fall 2025" (2 cols)
- End Term: e.g., "Winter 2026" (2 cols)
- "Student" (5 cols)
- "Comparative" (3 cols)

**Tier 3** (column headers, dynamic prefix):
- Columns 3 & 4 use the end term code: "{endCode}Grade", "{endCode}Date"
- Example: "WI 2026Grade", "WI 2026Date"

### Implementation

```javascript
// src/utils/termUtils.js
const labels = getTermLabels('Winter 2025-2026', 'falltowinter');
// Returns:
// {
//   startLabel: 'Fall 2025',
//   endLabel: 'Winter 2026',
//   startCode: 'FA 2025',
//   endCode: 'WI 2026',
//   ...
// }
```

---

## Part 8: Deduplication Rules

### Historical Data (2017-2023)
Filter: `growthmeasureyn = 'true'`
Result: One record per student/subject/term

### Current Data (2023-2024+)
`growthmeasureyn` is empty for recent terms.

**Deduplication logic:**
1. Group by `studentid` + `subject` + `termname`
2. Keep the row with the **highest `testritscore`**

This handles:
- Same student rostered to multiple teachers (identical scores)
- Multiple test attempts in same term (keep best score)

---

## Part 9: Chart Eligibility

A student appears on the quadrant chart only if they have:

1. **X-axis value**: `testpercentile` is not empty
2. **Y-axis value**: `{period}conditionalgrowthpercentile` is not empty

Students without growth data (no fall baseline test) will not appear on the chart.

**Winter 2025-2026 Data:**
- Total unique student-subject: 4,288
- With fall-to-winter growth data: ~4,701 (some have multiple subjects)
- Without growth data: Won't appear on chart

---

## Part 10: Level Filter Mapping

### Level to Grade Mapping

The Level filter maps to NWEA's Class filter structure. Each level corresponds to specific grades:

| Level Code | Level Name | Grades Included |
|------------|------------|-----------------|
| WL | Willing Learners (Pre-K) | PK |
| LL | Little Learners (K-1) | K, 1 |
| L1 | Level 1 (2-3) | 2, 3 |
| L2 | Level 2 (4-5) | 4, 5 |
| MS | Middle School (6-8) | 6, 7, 8 |
| HS | High School (9-12) | 9, 10, 11, 12 |

### NWEA Class to Level Mapping

When comparing with NWEA reports, use these equivalences:

| NWEA Class Name | Our Level Filter |
|-----------------|------------------|
| WL / Willing Learners | WL |
| LL / Little Learners | LL |
| L1 / Level 1 | L1 |
| L2 / Level 2 | L2 |
| MS / Middle School | MS |
| HS / High School | HS |

### Implementation

```javascript
// src/components/FilterSelection.jsx
const LEVEL_GRADES = {
  WL: ['PK'],
  LL: ['K', '1'],
  L1: ['2', '3'],
  L2: ['4', '5'],
  MS: ['6', '7', '8'],
  HS: ['9', '10', '11', '12'],
};
```

### Usage Notes

- When Level is selected, the grades array is automatically populated
- Level filter is optional - selecting "All Levels" includes all grades
- The CSV `grade` column values must match: `PK`, `K`, `1`, `2`, ... `12`
