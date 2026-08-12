// CI-05 — compactacao cumulativa de exames para apresentacao.
//
// NAO reabre a hipotese de whitelist Hb/Ht (ja verificada e descartada por
// inspecao de codigo — ver reports/CHANGE_IMPACT.md CI-05). Esta fixture
// so caracteriza buildExamesCompactos() nos 6 casos minimos combinados.
// buildExamesCompactos() nao existe na baseline — resultado esperado la e
// "nao suportado" (N/A), nao FAIL.
//
// NOTA (descoberta durante a execucao, nao hipotese previa): a referencia
// TEM uma funcao de mesmo nome, mas com implementacao MAIS SIMPLES/DIFERENTE
// da candidata — nao inclui unidade no texto, nao deduplica nada, e agrupa
// so por tipo (nao por tipo+data). Ou seja, "buildExamesCompactos()" na
// candidata nao e um port direto da versao da referencia; e uma
// implementacao propria mais elaborada com o mesmo nome. As expectativas
// abaixo foram escritas contra o comportamento ja documentado da candidata
// em reports/CHANGE_IMPACT.md (CI-05) — aplicar o mesmo criterio a
// referencia produz FAIL, mas isso reflete uma funcao estruturalmente
// diferente, nao um defeito da referencia por seus proprios criterios.
import { captureExamCompaction } from '../harness/capture-state.mjs';
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';

export const id = 'CI-05';
export const description = 'Compactacao cumulativa de exames — casos minimos de dedupe/preservacao';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE;
export const expected = [
  '1. Duplicata exata (mesmo nome+resultado+unidade+data+hora) -> aparece uma unica vez.',
  '2. Mesmo analito, resultado diferente -> ambos aparecem.',
  '3. Mesmo analito, datas diferentes -> ambos aparecem.',
  '4. Mesmo analito, horarios diferentes (mesma data) -> ambos aparecem.',
  '5. Mesmo analito, unidades diferentes -> ambos aparecem.',
  '6. d.exames permanece inalterado (mesmo conteudo) antes/depois da chamada.',
].join(' ');

const exames = [
  // Caso 1: duplicata exata (dois itens identicos)
  { nome: 'Hb', resultado: '8.9', unidade: 'g/dL', data: '01/07/2026', hora: '08:00', tipo: 'lab' },
  { nome: 'Hb', resultado: '8.9', unidade: 'g/dL', data: '01/07/2026', hora: '08:00', tipo: 'lab' },
  // Caso 2: mesmo analito, resultado diferente, mesma data/hora
  { nome: 'K', resultado: '3.2', unidade: 'mEq/L', data: '02/07/2026', hora: '09:00', tipo: 'lab' },
  { nome: 'K', resultado: '4.1', unidade: 'mEq/L', data: '02/07/2026', hora: '09:00', tipo: 'lab' },
  // Caso 3: mesmo analito, datas diferentes
  { nome: 'Creatinina', resultado: '1.8', unidade: 'mg/dL', data: '01/07/2026', hora: '08:00', tipo: 'lab' },
  { nome: 'Creatinina', resultado: '1.8', unidade: 'mg/dL', data: '03/07/2026', hora: '08:00', tipo: 'lab' },
  // Caso 4: mesmo analito, mesma data, horarios diferentes
  { nome: 'Lactato', resultado: '2.0', unidade: 'mmol/L', data: '04/07/2026', hora: '06:00', tipo: 'gasometria' },
  { nome: 'Lactato', resultado: '2.0', unidade: 'mmol/L', data: '04/07/2026', hora: '18:00', tipo: 'gasometria' },
  // Caso 5: mesmo analito/data/hora, unidades diferentes
  { nome: 'Bilirrubina total', resultado: '1.5', unidade: 'mg/dL', data: '05/07/2026', hora: '07:00', tipo: 'lab' },
  { nome: 'Bilirrubina total', resultado: '1.5', unidade: 'micromol/L', data: '05/07/2026', hora: '07:00', tipo: 'lab' },
];

export async function runOn(session) {
  const result = await captureExamCompaction(session, exames);
  if (!result.supported) {
    return { pass: null, failures: [], observed: { supported: false }, notApplicable: true };
  }

  const text = result.compactedText || '';
  const failures = [];

  // Caso 1: duplicata exata -> uma unica ocorrencia de "Hb: 8.9 g/dL"
  const hbOccurrences = (text.match(/Hb:\s*8\.9/g) || []).length;
  if (hbOccurrences !== 1) failures.push(`Caso 1 (duplicata exata): esperado 1 ocorrencia de Hb 8.9, observado ${hbOccurrences}.`);

  // Caso 2: dois resultados de K diferentes devem aparecer
  const hasK32 = /K:\s*3\.2/.test(text), hasK41 = /K:\s*4\.1/.test(text);
  if (!hasK32 || !hasK41) failures.push(`Caso 2 (resultado diferente): esperado K 3.2 e K 4.1 ambos presentes; observado K3.2=${hasK32}, K4.1=${hasK41}.`);

  // Caso 3: Creatinina deve aparecer em dois grupos de data distintos
  const crGroups = (text.match(/Creatinina:\s*1\.8/g) || []).length;
  if (crGroups !== 2) failures.push(`Caso 3 (datas diferentes): esperado Creatinina em 2 grupos de data, observado ${crGroups} ocorrencia(s).`);

  // Caso 4: Lactato em dois horarios diferentes, mesma data -> 2 ocorrencias
  const lacOccurrences = (text.match(/Lactato:\s*2/g) || []).length;
  if (lacOccurrences !== 2) failures.push(`Caso 4 (horarios diferentes): esperado Lactato em 2 ocorrencias (horarios distintos), observado ${lacOccurrences}.`);

  // Caso 5: Bilirrubina com 2 unidades diferentes -> ambas presentes
  const hasMgDl = /Bilirrubina total:\s*1\.5\s*mg\/dL/.test(text);
  const hasMicromol = /Bilirrubina total:\s*1\.5\s*micromol\/L/.test(text);
  if (!hasMgDl || !hasMicromol) failures.push(`Caso 5 (unidades diferentes): esperado ambas unidades presentes; mg/dL=${hasMgDl}, micromol/L=${hasMicromol}.`);

  // Caso 6: array original inalterado
  if (!result.unchanged) failures.push('Caso 6 (imutabilidade): d.exames foi alterado pela chamada a buildExamesCompactos().');

  return {
    pass: failures.length === 0,
    failures,
    observed: { compactedText: text, unchanged: result.unchanged, sameReference: result.sameReference },
  };
}

export function classify({ baseline, reference, candidate }) {
  const note = (name, r) => `${name}: ${r.observed?.supported === false ? 'buildExamesCompactos() nao existe (N/A)' : (r.pass ? 'todos os 6 casos OK' : `${r.failures.length} caso(s) com falha`)}`;
  if (baseline.notApplicable) {
    return {
      label: candidate.pass ? 'EXPECTED_CHANGE' : 'UNRESOLVED',
      rationale: `Baseline nao tem essa funcao (N/A, esperado). ${note('reference', reference)} — implementacao estruturalmente diferente da candidata (sem unidade, sem dedupe, agrupamento so por tipo), nao um defeito por criterio proprio; FAIL aqui reflete incompatibilidade de contrato entre as duas funcoes homonimas, nao um bug da referencia. ${note('candidate', candidate)}, confirmando os 6 casos minimos descritos em CHANGE_IMPACT.md CI-05.`,
    };
  }
  return { label: 'UNRESOLVED', rationale: 'Baseline inesperadamente possui buildExamesCompactos() — revisar premissa da fixture.' };
}
