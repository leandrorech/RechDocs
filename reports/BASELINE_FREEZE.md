# Freeze do baseline clínico — RechDocs v3.3.12-P1

> Este documento declara o congelamento formal do baseline clínico usado como
> referência comportamental para a characterization suite e para a análise de
> regressão da v3.4.1. O baseline não é declarado "clinicamente correto" por
> este freeze — ele é declarado "comportamento previamente aceito", ponto de
> comparação estável contra o qual divergências do candidato serão
> classificadas como `EXPECTED_CHANGE`, `REGRESSION` ou `UNRESOLVED`.

## Identificação

- **Caminho exato do arquivo:** `baseline/rech_docs_v3_3_12_P1.html`
- **Versão:** `v3.3.12-P1`
- **SHA-256:** `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667`
- **Tamanho:** 205250 bytes
- **Commit Git que introduziu o arquivo:** `4df25351eb4ac4d9c3ca8a7e72a3a6f9934ad8ab` — "add RechDocs source, candidate, reports and tests" (2026-08-02 19:55:31 -0300)
- **Histórico:** `git log --follow` confirma um único commit tocando este caminho desde sua criação — o arquivo nunca foi modificado no repositório.
- **Data deste freeze:** 2026-08-12

## Verificação de integridade

Para reverificar a qualquer momento:

```bash
sha256sum baseline/rech_docs_v3_3_12_P1.html
# esperado: 56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667
```

Se o hash não bater com o valor acima, o baseline foi alterado e este freeze
está **invalidado**.

## Regra de invalidação

Qualquer alteração no arquivo `baseline/rech_docs_v3_3_12_P1.html` — incluindo
mudanças triviais de whitespace — invalida este freeze automaticamente. Um
novo freeze deliberado, com novo hash, novo commit de referência e
justificativa registrada, é obrigatório antes de qualquer characterization ou
regression analysis continuar usando o arquivo alterado como baseline.

## Finalidade

Servir como referência comportamental estável para:

- a characterization suite (`tests/characterization/`), que executa fixtures
  idênticas em baseline e candidato e compara os resultados;
- a análise de regressão dos riscos `R-01`–`R-16` (`reports/REGRESSION_RISKS.md`);
- a validação das mudanças clínicas registradas em `reports/CHANGE_IMPACT.md`.

## Proibições

- Não editar `baseline/rech_docs_v3_3_12_P1.html`.
- Não substituir o baseline pelo candidato ou pela referência v3.4.0.
- Não tratar divergência baseline × candidato como regressão automática —
  classificar conforme `EXPECTED_CHANGE` / `REGRESSION` / `UNRESOLVED`.
