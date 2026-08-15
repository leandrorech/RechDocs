# Impacto de mudanças clínicas — RechDocs v3.4.1

> Preencher uma entrada por mudança clinicamente relevante, conforme regra 6 de `AGENTS.md`.
> Não declarar item concluído sem teste correspondente executado e registrado em `TEST_RESULTS.md`.

## Modelo de entrada

### [ID] Título curto da mudança

- **Comportamento anterior (baseline v3.3.12-P1):**
- **Novo comportamento (v3.4.1):**
- **Risco clínico:**
- **Mitigação:**
- **Teste correspondente:** (arquivo/caso em `tests/`, referência ao ID de risco em `reports/REGRESSION_RISKS.md` se aplicável)
- **Resultado do teste:** pendente / passou / falhou
- **Responsável pela decisão / aprovação humana:**

---

## Mudanças já implementadas pendentes de registro formal

### [CI-01] Preview editável restaurado

- **Comportamento anterior:** preview não editável ou com edição não integrada ao estado.
- **Novo comportamento:** preview restaurado como editável.
- **Risco clínico:** edição pode contornar rastreabilidade e bloqueio de cópia (ver R-01, R-07 em `reports/REGRESSION_RISKS.md`).
- **Mitigação:** pendente de confirmação — verificar se alteração manual atualiza estado interno e reativa validações.
- **Teste correspondente:** pendente.
- **Resultado do teste:** pendente.
- **Responsável pela decisão / aprovação humana:** pendente.

### [CI-02] Negrito estrutural de títulos

- **Comportamento anterior:** títulos (HIPÓTESES DIAGNÓSTICAS, HDA, ADMISSÃO, SEDAÇÃO, PROFILAXIAS, DVA, EVOLUÇÃO etc.) sem formatação estrutural consistente.
- **Novo comportamento:** negrito estrutural aplicado aos títulos.
- **Risco clínico:** formatação pode divergir entre preview, cópia e impressão (ver R-16).
- **Mitigação:** pendente de confirmação — validar que formatação não é incluída incorretamente em `textContent` usado para cópia clínica.
- **Teste correspondente:** pendente.
- **Resultado do teste:** pendente.
- **Responsável pela decisão / aprovação humana:** pendente.

### [CI-03] Normalização de NUTRIÇÃO

- **Comportamento anterior:** seção de NUTRIÇÃO sem normalização definida.
- **Novo comportamento:** normalização implementada.
- **Risco clínico:** perda ou alteração de informação nutricional relevante.
- **Mitigação:** pendente de confirmação.
- **Teste correspondente:** pendente.
- **Resultado do teste:** pendente.
- **Responsável pela decisão / aprovação humana:** pendente.

### [CI-04] Remoção de blocos de template ANTITROMBÓTICOS

- **Comportamento anterior:** blocos de template de ANTITROMBÓTICOS presentes.
- **Novo comportamento:** blocos retirados do template.
- **Risco clínico:** antitrombótico pode desaparecer ou ser tratado como redundante (ver R-04, bloqueante/alto).
- **Mitigação:** pendente de confirmação — garantir que remoção é apenas de template vazio, não de dado clínico já reconciliado.
- **Teste correspondente:** pendente.
- **Resultado do teste:** pendente.
- **Responsável pela decisão / aprovação humana:** pendente.

### [CI-05] Compactação cumulativa de exames para apresentação

