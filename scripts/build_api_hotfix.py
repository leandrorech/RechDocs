from pathlib import Path
import re

SRC = Path('output/RechDocs_v3.4.1.html')
DST = Path('output/RechDocs_v3.4.1_API_HOTFIX.html')

if not SRC.exists():
    raise SystemExit(f'Arquivo fonte não encontrado: {SRC}')

text = SRC.read_text(encoding='utf-8')
original = text

# Identificação visual do artefato de uso imediato, sem alterar a baseline nem o output original.
text = text.replace('<title>RECH Docs v3.4.1</title>', '<title>RECH Docs v3.4.1 API HOTFIX</title>', 1)

# OpenAI: preservar Luna/Sol e acrescentar Terra como opção intermediária.
old_models = "models:[{v:'gpt-5.6-luna',l:'gpt-5.6-luna (rápido/barato)'},{v:'gpt-5.6-sol',l:'gpt-5.6-sol (mais capaz)'}]"
new_models = "models:[{v:'gpt-5.6-luna',l:'gpt-5.6-luna (rápido/barato)'},{v:'gpt-5.6-terra',l:'gpt-5.6-terra (equilíbrio)'},{v:'gpt-5.6-sol',l:'gpt-5.6-sol (mais capaz)'}]"
if old_models not in text:
    raise SystemExit('Bloco de modelos OpenAI esperado não foi encontrado; abortando para evitar patch silencioso.')
text = text.replace(old_models, new_models, 1)

old_comment = "// Família atual (GA desde 09/07/2026): gpt-5.6-luna (rápido/barato) e gpt-5.6-sol (flagship,\n    // alias 'gpt-5.6' aponta para Sol). gpt-5.6-terra fica como meio-termo não usado aqui para\n    // manter o padrão de 2 opções do restante do arquivo."
new_comment = "// Família GPT-5.6: Luna (rápido/barato), Terra (equilíbrio) e Sol (mais capaz).\n    // Terra foi incluído no hotfix para permitir escolha intermediária sem alterar o pipeline clínico."
text = text.replace(old_comment, new_comment, 1)

# Remover ANTITROMBÓTICOS como seção dedicada da ADMISSÃO.
adm_block = "\nANTITROMBÓTICOS EM USO:\n${fAntitromboticosEmUso(d.antitromboticos)}\n"
if adm_block not in text:
    raise SystemExit('Seção ANTITROMBÓTICOS da admissão não encontrada; abortando.')
text = text.replace(adm_block, '\n', 1)

# Remover ANTITROMBÓTICOS como seção dedicada da EVOLUÇÃO (em uso + prévios/suspensos).
evo_block = "\nANTITROMBÓTICOS EM USO:\n${fAntitromboticosEmUso(d.antitromboticos)}\n\nANTITROMBÓTICOS PRÉVIOS/SUSPENSOS:\n${fATBUtilizados(d.antitromboticos)}\n"
if evo_block not in text:
    raise SystemExit('Seções ANTITROMBÓTICOS da evolução não encontradas; abortando.')
text = text.replace(evo_block, '\n', 1)

# Não usar antitrombóticos como alvo de supressão de CONDUTAS agora que não há seção própria.
old_struct = "      const activeAntitromb=asArray(d.antitromboticos).filter(a=>a.status==='em_uso').map(a=>keyName(a.nome||''));\n      structuredTargets=[...activeDVA,...activeATB,...activeSed,...activeDev,...activeAntitromb].filter(x=>x.length>2);"
new_struct = "      structuredTargets=[...activeDVA,...activeATB,...activeSed,...activeDev].filter(x=>x.length>2);"
if old_struct not in text:
    raise SystemExit('Bloco structuredTargets com antitrombóticos não encontrado; abortando.')
text = text.replace(old_struct, new_struct, 1)

# Atualizar comentário correspondente para refletir o comportamento real.
text = text.replace(
    '// Em Emergência (após simplificação do template), ATB/DVA/sedação/antitromboticos/dispositivos\n    // NÃO têm seção própria de exibição — suprimir uma conduta que os menciona apagaria essa\n    // informação do documento inteiro, não só de uma seção redundante. Por isso, nesse modo,\n    // structuredTargets fica vazio: nada é suprimido, CONDUTAS vira a única fonte dessas menções.',
    '// Antitrombóticos não possuem mais seção dedicada neste hotfix; portanto nunca são usados como\n    // alvo de supressão de CONDUTAS. Em Emergência, ATB/DVA/sedação/dispositivos também não têm\n    // seção própria, então structuredTargets permanece vazio nesse modo.',
    1
)

# A validação de texto histórico não precisa remover bloco de antitrombótico, pois ele não será renderizado.
text = text.replace(
    "  [fATBUtilizados(state.atb), fATBUtilizados(state.antitromboticos)].forEach(bloco=>{",
    "  [fATBUtilizados(state.atb)].forEach(bloco=>{",
    1
)

# Guardrails do hotfix.
assert 'gpt-5.6-terra' in text
assert 'ANTITROMBÓTICOS EM USO:' not in text
assert 'ANTITROMBÓTICOS PRÉVIOS/SUSPENSOS:' not in text
assert "structuredTargets=[...activeDVA,...activeATB,...activeSed,...activeDev].filter" in text
assert SRC.read_text(encoding='utf-8') == original

# Sanidade estática: verificar IDs apenas na marcação HTML anterior ao primeiro <script>.
# Isso evita confundir strings/atribuições JS dinâmicas (ex.: id='i'+Date.now()) com IDs DOM literais.
static_html = text.split('<script', 1)[0]
ids = re.findall(r'\bid=[\"\']([^\"\']+)[\"\']', static_html)
dup_ids = sorted({x for x in ids if ids.count(x) > 1})
if dup_ids:
    raise SystemExit('IDs HTML estáticos duplicados após hotfix: ' + ', '.join(dup_ids))

DST.write_text(text, encoding='utf-8')
print(f'OK: {DST} gerado ({len(text)} bytes).')
print('OpenAI: Luna + Terra + Sol.')
print('ANTITROMBÓTICOS: removidos como seção dedicada; conteúdo clínico permanece disponível em MUC/profilaxias/condutas.')
