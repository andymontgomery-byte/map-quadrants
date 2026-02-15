#!/usr/bin/env python3
"""
NWEA vs App Comparison Engine

Usage:
    python3 compare.py <nwea_json> <app_json> [--output report.md]

Reads JSON output from extract-nwea.js and extract-app.js,
matches students by studentId + normalized subject, and produces a
field-by-field comparison report.
"""

import json
import sys
import re
import argparse
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


# --- Subject Normalization ---

SUBJECT_NORMALIZATIONS = {
    'Math K-12': 'Mathematics',
    'Math K-': 'Mathematics',
    'Math 6+': 'Mathematics',
    'Mathematics': 'Mathematics',
    'Reading': 'Reading',
    'Language Usage': 'Language Usage',
    'Language Arts': 'Language Usage',
    'Science K-12': 'Science',
    'Science K-': 'Science',
    'Science': 'Science',
    'General Science': 'Science',
}


def normalize_subject(subj):
    """Normalize subject names for matching.

    NWEA subjects may have leading triangle characters (▾, ▸) and
    use variants like "Math K-12" where our app uses "Mathematics".
    """
    if not subj:
        return None
    s = subj.strip()
    # Strip leading triangle/bullet characters and whitespace
    s = re.sub(r'^[\u25be\u25b8\u2022\u00b7\s]+', '', s)
    return SUBJECT_NORMALIZATIONS.get(s, s)


# --- Comparison Rules ---

# Fields that should match exactly (integers)
EXACT_INT_FIELDS = [
    'projectedRIT', 'projectedGrowth', 'observedGrowth',
    'growthIndex', 'conditionalGrowthPercentile',
]

# Fields with decimal tolerance
DECIMAL_FIELDS = {
    'observedGrowthSE': 0.1,
    'conditionalGrowthIndex': 0.01,
}

# RIT range fields -- compare the mid (bold) value exactly
RIT_RANGE_FIELDS = ['startRIT', 'endRIT']

# Percentile range fields -- compare the mid (bold) value exactly
PERCENTILE_RANGE_FIELDS = ['startPercentile', 'endPercentile']

# Text fields -- case-insensitive after normalization
TEXT_FIELDS = ['grade', 'metProjectedGrowth']

# All comparable fields in column order
ALL_FIELDS = [
    'studentName', 'studentId', 'grade', 'date',
    'startRIT', 'startPercentile', 'endRIT', 'endPercentile',
    'projectedRIT', 'projectedGrowth', 'observedGrowth', 'observedGrowthSE',
    'growthIndex', 'metProjectedGrowth', 'conditionalGrowthIndex',
    'conditionalGrowthPercentile',
]

# Fields for the concise diff summary table
SUMMARY_FIELDS = [
    ('startRIT', 'Start RIT (mid)'),
    ('startPercentile', 'Start Percentile (mid)'),
    ('endRIT', 'End RIT (mid)'),
    ('endPercentile', 'End Percentile (mid)'),
    ('projectedRIT', 'Projected RIT'),
    ('projectedGrowth', 'Projected Growth'),
    ('observedGrowth', 'Observed Growth'),
    ('growthIndex', 'Growth Index'),
    ('conditionalGrowthPercentile', 'Cond Growth Percentile'),
]


def normalize_value(val):
    """Normalize a value for comparison."""
    if val is None:
        return None
    if isinstance(val, str):
        val = val.strip()
        if val in ('\u2014', '-', '***', '', 'null', 'None'):
            return None
        return val
    return val


def normalize_met_growth(val):
    """Normalize Met Projected Growth to Yes/No."""
    val = normalize_value(val)
    if val is None:
        return None
    val_lower = str(val).lower().strip()
    if val_lower.startswith('yes'):
        return 'Yes'
    if val_lower.startswith('no'):
        return 'No'
    return val


def normalize_date(val):
    """Normalize date string for comparison."""
    val = normalize_value(val)
    if val is None:
        return None
    return str(val).strip()


def get_mid_value(obj):
    """Extract mid value from a range object or return the value as-is."""
    if isinstance(obj, dict):
        return obj.get('mid')
    return obj


