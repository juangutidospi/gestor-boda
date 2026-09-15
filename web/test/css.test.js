import { register } from './runner.js';
import { css } from '../js/core/css.js';

register('core/css', () => {
  const out = [];
  const sheet = css`:host { color: red; }`;
  out.push({ name: 'devuelve un CSSStyleSheet', ok: sheet instanceof CSSStyleSheet, detail: '' });
  const withValue = css`:host { --n: ${42}px; }`;
  const text = [...withValue.cssRules].map((r) => r.cssText).join('');
  out.push({ name: 'interpola valores', ok: text.includes('42px'), detail: text });
  return out;
});
