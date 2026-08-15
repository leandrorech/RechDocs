# Resultados de teste — RechDocs v3.4.1

> Registrar todo comando executado, resultado, falha e limitação, conforme regra 9 de `AGENTS.md`.
> Não declarar sucesso quando houver teste não executado ou dependência indisponível (regra 10).

**Última execução:** 2026-08-15 (RELEASE GATE)
**Branch:** `claude/github-app-install-aft7xw`
**HEAD no momento da execução:** `53d7378c6e33a4aa97def565632b429de4825a92`
**Candidata:** `output/RechDocs_v3.4.1.html` — 228.776 bytes, SHA-256 `d9806bdb117a0faaeb925708b6edd37f959c865d6fba82b6f78c96a463707356`
**Baseline (congelada, não modificada):** SHA-256 `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667`
**Referência (não modificada):** SHA-256 `6c8e823bae12d3bfd9c577375adaf888f19f1babac35f1c04ee67534c3dd0073`

## Auditoria estática

Comando: `python3 tests/static_audit.py <arquivo>`

| Arquivo alvo | Resultado | Observações |
|---|---|---|
| `baseline/rech_docs_v3_3_12_P1.html` | PASSOU (60 IDs, 0 duplicados, 1 script inline, JS válido) | exit 0 |
| `reference/RechDocs_v3.4.0_reference.html` | PASSOU (60 IDs, 0 duplicados, 1 script inline, JS válido) | exit 0 |
| `output/RechDocs_v3.4.1.html` | PASSOU (**66 IDs**, 0 duplicados, 1 script inline, JS válido) | exit 0; 66 IDs = 65 anteriores + `btn-copiar-mesmo-assim` (P0-03) |

## Validação sintática de JavaScript

Comando: `node --check` sobre cada `.mjs` do harness e sobre o JS inline extraído de cada HTML.

| Alvo | Resultado |
|---|---|
| 9 arquivos `.mjs` em `tests/characterization/` (harness + fixtures) | todos OK |
| JS inline de `output/RechDocs_v3.4.1.html` (1 script, 192.807 chars) | OK |
| JS inline de `baseline/rech_docs_v3_3_12_P1.html` (1 script, 172.580 chars) | OK |
| JS inline de `reference/RechDocs_v3.4.0_reference.html` (1 script, 155.758 chars) | OK |

## Suíte de characterization

Comando: `node tests/characterization/harness/run-characterization.mjs`
Harness: Playwright + Chromium headless, `BrowserContext` isolado por (fixture × artefato), timezone `America/Sao_Paulo`, locale `pt-BR`. Nenhuma chamada de rede real: a fixture E2E intercepta o `fetch` ao provedor via `page.route()` e responde com payload sintético; qualquer host não previsto é abortado.
Resultado bruto completo: `tests/characterization/reports/characterization_run_result.json`

| Fixture | baseline | reference | candidata | Classificação |
|---|---|---|---|---|
| P0-01 — vazamento de parâmetros ventilatórios entre episódios | FAIL | PASS | **PASS** | `EXPECTED_CHANGE` — candidata corrige bug da baseline |
| P0-02a — empate simétrico intubado × extubado | PASS | PASS | **PASS** | `EXPECTED_CHANGE` |
| P0-02b — empate assimétrico "VM ativa" × extubado (R-17) | FAIL | FAIL | **PASS** | candidata corrige bug presente inclusive na referência |
| P0-03 — política de cópia com override auditável | FAIL | FAIL | **PASS** | `EXPECTED_CHANGE` — política implementada e verificada dinamicamente |
| CI-05 — compactação cumulativa de exames | N/A | FAIL (contrato incompatível) | **PASS** (6/6 casos) | `EXPECTED_CHANGE` |
| E2E-01 — fluxo real de UI ponta a ponta | N/A | N/A | **FAIL** | ver bloqueador R-01 abaixo |

### Detalhe P0-03 — 7 cenários verificados dinamicamente

| Cenário | Resultado | Evidência observada |
|---|---|---|
| 1. Sem pendência → copia normal | PASS | 1 escrita no clipboard, sem confirmação exigida |
| 2. Com pendência crítica → bloqueada | PASS | 0 escritas; status "Cópia bloqueada: resolva as pendências críticas…" |
| 3. "Copiar mesmo assim" → pede confirmação | PASS | `confirm()` chamado com o motivo da pendência |
| 4. Cancelar confirmação → não copia | PASS | 0 escritas, audit log vazio |
| 5. Confirmar → copia uma única vez | PASS | exatamente 1 escrita |
| 6. Audit log registra o override | PASS | `⚠ Override de cópia em 2026-08-15T02:22:28.452Z — pendência(s) ignorada(s) por decisão humana: …` |
| 7. Segunda tentativa volta a bloquear | PASS | `COPY_BLOCKED` permanece `true`; 0 escritas adicionais |

