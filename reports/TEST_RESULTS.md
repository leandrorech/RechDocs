# Resultados de teste — RechDocs v3.4.1

> Registrar todo comando executado, resultado, falha e limitação, conforme regra 9 de `AGENTS.md`.
> Não declarar sucesso quando houver teste não executado ou dependência indisponível (regra 10).

**Última execução:** 2026-08-15 (RELEASE GATE — reexecutado após a revisão do contrato de cópia)
**Branch:** `claude/github-app-install-aft7xw`
**Candidata:** `output/RechDocs_v3.4.1.html` — 232.640 bytes, SHA-256 `0a6bea778e7edddca5fa693d344986c87fd4068cd5bca97948f6a563d8df058d`
**Baseline (congelada, não modificada):** SHA-256 `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667`
**Referência (não modificada):** SHA-256 `6c8e823bae12d3bfd9c577375adaf888f19f1babac35f1c04ee67534c3dd0073`

## Auditoria estática

Comando: `python3 tests/static_audit.py <arquivo>`

| Arquivo alvo | Resultado |
|---|---|
| `baseline/rech_docs_v3_3_12_P1.html` | PASSOU (60 IDs, 0 duplicados, 1 script inline, JS válido) |
| `reference/RechDocs_v3.4.0_reference.html` | PASSOU (60 IDs, 0 duplicados, 1 script inline, JS válido) |
| `output/RechDocs_v3.4.1.html` | PASSOU (**68 IDs**, 0 duplicados, 1 script inline, JS válido) |

68 IDs = 65 originais + `#critical-banner`, `#critical-banner-list`, `#copy-warn`. O ID
`#btn-copiar-mesmo-assim` foi **removido** junto com o contrato de override.

## Validação sintática de JavaScript

`node --check` sobre cada `.mjs` do harness e sobre o JS inline extraído de cada HTML.

| Alvo | Resultado |
|---|---|
| 9 arquivos `.mjs` em `tests/characterization/` | todos OK |
| JS inline da candidata (1 script, 194.455 chars) | OK |
| JS inline da baseline (1 script, 172.580 chars) | OK |
| JS inline da referência (1 script, 155.758 chars) | OK |

## Suíte de characterization

Comando: `node tests/characterization/harness/run-characterization.mjs`
Harness: Playwright + Chromium headless, `BrowserContext` isolado por (fixture × artefato), timezone `America/Sao_Paulo`, locale `pt-BR`. Nenhuma chamada de rede real: a fixture E2E intercepta o `fetch` ao provedor via `page.route()` e responde com payload sintético; qualquer host não previsto é abortado.
Resultado bruto completo: `tests/characterization/reports/characterization_run_result.json`

| Fixture | baseline | reference | candidata |
|---|---|---|---|
| P0-01 — vazamento de parâmetros ventilatórios entre episódios | FAIL | PASS | **PASS** |
| P0-02a — empate simétrico intubado × extubado | PASS | PASS | **PASS** |
| P0-02b — empate assimétrico "VM ativa" × extubado (R-17) | FAIL | FAIL | **PASS** |
| P0-03 — alerta crítico visível, saída sempre liberada | N/A | N/A | **PASS** |
| CI-05 — compactação cumulativa de exames | N/A | FAIL (contrato incompatível) | **PASS** (6/6) |
| E2E-01 — fluxo real de UI ponta a ponta | N/A | N/A | **PASS** (11/11) |

baseline e referência ficam `N/A` em P0-03/E2E-01 por não possuírem o mecanismo de alerta crítico
desta versão — a baseline tinha bloqueio absoluto e a referência não tinha nem bloqueio nem
sinalização; nenhuma das duas atende ao contrato vigente.

### Detalhe P0-03 — política de saída (contrato vigente: sinalização máxima, sem bloqueio)

| Critério | Resultado | Evidência observada |
|---|---|---|
| 1. Banner crítico visível com pendência | PASS | `class="critical-banner show"`, título *"⚠ Atenção — existem inconsistências/pendências críticas…"* |
| 2. Lista concreta das pendências | PASS | `□ Pendencia critica sintetica A.` / `□ …B.` |
| 3. "Copiar tudo" habilitado | PASS | `copyButtonDisabled=false` **com pendência ativa** |
| 3b. Aviso junto aos botões | PASS | `#copy-warn` visível |
| 4. Impressão/PDF funcional | PASS | sem exceção; `window.print()` chamado 1× |
| 5. Edição não remove o alerta | PASS | após `input`: banner visível, alerta ativo, cópia funcional |
| 6. Cópia com alerta, sem confirmação | PASS | 1 escrita, `confirm()` chamado **0×** |
| 7. Audit log da saída com alerta | PASS | `⚠ Cópia realizada em 2026-08-15T23:39:52.287Z COM ALERTA CRÍTICO ATIVO — …` e linha equivalente para Impressão/PDF |
| 8. Sem mecanismo de bloqueio a contornar | PASS | `legacySymbols=[]`, `noBlockingMechanism=true` |
| Controle: sem pendência | PASS | banner ausente, aviso ausente, cópia funcional |

