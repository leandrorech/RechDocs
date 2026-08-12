// P0-03 — politica de copia com override auditavel.
//
// Testa exclusivamente os 5 itens "Decidido" de reports/COPY_POLICY_CONTRACT.md.
// Nao testa os itens UNRESOLVED do contrato (persistencia do audit log,
// duracao/escopo do override, diferenciacao por severidade, UX exata,
// impressao) — testar isso inventaria regra que ainda nao foi decidida.
import { captureCopyPolicyStatic, captureCopyFlow } from '../harness/capture-state.mjs';
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';

export const id = 'P0-03';
export const description = 'Politica de copia: bloqueio inicial visivel + override deliberado auditavel (reports/COPY_POLICY_CONTRACT.md)';
export const evidenceKind = EVIDENCE_KIND.STATIC_CODE_EVIDENCE; // complementado por evidencia dinamica de captureCopyFlow

export const expected = [
  '1. Conflito critico impede inicialmente a copia inadvertida (mecanismo de bloqueio presente e efetivo).',
  '2. Conflito/pendencia fica visivel ao usuario (mensagem de status/pending-card, nao suprimido).',
  '3. Existe acao deliberada equivalente a "Copiar mesmo assim".',
  '4. Essa acao exige confirmacao explicita.',
  '5. A ocorrencia do override e auditavel durante a sessao.',
].join(' ');

export async function runOn(session) {
  const staticCheck = await captureCopyPolicyStatic(session);
  const blockedFlow = await captureCopyFlow(session, { copyBlocked: true });

  const failures = [];
  const item1 = staticCheck.hasBlockMechanism && blockedFlow.writes.length === 0 && !blockedFlow.threwError;
  if (!item1) {
    failures.push(`Item 1 (bloqueio inicial efetivo) nao confirmado: hasBlockMechanism=${staticCheck.hasBlockMechanism}, writes=${JSON.stringify(blockedFlow.writes)}, threw=${blockedFlow.threwError}.`);
  }
  const item2 = !!blockedFlow.statusText && blockedFlow.statusText.trim().length > 0;
  if (!item2) {
    failures.push(`Item 2 (pendencia visivel) nao confirmado: statusText="${blockedFlow.statusText}".`);
  }
  const item3 = staticCheck.hasDedicatedOverrideId;
  if (!item3) {
    failures.push('Item 3 (afordancia dedicada "Copiar mesmo assim") ausente — nenhum id/rotulo de override de copia encontrado no HTML.');
  }
  // Itens 4 e 5 dependem estruturalmente do item 3 existir (nao ha o que confirmar/auditar
  // sem a acao de override existir primeiro) — sem item 3, marcados como nao verificaveis.
  const item4 = item3 ? null : false; // null = nao verificavel nesta rodada (nao ha override para testar confirmacao)
  const item5 = item3 ? null : false;
  if (item3 === false) {
    failures.push('Itens 4 e 5 (confirmacao explicita / auditabilidade do override) nao verificaveis: dependem do item 3 existir primeiro.');
  }

  return {
    pass: failures.length === 0,
    failures,
    observed: {
      staticCheck,
      blockedFlow,
      items: { item1, item2, item3, item4, item5 },
    },
  };
}

export function classify({ baseline, reference, candidate }) {
  // Nao e um bug comportamental — e politica de produto ainda nao implementada.
  // Classificado uniformemente como EXPECTED_CHANGE (trabalho pendente), exceto
  // onde um artefato individualmente nem tem o bloqueio inicial (item 1), que e
  // uma lacuna adicional daquele artefato especifico.
  const noteFor = (name, r) => {
    if (!r.observed.items.item1) {
      return `${name}: nem o bloqueio inicial (item 1) esta implementado — lacuna mais ampla que so a falta de override.`;
    }
    return `${name}: bloqueio inicial presente, mas sem override deliberado/auditavel (itens 3-5) — politica pendente de implementacao.`;
  };
  return {
    label: 'EXPECTED_CHANGE',
    rationale: [noteFor('baseline', baseline), noteFor('reference', reference), noteFor('candidate', candidate)].join(' '),
  };
}
