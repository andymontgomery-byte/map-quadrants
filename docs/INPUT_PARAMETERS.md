# MAP Quadrant Report - Input Parameters

## Overview
The MAP Quadrant Report requires several input parameters to filter and display student data. These parameters determine which students appear in the report and which growth comparison is used.

---

## Required Parameters

### 1. Term Tested (termname)
The testing term to report on.

**CSV Column:** `termname` (col 1)

**Allowed Values:**
| Term | Format | Example |
|------|--------|---------|
| Fall | `Fall YYYY-YYYY` | `Fall 2025-2026` |
| Winter | `Winter YYYY-YYYY` | `Winter 2025-2026` |
| Spring | `Spring YYYY-YYYY` | `Spring 2024-2025` |

**Current Data Range:** Fall 2017-2018 through Winter 2025-2026

---

### 2. District (districtname)
The district to filter students by.

**CSV Column:** `districtname` (col 2)

**Allowed Values:**
- `Alpha`
- `Nova Academy Austin`
- `Novatio School`
- `Prisma Learning Inc.`
- `Studient`
- `Texas Preparatory School`
- `Unbound Academy`
- `Virtual 2 Hour Learning`

---

### 3. School (schoolname)
The school to filter students by.

**CSV Column:** `schoolname` (col 4)

**Allowed Values:** (54 schools, partial list)
- `Alpha Austin`
- `Alpha Dallas`
- `Alpha Denver`
- `NextGen Academy`
- `Nova Academy Austin`
- `Texas Prep School`
- ... (full list in data)

---

### 4. Growth Comparison Period
Determines which start/end terms to use for growth calculations.

**This is NOT a CSV column** - it determines which growth columns to read.

**Allowed Values:**

| Period | Description | Start Term | End Term | CSV Columns Used |
|--------|-------------|------------|----------|------------------|
| Fall to Winter | Same school year | Fall 2025 | Winter 2026 | `falltowinter*` (cols 37-43) |
| Fall to Spring | Same school year | Fall 2025 | Spring 2026 | `falltospring*` (cols 44-50) |
| Winter to Spring | Same school year | Winter 2025 | Spring 2026 | `wintertosprin*` (cols 58-64) |
| Fall to Fall | Year-over-year | Fall 2024 | Fall 2025 | `falltofall*` (cols 30-36) |
| Winter to Winter | Year-over-year | Winter 2024 | Winter 2025 | `wintertowinter*` (cols 51-57) |
| Spring to Spring | Year-over-year | Spring 2024 | Spring 2025 | `springtospring*` (cols 65-71) |

**Note:** The screenshot shows "Growth Comparison Period: Fall 2025 - Winter 2026" which uses `falltowinter*` columns.

### Effect on Table Headers

The growth period selection **dynamically changes the table headers**:

1. **Tier 2 headers** show the start and end term names
   - Example: "Fall 2025" and "Winter 2026" for Fall to Winter

2. **Tier 3 column headers** for Grade and Date use the end term code
   - Example: "WI 2026Grade" and "WI 2026Date" for Winter 2026 end term

3. **Report header** shows the growth comparison period
   - Example: "Growth Comparison Period: Fall 2025 - Winter 2026"

See `src/utils/termUtils.js` for the term label calculation logic and `docs/DATA_MAPPING.md` Part 7 for complete documentation.

---

### 5. Norms Reference Data (normsreferencedata)
The norms year for percentile calculations.

**CSV Column:** `normsreferencedata` (col 11)

**Allowed Values:**
- `2020` - 2020 Norms
- `2025` - 2025 Norms
- (empty) - Default norms

---

## Optional Filter Parameters

### 6. Level (Corresponds to NWEA Class)
Filter students by level grouping. This maps to NWEA's "Class" filter.

**Not a CSV column** - derived from `grade` column values.

**Allowed Values:**

| Level Code | Display Name | Grades Included | NWEA Class Equivalent |
|------------|--------------|-----------------|----------------------|
| WL | WL (Pre-K) | PK | Willing Learners |
| LL | LL (K-1) | K, 1 | Little Learners |
| L1 | L1 (2-3) | 2, 3 | Level 1 |
| L2 | L2 (4-5) | 4, 5 | Level 2 |
| MS | MS (6-8) | 6, 7, 8 | Middle School |
| HS | HS (9-12) | 9, 10, 11, 12 | High School |

**Usage:** Selecting a Level automatically filters to the corresponding grades.

---

### 7. Grade (grade)
Filter students by individual grade level.

**CSV Column:** `grade` (col 155)

**Allowed Values:**
- `PK` - Pre-Kindergarten
- `K` - Kindergarten
- `1` through `12` - Grades 1-12

**Note:** When Level filter is used, grades are set automatically.

---

### 8. Subject (subject)
Filter by test subject.

**CSV Column:** `subject` (col 8)

**Allowed Values:**
- `Reading`
- `Math`
- `Science`
- `Language`
- `Language Arts`

---

### 9. Course (course)
More specific course designation.

**CSV Column:** `course` (col 9)

**Allowed Values:**
- `Reading`
- `Reading (Spanish)`
- `Math K-12`
- `Algebra 1`
- `Science K-12`
- `Language Usage`

---

### 10. Gender (studentgender)
Filter by student gender.

**CSV Column:** `studentgender` (col 154)

**Allowed Values:**
- `M` - Male
- `F` - Female
- `X` - Non-binary/Other
- (empty) - Not specified

---

### 11. Ethnicity (studentethnicgroup)
Filter by student ethnicity.

**CSV Column:** `studentethnicgroup` (col 152)

**Allowed Values:**
- `Not Specified or Other`
- `White`
- `Multi-ethnic`
- `American Indian or Alaska Native`
- (empty) - Not specified

---

### 12. Teacher (teachername)
Filter by teacher assignment.

**CSV Column:** `teachername` (col 145)

---

## Weeks of Instruction Parameters

These values are stored in the data and displayed in the report header.

**CSV Columns:**
- `wiselectedayfall` (col 12) - Current year Fall weeks
- `wiselectedaywinter` (col 13) - Current year Winter weeks
- `wiselectedayspring` (col 14) - Current year Spring weeks
- `wipreviousayfall` (col 15) - Previous year Fall weeks
- `wipreviousaywinter` (col 16) - Previous year Winter weeks
- `wipreviousayspring` (col 17) - Previous year Spring weeks

---

## Example Report Configuration

From the screenshot:
```
Term Tested: Winter 2025-2026
Term Rostered: Winter 2025-2026
District: Alpha
School: Alpha Austin
Norms Reference Date: 2025 Norms
Growth Comparison Period: Fall 2025 - Winter 2026
Weeks of Instruction: 4 (Fall), 20 (Winter)
```

This configuration:
1. Filters to `termname = 'Winter 2025-2026'`
2. Filters to `districtname = 'Alpha'`
3. Filters to `schoolname = 'Alpha Austin'`
4. Uses `normsreferencedata = '2025'`
5. Uses `falltowinter*` columns for growth data
6. Displays `wiselectedayfall` and `wiselectedaywinter` in header
