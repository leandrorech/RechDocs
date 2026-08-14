// P0-03 — politica de copia com override auditavel.
//
// Testa os 5 itens "Decidido" de reports/COPY_POLICY_CONTRACT.md, agora com evidencia dinamica
// real para os itens 4 e 5 (antes marcados como `null`/nao verificaveis) — clica no fluxo completo
// dentro da pagina real: bloqueio -> override cancelado -> override confirmado -> audit log ->
// nova tentativa volta a bloquear. Nao testa os itens UNRESOLVED do contrato (persistencia do
// audit log entre geracoes de documento, diferenciacao por severidade, UX exata, impressao) —
// testar isso inventaria regra que ainda nao foi decidida.
import { captureCopyPolicyStatic, captureCopyFlow, captureCopyUnblockedFlow, captureCopyOverrideFlow } from '../harness/capture-state.mjs';
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';

export const id = 'P0-03';
export const description = 'Politica de copia: bloqueio inicial visivel + override deliberado auditavel (reports/COPY_POLICY_CONTRACT.md)';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE; // complementado por evidencia estatica de captureCopyPolicyStatic

export const expected = [
  '1. Conflito critico impede inicialmente a copia inadvertida (mecanismo de bloqueio presente e efetivo).',
  '2. Conflito/pendencia fica visivel ao usuario (mensagem de status/pending-card, nao suprimido).',
  '3. Existe acao deliberada equivalente a "Copiar mesmo assim".',
  '4. Essa acao exige confirmacao explicita (dinamico: confirm() e chamado; cancelar nao copia).',
  '5. A ocorrencia do override e auditavel durante a sessao (dinamico: audit log recebe timestamp+motivo so apos confirmar).',
  'Extra: sem pendencia, copiar() funciona normalmente sem exigir override; apos um override confirmado, uma nova tentativa de copia normal volta a bloquear (override vale so para aquela operacao).',
].join(' ');

const PENDING_REASON = 'Pendencia critica sintetica para teste P0-03.';

