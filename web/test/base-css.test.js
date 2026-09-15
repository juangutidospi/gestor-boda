import { register } from './runner.js';
import { base } from '../js/core/base.css.js';

register('core/base.css', () => {
  const out = [];
  const text = [...base.cssRules].map((r) => r.cssText).join('\n');

  const needed = ['.card', '.btn', '.btn-primary', '.tag', '.field', '.seg', '.grid', '.page-head'];
  const missing = needed.filter((sel) => !text.includes(sel));
  out.push({ name: 'incluye las clases del design-system', ok: !missing.length, detail: missing.join(', ') });

  const hex = text.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  out.push({ name: 'sin colores hex hardcodeados', ok: hex.length === 0, detail: hex.join(', ') });

  out.push({ name: 'usa tokens de color', ok: text.includes('var(--color-accent)'), detail: '' });
  return out;
});
