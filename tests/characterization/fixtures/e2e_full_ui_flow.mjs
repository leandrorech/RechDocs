// E2E-01 — fluxo real de UI, ponta a ponta, no artefato carregado sem modificacao.
//
// Diferente das fixtures P0-*/CI-05 (que chamam funcoes clinicas diretamente), esta fixture
// exercita o CAMINHO REAL DA INTERFACE: preenche os campos de texto, seleciona o modo, salva a
// chave, clica em "Gerar Documento" (processar()), e so entao opera preview, edicao, copia,
// sinalizacao critica, impressao e reinicio de sessao pelos mesmos handlers que o usuario aciona.
//
// Rede: a unica chamada de rede do fluxo (fetch ao provedor de IA) e interceptada por
// page.route() no browser-adapter e respondida com um payload SINTETICO — nenhuma chave real,
// nenhum dado clinico real, nenhuma requisicao sai da maquina. Ver installProviderStub().
//
// Dados: 100% sinteticos/desidentificados. Nenhum identificador de paciente real; o campo de
// identificacao usa "PACIENTE TESTE E2E" e leito fictício.
//
// Contrato vigente (reports/COPY_POLICY_CONTRACT.md): SINALIZACAO MAXIMA, SEM BLOQUEIO.
// Cobertura:
//   1. geracao normal pela UI
//   2. preview renderizado
//   3/4. sem pendencia: nenhum alerta e copia funcional
//   5. pendencia critica: banner + lista + aviso, mas SEM bloqueio
//   6. copia com alerta ativo funciona e nao exige confirmacao
//   7. audit log registra a saida com alerta ativo
//   8. edicao manual NAO remove o alerta (requisito remanescente do R-01/R-07)
//   9. segunda copia continua funcionando
//  10. impressao/PDF com alerta funciona e fica auditada
//  11. reiniciar sessao limpando estado/audit
import { EVIDENCE_KIND } from '../harness/compare-results.mjs';
import { runFullUiFlow } from '../harness/capture-state.mjs';

export const id = 'E2E-01';
export const description = 'Fluxo real de UI ponta a ponta (geracao -> preview -> edicao -> alerta critico -> copia/impressao sempre liberadas -> reset)';
export const evidenceKind = EVIDENCE_KIND.DYNAMIC_E2E_EVIDENCE;
export const expected =
  'Pelo caminho real da interface: geracao sem pendencia produz preview sem alerta e copia funcional; pendencia critica produz ' +
  'banner vermelho + lista + aviso nos botoes SEM bloquear nada; copia/impressao funcionam com alerta ativo, sem confirmacao, e ' +
  'ficam registradas no audit log; edicao manual nao apaga o alerta; reiniciar sessao limpa saida, audit log e sinalizacao.';

