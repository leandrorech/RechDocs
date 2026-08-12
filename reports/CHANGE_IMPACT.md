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
- **Resultado do teste:** **PENDENTE DE TESTE COMPORTAMENTAL.**
- **Responsável pela decisão / aprovação humana:** pendente.
