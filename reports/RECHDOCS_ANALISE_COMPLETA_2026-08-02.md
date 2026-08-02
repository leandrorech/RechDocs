# RechDocs — Análise completa da v3.4.1

**Data:** 02/08/2026  
**Baseline de linhagem:** `rech_docs_v3_3_12_P1.html`  
**Referência funcional:** `RechDocs_v3.4.0.html`  
**Candidata auditada:** `RechDocs_v3.4.1.html`

## Veredito executivo

A v3.4.1 é uma consolidação estruturalmente correta da baseline v3.3.12-P1 com a nova interface de pré-evolução. Ela preserva todas as funções nomeadas da baseline e adiciona os módulos de pré-evolução, compactação de exames, revisão, impressão e encerramento de sessão. Contudo, **não deve ser promovida como versão estável ou clinicamente validada** neste estado.

O motivo principal é objetivo: a candidata falhou em dois testes ventilatórios clinicamente críticos que a referência v3.4.0 passa. Além disso, a política de cópia implementada não corresponde à decisão mais recente do usuário, segundo a qual pendências devem gerar alerta e confirmação, mas sempre deve existir uma opção explícita de **“Copiar mesmo assim”**.

Classificação recomendada: **v3.4.1-RC bloqueada para promoção**, apta apenas para correção e regressão com dados sintéticos.

## Escopo e evidências

Foram comparados os três HTMLs reais, o pacote de consolidação, sua especificação clínica e a suíte `test_rechdocs_v340.mjs`.

- v3.3.12-P1: 205.250 bytes, 3.321 linhas, SHA-256 `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667`.
- v3.4.0: 187.738 bytes, 2.951 linhas, SHA-256 `6c8e823bae12d3bfd9c577375adaf888f19f1babac35f1c04ee67534c3dd0073`.
- v3.4.1: 216.381 bytes, 3.528 linhas, SHA-256 `c57b9e01cbcead0d8878f3c28d79c007c2bfec91fff272d04af39ebe25e1e2e0`.
- Diff baseline → candidata: 221 inserções e 14 remoções.
- Funções nomeadas: baseline 118; referência 96; candidata 133.
- Nenhuma função nomeada da baseline desapareceu na candidata.
- Auditoria estática da candidata: passou; JavaScript válido, 65 IDs, nenhum ID duplicado, sem `eval`, `new Function` ou `document.write`.
- Não foram encontrados handlers inline órfãos nem referências `getElementById` para IDs ausentes.
- A suíte original passa integralmente na v3.4.0.
- A mesma suíte, apontada para a v3.4.1, falha nos testes ventilatórios descritos abaixo.

Não foram executados: chamadas reais aos provedores, teste com credenciais, dados clínicos reais, pentest dinâmico, validação cross-browser completa, impressão física, conversão real de PDF em vários navegadores ou validação institucional/LGPD.

## Achados críticos — P0

### P0-01 — Vazamento de parâmetros do episódio ventilatório anterior

Caso sintético testado:

1. intubado em VCV, PEEP 8, VC 420 em 01/07;
2. extubado em 02/07;
3. reintubado em PCV, FiO2 40 em 03/07, sem PEEP ou VC informados.

Resultado esperado: o novo episódio deve conter PCV e FiO2 40, mas **não pode herdar** PEEP 8 ou VC 420 do episódio encerrado.

Resultado observado na v3.4.1: `PEEP = 8` permaneceu no estado resolvido; a suíte interrompeu nessa falha. A baseline v3.3.12-P1 apresenta a mesma falha. A referência v3.4.0 passa.

Risco: criação de um estado ventilatório híbrido, cronologicamente impossível, com parâmetros antigos apresentados como atuais. Em uma pré-evolução, isso pode documentar suporte ventilatório incorreto.

Correção exigida: portar seletivamente da v3.4.0 a lógica de delimitação de episódios ventilatórios, sem substituir o restante do `ClinicalState`. Extubação deve fechar o episódio; reintubação deve iniciar estado novo, herdando apenas atributos explicitamente pertencentes ao novo episódio.

### P0-02 — Empate “VM ativa × extubado” não gera conflito bloqueante

Caso sintético testado: duas menções no mesmo documento, com mesma data, hora e ordem; uma indica intubação/VM ativa e outra extubação.

Resultado esperado: conflito ventilatório explícito, sem escolha silenciosa de estado.

Resultado observado na v3.4.1: `engine.conflitos` não contém o conflito bloqueante esperado. A baseline também falha; a v3.4.0 passa.

Risco: seleção determinística indevida diante de duas condições mutuamente exclusivas, ocultando uma contradição de alto impacto.

