# Tutorial — iniciar a consolidação do RechDocs no Codex

## O que já está preparado

- baseline clínica canônica: `baseline/rech_docs_v3_3_12_P1.html`;
- versão de referência: `reference/RechDocs_v3.4.0_reference.html`;
- auditoria e veredito anteriores em `docs/`;
- regras clínicas obrigatórias;
- especificação da v3.4.1;
- tarefa detalhada do agente;
- auditoria estática inicial;
- diretórios separados para saída e relatórios.

## Opção preferida: aplicativo Codex

1. Extraia o ZIP para uma pasta simples, por exemplo:
   `C:\RechDocs-Consolidacao-Codex`
2. Abra o aplicativo Codex e entre com sua conta do ChatGPT.
3. Escolha **Add project / Adicionar projeto**.
4. Selecione a pasta extraída.
5. Abra `PROMPT_INICIAL.txt`, copie todo o conteúdo e envie como primeira tarefa.
6. No primeiro ciclo, não peça implementação. O agente deve apenas analisar, escrever o plano e criar testes de caracterização.
7. Confira se foram criados:
   - `reports/FUNCTION_COMPARISON.md`;
   - `reports/IMPLEMENTATION_PLAN.md`;
   - arquivos em `tests/`;
   - `reports/TEST_RESULTS.md`, se já houver execução.
8. Envie esses relatórios de volta ao ChatGPT para revisão antes de autorizar a implementação.

## Alternativa: Codex CLI no Windows

### Pré-requisitos

1. Git for Windows.
2. Node.js LTS, que inclui `npm`.
3. Codex CLI.

No PowerShell:

```powershell
npm install -g @openai/codex
codex --login
```

O login pode ser feito com a conta do ChatGPT. O Codex também está disponível em clientes como aplicativo, IDE, CLI e web, conforme a configuração da conta.

### Iniciar

1. Extraia o pacote.
2. Clique com o botão direito na pasta e escolha **Abrir no Terminal**.
3. Execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\INICIAR_CODEX_WINDOWS.ps1
```

4. Quando o Codex abrir, cole o conteúdo de `PROMPT_INICIAL.txt`.

## Por que começar apenas pela análise

A v3.3.12-P1 e a v3.4.0 são linhas divergentes. Um agente pode interpretar equivocadamente o número 3.4.0 como superior e trocar o núcleo clínico seguro. O primeiro ciclo cria uma comparação verificável e testes que congelam o comportamento da baseline antes da edição.

## Após revisar a Fase 1

A segunda instrução deverá autorizar a implementação da v3.4.1 conforme o plano aprovado. Não use “junte os arquivos” ou “use a versão mais nova”. A autorização deve reiterar que a v3.3.12-P1 é a baseline.

## Segurança prática

- Não use documentos reais de pacientes na primeira rodada.
- Use casos sintéticos e anonimizados nos testes.
- Não cole chave de API em prompt, código ou relatório.
- Mantenha o projeto local até a revisão final.
- Revise o diff antes de aceitar alterações extensas.
- Preserve os arquivos das pastas `baseline/` e `reference/`.

## Como interromper

Na CLI, use `Ctrl+C`. No aplicativo, interrompa a tarefa pelo controle disponível. Depois, peça ao agente que resuma exatamente o que foi alterado e quais testes foram executados.
