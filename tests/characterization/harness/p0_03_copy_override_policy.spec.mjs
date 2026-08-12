// P0-03 — politica operacional de copia com confirmacao/override auditavel.
//
// Origem: reports/RECHDOCS_ANALISE_COMPLETA_2026-08-02.md, achado P0-03.
// Diferente de P0-01/P0-02, este NAO e um bug comportamental — e um contrato
// operacional/politica de produto. A regra vigente (decisao posterior do
// usuario, registrada no relatorio de origem) e:
//   1. pendencias e inferencias continuam visiveis;
//   2. a primeira tentativa de copia deve alertar;
//   3. deve exigir confirmacao humana inequivoca;
//   4. deve SEMPRE permitir "Copiar mesmo assim";
//   5. a acao forcada deve permanecer evidente e auditavel durante a sessao.
//
// Este teste codifica a regra explicitamente e verifica sua presenca --
// nao trata ausencia de botao como "UI quebrada", trata como politica nao
// implementada. E esperado que FALHE em baseline, referencia e candidato ate
// que a politica seja implementada deliberadamente (ver CHANGE_IMPACT.md).
import fs from 'node:fs/promises';

export const id = 'P0-03';
export const description = 'Politica de copia com confirmacao + override auditavel ("Copiar mesmo assim")';

export async function run(session, artifactPath) {
  const html = await fs.readFile(artifactPath, 'utf-8');

  const hasBlockMechanism = await session.page.evaluate(() => {
    return typeof setCopyBlocked === 'function' || typeof COPY_BLOCKED !== 'undefined';
  }).catch(() => false);

  const hasOverrideAffordance = /mesmo\s+assim/i.test(html) && /copiar/i.test(html.slice(
    Math.max(0, html.search(/mesmo\s+assim/i) - 400),
    html.search(/mesmo\s+assim/i) + 100
  ));
  // busca mais direta por um id/rotulo de override dedicado a copia (nao ao envio a IA)
  const hasDedicatedOverrideId = /copiar[-_]?(mesmo[-_]?assim|forcad[oa]|override)|override[-_]?copiar|forcar[-_]?copia/i.test(html);

  const hasAuditableOverrideOfCopy = hasDedicatedOverrideId; // sem elemento dedicado, nao ha como confirmar auditabilidade

  const failures = [];
  if (!hasBlockMechanism) {
    failures.push('Nao existe mecanismo de bloqueio de copia por pendencia (nem COPY_BLOCKED nem setCopyBlocked) — pendencias podem ser copiadas sem alerta algum.');
  }
  if (!hasDedicatedOverrideId) {
    failures.push('Nao existe nenhuma afordancia dedicada de override de copia ("Copiar mesmo assim" ou equivalente) distinta do fluxo de confirmacao de envio de PHI a API externa.');
  }
  if (!hasAuditableOverrideOfCopy) {
    failures.push('Sem override dedicado, nao ha como verificar se a acao forcada fica registrada/auditavel durante a sessao (regra 5).');
  }

  return {
    id,
    description,
    pass: failures.length === 0,
    failures,
    observed: { hasBlockMechanism, hasOverrideAffordance, hasDedicatedOverrideId },
  };
}
