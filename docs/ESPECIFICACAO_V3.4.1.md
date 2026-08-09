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

## Requisitos documentais adicionados em 09/08/2026

1. Remover completamente da saída final as seções `ANTITROMBÓTICOS EM USO` e `ANTITROMBÓTICOS PRÉVIOS/SUSPENSOS`.
2. Impedir que marcadores Markdown internos, especialmente `##`, apareçam no documento final.
3. Preservar negações explícitas: `MUC NEGA` deve resultar em `MEDICAÇÕES DE USO CONTÍNUO: NEGA`.
4. Interconsultas devem manter especialidade, data e conteúdo atribuível à fonte.
5. Condutas de pareceres não podem ser convertidas automaticamente em condutas autorais do intensivista.
6. Divergências documentais não resolvíveis por cronologia devem permanecer identificadas para revisão, sem resolução por plausibilidade.
7. Informação social/contextual não deve ser classificada como demanda familiar sem indicação explícita.
8. Exames laboratoriais devem ser compactados em formato clínico por data/conjunto, preservando significado, anormalidades, temporalidade e unidades necessárias.
9. Solicitações e pendências do mesmo exame devem ser deduplicadas e reconciliadas em um único estado documental.
10. A renderização de medicamentos deve evitar repetição de nome/princípios ativos e preservar dose, via, intervalo e duração quando presentes na fonte.
11. A classificação deve ocorrer somente após identificação do documento-fonte e reconstrução cronológica: `extração -> fonte -> cronologia -> proveniência -> reconciliação -> deduplicação -> classificação -> compactação -> redação final`.
12. O resultado final deve priorizar utilidade clínica e rastreabilidade, não reprodução indiscriminada de laudos extensos.

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
