// Normalizacao minima para comparacao de texto (preview/output), evitando
// diff bruto de HTML/whitespace irrelevante. Nao normaliza conteudo clinico
// (numeros, unidades, nomes) — so espacamento/quebras de linha cosmeticos.
export function normalizeWhitespace(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n')
    .trim();
}

export function linesOf(text) {
  return normalizeWhitespace(text).split('\n').filter(Boolean);
}
