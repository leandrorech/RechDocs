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
// copia: warns->pendencias criticas->COPY_BLOCKED. `warns` extras (ex.: o
// proprio conflito) sao passados manualmente porque, fora do fluxo completo
// de geracao (que depende de fetch e DOM de formulario), engine.conflitos e
// a unica fonte de warnings disponivel de forma deterministica aqui.
export async function captureClinicalStateWithCopyEffect(session, raw, modo) {
  const state = await captureClinicalState(session, raw, modo);
  const effect = await session.page.evaluate(({ finalData, warns }) => {
    const hasFn = typeof buildCriticalPendencies === 'function';
    if (!hasFn) return { supported: false };
    const pend = buildCriticalPendencies(finalData, warns);
    return { supported: true, pendencies: pend, wouldBlockCopy: pend.length > 0 };
  }, { finalData: state.finalData, warns: state.conflitos });
  return { ...state, copyEffect: effect };
}

// Inspecao estatica da politica de copia: presenca de mecanismo de bloqueio
// (COPY_BLOCKED/setCopyBlocked) e de qualquer afordancia dedicada de
// override ("Copiar mesmo assim" ou equivalente, distinta do fluxo de
// confirmacao de envio de PHI a API externa). Le o HTML bruto do artefato
// (nao o DOM renderizado) para nao depender de o botao estar visivel no
// estado inicial da pagina.
export async function captureCopyPolicyStatic(session) {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(session.artifactPath, 'utf-8');

  const hasBlockMechanism = await session.page.evaluate(() => {
    return typeof setCopyBlocked === 'function' || typeof COPY_BLOCKED !== 'undefined';
  }).catch(() => false);

  const hasDedicatedOverrideId = /copiar[-_]?(mesmo[-_]?assim|forcad[oa]|override)|override[-_]?copiar|forcar[-_]?copia/i.test(html);
  const mesmoAssimIdx = html.search(/mesmo\s+assim/i);
  const hasGenericMesmoAssimNearCopiar = mesmoAssimIdx !== -1 && /copiar/i.test(
    html.slice(Math.max(0, mesmoAssimIdx - 400), mesmoAssimIdx + 100)
  );

  return {
    hasBlockMechanism,
    hasDedicatedOverrideId,
    hasGenericMesmoAssimNearCopiar,
    pageErrors: [...session.pageErrors],
    consoleErrors: [...session.consoleErrors],
  };
}

// Executa `copiar()` com COPY_BLOCKED forcado para um valor conhecido e
// captura o efeito observavel: mensagem de status, se o botao fica
// desabilitado, e se algo foi escrito na "clipboard" (stub local — nao
// depende de permissao real de clipboard do SO/headless).
export async function captureCopyFlow(session, { copyBlocked }) {
  const result = await session.page.evaluate((blocked) => {
    const writes = [];
    // Stub local do clipboard: evita depender de permissao de SO/headless
    // para write real, mas ainda permite observar SE copiar() tentaria escrever.
    const originalClipboard = navigator.clipboard;
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (txt) => { writes.push(txt); return Promise.resolve(); } },
      });
    } catch { /* alguns browsers nao permitem redefinir; segue sem stub */ }

    if (typeof setCopyBlocked === 'function') setCopyBlocked(!!blocked);
    else if (typeof COPY_BLOCKED !== 'undefined') { try { COPY_BLOCKED = !!blocked; } catch { /* noop */ } }

    const btn = document.getElementById('btn-copy');
    const btnDisabledBefore = btn ? btn.disabled : null;

    let threwError = null;
    try {
      copiar();
    } catch (e) {
      threwError = String(e && e.message || e);
    }

    const statusMsg = document.getElementById('status-msg');
    const statusText = statusMsg ? statusMsg.textContent : null;

    try {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    } catch { /* noop */ }

    return { writes, btnDisabledBefore, statusText, threwError };
  }, copyBlocked);

  return {
    ...result,
    pageErrors: [...session.pageErrors],
    consoleErrors: [...session.consoleErrors],
  };
}

