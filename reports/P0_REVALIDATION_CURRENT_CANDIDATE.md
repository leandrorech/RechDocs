# Revalidação P0 — candidato atual (RechDocs v3.4.1)

**Data:** 2026-08-12
**Branch:** `claude/github-app-install-aft7xw`
**Commit de freeze/scaffold anterior:** `b93fb134c54b6bcb1b288780239a49008d0c575f`
**Harness:** Playwright + Chromium headless (`/opt/pw-browsers/chromium`), `BrowserContext` novo e isolado por (fixture × artefato) — sem `localStorage`/`sessionStorage`/cookies herdados entre execuções (IndexedDB não é usado por nenhum artefato — verificado por grep, 0 ocorrências). Timezone fixa `America/Sao_Paulo`, locale fixo `pt-BR`, mesma instalação de Chromium para os três artefatos. Nenhuma chamada de rede real ocorre nestas fixtures (todas testam `ClinicalState.resolve()`, `buildExamesCompactos()` ou `copiar()`/`COPY_BLOCKED` diretamente — nenhuma depende de `fetch()` a provedor de IA).
**Módulos:** `tests/characterization/harness/{browser-adapter,capture-state,normalize-output,compare-results,run-characterization}.mjs`
**Fixtures:** `tests/characterization/fixtures/{p0_01_vent_episode_leak,p0_02_vm_extubation_conflict,p0_03_copy_override_policy,ci_05_exam_compaction}.mjs`
**Comando:** `node tests/characterization/harness/run-characterization.mjs`
**Resultado bruto completo:** `tests/characterization/reports/characterization_run_result.json`

## Regra seguida nesta fase

**Nenhuma correção foi aplicada.** Sequência executada: `HARNESS → FIXTURE → EXECUTION → EVIDENCE → CLASSIFICATION`, e parou aqui. `REGRESSION_RISKS.md`, `CHANGE_IMPACT.md` e `TEST_RESULTS.md` não foram tocados.

## Artefatos testados (hash em cada execução, não assumido de memória)

| Artefato | Caminho | Bytes | SHA-256 |
|---|---|---|---|
| Baseline (congelada) | `baseline/rech_docs_v3_3_12_P1.html` | 205.250 | `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667` |
| Referência v3.4.0 | `reference/RechDocs_v3.4.0_reference.html` | 187.738 | `6c8e823bae12d3bfd9c577375adaf888f19f1babac35f1c04ee67534c3dd0073` |
| Candidata atual | `output/RechDocs_v3.4.1.html` | 220.845 | `f8bf499b1b8483f80457afdb32248ee7411abce54c0cc2c4ca30fd4b832814fa` |

Confirma-se novamente: a candidata histórica de 02/08 (216.381 bytes, hash `c57b9e01...`) **não é** este arquivo. Nenhum resultado deste relatório reutiliza veredito histórico sem reexecução.

---

## P0-01 — vazamento de parâmetros ventilatórios entre episódios

