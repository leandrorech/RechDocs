# Plano de implementação — RechDocs v3.4.1

Status original: planejamento da Fase 1.  
Status em 31/07/2026: executado na Fase 2; detalhes e desvios controlados estão em `CHANGE_IMPACT.md` e `TEST_RESULTS.md`.

## Estratégia

Criar a v3.4.1 como cópia da v3.3.12-P1 e portar somente capacidades de interface/apresentação. O estado clínico reconciliado continuará único. A referência não será usada como arquivo-base nem como fonte de motor clínico.

## Sequência proposta

### Etapa 0 — decisões antes de código

1. Confirmar modelo de edição: livre com revalidação ou campos controlados.
2. Fixar regra de ordenação/deduplicação de exames.
3. Definir exportação e limpeza completa da sessão.
4. Confirmar tratamento visual de interconsultas sem data.

### Etapa 1 — congelamento e cobertura

1. Copiar a baseline íntegra para `output/RechDocs_v3.4.1.html`; nunca editar o original.
2. Registrar hashes de origem e saída inicial.
3. Manter as suítes `baseline.characterization.cjs` e `baseline.clinical.cjs` verdes.
4. Migrar os 37 testes históricos para um runner disponível ou adicionar dependência de desenvolvimento vendorizada/aprovada, sem dependência externa em runtime.
5. Adicionar fixtures de episódio ventilatório, P/F, K/insulina, pós-transfusão, PHI, truncamento de provider e transformação omitida.

### Etapa 2 — controles de pré-evolução

1. Adicionar `prefill-box` e `prefill-mode` sem remover `trace-card`/`trace-list`.
2. Substituir `PREFILL_MODE` global solto por estado de UI explícito, derivado do modo Evolução.
3. Adicionar snapshot imutável do texto/estado antes da edição e ação Cancelar.
4. Garantir que trocar de modo ou reiniciar caso destrua o snapshot e o rascunho anterior.

### Etapa 3 — modelo de pré-evolução seguro

1. Gerar pré-evolução a partir de `finalData` da baseline.
2. Representar seções em estrutura intermediária; evitar regex gulosa sobre documento inteiro.
3. Esvaziar somente valores de controles de 24 h e intercorrências, preservando cabeçalhos.
4. Manter identificação, HD/hipóteses, HPMA/HDA e antecedentes conforme estado reconciliado.
5. Campos sem dado permanecem vazios.

### Etapa 4 — exames compactos cumulativos

1. Criar função pura `buildCompactExamTimeline(exames, policy)`.
2. Validar datas com `parseDateOnlyScore`/`parseDateTimeScore` da baseline.
3. Preservar nome, resultado, unidade textual, data, hora e origem.
4. Não converter unidade e não deduplicar até regra humana definida.
5. Renderizar compactação apenas como apresentação; manter array canônico intacto.

### Etapa 5 — editor, rastreabilidade e bloqueio

1. Compor blocos de revisão com `renderTraceableOutput`; não substituí-lo.
2. Toda edição pós-renderização cria registro explícito de alteração humana.
3. Ao editar, invalidar a autorização de cópia e executar novamente validações determinísticas.
4. Inferência não resolvida continua bloqueante mesmo se o usuário editar outro trecho.
5. `copiar()` deve verificar estado interno na hora da ação, não apenas `disabled` do botão.

### Etapa 6 — preview, cópia, impressão e cancelamento

1. Preview mostra simultaneamente alertas, rastreabilidade e blocos a revisar.
2. Copiar usa o texto clínico limpo e só libera após validação.
3. Impressão deve manter texto e avisos necessários sem incluir controles interativos.
4. Cancelar restaura snapshot exato e reativa estado de bloqueio anterior.

### Etapa 7 — privacidade e limpeza

1. Preservar “Novo caso” para limpar apenas dados clínicos.
2. Criar “Encerrar sessão completa” para limpar DOM, anexos, resultados, chaves de sessão e, após confirmação explícita, chaves locais.
3. Testar `safeLocalStorage`, `safeSessionStorage` e fallback em memória.
4. Não adicionar telemetria, log clínico ou envio novo.

### Etapa 8 — validação final

1. Sintaxe JS e integridade DOM/handlers.
2. Suítes de baseline + integração + fluxos de UI.
3. Testes offline por abertura direta `file://`.
4. Testes de clipboard/print em navegadores suportados.
5. Testes de adaptadores com `fetch` simulado, nunca chave real.
6. Documentar cada mudança clínica em `CHANGE_IMPACT.md`.

## Critérios de aceite da Fase 2/3

- 26 funções exclusivas de segurança permanecem presentes ou têm substituto comprovadamente equivalente.
- Nenhum teste da baseline regride.
- Pré-evolução não cria segundo parser/classificador/estado clínico.
- Edição não contorna bloqueio.
- Compactação é reversível em relação aos dados estruturados.
- Cancelar restaura estado.
- Limpeza completa é verificável.
- Sem IDs duplicados, handlers órfãos, erro inicial, `eval` ou dependência externa em runtime.

## Fora de escopo neste ciclo

- Criação de `output/RechDocs_v3.4.1.html`.
- Alteração de baseline/reference.
- Deploy, GitHub, publicação ou chamada real de API.
- Validação institucional/LGPD formal.