- **Comportamento anterior (baseline v3.3.12-P1):** `buildExamesCompactos()` não existe na baseline; exames são renderizados sem agrupamento cumulativo por tipo/data.
- **Novo comportamento (v3.4.1):** a função `buildExamesCompactos()`, introduzida na v3.4.1, organiza `d.exames` de forma genérica por `tipo` (`lab`, `gasometria`, `cultura`, `imagem`, `outro`) e `data`/`hora`, aplicando deduplicação apenas quando `nome + resultado + unidade + data + hora` coincidem exatamente após normalização (`cleanStr`/trim). A transformação é exclusivamente de apresentação (comentário no código, linha ~2106-2107) e não altera o array clínico original `d.exames`. **Não existe whitelist restrita a Hb/Ht/Leuco/Plaq** — hipótese de contaminação pela regra de layout do RechShift (`HB, HT, LEUCO, PLAQ`) foi verificada por inspeção direta do código (`extractAnalyteNumber`/`findTaggedAnalyte`, usadas só para o alerta de resposta hematimétrica pós-transfusional, já existem idênticas na baseline e não têm relação com a compactação) e **não se confirmou**.
- **Risco clínico:** perda de significado temporal/unidade ou duplicação/fusão indevida de exames (ver R-05, alto).
- **Mitigação:** pendente de confirmação — validar normalização determinística e chave de deduplicação por meio de testes comportamentais.
- **Teste correspondente:** pendente. Casos mínimos a cobrir na characterization suite:
  - dois exames idênticos no mesmo horário devem deduplicar;
  - mesmo analito com resultado diferente não pode desaparecer;
  - mesmo analito em datas/horários diferentes deve permanecer;
  - pequenas diferenças de grafia (`Hb`, `HB`, `Hemoglobina`) não devem ser fundidas silenciosamente, pois a chave é literal;
  - diferentes unidades não podem ser fundidas;
  - `lab`, `gasometria`, `cultura`, `imagem` e `outro` devem permanecer corretamente classificados;
  - `d.exames` deve permanecer inalterado (mesma referência de dados clínicos) antes/depois da chamada a `buildExamesCompactos()`.
- **Resultado do teste:** **VERIFIED** — `tests/characterization/fixtures/ci_05_exam_compaction.mjs`, 6/6 casos PASS na candidata em 2026-08-15 (dedupe exata, resultados distintos preservados, datas distintas preservadas, horários distintos preservados, unidades distintas preservadas, `d.exames` inalterado — `unchanged=true`, `sameReference=true`).
- **Nota de reconciliação:** `buildExamesCompactos()` da candidata **não é port direto** da função homônima da referência v3.4.0 — é implementação própria e mais elaborada (a da referência não preserva unidade, não deduplica e agrupa só por `tipo`). O FAIL da referência nesta fixture reflete incompatibilidade de contrato, não defeito segundo os critérios dela.
- **Responsável pela decisão / aprovação humana:** aprovado por Leandro Rech (revisão de 2026-08-15: "não mexeria mais no CI-05").

---

## Mudanças desta branch (`claude/github-app-install-aft7xw`)

### [P0-01] Fronteira de episódio ventilatório na resolução por campo

- **Comportamento anterior (baseline v3.3.12-P1 e candidata até `abde96c`):** `resolveVentilatorio()` resolvia cada parâmetro (`peep`, `vc_ml`, `modo`, `fio2`…) por precedência entre **todos** os eventos da lista, sem noção de episódio. Numa sequência intubação → extubação → reintubação, PEEP/VC do episódio encerrado "venciam" na reintubação por serem os únicos candidatos daquele campo.
- **Novo comportamento (v3.4.1):** os eventos são ordenados cronologicamente (`parseDateTimeScore`, com `ordem` como critério auxiliar), a última extubação/retirada cronológica é localizada, e os candidatos de cada campo ficam restritos ao episódio posterior a ela. Campo sem candidato no episódio vigente permanece **ausente**, em vez de herdar valor do episódio anterior. Inclui aviso quando há extubação sem data válida (fronteira incerta) e guarda de segurança para episódio vigente vazio.
- **Risco clínico mitigado:** documentar parâmetro ventilatório de episódio encerrado como se fosse o suporte atual (configuração sintética nunca prescrita). Ver R-02.
- **Origem:** port mínimo do mecanismo já existente na referência v3.4.0 (comentário original `fix P0-06`, 26/07/2026). Nenhuma outra regra de precedência/reconciliação foi alterada.
- **Teste correspondente:** `tests/characterization/fixtures/p0_01_vent_episode_leak.mjs`.
- **Resultado do teste:** **RESOLVED** — candidata PASS em 2026-08-15 (baseline FAIL, referência PASS). Estado resolvido: `{modo:"PCV", fio2:"40"}`, sem `peep`/`vc_ml` herdados.
- **Responsável pela decisão / aprovação humana:** Leandro Rech (revisão do diff em 2026-08-15).

