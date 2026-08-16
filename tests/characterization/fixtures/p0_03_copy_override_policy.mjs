// P0-03 — politica de copia: SINALIZACAO MAXIMA, SEM BLOQUEIO.
//
// Contrato vigente (reports/COPY_POLICY_CONTRACT.md, revisado em 2026-08-15):
//   ALERTA CRITICO VISUAL -> usuario ve a inconsistencia -> copia/impressao PERMANECEM LIBERADAS.
//
// O contrato anterior (bloqueio + "Copiar mesmo assim" + confirm() obrigatorio) foi CANCELADO por
// decisao do produto. Esta fixture testa o contrato atual e, deliberadamente, tambem verifica a
// AUSENCIA dos mecanismos de bloqueio — se eles reaparecerem, e regressao.
//
// Nao testa os itens UNRESOLVED do contrato (persistencia do log entre geracoes, resolucao granular
// do alerta, diferenciacao por severidade) — testar isso inventaria regra nao decidida.
import { captureCriticalAlertPolicy } from '../harness/capture-state.mjs';
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';

export const id = 'P0-03';
export const description = 'Politica de copia: alerta critico visivel e copia/impressao SEMPRE liberadas (reports/COPY_POLICY_CONTRACT.md)';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE;

export const expected = [
  '1. Pendencia critica detectada produz banner critico visivel.',
  '2. Lista concreta das pendencias visivel sob o banner.',
  '3. "Copiar tudo" habilitado e funcional mesmo com pendencia.',
  '4. "Imprimir / PDF" funcional mesmo com pendencia, sem excecao.',
  '5. Editar o texto nao remove o alerta por si so.',
  '6. Copia com alerta ativo funciona e nao exige confirmacao.',
  '7. Audit log registra que a saida ocorreu com alerta critico ativo.',
  '8. Nao existe mecanismo de bloqueio nem fluxo de override (nada a contornar).',
].join(' ');

const PENDING = ['Pendencia critica sintetica A.', 'Pendencia critica sintetica B.'];

export async function runOn(session) {
  const obs = await captureCriticalAlertPolicy(session, { pendencies: PENDING });

  if (!obs.supported) {
    // baseline/referencia nao possuem o mecanismo de alerta critico desta versao.
    return { pass: null, failures: [], observed: obs };
  }

  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };

  check(obs.withPending.bannerVisible === true,
    `Criterio 1 (banner critico visivel): banner nao apareceu com pendencia ativa (className="${obs.withPending.bannerClass}").`);

  check(obs.withPending.bannerMentionsAtencao === true,
    `Criterio 1b: banner nao contem o texto de atencao exigido pelo contrato (titulo="${obs.withPending.bannerTitle}").`);

  check(PENDING.every((p) => obs.withPending.bannerListText.includes(p)),
    `Criterio 2 (lista de pendencias visivel): lista nao contem todas as pendencias. Observado: "${obs.withPending.bannerListText}".`);

  check(obs.withPending.copyButtonDisabled === false,
    `Criterio 3 (copiar habilitado): botao "Copiar tudo" esta desabilitado com pendencia ativa — o contrato proibe bloqueio.`);

  check(obs.withPending.copyWarnVisible === true,
    'Criterio 3b: aviso junto aos botoes Copiar/Imprimir nao esta visivel com pendencia ativa.');

  check(obs.withPending.copyWrites === 1 && obs.withPending.copyConfirms === 0,
    `Criterio 6 (copia com alerta funciona sem confirmacao): writes=${obs.withPending.copyWrites} (esperado 1), confirm() chamado ${obs.withPending.copyConfirms}x (esperado 0).`);

  check(obs.withPending.printThrew === null && obs.withPending.printCalls === 1,
    `Criterio 4 (impressao funcional): threw=${obs.withPending.printThrew}, window.print() chamado ${obs.withPending.printCalls}x (esperado 1).`);

  check(obs.afterEdit.bannerStillVisible === true && obs.afterEdit.alertStillActive === true,
    `Criterio 5 (edicao nao remove o alerta): apos editar, bannerVisible=${obs.afterEdit.bannerStillVisible}, CRITICAL_ALERT_ACTIVE=${obs.afterEdit.alertStillActive}.`);

  check(obs.afterEdit.copyStillWorks === true,
    'Criterio 5b: apos a edicao, copiar() deixou de funcionar — a saida deve permanecer sempre disponivel.');

  const auditOk = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(obs.withPending.auditText)
    && /alerta cr[ií]tico ativo/i.test(obs.withPending.auditText);
  check(auditOk,
    `Criterio 7 (audit log da saida com alerta): registro ausente ou sem timestamp/motivo. Observado: "${obs.withPending.auditText}".`);

  check(obs.noBlockingMechanism === true,
    `Criterio 8 (sem bloqueio a contornar): ainda existem simbolos de bloqueio/override no artefato: ${JSON.stringify(obs.legacySymbols)}.`);

  check(obs.noPending.bannerVisible === false && obs.noPending.copyWrites === 1,
    `Controle (sem pendencia): banner nao deveria aparecer (bannerVisible=${obs.noPending.bannerVisible}) e copia deveria funcionar (writes=${obs.noPending.copyWrites}).`);

  return { pass: failures.length === 0, failures, observed: obs };
}

export function classify({ baseline, reference, candidate }) {
  if (candidate.pass === true) {
    return {
      label: 'EXPECTED_CHANGE',
      rationale:
        'Candidata implementa o contrato vigente: alerta critico visivel e maximo, sem qualquer bloqueio de copia/impressao. '
        + 'baseline e referencia sao N/A (nao possuem o mecanismo de alerta desta versao); a baseline tinha bloqueio absoluto e a '
        + 'referencia nao tinha nem bloqueio nem sinalizacao — nenhuma das duas atende ao contrato atual.',
    };
  }
  if (candidate.pass === false) {
    return { label: 'REGRESSION', rationale: 'Politica de sinalizacao critica falhou na candidata — investigar antes do release.' };
  }
  return { label: 'UNRESOLVED', rationale: 'Nao avaliavel na candidata.' };
}
