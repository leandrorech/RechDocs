// Funcoes de captura de estado observavel a partir de uma sessao de pagina
// (ver browser-adapter.mjs). Cada captura roda no contexto real do artefato
// carregado — nao ha copia/reimplementacao da logica clinica aqui.

// Executa `new ClinicalState(raw, modo, DEFAULT_DICT).resolve()` e retorna o
// estado clinico completo observavel: finalData, conflitos, warnings, log de
// auditoria. `raw`/`modo` precisam ser serializaveis (JSON) — nao passar
// funcoes.
export async function captureClinicalState(session, raw, modo) {
  const result = await session.page.evaluate(({ raw, modo }) => {
    const engine = new ClinicalState(raw, modo || MODE, DEFAULT_DICT);
    const finalData = engine.resolve();
    return {
      finalData,
      conflitos: engine.conflitos,
      warnings: engine.warnings,
      auditLog: engine.auditLog,
    };
  }, { raw, modo });
  return {
    ...result,
    pageErrors: [...session.pageErrors],
    consoleErrors: [...session.consoleErrors],
  };
}

// Encadeia captureClinicalState com buildCriticalPendencies(finalData, warns)
// para observar o efeito operacional real de conflitos/warnings no fluxo de
// saida: warns->pendencias criticas->ALERTA CRITICO. `warns` extras (ex.: o
// proprio conflito) sao passados manualmente porque, fora do fluxo completo
// de geracao (que depende de fetch e DOM de formulario), engine.conflitos e
// a unica fonte de warnings disponivel de forma deterministica aqui.
export async function captureClinicalStateWithCopyEffect(session, raw, modo) {
  const state = await captureClinicalState(session, raw, modo);
  const effect = await session.page.evaluate(({ finalData, warns }) => {
    const hasFn = typeof buildCriticalPendencies === 'function';
    if (!hasFn) return { supported: false };
    const pend = buildCriticalPendencies(finalData, warns);
    return { supported: true, pendencies: pend, wouldRaiseCriticalAlert: pend.length > 0 };
  }, { finalData: state.finalData, warns: state.conflitos });
  return { ...state, copyEffect: effect };
}

