# RechDocs v3.4.1 — P0 clinical rules — 2026-08-16

Implementação baseada nas decisões funcionais confirmadas nesta rodada.

## Regras aplicadas
- Ventilação: preservado o fix já existente de fronteira por episódio; reintubação não herda parâmetros antigos.
- Pendências: WARN-NOT-BLOCK preservado; edição/cópia/impressão livres com aviso crítico persistente.
- Temporalidade: hoje/ontem/amanhã e intervalos relativos usam a data da fonte; sem data da fonte, a ausência da âncora deve ser declarada explicitamente e nenhuma data é inventada.
- Outras infusões contínuas: somente regime realmente contínuo. BIC/bomba isoladamente não qualifica. Administração 6/6h, 8/8h, 12/12h, 24/24h ou com duração finita é intermitente.
- Laboratórios: apenas HMG tem filtro específico (Hb/Ht/Leuco/Plaq). Todos os demais exames são preservados.
- Unidades: preservadas no estado estruturado, omitidas da apresentação quando redundantes.
- Exames: qualquer exame deve ser extraído; desconhecidos usam tipo `outro`; temporalidade individual preservada.
- Interconsultas: solicitação não equivale a parecer realizado; status ampliados; ausência de data fica explícita no documento.

## Não alterado
- Baseline `baseline/rech_docs_v3_3_12_P1.html` permanece intocada.
- Não houve reescrita do `ClinicalState` nem criação de parser paralelo.
