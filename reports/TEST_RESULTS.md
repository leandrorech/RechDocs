# Resultados de teste — RechDocs v3.4.1

> Registrar todo comando executado, resultado, falha e limitação, conforme regra 9 de `AGENTS.md`.
> Não declarar sucesso quando houver teste não executado ou dependência indisponível (regra 10).

## Auditoria estática

| Arquivo alvo | Comando | Resultado | Observações |
|---|---|---|---|
| `baseline/rech_docs_v3_3_12_P1.html` | `python3 tests/static_audit.py baseline/rech_docs_v3_3_12_P1.html` | PASSOU (60 IDs, 0 duplicados, 1 script inline, JS válido via `node --check`) | ver `reports/BASELINE_STATIC_AUDIT.txt`; reexecutado em 2026-08-12 |
| `reference/RechDocs_v3.4.0_reference.html` | `python3 tests/static_audit.py reference/RechDocs_v3.4.0_reference.html` | PASSOU (60 IDs, 0 duplicados, 1 script inline, JS válido via `node --check`) | ver `reports/REFERENCE_STATIC_AUDIT.txt`; reexecutado em 2026-08-12 |
| `output/RechDocs_v3.4.1.html` | `python3 tests/static_audit.py output/RechDocs_v3.4.1.html` | PASSOU (65 IDs, 0 duplicados, 1 script inline, JS válido via `node --check`) | ver `reports/OUTPUT_STATIC_AUDIT.txt`; executado em 2026-08-12 |

## Suítes de caracterização / clínicas

| Suíte | Status | Observações |
|---|---|---|
| `baseline.characterization.cjs` (referenciada em `IMPLEMENTATION_PLAN.md`) | **não encontrada em `tests/`** | migrar ou recriar antes da validação final |
| `baseline.clinical.cjs` (referenciada em `IMPLEMENTATION_PLAN.md`) | **não encontrada em `tests/`** | migrar ou recriar antes da validação final |
| 37 testes históricos mencionados em `IMPLEMENTATION_PLAN.md` | **não localizados no repositório** | confirmar origem e migrar |

## Riscos de regressão — status de validação

| ID | Severidade | Descrição resumida | Status de teste |
|---|---|---|---|
| R-01 | Bloqueante | Edição contorna rastreabilidade e bloqueio de cópia | pendente |
| R-02 | Bloqueante | Parâmetros ventilatórios antigos reaparecem após extubação/reintubação | pendente |
| R-03 | Bloqueante | Plano futuro passa a ação executada (regex Unicode) | pendente |
| R-04 | Alto | Insulina como sedação / antitrombótico removido indevidamente | pendente |
| R-05 | Alto | Compactação perde significado temporal/unidade ou duplica exames | pendente |
| R-06 | Alto | Regex de pré-evolução apaga seção errada | pendente |
| R-07 | Alto | Alteração manual não aparece na trilha e não bloqueia saída | pendente |
| R-08 | Alto | "Limpar sessão" preserva chave/segredo | pendente |
| R-09 | Alto | P/F rotula SDRA isoladamente; limites K/Mg regridem | pendente |
| R-10 | Alto | Unidades duplicadas ou convertidas sem base | pendente |
| R-11 | Médio | Interconsulta sem data recebe marcador técnico no corpo | pendente |
| R-12 | Médio | Cancelar pré-evolução não restaura estado anterior | pendente |
| R-13 | Médio | Handlers/IDs órfãos após mescla manual | pendente |
| R-14 | Médio | Conteúdo de IA interpretado como HTML (`innerHTML`) | pendente |
| R-15 | Médio | Qwen recebe imagem em alias não multimodal | pendente |
| R-16 | Médio | Cópia e impressão divergem do preview | pendente |

## Funcionalidades recentes — status de validação

| Item | Status de teste |
|---|---|
| Preview editável restaurado | pendente |
| Negrito estrutural de títulos | pendente |
| Normalização de NUTRIÇÃO | pendente |
| Remoção de blocos ANTITROMBÓTICOS | pendente |
| Compactação de hemograma (Hb/Ht) | pendente |

## Limitações conhecidas

- A auditoria estática cobre apenas IDs duplicados, padrões perigosos (`eval`, `new Function`, `document.write`) e validade sintática do JS via `node --check`. **Não valida nenhum comportamento clínico** — os 16 riscos de regressão e as 5 funcionalidades recentes listadas acima seguem pendentes e exigem testes de caracterização/clínicos dedicados antes de qualquer declaração de segurança clínica (regra 10 de `AGENTS.md`).
- Ambiente Node confirmado disponível nesta execução (`/opt/node22/bin/node`), portanto o teste sintático de JS foi executado para os três arquivos (não apenas verificado como ausente).
- Dependências de teste vendorizadas/aprovadas ainda não definidas (ver Etapa 1.4 de `reports/IMPLEMENTATION_PLAN.md`).
- Suítes `.cjs` de caracterização/clínicas referenciadas em `IMPLEMENTATION_PLAN.md` ainda não localizadas no repositório — precisam ser migradas ou recriadas.
- Decisões humanas pendentes listadas em `reports/REGRESSION_RISKS.md` bloqueiam a definição de critérios de aceite para alguns testes (ex.: deduplicação de exames, definição de "exportação").