// Politica de copia — contrato vigente: SINALIZACAO MAXIMA, SEM BLOQUEIO
// (reports/COPY_POLICY_CONTRACT.md). Exercita, dentro da pagina real:
//   (a) estado COM pendencia: banner, lista, botao habilitado, copia, impressao, audit log;
//   (b) edicao manual depois disso: o alerta precisa sobreviver e a copia continuar funcionando;
//   (c) estado SEM pendencia: banner ausente e copia normal;
//   (d) ausencia dos simbolos do contrato antigo (bloqueio/override) no artefato.
// Retorna {supported:false} em artefatos sem o mecanismo de alerta (baseline/referencia).
export async function captureCriticalAlertPolicy(session, { pendencies }) {
  const hasFn = await session.page.evaluate(() => typeof setCriticalAlert === 'function');
  if (!hasFn) {
    return { supported: false, pageErrors: [...session.pageErrors], consoleErrors: [...session.consoleErrors] };
  }

  const fs = await import('node:fs/promises');
  const html = await fs.readFile(session.artifactPath, 'utf-8');
  // O contrato antigo nao pode ressuscitar silenciosamente. Procura os simbolos funcionais dele —
  // ignorando comentarios/documentacao, que legitimamente citam os nomes ao explicar a mudanca.
  const legacySymbols = [];
  if (/function\s+setCopyBlocked\s*\(/.test(html)) legacySymbols.push('setCopyBlocked()');
  if (/function\s+copiarComOverride\s*\(/.test(html)) legacySymbols.push('copiarComOverride()');
  if (/\bid=["']btn-copiar-mesmo-assim["']/.test(html)) legacySymbols.push('#btn-copiar-mesmo-assim');
  if (/^\s*(let|var|const)\s+COPY_BLOCKED\b/m.test(html)) legacySymbols.push('COPY_BLOCKED');

  const result = await session.page.evaluate(async (pend) => {
    const state = { writes: [], confirms: [], prints: 0 };
    const originalClipboard = navigator.clipboard;
    const originalConfirm = window.confirm;
    const originalPrint = window.print;
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (t) => { state.writes.push(t); return Promise.resolve(); } },
      });
    } catch { /* noop */ }
    window.confirm = (m) => { state.confirms.push(m); return true; };
    window.print = () => { state.prints += 1; };
    const tick = () => new Promise((r) => setTimeout(r, 0));

    document.getElementById('audit-list').textContent = '';
    document.getElementById('output-body').textContent = 'DOCUMENTO CLINICO SINTETICO (teste P0-03)';

    // (a) COM pendencia critica
    setCriticalAlert(true, pend);
    const banner = document.getElementById('critical-banner');
    const warn = document.getElementById('copy-warn');
    const btn = document.getElementById('btn-copy');
    const wBefore = state.writes.length, cBefore = state.confirms.length;
    copiar();
    await tick();
    const printThrewLocal = (() => { try { imprimirDocumento(); return null; } catch (e) { return String((e && e.message) || e); } })();
    await tick();
    const withPending = {
      bannerVisible: (banner.className || '').includes('show'),
      bannerClass: banner.className || '',
      bannerTitle: (banner.querySelector('.cb-title')?.textContent) || '',
      bannerMentionsAtencao: /aten[cç][aã]o/i.test((banner.querySelector('.cb-title')?.textContent) || ''),
      bannerListText: document.getElementById('critical-banner-list').textContent || '',
      copyWarnVisible: (warn.className || '').includes('show'),
      copyButtonDisabled: btn.disabled,
      copyWrites: state.writes.length - wBefore,
      copyConfirms: state.confirms.length - cBefore,
      printThrew: printThrewLocal,
      printCalls: state.prints,
      auditText: document.getElementById('audit-list').textContent || '',
    };

    // (b) edicao manual depois do alerta
    const body = document.getElementById('output-body');
    body.textContent = (body.textContent || '') + ' EDICAO MANUAL';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const wBefore2 = state.writes.length;
    copiar();
    await tick();
    const afterEdit = {
      bannerStillVisible: (document.getElementById('critical-banner').className || '').includes('show'),
      alertStillActive: typeof CRITICAL_ALERT_ACTIVE !== 'undefined' ? CRITICAL_ALERT_ACTIVE : null,
      copyStillWorks: state.writes.length - wBefore2 === 1,
    };

    // (c) SEM pendencia
    setCriticalAlert(false);
    const wBefore3 = state.writes.length;
    copiar();
    await tick();
    const noPending = {
      bannerVisible: (document.getElementById('critical-banner').className || '').includes('show'),
      copyWarnVisible: (document.getElementById('copy-warn').className || '').includes('show'),
      copyButtonDisabled: document.getElementById('btn-copy').disabled,
      copyWrites: state.writes.length - wBefore3,
    };

    window.confirm = originalConfirm;
    window.print = originalPrint;
    try {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    } catch { /* noop */ }

    return { withPending, afterEdit, noPending };
  }, pendencies);

  return {
    supported: true,
    ...result,
    legacySymbols,
    noBlockingMechanism: legacySymbols.length === 0,
    pageErrors: [...session.pageErrors],
    consoleErrors: [...session.consoleErrors],
  };
}

// ---------------------------------------------------------------------------
// E2E de fluxo real de UI (fixture e2e_full_ui_flow.mjs)
// ---------------------------------------------------------------------------