export async function runOn(session) {
  const staticCheck = await captureCopyPolicyStatic(session);
  const blockedFlow = await captureCopyFlow(session, { copyBlocked: true });
  const unblockedFlow = await captureCopyUnblockedFlow(session);

  const failures = [];

  // Teste 1 (sem pendencia -> copia normalmente, sem exigir override).
  const test1 = unblockedFlow.writes.length === 1 && !unblockedFlow.threw;
  if (!test1) {
    failures.push(`Teste 1 (sem pendencia, copia normal) falhou: writes=${JSON.stringify(unblockedFlow.writes)}, threw=${unblockedFlow.threw}.`);
  }

  // Item 1 / Teste 2 (com pendencia critica -> copia bloqueada).
  const item1 = staticCheck.hasBlockMechanism && blockedFlow.writes.length === 0 && !blockedFlow.threwError;
  if (!item1) {
    failures.push(`Item 1 / Teste 2 (bloqueio inicial efetivo) nao confirmado: hasBlockMechanism=${staticCheck.hasBlockMechanism}, writes=${JSON.stringify(blockedFlow.writes)}, threw=${blockedFlow.threwError}.`);
  }
  const item2 = !!blockedFlow.statusText && blockedFlow.statusText.trim().length > 0;
  if (!item2) {
    failures.push(`Item 2 (pendencia visivel) nao confirmado: statusText="${blockedFlow.statusText}".`);
  }
  const item3 = staticCheck.hasDedicatedOverrideId;
  if (!item3) {
    failures.push('Item 3 (afordancia dedicada "Copiar mesmo assim") ausente — nenhum id/rotulo de override de copia encontrado no HTML.');
  }

  let overrideFlow = { supported: false };
  let item4 = null, item5 = null;
  let test3 = null, test4 = null, test5 = null, test6 = null, test7 = null;

  if (!item3) {
    failures.push('Itens 4 e 5 (confirmacao explicita / auditabilidade do override) nao verificaveis: dependem do item 3 existir primeiro.');
  } else {
    overrideFlow = await captureCopyOverrideFlow(session, { pendingReason: PENDING_REASON });
    if (!overrideFlow.supported) {
      failures.push('Item 3 indicou afordancia de override no HTML, mas copiarComOverride() nao existe como funcao — inconsistencia entre marcacao estatica e implementacao.');
    } else {
      // Teste 3 / item 4a: "Copiar mesmo assim" pede confirmacao (confirm() chamado).
      test3 = overrideFlow.confirmCalls.length >= 1;
      if (!test3) failures.push('Teste 3 (override pede confirmacao) falhou: confirm() nao foi chamado.');

      // Teste 4: cancelar a confirmacao -> nao copia (nenhuma escrita nova em relacao ao estado bloqueado).
      test4 = overrideFlow.writesAfterCancel === overrideFlow.writesAfterBlockedNormalCopy;
      if (!test4) failures.push(`Teste 4 (cancelar confirmacao nao copia) falhou: writes apos bloqueio normal=${overrideFlow.writesAfterBlockedNormalCopy}, apos cancelar override=${overrideFlow.writesAfterCancel}.`);

      // Teste 5: confirmar -> copia exatamente uma vez (uma escrita a mais que apos o cancelamento).
      test5 = overrideFlow.writesAfterConfirm === overrideFlow.writesAfterCancel + 1;
      if (!test5) failures.push(`Teste 5 (confirmar copia uma unica vez) falhou: writes apos cancelar=${overrideFlow.writesAfterCancel}, apos confirmar=${overrideFlow.writesAfterConfirm}.`);

      // Teste 6 / item 5: audit log fica vazio apos cancelar, e registra timestamp+motivo apos confirmar.
      const auditHasTimestamp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(overrideFlow.auditListAfterConfirm);
      const auditHasReason = overrideFlow.auditListAfterConfirm.includes(PENDING_REASON);
      test6 = overrideFlow.auditListAfterCancel === '' && overrideFlow.auditCardShownAfterConfirm && auditHasTimestamp && auditHasReason;
      if (!test6) failures.push(`Teste 6 (audit log registra override com timestamp+motivo, nada no cancelamento) falhou: auditAfterCancel="${overrideFlow.auditListAfterCancel}", auditAfterConfirm="${overrideFlow.auditListAfterConfirm}", cardShown=${overrideFlow.auditCardShownAfterConfirm}.`);

      // Teste 7: override vale so para aquela copia — apos confirmar, o bloqueio padrao permanece
      // ativo e uma segunda tentativa de copia NORMAL volta a ser bloqueada (nenhuma escrita nova).
      test7 = overrideFlow.copyBlockedAfterConfirm === true && overrideFlow.writesAfterSecondNormal === overrideFlow.writesAfterConfirm;
      if (!test7) failures.push(`Teste 7 (bloqueio padrao volta apos o override) falhou: COPY_BLOCKED apos confirmar=${overrideFlow.copyBlockedAfterConfirm}, writes apos 2a tentativa normal=${overrideFlow.writesAfterSecondNormal} (esperado igual a ${overrideFlow.writesAfterConfirm}).`);

      item4 = test3 && test4;
      item5 = test6;
    }
  }

  return {
    pass: failures.length === 0,
    failures,
    observed: {
      staticCheck,
      blockedFlow,
      unblockedFlow,
      overrideFlow,
      items: { item1, item2, item3, item4, item5 },
      tests: { test1, test3, test4, test5, test6, test7 },
    },
  };
}

export function classify({ baseline, reference, candidate }) {
  // Nao e um bug comportamental — e politica de produto que pode estar implementada ou pendente
  // conforme o artefato. Classificado uniformemente como EXPECTED_CHANGE (mudanca desejada quando
  // presente; trabalho pendente quando ausente) — nunca REGRESSION, ja que nenhum artefato tinha a
  // politica completa antes.
  const noteFor = (name, r) => {
    const items = r.observed.items;
    if (!items.item1) {
      return `${name}: nem o bloqueio inicial (item 1) esta implementado — lacuna mais ampla que so a falta de override.`;
    }
    if (items.item3 && items.item4 && items.item5) {
      return `${name}: politica completa (bloqueio + override com confirmacao + audit log + revalidacao apos a operacao) implementada e confirmada dinamicamente.`;
    }
    return `${name}: bloqueio inicial presente, mas sem override deliberado/auditavel completo (itens 3-5) — politica pendente de implementacao.`;
  };
  return {
    label: 'EXPECTED_CHANGE',
    rationale: [noteFor('baseline', baseline), noteFor('reference', reference), noteFor('candidate', candidate)].join(' '),
  };
}
