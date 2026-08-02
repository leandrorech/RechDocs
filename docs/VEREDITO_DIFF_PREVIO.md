# RechDocs — Diff Funcional e Veredito
**Data:** 15/07/2026 · 5 candidatos comparados por hash + diff de conteúdo real

---

## Candidatos analisados

| Arquivo | Tamanho | Linhas | Versão interna declarada |
|---|---|---|---|
| `rech_docs_v3_3_2.html` | 136.915 B | 1.860 | **v3.3.1** (mismatch nome/interno já conhecido) |
| `rech_docs_v3__3_.html` | 85.954 B | 1.372 | (sem marcador — mais simples, 63 funções) |
| `RECH_Docs_v3_4_prototipo_corrigido.html` | 112.932 B | 1.727 | (sem marcador, 82 funções) |
| `rech_docs_v3_3_4.html` | 137.007 B | 2.348 | v3.3.4 |
| `rech_docs_v3.3.5.html` (do zip mestre 14/07) | 140.401 B | 2.387 | **v3.3.5** |

---

## Linhagem reconstruída

```
v3_3_2 (interno "v3.3.1", 83 funções, tem fInterconsultas/fControleItem)
   │
   │  [~1000 linhas de mudança — reescrita significativa]
   ▼
v3_3_4 (2348 linhas, 85 funções — perdeu fInterconsultas/fControleItem)
   │
   │  [87 linhas — fix incremental limpo e documentado]
   ▼
v3.3.5 (2387 linhas, 86 funções — CANDIDATO CANÔNICO)

Branches paralelas, não integradas a v3.3.5:
- RECH_Docs_v3_4_prototipo_corrigido (82 funções — subconjunto estrito de v3.3.5,
  faltam controleCompletenessScore, normalizeControleKey, renderMonitorLine, updateGenButtonState)
- rech_docs_v3__3_ (63 funções — mais simples, provavelmente ancestral mais antigo)
```

---

## Veredito: **`rech_docs_v3.3.5.html` é o canônico**

### Por quê
1. **v3.3.5 é evolução direta e limpa de v3.3.4** (só 87 linhas de diff, cada mudança comentada no próprio código explicando o bug corrigido):
   - Corrige condição de corrida no upload de PDF (permitia gerar documento com conversão incompleta)
   - Introduz status `'indeterminado'` para menções vagas/condicionais ("considerar", "avaliar") — **antes, essas viravam "ativo" por padrão**, risco clínico real (fármaco cogitado virava fármaco em uso)
   - Corrige bug de precedência: comparação usava status já normalizado nos dois lados, fazendo a regra "ação explícita vence menção passiva" nunca disparar de fato

2. **v3.3.5 é superset funcional de `v3_4_prototipo_corrigido`** — toda função do protótipo existe em v3.3.5, mas v3.3.5 tem 4 funções a mais (`controleCompletenessScore`, `normalizeControleKey`, `renderMonitorLine`, `updateGenButtonState`). O protótipo é um branch mais pobre, não mais avançado.

3. **`rech_docs_v3__3_.html`** (63 funções) não tem nenhuma função ausente em v3.3.5 — é estritamente mais simples, sem risco de perda ao descartar.

### ⚠️ Regressão real identificada — precisa de decisão sua
`rech_docs_v3_3_2.html` tem **duas funções que desapareceram e nunca voltaram**:
- `fInterconsultas(list)` — processava campo de interconsultas
- `fControleItem(item)` — função de suporte relacionada

Na linhagem atual (v3.3.4 em diante), só sobrou a entrada de dicionário `"INTERC":"Interconsulta"` — a abreviação é reconhecida no texto, mas **o processamento estruturado de interconsultas como campo próprio do documento foi perdido** em algum ponto entre v3.3.2 e v3.3.4.

**Isso é clinicamente relevante?** Preciso que você confirme: interconsultas era um campo que você usava ativamente na v3.3.2, ou foi removido de propósito porque não fazia sentido mais? Se era usado, essa função precisa ser recuperada e reintegrada em v3.3.5 antes de promovê-la a canônico definitivo.

---

## Próximos passos (aguardando você)
1. **Confirmar**: recuperar `fInterconsultas`/`fControleItem` de v3.3.2 e portar para v3.3.5, ou descartar de vez (foi removido intencionalmente)?
2. Depois disso: promover v3.3.5 (com ou sem o fix de interconsultas) a canônico definitivo
3. Integrar a spec de handoff v1.0 (`RechDocs_spec_passagem_plantao_v1.md`) — ainda não implementada em nenhuma versão
4. Arquivar `v3_3_2`, `v3__3_`, `v3_4_prototipo_corrigido`, `formatador_prontuario_uti` como histórico (`archive/`)
