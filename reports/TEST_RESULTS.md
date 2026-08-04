# Resultados de teste — auditoria da candidata v3.4.1 (03/08/2026)

Execução realizada em ambiente isolado, sem alterar nenhum arquivo do repositório. Todos os
comandos abaixo podem ser reproduzidos localmente; nenhum usa dados de paciente reais e nenhum
faz chamada de rede a provedor de IA.

## 0 — Auditoria estática mínima (`tests/static_audit.py`)

```
$ python3 tests/static_audit.py baseline/rech_docs_v3_3_12_P1.html
Arquivo: baseline/rech_docs_v3_3_12_P1.html
IDs: 60 | scripts inline: 1
PASSOU na auditoria estática mínima

$ python3 tests/static_audit.py reference/RechDocs_v3.4.0_reference.html
Arquivo: reference/RechDocs_v3.4.0_reference.html
IDs: 60 | scripts inline: 1
PASSOU na auditoria estática mínima

$ python3 tests/static_audit.py output/RechDocs_v3.4.1.html
Arquivo: output/RechDocs_v3.4.1.html
IDs: 65 | scripts inline: 1
PASSOU na auditoria estática mínima
```

**Resultado:** PASSOU nas três versões. Cobre apenas sintaxe JS, IDs duplicados e padrões
perigosos básicos — não valida comportamento clínico.

---

## 1 — Preparação do ambiente de execução (fora do repositório)

O `<script>` inline de cada HTML foi extraído para um diretório temporário fora do
repositório (`/tmp/.../scratchpad/`), e um shim mínimo de `document`/`window`/`localStorage`/
`sessionStorage`/`navigator` foi criado para permitir carregar o script em Node.js sem executar
manipulação real de DOM. Isso expõe as classes/funções puras do motor clínico
(`ClinicalState`, `comparaPrecedencia`, `resolveVentilatorio`, `buildControles`) para chamada
direta.

```js
// shim.js (resumo)
global.document = { getElementById(){...}, createElement(){...}, ... };
global.window = Object.assign(global, {addEventListener(){}, matchMedia(){...}});
global.localStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
global.sessionStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
global.navigator = { clipboard:{writeText: async()=>{}}, userAgent:'node' };
```

```
$ node --check v341_export.js
(sem saída — sintaxe válida)

$ node -e "require('./shim.js'); const m = require('./v341_export.js'); console.log('loaded OK', Object.keys(m));"
loaded OK [ 'ClinicalState', 'comparaPrecedencia', 'resolveVentilatorio_test' ]
```

**Resultado:** carregamento bem-sucedido das três versões (baseline, referência, candidata)
com o mesmo shim.

---

## T-VENT-01 — Extubação → reintubação sem herança de PEEP/VC

**Entrada sintética (não é prontuário real):**
```js
ventilatorio: [
  {modo:'VCV', peep:'8', vc_ml:'420', status:'ativo', origem:'documento_previo', data:'01/07', hora:'08:00', tipo_documento:'evolucao', ordem:0},
  {status:'extubado', origem:'documento_previo', data:'02/07', hora:'08:00', tipo_documento:'evolucao', ordem:1},
  {modo:'PCV', fio2:'40', status:'ativo', origem:'documento_previo', data:'03/07', hora:'08:00', tipo_documento:'evolucao', ordem:2},
]
```

| Alvo | Resultado (`resolve().ventilatorio`) | Conflitos |
|---|---|---|
| **Baseline v3.3.12-P1** | `{"modo":"PCV","fio2":"40","peep":"8","vc_ml":"420"}` | `[]` |
| **Referência v3.4.0** | (não executada linha a linha; código-fonte contém correção documentada "fix P0-06" com corte de episódio cronológico) | — |
| **Candidata v3.4.1** | `{"modo":"PCV","fio2":"40","peep":"8","vc_ml":"420"}` | `[]` |

**Esperado:** `{"modo":"PCV","fio2":"40"}`, sem `peep`/`vc_ml`.
**Observado:** PEEP 8 e VC 420 do episódio pré-extubação vazam para o episódio reintubado, tanto
na baseline quanto na candidata — **falha confirmada em ambas**, não corrigida na candidata
apesar de já existir correção pronta na referência.
**Veredito do teste:** FALHOU (baseline e candidata).

---

## T-VENT-02 — Empate "ativo × extubado" (fraseado assimétrico)

**Entrada sintética:**
```js
ventilatorio: [
  {modo:'VCV', peep:'8', status:'ativo', origem:'documento_previo', data:'01/07', hora:'08:00', tipo_documento:'evolucao', ordem:0},
  {status:'extubado', origem:'documento_previo', data:'01/07', hora:'08:00', tipo_documento:'evolucao', ordem:0},
]
```