| Campo | Valor |
|---|---|
| **Fixture** | intubado VCV/PEEP 8/VC 420 em 01/07/2026 08:00 → extubado em 02/07/2026 10:00 → reintubado PCV/FiO2 40 em 03/07/2026 09:00 (sem PEEP/VC novos) |
| **Expected** | Episódio novo com `modo=PCV`, `fio2=40`; `peep` e `vc_ml` ausentes |
| **Observed baseline** (sha `56faa850...`) | `{modo:"PCV", fio2:"40", peep:"8", vc_ml:"420"}` — PEEP/VC vazaram |
| **Observed reference** (sha `6c8e823b...`) | `{modo:"PCV", fio2:"40"}` — limpo, sem herança |
| **Observed candidate** (sha `f8bf499b...`) | `{modo:"PCV", fio2:"40", peep:"8", vc_ml:"420"}` — PEEP/VC vazaram (idêntico à baseline) |
| **PASS/FAIL** | baseline **FAIL** · reference **PASS** · candidate **FAIL** |
| **Classificação** | `BASELINE_BUG_REVEALED` |
| **Severidade** | Bloqueante (documenta parâmetro ventilatório de episódio já encerrado como se fosse atual) |
| **Confiança** | Alta — mecanismo causal identificado por leitura de código, não só por diferença de output |
| **Evidência** | `DYNAMIC_E2E_EVIDENCE` (mais evidência estática de apoio: comentário `// fix P0-06 (26/07/2026)` em `resolveVentilatorio()` da referência, ausente em baseline/candidata) |
| **Console/page errors** | Nenhum nos três artefatos |
| **Conclusão** | Confirmado dinamicamente: a auditoria externa estava certa. A referência restringe candidatos de cada campo ao episódio vigente (`lastExtubIdx` → `episodioAtual = sorted.slice(lastExtubIdx+1)`); baseline e candidata resolvem por precedência sobre o array inteiro, sem essa fronteira. Não é regressão da consolidação (candidata = baseline), é uma correção conhecida e disponível que nunca foi portada. |

---

## P0-02 — VM ativa × extubado no mesmo contexto temporal

Duas subvariantes — a auditoria externa pediu para não assumir que o bug histórico persiste igual, e a execução confirma que a situação é mais matizada do que uma única fixture revelaria.

### P0-02a — formulação simétrica ("intubado" × "extubado", controle)

| Campo | Valor |
|---|---|
| **Fixture** | dois eventos, mesma data/hora/ordem (05/07/2026 14:00), status "intubado" vs "extubado" |
| **Expected** | Conflito registrado em `engine.conflitos` **e** propagado até `buildCriticalPendencies()` → `wouldBlockCopy=true` |
| **Observed baseline** | conflito: `"Conflito ventilatório: evento \"extubado\"... empatou com evento \"intubado\"..."`; `wouldBlockCopy=true` (via pendência "Existe conflito de estado não resolvido") |
| **Observed reference** | conflito: `"⛔ Conflito ventilatório bloqueante: há menções empatadas..."`; `wouldBlockCopy=true` (via pendência "Existe alerta crítico bloqueante") |
| **Observed candidate** | idêntico à baseline; `wouldBlockCopy=true` |
| **PASS/FAIL** | **PASS nos três** |
| **Classificação** | `EXPECTED_CHANGE` |
| **Severidade** | N/A (comportamento correto) |
| **Confiança** | Alta |
| **Evidência** | `DYNAMIC_E2E_EVIDENCE` |
| **Console/page errors** | Nenhum |
| **Conclusão** | O mecanismo de empate real (`cmp===0` em `comparaPrecedencia`) funciona e efetivamente bloqueia a cópia nos três artefatos quando a formulação é simétrica. **Isso não reproduz a alegação histórica de que a baseline falha aqui** — não foi possível reconciliar essa divergência porque `test_rechdocs_v340.mjs` (usado no relatório de 02/08) nunca foi commitado (busca em `git log --all` / `git rev-list --all` sem resultado). Fica `UNRESOLVED` apenas quanto à **causa da divergência com o relatório histórico**, não quanto ao comportamento atual, que está bem estabelecido. |

### P0-02b — formulação assimétrica ("VM ativa" × "extubado", achado novo)

