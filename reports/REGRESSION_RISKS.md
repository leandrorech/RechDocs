# Riscos de regressão — consolidação RechDocs v3.4.1

> **Atualizado em 2026-08-15 (RELEASE GATE).** A coluna *Status* reflete verificação dinâmica real
> registrada em `reports/TEST_RESULTS.md` e `tests/characterization/reports/characterization_run_result.json`.
> Riscos sem teste dedicado permanecem explicitamente `SEM TESTE` — ausência de teste não é evidência de ausência de defeito.

## Matriz priorizada

| ID | Severidade | Risco | Mecanismo | Controle exigido | Status |
|---|---|---|---|---|---|
| R-01 | Bloqueante | Edição contorna rastreabilidade e bloqueio de cópia. | `renderOutputDocument` substitui `renderTraceableOutput`; referência não tem `setCopyBlocked`. | Editor derivado do preview seguro; revalidar após cada edição; cópia depende de estado, não do botão visual. | **✅ RESOLVIDO POR MUDANÇA DE CONTRATO** — não existe mais bloqueio a contornar; o requisito agora é que a edição não apague a sinalização, e isso é testado (E2E-01 cenário 8) |
| R-02 | Bloqueante | Parâmetros ventilatórios de episódio antigo reaparecem após extubação/reintubação. | Port de `ClinicalState`/`chronoScore` da referência. | Não portar motor da referência; teste extubação → reintubação sem herança. | **✅ RESOLVED** (P0-01, commit `abde96c`) |
| R-17 | Bloqueante | Empate "VM ativa" × "extubado" resolvido silenciosamente, sem conflito e sem bloquear cópia. | `comparaPrecedencia()` desempata por `EXECUTED_VERBS`; "extubado" bate num radical, "VM ativa" não — decide antes de alcançar o critério de empate. | Canonicalizar os dois lados como estado declarado antes de comparar, sem alterar o comparador genérico. | **✅ RESOLVED** (commit `fba9b01`) |
| R-03 | Bloqueante | Plano futuro passa a ação executada. | Regex `\b` da referência falha com acentos e gera apenas aviso. | Preservar `futurePlanWarnings` Unicode e teste com “amanhã”. | SEM TESTE |
| R-04 | Alto | Insulina aparece como sedação; antitrombótico desaparece ou é removido como redundante. | `fSedacao(sedacao, outras_infusoes)` e limpeza estrutural do ramo. | Renderizadores separados e fixtures farmacológicas. | SEM TESTE |
| R-05 | Alto | Compactação perde significado temporal/unidade ou duplica exames. | `buildExamesCompactos` apenas agrupa na ordem do array. | Normalização determinística, chave de deduplicação definida, ordenação por data válida e preservação literal. | ✅ VERIFIED (CI-05, 6/6) |
| R-06 | Alto | Regex de pré-evolução apaga seção errada ou falha silenciosamente. | `preparePreEvolutionText` depende de cabeçalhos exatos e intervalos guloso. | Operar sobre modelo de seções/AST simples, com asserts de limites; fallback não destrutivo. | SEM TESTE |
| R-07 | Alto | Alteração manual não aparece na trilha e não bloqueia saída. | `contentEditable` modifica DOM sem atualizar estado. | Capturar diff do editor, marcar como “edição humana pós-reconciliação”, exigir confirmação. | ✅ RESOLVIDO POR MUDANÇA DE CONTRATO (ver R-01) |
| R-08 | Alto | “Limpar sessão” preserva chave/segredo em computador compartilhado. | `reiniciarTudo` deliberadamente mantém configuração. | Separar “novo caso” de “encerrar sessão completa”; testar ambos. | SEM TESTE (parcial: reset verificado no E2E-01 cenário 10) |
| R-09 | Alto | P/F volta a rotular SDRA isoladamente; limites K/Mg regressam. | Port amplo de `runValidations`. | Proibir substituição; testes de texto/limiares. | SEM TESTE |
| R-10 | Alto | Unidades duplicadas ou convertidas sem base. | Renderizadores da referência não contêm normalizadores P1. | Preservar funções baseline e testar entradas legadas. | SEM TESTE |
| R-11 | Médio | Interconsulta sem data recebe marcador técnico dentro do prontuário. | `buildInterconsultas` da referência. | Manter baseline; sinalizar no painel, não no corpo, salvo decisão humana. | SEM TESTE |
| R-12 | Médio | Cancelar pré-evolução não restaura estado anterior. | Referência não possui snapshot/cancelamento. | Snapshot imutável + botão cancelar + teste de igualdade byte a byte do texto restaurado. | SEM TESTE |
| R-13 | Médio | Handlers/IDs órfãos após mescla manual. | Troca de `trace-*` por `prefill-*` e handler novo. | Inventário automatizado no CI/local. | ✅ VERIFIED (static_audit: 66 IDs, 0 duplicados) |
| R-14 | Médio | Conteúdo de IA é interpretado como HTML. | Cinco usos de `innerHTML`; risco aumenta com editor. | Classificar cada sink; conteúdo clínico somente por `textContent`/nós. | SEM TESTE |
| R-15 | Médio | Qwen recebe imagem em alias não multimodal. | Referência anuncia `supportsVision:true`. | Preservar `false` até modelo/endpoint validado. | SEM TESTE |
| R-16 | Médio | Cópia e impressão divergem do preview. | Estilos/destaques não fazem parte de `textContent`; edição altera DOM. | Testar texto copiado, texto impresso e conteúdo visível contra a mesma fonte. | SEM TESTE |

