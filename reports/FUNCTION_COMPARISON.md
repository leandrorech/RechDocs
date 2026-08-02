# RechDocs — comparação técnica e funcional (Fase 1)

Data: 31/07/2026  
Escopo: análise sem implementação  
Baseline canônica: `rech_docs_v3_3_12_P1.html`  
Referência funcional: `RechDocs_v3.4.0(1).html`

## Integridade dos artefatos

| Artefato | SHA-256 | Bytes | Linhas | Funções detectadas | IDs estáticos |
|---|---|---:|---:|---:|---:|
| v3.3.12-P1 | `56faa85057464a6fa65fafd4fce631eea446a01dc6b1fc7d6dc34a2eeeaef667` | 205.250 | 3.321 | 121 | 60 |
| v3.4.0 referência | `6c8e823bae12d3bfd9c577375adaf888f19f1babac35f1c04ee67534c3dd0073` | 187.738 | 2.951 | 101 | 60 |

O hash da baseline coincide com o hash canônico informado em `AUDITORIA_2026-07-31.md`. A cópia temporária inicialmente encontrada estava truncada e foi descartada; nenhuma conclusão abaixo deriva dela.

## Veredito executivo

A v3.4.0 não é uma evolução linear da baseline. É um ramo funcional que acrescenta pré-evolução editável, mas perdeu 26 funções exclusivas da v3.3.12-P1 relacionadas a rastreabilidade, bloqueio de cópia, validação de transformações, normalização e separação farmacológica. O port literal da pré-evolução é inseguro porque `renderOutputDocument()` substitui o caminho `renderTraceableOutput()` e torna o conteúdo editável sem preservar o estado de bloqueio.

## Inventário de funções exclusivas

### Presentes somente na baseline (26)

| Grupo | Funções | Consequência se perdidas |
|---|---|---|
| Rastreabilidade | `appendTraceField`, `collectAuditedFreeText`, `findTraceRanges`, `normalizeTraceType`, `normalizedLiteral`, `renderTraceableOutput`, `renderTraceReview`, `resetTraceReview`, `validateTraceability`, `validateUndeclaredTransformations` | Inferências/reformulações deixam de ser detectáveis, revisáveis e visualmente marcadas. |
| Bloqueio | `setCopyBlocked`, `isUnresolvedClinicalValue` | Cópia pode ser liberada com pendência/inferência ou alergia sentinela. |
| Condutas/cronologia | `extractExplicitCondutas`, `applyExplicitUpdateCondutas` | Plano histórico pode reaparecer apesar de Box atual explícito. |
| Farmacologia | `fAntitromboticosEmUso`, `fOutrasInfusoes` | Antitrombóticos ou insulina podem desaparecer/migrar para seção errada. |
| Unidades/renderização | `formatClinicalMeasurement`, `formatControlValue`, `formatHeight`, `formatSapsLine`, `formatTemperature`, `formatWeight`, `normalizeExistingControlLine` | Risco de `KGKG`, `MMHG MMHG`, `AFEBRIL °C`, SAPS concatenado e controles malformados. |
| Validação clínica | `extractAnalyteNumber`, `findTaggedAnalyte`, `isMechanicalVentilationMode` | Perda de alertas pós-transfusão/renal; ar ambiente pode ser tratado como VM. |

### Presentes somente na referência (6 detectadas)

| Função | Papel | Decisão de integração |
|---|---|---|
| `buildExamesCompactos` | Agrupa exames por categoria em linha contínua. | Portar após corrigir ordenação temporal, deduplicação e preservação de unidades. |
| `chronoScore` | Auxiliar local de cronologia ventilatória. | Não portar isoladamente; a baseline já tem lógica mais segura de episódios ventilatórios. |
| `preparePreEvolutionText` | Esvazia controles de 24 h e intercorrências por regex textual. | Reprojetar sobre estrutura/seções; regex é frágil a caixa, acentos e variações do template. |
| `renderOutputDocument` | Torna saída editável e destaca exame físico/condutas. | Não portar literalmente; precisa compor com rastreabilidade e bloqueio. |
| `setPrefillMode` | Ativa estado global `PREFILL_MODE`. | Portar como estado de UI derivado, sem segundo estado clínico. |
| `append` | Função local interna de `renderOutputDocument`, detectada no inventário léxico. | Não é API independente. |