def compare_range(nwea_range, app_range):
    """Compare RIT or percentile range objects by mid value.
    Returns diff dict or None if match.
    """
    if isinstance(nwea_range, dict) and isinstance(app_range, dict):
        nwea_mid = normalize_value(nwea_range.get('mid'))
        app_mid = normalize_value(app_range.get('mid'))

        if nwea_mid is None and app_mid is None:
            return None

        try:
            if nwea_mid is not None and app_mid is not None:
                nwea_int = int(round(float(nwea_mid)))
                app_int = int(round(float(app_mid)))
                if nwea_int != app_int:
                    return {
                        'nwea': nwea_range.get('raw', str(nwea_mid)),
                        'app': app_range.get('raw', str(app_mid)),
                        'nwea_mid': nwea_int,
                        'app_mid': app_int,
                        'delta': app_int - nwea_int,
                    }
            elif nwea_mid != app_mid:
                return {
                    'nwea': nwea_range.get('raw', str(nwea_mid)),
                    'app': app_range.get('raw', str(app_mid)),
                    'nwea_mid': nwea_mid,
                    'app_mid': app_mid,
                }
        except (ValueError, TypeError):
            if str(nwea_mid) != str(app_mid):
                return {
                    'nwea': nwea_range.get('raw', str(nwea_mid)),
                    'app': app_range.get('raw', str(app_mid)),
                    'nwea_mid': nwea_mid,
                    'app_mid': app_mid,
                }
        return None
    return None


def compare_exact_int(nwea_val, app_val):
    """Compare exact integer values. Returns diff or None."""
    nwea_val = normalize_value(nwea_val)
    app_val = normalize_value(app_val)

    if nwea_val is None and app_val is None:
        return None

    try:
        if nwea_val is not None:
            nwea_val = int(round(float(nwea_val)))
        if app_val is not None:
            app_val = int(round(float(app_val)))
    except (ValueError, TypeError):
        pass

    if nwea_val != app_val:
        delta = None
        if isinstance(nwea_val, (int, float)) and isinstance(app_val, (int, float)):
            delta = app_val - nwea_val
        return {'nwea': nwea_val, 'app': app_val, 'delta': delta}
    return None


def compare_decimal(nwea_val, app_val, tolerance):
    """Compare decimal values with tolerance. Returns diff or None."""
    nwea_val = normalize_value(nwea_val)
    app_val = normalize_value(app_val)

    if nwea_val is None and app_val is None:
        return None

    try:
        nwea_float = float(nwea_val) if nwea_val is not None else None
        app_float = float(app_val) if app_val is not None else None
    except (ValueError, TypeError):
        if str(nwea_val) != str(app_val):
            return {'nwea': nwea_val, 'app': app_val}
        return None

    if nwea_float is None and app_float is None:
        return None
    if nwea_float is None or app_float is None:
        return {'nwea': nwea_val, 'app': app_val}
    if abs(nwea_float - app_float) > tolerance:
        return {'nwea': nwea_val, 'app': app_val, 'delta': round(app_float - nwea_float, 4)}
    return None


def compare_text(nwea_val, app_val):
    """Compare text values case-insensitively."""
    nwea_val = normalize_value(nwea_val)
    app_val = normalize_value(app_val)

    if nwea_val is None and app_val is None:
        return None

    nwea_str = str(nwea_val).lower().strip() if nwea_val is not None else None
    app_str = str(app_val).lower().strip() if app_val is not None else None

    if nwea_str != app_str:
        return {'nwea': nwea_val, 'app': app_val}
    return None


def compare_student(nwea_student, app_student):
    """Compare all fields for a single student. Returns dict of diffs."""
    diffs = {}

    # RIT range fields
    for field in RIT_RANGE_FIELDS:
        diff = compare_range(nwea_student.get(field, {}), app_student.get(field, {}))
        if diff:
            diffs[field] = diff

    # Percentile range fields
    for field in PERCENTILE_RANGE_FIELDS:
        diff = compare_range(nwea_student.get(field, {}), app_student.get(field, {}))
        if diff:
            diffs[field] = diff

    # Exact integer fields
    for field in EXACT_INT_FIELDS:
        diff = compare_exact_int(nwea_student.get(field), app_student.get(field))
        if diff:
            diffs[field] = diff

    # Decimal fields
    for field, tolerance in DECIMAL_FIELDS.items():
        diff = compare_decimal(nwea_student.get(field), app_student.get(field), tolerance)
        if diff:
            diffs[field] = diff

    # Grade
    diff = compare_text(nwea_student.get('grade'), app_student.get('grade'))
    if diff:
        diffs['grade'] = diff

    # Date
    diff = compare_text(normalize_date(nwea_student.get('date')), normalize_date(app_student.get('date')))
    if diff:
        diffs['date'] = diff

    # Met Projected Growth
    diff = compare_text(
        normalize_met_growth(nwea_student.get('metProjectedGrowth')),
        normalize_met_growth(app_student.get('metProjectedGrowth')),
    )
    if diff:
        diffs['metProjectedGrowth'] = diff

    return diffs


def build_student_lookup(students):
    """Build lookup dict from students array, keyed by studentId|normalizedSubject."""
    lookup = {}
    for s in students:
        subj = normalize_subject(s.get('subject'))
        student_id = (s.get('studentId') or '').strip()
        if not subj or not student_id:
            continue
        key = f"{student_id}|{subj}"
        lookup[key] = s
    return lookup