// Payload clinico SINTETICO devolvido no lugar da resposta do provedor de IA. Nenhum dado real,
// nenhum identificador de pessoa. Estrutura segue o schema que validateAndNormalizeParsed() espera.
// Deliberadamente SEM pendencia critica: alergias preenchidas, leito preenchido, sem VM ativa, sem
// DVA sem dose, sem conflito — para que o cenario "geracao normal libera a copia" seja observavel.
const SYNTHETIC_CLEAN_EXTRACTION = {
  identificacao: 'PACIENTE TESTE E2E, 60 anos',
  leito: 'TESTE-01',
  alergias: 'Nega alergias medicamentosas conhecidas.',
  hd: 'Pneumonia comunitaria em tratamento.',
  // O texto destes campos precisa aparecer LITERALMENTE no corpus-fonte enviado pela UI, senao
  // validateUndeclaredTransformations() (salvaguarda da baseline, corretamente) emite ⛔ por
  // "conteudo nao literal sem rastreabilidade declarada" e a copia e bloqueada. Ver E2E_SOURCE_TEXT.
  hda: 'Quadro sintetico para teste automatizado de interface.',
  atb: [{ nome: 'Ceftriaxona', dose: '2g', intervalo: '24/24h', status: 'em_uso', data: '05/07/2026', hora: '08:00', origem: 'documento_previo', tipo_documento: 'evolucao', ordem: 0 }],
  antitromboticos: [],
  dva: [],
  sedacao: [],
  bnm: [],
  outras_infusoes: [],
  dispositivos: [],
  ventilatorio: [],
  monitor: { fc: '82', pa: '120x70', spo2: '96', temp: '36.5' },
  gasometria: {},
  nutricao: [],
  profilaxias: [],
  exames: [{ tipo: 'lab', nome: 'Hemoglobina', resultado: '11.2', unidade: 'g/dL', data: '05/07/2026', hora: '08:00' }],
  interconsultas: [],
  controles: [],
  condutas: ['Manter antibiotico conforme prescricao.'],
  rastreabilidade: [],
};

// Corpus-fonte digitado na UI. Contem literalmente o texto dos campos narrativos do payload
// sintetico, para que a extracao seja "literal" e nao dispare o bloqueio por transformacao nao
// declarada — permitindo observar o cenario "geracao SEM pendencia critica libera a copia".
const E2E_SOURCE_TEXT = {
  prev: 'Documento sintetico de teste E2E — sem dado real de paciente. '
    + 'Quadro sintetico para teste automatizado de interface. '
    + 'Pneumonia comunitaria em tratamento. '
    + 'Nega alergias medicamentosas conhecidas.',
  updates: 'Manter antibiotico conforme prescricao.',
  current: 'PA 120x70, FC 82, SpO2 96%.',
};

// Intercepta TODA chamada de rede a provedores de IA e responde com o payload sintetico acima.
// Nada sai da maquina: qualquer requisicao a host externo e abortada se nao casar com os padroes
// conhecidos, para que um endpoint novo nao vaze silenciosamente numa execucao de teste.
async function installProviderStub(page, extraction) {
  const body = JSON.stringify({
    content: [{ type: 'text', text: JSON.stringify(extraction) }],
    stop_reason: 'end_turn',
  });
  await page.route('**://**/*', async (route) => {
    const url = route.request().url();
    if (/^file:/.test(url)) return route.continue();
    if (/anthropic\.com|openai\.com|deepseek\.com|aliyuncs\.com|googleapis\.com/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    }
    return route.abort();
  });
}