## Funções compartilhadas com comportamento clinicamente divergente

| Área/função | Baseline v3.3.12-P1 | Referência v3.4.0 | Veredito |
|---|---|---|---|
| `futurePlanWarnings` | Limites Unicode; “amanhã” é detectado; gera `⛔` bloqueante. | Usa `\b` ASCII; pode falhar após `ã`; gera apenas `⚠`. | Preservar baseline. |
| `normalizeDeviceName` | Reconhece nomes extensos (CVC, SVD, SNE, TQT etc.). | Mapa mais estreito. | Preservar baseline. |
| `parseDateOnlyScore`/`parseHoraMinutos` | Data ancorada integralmente e hora aceita `12h30`; valida calendário em UTC. | Regex/data/hora menos consistente em alguns formatos. | Preservar e ampliar por testes, não substituir. |
| `comparaPrecedencia`/`ClinicalState` | Menção indeterminada nunca apaga fato; conflitos genéricos explícitos; episódios ventilatórios não herdam parâmetros pré-extubação. | Pode considerar todos os eventos ao resolver parâmetros, criando configuração sintética entre episódios. | Bloqueio P0: preservar baseline. |
| `calcDrivingValue`/`calcCompliance` | Rejeita Pplat ≤ PEEP e valores não positivos. | Validação inferior em parte da linhagem. | Preservar baseline. |
| `runValidations` | P/F não diagnostica SDRA; K < 3,5 com insulina; Mg exige unidade; pós-transfusão e piora renal. | Classifica SDRA por P/F isolada; limiar de K e textos menos seguros; faltam verificações adicionais. | Preservar baseline. |
| `fSedacao` | Somente sedoanalgesia. | Recebe também `outras_infusoes`. | Preservar baseline. |
| `renderAdmissao`/`renderEvolucao` | Seções próprias para antitrombóticos e outras infusões; normalização de unidades/SAPS. | Mistura outras infusões com sedação e não possui a mesma apresentação farmacológica. | Preservar baseline. |
| `buildInterconsultas` | Sem data: não injeta marcador técnico no texto final; conflito permanece fora do documento. | Insere `⚠ DATA NÃO INFORMADA` no documento. | Baseline é canônica; decisão humana apenas sobre como mostrar pendência no preview. |
| `buildCriticalPendencies` | Trata sentinelas de ausência e conflitos como bloqueantes. | Menor cobertura. | Preservar baseline. |
| `processar` | Valida rastreabilidade, transformações omitidas, condutas explícitas, pendências e chama renderização rastreável. | Envia direto ao editor de pré-evolução; não possui contrato de rastreabilidade/bloqueio equivalente. | Reescrever integração em torno do pipeline baseline. |
| Adaptadores `callOpenAI/Gemini/Qwen/DeepSeek` | Melhor tratamento de recusa/truncamento e Qwen textual sem visão anunciada. | Divergências de payload/retorno e Qwen marcado com visão. | Preservar baseline; testar por provedor. |

## DOM e handlers

| Item | Baseline | Referência |
|---|---:|---:|
| IDs estáticos | 60 | 60 |
| IDs duplicados | 0 | 0 |
| Referências literais a IDs ausentes | 0 | 0 |
| Handlers inline | 26 | 27 |
| Handlers simples órfãos | 0 | 0 |

Diferenças de DOM:

