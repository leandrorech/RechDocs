import json
from pathlib import Path

p = Path('tests/characterization/reports/characterization_run_result.json')
data = json.loads(p.read_text(encoding='utf-8'))
results = data.get('results', {})
if not results:
    raise SystemExit('characterization report has no results')
failed = []
for fixture_id, result in results.items():
    candidate = result.get('candidate', {})
    if candidate.get('pass') is not True:
        failed.append({
            'fixture': fixture_id,
            'pass': candidate.get('pass'),
            'failures': candidate.get('failures', []),
        })
if failed:
    print(json.dumps(failed, ensure_ascii=False, indent=2))
    raise SystemExit(f'candidate characterization failed in {len(failed)} fixture(s)')
print('candidate characterization gate PASS:', ', '.join(results.keys()))