// Executa o fluxo completo pela interface real. Retorna {supported:false} quando o artefato nao
// possui o fluxo de override (baseline/referencia), sem lancar excecao.
export async function runFullUiFlow(session) {
  const hasAlert = await session.page.evaluate(() => typeof setCriticalAlert === 'function');
  if (!hasAlert) {
    return { supported: false, pageErrors: [...session.pageErrors], consoleErrors: [...session.consoleErrors] };
  }

  await installProviderStub(session.page, SYNTHETIC_CLEAN_EXTRACTION);

  // Instala stubs de clipboard/confirm/print uma unica vez, com contadores globais inspecionaveis
  // entre etapas (o fluxo tem varios awaits, entao o estado precisa sobreviver a cada evaluate).
  await session.page.evaluate(() => {
    window.__e2e = { writes: [], confirms: [], prints: 0, confirmReturn: true };
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (t) => { window.__e2e.writes.push(t); return Promise.resolve(); } },
      });
    } catch { /* noop */ }
    window.confirm = (msg) => { window.__e2e.confirms.push(msg); return window.__e2e.confirmReturn; };
    window.print = () => { window.__e2e.prints += 1; };
  });

  const flush = () => session.page.evaluate(() => new Promise((r) => setTimeout(r, 0)));

  // --- 1/2/4. Geracao normal pela UI (preenche campos + clica em Gerar) ---
  await session.page.evaluate((src) => {
    setMode('evolucao');
    const phi = document.getElementById('phi-check');
    if (phi) phi.checked = false; // evita o confirm de PHI; conteudo ja e sintetico
    document.getElementById('apikey').value = 'sk-ant-TESTE-SINTETICO-NAO-E-CHAVE-REAL';
    document.getElementById('in-prev').value = src.prev;
    document.getElementById('in-updates').value = src.updates;
    document.getElementById('in-current').value = src.current;
  }, E2E_SOURCE_TEXT);
  await session.page.click('#btn-gen');
  await session.page.waitForFunction(
    () => document.getElementById('btn-gen') && !document.getElementById('btn-gen').disabled,
    { timeout: 30000 }
  ).catch(() => {});
  await flush();

  const generation = await session.page.evaluate(() => ({
    outputCardVisible: document.getElementById('output-card').style.display === 'block',
    outputTextLength: (document.getElementById('output-body').textContent || '').length,
    statusText: document.getElementById('status-msg').textContent || '',
    pendingText: document.getElementById('pending-list').textContent || '',
    criticalAlertAfterGeneration: typeof CRITICAL_ALERT_ACTIVE !== 'undefined' ? CRITICAL_ALERT_ACTIVE : null,
    bannerVisible: (document.getElementById('critical-banner').className || '').includes('show'),
    copyButtonDisabled: document.getElementById('btn-copy').disabled,
  }));
  generation.pageErrors = [...session.pageErrors];

  // --- 4. copiar sem pendencia ---
  const cleanCopy = await session.page.evaluate(() => {
    const before = window.__e2e.writes.length;
    copiar();
    return { before };
  });
  await flush();
  cleanCopy.writes = (await session.page.evaluate(() => window.__e2e.writes.length)) - cleanCopy.before;

  // --- 3. edicao manual COM alerta critico ativo ---
  // Contrato vigente: a saida NUNCA e bloqueada, entao nao ha bypass a testar. O que se verifica e
  // que a SINALIZACAO sobrevive a edicao manual (antes, o listener global de 'input' apagava o
  // estado a cada tecla — achado R-01/R-07) e que a copia continua funcionando normalmente.
  const editUnderAlert = await session.page.evaluate(() => {
    document.getElementById('audit-list').textContent = '';
    setCriticalAlert(true, ['Pendencia critica sintetica (R-01) para teste E2E.']);
    const alertBefore = CRITICAL_ALERT_ACTIVE;
    const bannerBefore = (document.getElementById('critical-banner').className || '').includes('show');

    const body = document.getElementById('output-body');
    body.textContent = (body.textContent || '') + '\nEDICAO MANUAL DE TESTE E2E';
    body.dispatchEvent(new Event('input', { bubbles: true }));

    const alertAfterEdit = CRITICAL_ALERT_ACTIVE;
    const bannerAfterEdit = (document.getElementById('critical-banner').className || '').includes('show');
    const warnAfterEdit = (document.getElementById('copy-warn').className || '').includes('show');
    const copyDisabledAfterEdit = document.getElementById('btn-copy').disabled;

    const beforeW = window.__e2e.writes.length;
    copiar();
    const writesAfterEdit = window.__e2e.writes.length - beforeW;

    // Mesmo caminho pela pre-evolucao com pendencia de reconciliacao.
    let prefillAlertSurvives = null;
    if (typeof startPreEvolutionEditor === 'function') {
      startPreEvolutionEditor('texto de pre-evolucao sintetico', [], /* baseBlocked */ true);
      const ed = document.getElementById('prefill-editor');
      ed.value = 'texto de pre-evolucao editado';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      prefillAlertSurvives = CRITICAL_ALERT_ACTIVE === true
        && (document.getElementById('critical-banner').className || '').includes('show');
    }

    return { alertBefore, bannerBefore, alertAfterEdit, bannerAfterEdit, warnAfterEdit,
             copyDisabledAfterEdit, writesAfterEdit, prefillAlertSurvives };
  });
  await flush();

  // --- 5. alerta critico com pendencia (sem bloqueio) ---
  const alerted = await session.page.evaluate(() => {
    document.getElementById('pending-list').textContent = 'Pendencia critica sintetica de teste E2E.';
    document.getElementById('pending-card').className = 'pending-card show';
    document.getElementById('audit-list').textContent = '';
    setCriticalAlert(true, ['Pendencia critica sintetica de teste E2E.']);
    const before = window.__e2e.writes.length;
    return {
      before,
      alertActive: CRITICAL_ALERT_ACTIVE,
      bannerVisible: (document.getElementById('critical-banner').className || '').includes('show'),
      bannerListText: document.getElementById('critical-banner-list').textContent || '',
      copyWarnVisible: (document.getElementById('copy-warn').className || '').includes('show'),
      copyButtonDisabled: document.getElementById('btn-copy').disabled,
    };
  });
  await flush();

  // --- 6/7. copia COM alerta ativo: funciona, sem confirmacao, e fica auditada ---
  const copyWithAlert = await session.page.evaluate(() => {
    const beforeW = window.__e2e.writes.length;
    const beforeC = window.__e2e.confirms.length;
    copiar();
    return { beforeW, beforeC };
  });
  await flush();
  Object.assign(copyWithAlert, await session.page.evaluate((prev) => ({
    writes: window.__e2e.writes.length - prev.beforeW,
    confirms: window.__e2e.confirms.length - prev.beforeC,
    auditText: document.getElementById('audit-list').textContent || '',
    auditCardVisible: (document.getElementById('audit-card').className || '').includes('show'),
    alertStillActive: CRITICAL_ALERT_ACTIVE,
  }), copyWithAlert));

  // --- 8. segunda copia com alerta: continua funcionando (nao ha bloqueio a reinstaurar) ---
  const secondCopy = await session.page.evaluate(() => {
    const beforeW = window.__e2e.writes.length;
    copiar();
    return { beforeW, alertStillActive: CRITICAL_ALERT_ACTIVE };
  });
  await flush();
  secondCopy.writes = await session.page.evaluate((prev) => window.__e2e.writes.length - prev.beforeW, secondCopy);

  // --- 9. impressao/PDF com alerta ativo: funciona e fica auditada ---
  const print = await session.page.evaluate(() => {
    let threw = null;
    const beforeP = window.__e2e.prints;
    try { imprimirDocumento(); } catch (e) { threw = String((e && e.message) || e); }
    return { threw, beforeP };
  });
  await flush();
  Object.assign(print, await session.page.evaluate((prev) => ({
    printCalls: window.__e2e.prints - prev.beforeP,
    auditMentionsPrint: /Impress/i.test(document.getElementById('audit-list').textContent || ''),
  }), print));

  // --- 10. RESOLUCAO REAL da pendencia remove o alerta ---
  // Complemento indispensavel do cenario 8: se a edicao manual nao apaga o alerta, e preciso provar
  // que existe um caminho que APAGA — caso contrario o banner ficaria preso para sempre, tao inutil
  // quanto nao ter banner. O contrato diz que o alerta so some quando a condicao que o gerou for
  // efetivamente resolvida e RECALCULADA. Aqui isso e feito pelo caminho real: dispara uma nova
  // geracao pela UI (o stub responde com o payload sintetico limpo, sem pendencias) e observa se o
  // alerta e o banner desaparecem sozinhos.
  const alertBeforeRegen = await session.page.evaluate(() => ({
    alertActive: CRITICAL_ALERT_ACTIVE,
    bannerVisible: (document.getElementById('critical-banner').className || '').includes('show'),
  }));
  await session.page.click('#btn-gen');
  await session.page.waitForFunction(
    () => document.getElementById('btn-gen') && !document.getElementById('btn-gen').disabled,
    { timeout: 30000 }
  ).catch(() => {});
  await flush();
  const resolution = await session.page.evaluate((before) => {
    const wBefore = window.__e2e.writes.length;
    copiar();
    return {
      alertBefore: before.alertActive,
      bannerBefore: before.bannerVisible,
      alertAfterRegen: CRITICAL_ALERT_ACTIVE,
      bannerAfterRegen: (document.getElementById('critical-banner').className || '').includes('show'),
      warnAfterRegen: (document.getElementById('copy-warn').className || '').includes('show'),
      bannerListAfterRegen: document.getElementById('critical-banner-list').textContent || '',
      pendingCardShown: (document.getElementById('pending-card').className || '').includes('show'),
      wBefore,
    };
  }, alertBeforeRegen);
  await flush();
  resolution.copyStillWorks = (await session.page.evaluate((prev) => window.__e2e.writes.length - prev.wBefore, resolution)) === 1;

  // --- 11. reiniciar sessao limpa estado/audit ---
  const reset = await session.page.evaluate(() => {
    reiniciarTudo();
    return {
      outputEmpty: (document.getElementById('output-body').textContent || '') === '',
      auditEmpty: (document.getElementById('audit-list').textContent || '') === '',
      alertActive: typeof CRITICAL_ALERT_ACTIVE !== 'undefined' ? CRITICAL_ALERT_ACTIVE : null,
      bannerVisible: (document.getElementById('critical-banner').className || '').includes('show'),
      outputLogLength: typeof CRITICAL_OUTPUT_LOG !== 'undefined' ? CRITICAL_OUTPUT_LOG.length : null,
      outputCardHidden: document.getElementById('output-card').style.display === 'none',
    };
  });

  return {
    supported: true,
    generation, cleanCopy, editUnderAlert, alerted, copyWithAlert, secondCopy, print, resolution, reset,
    pageErrors: [...session.pageErrors],
    consoleErrors: [...session.consoleErrors],
  };
}

// Executa `buildExamesCompactos(d)` sobre um array de exames sintetico e
// retorna o texto compactado, alem de uma verificacao de que o array de
// entrada original (d.exames) nao foi mutado pela chamada (snapshot
// antes/depois por deep-equal via JSON, mais checagem de mesma referencia).
export async function captureExamCompaction(session, exames) {
  const hasFn = await session.page.evaluate(() => typeof buildExamesCompactos === 'function');
  if (!hasFn) {
    return { supported: false, pageErrors: [...session.pageErrors], consoleErrors: [...session.consoleErrors] };
  }
  const result = await session.page.evaluate((exames) => {
    const d = { exames: JSON.parse(JSON.stringify(exames)) };
    const before = JSON.parse(JSON.stringify(d.exames));
    const examesRefBefore = d.exames;
    const compactedText = buildExamesCompactos(d);
    const after = JSON.parse(JSON.stringify(d.exames));
    const sameReference = d.exames === examesRefBefore;
    const unchanged = JSON.stringify(before) === JSON.stringify(after);
    return { compactedText, unchanged, sameReference, before, after };
  }, exames);
  return {
    supported: true,
    ...result,
    pageErrors: [...session.pageErrors],
    consoleErrors: [...session.consoleErrors],
  };
}
