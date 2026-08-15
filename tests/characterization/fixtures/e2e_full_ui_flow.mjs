// E2E-01 — fluxo real de UI, ponta a ponta, no artefato carregado sem modificacao.
//
// Diferente das fixtures P0-*/CI-05 (que chamam funcoes clinicas diretamente), esta fixture
// exercita o CAMINHO REAL DA INTERFACE: preenche os campos de texto, seleciona o modo, salva a
// chave, clica em "Gerar Documento" (processar()), e so entao opera preview, edicao, copia,
// bloqueio, override, impressao e reinicio de sessao pelos mesmos handlers que o usuario aciona.
//
// Rede: a unica chamada de rede do fluxo (fetch ao provedor de IA) e interceptada por
// page.route() no browser-adapter e respondida com um payload SINTETICO — nenhuma chave real,
// nenhum dado clinico real, nenhuma requisicao sai da maquina. Ver installProviderStub().
//
// Dados: 100% sinteticos/desidentificados. Nenhum identificador de paciente real; o campo de
// identificacao usa "PACIENTE TESTE E2E" e leito fictício.
//
// Cobertura (10 cenarios pedidos no release gate):
//   1. geracao normal (sem pendencia critica) pela UI
//   2. preview renderizado
//   3. edicao apos geracao (preview editavel) invalida a liberacao
//   4. copiar sem pendencia
//   5. bloqueio com pendencia critica
//   6. override cancelado
//   7. override confirmado
//   8. segunda copia normal novamente bloqueada
//   9. impressao/PDF sem excecao
//  10. reiniciar sessao limpando estado/audit
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';
import { runFullUiFlow } from '../harness/capture-state.mjs';

export const id = 'E2E-01';
export const description = 'Fluxo real de UI ponta a ponta (geracao -> preview -> edicao -> copia -> bloqueio -> override -> impressao -> reset)';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE;
export const expected =
  'Pelo caminho real da interface: geracao sem pendencia produz preview e libera copia; edicao manual invalida a liberacao; ' +
  'pendencia critica bloqueia a copia; override exige confirmacao, cancelar nao copia, confirmar copia uma vez e audita; ' +
  'nova copia normal volta a bloquear; impressao nao lanca excecao; reiniciar sessao limpa saida, audit log e bloqueio.';

