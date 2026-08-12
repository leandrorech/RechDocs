# Revalidação P0 — candidato atual (RechDocs v3.4.1)

**Data:** 2026-08-12
**Harness:** Playwright + Chromium headless (`/opt/pw-browsers/chromium`), executando `new ClinicalState(raw, modo, DEFAULT_DICT).resolve()` diretamente no contexto real de cada arquivo `.html`, sem extração de lógica para módulo separado. Ver `tests/characterization/README.md` para a decisão de arquitetura.
**Specs:** `tests/characterization/harness/p0_01_vent_episode_leak.spec.mjs`, `p0_02_vm_extubation_conflict.spec.mjs`, `p0_03_copy_override_policy.spec.mjs`.
**Runner:** `tests/characterization/harness/run-p0.mjs` (resultado bruto em `tests/characterization/reports/p0_run_result.json`).

## Por que este relatório existe

`reports/RECHDOCS_ANALISE_COMPLETA_2026-08-02.md` documentou os achados P0-01/P0-02/P0-03 contra um `RechDocs_v3.4.1.html` de **216.381 bytes** (SHA-256 `c57b9e01cbcead0d8878f3c28d79c007c2bfec91fff272d04af39ebe25e1e2e0`). O candidato atual no repositório é **outro arquivo**:

| Artefato | Caminho | Bytes | SHA-256 |
|---|---|---|---|
| Baseline (congelada) | `baseline/rech_docs_v3_3_12_P1.html` | 205.250 | `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667` |
| Referência v3.4.0 | `reference/RechDocs_v3.4.0_reference.html` | 187.738 | `6c8e823bae12d3bfd9c577375adaf888f19f1babac35f1c04ee67534c3dd0073` |
| **Candidato atual** | `output/RechDocs_v3.4.1.html` | **220.845** | **`f8bf499b1b8483f80457afdb32248ee7411abce54c0cc2c4ca30fd4b832814fa`** |

Baseline e referência batem exatamente com os hashes do relatório de 02/08 — são comparáveis. **O candidato não bate** — portanto os resultados P0 daquele relatório para a "candidata" são evidência histórica, não evidência do arquivo atual. Este documento reexecuta os três casos contra o artefato atual e registra o que foi de fato observado agora.

## Matriz de resultados

| Caso | Baseline | Referência v3.4.0 | Candidata atual | Classificação |
|---|---|---|---|---|
| P0-01 — vazamento de parâmetros ventilatórios entre episódios | **FAIL** | PASS | **FAIL** | Ver análise abaixo |
| P0-02a — empate simétrico ("intubado" × "extubado", controle) | PASS | PASS | PASS | EXPECTED_CHANGE (mecanismo funciona) |
| P0-02b — empate assimétrico ("VM ativa" × "extubado") | **FAIL** | **FAIL** | **FAIL** | Ver análise abaixo |
| P0-03 — política de cópia com override auditável | **FAIL** | **FAIL** | **FAIL** | EXPECTED_CHANGE (política não implementada em nenhum artefato) |

## P0-01 — vazamento de parâmetros ventilatórios entre episódios

**Fixture:** intubado VCV/PEEP 8/VC 420 em 01/07 → extubado em 02/07 → reintubado PCV/FiO2 40 em 03/07, sem PEEP/VC novos.
**Esperado:** episódio novo com PCV/FiO2 40, sem herdar PEEP 8/VC 420.

**Observado:**
- Baseline: `{"modo":"PCV","fio2":"40","peep":"8","vc_ml":"420"}` — PEEP e VC do episódio encerrado vazaram. **FAIL.**
- Referência: episódio novo limpo, sem PEEP/VC herdados. **PASS.**
- Candidata atual: mesmo resultado da baseline — PEEP e VC vazaram. **FAIL.**

**Mecanismo confirmado por leitura de código:** a referência contém um comentário explícito `// fix P0-06 (26/07/2026)` em `resolveVentilatorio()` (linha ~1581) que ordena os eventos cronologicamente e restringe os candidatos de cada campo ao **episódio vigente** (eventos estritamente posteriores à última extubação/retirada). A baseline e a candidata atual resolvem cada campo por precedência entre **todos** os eventos do array inteiro, sem noção de episódio — exatamente o bug que a referência corrigiu.

**Classificação:** o bug bloqueante existe identicamente em baseline e candidata → **não é uma regressão introduzida pela consolidação v3.4.1** (nada piorou), mas confirma que **o fix de episódio ventilatório da referência (fix P0-06) nunca foi portado** para a linha 3.3.12-P1/3.4.1, apesar de `reports/IMPLEMENTATION_PLAN.md` (Etapa 4) e `reports/REGRESSION_RISKS.md` (R-02) já preverem esse port como obrigatório. Bloqueante, confirmado reproduzível agora.

## P0-02 — empate ventilatório sem conflito bloqueante

Duas sub-variantes, porque a reprodução literal do cenário original revelou uma divergência que precisa ficar registrada, não escondida:

### P0-02a (controle) — formulação simétrica

