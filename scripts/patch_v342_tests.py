from pathlib import Path

p = Path('tests/characterization/harness/capture-state.mjs')
s = p.read_text(encoding='utf-8')
needle = "    + 'Pneumonia comunitaria em tratamento. '\n    + 'Nega alergias medicamentosas conhecidas.',"
replacement = "    + 'Pneumonia comunitaria em tratamento. '\n    + 'Ceftriaxona 2g 24/24h. '\n    + 'Nega alergias medicamentosas conhecidas.',"
if 'Ceftriaxona 2g 24/24h.' not in s:
    if needle not in s:
        raise SystemExit('E2E source anchor not found')
    s = s.replace(needle, replacement, 1)
p.write_text(s, encoding='utf-8')
print('patch_v342_tests.py: E2E clean source now contains the exact synthetic dose returned by the provider stub')
