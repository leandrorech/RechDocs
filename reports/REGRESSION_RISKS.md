# Riscos de regressão — consolidação RechDocs v3.4.1

> **Atualizado em 2026-08-15 (RELEASE GATE).** A coluna *Status* reflete verificação dinâmica real
> registrada em `reports/TEST_RESULTS.md` e `tests/characterization/reports/characterization_run_result.json`.
> Riscos sem teste dedicado permanecem explicitamente `SEM TESTE` — ausência de teste não é evidência de ausência de defeito.

## Matriz priorizada

| ID | Severidade | Risco | Mecanismo | Controle exigido | Status |
|---|---|---|---|---|---|
| R-01 | Bloqueante | Edição contorna rastreabilidade e bloqueio de cópia. | `renderOutputDocument` substitui `renderTraceableOutput`; referência não tem `setCopyBlocked`. | Editor derivado do preview seguro; revalidar após cada edição; cópia depende de estado, não do botão visual. | **⛔ CONFIRMADO ABERTO** — ver "Decisão pendente" abaixo |
| R-02 | Bloqueante | Parâmetros ventilatórios de episódio antigo reaparecem após extubação/reintubação. | Port de `ClinicalState`/`chronoScore` da referência. | Não portar motor da referência; teste extubação → reintubação sem herança. | **✅ RESOLVED** (P0-01, commit `abde96c`) |
| R-17 | Bloqueante | Empate "VM ativa" × "extubado" resolvido silenciosamente, sem conflito e sem bloquear cópia. | `comparaPrecedencia()` desempata por `EXECUTED_VERBS`; "extubado" bate num radical, "VM ativa" não — decide antes de alcançar o critério de empate. | Canonicalizar os dois lados como estado declarado antes de comparar, sem alterar o comparador genérico. | **✅ RESOLVED** (commit `fba9b01`) |
| R-03 | Bloqueante | Plano futuro passa a ação executada. | Regex `\b` da referência falha com acentos e gera apenas aviso. | Preservar `futurePlanWarnings` Unicode e teste com “amanhã”. | SEM TESTE |
| R-04 | Alto | Insulina aparece como sedação; antitrombótico desaparece ou é removido como redundante. | `fSedacao(sedacao, outras_infusoes)` e limpeza estrutural do ramo. | Renderizadores separados e fixtures farmacológicas. | SEM TESTE |
| R-05 | Alto | Compactação perde significado temporal/unidade ou duplica exames. | `buildExamesCompactos` apenas agrupa na ordem do array. | Normalização determinística, chave de deduplicação definida, ordenação por data válida e preservação literal. | ✅ VERIFIED (CI-05, 6/6) |
| R-06 | Alto | Regex de pré-evolução apaga seção errada ou falha silenciosamente. | `preparePreEvolutionText` depende de cabeçalhos exatos e intervalos guloso. | Operar sobre modelo de seções/AST simples, com asserts de limites; fallback não destrutivo. | SEM TESTE |
| R-07 | Alto | Alteração manual não aparece na trilha e não bloqueia saída. | `contentEditable` modifica DOM sem atualizar estado. | Capturar diff do editor, marcar como “edição humana pós-reconciliação”, exigir confirmação. | ⛔ ABERTO (mesmo mecanismo do R-01) |
| R-08 | Alto | “Limpar sessão” preserva chave/segredo em computador compartilhado. | `reiniciarTudo` deliberadamente mantém configuração. | Separar “novo caso” de “encerrar sessão completa”; testar ambos. | SEM TESTE (parcial: reset verificado no E2E-01 cenário 10) |
| R-09 | Alto | P/F volta a rotular SDRA isoladamente; limites K/Mg regressam. | Port amplo de `runValidations`. | Proibir substituição; testes de texto/limiares. | SEM TESTE |
| R-10 | Alto | Unidades duplicadas ou convertidas sem base. | Renderizadores da referência não contêm normalizadores P1. | Preservar funções baseline e testar entradas legadas. | SEM TESTE |
| R-11 | Médio | Interconsulta sem data recebe marcador técnico dentro do prontuário. | `buildInterconsultas` da referência. | Manter baseline; sinalizar no painel, não no corpo, salvo decisão humana. | SEM TESTE |
| R-12 | Médio | Cancelar pré-evolução não restaura estado anterior. | Referência não possui snapshot/cancelamento. | Snapshot imutável + botão cancelar + teste de igualdade byte a byte do texto restaurado. | SEM TESTE |
| R-13 | Médio | Handlers/IDs órfãos após mescla manual. | Troca de `trace-*` por `prefill-*` e handler novo. | Inventário automatizado no CI/local. | ✅ VERIFIED (static_audit: 66 IDs, 0 duplicados) |
| R-14 | Médio | Conteúdo de IA é interpretado como HTML. | Cinco usos de `innerHTML`; risco aumenta com editor. | Classificar cada sink; conteúdo clínico somente por `textContent`/nós. | SEM TESTE |
| R-15 | Médio | Qwen recebe imagem em alias não multimodal. | Referência anuncia `supportsVision:true`. | Preservar `false` até modelo/endpoint validado. | SEM TESTE |
| R-16 | Médio | Cópia e impressão divergem do preview. | Estilos/destaques não fazem parte de `textContent`; edição altera DOM. | Testar texto copiado, texto impresso e conteúdo visível contra a mesma fonte. | SEM TESTE |