export async function runOn(session) {
  const flow = await runFullUiFlow(session);

  if (!flow.supported) {
    return {
      pass: null, // N/A — artefato nao possui o mecanismo de alerta critico desta versao
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
  check(flow.generation.outputTextLength > 0,
    `Cenario 2 (preview): output-body vazio apos a geracao (len=${flow.generation.outputTextLength}).`);

  // 3. geracao limpa: sem alerta, sem banner, copia funcional
  check(flow.generation.criticalAlertAfterGeneration === false && flow.generation.bannerVisible === false,
    `Cenario 3 (geracao sem pendencia): alerta/banner nao deveriam estar ativos. ` +
    `alerta=${flow.generation.criticalAlertAfterGeneration}, banner=${flow.generation.bannerVisible}, pendencias="${flow.generation.pendingText}".`);
  check(flow.generation.copyButtonDisabled === false,
    'Cenario 3b: botao "Copiar tudo" veio desabilitado apos a geracao — o contrato proibe bloqueio.');
  check(flow.cleanCopy.writes === 1,
    `Cenario 4 (copiar sem pendencia): escreveu ${flow.cleanCopy.writes} vez(es) no clipboard (esperado 1).`);

  // 5. pendencia critica -> banner + lista + aviso, MAS copia habilitada
  check(flow.alerted.alertActive === true && flow.alerted.bannerVisible === true,
    `Cenario 5 (pendencia critica sinalizada): alerta=${flow.alerted.alertActive}, banner=${flow.alerted.bannerVisible} (esperado ambos true).`);
  check(flow.alerted.bannerListText.includes('Pendencia critica sintetica'),
    `Cenario 5b (lista de pendencias visivel): observado "${flow.alerted.bannerListText}".`);
  check(flow.alerted.copyWarnVisible === true,
    'Cenario 5c: aviso junto aos botoes Copiar/Imprimir nao esta visivel com pendencia ativa.');
  check(flow.alerted.copyButtonDisabled === false,
    'Cenario 5d (SEM BLOQUEIO): botao "Copiar tudo" esta desabilitado com pendencia — o contrato vigente proibe isso.');

  // 6. copia com alerta funciona, sem confirmacao
  check(flow.copyWithAlert.writes === 1 && flow.copyWithAlert.confirms === 0,
    `Cenario 6 (copia com alerta ativo): writes=${flow.copyWithAlert.writes} (esperado 1), confirm() chamado ${flow.copyWithAlert.confirms}x (esperado 0 — nenhuma confirmacao deve ser exigida).`);

  // 7. audit log registra a saida com alerta ativo
  const auditOk = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(flow.copyWithAlert.auditText)
    && /alerta cr[ií]tico ativo/i.test(flow.copyWithAlert.auditText);
  check(auditOk && flow.copyWithAlert.auditCardVisible,
    `Cenario 7 (audit log): saida com alerta nao registrada corretamente. audit="${flow.copyWithAlert.auditText}", cardVisible=${flow.copyWithAlert.auditCardVisible}.`);
  check(flow.copyWithAlert.alertStillActive === true,
    'Cenario 7b: o alerta critico foi desativado pela propria copia — deve permanecer ate ser recalculado.');

  // 8. edicao manual NAO remove o alerta (requisito remanescente do R-01/R-07)
  check(flow.editUnderAlert.alertAfterEdit === true && flow.editUnderAlert.bannerAfterEdit === true,
    `Cenario 8 (R-01/R-07 — edicao nao apaga o alerta): apos digitar no preview, alerta=${flow.editUnderAlert.alertAfterEdit}, ` +
    `banner=${flow.editUnderAlert.bannerAfterEdit} (esperado ambos true; antes o listener global apagava a sinalizacao a cada tecla).`);
  check(flow.editUnderAlert.warnAfterEdit === true,
    'Cenario 8b: aviso junto aos botoes desapareceu apos a edicao manual.');
  check(flow.editUnderAlert.writesAfterEdit === 1 && flow.editUnderAlert.copyDisabledAfterEdit === false,
    `Cenario 8c: apos a edicao, a copia deve continuar funcionando (writes=${flow.editUnderAlert.writesAfterEdit}, disabled=${flow.editUnderAlert.copyDisabledAfterEdit}).`);
  check(flow.editUnderAlert.prefillAlertSurvives !== false,
    'Cenario 8d: na pre-evolucao com pendencia de reconciliacao, a edicao no prefill-editor apagou o alerta critico.');

  // 9. segunda copia continua funcionando (nao ha bloqueio a reinstaurar)
  check(flow.secondCopy.writes === 1 && flow.secondCopy.alertStillActive === true,
    `Cenario 9 (segunda copia): writes=${flow.secondCopy.writes} (esperado 1), alerta ainda ativo=${flow.secondCopy.alertStillActive}.`);

  // 10. impressao/PDF com alerta: funciona e fica auditada
  check(flow.print.threw === null && flow.print.printCalls === 1,
    `Cenario 10 (impressao/PDF): threw=${flow.print.threw}, window.print() chamado ${flow.print.printCalls}x (esperado 1).`);
  check(flow.print.auditMentionsPrint === true,
    'Cenario 10b: impressao com alerta ativo nao foi registrada no log de auditoria.');

  // 11. reset limpa estado
  check(flow.reset.outputEmpty && flow.reset.auditEmpty && flow.reset.alertActive === false
        && flow.reset.bannerVisible === false && flow.reset.outputLogLength === 0,
    `Cenario 11 (reiniciar sessao): estado nao foi limpo — outputEmpty=${flow.reset.outputEmpty}, auditEmpty=${flow.reset.auditEmpty}, ` +
    `alerta=${flow.reset.alertActive}, banner=${flow.reset.bannerVisible}, log=${flow.reset.outputLogLength}.`);

  check(flow.pageErrors.length === 0,
    `Erros de pagina (excecao JS nao tratada) durante o fluxo: ${JSON.stringify(flow.pageErrors)}.`);

  return { pass: failures.length === 0, failures, observed: flow };
}

export function classify({ baseline, reference, candidate }) {
  if (candidate.pass === true) {
    return {
      label: 'EXPECTED_CHANGE',
      rationale:
        'Candidata percorre o fluxo real de UI ponta a ponta sem excecao, com sinalizacao critica maxima e sem qualquer bloqueio de ' +
        'copia/impressao. baseline/referencia sao N/A por nao possuirem o mecanismo de alerta desta versao.',
    };
  }
  if (candidate.pass === false) {
    return { label: 'REGRESSION', rationale: 'Fluxo real de UI falhou na candidata — investigar antes de liberar release.' };
  }
  return { label: 'UNRESOLVED', rationale: 'Fluxo nao pode ser avaliado na candidata.' };
}
