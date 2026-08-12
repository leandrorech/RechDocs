// P0-02 — empate "VM ativa x extubado" nao gera conflito bloqueante.
//
// Origem: reports/RECHDOCS_ANALISE_COMPLETA_2026-08-02.md, achado P0-02
// ("baseline falha, referencia v3.4.0 passa").
//
// IMPORTANTE — divergencia encontrada e documentada aqui, nao escondida:
// a reproducao literal do cenario com formulacao SIMETRICA ("intubado" x
// "extubado", mesma data/hora/ordem — ambos os termos batem no radical de
// EXECUTED_VERBS) resulta em PASS nos TRES artefatos (baseline, referencia
// E candidato geram o conflito corretamente). Isso NAO reproduz a alegacao
// original de que a baseline falha e so a referencia passa.
//
// Por leitura de comparaPrecedencia() (baseline ~1282-1324 / referencia
// ~1257-1299, codigo identico nesse trecho), o desempate por "acao
// executada" usa EXECUTED_VERBS. Quando os dois lados usam radicais que
// batem simetricamente ("intubad"/"extubad"), a comparacao chega ao
// criterio de ordem e, com ordem igual, ao empate real (cmp=0) — que E
// tratado como conflito nos tres arquivos. Mas quando um lado usa uma
// formulacao que NAO bate em nenhum radical de EXECUTED_VERBS (ex: "VM
// ativa"), a comparacao resolve DECISIVAMENTE a favor do lado que bate
// ("extubado") sem nunca chegar ao empate — nenhum conflito e registrado,
// apesar de as duas mencoes serem clinicamente contraditorias.
//
// Portanto tratamos como dois casos distintos, ambos derivados da mesma
// fixture-base do relatorio de origem, mas o segundo (P0-02b) e um achado
// NOVO desta rodada, nao presente no relatorio historico:
//   P0-02a — formulacao simetrica (intubado x extubado): esperado PASS.
//            Serve de controle/sanidade do mecanismo de empate.
//   P0-02b — formulacao assimetrica (VM ativa x extubado): esperado PASS
//            (deveria gerar conflito); bug real se FAIL.
import { runClinicalState } from './browser-adapter.mjs';

export const id = 'P0-02';
export const description = 'Empate ventilatorio nao gera conflito bloqueante (simetrico=controle, assimetrico=achado novo)';

const rawSymmetric = {
  ventilatorio: [
    { status: 'intubado', modo: 'PCV', data: '2026-07-05', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
    { status: 'extubado', data: '2026-07-05', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
  ],
};

const rawAsymmetric = {
  ventilatorio: [
    { status: 'VM ativa', modo: 'PCV', data: '2026-07-05', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
    { status: 'extubado', data: '2026-07-05', hora: '14:00', tipo_documento: 'evolucao', ordem: 0 },
  ],
};

function hasVentConflict(conflitos) {
  return (conflitos || []).some((c) => /ventilat[oó]rio/i.test(c) || /vm ativa/i.test(c) || /extuba/i.test(c));
}

export async function run(session) {
  const symResult = await runClinicalState(session, rawSymmetric, 'evolucao');
  const asymResult = await runClinicalState(session, rawAsymmetric, 'evolucao');

  const symOk = hasVentConflict(symResult.conflitos);
  const asymOk = hasVentConflict(asymResult.conflitos);

  const failures = [];
  if (!symOk) {
    failures.push(
      `P0-02a (controle, formulacao simetrica) FALHOU — nao deveria: conflitos=${JSON.stringify(symResult.conflitos)}.`
    );
  }
  if (!asymOk) {
    failures.push(
      `P0-02b (formulacao assimetrica "VM ativa" x "extubado") — nenhum conflito registrado apesar do empate clinico. ` +
      `conflitos=${JSON.stringify(asymResult.conflitos)}. Estado resolvido silenciosamente: ${JSON.stringify((asymResult.finalData || {}).ventilatorio)}.`
    );
  }

  return {
    id,
    description,
    pass: failures.length === 0,
    failures,
    observed: {
      symmetric: { conflitos: symResult.conflitos, ventilatorio: (symResult.finalData || {}).ventilatorio },
      asymmetric: { conflitos: asymResult.conflitos, ventilatorio: (asymResult.finalData || {}).ventilatorio },
      pageErrors: [...symResult.pageErrors, ...asymResult.pageErrors],
      consoleErrors: [...symResult.consoleErrors, ...asymResult.consoleErrors],
    },
  };
}
