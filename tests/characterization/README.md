# Characterization suite — RechDocs

Compara o comportamento do baseline congelado (`baseline/rech_docs_v3_3_12_P1.html`,
ver `reports/BASELINE_FREEZE.md`) contra o candidato (`output/RechDocs_v3.4.1.html`)
executando as mesmas fixtures nos dois artefatos e classificando toda
divergência observada.

## Decisão de arquitetura

- **Harness primário: Playwright + Chromium headless.** O RechDocs não é um
  conjunto de funções puras — é uma aplicação HTML monolítica com DOM,
  eventos, upload, preview, edição e fluxo de usuário. O harness carrega o
  arquivo `.html` real (baseline ou candidato) sem modificação, simula o
  fluxo relevante e captura o resultado observável.
- **Harness auxiliar: Node/jsdom ou execução JS direta.** Usado apenas quando
  for necessário inspecionar deterministicamente uma estrutura interna ou
  função específica — nunca como árbitro do comportamento global.
- **Não há extração de lógica clínica para módulos `.mjs` isolados.** Isso
  criaria o risco de testar uma representação do código em vez do artefato
  real que será usado clinicamente.
- **O baseline não é "clinicamente correto" por definição.** É "comportamento
  previamente aceito". Toda divergência baseline × candidato é classificada
  como `EXPECTED_CHANGE`, `REGRESSION` ou `UNRESOLVED` — nunca assumida como
  regressão automaticamente, nem descartada automaticamente.

## Comparação em camadas (não diff textual bruto de HTML)

Diff de HTML inteiro gera ruído por whitespace, ordem de atributos e
diferenças cosméticas irrelevantes. O comparador trabalha por camadas:

1. `ClinicalState` / estado estruturado interno → diff semântico (JSON).
2. Exames → lista normalizada estruturada (tipo, data, hora, nome,
   resultado, unidade).
3. Seções clínicas → comparação por seção, não pelo documento inteiro.
4. Preview / output final → normalização mínima de whitespace antes do diff.
5. DOM / estética → só nos testes que dependem especificamente de
   apresentação (ex.: negrito estrutural de títulos).

## Estrutura de diretórios

```text
tests/characterization/
  fixtures/           # casos de entrada clínicos (JSON), preferencialmente
                       # derivados de casos reais já usados no RechDocs —
                       # não casos sintéticos artificiais como fonte primária.
  harness/
    run-characterization.mjs   # orquestra: para cada fixture, roda baseline e candidato
    browser-adapter.mjs        # abre o HTML via Playwright/Chromium, injeta a fixture, aciona o fluxo
    capture-state.mjs          # extrai ClinicalState, preview, output, warnings, console errors, exceções
    normalize-output.mjs       # normalização mínima de whitespace/formatação antes do diff
    compare-results.mjs        # diff em camadas + classificação EXPECTED_CHANGE / REGRESSION / UNRESOLVED
  snapshots/
    baseline/          # saída capturada do baseline por fixture
    candidate/          # saída capturada do candidato por fixture
  reports/              # relatório consolidado por execução (data + resumo por fixture)
```

## O que cada execução captura

- estado clínico interno relevante (`ClinicalState`), quando acessível;
- conteúdo do preview;
- output final (texto pronto para cópia/impressão);
- warnings / alerts exibidos;
- erros de console;
- exceções JS não tratadas;
- invariantes relevantes por fixture (ex.: `d.exames` inalterado após
  `buildExamesCompactos()` — ver `reports/CHANGE_IMPACT.md` CI-05).

## Status atual

Scaffolding apenas — nenhum script do harness foi implementado ainda e
nenhuma fixture foi criada. Próximo passo: definir a origem dos casos
clínicos reais para as primeiras fixtures de alta informação (ver pedido
pendente ao usuário) antes de escrever `browser-adapter.mjs` e
`capture-state.mjs`.
