# Impacto clínico — auditoria da candidata v3.4.1 (03/08/2026)

Este relatório não descreve mudanças de código já aplicadas — nenhuma foi feita nesta etapa,
por decisão explícita (auditoria somente-leitura). Ele registra, no formato exigido por
`AGENTS.md` regra 6 (comportamento anterior, novo comportamento, risco, teste correspondente),
os gaps encontrados entre o comportamento **esperado pela especificação/baseline/referência** e
o comportamento **observado na candidata `output/RechDocs_v3.4.1.html`**, para orientar a
próxima etapa de correção.

Todos os achados abaixo foram confirmados por execução real das funções do motor clínico
(`ClinicalState`) extraídas do HTML e rodadas em Node.js com dados sintéticos — não por
prontuários reais e não por inspeção apenas visual. Ver `reports/TEST_RESULTS.md` para
comandos e saídas completas.

---

## CI-01 — Herança de parâmetros ventilatórios através de extubação/reintubação

- **Função:** `resolveVentilatorio()`, `output/RechDocs_v3.4.1.html:1643-1688`.
- **Comportamento anterior (baseline `v3.3.12-P1`):** o passo de resolução por campo
  (`peep`, `vc_ml`, `fio2`...) considera todos os eventos do array inteiro como candidatos,
  sem qualquer noção de fronteira de episódio ventilatório.
- **Comportamento observado na candidata:** idêntico à baseline — a candidata **não portou**
  a correção já presente na referência `v3.4.0` (comentário no próprio código da referência:
  "fix P0-06, 26/07/2026", linha ~1285-1295 de `reference/RechDocs_v3.4.0_reference.html`).
- **Comportamento esperado (conforme referência e `docs/AUDITORIA_2026-07-31.md`):** após um
  evento de extubação, campos não mencionados no episódio seguinte devem ficar ausentes
  (`undefined`), nunca herdar o valor do episódio anterior à extubação.
- **Risco clínico:** documentação de parâmetro ventilatório (PEEP, volume corrente) como
  vigente quando na verdade pertence a um episódio de VM já encerrado — pode levar a decisão
  clínica sobre um suporte ventilatório que não existe mais.
- **Teste correspondente:** `T-VENT-01` em `reports/TEST_RESULTS.md`.
- **Status:** não corrigido. Correção mínima recomendada: portar `resolveVentilatorio()` da
  referência (ordenação cronológica dos eventos + corte no último evento de
  extubação/retirada/suspensão), preservando o restante de `ClinicalState` intocado.

---

## CI-02 — Empate "VM ativa × extubado" com fraseado assimétrico

- **Função:** `comparaPrecedencia()` (`output:1329-1372`) combinada com `resolveVentilatorio()`
  (`output:1651-1665`) e a lista `EXECUTED_VERBS` (`output:1323`).
- **Comportamento anterior/observado:** o critério "ação executada vence menção passiva" usa
  correspondência por substring em `EXECUTED_VERBS`, que contém `'extubad'` e `'intubad'` mas
  não cobre o status simples `'ativo'`. Quando um evento é `status:'ativo'` (sem verbo de ação
  no próprio campo de status) e o outro é `status:'extubado'`, o comparador nunca chega ao
  ramo que registra conflito (`cmp===0`), pois `'extubado'` já vence por conter um verbo de
  EXECUTED_VERBS.
- **Comportamento esperado:** qualquer empate real de precedência entre um evento de VM ativa
  e um evento de extubação/retirada — independente de como cada um foi fraseado no JSON — deve
  gerar `conflitos.push(...)` bloqueante, nunca resolução silenciosa.
- **Risco clínico:** um documento genuinamente contraditório (nota diz "VM ativa, PEEP 8" e
  outra do mesmo horário diz "extubado") é decidido automaticamente sem alertar a equipe.
- **Teste correspondente:** `T-VENT-02` e `T-VENT-03` em `reports/TEST_RESULTS.md`.
- **Status:** não corrigido. Correção mínima recomendada: mover a checagem `curNeg !==
  vencedorNeg` para fora do ramo `cmp===0`, avaliando também quando o comparador decide por
  verbo de ação, para não perder o registro do conflito nesses casos.

---

## CI-03 — Trilha de rastreabilidade não é recalculada após edição manual da pré-evolução

- **Funções:** `startPreEvolutionEditor()`, `onPreEvolutionEdit()`, `visualizarPreEvolucao()`,
  `confirmarRevisaoPreEvolucao()` (`output:2985-3031`).
