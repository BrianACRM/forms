"""Independent Decimal reconciliation of a standard Average Instrument Logbook.

Usage: python scripts/audit_sharp_report.py workbook.xlsx YYYY-MM-DD output_dir
Requires openpyxl. Outputs stay local; source workbooks may contain personnel data.
This audits logged figures, not device approval or completeness of career history.
"""
import calendar
import csv
import json
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from openpyxl import load_workbook


def before_months(day, months):
    serial = day.year * 12 + day.month - 1 - months
    year, month = divmod(serial, 12)
    month += 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def audit(workbook, evaluation, output):
    wb = load_workbook(workbook, data_only=True, read_only=True)
    sheets = []
    for sheet in wb:
        values = list(sheet.values)
        header = next((i for i, r in enumerate(values)
                       if list(r[:4]) == ['Year', 'Month', 'Day', 'Frame']), None)
        if header is not None:
            sheets.append((values, header))
    if len(sheets) != 1:
        raise ValueError('Expected exactly one Average Instrument Logbook')
    rows, header_index = sheets[0]
    columns = {str(v).strip().lower(): i for i, v in enumerate(rows[header_index])}
    precision = ['1/a', 'par', 'ils']
    nonprecision = ['2/b', 'asr', 'elva', 'l/mf', 'loc', 'ndb', 'sca', 'tacan', 'vor', 'vor/dme']
    first6, first12 = before_months(evaluation, 6), before_months(evaluation, 12)
    records = []
    for number, row in enumerate(rows[header_index + 1:], header_index + 2):
        if not any(v is not None for v in row) or str(row[0]).strip().lower() in ['totals', 'total', 'year']:
            continue
        when = date(*(int(row[i]) for i in range(3)))
        def val(name):
            value = row[columns[name]]
            result = Decimal(str(value)) if value not in [None, ''] else Decimal(0)
            if not result.is_finite() or result < 0:
                raise ValueError(f'Invalid value on source row {number}: {name}')
            return result
        if val('cca'):
            raise ValueError(f'CCA classification needs review on source row {number}')
        p, np = sum(map(val, precision)), sum(map(val, nonprecision))
        if p != int(p) or np != int(np):
            raise ValueError(f'Fractional approach count on source row {number}')
        records.append(dict(source_row=number, date=when.isoformat(), frame=row[3],
                            total=val('total'), actual=val('act inst'), simulated=val('sim inst'),
                            precision=p, nonprecision=np, six=first6 < when < evaluation,
                            twelve=first12 < when < evaluation, before_evaluation=when < evaluation,
                            check_day=when == evaluation, future=when > evaluation))
    metrics = ['total', 'actual', 'simulated', 'precision', 'nonprecision']
    totals = {period: {metric: sum((r[metric] for r in records if period == 'all_report' or r[period]), Decimal(0))
                       for metric in metrics}
              for period in ['six', 'twelve', 'before_evaluation', 'all_report']}
    counts = {p: len([r for r in records if p == 'all_report' or r[p]]) for p in totals}
    output.mkdir(parents=True, exist_ok=True)
    with (output / 'source-rows.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)
    (output / 'decimal-totals.json').write_text(json.dumps({'counts': counts, 'totals': totals}, default=str, indent=2))
    text = [f'# SHARP source reconciliation — {evaluation}', '',
            f'{len(records)} source entries. Decimal arithmetic independent of the browser implementation.', '',
            'The evaluation-day entry is excluded. No earlier separate sortie is assumed.', '',
            '| Period | Entries | Report Total | Actual | Simulated | Precision | Nonprecision |',
            '|---|---:|---:|---:|---:|---:|---:|']
    for period, values in totals.items():
        text.append(f'| {period} | {counts[period]} | ' + ' | '.join(str(values[k]) for k in metrics) + ' |')
    text += ['', '“Report Total” is the raw column sum. It is not certified aircraft pilot time.',
             'The supplied standard export has no event/device identifiers or FPT/CPT breakdown.',
             'Career completeness, simulator approval and aircraft-versus-simulator allocations require source records.',
             'Do not alter these logged figures merely to reproduce a completed example.', '']
    (output / 'reconciliation.md').write_text('\n'.join(text))
    print('\n'.join(text))


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    audit(Path(sys.argv[1]), date.fromisoformat(sys.argv[2]), Path(sys.argv[3]))