## ✅ R-01 / R-07 — resolvido por decisão de contrato (2026-08-15)

O release gate de 2026-08-15 confirmou dinamicamente que um listener global de `input` chamava
`setCopyBlocked(false)` a cada digitação no preview, liberando a saída sem confirmação nem registro —
um bypass da política de cópia então vigente.

**A decisão do produto eliminou a premissa do problema.** O RechDocs não bloqueia mais cópia nem
impressão em nenhuma circunstância (ver `reports/COPY_POLICY_CONTRACT.md`, contrato revisado). Sem
bloqueio, não há bypass possível: a saída já está sempre disponível, por desenho.

O requisito que **sobrevive** dessa análise, e que agora é testado explicitamente, é outro: a edição
manual **não pode apagar a sinalização crítica**. O listener foi alterado para não tocar no estado de
alerta, e passou a exibir mensagem reforçando que as pendências continuam ativas.

Verificação (candidata, 2026-08-15):

| Cenário | Antes da edição | Depois de 1 evento `input` |
|---|---|---|
| Alerta crítico ativo (preview) | banner visível, alerta ativo | **banner visível, alerta ativo**, cópia funcional |
| Pré-evolução com pendência de reconciliação | banner visível, alerta ativo | **banner visível, alerta ativo** |

Fixtures: `p0_03_copy_override_policy.mjs` (critério 5) e `e2e_full_ui_flow.mjs` (cenário 8/8d).
A fixture P0-03 também verifica que os símbolos do contrato antigo (`setCopyBlocked()`,
`copiarComOverride()`, `COPY_BLOCKED`, `#btn-copiar-mesmo-assim`) **não reapareceram** no artefato.

## Conflitos documentais

1. `README_FIRST.md` é um bootstrap de publicação anterior e declara RechDocs v3.3.10 como candidata. Isso conflita com `AGENTS.md`, `TASK.md` e a auditoria de 31/07, que tornam v3.3.12-P1 canônica. Para este trabalho, as instruções específicas e posteriores prevaleceram.
2. `TASK.md` completo pede entregável v3.4.1, `CHANGE_IMPACT.md` e changelog; `PROMPT_INICIAL.txt` limita este ciclo à Fase 1. Nenhum desses artefatos de implementação foi criado agora.
3. A especificação exige cancelamento/retorno ao estado anterior, mas a referência não implementa isso.
4. “Exportação” não está definida: o ramo atual tem cópia e impressão pelo navegador, não exportador de arquivo dedicado.

## Decisões humanas pendentes

- Definir se edição humana livre deve ser permitida ou se o editor deve ser por campos/seções controlados.
- Definir política de deduplicação de exames: igualdade por nome+data+hora+resultado ou preservação de duplicatas como fontes independentes.
- Definir ordenação dos exames sem data e datas empatadas.
- Definir se unidade ausente deve permanecer ausente (recomendado) ou receber unidade inferida — esta última conflita com as invariantes.
- Confirmar como representar interconsulta sem data no preview, mantendo o corpo clínico limpo.
- Definir “exportação”: clipboard, impressão/PDF, `.txt`, `.docx` ou mais de um formato.
- Definir o comportamento de “encerrar sessão completa” para chaves persistentes deliberadamente salvas pelo usuário.
- Resolver historicamente `fInterconsultas`/`fControleItem` citadas em `VEREDITO_DIFF_PREVIO.md`; a baseline atual contém `buildInterconsultas`, mas não as funções antigas com esses nomes.
