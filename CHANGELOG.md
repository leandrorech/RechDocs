# Changelog

## [3.4.1] — candidata construída, aguardando eleição a canônica

### Objetivo

Consolidar a baseline clínica segura 3.3.12-P1 com recursos selecionados da linha 3.4.0.

### Estado

- `output/RechDocs_v3.4.1.html` construído (baseline + pré-evolução editável, compactação cumulativa de exames, preview/renderização, preenchimento prévio).
- Regras clínicas P0 revisadas e corrigidas em 2026-08-16 (`reports/P0_CLINICAL_RULES_2026-08-16.md`): vazamento entre episódios ventilatórios, deduplicação de exames/interconsultas, classificador de infusão contínua, expressões temporais relativas.
- RELEASE GATE de 2026-08-15: P0-01, P0-02a/b, P0-03, CI-05 e os 12 cenários E2E-01 passando na candidata (`reports/TEST_RESULTS.md`).
- Política de saída vigente desde 2026-08-15: cópia/impressão nunca bloqueadas; alerta crítico permanece visível até resolução real da pendência (não é removido por edição manual).
- **Cobertura ainda parcial**: riscos R-03, R-04, R-06, R-08 a R-16 de `reports/REGRESSION_RISKS.md` seguem sem teste dedicado. Sem teste cross-browser, sem chamada real a provedor de IA, sem validação institucional/LGPD.
- Ainda **não eleita canônica** — consulte `AGENTS.md` e `reports/TEST_RESULTS.md` para os critérios pendentes.
