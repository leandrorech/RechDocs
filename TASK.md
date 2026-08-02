# Tarefa principal — Consolidar RechDocs v3.4.1

## Resultado esperado

Criar uma versão consolidada em:

`output/RechDocs_v3.4.1.html`

A v3.3.12-P1 é a baseline clínica canônica. A v3.4.0 é somente referência para quatro grupos funcionais:

1. pré-montagem de evolução editável;
2. compactação cumulativa de exames;
3. renderização/preview da pré-evolução;
4. modo de preenchimento prévio e controles associados.

## Fase 1 — análise sem edição

1. Inventariar funções, classes, constantes, IDs, handlers, storage keys e fluxos dos dois HTMLs.
2. Comparar por função, não apenas por diff textual.
3. Identificar:
   - recursos exclusivos;
   - regressões;
   - conflitos de implementação;
   - funções duplicadas;
   - IDs duplicados;
   - handlers órfãos;
   - alterações em regras clínicas;
   - mudanças de armazenamento e API.
4. Criar `reports/FUNCTION_COMPARISON.md`.
5. Criar `reports/IMPLEMENTATION_PLAN.md` antes de modificar código.
6. Criar testes de caracterização para a baseline.

## Fase 2 — implementação

1. Copiar a baseline para o arquivo de saída.
2. Portar seletivamente os recursos aprovados da referência.
3. Resolver conflitos em favor da baseline clínica.
4. Isolar funções clínicas sensíveis quando isso puder ser feito sem reescrita arriscada.
5. Não alterar textos ou regras clínicas sem justificativa registrada.
6. Atualizar a identificação visual e interna para v3.4.1.

## Fase 3 — validação

Validar no mínimo:

- parsing/importação de documentos;
- extração e reconciliação;
- cronologia e precedência de datas;
- inferências não resolvidas;
- bloqueio de cópia;
- normalização de unidades;
- classificação de medicações e infusões;
- edição da evolução;
- geração da pré-evolução;
- compactação de exames por data;
- preview e impressão;
- exportação/cópia final;
- limpeza de sessão;
- funcionamento offline;
- ausência de erros no console durante o fluxo principal.

## Entregáveis

- `output/RechDocs_v3.4.1.html`
- `reports/FUNCTION_COMPARISON.md`
- `reports/IMPLEMENTATION_PLAN.md`
- `reports/CHANGE_IMPACT.md`
- `reports/TEST_RESULTS.md`
- testes novos em `tests/`
- `CHANGELOG.md` atualizado

## Proibições

- Não substituir a baseline pela referência.
- Não editar os originais.
- Não publicar ou fazer push.
- Não declarar segurança clínica apenas com teste sintático.
- Não suprimir falhas para obter testes verdes.