### Detalhe E2E-01 — 10 cenários de fluxo real de UI

Dados 100% sintéticos/desidentificados (`PACIENTE TESTE E2E`, leito fictício). Nenhuma chave real; nenhuma requisição sai da máquina.

| Cenário | Resultado | Evidência observada |
|---|---|---|
| 1. Geração normal pela UI (`#btn-gen`) | PASS | `output-card` visível; status "Documento gerado — confira alertas/auditoria acima antes de assinar." |
| 2. Preview renderizado | PASS | 1.227 caracteres no `output-body` |
| 3. **Edição manual com pendência crítica ativa** | **FAIL** | **ver R-01 abaixo — bloqueador** |
| 4. Copiar sem pendência | PASS | `COPY_BLOCKED=false` após geração limpa; 1 escrita |
| 5. Bloqueio com pendência crítica | PASS | `COPY_BLOCKED=true`, 0 escritas, botão de override visível |
| 6. Override cancelado | PASS | `confirm()` chamado; 0 escritas; audit log vazio |
| 7. Override confirmado | PASS | 1 escrita; audit log com timestamp ISO e motivo; card visível |
| 8. Segunda cópia novamente bloqueada | PASS | `COPY_BLOCKED` ainda `true`; 0 escritas |
| 9. Impressão/PDF sem exceção | PASS | nenhuma exceção; `window.print()` chamado 1× quando liberado |
| 10. Reiniciar sessão limpa estado/audit | PASS | output vazio, audit vazio, `COPY_BLOCKED=false`, `COPY_OVERRIDE_LOG.length=0` |

Erros de página (exceção JS não tratada) durante todo o fluxo: **nenhum**. Erros de console: **nenhum**.

## BLOQUEADOR ABERTO — R-01

**Status: CONFIRMADO DINAMICAMENTE, NÃO CORRIGIDO.**

Um listener global de `input` (`output/RechDocs_v3.4.1.html`, ~linha 1207, introduzido no commit `827126b` em `main` — *"release copy/print after manual edits"*, 09/08/2026, **anterior a esta branch**) chama `setCopyBlocked(false)` a cada digitação em `#output-body` ou `#prefill-editor`. Efeito medido:

| Situação | Antes da edição | Depois de 1 evento `input` | Audit log |
|---|---|---|---|
| Pendência crítica ativa | `COPY_BLOCKED=true` | `COPY_BLOCKED=false`, `copiar()` escreve | vazio |
| Pré-evolução com `baseBlocked=true` | `COPY_BLOCKED=true`, `reviewed=false` | `COPY_BLOCKED=false`, `reviewed` continua `false`, `copiar()` escreve | vazio |

Consequências objetivas:

1. Contorna integralmente a política de cópia do P0-03: em vez de clicar "Copiar mesmo assim" e confirmar (gerando registro auditável), basta digitar um caractere e usar "Copiar tudo" — **sem confirmação e sem registro**.
2. Neutraliza `onPreEvolutionEdit()`, que faz `setCopyBlocked(true)` no mesmo evento: o handler inline roda na fase de destino e o listener global roda depois, na fase de bubbling, revertendo a decisão.
3. Torna `confirmarRevisaoPreEvolucao()` — que recusa liberar quando `baseBlocked=true` — contornável sem passar por ela.

Conflito documental: contraria R-01 de `REGRESSION_RISKS.md` (bloqueante), a invariante de `docs/REGRAS_CLINICAS.md` ("conteúdo com inferência não resolvida não deve ser liberado para cópia final sem mecanismo explícito de revisão") e o critério de `AGENTS.md` ("pré-evolução funciona sem enfraquecer bloqueios clínicos"). Por outro lado, o commit que o introduziu descreve o comportamento como intencional. **É uma decisão humana anterior que colide com a decisão humana mais recente (contrato P0-03) — a resolução exige escolha do responsável, não correção autônoma.**

## Limitações conhecidas desta execução

- Cobertura clínica ainda parcial: as fixtures cobrem P0-01, P0-02a/b, P0-03, CI-05 e o fluxo de UI. Os riscos **R-03, R-04, R-06, R-08 a R-16** de `REGRESSION_RISKS.md` continuam **sem teste dedicado**.
- Nenhuma chamada real a provedor de IA foi feita; os adaptadores (`callAnthropic`/`callOpenAI`/`callGemini`/`callDeepSeek`/`callQwen`) **não foram testados contra APIs reais** — apenas o caminho de resposta bem-sucedida da Anthropic foi exercitado via stub.
- Não executados: teste cross-browser (apenas Chromium), impressão física, conversão real de PDF, pentest dinâmico, validação institucional/LGPD.
- As suítes `baseline.characterization.cjs` / `baseline.clinical.cjs` e os "37 testes históricos" citados em `IMPLEMENTATION_PLAN.md` continuam **inexistentes no repositório**; a suíte atual foi construída do zero e não é migração daquelas.
