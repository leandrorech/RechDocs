# Regressão — Karen Fabiana Rodrigues da Paixão Gomes — modo Casual

Data de inclusão: 09/08/2026

## Objetivo

Validar que o modo Casual altera somente a escrita e preserva integralmente a estrutura canônica do modelo de Evolução.

## Condições críticas do caso

- Evolução UTI prévia com estrutura completa.
- Interconsultas: Cirurgia Geral em 05/08, 06/08 e 07/08; Cirurgia Oncológica em 09/08.
- Cirurgia Geral 07/08 orienta suspensão da antibioticoprofilaxia e retirada da SVD.
- Cirurgia Oncológica 09/08 orienta progressão de dieta, correção de hiponatremia e alta da UTI para enfermaria.
- Exame físico fonte contém `ACV: BRNF 2T SEM SOPROS` e `NEURO: SEM DÉFICITS NEUROLÓGICOS AGUDOS`.
- Não há descrição de pupilas isocóricas/fotorreagentes no material-fonte.
- Justificativa antiga de permanência: `3º PO LAPAROTOMIA EXPLORADORA`.
- Laboratórios de 08/08/2026: Hb 7,2 g/dL; Ht 22,3%; leucócitos 4.600/mm³; plaquetas 109.000/mm³; Na 131 mmol/L; K 3,5 mmol/L; Mg 1,6 mg/dL; Cr 0,5 mg/dL; ureia 15,8 mg/dL; PCR 62,12 mg/L; INR 1,29; TTPa 20 s.

## Asserções obrigatórias

A saída deve preservar o modelo de Evolução, incluindo suas seções e ordem canônicas. O seletor Casual não pode redesenhar o template.

Falhar se ocorrer qualquer item abaixo:

1. `##` ou outro marcador Markdown visível.
2. `— RESPONDIDA` ou status de interconsulta não explícito na fonte.
3. Inclusão de `PUPILAS ISOCÓRICAS`, `FOTORREAGENTES`, `SEM DÉFICIT MOTOR APARENTE` ou outro achado neurológico não fornecido.
4. Transformação de `ACV: BRNF 2T SEM SOPROS` em achado clínico diferente, além de correção mínima de pontuação/gramática.
5. SVD de 05/08, retirada em 07/08, exibida como dispositivo invasivo ativo atual.
6. Perda de qualquer uma das quatro interconsultas ou fusão entre datas.
7. Perda de autoria/especialidade da Cirurgia Oncológica em 09/08.
8. Manutenção silenciosa de ceftriaxona/metronidazol como ativos sem reconciliar a orientação de suspensão da antibioticoprofilaxia de 07/08.
9. Manutenção da justificativa `3º PO LAPAROTOMIA EXPLORADORA` como justificativa atual sem tratar a alta da UTI de 09/08.
10. Despejo integral do laudo laboratorial em vez de representação compacta por data.
11. Alteração estrutural do template decorrente do modo Casual.

## Critério linguístico do Casual

Permitido:
- corrigir ortografia;
- corrigir acentuação;
- corrigir concordância;
- corrigir pontuação;
- padronizar espaços e caixa;
- preservar abreviações médicas usuais.

Proibido:
- sofisticar a narrativa sem necessidade;
- expandir exame físico;
- criar achados;
- criar diagnósticos;
- criar causalidade;
- alterar autoria;
- mudar estrutura do documento.