| Campo | Valor |
|---|---|
| **Fixture** | dois eventos, mesma data/hora/ordem, status "VM ativa" vs "extubado" |
| **Expected** | Mesmo padrão do P0-02a: conflito registrado e cópia bloqueada |
| **Observed baseline** | `conflitos=[]`; estado resolvido para `{}` (equivalente a extubado, sem sinalização); `pendencies=[]`, `wouldBlockCopy=false` |
| **Observed reference** | idêntico à baseline |
| **Observed candidate** | idêntico à baseline |
| **PASS/FAIL** | **FAIL nos três** |
| **Classificação** | `REFERENCE_BUG_REVEALED` |
| **Severidade** | Bloqueante — decide silenciosamente entre dois estados clínicos mutuamente exclusivos, sem qualquer sinalização, e **não bloqueia a cópia** (confirmado via `buildCriticalPendencies`, com pendências de outras origens deliberadamente neutralizadas na fixture para isolar este efeito especificamente) |
| **Confiança** | Alta — mecanismo causal identificado: `comparaPrecedencia()` desempata por `EXECUTED_VERBS` (lista de radicais como `extubad`, `intubad`); "VM ativa" não bate em nenhum radical, "extubado" bate — a comparação resolve decisivamente a favor de "extubado" antes de alcançar o critério de empate real, então `cmp!==0` e o bloco de detecção de conflito (que só dispara quando `cmp===0`) nunca executa |
| **Evidência** | `DYNAMIC_E2E_EVIDENCE` |
| **Console/page errors** | Nenhum |
| **Conclusão** | **Achado novo, sem ID prévio em `REGRESSION_RISKS.md`.** Presente idêntico nos três artefatos, incluindo a referência (fonte de correções deliberadas conhecidas para outros casos) — não é regressão da candidata. Reservado o ID **R-17** para reconciliação futura. |

---

## P0-03 — política de cópia com override auditável

Ver `reports/COPY_POLICY_CONTRACT.md` para a separação entre o que está decidido (5 itens testados) e o que está `UNRESOLVED` (não testado, para não inventar regra).

| Campo | Valor |
|---|---|
| **Fixture** | inspeção estática do HTML (presença de mecanismo de bloqueio e de afordância de override) + execução dinâmica de `copiar()` com `COPY_BLOCKED=true` forçado, clipboard stubado localmente |
| **Expected** | Itens 1–5 do contrato: bloqueio inicial efetivo, pendência visível, override dedicado, confirmação explícita, auditabilidade |
| **Observed baseline** | item1=true, item2=true (`"Cópia bloqueada: resolva as pendências críticas..."`), item3=false, item4/5=não verificáveis |
| **Observed reference** | item1=**false** (`hasBlockMechanism=false`) — não tem `COPY_BLOCKED`/`setCopyBlocked` nenhum; `copiar()` sempre executa e tentaria escrever no clipboard (`writes=[""]`); item2=false (`statusText=""`); item3=false |
| **Observed candidate** | idêntico à baseline: item1=true, item2=true, item3=false |
| **PASS/FAIL** | **FAIL nos três** (por motivos diferentes) |
| **Classificação** | `EXPECTED_CHANGE` (política de produto ainda não implementada — não é bug comportamental) |
| **Severidade** | N/A para a classificação de bug; porém a lacuna da **referência** (item 1 ausente) é uma lacuna mais ampla que a falta de override — nenhuma pendência bloqueia cópia ali, o que é pior que bloqueio absoluto |
| **Confiança** | Alta (inspeção direta de código + execução) |
| **Evidência** | `STATIC_CODE_EVIDENCE` complementada por `DYNAMIC_E2E_EVIDENCE` (execução real de `copiar()`) |
| **Console/page errors** | Nenhum |
| **Conclusão** | Confirmado: baseline e candidata têm bloqueio absoluto sem override (item 3 ausente = itens 4/5 não verificáveis por decorrência, não testados como se fossem falha independente). A referência não tem nem o bloqueio (pior nesse quesito específico — confirma R-01 de `REGRESSION_RISKS.md`). Nenhum dos três implementa a política decidida (`ALERT → CONFIRMATION → EXPLICIT OVERRIDE → AUDIT`). Tratado como funcionalidade pendente, não como regressão. |

---

## CI-05 — compactação cumulativa de exames (característica adicional, não-P0)

Não reabre a hipótese de whitelist Hb/Ht (já verificada e descartada). Casos mínimos testados: (1) duplicata exata, (2) mesmo analito/resultado diferente, (3) datas diferentes, (4) horários diferentes, (5) unidades diferentes, (6) imutabilidade de `d.exames`.