### [P0-02a] Remoção de alerta contraditório na guarda de episódio vazio

- **Comportamento anterior (commit `abde96c`):** a guarda de episódio vigente vazio emitia o conflito "VM: estado ativo determinado…" sempre que disparava. No empate intubado × extubado, isso gerava **dois** conflitos contraditórios: a etapa 1 dizia "a extubação/ativação da VM NÃO foi decidida automaticamente" e a guarda afirmava o oposto.
- **Novo comportamento (v3.4.1):** a guarda mantém o fallback (`episodioAtual=sorted`, para a VM não sumir do documento), mas não emite alerta próprio — o conflito da etapa 1 já cobre o caso.
- **Risco clínico mitigado:** mensagens contraditórias no mesmo card de conflitos, que reduzem a confiabilidade percebida do alerta e podem levar o revisor a ignorar o conflito real.
- **Teste correspondente:** `tests/characterization/fixtures/p0_02_vm_extubation_conflict.mjs` (subvariante P0-02a).
- **Resultado do teste:** **VERIFIED** — candidata PASS com **um único** conflito, e `wouldBlockCopy=true`.
- **Responsável pela decisão / aprovação humana:** Leandro Rech.

### [R-17 / P0-02b] Empate silencioso "VM ativa" × "extubado"

- **Comportamento anterior (baseline, referência e candidata até `fba9b01`):** `comparaPrecedencia()` desempata por `EXECUTED_VERBS` (radicais como `iniciad`, `suspens`, `extubad`). "extubado" bate num radical; "VM ativa" não bate em nenhum. Com mesma data/hora/ordem, a comparação resolvia **decisivamente** a favor de "extubado" antes de alcançar o critério de empate real (`cmp===0`), então o bloco de detecção de conflito nunca executava: o estado era resolvido silenciosamente para extubado, sem sinalização e **sem bloquear a cópia**.
- **Novo comportamento (v3.4.1):** apenas no laço que decide o estado vigente, os dois lados são canonicalizados (via `normalizeStatus`, já existente) para um marcador que sempre bate em `EXECUTED_VERBS` — nenhum status de VM é "menção passiva". O empate passa a ser detectado e gera conflito bloqueante.
- **Risco clínico mitigado:** escolha silenciosa entre dois estados clínicos mutuamente exclusivos (VM ativa × extubado), com liberação da cópia. Achado novo desta rodada, sem ID prévio — registrado como **R-17**.
- **Escopo contido:** não altera `EXECUTED_VERBS` (usado também por `cleanCondutas()` e por medicação/dispositivo), não altera o comparador genérico, não altera a resolução de campos do passo 2, não cria parser/classificador novo.
- **Teste correspondente:** `tests/characterization/fixtures/p0_02_vm_extubation_conflict.mjs` (subvariante P0-02b).
- **Resultado do teste:** **RESOLVED** — candidata PASS (baseline e referência continuam FAIL); conflito registrado e `wouldBlockCopy=true`, mesmo formato de mensagem do caso simétrico.
- **Responsável pela decisão / aprovação humana:** Leandro Rech.

### [P0-03] Política de cópia com override auditável

