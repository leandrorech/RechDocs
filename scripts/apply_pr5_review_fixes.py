from pathlib import Path
import re

p = Path('output/RechDocs_v3.4.1.html')
s = p.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {n}')
    s = s.replace(old, new, 1)

# 1) Exames: deduplicar somente evento exato; hora e unidade fazem parte da identidade temporal.
replace_once(
    "      const dedupeKey=keyName(e.nome)+'|'+cleanStr(e.data)+'|'+keyName(e.resultado||'');",
    "      const dedupeKey=JSON.stringify([keyName(e.nome),cleanStr(e.resultado),keyName(e.unidade||''),cleanStr(e.data),cleanStr(e.hora)]);",
    'exam ClinicalState dedupe key'
)

# 2) Interconsultas: duas avaliações no mesmo dia não podem colapsar se hora/conteúdo diferirem.
replace_once(
    "      const dedupeKey=keyName(i.especialidade)+'|'+cleanStr(i.data)+'|'+keyName(i.status||'');",
    "      const dedupeKey=JSON.stringify([keyName(i.especialidade),cleanStr(i.data),cleanStr(i.hora),keyName(i.status||''),keyName(i.motivo||''),keyName(i.parecer||'')]);",
    'interconsult ClinicalState dedupe key'
)

# 3) Temporalidade: ampliar o detector para expressões relativas já cobertas pelo contrato do prompt.
old_rel = "  const rel=/\\b(?:hoje|ontem|amanh[aã]|h[aá]\\s+(?:cerca\\s+de\\s+|aproximadamente\\s+)?\\d+\\s+(?:dia|dias|semana|semanas|m[eê]s|meses|hora|horas))\\b/i;"
new_rel = "  const rel=/\\b(?:hoje|ontem|amanh[aã]|semana\\s+passada|m[eê]s\\s+passado|ano\\s+passado|h[aá]\\s+(?:cerca\\s+de\\s+|aproximadamente\\s+)?(?:\\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta)\\s+(?:dia|dias|semana|semanas|m[eê]s|meses|hora|horas)|(?:\\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|quinze|vinte|trinta)\\s+(?:dia|dias|semana|semanas|m[eê]s|meses|hora|horas)\\s+atr[aá]s)\\b/i;"
replace_once(old_rel, new_rel, 'relative temporal detector')

# 4) Infusão contínua: negação explícita/intermitência prevalece sobre a palavra "contínuo" ou taxa.
old_raw = "  const raw=[o.droga,o.dose,o.unidade,o.regime,o.detalhe].map(cleanStr).filter(Boolean).join(' ');\n  // BIC/bomba isoladamente NÃO define continuidade. Esquema de horário ou duração finita é intermitente."
new_raw = "  const raw=[o.droga,o.dose,o.unidade,o.regime,o.detalhe].map(cleanStr).filter(Boolean).join(' ');\n  const explicitIntermittent=/\\bintermitente\\b/i.test(raw)\n    || /\\bn[aã]o\\s+(?:[eé]\\s+)?(?:uma\\s+)?(?:infus[aã]o\\s+)?cont[ií]nu[oa]\\b/i.test(raw)\n    || /\\bn[aã]o\\s+(?:manter\\s+)?continuamente\\b/i.test(raw);\n  if(explicitIntermittent)return false;\n  // BIC/bomba isoladamente NÃO define continuidade. Esquema de horário ou duração finita é intermitente."
replace_once(old_raw, new_raw, 'continuous infusion negation')

# 5) Array.map passa (elemento, índice, array): nunca usar formatCompactExam diretamente após ganhar 2º argumento.
replace_once(
    ".map(t=>`${labels[t]} [${date}]: ${byType[t].map(formatCompactExam).join(' | ')}`);",
    ".map(t=>`${labels[t]} [${date}]: ${byType[t].map(e=>formatCompactExam(e)).join(' | ')}`);",
    'compact exam callback'
)

# Sanity checks.
required = [
    "cleanStr(e.hora)",
    "cleanStr(i.hora)",
    "semana\\s+passada",
    "explicitIntermittent",
    "map(e=>formatCompactExam(e))",
]
for token in required:
    if token not in s:
        raise SystemExit(f'missing post-patch token: {token}')

p.write_text(s, encoding='utf-8')
print('PR5 review fixes applied')
