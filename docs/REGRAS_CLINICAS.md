# Regras clínicas e documentais invariantes

## Princípio central

O RechDocs organiza e transforma informações fornecidas. Ele não completa lacunas por plausibilidade clínica.

## Invariantes

- Dado ausente permanece ausente.
- “Não informado” não equivale a “ausente”, “negado” ou “normal”.
- Uma inferência clinicamente relevante deve permanecer identificável e revisável.
- Conteúdo com inferência não resolvida não deve ser liberado para cópia final sem mecanismo explícito de revisão.
- Datas válidas têm precedência sobre datas ausentes ou inválidas.
- A cronologia deve ser reconstruída pelas fontes, não pela ordem de colagem.
- Unidades não podem ser convertidas ou removidas quando isso puder alterar interpretação.
- Medicamentos devem permanecer nas classes funcionais corretas; antitrombóticos, sedação, DVA, antimicrobianos e outras infusões não podem ser misturados silenciosamente.
- Exames pertencem à seção de exames; não devem ser distribuídos em narrativa sem regra explícita.
- Reformulações não podem introduzir causalidade, gravidade ou diagnóstico que não conste na fonte.
- O texto final deve permitir rastrear transformações clinicamente relevantes.

## Dados e privacidade

- Não persistir conteúdo clínico além do necessário.
- A ação de limpar sessão deve remover rascunhos, conteúdo clínico, resultados e segredos locais relacionados.
- Nunca registrar chave de API em logs.
- Não enviar documentos a serviços não previstos pelo usuário.