Correção exigida: portar a detecção específica de empate ventilatório da v3.4.0 e criar testes para combinações intubado/extubado, TOT/TQT, VM invasiva/espontânea e reintubação.

### P0-03 — Política de cópia contradiz a decisão operacional vigente

A candidata desabilita o botão e retorna de `copiar()` quando `COPY_BLOCKED=true`. Também impede impressão. Não existe botão ou fluxo “Copiar mesmo assim”.

A regra vigente definida posteriormente é:

- pendências e inferências continuam visíveis;
- a primeira tentativa de cópia deve alertar;
- deve exigir confirmação humana inequívoca;
- deve sempre permitir **“Copiar mesmo assim”**;
- a ação forçada deve permanecer evidente e, idealmente, auditável durante a sessão.

Portanto, o código e vários textos da interface/documentação estão desatualizados. A correção não deve simplesmente remover `COPY_BLOCKED`; deve convertê-lo em um estado de **retenção com override consciente**.

## Achados altos — P1

### P1-01 — Edição manual invalida a liberação, mas a rastreabilidade fica obsoleta

O comportamento positivo existe: qualquer edição chama `onPreEvolutionEdit()`, marca `reviewed=false` e bloqueia novamente a saída. O usuário precisa atualizar o preview e confirmar revisão.

Entretanto, após editar:

- o texto do preview é substituído por `textContent`;
- a trilha `traceItems` continua baseada no texto anterior;
- não há nova validação de transformações não declaradas;
- o painel de rastreabilidade pode descrever trechos que já não existem ou deixar de descrever conteúdo novo;
- a confirmação humana libera a cópia sem registrar quais trechos foram alterados.

Recomendação: ao editar, gerar diff entre snapshot e texto atual; mostrar adições/remoções; invalidar marcações antigas incompatíveis; guardar em memória um registro de revisão manual. Não é necessário reenviar o texto à IA para isso.

### P1-02 — A suíte entregue testa a v3.4.0, não a v3.4.1

`test_rechdocs_v340.mjs` carrega explicitamente `RechDocs_v3.4.0.html`. Portanto, sua execução verde não valida a candidata. Ao redirecionar o teste para a v3.4.1, foram reveladas as falhas P0-01 e P0-02.

Também não há, no pacote inicial, os entregáveis finais previstos: `FUNCTION_COMPARISON.md`, `IMPLEMENTATION_PLAN.md`, `CHANGE_IMPACT.md`, `TEST_RESULTS.md` e testes de caracterização completos. O `CHANGELOG.md` do pacote ainda afirma “Ainda não implementado”, embora exista uma candidata separada.

### P1-03 — Compactação de exames precisa de mais caracterização

Pontos positivos:

- opera sobre clone/representação, sem mutar o array clínico original;
- preserva unidades;
- separa LAB, GASO, CULTURAS, IMAGEM e OUTROS;
- mantém exames sem data em grupo explícito;
- ordena por data/hora e remove apenas duplicatas consideradas exatas.

Riscos remanescentes:

- a chave de deduplicação não inclui `tipo`; dois itens iguais classificados em grupos diferentes podem colidir;
- o agrupamento visual usa a string bruta da data, de modo que formas semanticamente equivalentes podem criar grupos separados;
- deve-se testar datas sem ano, anos diferentes, horas diferentes, resultados repetidos, unidades divergentes, exames homônimos e arrays legados;
- a formatação atual difere da esperada pela suíte da v3.4.0, portanto os testes precisam declarar qual apresentação é canônica.

## Achados moderados — P2

### P2-01 — Encerramento de sessão é uma melhoria, mas a semântica deve ser explícita

`reiniciarTudo()` limpa o caso atual, anexos, texto, resultado e editor. `encerrarSessaoCompleta()` também remove chaves temporárias de sessão e oferece remoção opcional das chaves permanentes.

Isso é coerente se “encerrar sessão” significar limpar dados clínicos e segredos temporários, preservando configurações permanentes mediante escolha explícita. A interface não deve afirmar que removeu “todas as chaves” quando o usuário optou por preservar uma chave permanente.

### P2-02 — Superfície `innerHTML` permanece pequena, mas deve continuar restrita

Há cinco atribuições por `innerHTML`, usadas para categorias, miniaturas e modelos. A saída clínica é exibida com `textContent`/nós DOM, o que é favorável contra XSS oriundo do modelo.

As atribuições restantes usam valores internos, mas devem ser testadas para garantir que identificadores de anexos, URLs de miniaturas e configurações não possam receber conteúdo não confiável. Preferência futura: substituir montagem HTML por `createElement`, `textContent` e listeners.

