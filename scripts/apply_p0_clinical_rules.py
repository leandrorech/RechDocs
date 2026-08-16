from pathlib import Path
import re

p = Path("output/RechDocs_v3.4.1.html")
s = p.read_text(encoding="utf-8")
original = s


def sub1(pattern, repl, flags=0, label="pattern"):
    global s
    new, n = re.subn(pattern, lambda m: repl, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 replacement, got {n}")
    s = new


# ─────────────────────────────────────────────────────────────
# P0 TEMPORALIDADE
# ─────────────────────────────────────────────────────────────
s = s.replace(
    'NUNCA escreva "citado previamente", "conforme documento anterior", "de acordo com evolução" — isso denuncia texto gerado por IA. Cite datas apenas quando clinicamente úteis (dia de tratamento, início/fim de uso).',
    'NUNCA escreva "citado previamente", "conforme documento anterior", "de acordo com evolução" — isso denuncia texto gerado por IA. EXCEÇÃO obrigatória: quando uma expressão temporal relativa vier de fonte sem data identificável, deixe explícito "conforme documento sem data registrada". Sempre normalize hoje/ontem/amanhã e intervalos relativos para data absoluta quando a data do documento-fonte for conhecida; preserve aproximação quando a fonte disser "cerca de"/"aproximadamente".'
)

temporal_rules = '''1c. CRÍTICO — TEMPORALIDADE/ÂNCORA: expressões relativas ("hoje", "ontem", "amanhã", "há X dias/semanas/meses", "semana passada") pertencem à DATA DO DOCUMENTO-FONTE, não à data atual do aplicativo. Se a data do documento-fonte for conhecida, converta a referência para data absoluta (dd/mm/aaaa quando o ano estiver disponível) e preserve o estado do evento: "amanhã fará" vira "programado para DD/MM/AAAA", NUNCA "realizado". Se a expressão for aproximada, a data derivada continua aproximada. Se a data do documento-fonte NÃO puder ser determinada, NÃO invente data: em campos narrativos use explicitamente "conforme documento sem data registrada, há X..." (ou formulação equivalente que deixe a ausência da âncora inequívoca) e, em campos estruturados, mantenha data=null.
1d. CRÍTICO — OUTRAS INFUSÕES CONTÍNUAS: este array é EXCLUSIVAMENTE para fármacos realmente mantidos em infusão contínua, sem esquema intermitente de horário, e que não pertençam a DVA, sedação/analgesia, BNM, ATB ou antitrombóticos. "Em BIC"/"em bomba" isoladamente NÃO significa contínuo. Cefepime 8/8h infundido em 3h, piperacilina/tazobactam 6/6h correndo em 1h, ou qualquer fármaco 6/6h, 8/8h, 12/12h, 24/24h/1x-dia continuam INTERMITENTES e NÃO entram em outras_infusoes. Evidência típica de contínuo: taxa sustentada (mL/h, mg/h, mcg/h, mcg/kg/min, UI/h, U/h, mg/min) ou texto explícito "infusão contínua"/"manter continuamente".
'''
marker = '2. NÃO decida qual versão vence — extraia TODAS as menções'
if temporal_rules not in s:
    if marker not in s:
        raise SystemExit("temporal insertion marker missing")
    s = s.replace(marker, temporal_rules + marker, 1)

# ─────────────────────────────────────────────────────────────
# P0 EXAMES / HMG / TEMPORALIDADE
# ─────────────────────────────────────────────────────────────
new_exam_rules = '''8. EXAMES: NUNCA versione nem descarte exames. TODO exame fornecido deve ser extraído, inclusive exames não previstos em listas fechadas: laboratório, gasometria, cultura, ECG, ecocardiograma, radiografia, TC, RM, ultrassom, Doppler, endoscopia, broncoscopia, anatomopatológico e qualquer outro. Use tipo="outro" quando nenhuma categoria específica servir. Cada exame é evento histórico e deve manter sua temporalidade individual. Estrutura: "exames": [{"tipo":"lab"|"imagem"|"gasometria"|"cultura"|"outro","nome":"","resultado":"","unidade":"","data":"","hora":""}]. Se houver unidade explícita, extraia-a separadamente em "unidade"; NÃO a repita dentro de "resultado". Se a data do exame for explícita, use-a. Se houver referência relativa e a data do documento-fonte for conhecida, resolva a data conforme 1c. Sem âncora confiável, data=null — nunca invente.
8a. HEMOGRAMA — ÚNICA EXCEÇÃO DE SELEÇÃO: no output clínico do hemograma devem permanecer apenas Hb, Ht, leucócitos e plaquetas. Não transportar automaticamente hemácias, VCM, HCM, CHCM, RDW, diferencial leucocitário ou índices plaquetários para o documento final. Esta restrição vale SOMENTE para o hemograma. Todos os demais exames devem ser preservados integralmente.
8b. INTERPRETAÇÃO/PRESERVAÇÃO: para laudos e exames não laboratoriais, preserve todos os achados/conclusões explicitamente fornecidos; não descarte um exame por ser desconhecido. Para exames seriados, mantenha cada data/hora separada para permitir tendência. Não invente diagnóstico, causalidade ou gravidade além do laudo/fonte; qualquer síntese/reformulação deve continuar declarada em rastreabilidade.

8c. INTERCONSULTAS:'''
sub1(r'8\. EXAMES:.*?\n\n8c\. INTERCONSULTAS:', new_exam_rules, flags=re.S, label="exam rules")

new_inter_rules = '''8c. INTERCONSULTAS: cada solicitação/parecer de especialidade é evento histórico próprio e deve ser mantido. Extraia "interconsultas": [{"especialidade":"","motivo":"","parecer":"","status":"solicitada"|"aguardando"|"realizada"|"reavaliada"|"acompanhamento"|"encerrada","data":"","hora":""}]. Solicitação NÃO é parecer realizado: se só houver "solicitada avaliação de X", status="solicitada" e parecer=null. Parecer efetivamente descrito usa status="realizada" (ou reavaliada/acompanhamento quando explícito) e preserva a orientação. Temporalidade segue 1c: referência relativa + documento datado deve ser convertida para data absoluta; sem âncora confiável, data=null e a ausência deve permanecer explícita no output — nunca invente nem reutilize data de outro documento. Interconsultas da mesma especialidade em datas distintas são eventos distintos e não se substituem.
9. VENTILATÓRIO:'''
sub1(r'8c\. INTERCONSULTAS:.*?\n9\. VENTILATÓRIO:', new_inter_rules, flags=re.S, label="interconsult rules")

s = s.replace(
    '"exames": [{"tipo":"","nome":"","resultado":"","data":"","hora":""}]',
    '"exames": [{"tipo":"","nome":"","resultado":"","unidade":"","data":"","hora":""}]'
)
s = s.replace(
    '"interconsultas": [{"especialidade":"","motivo":"","parecer":"","status":"","data":"","hora":""}]',
    '"interconsultas": [{"especialidade":"","motivo":"","parecer":"","status":"solicitada|aguardando|realizada|reavaliada|acompanhamento|encerrada","data":"","hora":""}]'
)

# ─────────────────────────────────────────────────────────────
# P0 OUTRAS INFUSÕES CONTÍNUAS
# ─────────────────────────────────────────────────────────────
old = '''function fOutrasInfusoes(outras){
  const itens=(outras||[]).filter(o=>o.droga).map(o=>{let r=o.droga; if(o.dose)r+=` ${o.dose} ${o.unidade||''}`; return r.trim();});
  return itens.length?itens.join('\\n'):'---';
}'''
new = '''function isContinuousInfusion(o){
  if(!o||!cleanStr(o.droga))return false;
  const raw=[o.droga,o.dose,o.unidade,o.regime,o.detalhe].map(cleanStr).filter(Boolean).join(' ');
  // BIC/bomba isoladamente NÃO define continuidade. Esquema de horário ou duração finita é intermitente.
  const intermittent=/\\b(?:1x\\s*\\/?\\s*dia|24\\s*\\/\\s*24|12\\s*\\/\\s*12|8\\s*\\/\\s*8|6\\s*\\/\\s*6|4\\s*\\/\\s*4|2\\s*\\/\\s*2)\\s*h?\\b/i.test(raw)
    || /\\b(?:correr|infundir|administrar)\\s+(?:em|por)\\s+\\d+(?:[.,]\\d+)?\\s*(?:h|hora|horas|min|minuto|minutos)\\b/i.test(raw);
  if(intermittent)return false;
  return /\\b(?:ml|mg|mcg|µg|ug|ui|u)\\s*\\/\\s*h\\b/i.test(raw)
    || /\\b(?:mg|mcg|µg|ug)\\s*\\/\\s*kg\\s*\\/\\s*min\\b/i.test(raw)
    || /\\b(?:mg|mcg|µg|ug)\\s*\\/\\s*min\\b/i.test(raw)
    || /\\binfus[aã]o\\s+cont[ií]nua\\b/i.test(raw)
    || /\\b(?:manter\\s+)?continuamente\\b/i.test(raw)
    || /\\bcont[ií]nu[oa]\\b/i.test(raw);
}
function fOutrasInfusoes(outras){
  const itens=(outras||[]).filter(o=>o.droga&&isContinuousInfusion(o)).map(o=>{let r=o.droga; if(o.dose)r+=` ${o.dose} ${o.unidade||''}`; return r.trim();});
  return itens.length?itens.join('\\n'):'---';
}'''
if old not in s:
    raise SystemExit("fOutrasInfusoes exact block missing")
s = s.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────
# HMG — Hb/Ht/Leuco/Plaq; demais exames preservados.
# Unidade preservada no estado, omitida do output clínico compacto.
# ─────────────────────────────────────────────────────────────
exam_helpers = '''function hemogramComponentClass(name){
  const k=keyName(name);
  if(/^(hb|hemoglobina|ht|hematocrito|leuco|leucocitos|leucocito|plaq|plaquetas|plaqueta)$/.test(k))return'keep';
  if(/^(hemacias|hemacia|eritrocitos|eritrocito|vcm|hcm|chcm|rdw|neutrofilos|neutrofilo|segmentados|segmentado|bastoes|bastao|linfocitos|linfocito|monocitos|monocito|eosinofilos|eosinofilo|basofilos|basofilo|vpm|pdw)$/.test(k))return'drop';
  return'other';
}
function compactHemogramResult(result){
  const text=cleanStr(result);
  if(!text)return text;
  const defs=[
    ['Hb',/(?:^|[\\s|;,])(?:hb|hemoglobina)\\s*[:=]?\\s*([<>]?\\s*\\d+(?:[.,]\\d+)?)/i],
    ['Ht',/(?:^|[\\s|;,])(?:ht|hemat[oó]crito)\\s*[:=]?\\s*([<>]?\\s*\\d+(?:[.,]\\d+)?)/i],
    ['Leuco',/(?:^|[\\s|;,])(?:leuco(?:citos?)?|leuc[oó]citos?)\\s*[:=]?\\s*([<>]?\\s*\\d+(?:[.,]\\d+)?)/i],
    ['Plaq',/(?:^|[\\s|;,])(?:plaq(?:uetas?)?|plaquetas?)\\s*[:=]?\\s*([<>]?\\s*\\d+(?:[.,]\\d+)?)/i]
  ];
  const out=[];
  defs.forEach(([label,re])=>{const m=text.match(re);if(m)out.push(`${label} ${cleanStr(m[1])}`);});
  return out.length?out.join(' | '):text;
}
function normalizeExamsForOutput(exams){
  const out=[];
  asArray(exams).forEach(e=>{
    if(!e||!cleanStr(e.nome))return;
    const k=keyName(e.nome);
    if(k.startsWith('hemograma')||/^hmg(?:\\s|$)/.test(k)){
      out.push({...e,resultado:compactHemogramResult(e.resultado)});
      return;
    }
    if(hemogramComponentClass(e.nome)==='drop')return;
    out.push({...e});
  });
  return out;
}
function examResultForOutput(e){
  let result=cleanStr(e&&e.resultado), unit=cleanStr(e&&e.unidade);
  if(result&&unit){
    const esc=unit.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
    result=result.replace(new RegExp('\\\\s*'+esc+'\\\\s*$','i'),'').trim();
  }
  return result;
}
'''
if exam_helpers not in s:
    if "function buildExames(d){" not in s:
        raise SystemExit("buildExames marker missing")
    s = s.replace("function buildExames(d){", exam_helpers + "function buildExames(d){", 1)

old_build = '''function buildExames(d){
  const lines=[];
  const exArr=asArray(d.exames);
  if(exArr.length){
    const byTipo={};
    exArr.forEach(e=>{ const t=e.tipo||'outro'; if(!byTipo[t])byTipo[t]=[]; byTipo[t].push(e); });
    const labels={lab:'LABORATORIAIS',imagem:'IMAGEM',gasometria:'GASOMETRIA',cultura:'CULTURAS',outro:'OUTROS'};
    for(const t of ['lab','gasometria','cultura','imagem','outro']){
      if(!byTipo[t])continue;
      lines.push(labels[t]+':');
      byTipo[t].forEach(e=>{ let s=e.nome; if(e.data)s+=` (${e.data}${e.hora?' '+e.hora:''})`; if(e.resultado)s+=`: ${e.resultado}`; lines.push(s); });
    }
  }
  // fallback legado, caso a extração ainda venha no formato antigo exames_lab/exames_imagem
  if(!exArr.length && d.exames_lab&&d.exames_lab.length){ lines.push('LABORATORIAIS:'); d.exames_lab.forEach(e=>{const s=examStr(e);if(s)lines.push(s);}); }
  if(!exArr.length && d.exames_imagem&&d.exames_imagem.length){ lines.push('IMAGEM:'); d.exames_imagem.forEach(e=>{const s=examStr(e);if(s)lines.push(s);}); }
  return lines.length?lines.join('\\n'):'---';
}'''
new_build = '''function buildExames(d){
  const lines=[];
  const exArr=sortAndDedupeExams(normalizeExamsForOutput(d.exames));
  if(exArr.length){
    const byTipo={};
    exArr.forEach(e=>{ const t=['lab','imagem','gasometria','cultura','outro'].includes(e.tipo)?e.tipo:'outro'; if(!byTipo[t])byTipo[t]=[]; byTipo[t].push(e); });
    const labels={lab:'LABORATORIAIS',imagem:'IMAGEM',gasometria:'GASOMETRIA',cultura:'CULTURAS',outro:'OUTROS'};
    for(const t of ['lab','gasometria','cultura','imagem','outro']){
      if(!byTipo[t])continue;
      lines.push(labels[t]+':');
      byTipo[t].forEach(e=>{
        let row=cleanStr(e.nome);
        row+=e.data?` (${e.data}${e.hora?' '+e.hora:''})`:' (SEM DATA REGISTRADA)';
        const result=examResultForOutput(e); if(result)row+=`: ${result}`;
        lines.push(row);
      });
    }
  }
  // fallback legado, caso a extração ainda venha no formato antigo exames_lab/exames_imagem
  if(!exArr.length && d.exames_lab&&d.exames_lab.length){ lines.push('LABORATORIAIS:'); d.exames_lab.forEach(e=>{const x=examStr(e);if(x)lines.push(x);}); }
  if(!exArr.length && d.exames_imagem&&d.exames_imagem.length){ lines.push('IMAGEM:'); d.exames_imagem.forEach(e=>{const x=examStr(e);if(x)lines.push(x);}); }
  return lines.length?lines.join('\\n'):'---';
}'''
if old_build not in s:
    raise SystemExit("buildExames exact block missing")
s = s.replace(old_build, new_build, 1)

old_fmt = '''function formatCompactExam(e){
  let result=cleanStr(e.resultado), unit=cleanStr(e.unidade);
  if(unit&&result&&!keyName(result).includes(keyName(unit)))result+=` ${unit}`;
  else if(unit&&!result)result=unit;
  return `${cleanStr(e.nome)}${result?`: ${result}`:''}`;
}'''
new_fmt = '''function formatCompactExam(e){
  const result=examResultForOutput(e);
  return `${cleanStr(e.nome)}${result?`: ${result}`:''}`;
}'''
if old_fmt not in s:
    raise SystemExit("formatCompactExam block missing")
s = s.replace(old_fmt, new_fmt, 1)
s = s.replace(
    "const exams=sortAndDedupeExams(d&&d.exames);",
    "const exams=sortAndDedupeExams(normalizeExamsForOutput(d&&d.exames));",
    1,
)
s = s.replace("renderGroup('SEM DATA INFORMADA',undated)", "renderGroup('SEM DATA REGISTRADA',undated)", 1)

# ─────────────────────────────────────────────────────────────
# P0 INTERCONSULTAS
# ─────────────────────────────────────────────────────────────
old_inter = '''function buildInterconsultas(d){
  const arr=asArray(d.interconsultas).filter(i=>i&&i.especialidade);
  if(!arr.length)return'---';
  return arr.map(i=>{
    // Ausência de data continua visível no card de conflitos/pendências, mas não é injetada como
    // marcador técnico dentro do documento clínico pronto. Quando existe, a data permanece explícita.
    const dataStr=i.data?`[${i.data}${i.hora?' '+i.hora:''}] `:'';
    let s=`${dataStr}${i.especialidade.toUpperCase()}`;
    if(i.status)s+=` — ${String(i.status).toUpperCase()}`;
    if(i.motivo)s+=`\\n  Motivo: ${i.motivo}`;
    if(i.parecer)s+=`\\n  Parecer: ${i.parecer}`;
    return s;
  }).join('\\n');
}'''
new_inter = '''function buildInterconsultas(d){
  const arr=asArray(d.interconsultas).filter(i=>i&&i.especialidade);
  if(!arr.length)return'---';
  return arr.map(i=>{
    const dataStr=i.data?`[${i.data}${i.hora?' '+i.hora:''}] `:'[SEM DATA REGISTRADA] ';
    let out=`${dataStr}${String(i.especialidade).toUpperCase()}`;
    if(i.status)out+=` — ${String(i.status).toUpperCase()}`;
    if(i.motivo)out+=`\\n  Motivo: ${i.motivo}`;
    if(i.parecer)out+=`\\n  Parecer: ${i.parecer}`;
    return out;
  }).join('\\n');
}'''
if old_inter not in s:
    raise SystemExit("buildInterconsultas exact block missing")
s = s.replace(old_inter, new_inter, 1)
s = s.replace(
    "Interconsultas: mesma lógica de exames — nunca versiona/sobrescreve, apenas acumula\n  // cronologicamente. Data é OBRIGATÓRIA e nunca inferida; ausência é sinalizada como\n  // conflito explícito para revisão manual (nunca silenciosa).",
    "Interconsultas: nunca versiona/sobrescreve; acumula cronologicamente. Data nunca é inventada.\n  // Quando faltar âncora temporal, a ausência permanece explícita no output e no painel de atenção.",
)
s = s.replace(
    "interconsulta(s) sem data — não é possível posicionar na linha do tempo. Confirme manualmente:",
    "interconsulta(s) sem data/âncora temporal — mantida(s) explicitamente como SEM DATA REGISTRADA; confirme a cronologia quando possível:",
)

# ─────────────────────────────────────────────────────────────
# Alertas determinísticos auxiliares
# ─────────────────────────────────────────────────────────────
temporal_helper = '''function collectTemporalAnchoringWarnings(d){
  const vals=[d&&d.hda,d&&d.admissao_uti,d&&d.evolucao_medica,d&&d.intercorrencias,d&&d.impressao_clinica,...asArray(d&&d.condutas)];
  asArray(d&&d.interconsultas).forEach(i=>{vals.push(i&&i.motivo,i&&i.parecer);});
  const rel=/\\b(?:hoje|ontem|amanh[aã]|h[aá]\\s+(?:cerca\\s+de\\s+|aproximadamente\\s+)?\\d+\\s+(?:dia|dias|semana|semanas|m[eê]s|meses|hora|horas))\\b/i;
  const date=/\\b\\d{1,2}[\\/-]\\d{1,2}(?:[\\/-]\\d{2,4})?\\b/;
  const explicitUnknown=/documento\\s+sem\\s+data(?:\\s+registrada)?/i;
  const warns=[];
  vals.filter(Boolean).forEach(v=>String(v).split(/\\n+/).forEach(line=>{
    if(rel.test(line)&&!date.test(line)&&!explicitUnknown.test(line))warns.push(`⚠ Referência temporal relativa sem âncora explícita no texto final: "${cleanStr(line).slice(0,160)}". Converter pela data da fonte ou declarar documento sem data.`);
  }));
  return [...new Set(warns)];
}
'''
if temporal_helper not in s:
    if "function runValidations(d,engineWarnings){" not in s:
        raise SystemExit("runValidations marker missing")
    s = s.replace("function runValidations(d,engineWarnings){", temporal_helper + "function runValidations(d,engineWarnings){", 1)

s = s.replace(
    "const warns=[...(engineWarnings||[])];\n  if(d.monitor)",
    "const warns=[...(engineWarnings||[])];\n  warns.push(...collectTemporalAnchoringWarnings(d));\n  const invalidas=asArray(d.outras_infusoes).filter(o=>o&&o.droga&&!isContinuousInfusion(o));\n  if(invalidas.length)warns.push(`⛔ OUTRAS INFUSÕES CONTÍNUAS recebeu regime não contínuo/intermitente (${invalidas.map(o=>o.droga).join(', ')}). Esses itens foram ocultados dessa linha; reclassifique na seção correta.`);\n  if(d.monitor)",
    1,
)
s = s.replace(
    "const insulinaAtiva=hasActiveDrug(d.outras_infusoes,[/insulina/i],'droga') || hasActiveDrug(d.sedacao,[/insulina/i],'droga') || hasActiveDrug(d.dva,[/insulina/i],'droga');",
    "const insulinaAtiva=hasActiveDrug(asArray(d.outras_infusoes).filter(isContinuousInfusion),[/insulina/i],'droga') || hasActiveDrug(d.sedacao,[/insulina/i],'droga') || hasActiveDrug(d.dva,[/insulina/i],'droga');",
)

# WARN-NOT-BLOCK: remover linguagem residual contraditória.
s = s.replace(
    "Existe alerta crítico bloqueante no card de alertas.",
    "Existe alerta crítico no card de alertas; revise antes de usar o documento.",
)
s = s.replace(
    "Existe conflito de estado não resolvido; confirme/corrija os dados antes de copiar.",
    "Existe conflito de estado não resolvido; confirme/corrija os dados antes de usar o documento.",
)

# Interface de teste focada.
old_api = "window.__RECH_TEST_API={ClinicalState,PROVIDER_CFG};"
new_api = "window.__RECH_TEST_API={ClinicalState,PROVIDER_CFG,isContinuousInfusion,normalizeExamsForOutput,compactHemogramResult,formatCompactExam,buildExames,buildExamesCompactos,buildInterconsultas,collectTemporalAnchoringWarnings,buildSystemPrompt};"
if old_api not in s:
    raise SystemExit("test API marker missing")
s = s.replace(old_api, new_api, 1)

required = [
    "function isContinuousInfusion(o)",
    "function normalizeExamsForOutput(exams)",
    "[SEM DATA REGISTRADA]",
    "OUTRAS INFUSÕES CONTÍNUAS: este array é EXCLUSIVAMENTE",
    "HEMOGRAMA — ÚNICA EXCEÇÃO DE SELEÇÃO",
    "conforme documento sem data registrada",
    'Solicitação NÃO é parecer realizado',
]
for item in required:
    if item not in s:
        raise SystemExit("missing required patch: " + item)
if s == original:
    raise SystemExit("no changes applied")

p.write_text(s, encoding="utf-8")

Path("reports/P0_CLINICAL_RULES_2026-08-16.md").write_text(
    """# RechDocs v3.4.1 — P0 clinical rules — 2026-08-16

Implementação baseada nas decisões funcionais confirmadas nesta rodada.

## Regras aplicadas
- Ventilação: preservado o fix já existente de fronteira por episódio; reintubação não herda parâmetros antigos.
- Pendências: WARN-NOT-BLOCK preservado; edição/cópia/impressão livres com aviso crítico persistente.
- Temporalidade: hoje/ontem/amanhã e intervalos relativos usam a data da fonte; sem data da fonte, a ausência da âncora deve ser declarada explicitamente e nenhuma data é inventada.
- Outras infusões contínuas: somente regime realmente contínuo. BIC/bomba isoladamente não qualifica. Administração 6/6h, 8/8h, 12/12h, 24/24h ou com duração finita é intermitente.
- Laboratórios: apenas HMG tem filtro específico (Hb/Ht/Leuco/Plaq). Todos os demais exames são preservados.
- Unidades: preservadas no estado estruturado, omitidas da apresentação quando redundantes.
- Exames: qualquer exame deve ser extraído; desconhecidos usam tipo `outro`; temporalidade individual preservada.
- Interconsultas: solicitação não equivale a parecer realizado; status ampliados; ausência de data fica explícita no documento.

## Não alterado
- Baseline `baseline/rech_docs_v3_3_12_P1.html` permanece intocada.
- Não houve reescrita do `ClinicalState` nem criação de parser paralelo.
""",
    encoding="utf-8",
)

print("P0 patch applied")
