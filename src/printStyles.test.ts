import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

/** O trecho entre "@media print {" e o fechamento dele. */
function printBlock(source: string): string {
  const start = source.indexOf('@media print');
  if (start < 0) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

describe('impressão do relatório', () => {
  const block = printBlock(css);

  it('existe um bloco de impressão', () => {
    expect(block).toContain('.report-print-root');
  });

  it('pede ao navegador para manter as cores de fundo e os degradês no PDF', () => {
    // Sem isso, o Chrome e o Edge tiram fundos e degradês ao imprimir, e o relatório sai em preto e branco.
    expect(block).toMatch(/print-color-adjust:\s*exact/);
    expect(block).toMatch(/-webkit-print-color-adjust:\s*exact/);
  });

  it('aplica isso ao relatório inteiro, não só à raiz', () => {
    expect(block).toMatch(/\.report-print-root \*[^{]*\{[^}]*print-color-adjust:\s*exact/);
  });
});
