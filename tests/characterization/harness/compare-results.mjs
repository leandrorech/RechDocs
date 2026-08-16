// Taxonomia de classificacao para a characterization suite. Nao substitui a
// taxonomia de reports/REGRESSION_RISKS.md — e usada apenas nos relatorios
// de characterization (ex.: reports/P0_REVALIDATION_CURRENT_CANDIDATE.md)
// ate uma reconciliacao deliberada.
export const TAXONOMY = Object.freeze({
  EXPECTED_CHANGE: 'EXPECTED_CHANGE',
  REGRESSION: 'REGRESSION',
  UNRESOLVED: 'UNRESOLVED',
  BASELINE_BUG_REVEALED: 'BASELINE_BUG_REVEALED',
  REFERENCE_BUG_REVEALED: 'REFERENCE_BUG_REVEALED',
  TEST_DESIGN_ERROR: 'TEST_DESIGN_ERROR',
  AMBIGUOUS_SPEC: 'AMBIGUOUS_SPEC',
});

export const EVIDENCE_KIND = Object.freeze({
  STATIC_CODE_EVIDENCE: 'STATIC_CODE_EVIDENCE',
  DYNAMIC_E2E_EVIDENCE: 'DYNAMIC_E2E_EVIDENCE',
});

// Ordem de precedencia de julgamento pedida explicitamente (do mais para o
// menos autoritativo). Nao e usada mecanicamente por uma funcao generica —
// cada fixture aplica esta ordem ao decidir sua propria classificacao, e o
// relatorio final documenta o raciocinio caso a caso. Mantida aqui como
// referencia central para nao divergir entre fixtures.
export const JUDGMENT_PRECEDENCE = Object.freeze([
  'decisao_operacional_explicita',
  'invariante_clinico_de_seguranca',
  'contrato_temporal_ou_proveniencia',
  'referencia_v3_4_0_quando_contem_correcao_deliberada',
  'baseline_apenas_como_characterization_historica',
]);

export function verdict(pass) {
  return pass ? 'PASS' : 'FAIL';
}
