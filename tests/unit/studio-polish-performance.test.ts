import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 7: Studio Polish, Brand Touch & Performance (UI-14, UI-15)', () => {
  it('ensures editor.css has resilient system font stack and no external @import', () => {
    const cssPath = path.resolve('src/editor/tokens/editor.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // System font stack with robust offline fallback
    expect(css).toContain('ui-sans-serif');
    expect(css).toContain('system-ui');
    expect(css).not.toContain('@import url(');
  });

  it('validates editor.css declares motion tokens and reduced-motion fallback', () => {
    const cssPath = path.resolve('src/editor/tokens/editor.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('--motion-duration-fast: 120ms');
    expect(css).toContain('--motion-duration-normal: 180ms');
    expect(css).toContain('--motion-duration-deliberate: 240ms');
    expect(css).toContain('--motion-ease: cubic-bezier');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important');
    expect(css).toContain('transition-duration: 0.01ms !important');
  });

  it('declares brand identity, tabular numerals and GPU acceleration classes', () => {
    const cssPath = path.resolve('src/editor/tokens/editor.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain('.tabular-nums');
    expect(css).toContain('.brand-badge-glow');
    expect(css).toContain('.animate-fade-in');
    expect(css).toContain('.gpu-accelerated');
  });
});