### Detalhe E2E-01 — 11 cenários de fluxo real de UI

Dados 100% sintéticos/desidentificados (`PACIENTE TESTE E2E`, leito fictício). Nenhuma chave real; nenhuma requisição sai da máquina.

| Cenário | Resultado | Evidência observada |
|---|---|---|
| 1. Geração normal pela UI (`#btn-gen`) | PASS | `output-card` visível |
| 2. Preview renderizado | PASS | conteúdo clínico no `output-body` |
| 3. Geração sem pendência → sem alerta | PASS | alerta `false`, banner ausente, botão habilitado |
| 4. Copiar sem pendência | PASS | 1 escrita |
| 5. Pendência crítica → banner + lista + aviso, **sem bloqueio** | PASS | banner visível, botão `disabled=false` |
| 6. Cópia com alerta ativo, sem confirmação | PASS | 1 escrita, `confirm()` 0× |
| 7. Audit log registra a saída com alerta | PASS | linha com timestamp ISO + pendência; alerta permanece ativo após a cópia |
| 8. Edição manual não remove o alerta (R-01/R-07) | PASS | após `input`: alerta `true`, banner `true`, aviso `true`, cópia funcional; idem no `prefill-editor` com pendência de reconciliação |
| 9. Segunda cópia continua funcionando | PASS | 1 escrita, alerta ainda ativo |
| 10. Impressão/PDF com alerta | PASS | sem exceção, `print()` 1×, registrada no audit log |
| 11. Reiniciar sessão limpa estado/audit | PASS | output vazio, audit vazio, alerta `false`, banner ausente, `CRITICAL_OUTPUT_LOG.length=0` |

Erros de página (exceção JS não tratada) durante todo o fluxo: **nenhum**. Erros de console: **nenhum**.

## R-01 / R-07 — RESOLVIDO por decisão de contrato

O bloqueador identificado na primeira passagem do gate (listener global de `input` chamando
`setCopyBlocked(false)` a cada digitação) **deixou de existir como bypass**: por decisão do produto de
2026-08-15, o RechDocs não bloqueia mais cópia nem impressão em nenhuma circunstância. Sem bloqueio,
não há o que contornar.

O requisito remanescente — **a edição manual não pode apagar a sinalização crítica** — foi
implementado e verificado dinamicamente:

| Cenário | Antes da edição | Depois de 1 evento `input` |
|---|---|---|
| Alerta ativo no preview | banner visível, `CRITICAL_ALERT_ACTIVE=true` | **banner visível, alerta `true`**, cópia funcional |
| Pré-evolução com pendência de reconciliação | banner visível, alerta `true` | **banner visível, alerta `true`** |

A fixture P0-03 também verifica que os símbolos do contrato antigo (`setCopyBlocked()`,
`copiarComOverride()`, `COPY_BLOCKED`, `#btn-copiar-mesmo-assim`) não reapareceram: `legacySymbols=[]`,
`noBlockingMechanism=true`.

## Limitações conhecidas desta execução

- Cobertura clínica ainda parcial: as fixtures cobrem P0-01, P0-02a/b, P0-03, CI-05 e o fluxo de UI. Os riscos **R-03, R-04, R-06, R-08 a R-16** de `REGRESSION_RISKS.md` continuam **sem teste dedicado**.
- Nenhuma chamada real a provedor de IA foi feita; os adaptadores (`callAnthropic`/`callOpenAI`/`callGemini`/`callDeepSeek`/`callQwen`) **não foram testados contra APIs reais** — apenas o caminho de resposta bem-sucedida da Anthropic foi exercitado via stub.
- Não executados: teste cross-browser (apenas Chromium), impressão física, conversão real de PDF, pentest dinâmico, validação institucional/LGPD.
- As suítes `baseline.characterization.cjs` / `baseline.clinical.cjs` e os "37 testes históricos" citados em `IMPLEMENTATION_PLAN.md` continuam **inexistentes no repositório**; a suíte atual foi construída do zero e não é migração daquelas.