- **Comportamento observado:** `traceItems` é gravado uma única vez no snapshot inicial da
  pré-evolução e nunca recalculado depois de uma edição manual, mesmo quando o usuário confirma
  a revisão e libera a cópia.
- **Comportamento esperado (`docs/REGRAS_CLINICAS.md`: "o texto final deve permitir rastrear
  transformações clinicamente relevantes"):** a trilha exibida deve corresponder ao texto
  efetivamente liberado para cópia, não a uma versão anterior à edição.
- **Risco documental:** a garantia de rastreabilidade é quebrada silenciosamente no fluxo de
  uso mais comum (edição humana da pré-evolução antes de copiar).
- **Teste correspondente:** `T-TRACE-01` em `reports/TEST_RESULTS.md` (limitação: teste de
  leitura de fluxo, não de execução — ver observação na seção de limitações).
- **Status:** não corrigido. Correção mínima recomendada: ao editar, gerar diff entre snapshot
  e texto atual, invalidando/atualizando as marcações de trilha incompatíveis com o novo texto.

---

## CI-04 — Sobrescrita silenciosa de controles de 24h com o mesmo rótulo (temperatura mín/máx e outros)

- **Função:** `buildControles()` (`output:2216-2228`).
- **Comportamento observado:** quando duas linhas de `controles[]` normalizam para a mesma
  chave (ex.: duas leituras rotuladas apenas "Temp:"), a de maior `controleCompletenessScore`
  (heurística de "quão completa parece a string") sobrescreve a outra silenciosamente — sem
  registro em `conflitos` ou `auditLog`.
- **Comportamento esperado:** duas leituras distintas do mesmo parâmetro no período de 24h
  (ex.: temperatura mínima às 06h e máxima às 14h) devem ser preservadas, ou pelo menos gerar
  um conflito explícito sinalizando a perda de um dado.
- **Risco clínico:** perda silenciosa de dado clínico relevante (pico febril, hipotermia
  transitória), contrariando `docs/REGRAS_CLINICAS.md`: "dado ausente permanece ausente" — aqui
  o dado não está ausente na fonte, é apagado na consolidação.
- **Teste correspondente:** `T-CTRL-01` em `reports/TEST_RESULTS.md`.
- **Status:** não corrigido. Correção mínima recomendada: ao colidir duas linhas na mesma
  chave com valores numéricos distintos, registrar conflito em vez de sobrescrever — mesmo
  padrão já usado em `resolveGroup()`/`resolveVentilatorio()` para empates de precedência.

---

## CI-05 — Deduplicação de exames cumulativos não considera hora nem tipo (achado não executado, ver limitações)

- **Função:** `acumularExames()` (`output:1603-1613`).
- **Observação:** `dedupeKey` é composta por `nome+data+resultado`, sem `hora` nem `tipo`. Dois
  exames de mesmo nome/data/resultado numericamente coincidente, mas de horários ou categorias
  diferentes, colidiriam na mesma chave e um seria descartado como duplicata.
- **Status:** não executado com dados sintéticos nesta etapa (ver limitações em
  `reports/TEST_RESULTS.md`). Classificado como hipótese fundada em leitura de código
  determinística, não como fato confirmado por execução.

---

## Itens sem impacto clínico identificado (verificados, sem correção necessária)

- Separação farmacológica (ATB/antitrombóticos/DVA/sedação/BNM/outras infusões): renderizadores
  distintos corretos.
- Cópia final usa `textContent`, não `innerHTML`, em toda a cadeia de saída clínica.
- `reiniciarTudo()`/`encerrarSessaoCompleta()`: limpeza de dados de caso, anexos e chaves
  temporárias/opcionalmente permanentes coerente com `docs/REGRAS_CLINICAS.md`.
- `detectPHI()` + confirmação explícita antes de qualquer envio a provedor externo.

---

## Nota sobre política de cópia ("Copiar mesmo assim")

`reports/RECHDOCS_ANALISE_COMPLETA_2026-08-02.md` registra uma exigência de fluxo de
"Copiar mesmo assim" que não está presente em nenhuma das três versões (baseline, referência,
candidata) nem em `AGENTS.md`/`TASK.md`/`docs/REGRAS_CLINICAS.md`/`docs/ESPECIFICACAO_V3.4.1.md`.
Este relatório não a trata como item de impacto confirmado — fica registrada como decisão
pendente de confirmação humana antes de qualquer implementação, para não inventar um requisito
não documentado nas fontes de autoridade deste repositório.
