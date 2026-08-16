# RechDocs v3.4.2 — escopo fechado

Data: 2026-08-16

## Mudanças

- UI/preview com fundo branco e densidade mais compacta; preview 7.5 pt e impressão 8 pt.
- Corrigido `AP: MV MV+ ...`: `fAP()` agora é idempotente para valores que já começam por `MV`.
- OpenAI: `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`.
- Gemini: `gemini-3.6-flash` e `gemini-3.1-pro-preview`.
- DeepSeek: `deepseek-v4-flash` e `deepseek-v4-pro`.
- Qwen: `qwen3.6-flash` e `qwen3.7-plus`, ambos com visão habilitada no endpoint Anthropic-compatible.
- Modelo salvo obsoleto não deixa mais o seletor vazio; cai para a primeira opção válida.
- Regra clínica canônica: RechDocs não corrige/ajusta doses; transcreve exatamente a fonte e sinaliza discrepâncias.
- Validador determinístico de literalidade de dose em entradas apenas-texto; com imagem/PDF, limita-se a sinalizar que a conferência literal automática não é possível.
- Política de saída preservada: WARN, NOT BLOCK.

## Fontes oficiais consultadas para catálogo de modelos

- OpenAI API — Models / GPT-5.6 family (16/08/2026).
- Google Gemini API — supported models / deprecations (16/08/2026).
- DeepSeek API — Change Log V4 (16/08/2026).
- Alibaba Cloud Model Studio — Anthropic-compatible Messages / Visual understanding / Base URL (16/08/2026).