**Resultado (candidata v3.4.1):** `ventilatorio: {}`, `conflitos: []`.
**Esperado:** conflito bloqueante registrado (empate real de precedência entre VM ativa e
extubação, mesma data/hora/tipo/ordem).
**Observado:** resolvido silenciosamente para "extubado", sem qualquer conflito — o comparador
nunca atinge o ramo de detecção de empate porque `'extubado'` corresponde a um verbo de
`EXECUTED_VERBS` e `'ativo'` não.
**Veredito do teste:** FALHOU (candidata).

---

## T-VENT-03 — Empate "intubado × extubado" (fraseado simétrico, controle positivo)

**Entrada sintética:**
```js
ventilatorio: [
  {modo:'VCV', peep:'8', status:'intubado', origem:'documento_previo', data:'01/07', hora:'08:00', tipo_documento:'evolucao', ordem:0},
  {status:'extubado', origem:'documento_previo', data:'01/07', hora:'08:00', tipo_documento:'evolucao', ordem:0},
]
```

**Resultado (candidata v3.4.1):** `ventilatorio: {"modo":"VCV","peep":"8"}`, `conflitos:
["Conflito ventilatório: evento \"extubado\" (01/07) empatou com evento \"intubado\" (01/07)...
CONFIRME MANUALMENTE o suporte vigente."]`.
**Veredito do teste:** PASSOU — confirma que a detecção de empate existe e funciona quando
ambos os lados usam um verbo presente em `EXECUTED_VERBS`; isola o ponto cego de T-VENT-02
como um problema específico de fraseado assimétrico, não uma ausência total do mecanismo.

---

## T-CTRL-01 — Colisão de rótulo em controles de 24h (temperatura)

**Entrada sintética:**
```js
d.controles = ['Temp: 35.8 (06h)', 'Temp: 38.5 (14h) muito elevada hoje pela manha'];
```

**Comando:**
```
$ node -e "require('./shim.js'); const {buildControles} = require('./v341_export2.js'); console.log(buildControles({monitor:{}, controles:[...]}));"
```

**Resultado:** `TEMP: 38.5 (14h) muito elevada hoje pela manha °C`
**Esperado:** ambos os valores preservados ou conflito explícito.
**Observado:** a leitura de 35,8°C às 06h é descartada silenciosamente, sem log/conflito.
**Veredito do teste:** FALHOU (candidata).

---

## Testes não executados / limitações declaradas

Conforme `AGENTS.md` regra 10 ("não declare sucesso quando houver teste não executado"),
registro explicitamente o que **não** foi verificado por execução nesta rodada:

- **T-EXAM-01 (deduplicação de exames por hora/tipo, achado CI-05):** não executado por
  extração de função — a leitura de código é determinística e não deveria exigir execução para
  ser confiável, mas não há confirmação empírica nesta rodada. Recomenda-se testar antes de
  fechar a correção.
- **T-TRACE-01 (rastreabilidade obsoleta após edição, achado CI-03):** o fluxo depende de
  manipulação de DOM (`prefill-editor`, `output-body`, `trace-card`) que o shim mínimo usado
  aqui não reproduz com fidelidade suficiente para uma asserção automática confiável. O achado
  é baseado em leitura determinística do fluxo de chamadas (nenhuma das funções
  `onPreEvolutionEdit`/`visualizarPreEvolucao`/`confirmarRevisaoPreEvolucao` referencia
  `traceItems` ou `validateUndeclaredTransformations`), não em execução.
- **Chamadas reais aos provedores de IA (Anthropic/OpenAI/Gemini/DeepSeek/Qwen):** não testado
  — exigiria chave real e envio de rede, fora do escopo desta auditoria (`AGENTS.md` regra 11:
  "não use rede").
- **Teste cross-browser, impressão física, extração real de PDF, abertura `file://`:** não
  executados neste ambiente (sem navegador interativo disponível).
- **Suíte de regressão clínica ampla (fixtures citadas em relatórios anteriores —
  `baseline.characterization.cjs`, `baseline.clinical.cjs`, `test_rechdocs_v341.mjs`):** esses
  arquivos **não existem** em `tests/` neste repositório (apenas `static_audit.py` está
  presente). Não foi possível executá-los porque não foram encontrados.

---

## Resumo

| Teste | Alvo | Veredito |
|---|---|---|
| Auditoria estática (sintaxe/IDs/padrões perigosos) | baseline, referência, candidata | PASSOU (3/3) |
| T-VENT-01 (herança PEEP/VC pós-reintubação) | baseline, candidata | FALHOU (2/2) |
| T-VENT-02 (empate ativo×extubado assimétrico) | candidata | FALHOU |
| T-VENT-03 (empate intubado×extubado simétrico, controle) | candidata | PASSOU |
| T-CTRL-01 (colisão de rótulo TEMP) | candidata | FALHOU |
| T-EXAM-01, T-TRACE-01 | candidata | NÃO EXECUTADO — ver limitações |

**Conclusão:** a candidata não pode ser considerada validada clinicamente com base nestes
testes. Ver `reports/CHANGE_IMPACT.md` para o detalhamento de risco e correção recomendada por
achado.
