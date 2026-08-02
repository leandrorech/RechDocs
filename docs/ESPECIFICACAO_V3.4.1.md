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
