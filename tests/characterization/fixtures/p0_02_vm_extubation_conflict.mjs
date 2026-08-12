// P0-02 — empate ventilatorio "VM ativa x extubado" no mesmo contexto
// temporal.
//
// Instrucao explicita: nao assumir que o comportamento historico continua
// identico. Precisamos verificar dinamicamente, para cada artefato:
//   - o conflito realmente e criado (engine.conflitos nao-vazio)?
//   - nenhuma das duas informacoes e escolhida silenciosamente (estado
//     ventilatorio resultante nao deveria "decidir" implicitamente)?
//   - qual estado fica em ClinicalState.ventilatorio?
//   - o conflito, quando existe, chega a warns -> buildCriticalPendencies ->
//     COPY_BLOCKED (efeito real no fluxo de copia), ou fica so no warn-card
//     sem bloquear nada?
// Nao classificar como CRITICAL so pela presenca da palavra "bloqueante" na
// mensagem — o que importa e o comportamento operacional observado.
//
// Duas subvariantes, mantidas separadas porque produzem resultados
// diferentes (achado desta rodada, nao do relatorio historico):
//   P0-02a (controle) — formulacao simetrica ("intubado" x "extubado"),
//     ambos os radicais batem em EXECUTED_VERBS -> compara chega ao
//     criterio de ordem/empate real.
//   P0-02b (achado) — formulacao assimetrica ("VM ativa" x "extubado"): so
//     "extubado" bate em EXECUTED_VERBS -> comparaPrecedencia resolve
//     decisivamente a favor de "extubado" ANTES de chegar ao criterio de
//     empate, entao nenhum conflito e gerado.
import { captureClinicalStateWithCopyEffect } from '../harness/capture-state.mjs';
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';

export const id = 'P0-02';
export const description = 'Empate ventilatorio (VM ativa x extubado) — deteccao de conflito e efeito no fluxo de copia';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE;
export const expected = 'Conflito ventilatorio registrado em engine.conflitos; esse conflito deve propagar ate buildCriticalPendencies e bloquear a copia (wouldBlockCopy=true). Nenhum dos dois estados (VM ativa / extubado) deve ser escolhido silenciosamente.';

// alergias/leito preenchidos deliberadamente para isolar buildCriticalPendencies()
// da UNICA fonte de pendencia relevante ao caso (o conflito ventilatorio) —
// caso contrario, "ALERGIAS nao informadas" dispara wouldBlockCopy=true por
// um motivo nao relacionado, mascarando se o conflito de VM especificamente
// foi ou nao capturado como pendencia critica.
const BASE_FIELDS = { alergias: 'Nega alergias medicamentosas conhecidas.', leito: '10A' };

const rawSymmetric = {
  ...BASE_FIELDS,
  ventilatorio: [
    { status: 'intubado', modo: 'PCV', data: '05/07/2026', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
    { status: 'extubado', data: '05/07/2026', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
  ],
};

const rawAsymmetric = {
  ...BASE_FIELDS,
  ventilatorio: [
    { status: 'VM ativa', modo: 'PCV', data: '05/07/2026', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
    { status: 'extubado', data: '05/07/2026', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
  ],
};

function hasVentConflict(conflitos) {
  return (conflitos || []).some((c) => /ventilat[oó]rio/i.test(c) || /vm ativa/i.test(c) || /extuba/i.test(c));
}

async function runVariant(session, raw) {
  const result = await captureClinicalStateWithCopyEffect(session, raw, 'evolucao');
  const conflictDetected = hasVentConflict(result.conflitos);
  const silentlyResolved = !conflictDetected && Object.keys(result.finalData?.ventilatorio || {}).length === 0
    ? 'extubado (implicito, sem sinalizacao)'
    : (!conflictDetected ? 'ativo (implicito, sem sinalizacao)' : null);
  return {
    conflictDetected,
    silentlyResolved,
    ventilatorio: result.finalData?.ventilatorio,
    conflitos: result.conflitos,
    copyEffect: result.copyEffect,
    pageErrors: result.pageErrors,
    consoleErrors: result.consoleErrors,
  };
}

export async function runOn(session) {
  const symmetric = await runVariant(session, rawSymmetric);
  const asymmetric = await runVariant(session, rawAsymmetric);

  const failures = [];
  if (!symmetric.conflictDetected) {
    failures.push(`P0-02a (controle, simetrico) — nenhum conflito detectado: conflitos=${JSON.stringify(symmetric.conflitos)}.`);
  } else if (!symmetric.copyEffect?.wouldBlockCopy) {
    failures.push(`P0-02a (controle) — conflito detectado mas NAO bloqueia copia: copyEffect=${JSON.stringify(symmetric.copyEffect)}.`);
  }
  if (!asymmetric.conflictDetected) {
    failures.push(
      `P0-02b (assimetrico "VM ativa" x "extubado") — nenhum conflito detectado; estado resolvido silenciosamente para "${asymmetric.silentlyResolved}". ` +
      `copyEffect=${JSON.stringify(asymmetric.copyEffect)} (copia NAO bloqueada apesar da contradicao).`
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    observed: { symmetric, asymmetric },
  };
}

export function classify({ baseline, reference, candidate }) {
  // Classificacao separada por subvariante, porque tem historico e causa raiz diferentes.
  const sub = (getVariant) => {
    const b = getVariant(baseline.observed), r = getVariant(reference.observed), c = getVariant(candidate.observed);
    const bPass = b.conflictDetected && b.copyEffect?.wouldBlockCopy;
    const rPass = r.conflictDetected && r.copyEffect?.wouldBlockCopy;
    const cPass = c.conflictDetected && c.copyEffect?.wouldBlockCopy;
    if (bPass && rPass && cPass) return { label: 'EXPECTED_CHANGE', rationale: 'Mecanismo de deteccao de empate funciona nos tres artefatos e efetivamente bloqueia a copia — comportamento correto confirmado dinamicamente.' };
    if (!bPass && !rPass && !cPass) return { label: 'REFERENCE_BUG_REVEALED', rationale: 'Bug presente inclusive na referencia (fonte de correcoes deliberadas conhecidas) — achado novo, sem ID previo em REGRESSION_RISKS.md.' };
    if (bPass && !cPass) return { label: 'REGRESSION', rationale: 'Baseline bloqueava corretamente e a candidata deixou de bloquear.' };
    return { label: 'UNRESOLVED', rationale: 'Combinacao mista entre artefatos — revisar manualmente antes de reconciliar.' };
  };
  return {
    'P0-02a': sub((o) => o.symmetric),
    'P0-02b': sub((o) => o.asymmetric),
  };
}
