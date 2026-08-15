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
- **Risco clínico:** edição pode contornar rastreabilidade (ver R-01/R-07 em `reports/REGRESSION_RISKS.md`).
- **Mitigação:** contrato vigente não bloqueia a saída; o controle é a sinalização crítica, que **sobrevive à edição manual** — verificado dinamicamente.
- **Teste correspondente:** `e2e_full_ui_flow.mjs` (cenários 8/8d) e `p0_03_copy_override_policy.mjs` (critério 5).
- **Resultado do teste:** **VERIFIED** — ver entrada [CI-01 / R-01] abaixo.
- **Responsável pela decisão / aprovação humana:** Leandro Rech (2026-08-15).

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

### [P0-03] Política de saída: sinalização crítica máxima, sem bloqueio

> **Contrato revisado em 2026-08-15 por decisão do produto.** A entrada anterior desta seção descrevia
> bloqueio + override ("Copiar mesmo assim" + `confirm()` + audit log), implementado no commit
> `53d7378`. **Esse contrato foi cancelado** — a premissa de que o sistema deveria impedir a saída
> estava incorreta.

- **Comportamento anterior (baseline v3.3.12-P1 e candidata até `53d7378`):** pendência crítica
  bloqueava a saída. Na baseline, bloqueio absoluto (`copiar()`/`imprimirDocumento()` retornavam sem
  ação); em `53d7378`, bloqueio com override confirmado e auditado. Na referência v3.4.0 não havia
  nem bloqueio nem sinalização.
- **Novo comportamento (v3.4.1):** `ALERTA CRÍTICO VISUAL → o usuário vê a inconsistência →
  cópia/impressão permanecem liberadas`. Não existe estado em que copiar/imprimir fiquem
  indisponíveis. Nenhuma confirmação é exigida para copiar.
- **Sinalização (o que substitui o bloqueio):**
  - banner grande e vermelho no topo do preview (`#critical-banner`), com o texto
    *"⚠ Atenção — existem inconsistências/pendências críticas. Revise as informações antes de usar
    este documento."*;
  - lista concreta das pendências imediatamente abaixo (`#critical-banner-list`);
  - aviso permanente junto aos botões Copiar/Imprimir (`#copy-warn`);
  - regra `@media print` própria: **o aviso acompanha a impressão/PDF**;
  - o alerta **sobrevive à edição manual** e só desaparece quando a condição que o gerou for
    recalculada (nova geração sem pendências).
- **Auditoria sem fricção:** `registrarSaidaComAlerta()` grava em `CRITICAL_OUTPUT_LOG` e no
  `#audit-list` que a cópia/impressão ocorreu com alerta ativo — **depois** da ação, sem impedi-la e
  sem exigir confirmação.
- **Risco clínico:** documento usado com pendência não resolvida. Mitigação: a inconsistência é
  impossível de ignorar (banner + lista + aviso nos botões + aviso impresso) e a saída fica
  registrada. **A decisão de usar o documento é do médico, e o sistema não a impede.**
- **Removido:** `COPY_BLOCKED`, `setCopyBlocked()`, `copiarComOverride()`,
  `currentCopyBlockReason()`, `COPY_OVERRIDE_LOG` e o botão `#btn-copiar-mesmo-assim`.
- **Detecção preservada integralmente:** `buildCriticalPendencies()`, `validateTraceability()`,
  `validateUndeclaredTransformations()` e os conflitos do `ClinicalState` não foram alterados — mudou
  a consequência, não a detecção.
- **Teste correspondente:** `p0_03_copy_override_policy.mjs` (8 critérios, incluindo verificação de
  que os símbolos do contrato antigo não reapareceram) e `e2e_full_ui_flow.mjs` (11 cenários).
- **Resultado do teste:** **IMPLEMENTED / VERIFIED** — candidata PASS nas duas fixtures.
- **Responsável pela decisão / aprovação humana:** Leandro Rech (decisão de contrato, 2026-08-15).

### [CI-01 / R-01] Edição manual e sinalização crítica — RESOLVIDO

- **Estado:** **✅ RESOLVIDO POR MUDANÇA DE CONTRATO** (2026-08-15).
- **Problema identificado no release gate:** um listener global de `input` chamava
  `setCopyBlocked(false)` a cada digitação em `#output-body`/`#prefill-editor`, liberando a saída sem
  confirmação nem registro — bypass da política de cópia então vigente, confirmado dinamicamente.
- **Resolução:** a decisão do produto eliminou a premissa. Sem bloqueio, não há bypass possível — a
  saída já está sempre disponível por desenho. O requisito remanescente é que **a edição não apague a
  sinalização crítica**; o listener foi alterado para não tocar no estado de alerta e passou a exibir
  mensagem reforçando que as pendências continuam ativas.
- **Verificado:** com alerta ativo, após um evento `input` no preview e no `prefill-editor`, o banner
  permanece visível e `CRITICAL_ALERT_ACTIVE` permanece `true`; a cópia continua funcionando.
- **Teste correspondente:** `p0_03_copy_override_policy.mjs` (critério 5) e `e2e_full_ui_flow.mjs`
  (cenários 8 e 8d).
- **Responsável pela decisão / aprovação humana:** Leandro Rech (decisão de contrato, 2026-08-15).