Mesma fixture citada no relatório de origem: "intubado" × "extubado", mesma data/hora/ordem. **Resultado: PASS nos três artefatos** — todos geram o conflito ventilatório corretamente. Isso **não reproduz** a alegação original de que a baseline falha aqui. Hipótese mais provável: o relatório de 02/08 usou uma formulação diferente da que consta em sua própria descrição textual, ou testou por outro caminho (ex.: via `test_rechdocs_v340.mjs`, que não está disponível para inspeção — nunca foi commitado, buscado em todo o histórico git sem sucesso). Sem esse arquivo, não é possível reconciliar a diferença — fica **UNRESOLVED quanto à causa da divergência**, mas o comportamento atual em si está bem estabelecido: nos três artefatos, o mecanismo de empate correto funciona para redações simétricas.

### P0-02b (achado novo) — formulação assimétrica

Fixture: "VM ativa" × "extubado", mesma data/hora/ordem. **Resultado: FAIL nos três artefatos** (baseline, referência e candidata) — nenhum conflito é registrado; o motor resolve silenciosamente a favor de "extubado" (estado ventilatório fica vazio).

**Mecanismo confirmado por leitura de código:** `comparaPrecedencia()` (idêntica em baseline e referência nesse trecho) desempata por "ação executada" usando `EXECUTED_VERBS`, uma lista de radicais (`'intubad'`, `'extubad'`, etc.). "Extubado" bate no radical `extubad`; "VM ativa" não bate em nenhum radical da lista. Isso quebra a simetria da comparação **antes** de ela chegar ao critério de ordem/empate real — o lado que bate em `EXECUTED_VERBS` vence deterministicamente, mesmo quando semanticamente as duas menções são mutuamente exclusivas e deveriam gerar conflito.

**Classificação:** bug bloqueante **não documentado em nenhum relatório anterior**, presente identicamente nos três artefatos, incluindo a referência que corrige o P0-01. Não é regressão da candidata (comportamento idêntico à baseline e à referência) — é uma lacuna pré-existente na lógica de desempate por verbo, que se manifesta sempre que a fonte documental usa uma formulação de estado ativo que não contém um dos radicais de `EXECUTED_VERBS` (ex.: "VM ativa", "em ventilação mecânica", "suporte ventilatório mantido" — nenhum desses bate em `intubad`).

## P0-03 — política de cópia com override auditável

**Verificado:** presença de mecanismo de bloqueio (`COPY_BLOCKED`/`setCopyBlocked`) e de qualquer afordância dedicada de override ("Copiar mesmo assim" ou equivalente, distinta do fluxo de confirmação de envio de PHI à API).

- Baseline: tem bloqueio absoluto (`COPY_BLOCKED`), sem nenhum override. **FAIL** (falta regra 4/5).
- Referência: **não tem nenhum mecanismo de bloqueio** — `copiar()` sempre copia, sem checar pendências. **FAIL** (falta regra 1/2/3 inteiras — pior que a baseline nesse quesito específico, confirma R-01 de `REGRESSION_RISKS.md`).
- Candidata atual: mesmo estado da baseline — bloqueio absoluto, sem override. **FAIL.**

**Classificação:** `EXPECTED_CHANGE` — não é um bug comportamental, é uma política de produto ainda não implementada em nenhum artefato. Não deve ser tratado como regressão nem como "UI quebrada"; é trabalho de implementação pendente, com a regra já especificada (alertar → confirmar → permitir override → registrar).

## Resumo para reconciliação dos relatórios oficiais

Isto ainda não foi propagado para `reports/REGRESSION_RISKS.md`, `reports/CHANGE_IMPACT.md` ou `reports/TEST_RESULTS.md` — por decisão explícita, a reconciliação só acontece depois deste registro de evidência. Pontos que a reconciliação precisará endereçar:

1. **R-02** (`REGRESSION_RISKS.md`) já previa o mecanismo de P0-01; agora há confirmação reproduzível de que o bug persiste na candidata atual, com causa raiz identificada (`resolveVentilatorio` sem noção de episódio) e uma correção de referência disponível para port seletivo (fix P0-06 da v3.4.0).
2. **P0-02b é um risco novo**, sem ID em `REGRESSION_RISKS.md` — precisa de um ID novo (sugestão: R-17) antes da reconciliação, já que não é coberto por nenhum dos R-01–R-16 existentes.
3. **P0-02a vs. relatório de 02/08** — divergência não resolvida quanto à causa; registrar como nota metodológica, não como contradição a "corrigir" silenciosamente.
4. **P0-03** precisa de entrada própria em `CHANGE_IMPACT.md` como funcionalidade a implementar (política de override), não como correção de bug.
5. **Nenhum destes três casos ainda cobre** os demais itens do "Gate mínimo para RC clínica" listados no relatório de 02/08 — este documento valida apenas P0-01/P0-02/P0-03, não substitui a suíte completa de characterization.

## Erros de execução

Nenhum `pageerror`/`console.error` foi observado em nenhuma das 9 execuções (3 casos × 3 artefatos). Ver `tests/characterization/reports/p0_run_result.json` para o payload bruto completo, incluindo estados ventilatórios e listas de conflitos por artefato.