### P2-03 — Dependência de provedores externos e LGPD

O arquivo realiza cinco fluxos `fetch` para provedores externos. A arquitetura local/offline não significa processamento clínico offline quando a IA é usada. Para uso institucional ainda faltam, no mínimo: política de minimização/anonimização, base legal, contratos com operadores, retenção/região, logs, indisponibilidade, consentimento/aviso adequado e proibição de envio de identificadores desnecessários.

## Avaliação por domínio

| Domínio | Avaliação | Síntese |
|---|---|---|
| Linhagem/canonicidade | Boa | v3.4.1 é derivada da v3.3.12-P1; v3.4.0 não substituiu o núcleo. |
| Integridade estrutural | Boa | Sintaxe, IDs e handlers passaram; nenhuma função da baseline foi removida. |
| Reconciliação clínica | Bloqueada | Dois defeitos ventilatórios P0 demonstrados. |
| Pré-evolução | Promissora | Fonte única e clone do estado; revisão manual existe, mas trilha fica obsoleta. |
| Exames cumulativos | Parcial | Boa base, cobertura insuficiente de deduplicação e normalização temporal. |
| Segurança de cópia | Incompatível | Ainda usa bloqueio absoluto, contrariando a regra atual de override confirmado. |
| Privacidade/sessão | Parcialmente boa | Novo caso e encerramento de sessão melhoraram; governança institucional pendente. |
| Segurança web | Razoável, não concluída | Saída clínica segura; cinco `innerHTML`; sem pentest dinâmico. |
| Testes | Insuficiente | Suíte antiga aponta para v3.4.0; candidata falha em testes clínicos críticos. |
| Prontidão para produção | Não | Requer correções P0 e regressão ampliada. |

## Plano recomendado de correção

### Patch 3.4.1-P0

1. Corrigir delimitação de episódios ventilatórios, portando apenas a lógica validada da v3.4.0.
2. Restaurar conflito bloqueante para empate intubado/VM ativa × extubado.
3. Implementar fluxo de alerta + confirmação + “Copiar mesmo assim”, sem apagar pendências.
4. Criar `test_rechdocs_v341.mjs` que carregue a candidata real.
5. Reexecutar toda a caracterização da baseline e os casos da v3.4.0.

### Patch 3.4.1-P1

1. Adicionar diff e trilha de edição manual.
2. Incluir `tipo` na deduplicação de exames ou documentar/testar uma regra clínica equivalente.
3. Normalizar a chave temporal de apresentação sem inventar ano/data.
4. Testar cancelamento, nova edição, confirmação, impressão e override de cópia.
5. Atualizar changelog e relatórios de impacto.

### Gate mínimo para RC clínica

- datas impossíveis e horas impossíveis;
- precedência datado × não datado;
- ação executada × plano futuro;
- iniciado/mantido/suspenso/retirado;
- VM ativa × extubado;
- extubação/reintubação sem herança de parâmetros;
- dispositivos retirados × ativos;
- ATB, antitrombóticos, DVA, sedação, BNM e outras infusões separados;
- exames cumulativos, sem perda de unidade ou data;
- interconsultas acumuladas e datadas;
- inferência/reformulação e transformação não declarada;
- edição manual invalida revisão;
- cópia normal e “Copiar mesmo assim” com confirmação;
- emergência sem seções indevidas;
- limpeza entre pacientes e encerramento de sessão;
- fluxo sem chave para documento complementar;
- PDF em processamento bloqueia geração prematura;
- execução em Chrome/Edge atual e abertura direta por `file://`.

## Decisão recomendada

1. Manter `rech_docs_v3_3_12_P1.html` como **autoridade de linhagem**, não como prova de ausência de bugs.
2. Não promover `RechDocs_v3.4.0.html` como produto completo, apesar de ela conter correções ventilatórias úteis.
3. Congelar a candidata atual como evidência `v3.4.1-pre-P0`.
4. Produzir uma nova candidata após port seletivo dos dois mecanismos ventilatórios e implementação da política atual de cópia.
5. Só então discutir integração com Shift Sheet/Passagem de Plantão, para evitar propagar estado clínico incorreto para outros módulos.

## Estado do repositório remoto

O endereço `leandrorech/RechDocs` não pôde ser lido pela conexão atual: as consultas retornaram 404. Isso pode representar repositório privado não autorizado para esta conexão, repositório ainda vazio ou caminho/visibilidade divergente. Por isso, esta análise é do conteúdo real localizado nos artefatos persistidos, não uma confirmação do estado da branch remota.
