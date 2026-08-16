// Harness primario de characterization: Playwright + Chromium headless.
// Carrega o artefato .html real (baseline, referencia ou candidato) sem
// modificacao e executa codigo diretamente no contexto global da pagina
// (mesmo realm dos <script> inline do proprio arquivo), para chamar a API
// clinica real (ClinicalState, MODE, DEFAULT_DICT, buildExamesCompactos...)
// em vez de uma copia extraida.
//
// Isolamento obrigatorio: cada chamada a openIsolatedArtifact() cria um
// BrowserContext novo (equivalente a uma janela anonima nova) — sem
// localStorage/sessionStorage/cookies herdados de execucoes anteriores.
// Mesma instancia de Chromium (mesmo executavel) para baseline, referencia
// e candidata, timezone e locale fixos para eliminar variancia temporal
// entre execucoes.
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/opt/pw-browsers/chromium';
const FIXED_TIMEZONE_ID = 'America/Sao_Paulo';
const FIXED_LOCALE = 'pt-BR';

let sharedBrowser = null;

export async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
  }
  return sharedBrowser;
}

export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

export async function sha256File(filePath) {
  const buf = await fs.readFile(path.resolve(filePath));
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Abre o artefato em um BrowserContext isolado e novo. Nao ha chamadas de
// rede reais neste harness: os fluxos testados (ClinicalState.resolve(),
// buildExamesCompactos(), inspecao estatica de COPY_BLOCKED/copiar()) nao
// dependem de fetch() a provedores de IA — por isso a execucao e
// deterministica sem necessidade de mock de rede. Caso uma fixture futura
// precise do fluxo real de geracao (que chama fetch), isso deve ser
// documentado explicitamente nessa fixture antes de comparar resultados.
export async function openIsolatedArtifact(htmlPath) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    timezoneId: FIXED_TIMEZONE_ID,
    locale: FIXED_LOCALE,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(String((err && err.message) || err));
  });

  const absPath = path.resolve(htmlPath);
  await page.goto(pathToFileURL(absPath).href);

  // Limpeza defensiva adicional: mesmo com contexto isolado, particionamento
  // de storage para origem file:// nao e garantido identico entre versoes
  // de engine — limpamos explicitamente em vez de confiar so no isolamento
  // do BrowserContext.
  await page.evaluate(() => {
    try { localStorage.clear(); } catch { /* noop */ }
    try { sessionStorage.clear(); } catch { /* noop */ }
  });
  await context.clearCookies();

  return {
    artifactPath: absPath,
    context,
    page,
    consoleErrors,
    pageErrors,
    timezoneId: FIXED_TIMEZONE_ID,
    locale: FIXED_LOCALE,
    async close() {
      await context.close();
    },
  };
}
