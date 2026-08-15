// Orquestrador da characterization suite.
// Uso: node tests/characterization/harness/run-characterization.mjs
//
// Para cada fixture, executa em um BrowserContext ISOLADO por
// (fixture, artefato) — nenhuma fixture reutiliza sessao/estado de outra,
// nenhum artefato reutiliza sessao de outro. Isso garante que P0-01 nao
// contamine P0-02/P0-03 nem vice-versa.
import { openIsolatedArtifact, closeBrowser, sha256File } from './browser-adapter.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as p0_01 from '../fixtures/p0_01_vent_episode_leak.mjs';
import * as p0_02 from '../fixtures/p0_02_vm_extubation_conflict.mjs';
import * as p0_03 from '../fixtures/p0_03_copy_override_policy.mjs';
import * as ci_05 from '../fixtures/ci_05_exam_compaction.mjs';
import * as e2e_01 from '../fixtures/e2e_full_ui_flow.mjs';

const ARTIFACTS = [
  { key: 'baseline', label: 'Baseline v3.3.12-P1 (congelada)', path: 'baseline/rech_docs_v3_3_12_P1.html' },
  { key: 'reference', label: 'Referencia v3.4.0', path: 'reference/RechDocs_v3.4.0_reference.html' },
  { key: 'candidate', label: 'Candidata atual (output/RechDocs_v3.4.1.html)', path: 'output/RechDocs_v3.4.1.html' },
];

const FIXTURES = [p0_01, p0_02, p0_03, ci_05, e2e_01];

async function main() {
  const artifactMeta = {};
  for (const a of ARTIFACTS) {
    const abs = path.resolve(a.path);
    const stat = await fs.stat(abs);
    artifactMeta[a.key] = { ...a, sha256: await sha256File(abs), bytes: stat.size };
  }

  const results = {}; // results[fixtureId][artifactKey] = { ...runOn output, artifactSha256 }
  const classifications = {}; // classifications[fixtureId] = fixture.classify(...) output

  for (const fixture of FIXTURES) {
    results[fixture.id] = {};
    for (const a of ARTIFACTS) {
      const session = await openIsolatedArtifact(a.path);
      let outcome;
      try {
        outcome = await fixture.runOn(session);
      } catch (e) {
        outcome = { pass: false, failures: [`Excecao no harness: ${String((e && e.stack) || e)}`], observed: null };
      } finally {
        await session.close();
      }
      results[fixture.id][a.key] = { ...outcome, artifactSha256: artifactMeta[a.key].sha256 };
    }
    if (typeof fixture.classify === 'function') {
      classifications[fixture.id] = fixture.classify({
        baseline: results[fixture.id].baseline,
        reference: results[fixture.id].reference,
        candidate: results[fixture.id].candidate,
      });
    }
  }

  await closeBrowser();
  return { artifactMeta, results, classifications };
}

function verdictSymbol(r) {
  if (!r) return '?';
  if (r.pass === null) return 'N/A';
  return r.pass ? 'PASS' : 'FAIL';
}

const { artifactMeta, results, classifications } = await main();

console.log('\n=== Metadados dos artefatos testados ===');
for (const key of ['baseline', 'reference', 'candidate']) {
  const m = artifactMeta[key];
  console.log(`${key}: ${m.path} | ${m.bytes} bytes | sha256=${m.sha256}`);
}

console.log('\n=== Matriz de resultados ===');
for (const fixture of FIXTURES) {
  const row = results[fixture.id];
  console.log(`\n${fixture.id} — ${fixture.description}`);
  console.log(`  evidencia: ${fixture.evidenceKind}`);
  for (const key of ['baseline', 'reference', 'candidate']) {
    const r = row[key];
    console.log(`  ${key.padEnd(10)}: ${verdictSymbol(r)}`);
    if (r && r.failures && r.failures.length) {
      for (const f of r.failures) console.log(`    - ${f}`);
    }
  }
  if (classifications[fixture.id]) {
    console.log('  classificacao:', JSON.stringify(classifications[fixture.id]));
  }
}

await fs.mkdir('tests/characterization/reports', { recursive: true });
const outPath = 'tests/characterization/reports/characterization_run_result.json';
await fs.writeFile(
  outPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), artifactMeta, results, classifications }, null, 2)
);
console.log(`\nResultado bruto salvo em ${outPath}`);