export async function runOn(session) {
  const flow = await runFullUiFlow(session);

  if (!flow.supported) {
    return {
      pass: null, // N/A — artefato nao expoe o fluxo (ex: referencia sem politica de copia)
      failures: [],
      observed: flow,
    };
  }

  const failures = [];
  const check = (cond, msg) => { if (!cond) failures.push(msg); };

  // 1. geracao normal pela UI
  check(flow.generation.outputCardVisible, `Cenario 1 (geracao normal): output-card nao ficou visivel. status="${flow.generation.statusText}".`);
  check(!flow.generation.pageErrors.length, `Cenario 1: erros de pagina durante a geracao: ${JSON.stringify(flow.generation.pageErrors)}.`);

  // 2. preview renderizado com conteudo clinico
  check(
    flow.generation.outputTextLength > 0,
    `Cenario 2 (preview): output-body vazio apos a geracao (len=${flow.generation.outputTextLength}).`
  );

  // 3+4. sem pendencia critica -> copia liberada e funciona
  check(
    flow.generation.copyBlockedAfterGeneration === false,
    `Cenario 4 (copiar sem pendencia): COPY_BLOCKED=${flow.generation.copyBlockedAfterGeneration} apos geracao sem pendencia (esperado false). Pendencias observadas: ${JSON.stringify(flow.generation.pendingText)}.`
  );
  check(
    flow.cleanCopy.writes === 1,
    `Cenario 4: copiar() sem pendencia escreveu ${flow.cleanCopy.writes} vez(es) no clipboard (esperado 1).`
  );

  // 3. edicao apos geracao — assercao de SEGURANCA (R-01 de reports/REGRESSION_RISKS.md e
  // invariante de docs/REGRAS_CLINICAS.md): uma edicao manual no preview NAO pode, por si so,
  // liberar a copia enquanto existe pendencia critica/bloqueante ativa. Liberar exige o caminho
  // auditavel do P0-03 (confirmacao explicita + audit log) ou a confirmacao de revisao da
  // pre-evolucao — nunca a simples digitacao de um caractere, que nao registra nada.
  check(
    flow.editUnderBlock.copyBlockedAfterEdit === true,
    `Cenario 3 (R-01, SEGURANCA): com pendencia critica ativa, uma edicao manual no preview liberou a copia sozinha ` +
    `(COPY_BLOCKED passou de ${flow.editUnderBlock.copyBlockedBefore} para ${flow.editUnderBlock.copyBlockedAfterEdit}), ` +
    `sem confirmacao explicita e sem registro no audit log (audit="${flow.editUnderBlock.auditAfterEdit}"). ` +
    `Isso contorna a politica de copia do P0-03: copiar() apos a edicao escreveu ${flow.editUnderBlock.writesAfterEdit} vez(es).`
  );
  check(
    flow.editUnderBlock.prefillBypass !== true,
    `Cenario 3b (R-01, SEGURANCA): na pre-evolucao iniciada com pendencia bloqueante (baseBlocked=true), ` +
    `uma edicao no prefill-editor liberou copiar() sem passar por confirmarRevisaoPreEvolucao() ` +
    `(PREFILL_STATE.reviewed=${flow.editUnderBlock.prefillReviewed}) e sem audit log — ` +
    `onPreEvolutionEdit() faz setCopyBlocked(true), mas o listener global de 'input' executa depois e reverte para false.`
  );

  // 5. pendencia critica bloqueia
  check(
    flow.blocked.copyBlocked === true && flow.blocked.writes === 0,
    `Cenario 5 (bloqueio com pendencia critica): COPY_BLOCKED=${flow.blocked.copyBlocked}, writes=${flow.blocked.writes} (esperado true/0). Pendencias: ${JSON.stringify(flow.blocked.pendingText)}.`
  );
  check(
    flow.blocked.overrideButtonVisible === true,
    'Cenario 5: botao "Copiar mesmo assim" nao ficou visivel com bloqueio ativo.'
  );

  // 6. override cancelado
  check(
    flow.overrideCancelled.confirmCalled === true,
    'Cenario 6 (override cancelado): confirm() nao foi chamado.'
  );
  check(
    flow.overrideCancelled.writes === 0 && flow.overrideCancelled.auditText === '',
    `Cenario 6: cancelar o override copiou e/ou auditou indevidamente (writes=${flow.overrideCancelled.writes}, audit="${flow.overrideCancelled.auditText}").`
  );

  // 7. override confirmado
  check(
    flow.overrideConfirmed.writes === 1,
    `Cenario 7 (override confirmado): esperado exatamente 1 escrita, observado ${flow.overrideConfirmed.writes}.`
  );
  const auditOk = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(flow.overrideConfirmed.auditText) && flow.overrideConfirmed.auditText.length > 0;
  check(
    auditOk && flow.overrideConfirmed.auditCardVisible,
    `Cenario 7: audit log nao registrou o override com timestamp (audit="${flow.overrideConfirmed.auditText}", cardVisible=${flow.overrideConfirmed.auditCardVisible}).`
  );

  // 8. segunda copia normal volta a bloquear
  check(
    flow.secondCopy.copyBlockedStillTrue === true && flow.secondCopy.writes === 0,
    `Cenario 8 (2a copia bloqueada): COPY_BLOCKED=${flow.secondCopy.copyBlockedStillTrue}, novas escritas=${flow.secondCopy.writes} (esperado true/0) — o override nao pode valer para mais de uma operacao.`
  );

  // 9. impressao sem excecao
  check(
    flow.print.threw === null,
    `Cenario 9 (impressao/PDF): excecao ao imprimir: ${flow.print.threw}.`
  );

  // 10. reset limpa estado
  check(
    flow.reset.outputEmpty && flow.reset.auditEmpty && flow.reset.copyBlocked === false && flow.reset.overrideLogLength === 0,
    `Cenario 10 (reiniciar sessao): estado nao foi limpo — outputEmpty=${flow.reset.outputEmpty}, auditEmpty=${flow.reset.auditEmpty}, COPY_BLOCKED=${flow.reset.copyBlocked}, overrideLog=${flow.reset.overrideLogLength}.`
  );

  // Nenhum erro de console/pagina em todo o fluxo.
  check(
    flow.pageErrors.length === 0,
    `Erros de pagina (excecao JS nao tratada) durante o fluxo: ${JSON.stringify(flow.pageErrors)}.`
  );

  return { pass: failures.length === 0, failures, observed: flow };
}

export function classify({ baseline, reference, candidate }) {
  if (candidate.pass === true) {
    return {
      label: 'EXPECTED_CHANGE',
      rationale:
        'Candidata percorre o fluxo real de UI ponta a ponta sem excecao e com a politica de copia completa. ' +
        'baseline/referencia sao N/A ou FAIL por nao possuirem o fluxo de override — nao e regressao, e a funcionalidade nova desta consolidacao.',
    };
  }
  if (candidate.pass === false) {
    return { label: 'REGRESSION', rationale: 'Fluxo real de UI falhou na candidata — investigar antes de liberar release.' };
  }
  return { label: 'UNRESOLVED', rationale: 'Fluxo nao pode ser avaliado na candidata.' };
}
