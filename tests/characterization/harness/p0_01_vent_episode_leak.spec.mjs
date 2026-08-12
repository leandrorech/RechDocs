// P0-01 — vazamento de parametros ventilatorios entre episodios.
//
// Origem: reports/RECHDOCS_ANALISE_COMPLETA_2026-08-02.md, achado P0-01.
// Esse relatorio foi produzido contra um output/RechDocs_v3.4.1.html com hash
// diferente do candidato atual (ver reports/BASELINE_FREEZE.md e
// reports/P0_REVALIDATION_CURRENT_CANDIDATE.md) — tratamos aqui como fonte de
// fixture/hipotese, nao como resultado valido para o artefato de hoje.
//
// Caso sintetico (mesmo descrito no relatorio de origem):
//   1. intubado em VCV, PEEP 8, VC 420 em 01/07;
//   2. extubado em 02/07;
//   3. reintubado em PCV, FiO2 40 em 03/07, sem PEEP ou VC informados.
//
// Esperado: o episodio novo deve conter PCV/FiO2 40, mas NAO pode herdar
// PEEP 8 nem VC 420 do episodio encerrado pela extubacao.
import { runClinicalState } from './browser-adapter.mjs';

export const id = 'P0-01';
export const description = 'Vazamento de parametros ventilatorios entre episodios (extubacao/reintubacao)';

const raw = {
  ventilatorio: [
    { status: 'intubado', modo: 'VCV', peep: '8', vc_ml: '420', data: '2026-07-01', hora: '08:00', tipo_documento: 'evolucao', ordem: 0 },
    { status: 'extubado', data: '2026-07-02', hora: '10:00', tipo_documento: 'evolucao', ordem: 1 },
    { status: 'intubado', modo: 'PCV', fio2: '40', data: '2026-07-03', hora: '09:00', tipo_documento: 'evolucao', ordem: 2 },
  ],
};

export async function run(session) {
  const result = await runClinicalState(session, raw, 'evolucao');
  const vent = (result.finalData && result.finalData.ventilatorio) || {};

  const failures = [];
  if (vent.peep !== undefined && vent.peep !== null && vent.peep !== '') {
    failures.push(`PEEP do episodio encerrado vazou para o estado atual: peep="${vent.peep}" (esperado: ausente).`);
  }
  if (vent.vc_ml !== undefined && vent.vc_ml !== null && vent.vc_ml !== '') {
    failures.push(`VC do episodio encerrado vazou para o estado atual: vc_ml="${vent.vc_ml}" (esperado: ausente).`);
  }
  if (vent.modo !== 'PCV') {
    failures.push(`Modo do episodio atual incorreto: modo="${vent.modo}" (esperado: "PCV").`);
  }
  if (String(vent.fio2) !== '40') {
    failures.push(`FiO2 do episodio atual incorreto: fio2="${vent.fio2}" (esperado: "40").`);
  }

  return {
    id,
    description,
    pass: failures.length === 0,
    failures,
    observed: { ventilatorio: vent, conflitos: result.conflitos, pageErrors: result.pageErrors, consoleErrors: result.consoleErrors },
  };
}
