import base64
import json
import os
from pathlib import Path
import subprocess
import urllib.request

repo = os.environ['GITHUB_REPOSITORY']
parent = os.environ['GITHUB_SHA']
token = os.environ['GH_API_TOKEN']
api = f'https://api.github.com/repos/{repo}'


def request(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        api + path,
        data=data,
        method=method,
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'rechdocs-p0-ci',
            'Content-Type': 'application/json',
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


def create_blob(path):
    raw = Path(path).read_bytes()
    out = request('POST', '/git/blobs', {
        'content': base64.b64encode(raw).decode('ascii'),
        'encoding': 'base64',
    })
    return out['sha']

base_tree = subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], text=True).strip()

paths = [
    'output/RechDocs_v3.4.1.html',
    'reports/P0_CLINICAL_RULES_2026-08-16.md',
    'scripts/apply_p0_clinical_rules.py',
]
entries = []
for path in paths:
    entries.append({
        'path': path,
        'mode': '100644',
        'type': 'blob',
        'sha': create_blob(path),
    })

tree = request('POST', '/git/trees', {'base_tree': base_tree, 'tree': entries})
commit = request('POST', '/git/commits', {
    'message': 'fix: enforce RechDocs P0 clinical/documental rules',
    'tree': tree['sha'],
    'parents': [parent],
})

print('DETACHED_COMMIT_SHA=' + commit['sha'])
print('DETACHED_TREE_SHA=' + tree['sha'])