- Somente baseline: `trace-card`, `trace-list`.
- Somente referência: `prefill-box`, `prefill-mode`.
- Handler exclusivo da referência: `onchange="setPrefillMode(this.checked)"`.
- A baseline remove `contenteditable` do `<pre>` e controla a saída rastreável por nós de texto.
- A referência aplica `contentEditable=true` ao mesmo `output-body`, criando risco de invalidar a correspondência entre texto final, trilha e pendências.

## Armazenamento

As duas versões usam o mesmo contrato aparente:

- `localStorage.key_storage_mode_v31`;
- `localStorage.provider_v3`;
- `localStorage.model_<provider>`;
- `localStorage.rech_dict_v3`;
- `localStorage.lgpd_ok_v3`;
- chave persistente `localStorage.key_<provider>` quando modo local;
- chave temporária `sessionStorage.session_key_<provider>` quando modo sessão.

Provedores configurados: Anthropic, OpenAI, Gemini, DeepSeek e Qwen. Os wrappers `safeLocalStorage`/`safeSessionStorage` degradam para memória quando o navegador bloqueia storage.

Conflito: `reiniciarTudo()` limpa conteúdo clínico da interface, anexos e resultado, mas deliberadamente não remove chave/configuração. Isso é útil entre pacientes, porém não satisfaz sozinho o requisito posterior de “limpeza completa da sessão”. A implementação deve manter duas ações distintas: “novo caso” e “encerrar/limpar sessão completa”.

## Fluxo de importação e extração

Fluxo compartilhado:

1. Entrada textual em documento prévio, atualização e dados atuais.
2. Imagens/PDFs categorizados; limite de 10 imagens; compressão local.
3. PDF convertido assincronamente; `PDF_PROCESSING_COUNT` bloqueia geração incompleta.
4. Detecção de identificadores prováveis (`detectPHI`) antes do envio.
5. Construção de prompt por modo; chamada ao provedor selecionado.
6. Parsing JSON, normalização, `ClinicalState.resolve()`, validações e renderização.

A baseline acrescenta, após a resposta:

- contrato obrigatório `rastreabilidade`;
- validação do trecho final, fonte e justificativa;
- detecção textual de transformação não declarada quando comparável;
- substituição explícita das condutas pelo último Box atual;
- pendência/bloqueio antes de copiar;
- renderização segura com `createTextNode`/`textContent`.

## Pré-evolução e exportação

A referência oferece visualização/edição no próprio `output-body`, compacta exames, esvazia controles/intercorrências e realça exame físico/condutas. Não há exportação de arquivo estruturada: a saída efetiva continua sendo cópia do `textContent`; impressão depende do navegador. A expressão “exportação” na Fase 1 deve, portanto, ser separada em copiar, imprimir e eventual download futuro.

Problemas do módulo de referência:

1. `preparePreEvolutionText()` depende de cabeçalhos e intervalos textuais rígidos.
2. `buildExamesCompactos()` preserva a ordem recebida, mas não prova ordenação por data nem deduplicação cumulativa.
3. Edição livre não atualiza `ClinicalState`, rastreabilidade ou pendências.
4. `renderOutputDocument()` não chama o renderizador rastreável.
5. Não existe cancelamento/restauração explícita do texto pré-edição.
6. Copiar após edição não revalida alterações.

## Superfície de segurança técnica

- `eval`, `new Function` e timers por string: ausentes nas duas versões.
- Atribuições `innerHTML`: 5 em cada versão, usadas sobretudo em componentes locais; continuam sendo superfície a revisar.
- Atribuições `textContent`: 31 na baseline e 23 na referência.
- Endpoints `fetch` literais: Anthropic, OpenAI, DeepSeek e DashScope/Qwen; Gemini usa URL construída dinamicamente.
- Não foi observada telemetria adicional.

## Conclusão

A integração correta é aditiva sobre a v3.3.12-P1. Apenas os controles de pré-evolução, compactação e preview podem ser reaproveitados conceitualmente. O pipeline, `ClinicalState`, renderizadores clínicos, classes farmacológicas, rastreabilidade e bloqueio devem permanecer os da baseline.