- **Comportamento anterior (baseline e candidata até `53d7378`):** bloqueio **absoluto** — com pendência crítica, `copiar()` e `imprimirDocumento()` retornavam sem ação e não havia nenhuma forma de prosseguir deliberadamente. (Na referência v3.4.0 é pior: não existe bloqueio nenhum.)
- **Novo comportamento (v3.4.1):** implementa `ALERTA → BLOQUEIO → "Copiar mesmo assim" → CONFIRMAÇÃO EXPLÍCITA → AUDIT LOG → CÓPIA`, conforme `reports/COPY_POLICY_CONTRACT.md`. Botão dedicado `#btn-copiar-mesmo-assim`, visível apenas sob bloqueio; `confirm()` exibindo o motivo real da pendência (lido de `#pending-list`, mesma fonte que bloqueou); registro em `COPY_OVERRIDE_LOG` + `#audit-list` com timestamp ISO e motivo.
- **Escopo do override:** vale **somente para aquela operação de cópia**. `COPY_BLOCKED` nunca é alterado por este fluxo; a próxima tentativa volta a exigir o caminho completo. Nenhuma autorização é persistida em `localStorage`/`sessionStorage` nem em variável de escopo maior — o que persiste na sessão é apenas o **registro de auditoria**, que não libera nada. `reiniciarTudo()` limpa esse registro.
- **Risco clínico:** cópia de documento com pendência não resolvida. Mitigado por: pendências permanecem visíveis, confirmação humana inequívoca é obrigatória, e a decisão fica auditável na sessão.
- **Teste correspondente:** `tests/characterization/fixtures/p0_03_copy_override_policy.mjs` (7 cenários) e `tests/characterization/fixtures/e2e_full_ui_flow.mjs` (cenários 4 a 8, pelo caminho real da UI).
- **Resultado do teste:** **IMPLEMENTED / VERIFIED** — itens 1 a 5 do contrato confirmados **dinamicamente** (antes os itens 4 e 5 eram marcados como não verificáveis).
- **Itens `UNRESOLVED` do contrato que permanecem fora de escopo:** persistência do audit log entre gerações/reload, diferenciação por severidade de pendência, redação/UX definitiva, e se a mesma política vale para impressão. Não foram implementados nem testados — testá-los inventaria regra não decidida.
- **Responsável pela decisão / aprovação humana:** Leandro Rech (contrato definido e aprovado em 2026-08-15).

### [CI-01 / R-01] ⚠ CONFLITO ABERTO — edição manual libera cópia sem confirmação nem auditoria

- **Estado:** **BLOQUEADOR ABERTO — NÃO CORRIGIDO NESTA BRANCH.**
- **Comportamento atual (herdado de `main`, commit `827126b` de 09/08/2026):** um listener global de `input` chama `setCopyBlocked(false)` a cada digitação em `#output-body` ou `#prefill-editor`. Medido dinamicamente: com pendência crítica ativa, uma única digitação leva `COPY_BLOCKED` de `true` para `false` e `copiar()` passa a escrever no clipboard, **sem confirmação e sem qualquer registro de auditoria**. Na pré-evolução iniciada com `baseBlocked=true`, o mesmo ocorre com `PREFILL_STATE.reviewed` permanecendo `false` — ou seja, sem passar por `confirmarRevisaoPreEvolucao()`.
- **Por que é conflito, e não simplesmente bug:** o commit que introduziu esse listener descreve o comportamento como intencional ("release copy/print after manual edits"). Porém ele colide frontalmente com o contrato P0-03, decidido e aprovado depois, e com R-01 de `REGRESSION_RISKS.md`, `docs/REGRAS_CLINICAS.md` e os critérios de `AGENTS.md`. Também produz contradição interna no código: `onPreEvolutionEdit()` faz `setCopyBlocked(true)` no mesmo evento e é revertido pelo listener global, que executa depois (bubbling).
- **Teste correspondente:** `tests/characterization/fixtures/e2e_full_ui_flow.mjs`, cenários 3 e 3b — **FAIL na candidata**, com evidência dinâmica registrada.
- **Decisão necessária (humana, não autônoma):** ver seção "Decisão pendente" em `reports/REGRESSION_RISKS.md`.
- **Responsável pela decisão / aprovação humana:** **PENDENTE.**
