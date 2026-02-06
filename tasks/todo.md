# Dynamic Table Headers Based on Growth Period

## Problem
Table headers are hardcoded as "Winter 2025" / "Winter 2026" regardless of growth period selection.

## Goal
Table headers dynamically reflect the start/end terms based on selected growth period.

---

## Status: ✅ COMPLETE

All changes implemented and deployed.

---

## Changes Completed

### 1. Create Term/Growth Period Utility (`src/utils/termUtils.js`)
- [x] Parse term name: "Winter 2025-2026" → { season: "Winter", startYear: 2025, endYear: 2026 }
- [x] Calculate start term from growth period
- [x] Export `getTermLabels(termname, growthPeriod)` → { startLabel, endLabel, startCode, endCode, ... }

### 2. Update App.jsx
- [x] Pass `selection.termname` and `selection.growthPeriod` to DataTable
- [x] Pass to ReportHeader for display

### 3. Update DataTable.jsx
- [x] Accept `termname` and `growthPeriod` props
- [x] Import and use `getTermLabels()` utility
- [x] Update tier 2 header row (dynamic start/end labels)
- [x] Update tier 3 column headers (dynamic endCode prefix)

### 4. Update ReportHeader.jsx
- [x] Use `getTermLabels()` to show correct "Growth Comparison Period"

### 5. Update Smoke Test (`tests/smoke.spec.js`)
- [x] Add expected header labels based on growth period selection
- [x] Verify tier 2 headers match expected start/end terms
- [x] Dynamic tier 3 column validation with {endCode} placeholder

### 6. Update Documentation
- [x] `docs/DATA_MAPPING.md` - Added Part 7: Dynamic Table Headers
- [x] `docs/INPUT_PARAMETERS.md` - Added "Effect on Table Headers" section
- [x] `README.md` - Added section 5: Dynamic Table Headers

---

## Validation Results

| Term + Growth Period | Tier 2 Start | Tier 2 End | Status |
|---------------------|--------------|------------|--------|
| Winter 2025-2026 + Fall to Winter | Fall 2025 | Winter 2026 | ✅ Verified |

Smoke test validates headers match selected growth period.

---

## Deployed

Live at: https://andymontgomery-byte.github.io/map-quadrants/
