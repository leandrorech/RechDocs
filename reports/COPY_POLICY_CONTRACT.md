# Contrato da política de cópia — RechDocs

> **Contrato vigente, revisado em 2026-08-15 por decisão do produto (Leandro Rech).**
> A versão anterior deste documento especificava bloqueio com override
> (`ALERTA → BLOQUEIO → "Copiar mesmo assim" → CONFIRMAÇÃO → AUDIT → CÓPIA`).
> **Esse contrato foi cancelado.** A interpretação de que pendência crítica deveria impedir a
> saída estava incorreta. O histórico do contrato anterior está preservado no fim deste arquivo.

## Princípio

**O RechDocs nunca bloqueia cópia ou impressão.** Nem por conflito, nem por incoerência, nem por
pendência crítica, nem por inferência não resolvida.

A exigência é **sinalização visual máxima**, não bloqueio. O médico continua podendo copiar e
imprimir a qualquer momento; o sistema garante apenas que a inconsistência seja **impossível de
ignorar**.

Fluxo vigente:

```
ALERTA CRÍTICO VISUAL → o usuário vê a inconsistência → cópia/impressão permanecem liberadas
```

## Decidido

1. **Nenhum bloqueio funcional.** `copiar()` e `imprimirDocumento()` executam sempre. Não existe
   estado em que o botão "Copiar tudo" fique desabilitado.
2. **"Copiar tudo" sempre disponível.**
3. **"Imprimir / PDF" sempre disponível.**
4. **Não existe fluxo de override.** Sem botão "Copiar mesmo assim", sem `confirm()` obrigatório
   para copiar.
5. **Detecção de conflitos e pendências é mantida integralmente** — o que muda é a consequência,
   não a detecção. `buildCriticalPendencies()`, `validateTraceability()`,
   `validateUndeclaredTransformations()`, conflitos do `ClinicalState` etc. seguem inalterados.
6. **Banner crítico de alta prioridade** quando há pendência: grande, vermelho, no topo do preview,
   com o texto
   *"⚠ ATENÇÃO — EXISTEM INCONSISTÊNCIAS/PENDÊNCIAS CRÍTICAS. REVISE AS INFORMAÇÕES ANTES DE USAR
   ESTE DOCUMENTO."*
7. **Lista concreta das pendências** exibida imediatamente abaixo do banner.
8. **Sinalização junto aos botões** Copiar/Imprimir enquanto houver pendência.
9. **A impressão/PDF carrega o aviso**: o banner tem regra `@media print` própria e é impresso
   junto do documento.
10. **Edição manual não oculta o alerta.** Digitar no preview ou no editor de pré-evolução não
    altera o estado de alerta.
11. **O alerta só desaparece quando a condição que o gerou for efetivamente resolvida e
    recalculada** — na prática, uma nova geração sem pendências (`setCriticalAlert(false)` é
    chamado no início de `processar()` e quando `pend.length === 0`).
12. **Auditoria sem fricção:** se houver pendência no momento da cópia/impressão, registra-se no log
    de auditoria que a saída ocorreu com alerta crítico ativo — **sem impedir a ação e sem exigir
    confirmação**.

## Implementação correspondente

| Elemento | Onde |
|---|---|
| `CRITICAL_ALERT_ACTIVE`, `CRITICAL_ALERT_ITEMS` | estado de sinalização; nunca consultado para impedir ação |
| `setCriticalAlert(active, items)` | liga/desliga banner, lista e aviso dos botões; força `btn-copy.disabled = false` |
| `registrarSaidaComAlerta(acao)` | grava em `CRITICAL_OUTPUT_LOG` + `#audit-list`; chamado **depois** da ação |
| `#critical-banner`, `#critical-banner-list`, `#copy-warn` | elementos de sinalização |
| `CRITICAL_OUTPUT_LOG` | registro de auditoria da sessão; limpo em `reiniciarTudo()` |

`COPY_BLOCKED`, `setCopyBlocked()`, `copiarComOverride()`, `currentCopyBlockReason()`,
`COPY_OVERRIDE_LOG` e `#btn-copiar-mesmo-assim` **não existem mais**.

## Efeito sobre R-01 / R-07

O bloqueador identificado no release gate de 2026-08-15 — o listener global de `input` que chamava
`setCopyBlocked(false)` a cada tecla — **deixa de ser um problema de bypass**, porque não há mais
bloqueio a ser contornado. O requisito remanescente, agora testado, é outro: **o listener não pode
apagar a sinalização crítica**. Ele foi alterado para não tocar no estado de alerta.

## `UNRESOLVED` — sem contrato suficiente ainda

- **Persistência do log de auditoria:** permanece em memória de sessão. Não foi decidido se deve
  sobreviver a reload ou a nova geração.
- **Resolução granular do alerta:** hoje o alerta é recalculado por geração inteira. Não foi
  decidido se deve existir resolução item a item (marcar uma pendência específica como resolvida).
- **Diferenciação por severidade:** todas as pendências críticas produzem o mesmo banner. Não foi
  decidido se alguma categoria merece tratamento visual distinto.

---

## Histórico — contrato anterior (cancelado em 2026-08-15)

O contrato original exigia: (1) bloqueio inicial efetivo; (2) pendência visível; (3) ação dedicada
"Copiar mesmo assim"; (4) confirmação explícita; (5) auditabilidade do override. Foi implementado no
commit `53d7378` e verificado dinamicamente. **Foi revertido por decisão do produto** — a premissa de
que o sistema deveria impedir a saída estava errada. Os itens (2) e (5) sobrevivem no contrato atual,
em forma reforçada; (1), (3) e (4) foram removidos.
