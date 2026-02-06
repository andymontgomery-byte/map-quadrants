# Lessons Learned

## 2026-02-04: Test new features, not just existing ones

**Mistake**: Added "All Districts" and "All Schools" filter options but the smoke test only tested the existing single-school flow. The bug (loading all schools instead of the selected school when "All Districts" was chosen) passed the smoke test because the test didn't exercise the new code path.

**Lesson**: When adding new features, always add corresponding test cases that specifically exercise those features. Don't assume existing tests will catch bugs in new code.

**Fix pattern**:
1. Write the test first (or immediately after the feature)
2. Verify the test fails if the feature is broken
3. Then verify the test passes with correct implementation

---

## 2026-02-04: Empty array vs missing filter - different semantics

**Mistake**: In `filterData`, the condition `filters.subjects.length > 0` was used to decide whether to apply the subject filter. This meant an empty array `[]` was treated the same as "no filter" - but the user expected empty array to mean "show nothing".

**Lesson**: Be explicit about the semantics:
- `undefined`/`null` = no filter, show all
- `[]` (empty array) = filter is active but nothing selected, show none
- `[...values]` = filter to only these values

**Fix**:
```javascript
// Before (buggy)
if (filters.subjects && filters.subjects.length > 0) {
  if (!filters.subjects.includes(row.subject)) return false;
}

// After (correct)
if (Array.isArray(filters.subjects)) {
  if (filters.subjects.length === 0 || !filters.subjects.includes(row.subject)) return false;
}
```

---

## 2026-02-04: Deduplication logic for MAP data

Per [NWEA documentation](https://teach.mapnwea.org/impl/maphelp/Content/Data/DataMissingWrong_Invalid.htm):

**Correct deduplication strategy** (in priority order):
1. **`growthmeasureyn='true'`** → use those rows (official NWEA designation)
2. **Lowest `teststandarderror`** → most reliable measurement
3. **Most recent `teststartdate`** → if SEs are equal
4. **Highest `testritscore`** → final tiebreaker

```javascript
// scripts/build-data.js
return group.reduce((best, curr) => {
  // 1. Lowest SE
  if (currSE < bestSE) return curr;
  if (currSE > bestSE) return best;
  // 2. Most recent date
  if (currDate > bestDate) return curr;
  if (currDate < bestDate) return best;
  // 3. Highest RIT
  return currScore > bestScore ? curr : best;
});
```

**Why**: Lower SE = more reliable measurement. NWEA considers this the "official" score for growth calculations.

---

## 2026-02-04: Empty string vs null vs zero - different meanings

**Mistake**: Used `parseFloat(value) || 0` to parse numeric fields. This treats empty strings as 0, but empty string means "no data" not "zero".

**Problem**: When a student has no Winter-to-Winter growth data:
- CSV has empty strings for `wintertowinterobservedgrowth`, etc.
- `parseFloat('') || 0` → 0
- Display showed "0" instead of "—"

**Lesson**: Use a safe parse function that distinguishes between:
- Empty string/null → `null` (no data)
- `"0"` → `0` (actual zero value)

**Fix**:
```javascript
// Before (buggy)
const observedGrowth = parseFloat(row[...]) || 0;

// After (correct)
function safeParseFloat(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}
const observedGrowth = safeParseFloat(row[...]);
```

---

## 2026-02-04: NWEA RIT Score Range uses ±1*SE, not ±2*SE

**Mistake**: Implemented RIT range as `RIT ± 2*SE` based on statistical convention for 95% confidence interval.

**NWEA's actual format**: `RIT ± 1*SE`
- Example: RIT=243, SE=3.26 → 240-**243**-246 (not 236-243-250)

**Lesson**: Match the vendor's display format, not statistical conventions. When in doubt, compare against actual screenshots.

---

## 2026-02-04: Start term columns should be empty when no growth data

**Mistake**: Calculated `fallRIT = winterRIT - observedGrowth`. When observedGrowth was null (defaulting to 0), this showed `winterRIT` as the fall RIT.

**Problem**: Students without prior term tests showed the same RIT in both columns.

**Fix**: Only calculate start term values if `hasGrowthData` is true:
```javascript
const hasGrowthData = observedGrowth !== null || projectedGrowth !== null;
const startRIT = hasGrowthData && testritscore !== null && observedGrowth !== null
  ? testritscore - observedGrowth
  : null;
```

Show "***" in start term columns when no growth data exists.

---

## 2026-02-04: Growth Index ≠ Conditional Growth Index

**Mistake**: Displayed `conditionalGrowthIndex` in the "Growth Index" column.

**NWEA's definition**:
- **Growth Index** (under Student section) = `Observed Growth - Projected Growth`
  - Example: 6 - 7 = **-1**
- **Conditional Growth Index** (under Comparative section) = from CSV `conditionalgrowthindex` column
  - Example: **-0.17**

These are two different values! The Growth Index is a simple difference, while CGI is a normalized/adjusted value.

**Fix**:
```javascript
// Growth Index column
<td>{observedGrowth - projectedGrowth}</td>

// Conditional Growth Index column (separate)
<td>{conditionalGrowthIndex}</td>
```

---

## 2026-02-04: NWEA Percentile Range uses ±2, not ±1

**Mistake**: Used `±floor(SE/3)` which gave ±1 for most students.

**NWEA's format**: Approximately ±2 for the percentile range.
- Example: Percentile 94 → 92-**94**-96

**Note**: Start term percentile range requires loading prior term data which is currently not implemented.
