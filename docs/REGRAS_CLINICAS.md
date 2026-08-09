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
- Reformulações não podem introduzir causalidade, gravidade, diagnóstico, exame físico, estado de consciência, achado negativo ou positivo que não conste na fonte.
- Reformulações também não podem apagar qualificadores clinicamente relevantes explícitos na fonte, como `não soube informar qual`, `não é possível excluir`, `provável`, `sugestivo`, `sem data informada`, pendência ou incerteza diagnóstica.
- O texto final deve permitir rastrear transformações clinicamente relevantes.

## Estrutura documental fixa

- Cada tipo documental possui seu próprio modelo canônico: Admissão, Evolução, Emergência, Documento Complementar e demais modelos aprovados.
- A seleção de estilo de escrita NUNCA altera a estrutura do modelo documental.
- O estilo não pode adicionar, excluir, renomear, reordenar ou fundir seções do template.
- Campos vazios permanecem conforme o placeholder já definido pelo respectivo template.
- A estrutura é responsabilidade do renderizador determinístico; a IA deve fornecer conteúdo para os campos, não redesenhar o documento.

## Estilo de escrita

### Casual

- Mantém a estrutura documental integralmente.
- Atua somente na redação dentro dos campos.
- Preserva a voz médica cotidiana e abreviações usuais já presentes na fonte quando inequívocas.
- Corrige ortografia, acentuação, concordância, pontuação, capitalização e pequenos defeitos sintáticos.
- Deve preferir intervenção mínima: não sofisticar, expandir ou reescrever uma frase correta sem necessidade.
- Não pode transformar `ACV: BRNF 2T SEM SOPROS` em outro conjunto de achados clínicos.
- Não pode acrescentar, por exemplo, `pupilas isocóricas e fotorreagentes` quando isso não estiver explícito na fonte.
- Não pode resumir silenciosamente uma frase clínica de forma que retire incerteza, ressalva, limitação metodológica ou dado anatômico relevante da fonte.

### Formal

- Mantém exatamente a mesma estrutura documental do Casual.
- Pode realizar maior padronização terminológica e gramatical, mantendo significado, fatos, cronologia e autoria.
- Continua proibido acrescentar achados, causalidade, diagnósticos ou conclusões não presentes na fonte.

## Regras de reconciliação documental

- Identificar o tipo e a origem de cada documento antes de consolidar seu conteúdo (ex.: evolução UTI, parecer de especialidade, prescrição, laudo).
- Preservar especialidade e data de interconsultas. Um parecer identificado como `INFECTOLOGIA (09/08)` deve permanecer rastreável como Infectologia de 09/08 no resultado.
- Não exibir `RESPONDIDA`, `SOLICITADA` ou outro status de interconsulta como texto clínico se esse status não estiver explicitamente escrito na fonte. O estado interno pode existir para o motor, mas não deve ser apresentado como fato documental inventado.
- Conduta de especialista não deve ser silenciosamente convertida em conduta consolidada do intensivista.
- Divergências entre documentos ou entre recomendações do mesmo documento não devem ser resolvidas por plausibilidade. Devem ser preservadas para revisão quando a cronologia não permitir resolução determinística.
- Informação social/contextual, como ausência de rede de apoio, não deve ser automaticamente classificada como `DEMANDA FAMILIAR` sem indicação explícita na fonte.
- Negação explícita deve ser preservada. Exemplo: `MUC NEGA` deve produzir `MEDICAÇÕES DE USO CONTÍNUO: NEGA`, e não seção vazia.
- Não duplicar a mesma informação em HDA, admissão e condutas sem ganho documental.
- Exames solicitados e aguardados devem ser reconciliados no mesmo estado quando se referirem ao mesmo exame, evitando duplicidade de conduta.
- Nomes de medicamentos não devem ser duplicados na renderização. Exemplo inválido: `ARTEMETER + LUMEFANTRINA ARTEMETER 20 MG + LUMEFANTRINA 120 MG`.
- Dispositivo explicitamente retirado deve permanecer no histórico de dispositivo, mas não pode ser apresentado como invasivo ativo atual.
- Uma orientação posterior de alta/transferência deve ser reconciliada com justificativas antigas de permanência em UTI; não manter simultaneamente uma justificativa obsoleta como se fosse atual sem sinalizar conflito.
- Resultados laboratoriais repetidos pela mesma coleta e mesmo analito não devem ser duplicados apenas porque foram extraídos de painéis diferentes. Exemplo: TP/INR/TTPa presentes no `COAGULOGRAMA` e novamente em testes isolados devem aparecer uma única vez na representação compacta daquela coleta.
- Um status textual dependente de condição anterior, como `SAPS III: AGUARDA EXAMES`, não deve ser automaticamente convertido em escore; porém, se novos documentos tornarem o texto manifestamente desatualizado, o sistema deve sinalizar pendência de revisão em vez de afirmar que está reconciliado.

## Regras de apresentação final

- Nenhum marcador Markdown interno (`##`, `###`, crases ou outros artefatos de prompt) pode aparecer na evolução final.
- Campos explicitamente negados devem mostrar a negação; campos sem dado permanecem vazios ou com o placeholder definido pelo template, sem converter ausência em negativa.
- Laboratórios devem ser compactados por data e conjunto clínico, preservando associação temporal e unidades quando necessárias. Não transcrever automaticamente campos sem valor clínico de laudos extensos quando houver representação compacta equivalente.
- A compactação é de apresentação, nunca de significado: não apagar anormalidades, datas, unidades necessárias ou relações com a fonte.
- Exames de imagem podem ser organizados e corrigidos linguisticamente, mas não devem perder achados, ressalvas ou limitações clinicamente relevantes apenas por seleção de estilo Casual/Formal.

## Regra operacional de manutenção

- Quando uma saída real demonstrar incoerência objetiva com estas regras, registrar o caso como regressão e corrigir a implementação na branch de desenvolvimento ativa; não apenas documentar o defeito.
- Não alterar a baseline canônica para corrigir regressões da v3.4.1.
- Toda correção deve preservar os modelos documentais existentes salvo decisão explícita do usuário de alterar o próprio modelo.

## Dados e privacidade

- Não persistir conteúdo clínico além do necessário.
- A ação de limpar sessão deve remover rascunhos, conteúdo clínico, resultados e segredos locais relacionados.
- Nunca registrar chave de API em logs.
- Não enviar documentos a serviços não previstos pelo usuário.
