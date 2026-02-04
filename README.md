# MAP Quadrant Report

A pixel-perfect clone of the NWEA MAP Growth quadrant report.

## Quick Start

```bash
# Install dependencies
npm install

# Process CSV data (required once, or when data changes)
cp /path/to/map-export.csv public/data.csv
npm run build:data

# Run locally
npm run dev

# Run tests
npm run test:smoke

# Deploy to GitHub Pages
npm run deploy
```

## Architecture Decisions

### 1. Pre-computed Data (not runtime CSV parsing)

**Problem:** 37MB CSV is too slow to parse in browser.

**Solution:** Build step pre-processes CSV into:
- `metadata.json` (84KB) - Cascading dropdown options
- `data/{term}/{district}/{school}.json` - Per-school data slices

**Benefit:** App loads in ~4s instead of ~13s.

### 2. Cascading Filter Hierarchy

```
Term → District → School → Grade (optional)
```

Each selection filters the available options for the next dropdown. Metadata stores this hierarchy so no data loading needed until "Generate Report".

### 3. Deduplication Strategy

Students may have duplicate rows (multiple teachers, retakes). Per-term logic:

1. If term has `growthmeasureyn='true'` rows → use those (NWEA official)
2. Else → keep highest `testritscore` per student+subject

### 4. Chart Eligibility

Students appear on chart only if they have BOTH:
- `testpercentile` (X-axis: Achievement)
- `falltowinterconditionalgrowthpercentile` (Y-axis: Growth)

Students without fall baseline won't appear.

### 5. Quadrant Colors

| Quadrant | Achievement | Growth | Color |
|----------|-------------|--------|-------|
| Top-right | High (≥50) | High (≥50) | Green `#90EE90` |
| Top-left | Low (<50) | High (≥50) | Yellow `#FFFF99` |
| Bottom-left | Low (<50) | Low (<50) | Pink `#FFB6C1` |
| Bottom-right | High (≥50) | Low (<50) | Pale Green `#E8F5E9` |

## Data Files

See `docs/` for detailed specifications:
- `DATA_MAPPING.md` - CSV column → report field mapping
- `INPUT_PARAMETERS.md` - Filter options and allowed values

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run build:data` | Process CSV into metadata + slices |
| `npm run test:smoke` | Run Playwright smoke test |
| `npm run deploy` | Build and deploy to GitHub Pages |

## Tech Stack

- React + Vite
- PapaParse (CSV parsing)
- Custom SVG (quadrant chart)
- Playwright (testing)
