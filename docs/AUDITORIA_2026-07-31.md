# RechDocs — Reavaliação e auditoria

**Data:** 31/07/2026  
**Candidato recomendado:** `RechDocs_v3.3.12-P1_AUDITADO.html`

## Veredito

A versão tecnicamente mais avançada encontrada é a **v3.3.12-P1**, apesar de existir um arquivo chamado **v3.4.0**. A numeração 3.4.0 representa uma ramificação funcional com pré-evolução editável, mas não incorpora todas as correções clínicas e mecanismos de rastreabilidade presentes na 3.3.12-P1.

A v3.3.12-P1 foi preservada sem alteração de lógica nesta entrega e renomeada como auditada. Ela passou por auditoria estática estrutural e sintática.

## Arquivos comparados

- `rech_docs_v3_3_10(3).html`
- `rech_docs_v3_3_11_P0_1.html`
- `rech_docs_v3_3_12_P1.html`
- `RechDocs_v3.4.0(1).html`

## Achados favoráveis da v3.3.12-P1

1. JavaScript sintaticamente válido (`node --check`).
2. Nenhum ID HTML duplicado.
3. Nenhum handler inline apontando para função inexistente.
4. Nenhuma referência `getElementById()` para elemento ausente.
5. Não utiliza `eval()` nem `new Function()`.
6. Mantém reconciliação determinística e `ClinicalState`.
7. Adiciona rastreabilidade visual de inferências e reformulações.
8. Bloqueia cópia quando há inferência clínica não resolvida.
9. Inclui validação de transformações não declaradas.
10. Melhora validações clínicas de ventilação, eletrólitos, cronologia, unidades e resultados pós-transfusão.
11. Separa antitrombóticos, sedação e outras infusões em renderizadores próprios.
12. Corrige limites Unicode em detecção de planos futuros, reduzindo risco de registrar intenção como ação já executada.

## Diferença essencial em relação à v3.4.0

A v3.4.0 contém:

- pré-evolução editável;
- compactação cumulativa de exames;
- renderização específica da pré-evolução;
- modo de preenchimento prévio.

Porém, a v3.3.12-P1 contém aproximadamente 26 funções adicionais de segurança, normalização, rastreabilidade e validação que não existem na v3.4.0. Portanto, promover a 3.4.0 apenas pelo número implicaria regressão clínica e de auditoria.

## Limitações e riscos remanescentes

### 1. Ramificações não consolidadas

A funcionalidade de pré-evolução da v3.4.0 ainda não foi portada para a base 3.3.12-P1. O próximo release correto deveria ser **v3.4.1**, criado sobre a 3.3.12-P1 e recebendo seletivamente o módulo de pré-evolução.

### 2. Chave de API e armazenamento local

O aplicativo usa armazenamento local no navegador. Em computador hospitalar compartilhado, chave de API e conteúdo clínico podem permanecer no perfil do navegador. Recomenda-se:

- opção explícita de sessão temporária;
- botão de limpeza completa;
- expiração de dados;
- não persistir chave por padrão;
- aviso de uso em equipamento compartilhado;
- política formal de LGPD e logs sem conteúdo sensível.

### 3. Uso de `innerHTML`

Foram encontradas atribuições por `innerHTML`. Não foi observado código dinâmico por `eval`, porém qualquer conteúdo derivado de modelo ou texto clínico deve continuar sendo renderizado por `textContent` ou sanitização robusta. A saída rastreável da 3.3.12 melhora esse ponto, mas a superfície deve ser revista antes de implantação institucional.

### 4. Dependência de serviços externos

Há chamadas `fetch()` para provedores de IA e processamento de PDF. Isso exige revisão de:

- consentimento e base legal;
- contrato com operador/suboperador;
- região e retenção dos dados;
- anonimização/minimização;
- política de indisponibilidade e fallback;
- prevenção de envio acidental de identificadores desnecessários.

### 5. Ausência de suíte automatizada

A auditoria foi estática. Não há evidência, no arquivo entregue, de suíte automatizada cobrindo extração, reconciliação, renderização e regressões clínicas. Antes de uso institucional, recomenda-se criar testes com casos sintéticos para:

- ação executada versus plano futuro;
- suspensão versus manutenção de medicamento;
- datas conflitantes;
- extubado versus ventilação mecânica ativa;
- unidades duplicadas;
- hipocalemia com insulina;
- antitrombóticos e infusões;
- passagem de plantão;
- emergência sem campos indevidos;
- inferências que devem bloquear cópia.

## Recomendação de versionamento

- **Canônico atual:** v3.3.12-P1 auditada.
- **Não promover isoladamente:** v3.4.0 existente.
- **Próxima versão:** v3.4.1, baseada na v3.3.12-P1, com port seletivo e testado da pré-evolução editável e Shift Sheet.

## Escopo desta auditoria

Incluiu inspeção de conteúdo real, comparação de funções, sintaxe JavaScript, integridade DOM/handlers, padrões perigosos básicos e análise funcional das diferenças. Não incluiu execução com dados clínicos reais, teste de API com credenciais, teste cross-browser, pentest dinâmico ou validação institucional/LGPD formal.
