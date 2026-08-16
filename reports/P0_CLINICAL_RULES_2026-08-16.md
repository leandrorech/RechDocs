# RechDocs v3.4.1 — P0 clinical rules — 2026-08-16

Implementação baseada nas decisões funcionais confirmadas nesta rodada.

## Regras aplicadas
- Ventilação: preservado o fix já existente de fronteira por episódio; reintubação não herda parâmetros antigos.
- Pendências: WARN-NOT-BLOCK preservado; edição/cópia/impressão livres com aviso crítico persistente.
- Temporalidade: hoje/ontem/amanhã e intervalos relativos usam a data da fonte; sem data da fonte, a ausência da âncora deve ser declarada explicitamente e nenhuma data é inventada.
- Outras infusões contínuas: somente regime realmente contínuo. BIC/bomba isoladamente não qualifica. Administração 6/6h, 8/8h, 12/12h, 24/24h ou com duração finita é intermitente; negação explícita de continuidade/intermitência também prevalece sobre palavras isoladas como “contínuo”.
- Laboratórios: apenas o HMG tem filtro específico de componentes (Hb/Ht/Leuco/Plaq). Exames que não são componentes excluídos do HMG são preservados integralmente.
- Unidades: preservadas no estado estruturado, omitidas da apresentação quando redundantes; reaparecem apenas quando o mesmo analito tiver unidades conflitantes e for necessário desambiguar.
- Exames: qualquer exame deve ser extraído; desconhecidos usam tipo `outro`; data, hora e unidade individual são preservadas. Apenas duplicata exata de nome+resultado+unidade+data+hora pode ser deduplicada.
- Interconsultas: solicitação não equivale a parecer realizado; status ampliados; ausência de data fica explícita no documento. Avaliações da mesma especialidade no mesmo dia permanecem distintas quando hora, status, motivo ou parecer diferirem.

## Revisão independente do PR #5
Foram corrigidos durante a revisão:
- vazamento de unidade no 2º/3º item de `Array.map(formatCompactExam)` por uso acidental do índice como `showUnit`;
- deduplicação de exames que ignorava hora/unidade;
- deduplicação de interconsultas que ignorava hora/motivo/parecer;
- falso positivo de “não contínuo”/“intermitente” no classificador de infusão contínua;
- cobertura de expressões temporais como “há um mês” e “semana passada”;
- fechamento garantido do Chromium nos testes mesmo quando uma asserção falhar.

## Não alterado
- Baseline `baseline/rech_docs_v3_3_12_P1.html` permanece intocada.
- Não houve reescrita do `ClinicalState` nem criação de parser paralelo.
