import json
from pathlib import Path

p = Path('tests/characterization/reports/characterization_run_result.json')
data = json.loads(p.read_text(encoding='utf-8'))

failures = []


def walk(obj, trail='root'):
    if isinstance(obj, dict):
        cand = obj.get('candidate')
        if isinstance(cand, dict) and cand.get('pass') is False:
            ident = obj.get('id') or obj.get('fixture') or obj.get('description') or trail
            failures.append(str(ident))
        for k, v in obj.items():
            walk(v, f'{trail}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk(v, f'{trail}[{i}]')


walk(data)
if failures:
    raise SystemExit('candidate characterization failures: ' + ', '.join(sorted(set(failures))))
print('candidate characterization assertions: PASS')
