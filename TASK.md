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
3. Resolver conflitos em favor da baseline clínica e das regras documentais atualizadas em 09/08/2026.
4. Isolar funções clínicas sensíveis quando isso puder ser feito sem reescrita arriscada.
5. Não alterar textos ou regras clínicas sem justificativa registrada.
6. Atualizar a identificação visual e interna para v3.4.1.
7. Remover do template final as seções `ANTITROMBÓTICOS EM USO` e `ANTITROMBÓTICOS PRÉVIOS/SUSPENSOS`.
8. Preservar interconsultas com especialidade, data e proveniência.
9. Impedir vazamento de Markdown interno (`##`, `###`, crases de bloco) para a evolução final.
10. Preservar negações explícitas, incluindo `MUC NEGA` -> `MEDICAÇÕES DE USO CONTÍNUO: NEGA`.
11. Deduplicar medicamentos e exames solicitados/aguardados sem apagar temporalidade.
12. Não classificar automaticamente informação social como `DEMANDA FAMILIAR`.
13. Compactar exames para representação clínica útil, preservando anormalidades, datas e unidades necessárias.
14. Não promover condutas de pareceres para condutas autorais do intensivista sem manter a proveniência.

## Fase 3 — validação

Validar no mínimo:

- parsing/importação de documentos;
- extração e reconciliação;
- cronologia e precedência de datas;
- proveniência por documento-fonte;
- inferências não resolvidas;
- bloqueio de cópia;
- normalização de unidades;
- classificação de medicações e infusões;
- interconsultas com especialidade/data;
- edição da evolução;
- geração da pré-evolução;
- compactação de exames por data;
- preview e impressão;
- exportação/cópia final;
- limpeza de sessão;
- funcionamento offline;
- ausência de erros no console durante o fluxo principal;
- regressão obrigatória do caso Brulle Angelo Mangubat Vidal em `tests/fixtures/brulle_2026-08-09_input.txt`.

## Critérios obrigatórios do caso Brulle

O teste deve reprovar a versão se qualquer uma destas condições ocorrer:

- aparecer `ANTITROMBÓTICOS EM USO` ou `ANTITROMBÓTICOS PRÉVIOS/SUSPENSOS`;
- aparecer marcador `##` na evolução final;
- `MUC NEGA` resultar em seção vazia;
- `INFECTOLOGIA (09/08)` desaparecer de `INTERCONSULTAS`;
- ausência de rede de apoio for convertida automaticamente em `DEMANDA FAMILIAR`;
- artemeter/lumefantrina tiver nome duplicado na mesma linha;
- USG de abdome solicitado/aguardado for duplicado sem reconciliação;
- recomendação da Infectologia perder autoria/proveniência;
- laboratório extenso for despejado sem compactação quando houver representação clínica equivalente.

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
- Não declarar segurança clínica apenas com teste sintático.
- Não suprimir falhas para obter testes verdes.
- Não resolver divergência clínica por plausibilidade quando a fonte/cronologia não for determinística.
