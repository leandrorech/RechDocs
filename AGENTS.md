# AGENTS.md — RechDocs

## Autoridade e escopo

Este diretório contém duas linhas divergentes do RechDocs. A única baseline clínica canônica é:

`baseline/rech_docs_v3_3_12_P1.html`

O arquivo abaixo é somente referência de funcionalidades e não pode substituir o núcleo clínico:

`reference/RechDocs_v3.4.0_reference.html`

O objetivo é produzir `output/RechDocs_v3.4.1.html` por consolidação seletiva, com relatório e testes.

## Regras obrigatórias

1. Leia integralmente `TASK.md`, `docs/REGRAS_CLINICAS.md`, `docs/ESPECIFICACAO_V3.4.1.md` e os relatórios prévios antes de editar.
2. Preserve integralmente as salvaguardas clínicas da baseline, salvo correção explícita, documentada e testada.
3. Não invente dados, diagnósticos, cronologia, doses, unidades, relações causais ou regras clínicas.
4. Não transforme ausência de informação em negação clínica.
5. Não remova bloqueios de cópia, alertas, rastreabilidade, reconciliação, validação cronológica ou normalização de unidades.
6. Qualquer mudança clinicamente relevante deve aparecer em `reports/CHANGE_IMPACT.md` com comportamento anterior, novo comportamento, risco e teste correspondente.
7. Não edite os arquivos em `baseline/` e `reference/`. Trabalhe em cópias dentro de `work/` ou diretamente no novo arquivo de saída.
8. Antes de implementar, gere:
   - `reports/FUNCTION_COMPARISON.md`;
   - `reports/IMPLEMENTATION_PLAN.md`;
   - testes de caracterização da baseline.
9. Execute os testes e registre comandos, resultados, falhas e limitações em `reports/TEST_RESULTS.md`.
10. Não declare sucesso quando houver teste não executado ou dependência indisponível.
11. Não use rede, não envie conteúdo clínico e não adicione telemetria.
12. Não grave chave de API em arquivo, código-fonte, log ou relatório.
13. Dados clínicos e chaves armazenados localmente devem ter limpeza de sessão explícita e verificável.
14. Não faça publicação, deploy, upload ou push para GitHub.
15. Pare antes de qualquer decisão clínica não determinística e registre o conflito.

## Estratégia de implementação

- Basear todo o resultado na v3.3.12-P1.
- Portar da v3.4.0 apenas os recursos aprovados de pré-evolução e interface relacionados.
- Preferir funções puras, adaptadores pequenos e mudanças localizadas.
- Evitar reescrita ampla do arquivo single-file nesta etapa.
- Manter compatibilidade com uso offline e abertura direta do HTML.
- Não adicionar dependências externas em runtime.

## Critérios mínimos de conclusão

- Novo HTML abre sem erro JavaScript inicial.
- Sem IDs HTML duplicados.
- Handlers referenciam elementos existentes.
- Sem `eval`, `new Function` ou execução dinâmica equivalente.
- Salvaguardas da baseline permanecem demonstradas por testes.
- Pré-evolução funciona sem enfraquecer bloqueios clínicos.
- Limpeza de sessão remove dados clínicos e segredo local associado.
- Relatórios exigidos estão completos.
