# Especificação funcional — RechDocs v3.4.1

## Baseline

A versão 3.3.12-P1 fornece o núcleo clínico, reconciliação, rastreabilidade, validações e bloqueios. Esses elementos têm precedência.

## Recursos a portar da referência 3.4.0

### Pré-evolução editável

Gerar uma evolução pré-montada a partir do estado clínico reconciliado, mantendo o resultado editável antes da cópia/exportação.

### Compactação cumulativa de exames

Organizar laboratórios por data e em formato compacto, sem perder associação temporal nem apagar unidades clinicamente necessárias. A compactação é de apresentação, não de significado.

### Preview da pré-evolução

Permitir visualizar o documento antes da saída final, mantendo alertas e estados de revisão visíveis quando aplicável.

### Modo de preenchimento prévio

Adicionar controles de interface que reutilizem dados já extraídos, sem nova inferência e sem duplicar estados clínicos independentes.

## Requisitos de integração

- Usar o estado reconciliado da baseline como fonte única.
- Não criar um segundo parser clínico.
- Não criar uma segunda classificação de medicamentos paralela.
- Não permitir que edição visual contorne bloqueios de segurança.
- Preservar texto original ou trilha suficiente para auditoria.
- O usuário deve conseguir cancelar e retornar ao estado anterior.
- Campos sem dado devem permanecer vazios, não preenchidos por frases genéricas.

## Invariante de modelo documental

Os modelos de Admissão, Evolução, Emergência, Documento Complementar e demais modelos aprovados são estruturas canônicas independentes do estilo de escrita.

O seletor de estilo atua exclusivamente na linguagem do conteúdo interno dos campos. Portanto:

- Casual e Formal devem renderizar as mesmas seções, na mesma ordem e com os mesmos rótulos do tipo documental selecionado;
- o estilo não pode remover seções vazias previstas pelo modelo;
- o estilo não pode criar um template alternativo ou resumido;
- mudanças estruturais exigem decisão explícita separada e não podem ser derivadas do estilo.

### Casual

O modo Casual deve fazer intervenção linguística mínima: corrigir ortografia, acentuação, concordância, pontuação, capitalização e construções claramente defeituosas, preservando abreviações médicas usuais e a voz cotidiana do autor quando não houver ambiguidade.

É proibido usar o modo Casual para expandir exame físico, sofisticar narrativa, substituir formulações clinicamente equivalentes sem necessidade ou acrescentar achados. Exemplo: a fonte `NEURO: SEM DÉFICITS NEUROLÓGICOS AGUDOS` não autoriza gerar `PUPILAS ISOCÓRICAS E FOTORREAGENTES`.

### Formal

O modo Formal pode realizar maior padronização terminológica e sintática, mas continua sujeito à mesma estrutura fixa, às mesmas fontes e à regra de zero invenção clínica.

## Requisitos documentais adicionados em 09/08/2026

1. Remover completamente da saída final as seções `ANTITROMBÓTICOS EM USO` e `ANTITROMBÓTICOS PRÉVIOS/SUSPENSOS`.
2. Impedir que marcadores Markdown internos, especialmente `##`, apareçam no documento final.
3. Preservar negações explícitas: `MUC NEGA` deve resultar em `MEDICAÇÕES DE USO CONTÍNUO: NEGA`.
4. Interconsultas devem manter especialidade, data e conteúdo atribuível à fonte.
5. `RESPONDIDA`, `SOLICITADA` ou status equivalente não deve aparecer como texto clínico se não estiver explicitamente escrito na fonte.
6. Condutas de pareceres não podem ser convertidas automaticamente em condutas autorais do intensivista.
7. Divergências documentais não resolvíveis por cronologia devem permanecer identificadas para revisão, sem resolução por plausibilidade.
8. Informação social/contextual não deve ser classificada como demanda familiar sem indicação explícita.
9. Exames laboratoriais devem ser compactados em formato clínico por data/conjunto, preservando significado, anormalidades, temporalidade e unidades necessárias.
10. Solicitações e pendências do mesmo exame devem ser deduplicadas e reconciliadas em um único estado documental.
11. A renderização de medicamentos deve evitar repetição de nome/princípios ativos e preservar dose, via, intervalo e duração quando presentes na fonte.
12. A classificação deve ocorrer somente após identificação do documento-fonte e reconstrução cronológica: `extração -> fonte -> cronologia -> proveniência -> reconciliação -> deduplicação -> classificação -> compactação -> redação final`.
13. O resultado final deve priorizar utilidade clínica e rastreabilidade, não reprodução indiscriminada de laudos extensos.
14. Dispositivo retirado deve ser reconhecido como histórico, não como dispositivo invasivo ativo atual.
15. Justificativa antiga de permanência em UTI deve ser reconciliada quando documento mais recente registra alta/transferência; se houver conflito não determinístico, bloquear/liberar somente após revisão.
16. Achados de exame físico, estado neurológico ou sinais negativos/positivos não podem ser acrescentados por estilo de escrita.

## Caso de regressão obrigatório — Brulle Angelo Mangubat Vidal

A entrada de regressão contém simultaneamente evolução UTI e parecer de Infectologia de 09/08/2026 para malária por *Plasmodium falciparum*.

O teste deve falhar se:

- qualquer uma das duas seções dedicadas de antitrombóticos aparecer na saída;
- houver marcador `##` no texto final;
- `MUC NEGA` produzir seção vazia;
- `INFECTOLOGIA (09/08)` não aparecer em `INTERCONSULTAS` com conteúdo preservado;
- ausência de rede de apoio for automaticamente transformada em `DEMANDA FAMILIAR`;
- o medicamento for renderizado com nome duplicado;
- USG de abdome solicitado/aguardado aparecer como condutas duplicadas sem reconciliação;
- recomendação da Infectologia for apresentada como decisão autoral do intensivista sem proveniência;
- campos irrelevantes do EAS/hemograma forem despejados indiscriminadamente quando houver representação compacta clinicamente equivalente.

## Caso de regressão obrigatório — Karen Fabiana Rodrigues da Paixão Gomes

O caso contém evolução UTI prévia, interconsultas seriadas da Cirurgia Geral, interconsulta mais recente da Cirurgia Oncológica, dispositivo retirado, antimicrobianos com orientação posterior de suspensão, parâmetros atuais e exames laboratoriais de 08/08/2026.

O teste deve falhar se:

- o modo Casual alterar a estrutura do template de Evolução;
- aparecer qualquer marcador `##` no documento final;
- aparecer `— RESPONDIDA` quando a fonte não contiver essa palavra/status;
- o exame neurológico acrescentar pupilas, déficit motor ou qualquer achado não fornecido;
- `ACV: BRNF 2T SEM SOPROS` for transformado em achados clínicos novos em vez de apenas correção textual mínima;
- SVD retirada em 07/08 permanecer como dispositivo invasivo ativo atual;
- a orientação de suspender antibioticoprofilaxia em 07/08 for ignorada sem conflito/reconciliação dos antimicrobianos listados como ativos;
- a justificativa antiga `3º PO LAPAROTOMIA EXPLORADORA` permanecer como justificativa atual sem reconciliar a alta da UTI registrada pela Cirurgia Oncológica em 09/08;
- as quatro interconsultas de 05/08, 06/08, 07/08 e 09/08 forem fundidas ou perderem especialidade/data;
- os laboratórios de 08/08 forem despejados como laudo extenso em vez de compactação clínica por data.
