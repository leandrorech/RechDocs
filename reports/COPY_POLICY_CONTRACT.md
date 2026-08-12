# Contrato da política de cópia — RechDocs

> Este documento registra **apenas o que já foi decidido** sobre a política
> operacional de cópia. Onde não há decisão suficiente, o item é marcado
> `UNRESOLVED` explicitamente — nada aqui foi inventado para preencher lacuna.

## Decidido

1. Um conflito crítico/pendência não resolvida deve impedir inicialmente a
   cópia inadvertida do documento.
2. O conflito/pendência deve ficar visível ao usuário (não pode ser
   suprimido silenciosamente).
3. Deve existir uma ação deliberada equivalente a **"Copiar mesmo assim"** —
   ou seja, o bloqueio inicial não pode ser absoluto/permanente.
4. Essa ação de override exige confirmação explícita e inequívoca do
   usuário — não pode ser um clique único acidental.
5. A ocorrência do override deve ser auditável durante a sessão (o usuário
   ou quem revisar depois precisa conseguir saber que uma cópia foi feita
   apesar de pendências).

Fluxo decidido, em ordem: **ALERT → CONFIRMATION → EXPLICIT OVERRIDE
("Copiar mesmo assim") → AUDIT**. O bloqueio absoluto/eterno (estado atual
em `baseline` e na candidata) **não** corresponde a essa decisão.

## UNRESOLVED — sem contrato suficiente ainda

- **Persistência do registro de auditoria do override:** fica só em memória
  durante a sessão (equivalente ao `auditLog` já existente em
  `ClinicalState`), ou precisa sobreviver a reload/nova geração de
  documento? Não definido.
- **Duração/escopo do override:** uma vez confirmado, o override vale só
  para aquela cópia específica, ou libera a cópia para o restante da sessão
  até a próxima alteração de estado? Não definido.
- **Escopo por sessão vs. por documento:** se o usuário gera um novo caso
  (`reiniciarTudo()`), o override anterior deve ser automaticamente
  revogado? Presumivelmente sim (consistente com a invariante de que "novo
  caso" limpa dados clínicos), mas isso não foi formalmente decidido para o
  override especificamente — não assumir sem confirmação.
- **Diferenciação por severidade de pendência:** todas as pendências
  críticas (ver `buildCriticalPendencies()` — alergias não confirmadas, DVA
  sem dose, conflito de estado não resolvido, etc.) habilitam o mesmo botão
  de override, ou algumas categorias devem permanecer bloqueio absoluto sem
  override possível? Não definido.
- **Texto/UX exato da confirmação:** não há especificação da redação do
  alerta, do texto de confirmação, nem de onde o botão de override deve
  aparecer na interface.
- **Impressão:** a mesma política vale para `impressao()` (que hoje também
  é impedida quando `COPY_BLOCKED`), ou impressão e cópia podem ter regras
  de override independentes? Não definido — o relatório de origem
  (`reports/RECHDOCS_ANALISE_COMPLETA_2026-08-02.md`, P0-03) menciona só
  cópia explicitamente.

## Uso deste contrato

O spec de characterization `tests/characterization/fixtures/p0_03_copy_override_policy.mjs`
testa exclusivamente os 5 itens da seção "Decidido" acima. Os itens
`UNRESOLVED` não são testados nem usados como critério de PASS/FAIL — testar
algo que não foi decidido inventaria a regra, o que é proibido.

Nenhuma implementação foi feita a partir deste contrato. Este documento
separa o que está pronto para virar teste/fix do que ainda precisa de
decisão humana antes de qualquer código.