## ⛔ Decisão pendente — R-01 / R-07 (bloqueia o release da v3.4.1)

**Confirmado dinamicamente em 2026-08-15** (`tests/characterization/fixtures/e2e_full_ui_flow.mjs`, cenários 3 e 3b).

Um listener global de `input` em `output/RechDocs_v3.4.1.html` (~linha 1207) chama `setCopyBlocked(false)` a cada digitação em `#output-body` ou `#prefill-editor`:

```js
document.addEventListener('input',(ev)=>{
  const el=ev.target;
  if(el && (el.id==='output-body' || el.id==='prefill-editor')){
    setCopyBlocked(false);
    ...
```

Medições:

| Situação | Antes | Depois de 1 evento `input` | Registro em audit log |
|---|---|---|---|
| Pendência crítica ativa | `COPY_BLOCKED=true` | `false`; `copiar()` escreve no clipboard | nenhum |
| Pré-evolução `baseBlocked=true` | `COPY_BLOCKED=true`, `reviewed=false` | `false`; `reviewed` continua `false`; `copiar()` escreve | nenhum |

Consequências: (1) contorna a política P0-03 sem confirmação nem auditoria — digitar um caractere substitui todo o fluxo "Copiar mesmo assim"; (2) neutraliza `onPreEvolutionEdit()`, que faz `setCopyBlocked(true)` no mesmo evento e é revertido pelo listener global na fase de bubbling; (3) permite contornar `confirmarRevisaoPreEvolucao()`.

**Procedência:** introduzido em `main` pelo commit `827126b` (09/08/2026), cuja mensagem descreve o comportamento como intencional — *"release copy/print after manual edits"*. **Não é regressão desta branch.** É uma decisão humana anterior que colide com o contrato P0-03, decidido depois.

**Opções (a escolha é do responsável clínico, não pode ser tomada autonomamente):**

- **A — Prevalece o P0-03:** remover a liberação automática do listener; a edição passa a *manter* o bloqueio, e liberar exige "Copiar mesmo assim" (com confirmação + auditoria) ou `confirmarRevisaoPreEvolucao()`. Restaura R-01/R-07 e elimina a contradição com `onPreEvolutionEdit()`. Custo: o usuário passa a precisar de um clique extra após editar.
- **B — Prevalece a liberação por edição, mas auditada:** manter a liberação, porém exigir confirmação explícita na primeira edição sob pendência e registrar a decisão no audit log. Mantém a fluidez e recupera a rastreabilidade; ainda diverge da regra "cópia depende de estado, não de um gesto de UI".
- **C — Manter como está:** aceitar formalmente que edição manual libera cópia sem confirmação nem registro. Exige atualizar R-01/R-07, `docs/REGRAS_CLINICAS.md`, `AGENTS.md` e `COPY_POLICY_CONTRACT.md` para refletir a decisão — caso contrário a documentação permanece contraditória com o código.

Enquanto não houver decisão, `E2E-01` permanece FAIL e o release gate permanece **BLOCKED**.

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