def generate_report(nwea_data, app_data):
    """Generate full comparison report in markdown."""
    lines = []

    # Build lookup maps with normalized subjects
    nwea_students = build_student_lookup(nwea_data.get('students', []))
    app_students = build_student_lookup(app_data.get('students', []))

    matched_keys = set(nwea_students.keys()) & set(app_students.keys())
    nwea_only = set(nwea_students.keys()) - set(app_students.keys())
    app_only = set(app_students.keys()) - set(nwea_students.keys())

    lines.append('# Comparison Report')
    lines.append('')
    lines.append(f'- **NWEA students**: {len(nwea_students)}')
    lines.append(f'- **App students**: {len(app_students)}')
    lines.append(f'- **Matched**: {len(matched_keys)}')
    lines.append(f'- **NWEA only**: {len(nwea_only)}')
    lines.append(f'- **App only**: {len(app_only)}')
    lines.append('')

    if nwea_only:
        lines.append('### Students in NWEA Only')
        lines.append('')
        for key in sorted(nwea_only):
            s = nwea_students[key]
            lines.append(f"- {s.get('studentName', '?')} ({key.split('|')[0]}) {key.split('|')[1]}")
        lines.append('')

    if app_only:
        lines.append('### Students in App Only')
        lines.append('')
        for key in sorted(app_only):
            s = app_students[key]
            lines.append(f"- {s.get('studentName', '?')} ({key.split('|')[0]}) {key.split('|')[1]}")
        lines.append('')

    # Compare matched students field by field
    diff_counter = Counter()
    diff_details = {field: [] for field, _ in SUMMARY_FIELDS}

    for key in sorted(matched_keys):
        nwea_s = nwea_students[key]
        app_s = app_students[key]
        diffs = compare_student(nwea_s, app_s)

        for field, label in SUMMARY_FIELDS:
            if field in diffs:
                diff_counter[field] += 1
                d = diffs[field]
                nwea_val = d.get('nwea_mid', d.get('nwea'))
                app_val = d.get('app_mid', d.get('app'))
                delta = d.get('delta')
                diff_details[field].append({
                    'student': f"{nwea_s.get('studentName', '?')} ({key.split('|')[0]})",
                    'subject': key.split('|')[1],
                    'nwea': nwea_val,
                    'app': app_val,
                    'delta': delta,
                })

    # Summary table
    lines.append('## Differences by Field')
    lines.append('')
    lines.append('| Field | Diffs | % of matched |')
    lines.append('|-------|-------|--------------|')
    for field, label in SUMMARY_FIELDS:
        count = diff_counter.get(field, 0)
        pct = count / len(matched_keys) * 100 if matched_keys else 0
        marker = ' !!!' if pct > 5 else ''
        lines.append(f'| {label} | {count} | {pct:.1f}%{marker} |')
    lines.append('')

    total_diffs = sum(diff_counter.values())
    total_possible = len(matched_keys) * len(SUMMARY_FIELDS)
    match_pct = (total_possible - total_diffs) / total_possible * 100 if total_possible else 0
    lines.append(f'**Overall match rate: {match_pct:.1f}%** ({total_diffs} diffs across {len(matched_keys)} students)')
    lines.append('')

    # Detailed diffs per field
    for field, label in SUMMARY_FIELDS:
        details = diff_details.get(field, [])
        if not details:
            continue
        lines.append(f'### {label} \u2014 {len(details)} differences')
        lines.append('')
        lines.append('| Student | Subject | NWEA | App | Delta |')
        lines.append('|---------|---------|------|-----|-------|')
        for d in details[:30]:
            delta_str = f"{d['delta']:+.0f}" if d['delta'] is not None else '\u2014'
            lines.append(f"| {d['student']} | {d['subject']} | {d['nwea']} | {d['app']} | {delta_str} |")
        if len(details) > 30:
            lines.append(f"| ... | ... | ... | ... | ({len(details) - 30} more) |")
        lines.append('')

    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='Compare NWEA and App JSON extractions')
    parser.add_argument('nwea_json', help='Path to NWEA extraction JSON')
    parser.add_argument('app_json', help='Path to App extraction JSON')
    parser.add_argument('--output', '-o', default=None, help='Output markdown file path')
    args = parser.parse_args()

    with open(args.nwea_json, 'r') as f:
        nwea_data = json.load(f)

    with open(args.app_json, 'r') as f:
        app_data = json.load(f)

    report = generate_report(nwea_data, app_data)

    if args.output:
        Path(args.output).write_text(report)
        print(f'Report written to {args.output}')
    else:
        print(report)


if __name__ == '__main__':
    main()
