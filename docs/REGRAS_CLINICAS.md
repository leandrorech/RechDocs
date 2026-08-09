# Regras clínicas e documentais invariantes

## Princípio central

O RechDocs organiza e transforma informações fornecidas. Ele não completa lacunas por plausibilidade clínica.

## Invariantes

- Dado ausente permanece ausente.
- “Não informado” não equivale a “ausente”, “negado” ou “normal”.
- Uma inferência clinicamente relevante deve permanecer identificável e revisável.
- Conteúdo com inferência não resolvida não deve ser liberado para cópia final sem mecanismo explícito de revisão.
- Datas válidas têm precedência sobre datas ausentes ou inválidas.
- A cronologia deve ser reconstruída pelas fontes, não pela ordem de colagem.
- Unidades não podem ser convertidas ou removidas quando isso puder alterar interpretação.
- Medicamentos devem permanecer nas classes funcionais corretas; sedação, DVA, antimicrobianos/antiparasitários e outras infusões não podem ser misturados silenciosamente.
- As seções dedicadas `ANTITROMBÓTICOS EM USO` e `ANTITROMBÓTICOS PRÉVIOS/SUSPENSOS` não pertencem mais ao template final do RechDocs v3.4.1 e não devem ser renderizadas, mesmo vazias.
- Exames pertencem à seção de exames; não devem ser distribuídos em narrativa sem regra explícita.
- Reformulações não podem introduzir causalidade, gravidade ou diagnóstico que não conste na fonte.
- O texto final deve permitir rastrear transformações clinicamente relevantes.

## Regras de reconciliação documental

- Identificar o tipo e a origem de cada documento antes de consolidar seu conteúdo (ex.: evolução UTI, parecer de especialidade, prescrição, laudo).
- Preservar especialidade e data de interconsultas. Um parecer identificado como `INFECTOLOGIA (09/08)` deve permanecer rastreável como Infectologia de 09/08 no resultado.
- Conduta de especialista não deve ser silenciosamente convertida em conduta consolidada do intensivista.
- Divergências entre documentos ou entre recomendações do mesmo documento não devem ser resolvidas por plausibilidade. Devem ser preservadas para revisão quando a cronologia não permitir resolução determinística.
- Informação social/contextual, como ausência de rede de apoio, não deve ser automaticamente classificada como `DEMANDA FAMILIAR` sem indicação explícita na fonte.
- Negação explícita deve ser preservada. Exemplo: `MUC NEGA` deve produzir `MEDICAÇÕES DE USO CONTÍNUO: NEGA`, e não seção vazia.
- Não duplicar a mesma informação em HDA, admissão e condutas sem ganho documental.
- Exames solicitados e aguardados devem ser reconciliados no mesmo estado quando se referirem ao mesmo exame, evitando duplicidade de conduta.
- Nomes de medicamentos não devem ser duplicados na renderização. Exemplo inválido: `ARTEMETER + LUMEFANTRINA ARTEMETER 20 MG + LUMEFANTRINA 120 MG`.

## Regras de apresentação final

- Nenhum marcador Markdown interno (`##`, `###`, crases ou outros artefatos de prompt) pode aparecer na evolução final.
- Campos explicitamente negados devem mostrar a negação; campos sem dado permanecem vazios ou com o placeholder definido pelo template, sem converter ausência em negativa.
- Laboratórios devem ser compactados por data e conjunto clínico, preservando associação temporal e unidades quando necessárias. Não transcrever automaticamente campos sem valor clínico de laudos extensos quando houver representação compacta equivalente.
- A compactação é de apresentação, nunca de significado: não apagar anormalidades, datas, unidades necessárias ou relações com a fonte.

## Dados e privacidade

- Não persistir conteúdo clínico além do necessário.
- A ação de limpar sessão deve remover rascunhos, conteúdo clínico, resultados e segredos locais relacionados.
- Nunca registrar chave de API em logs.
- Não enviar documentos a serviços não previstos pelo usuário.
