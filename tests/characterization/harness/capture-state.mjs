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
