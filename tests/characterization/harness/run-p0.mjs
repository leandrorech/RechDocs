// Orquestra os specs P0 contra baseline, referencia e candidato atual.
// Uso: node tests/characterization/harness/run-p0.mjs
import { openArtifact } from './browser-adapter.mjs';
import * as p0_01 from './p0_01_vent_episode_leak.spec.mjs';
import * as p0_02 from './p0_02_vm_extubation_conflict.spec.mjs';
import * as p0_03 from './p0_03_copy_override_policy.spec.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ARTIFACTS = [
  { key: 'baseline', label: 'Baseline v3.3.12-P1 (congelada)', path: 'baseline/rech_docs_v3_3_12_P1.html' },
  { key: 'reference', label: 'Referencia v3.4.0', path: 'reference/RechDocs_v3.4.0_reference.html' },
  { key: 'candidate', label: 'Candidata atual (output/RechDocs_v3.4.1.html)', path: 'output/RechDocs_v3.4.1.html' },
];

const SPECS = [p0_01, p0_02, p0_03];

async function sha256(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function main() {
  const artifactMeta = {};
  for (const a of ARTIFACTS) {
    const abs = path.resolve(a.path);
    const stat = await fs.stat(abs);
    artifactMeta[a.key] = { ...a, sha256: await sha256(abs), bytes: stat.size };
  }

  const matrix = {}; // matrix[specId][artifactKey] = result

  for (const a of ARTIFACTS) {
    const session = await openArtifact(a.path);
    for (const spec of SPECS) {
      let result;
      try {
        result = await spec.run(session, path.resolve(a.path));
      } catch (e) {
        result = { id: spec.id, description: spec.description, pass: false, failures: [`Excecao no harness: ${String(e && e.stack || e)}`], observed: null };
      }
      matrix[spec.id] = matrix[spec.id] || {};
      matrix[spec.id][a.key] = result;
    }
    await session.close();
  }

  return { artifactMeta, matrix };
}

function verdictSymbol(result) {
  if (!result) return '?';
  return result.pass ? 'PASS' : 'FAIL';
}

const { artifactMeta, matrix } = await main();

console.log('\n=== Metadados dos artefatos testados ===');
for (const key of ['baseline', 'reference', 'candidate']) {
  const m = artifactMeta[key];
  console.log(`${key}: ${m.path} | ${m.bytes} bytes | sha256=${m.sha256}`);
}

console.log('\n=== Matriz de resultados ===');
for (const spec of SPECS) {
  const row = matrix[spec.id];
  console.log(`\n${spec.id} — ${spec.description}`);
  for (const key of ['baseline', 'reference', 'candidate']) {
    const r = row[key];
    console.log(`  ${key.padEnd(10)}: ${verdictSymbol(r)}`);
    if (r && !r.pass) {
      for (const f of r.failures) console.log(`    - ${f}`);
    }
  }
}

// Exporta para uso por outro script (geracao de relatorio .md)
await fs.mkdir('tests/characterization/reports', { recursive: true });
await fs.writeFile(
  'tests/characterization/reports/p0_run_result.json',
  JSON.stringify({ generatedAt: new Date().toISOString(), artifactMeta, matrix }, null, 2)
);
console.log('\nResultado bruto salvo em tests/characterization/reports/p0_run_result.json');
