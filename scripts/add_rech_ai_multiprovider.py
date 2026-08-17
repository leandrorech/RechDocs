from pathlib import Path

p=Path('output/RechDocs_v3.4.2.html')
s=p.read_text(encoding='utf-8')

def once(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'anchor not found: {label}')
    s=s.replace(old,new,1)

# UI: explicit manual selection, same provider registry/key workflow.
once("    <button class=\"tab\" data-provider=\"qwen\" onclick=\"setProvider('qwen')\">Qwen</button>",
     "    <button class=\"tab\" data-provider=\"qwen\" onclick=\"setProvider('qwen')\">Qwen</button>\n    <button class=\"tab\" data-provider=\"kimi\" onclick=\"setProvider('kimi')\">Kimi</button>\n    <button class=\"tab\" data-provider=\"custom\" onclick=\"if(configureCustomProvider())setProvider('custom')\">Custom</button>",
     'provider tabs')

# Extend the mutable provider config without changing the clinical pipeline.
anchor="""  qwen:{
    // Catálogo oficial Alibaba Model Studio 16/08/2026. Ambos aceitam texto+imagem no endpoint
    // Anthropic-compatible; o domínio global de Singapore permanece funcional.
    keyPrefix:'sk-', placeholder:'sk-...', supportsVision:true,
    models:[
      {v:'qwen3.6-flash',l:'qwen3.6-flash (rápido/barato + visão)'},
      {v:'qwen3.7-plus',l:'qwen3.7-plus (mais capaz + visão)'}
    ]
  }

};
function setProvider(p){"""
replacement="""  qwen:{
    // Catálogo oficial Alibaba Model Studio 16/08/2026.
    keyPrefix:'sk-', placeholder:'sk-...', supportsVision:true,
    models:[
      {v:'qwen3.6-flash',l:'qwen3.6-flash (rápido/barato + visão)'},
      {v:'qwen3.7-plus',l:'qwen3.7-plus (mais capaz + visão)'}
    ]
  },
  kimi:{
    keyPrefix:'sk-', placeholder:'sk-...', supportsVision:true,
    models:[{v:'kimi-k2.6',l:'kimi-k2.6'}]
  },
  custom:{
    keyPrefix:'', placeholder:'API key...', supportsVision:false,
    models:[{v:'custom-model',l:'custom-model'}]
  }

};
function configureCustomProvider(){
  const oldBase=safeLocalStorage.getItem('custom_base_url')||'';
  const oldModel=safeLocalStorage.getItem('model_custom')||'';
  const base=prompt('Base URL OpenAI-compatible (ex.: https://servidor.exemplo/v1):',oldBase);
  if(base===null)return false;
  const model=prompt('ID exato do modelo:',oldModel);
  if(model===null||!model.trim())return false;
  safeLocalStorage.setItem('custom_base_url',base.trim());
  safeLocalStorage.setItem('model_custom',model.trim());
  PROVIDER_CFG.custom.models=[{v:model.trim(),l:model.trim()}];
  return true;
}
function setProvider(p){
  if(p==='custom'){
    const cm=safeLocalStorage.getItem('model_custom')||'custom-model';
    PROVIDER_CFG.custom.models=[{v:cm,l:cm}];
  }"""
once(anchor,replacement,'provider config extension')

# Generic OpenAI-compatible transport used only by Kimi/Custom; no fallback to another provider.
marker="async function callProvider(provider, systemPrompt, contentParts, model, key, signal){"
helper=r'''async function callOpenAICompatibleEndpoint(providerName, endpoint, systemPrompt, contentParts, model, key, signal){
  const oaContent=contentParts.map(p=>{
    if(p.type==='text') return {type:'text',text:p.text};
    if(p.type==='image') return {type:'image_url',image_url:{url:`data:${p.source.media_type};base64,${p.source.data}`}};
    return null;
  }).filter(Boolean);
  const resp=await fetch(endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model,max_tokens:32000,messages:[{role:'system',content:systemPrompt},{role:'user',content:oaContent}]}),
    signal
  });
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)return {ok:false,errorMsg:(data.error&&data.error.message)?(`Erro ${resp.status}: ${data.error.message}`):(`Erro HTTP ${resp.status}`)};
  const choice=((data.choices||[])[0]||{});
  if(choice.message&&choice.message.refusal)return {ok:false,errorMsg:'O provedor recusou processar este conteúdo: '+choice.message.refusal};
  const raw=choice.message&&choice.message.content;
  const text=Array.isArray(raw)?raw.map(x=>x&&x.text?x.text:'').join('').trim():String(raw||'').trim();
  if(choice.finish_reason==='length')return {ok:true,text,truncated:true};
  if(['content_filter','refusal'].includes(choice.finish_reason))return {ok:false,errorMsg:'A resposta foi bloqueada/recusada pelo provedor.'};
  if(!text)return {ok:false,errorMsg:'Resposta vazia de '+providerName+'.'};
  return {ok:true,text};
}
function customChatEndpoint(){
  let base=(safeLocalStorage.getItem('custom_base_url')||'').trim().replace(/\/+$/,'');
  if(!base)return'';
  if(/\/chat\/completions$/i.test(base))return base;
  if(!/\/v1$/i.test(base))base+='/v1';
  return base+'/chat/completions';
}
async function callKimi(systemPrompt,contentParts,model,key,signal){
  return callOpenAICompatibleEndpoint('Kimi','https://api.moonshot.ai/v1/chat/completions',systemPrompt,contentParts,model,key,signal);
}
async function callCustom(systemPrompt,contentParts,model,key,signal){
  const endpoint=customChatEndpoint();
  if(!endpoint)return {ok:false,errorMsg:'Configure a Base URL do provedor Custom.'};
  return callOpenAICompatibleEndpoint('Custom',endpoint,systemPrompt,contentParts,model,key,signal);
}
'''
if helper.strip() not in s:
    once(marker,helper+'\n'+marker,'compatible transport helper')

once("  if(provider==='qwen') return callQwen(systemPrompt, contentParts, model, key, signal);\n  return {ok:false, errorMsg:'Provedor desconhecido: '+provider};",
     "  if(provider==='qwen') return callQwen(systemPrompt, contentParts, model, key, signal);\n  if(provider==='kimi') return callKimi(systemPrompt, contentParts, model, key, signal);\n  if(provider==='custom') return callCustom(systemPrompt, contentParts, model, key, signal);\n  return {ok:false, errorMsg:'Provedor desconhecido: '+provider};",
     'callProvider dispatch')

# Product contract marker used by static tests.
if 'RECH-AI-01' not in s:
    s=s.replace('// PROVEDORES — configuração e troca de UI','// RECH-AI-01: seleção explícita de provedor/modelo; sem fallback silencioso.\n// PROVEDORES — configuração e troca de UI',1)

p.write_text(s,encoding='utf-8')
print('RechDocs multi-provider patch: PASS')
