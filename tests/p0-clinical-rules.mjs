import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve('output/RechDocs_v3.4.1.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(pathToFileURL(file).href, { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(() => {
  const a = window.__RECH_TEST_API;
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

  // Outras infusões contínuas: BIC/bomba isoladamente não define continuidade.
  assert(a.isContinuousInfusion({ droga:'Insulina regular', dose:'2 UI/h' }) === true, 'insulina 2 UI/h deve ser contínua');
  assert(a.isContinuousInfusion({ droga:'Noradrenalina', dose:'0,1 mcg/kg/min' }) === true, 'norad mcg/kg/min deve ser contínua');
  assert(a.isContinuousInfusion({ droga:'Cefepime', dose:'2 g EV 8/8 h, infundir em 3 horas em BIC' }) === false, 'cefepime 8/8h em BIC NÃO é contínuo');
  assert(a.isContinuousInfusion({ droga:'Piperacilina/tazobactam', dose:'4,5 g 6/6 h correr em 1 hora em bomba' }) === false, 'Tazo 6/6h em bomba NÃO é contínuo');
  assert(a.isContinuousInfusion({ droga:'Furosemida', dose:'em BIC' }) === false, 'BIC isoladamente NÃO prova contínuo');

  // HMG: apenas Hb/Ht/Leuco/Plaq. Demais exames permanecem.
  const exams = a.normalizeExamsForOutput([
    { tipo:'lab', nome:'Hemograma', resultado:'Hb 8,2 | Ht 25 | Hemácias 2,9 | VCM 87 | HCM 28 | CHCM 33 | RDW 15 | Leuco 13.400 | Plaq 190.000', data:'14/08/2026' },
    { tipo:'lab', nome:'VCM', resultado:'87', unidade:'fL', data:'14/08/2026' },
    { tipo:'lab', nome:'Na', resultado:'138', unidade:'mEq/L', data:'14/08/2026' },
    { tipo:'lab', nome:'PCR', resultado:'12', unidade:'mg/L', data:'14/08/2026' },
    { tipo:'outro', nome:'ECG', resultado:'Ritmo sinusal', data:'14/08/2026' }
  ]);
  const h = exams.find(x => /hemograma/i.test(x.nome));
  assert(h && /Hb 8,2/.test(h.resultado) && /Ht 25/.test(h.resultado) && /Leuco 13\.400/.test(h.resultado) && /Plaq 190\.000/.test(h.resultado), 'HMG deve manter Hb/Ht/Leuco/Plaq');
  assert(!/VCM|HCM|CHCM|RDW|Hemácias/i.test(h.resultado), 'HMG não deve manter eritrograma expandido');
  assert(!exams.some(x => x.nome === 'VCM'), 'VCM isolado do HMG deve sair do output');
  assert(exams.some(x => x.nome === 'Na') && exams.some(x => x.nome === 'PCR') && exams.some(x => x.nome === 'ECG'), 'demais exames devem permanecer');
  assert(a.formatCompactExam({ nome:'Na', resultado:'138', unidade:'mEq/L' }) === 'Na: 138', 'unidade redundante não deve aparecer no compacto');

  // Interconsultas: solicitação não é parecer e ausência de data fica explícita.
  const inter = a.buildInterconsultas({ interconsultas:[{ especialidade:'Nefrologia', status:'solicitada', motivo:'avaliar LRA', data:null, parecer:null }] });
  assert(/SEM DATA REGISTRADA/.test(inter), 'interconsulta sem data deve ficar explícita');
  assert(/SOLICITADA/.test(inter) && !/Parecer:/i.test(inter), 'solicitação não pode virar parecer realizado');

  // Temporalidade relativa sem âncora deve alertar; com data absoluta ou declaração explícita, não.
  const tw1 = a.collectTemporalAnchoringWarnings({ hda:'Ontem apresentou piora.', condutas:[], interconsultas:[] });
  assert(tw1.length === 1, 'ontem sem data precisa alertar');
  const tw2 = a.collectTemporalAnchoringWarnings({ hda:'Em 14/08/2026 apresentou piora.', condutas:[], interconsultas:[] });
  assert(tw2.length === 0, 'data absoluta não deve alertar');
  const tw3 = a.collectTemporalAnchoringWarnings({ hda:'Conforme documento sem data registrada, há 30 dias iniciou dispneia.', condutas:[], interconsultas:[] });
  assert(tw3.length === 0, 'ausência de âncora explicitamente declarada não deve gerar alerta redundante');

  // Contratos devem chegar ao extrator de IA.
  const prompt = a.buildSystemPrompt('evolucao', {});
  assert(prompt.includes('OUTRAS INFUSÕES CONTÍNUAS: este array é EXCLUSIVAMENTE'), 'prompt deve conter contrato de infusão contínua');
  assert(prompt.includes('HEMOGRAMA — ÚNICA EXCEÇÃO DE SELEÇÃO'), 'prompt deve conter regra específica do HMG');
  assert(prompt.includes('conforme documento sem data registrada'), 'prompt deve conter regra temporal sem âncora');
  assert(prompt.includes('Solicitação NÃO é parecer realizado'), 'prompt deve separar solicitação de parecer');

  return 'P0 clinical rules: PASS';
});

console.log(result);
await browser.close();
