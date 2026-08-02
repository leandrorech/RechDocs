# Riscos de regressão — consolidação RechDocs v3.4.1

## Matriz priorizada

| ID | Severidade | Risco | Mecanismo | Controle exigido |
|---|---|---|---|---|
| R-01 | Bloqueante | Edição contorna rastreabilidade e bloqueio de cópia. | `renderOutputDocument` substitui `renderTraceableOutput`; referência não tem `setCopyBlocked`. | Editor derivado do preview seguro; revalidar após cada edição; cópia depende de estado, não do botão visual. |
| R-02 | Bloqueante | Parâmetros ventilatórios de episódio antigo reaparecem após extubação/reintubação. | Port de `ClinicalState`/`chronoScore` da referência. | Não portar motor da referência; teste extubação → reintubação sem herança. |
| R-03 | Bloqueante | Plano futuro passa a ação executada. | Regex `\b` da referência falha com acentos e gera apenas aviso. | Preservar `futurePlanWarnings` Unicode e teste com “amanhã”. |
| R-04 | Alto | Insulina aparece como sedação; antitrombótico desaparece ou é removido como redundante. | `fSedacao(sedacao, outras_infusoes)` e limpeza estrutural do ramo. | Renderizadores separados e fixtures farmacológicas. |
| R-05 | Alto | Compactação perde significado temporal/unidade ou duplica exames. | `buildExamesCompactos` apenas agrupa na ordem do array. | Normalização determinística, chave de deduplicação definida, ordenação por data válida e preservação literal. |
| R-06 | Alto | Regex de pré-evolução apaga seção errada ou falha silenciosamente. | `preparePreEvolutionText` depende de cabeçalhos exatos e intervalos guloso. | Operar sobre modelo de seções/AST simples, com asserts de limites; fallback não destrutivo. |
| R-07 | Alto | Alteração manual não aparece na trilha e não bloqueia saída. | `contentEditable` modifica DOM sem atualizar estado. | Capturar diff do editor, marcar como “edição humana pós-reconciliação”, exigir confirmação. |
| R-08 | Alto | “Limpar sessão” preserva chave/segredo em computador compartilhado. | `reiniciarTudo` deliberadamente mantém configuração. | Separar “novo caso” de “encerrar sessão completa”; testar ambos. |
| R-09 | Alto | P/F volta a rotular SDRA isoladamente; limites K/Mg regressam. | Port amplo de `runValidations`. | Proibir substituição; testes de texto/limiares. |
| R-10 | Alto | Unidades duplicadas ou convertidas sem base. | Renderizadores da referência não contêm normalizadores P1. | Preservar funções baseline e testar entradas legadas. |
| R-11 | Médio | Interconsulta sem data recebe marcador técnico dentro do prontuário. | `buildInterconsultas` da referência. | Manter baseline; sinalizar no painel, não no corpo, salvo decisão humana. |
| R-12 | Médio | Cancelar pré-evolução não restaura estado anterior. | Referência não possui snapshot/cancelamento. | Snapshot imutável + botão cancelar + teste de igualdade byte a byte do texto restaurado. |
| R-13 | Médio | Handlers/IDs órfãos após mescla manual. | Troca de `trace-*` por `prefill-*` e handler novo. | Inventário automatizado no CI/local. |
| R-14 | Médio | Conteúdo de IA é interpretado como HTML. | Cinco usos de `innerHTML`; risco aumenta com editor. | Classificar cada sink; conteúdo clínico somente por `textContent`/nós. |
| R-15 | Médio | Qwen recebe imagem em alias não multimodal. | Referência anuncia `supportsVision:true`. | Preservar `false` até modelo/endpoint validado. |
| R-16 | Médio | Cópia e impressão divergem do preview. | Estilos/destaques não fazem parte de `textContent`; edição altera DOM. | Testar texto copiado, texto impresso e conteúdo visível contra a mesma fonte. |

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