| Campo | Valor |
|---|---|
| **Observed baseline** | `buildExamesCompactos()` não existe — **N/A**, esperado (função não portada da referência para a linhagem baseline) |
| **Observed reference** | Existe função de mesmo nome, mas **implementação estruturalmente diferente**: sem unidade no texto, sem deduplicação nenhuma, agrupamento só por `tipo` (não por `tipo`+`data`). Falha nos 5 casos de conteúdo por incompatibilidade de contrato, não por defeito segundo seus próprios critérios |
| **Observed candidate** | Passa nos 6 casos — dedupe exata funcionando (`Hb` duplicado → 1 ocorrência), preserva resultados/datas/horários/unidades distintos, `d.exames` inalterado após a chamada (`unchanged=true`, `sameReference=true`) |
| **PASS/FAIL** | baseline N/A · reference FAIL (contrato incompatível) · candidate **PASS** |
| **Classificação** | `EXPECTED_CHANGE` |
| **Evidência** | `DYNAMIC_E2E_EVIDENCE` |
| **Console/page errors** | Nenhum |
| **Conclusão** | A candidata confirma dinamicamente os 6 casos mínimos descritos em `reports/CHANGE_IMPACT.md` (CI-05). Achado adicional: `buildExamesCompactos()` da candidata **não é um port direto** da função homônima da referência — é uma implementação própria mais elaborada. Isso deveria ser refletido em `FUNCTION_COMPARISON.md`/`CHANGE_IMPACT.md` na reconciliação. |

---

## Nota de rigor metodológico

As fixtures originalmente usavam datas em formato ISO (`2026-07-01`), que `parseDateOnlyScore()` não reconhece (só aceita `DD/MM/AAAA` ou `DD-MM-AAAA`). Isso foi detectado e corrigido **antes** de qualquer resultado ser reportado — as fixtures foram reescritas com datas no formato `DD/MM/AAAA`, e a suíte inteira foi reexecutada. Os vereditos PASS/FAIL não mudaram, mas a evidência ficou genuinamente mais forte: com o formato correto, `buildExamesCompactos()` agora agrupa de fato por data/hora reais (confirmado no texto observado: `"LAB [01/07/2026 08:00]..."`, `"LAB [03/07/2026 08:00]..."` em grupos separados), em vez de todos os exames caírem acidentalmente no bucket "SEM DATA INFORMADA" e passarem os casos 3/4 por coincidência de contagem, não por validação real de agrupamento.

## Teste de preview editável (adicional pedido)

Não implementado nesta rodada — exigiria simular o fluxo completo de geração (que depende de `fetch()` a provedor de IA) ou reconstruir manualmente o estado pós-geração via DOM antes de testar a edição/cópia/clipboard, trabalho substancialmente maior que os itens P0. Registrado como próxima fixture (`tests/characterization/fixtures/preview_edit_clipboard_integrity.mjs`, ainda não criado) em vez de atrasar a entrega deste relatório.

## Itens que precisarão de reconciliação (ainda não executada)

1. **R-02** (`REGRESSION_RISKS.md`) — confirmar como já cobrindo P0-01; adicionar causa raiz e correção de referência disponível (fix P0-06).
2. **R-17 (novo)** — abrir para P0-02b; sem ID prévio.
3. **P0-02a vs. relatório de 02/08** — registrar divergência como nota metodológica (fonte original irreprodutível, `test_rechdocs_v340.mjs` nunca commitado).
4. **P0-03** — nova entrada em `CHANGE_IMPACT.md` como funcionalidade a implementar, referenciando `COPY_POLICY_CONTRACT.md`.
5. **CI-05** — nota em `FUNCTION_COMPARISON.md`/`CHANGE_IMPACT.md` de que `buildExamesCompactos()` não é port direto da referência.
6. Nenhum destes cobre a lista completa "Gate mínimo para RC clínica" do relatório de 02/08 — esta rodada valida apenas P0-01/P0-02/P0-03/CI-05.
