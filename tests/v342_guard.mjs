import assert from 'node:assert/strict';
import { openIsolatedArtifact, closeBrowser } from './characterization/harness/browser-adapter.mjs';

const session = await openIsolatedArtifact('output/RechDocs_v3.4.2.html');
try {
  const observed = await session.page.evaluate(() => {
    safeLocalStorage.setItem('model_openai','gpt-4o');
    setProvider('openai');
    const fallbackModel=document.getElementById('model').value;
    const out=document.getElementById('output-body');
    return {
      title: document.title,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      outputBg: getComputedStyle(out).backgroundColor,
      outputFontPx: parseFloat(getComputedStyle(out).fontSize),
      fap: fAP({mv:'MV+ BILATERAL',ra:''}),
      openai: PROVIDER_CFG.openai.models.map(x=>x.v),
      gemini: PROVIDER_CFG.gemini.models.map(x=>x.v),
      deepseek: PROVIDER_CFG.deepseek.models.map(x=>x.v),
      qwen: PROVIDER_CFG.qwen.models.map(x=>x.v),
      qwenVision: PROVIDER_CFG.qwen.supportsVision,
      fallbackModel,
      dosePrompt: buildSystemPrompt('evolucao',{}).includes('NUNCA calcule, corrija, ajuste, substitua'),
      doseExact: validateDoseLiteralness({dva:[{droga:'Noradrenalina',dose:'3 mcg/min'}]},'Noradrenalina 3 mcg/min',true),
      doseChanged: validateDoseLiteralness({dva:[{droga:'Noradrenalina',dose:'3 mcg/min'}]},'Noradrenalina 2 mcg/min',true),
    };
  });
  assert.match(observed.title,/3\.4\.2/);
  assert.equal(observed.bodyBg,'rgb(255, 255, 255)');
  assert.equal(observed.outputBg,'rgb(255, 255, 255)');
  assert.ok(observed.outputFontPx <= 10.1, `preview font too large: ${observed.outputFontPx}px`);
  assert.equal(observed.fap,'MV+ BILATERAL');
  assert.deepEqual(observed.openai,['gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol']);
  assert.deepEqual(observed.gemini,['gemini-3.6-flash','gemini-3.1-pro-preview']);
  assert.deepEqual(observed.deepseek,['deepseek-v4-flash','deepseek-v4-pro']);
  assert.deepEqual(observed.qwen,['qwen3.6-flash','qwen3.7-plus']);
  assert.equal(observed.qwenVision,true);
  assert.equal(observed.fallbackModel,'gpt-5.6-luna');
  assert.equal(observed.dosePrompt,true);
  assert.equal(observed.doseExact.length,0);
  assert.equal(observed.doseChanged.length,1);
  assert.match(observed.doseChanged[0],/NÃO aparece literalmente/);
  assert.deepEqual(session.consoleErrors,[]);
  assert.deepEqual(session.pageErrors,[]);
  console.log('v3.4.2 guard PASS', JSON.stringify(observed,null,2));
} finally {
  await session.close();
  await closeBrowser();
}
