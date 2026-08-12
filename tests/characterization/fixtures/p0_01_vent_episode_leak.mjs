// P0-01 — vazamento de parametros ventilatorios entre episodios.
//
// Hipotese (evidencia estatica, a confirmar dinamicamente aqui): na
// candidata e na baseline, resolveVentilatorio() resolve cada campo por
// precedencia entre TODOS os eventos do array (`arr` inteiro), sem nocao de
// "episodio" ventilatorio. A referencia v3.4.0 contem um comentario
// explicito `// fix P0-06 (26/07/2026)` que ordena os eventos
// cronologicamente e restringe os candidatos de cada campo ao episodio
// vigente: `lastExtubIdx` -> `episodioAtual = sorted.slice(lastExtubIdx+1)`.
//
// Caso sintetico:
//   1. intubado em VCV, PEEP 8, VC 420 em 01/07;
//   2. extubado em 02/07;
//   3. reintubado em PCV, FiO2 40 em 03/07, sem PEEP ou VC informados.
// Esperado: o novo episodio deve conter PCV e FiO2 40, mas NAO pode herdar
// PEEP 8 ou VC 420 do episodio encerrado.
import { captureClinicalState } from '../harness/capture-state.mjs';
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';

export const id = 'P0-01';
export const description = 'Vazamento de parametros ventilatorios entre episodios (extubacao/reintubacao)';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE;
export const expected = 'Episodio novo contem modo=PCV, fio2=40; peep e vc_ml ausentes (nao herdados do episodio encerrado).';

const raw = {
  ventilatorio: [
    { status: 'intubado', modo: 'VCV', peep: '8', vc_ml: '420', data: '01/07/2026', hora: '08:00', tipo_documento: 'evolucao', ordem: 0 },
    { status: 'extubado', data: '02/07/2026', hora: '10:00', tipo_documento: 'evolucao', ordem: 1 },
    { status: 'intubado', modo: 'PCV', fio2: '40', data: '03/07/2026', hora: '09:00', tipo_documento: 'evolucao', ordem: 2 },
  ],
};

export async function runOn(session) {
  const result = await captureClinicalState(session, raw, 'evolucao');
  const vent = (result.finalData && result.finalData.ventilatorio) || {};

  const failures = [];
  if (vent.peep !== undefined && vent.peep !== null && vent.peep !== '') {
    failures.push(`PEEP do episodio encerrado vazou: peep="${vent.peep}" (esperado ausente).`);
  }
  if (vent.vc_ml !== undefined && vent.vc_ml !== null && vent.vc_ml !== '') {
    failures.push(`VC do episodio encerrado vazou: vc_ml="${vent.vc_ml}" (esperado ausente).`);
  }
  if (vent.modo !== 'PCV') {
    failures.push(`Modo incorreto: modo="${vent.modo}" (esperado "PCV").`);
  }
  if (String(vent.fio2) !== '40') {
    failures.push(`FiO2 incorreto: fio2="${vent.fio2}" (esperado "40").`);
  }

  return {
    pass: failures.length === 0,
    failures,
    observed: {
      ventilatorio: vent,
      conflitos: result.conflitos,
      warnings: result.warnings,
      auditLog: result.auditLog,
      pageErrors: result.pageErrors,
      consoleErrors: result.consoleErrors,
    },
  };
}

// Classificacao cruzada, aplicada depois de rodar nos tres artefatos.
export function classify({ baseline, reference, candidate }) {
  if (candidate.pass) {
    if (!baseline.pass) {
      return {
        label: 'EXPECTED_CHANGE',
        rationale: 'Candidata corrige um bug presente na baseline — mudanca desejada, nao regressao.',
      };
    }
    return { label: 'EXPECTED_CHANGE', rationale: 'Candidata mantem comportamento correto ja presente na baseline.' };
  }
  // candidate falhou
  if (baseline.pass && !candidate.pass) {
    return {
      label: 'REGRESSION',
      rationale: 'Baseline passava e a candidata falhou — regressao introduzida na consolidacao.',
    };
  }
  if (!baseline.pass && !candidate.pass) {
    return {
      label: 'BASELINE_BUG_REVEALED',
      rationale: reference.pass
        ? 'Bug identico entre baseline e candidata; nao e regressao da consolidacao v3.4.1 (nada piorou), mas confirma que a correcao deliberada disponivel na referencia (fix P0-06) nunca foi portada.'
        : 'Bug identico entre baseline e candidata; referencia tambem falha, sem correcao deliberada conhecida disponivel para port.',
    };
  }
  return { label: 'UNRESOLVED', rationale: 'Combinacao de resultados nao coberta pelas regras acima — revisar manualmente.' };
}
