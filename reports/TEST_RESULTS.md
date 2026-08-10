# Resultados de teste — RechDocs v3.4.1

> Registrar todo comando executado, resultado, falha e limitação, conforme regra 9 de `AGENTS.md`.
> Não declarar sucesso quando houver teste não executado ou dependência indisponível (regra 10).

## Auditoria estática

| Arquivo alvo | Comando | Resultado | Observações |
|---|---|---|---|
| `baseline/rech_docs_v3_3_12_P1.html` | `python tests/static_audit.py baseline/rech_docs_v3_3_12_P1.html` | pendente de execução | ver `reports/BASELINE_STATIC_AUDIT.txt` para execução anterior |
| `reference/RechDocs_v3.4.0_reference.html` | `python tests/static_audit.py reference/RechDocs_v3.4.0_reference.html` | pendente de execução | ver `reports/REFERENCE_STATIC_AUDIT.txt` para execução anterior |
| `output/RechDocs_v3.4.1.html` | `python tests/static_audit.py output/RechDocs_v3.4.1.html` | **pendente de execução** | executar antes de declarar versão final |

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

- Ambiente de execução para testes `.cjs`/Node não confirmado neste registro.
- Dependências de teste vendorizadas/aprovadas ainda não definidas (ver Etapa 1.4 de `reports/IMPLEMENTATION_PLAN.md`).
- Decisões humanas pendentes listadas em `reports/REGRESSION_RISKS.md` bloqueiam a definição de critérios de aceite para alguns testes (ex.: deduplicação de exames, definição de "exportação").
