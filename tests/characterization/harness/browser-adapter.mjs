// Harness primario de characterization: Playwright + Chromium headless.
// Carrega o artefato .html real (baseline, referencia ou candidato) sem modificacao
// e executa codigo diretamente no contexto global da pagina (mesmo realm dos
// <script> inline do proprio arquivo), para chamar a API clinica real
// (ClinicalState, MODE, DEFAULT_DICT, etc.) em vez de uma copia extraida.
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROMIUM_PATH = '/opt/pw-browsers/chromium';

export async function openArtifact(htmlPath) {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(String(err && err.message || err));
  });

  const absPath = path.resolve(htmlPath);
  await page.goto(pathToFileURL(absPath).href);

  return {
    page,
    browser,
    consoleErrors,
    pageErrors,
    async close() {
      await browser.close();
    },
  };
}

// Executa `new ClinicalState(raw, modo, dict).resolve()` no contexto real da pagina
// carregada e retorna { finalData, conflitos, warnings, auditLog, pageErrors, consoleErrors }.
// `raw` e `modo` sao serializaveis (JSON); nao passar funcoes.
export async function runClinicalState(session, raw, modo) {
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
