from pathlib import Path
import re

p = Path('output/RechDocs_v3.4.1.html')
s = p.read_text(encoding='utf-8')

old = """function formatCompactExam(e){
  const result=examResultForOutput(e);
  return `${cleanStr(e.nome)}${result?`: ${result}`:''}`;
}"""
new = """function unitConflictNames(exams){
  const byName=new Map();
  asArray(exams).forEach(e=>{
    const name=keyName(e&&e.nome), unit=cleanStr(e&&e.unidade);
    if(!name||!unit)return;
    if(!byName.has(name))byName.set(name,new Set());
    byName.get(name).add(keyName(unit));
  });
  return new Set([...byName.entries()].filter(([,units])=>units.size>1).map(([name])=>name));
}
function formatCompactExam(e,showUnit=false){
  let result=examResultForOutput(e);
  const unit=cleanStr(e&&e.unidade);
  if(showUnit&&unit)result=result?`${result} ${unit}`:unit;
  return `${cleanStr(e.nome)}${result?`: ${result}`:''}`;
}"""
if old not in s:
    raise SystemExit('formatCompactExam patched block not found')
s = s.replace(old, new, 1)

old = """  const exArr=sortAndDedupeExams(normalizeExamsForOutput(d.exames));
  if(exArr.length){"""
new = """  const exArr=sortAndDedupeExams(normalizeExamsForOutput(d.exames));
  const unitConflicts=unitConflictNames(exArr);
  if(exArr.length){"""
if old not in s:
    raise SystemExit('buildExames unit marker not found')
s = s.replace(old, new, 1)

old = """        const result=examResultForOutput(e); if(result)row+=`: ${result}`;
        lines.push(row);"""
new = """        let result=examResultForOutput(e);
        const unit=cleanStr(e.unidade);
        if(unitConflicts.has(keyName(e.nome))&&unit)result=result?`${result} ${unit}`:unit;
        if(result)row+=`: ${result}`;
        lines.push(row);"""
if old not in s:
    raise SystemExit('buildExames result marker not found')
s = s.replace(old, new, 1)

# buildExamesCompactos() has had small layout/indent changes across revisions.
pattern = r'(?m)^(?P<indent>\s*)const exams=sortAndDedupeExams\(normalizeExamsForOutput\(d&&d\.exames\)\);\s*$'
m = re.search(pattern, s)
if not m:
    raise SystemExit('compact normalized exam list marker not found')
indent = m.group('indent')
replacement = m.group(0) + '\n' + indent + 'const unitConflicts=unitConflictNames(exams);'
s = s[:m.start()] + replacement + s[m.end():]

# Any remaining call formatCompactExam(e) inside the compact renderer gets the conflict flag.
s, n = re.subn(
    r'formatCompactExam\(e\)',
    'formatCompactExam(e,unitConflicts.has(keyName(e.nome)))',
    s,
)
if n < 1:
    raise SystemExit('compact formatter call not found')

# Export helper for focused tests without changing product behavior.
old = 'window.__RECH_TEST_API={ClinicalState,PROVIDER_CFG,isContinuousInfusion,normalizeExamsForOutput,compactHemogramResult,formatCompactExam,buildExames,buildExamesCompactos,buildInterconsultas,collectTemporalAnchoringWarnings,buildSystemPrompt};'
new = 'window.__RECH_TEST_API={ClinicalState,PROVIDER_CFG,isContinuousInfusion,normalizeExamsForOutput,compactHemogramResult,unitConflictNames,formatCompactExam,buildExames,buildExamesCompactos,buildInterconsultas,collectTemporalAnchoringWarnings,buildSystemPrompt};'
if old in s:
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('unit conflict safeguard applied')
