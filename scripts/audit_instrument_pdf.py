"""Compare a generated PDF with a supplied completed example, without flattening.

Usage: python scripts/audit_instrument_pdf.py example.pdf generated.pdf
Requires pypdf. Reports differences, never changes either input.
"""
import re
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from xml.etree import ElementTree as ET
from pypdf import PdfReader


def packets(path):
    reader = PdfReader(path)
    xfa = reader.root_object['/AcroForm']['/XFA']
    return reader, {str(xfa[i]): xfa[i + 1].get_object().get_data()
                    for i in range(0, len(xfa), 2)}


def record(data):
    result = {}
    for node in ET.fromstring(data).find('.//form1'):
        result.setdefault(node.tag, []).append(node.text or '')
    return result


def equivalent(a, b):
    if a == b:
        return True
    try:
        return Decimal(a) == Decimal(b)
    except InvalidOperation:
        return False


def audit(reference, generated):
    _, before = packets(reference)
    reader, after = packets(generated)
    failures = []
    count = 0

    def check(ok, label):
        nonlocal count
        count += 1
        if not ok:
            failures.append(label)

    inserted = rb'(<field\b[^>]*\bname="(?:Exmoff|RnkNmeFltExmr|RnkNmeUnitCmdr|ContBy|CUICat|LDC|POC)"[^>]*>)<value><text>[\s\S]*?</text></value>'
    restored = re.sub(inserted, rb'\1', after['template'])
    restored = re.sub(rb'<calculate override="ignore"(\s*)>', rb'<calculate\1>', restored)
    check(restored == before['template'], 'Original layout, fonts, captions and formatting differ')
    check(not reader.is_encrypted, 'Output is encrypted')
    check('form' not in after, 'Output retains old saved overrides')
    tree = ET.fromstring(after['template'])
    ns = {'t': tree.tag.split('}')[0][1:]}
    fields = tree.findall('.//t:field', ns)
    original = ET.fromstring(before['template']).findall('.//t:field', ns)
    check(len(fields) == len(original), 'Original field count changed')
    check(len(tree.findall('.//t:signature', ns)) == 3, 'Missing native signature controls')
    for field in fields:
        if field.get('presence') == 'hidden':
            continue
        check(field.get('access', 'open') == 'open', 'Field is locked: ' + field.get('name', ''))
        calculation = field.find('t:calculate', ns)
        if calculation is not None:
            check(calculation.get('override') == 'ignore', 'Calculated field cannot be overridden: ' + field.get('name', ''))
    expected, actual = record(before['datasets']), record(after['datasets'])
    for name, values in expected.items():
        got = actual.get(name, [])
        check(len(values) == len(got), 'Occurrence count: ' + name)
        for i, (a, b) in enumerate(zip(values, got)):
            check(equivalent(a, b), f'{name}[{i}]: example {a!r}, output {b!r}')
    # Names with bind=none are stored in the saved form packet by Acrobat.
    if 'form' in before:
        for field in ET.fromstring(before['form']).iter():
            if field.tag.split('}')[-1] != 'field':
                continue
            name = field.get('name')
            if name not in ['Exmoff', 'RnkNmeFltExmr', 'RnkNmeUnitCmdr']:
                continue
            text = ''.join(field.itertext()).strip()
            output = next(f for f in fields if f.get('name') == name)
            value = output.find('t:value/t:text', ns)
            check(value is not None and (value.text or '') == text, 'Unbound name differs: ' + name)
    print(f'{count - len(failures)}/{count} checks passed; {len(fields)} original XFA fields retained.')
    for failure in failures:
        print('FAIL:', failure)
    print('This audits stored data and form definitions; it does not execute Acrobat or reconcile SHARP accounting rules.')
    return not failures


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    raise SystemExit(0 if audit(Path(sys.argv[1]), Path(sys.argv[2])) else 1)