// Executa copiar() sem nenhuma pendencia (COPY_BLOCKED=false) e confirma que copia normalmente,
// sem exigir override nem confirmacao (P0-03, teste 1 do contrato).
export async function captureCopyUnblockedFlow(session) {
  const result = await session.page.evaluate(() => {
    const writes = [];
    const originalClipboard = navigator.clipboard;
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (txt) => { writes.push(txt); return Promise.resolve(); } },
      });
    } catch { /* noop */ }
    const outputBody = document.getElementById('output-body');
    if (outputBody) outputBody.textContent = 'TEXTO CLINICO SEM PENDENCIA (teste P0-03)';
    if (typeof setCopyBlocked === 'function') setCopyBlocked(false);
    let threw = null;
    try { copiar(); } catch (e) { threw = String((e && e.message) || e); }
    const overrideBtn = document.getElementById('btn-copiar-mesmo-assim');
    const overrideVisible = overrideBtn ? overrideBtn.style.display !== 'none' : null;
    try {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    } catch { /* noop */ }
    return { writes, threw, overrideVisible };
  });
  return { ...result, pageErrors: [...session.pageErrors], consoleErrors: [...session.consoleErrors] };
}

// Executa o fluxo completo de override de copia (P0-03, reports/COPY_POLICY_CONTRACT.md), inteiro
// dentro da pagina real: forca COPY_BLOCKED com um motivo de pendencia conhecido (escrito em
// #pending-list, a mesma fonte que copiarComOverride() le), stuba clipboard e window.confirm, e
// executa em sequencia: (a) copiar() normal bloqueado, (b) override cancelado na confirmacao,
// (c) override confirmado, (d) copiar() normal de novo depois do override. Retorna null-safe
// {supported:false} se copiarComOverride() nao existir no artefato (baseline/referencia antes do
// port), sem lancar excecao.
export async function captureCopyOverrideFlow(session, { pendingReason }) {
  const hasFn = await session.page.evaluate(() => typeof copiarComOverride === 'function');
  if (!hasFn) {
    return { supported: false, pageErrors: [...session.pageErrors], consoleErrors: [...session.consoleErrors] };
  }
  const result = await session.page.evaluate(async (pendingReason) => {
    const writes = [];
    const confirmCalls = [];
    const originalClipboard = navigator.clipboard;
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (txt) => { writes.push(txt); return Promise.resolve(); } },
      });
    } catch { /* noop */ }
    const originalConfirm = window.confirm;
    let confirmReturnValue = true;
    window.confirm = (msg) => { confirmCalls.push(msg); return confirmReturnValue; };

    const outputBody = document.getElementById('output-body');
    if (outputBody) outputBody.textContent = 'TEXTO CLINICO DE TESTE (override P0-03)';
    const pendList = document.getElementById('pending-list');
    if (pendList) pendList.textContent = pendingReason;

    if (typeof setCopyBlocked === 'function') setCopyBlocked(true);

    // (a) copiar() normal, bloqueado.
    let threwNormalBlocked = null;
    try { copiar(); } catch (e) { threwNormalBlocked = String((e && e.message) || e); }
    const writesAfterBlockedNormalCopy = writes.length;
    const statusAfterBlockedNormalCopy = document.getElementById('status-msg')?.textContent || '';

    // (b) override, cancelado na confirmacao -> nao deve copiar nem auditar.
    confirmReturnValue = false;
    let threwCancel = null;
    try { copiarComOverride(); } catch (e) { threwCancel = String((e && e.message) || e); }
    const writesAfterCancel = writes.length;
    const auditListAfterCancel = document.getElementById('audit-list')?.textContent || '';
    const statusAfterCancel = document.getElementById('status-msg')?.textContent || '';

    // (c) override, confirmado -> deve copiar exatamente uma vez e registrar audit log.
    // copiarComOverride() escreve no clipboard sincronamente, mas atualiza audit log/status dentro
    // do .then() da Promise de writeText — precisa ceder o loop de eventos antes de ler esse estado,
    // senao le o DOM antes do microtask correspondente rodar (falso negativo, nao bug da aplicacao).
    confirmReturnValue = true;
    let threwConfirm = null;
    try { copiarComOverride(); } catch (e) { threwConfirm = String((e && e.message) || e); }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const writesAfterConfirm = writes.length;
    const auditListAfterConfirm = document.getElementById('audit-list')?.textContent || '';
    const auditCardShownAfterConfirm = (document.getElementById('audit-card')?.className || '').includes('show');
    const copyBlockedAfterConfirm = typeof COPY_BLOCKED !== 'undefined' ? COPY_BLOCKED : null;
    const statusAfterConfirm = document.getElementById('status-msg')?.textContent || '';

    // (d) segunda tentativa de copia NORMAL apos o override -> deve voltar a bloquear.
    let threwSecondNormal = null;
    try { copiar(); } catch (e) { threwSecondNormal = String((e && e.message) || e); }
    const writesAfterSecondNormal = writes.length;

    window.confirm = originalConfirm;
    try {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
    } catch { /* noop */ }

    return {
      confirmCalls,
      threwNormalBlocked, writesAfterBlockedNormalCopy, statusAfterBlockedNormalCopy,
      threwCancel, writesAfterCancel, auditListAfterCancel, statusAfterCancel,
      threwConfirm, writesAfterConfirm, auditListAfterConfirm, auditCardShownAfterConfirm, copyBlockedAfterConfirm, statusAfterConfirm,
      threwSecondNormal, writesAfterSecondNormal,
    };
  }, pendingReason);
  return { supported: true, ...result, pageErrors: [...session.pageErrors], consoleErrors: [...session.consoleErrors] };
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
  const hasOverride = await session.page.evaluate(() => typeof copiarComOverride === 'function');
  if (!hasOverride) {
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
    copyBlockedAfterGeneration: typeof COPY_BLOCKED !== 'undefined' ? COPY_BLOCKED : null,
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

  // --- 3. edicao manual COM pendencia critica ativa (assercao de seguranca R-01) ---
  // Primeiro instala uma pendencia critica e o bloqueio; depois digita no preview e observa se o
  // bloqueio sobrevive. Tambem testa o caminho da pre-evolucao com baseBlocked=true.
  const editUnderBlock = await session.page.evaluate(() => {
    document.getElementById('audit-list').textContent = '';
    document.getElementById('pending-list').textContent = 'Pendencia critica sintetica (R-01) para teste E2E.';
    document.getElementById('pending-card').className = 'pending-card show';
    setCopyBlocked(true);
    const copyBlockedBefore = COPY_BLOCKED;

    const body = document.getElementById('output-body');
    body.textContent = (body.textContent || '') + '\nEDICAO MANUAL DE TESTE E2E';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    const copyBlockedAfterEdit = COPY_BLOCKED;
    const auditAfterEdit = document.getElementById('audit-list').textContent || '';

    const beforeW = window.__e2e.writes.length;
    copiar();
    const writesAfterEdit = window.__e2e.writes.length - beforeW;

    // 3b: mesmo teste pelo caminho da pre-evolucao, iniciada com pendencia BLOQUEANTE.
    let prefillBypass = null, prefillReviewed = null;
    if (typeof startPreEvolutionEditor === 'function') {
      startPreEvolutionEditor('texto de pre-evolucao sintetico', [], /* baseBlocked */ true);
      const ed = document.getElementById('prefill-editor');
      ed.value = 'texto de pre-evolucao editado';
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      prefillReviewed = PREFILL_STATE.reviewed;
      const bw = window.__e2e.writes.length;
      copiar();
      prefillBypass = window.__e2e.writes.length > bw; // copiou sem confirmar revisao?
    }

    return { copyBlockedBefore, copyBlockedAfterEdit, auditAfterEdit, writesAfterEdit, prefillBypass, prefillReviewed };
  });
  await flush();

  // --- 5. bloqueio com pendencia critica ---
  const blocked = await session.page.evaluate(() => {
    document.getElementById('pending-list').textContent = 'Pendencia critica sintetica de teste E2E.';
    document.getElementById('pending-card').className = 'pending-card show';
    setCopyBlocked(true);
    const before = window.__e2e.writes.length;
    copiar();
    const btn = document.getElementById('btn-copiar-mesmo-assim');
    return {
      before,
      copyBlocked: COPY_BLOCKED,
      overrideButtonVisible: btn ? btn.style.display !== 'none' : null,
      pendingText: document.getElementById('pending-list').textContent || '',
    };
  });
  await flush();
  blocked.writes = (await session.page.evaluate(() => window.__e2e.writes.length)) - blocked.before;

  // --- 6. override cancelado ---
  const overrideCancelled = await session.page.evaluate(() => {
    window.__e2e.confirmReturn = false;
    const beforeW = window.__e2e.writes.length;
    const beforeC = window.__e2e.confirms.length;
    copiarComOverride();
    return { beforeW, beforeC };
  });
  await flush();
  Object.assign(overrideCancelled, await session.page.evaluate((prev) => ({
    writes: window.__e2e.writes.length - prev.beforeW,
    confirmCalled: window.__e2e.confirms.length > prev.beforeC,
    auditText: document.getElementById('audit-list').textContent || '',
  }), overrideCancelled));

  // --- 7. override confirmado ---
  const overrideConfirmed = await session.page.evaluate(() => {
    window.__e2e.confirmReturn = true;
    const beforeW = window.__e2e.writes.length;
    copiarComOverride();
    return { beforeW };
  });
  await flush();
  Object.assign(overrideConfirmed, await session.page.evaluate((prev) => ({
    writes: window.__e2e.writes.length - prev.beforeW,
    auditText: document.getElementById('audit-list').textContent || '',
    auditCardVisible: (document.getElementById('audit-card').className || '').includes('show'),
  }), overrideConfirmed));

  // --- 8. segunda copia normal volta a bloquear ---
  const secondCopy = await session.page.evaluate(() => {
    const beforeW = window.__e2e.writes.length;
    copiar();
    return { beforeW, copyBlockedStillTrue: COPY_BLOCKED };
  });
  await flush();
  secondCopy.writes = (await session.page.evaluate((prev) => window.__e2e.writes.length - prev.beforeW, secondCopy));

  // --- 9. impressao/PDF sem excecao (com o bloqueio ativo e depois liberado) ---
  const print = await session.page.evaluate(() => {
    let threw = null;
    try {
      imprimirDocumento();          // bloqueado -> deve apenas sinalizar, sem excecao
      setCopyBlocked(false);
      imprimirDocumento();          // liberado -> deve chamar window.print()
    } catch (e) { threw = String((e && e.message) || e); }
    return { threw, printCalls: window.__e2e.prints };
  });
  await flush();

  // --- 10. reiniciar sessao limpa estado/audit ---
  const reset = await session.page.evaluate(() => {
    reiniciarTudo();
    return {
      outputEmpty: (document.getElementById('output-body').textContent || '') === '',
      auditEmpty: (document.getElementById('audit-list').textContent || '') === '',
      copyBlocked: typeof COPY_BLOCKED !== 'undefined' ? COPY_BLOCKED : null,
      overrideLogLength: typeof COPY_OVERRIDE_LOG !== 'undefined' ? COPY_OVERRIDE_LOG.length : null,
      outputCardHidden: document.getElementById('output-card').style.display === 'none',
    };
  });

  return {
    supported: true,
    generation, cleanCopy, editUnderBlock, blocked, overrideCancelled, overrideConfirmed, secondCopy, print, reset,
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
