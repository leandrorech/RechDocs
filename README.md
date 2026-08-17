# RechDocs

Ferramenta HTML standalone (RECH Docs) de apoio à documentação clínica: parsing/importação de exames e evolução, cronologia, normalização de unidades, classificação de medicações/infusões, geração de pré-evolução e exportação, com bloqueios e alertas clínicos de segurança.

## Estado atual

- **Baseline clínica canônica:** `baseline/rech_docs_v3_3_12_P1.html` — não editar diretamente.
- **Referência de funcionalidades (não canônica):** `reference/RechDocs_v3.4.0_reference.html` — não editar diretamente.
- **Candidata consolidada:** `output/RechDocs_v3.4.1.html` — baseline + recursos aprovados da referência (pré-evolução editável, compactação de exames, preview, preenchimento prévio).
- Revisão de regras clínicas P0 concluída em 2026-08-16 (`reports/P0_CLINICAL_RULES_2026-08-16.md`).
- Auditoria estática e testes de caracterização passando — ver `reports/TEST_RESULTS.md`.

## Estrutura

- `baseline/`, `reference/`, `output/` — os três HTMLs relevantes.
- `docs/` — regras clínicas, especificação v3.4.1, auditorias.
- `reports/` — comparação de funções, plano de implementação, impacto de mudanças, resultados de teste.
- `tests/` — auditoria estática e testes de caracterização (Playwright).

## Antes de editar

Leia `AGENTS.md` — define as regras obrigatórias do projeto (não editar baseline/reference, não inventar dados clínicos, registrar toda mudança clinicamente relevante em `reports/CHANGE_IMPACT.md`, executar e registrar testes antes de declarar sucesso).
