#!/usr/bin/env python3
"""
Analyze duplicate patterns in MAP CSV file
"""
import csv
from collections import defaultdict, Counter
import sys

csv.field_size_limit(sys.maxsize)

FILE_PATH = "/Users/andymontgomery/Downloads/map-export-athena_02_04.csv"

# Key columns (0-indexed)
COLS = {
    'termname': 0,
    'studentid': 5,
    'subject': 7,
    'teststartdate': 20,
    'teststarttime': 21,
    'testritscore': 23,
    'classname': 143,
    'teachername': 144,
    'grade': 154,
}

def analyze_duplicates():
    print("="*80)
    print("MAP CSV DUPLICATE ANALYSIS")
    print("="*80)

    # Read all data
    rows_by_key = defaultdict(list)  # key = (studentid, subject, teststartdate)
    rows_by_student_subject_term = defaultdict(list)  # key = (studentid, subject, termname)
    all_rows = []

    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)

        for row_num, row in enumerate(reader, start=2):
            if len(row) < 155:
                continue

            studentid = row[COLS['studentid']]
            subject = row[COLS['subject']]
            teststartdate = row[COLS['teststartdate']]
            termname = row[COLS['termname']]

            key = (studentid, subject, teststartdate)
            term_key = (studentid, subject, termname)

            row_data = {
                'row_num': row_num,
                'termname': termname,
                'studentid': studentid,
                'subject': subject,
                'teststartdate': teststartdate,
                'teststarttime': row[COLS['teststarttime']],
                'testritscore': row[COLS['testritscore']],
                'classname': row[COLS['classname']],
                'teachername': row[COLS['teachername']],
                'grade': row[COLS['grade']],
                'full_row': row
            }

            rows_by_key[key].append(row_data)
            rows_by_student_subject_term[term_key].append(row_data)
            all_rows.append(row_data)

    total_rows = len(all_rows)
    unique_keys = len(rows_by_key)

    print(f"\n1. BASIC COUNTS")
    print("-"*40)
    print(f"Total data rows: {total_rows}")
    print(f"Unique (studentid + subject + teststartdate) combinations: {unique_keys}")
    print(f"Duplicate rows (same studentid + subject + teststartdate): {total_rows - unique_keys}")

    # Find duplicates within same studentid + subject + teststartdate
    print(f"\n2. DUPLICATES WITHIN SAME (studentid + subject + teststartdate)")
    print("-"*40)

    dup_groups = {k: v for k, v in rows_by_key.items() if len(v) > 1}
    print(f"Number of duplicate groups: {len(dup_groups)}")
    print(f"Total rows in duplicate groups: {sum(len(v) for v in dup_groups.values())}")

    # Analyze what columns differ in duplicates
    diff_patterns = defaultdict(list)

    for key, rows in dup_groups.items():
        # Compare all rows in group
        differing_cols = set()
        base = rows[0]

        for r in rows[1:]:
            if r['testritscore'] != base['testritscore']:
                differing_cols.add('testritscore')
            if r['classname'] != base['classname']:
                differing_cols.add('classname')
            if r['teachername'] != base['teachername']:
                differing_cols.add('teachername')
            if r['teststarttime'] != base['teststarttime']:
                differing_cols.add('teststarttime')
            if r['grade'] != base['grade']:
                differing_cols.add('grade')

        pattern = tuple(sorted(differing_cols)) if differing_cols else ('IDENTICAL',)
        diff_patterns[pattern].append((key, rows))

    print(f"\nDifference patterns found:")
    for pattern, groups in sorted(diff_patterns.items(), key=lambda x: -len(x[1])):
        print(f"\n  Pattern: {', '.join(pattern)}")
        print(f"  Count: {len(groups)} groups ({sum(len(g[1]) for g in groups)} total rows)")

        # Show examples
        print(f"  Examples (up to 3):")
        for i, (key, rows) in enumerate(groups[:3]):
            print(f"    Group {i+1}: studentid={key[0]}, subject={key[1]}, date={key[2]}")
            for r in rows:
                print(f"      Row {r['row_num']}: score={r['testritscore']}, class={r['classname'][:30] if r['classname'] else 'N/A'}, teacher={r['teachername'][:25] if r['teachername'] else 'N/A'}")

    # Same student, same subject, DIFFERENT dates in same term
    print(f"\n3. SAME STUDENT + SUBJECT WITH DIFFERENT DATES IN SAME TERM")
    print("-"*40)

    multi_date_groups = {k: v for k, v in rows_by_student_subject_term.items() if len(v) > 1}

    # Filter to only those with actually different dates
    different_dates_groups = {}
    for key, rows in multi_date_groups.items():
        dates = set(r['teststartdate'] for r in rows)
        if len(dates) > 1:
            different_dates_groups[key] = rows

    print(f"Student+subject+term groups with multiple different test dates: {len(different_dates_groups)}")

    # Analyze patterns
    retake_patterns = defaultdict(list)
    for key, rows in different_dates_groups.items():
        dates = sorted(set(r['teststartdate'] for r in rows))
        num_dates = len(dates)
        retake_patterns[num_dates].append((key, rows, dates))

    print(f"\nNumber of different dates per student+subject+term:")
    for num_dates, groups in sorted(retake_patterns.items()):
        print(f"  {num_dates} different dates: {len(groups)} groups")

    print(f"\nExamples of students with multiple test dates in same term:")
    for num_dates, groups in sorted(retake_patterns.items(), reverse=True):
        print(f"\n  With {num_dates} different test dates:")
        for i, (key, rows, dates) in enumerate(groups[:3]):
            print(f"    Student {key[0]}, Subject: {key[1]}, Term: {key[2]}")
            print(f"      Dates: {dates}")
            print(f"      Scores: {[r['testritscore'] for r in sorted(rows, key=lambda x: x['teststartdate'])]}")

    # Summary and recommendations
    print(f"\n" + "="*80)
    print("4. SUMMARY AND RECOMMENDATIONS")
    print("="*80)

    print(f"\nDUPLICATION TYPE 1: Same studentid + subject + teststartdate")
    print(f"  Total occurrences: {len(dup_groups)} groups ({sum(len(v) for v in dup_groups.values())} rows)")
    for pattern, groups in sorted(diff_patterns.items(), key=lambda x: -len(x[1])):
        print(f"\n  Sub-pattern: {', '.join(pattern)}")
        print(f"    Count: {len(groups)} groups")
        if pattern == ('IDENTICAL',):
            print(f"    Recommendation: TRUE DUPLICATES - Safe to deduplicate by keeping one row")
        elif pattern == ('classname', 'teachername'):
            print(f"    Recommendation: Student assigned to multiple teachers/classes")
            print(f"      - These are likely ROSTER DUPLICATES from multiple class assignments")
            print(f"      - For score analysis: Keep one row (scores are same)")
            print(f"      - For roster/class analysis: May need all rows or pick primary class")
        elif 'testritscore' in pattern:
            print(f"    Recommendation: DIFFERENT SCORES on same date - investigate")
            print(f"      - Could be test retakes on same day")
            print(f"      - May want to keep highest score or latest time")
        else:
            print(f"    Recommendation: Review on case-by-case basis")

    print(f"\nDUPLICATION TYPE 2: Same student + subject + term, DIFFERENT dates")
    print(f"  Total occurrences: {len(different_dates_groups)} groups")
    print(f"  Recommendation: These are LEGITIMATE RETAKES within the term")
    print(f"    - For growth analysis: Use first or most recent test based on your needs")
    print(f"    - For progress monitoring: May want to keep all tests")
    print(f"    - Consider filtering by 'growthmeasureyn' column if you need the official growth score")

if __name__ == "__main__":
    analyze_duplicates()
