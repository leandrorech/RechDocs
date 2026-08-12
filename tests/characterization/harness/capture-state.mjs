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
