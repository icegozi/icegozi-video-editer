import { describe, it, expect } from 'vitest';
import katex from 'katex';

describe('Formula Typesetting & KaTeX Renderer (Finding I9)', () => {
  it('correctly typesets Euler formula', () => {
    const eulerLatex = 'e^{i\\pi} + 1 = 0';
    const html = katex.renderToString(eulerLatex, {
      displayMode: true,
      throwOnError: false,
      trust: false,
    });

    expect(html).toContain('katex');
    expect(html).toContain('katex-html');
    expect(html).toContain('e');
    expect(html).toContain('π');
  });

  it('correctly typesets fractions and square roots', () => {
    const math = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    const html = katex.renderToString(math, {
      displayMode: true,
      throwOnError: false,
      trust: false,
    });

    expect(html).toContain('katex');
    expect(html).toContain('frac');
    expect(html).toContain('sqrt');
  });

  it('handles invalid LaTeX gracefully without crashing when throwOnError is false', () => {
    const invalid = '\\invalidCommand{123';
    const html = katex.renderToString(invalid, {
      displayMode: true,
      throwOnError: false,
      trust: false,
    });

    expect(html).toContain('katex-error');
  });
});
