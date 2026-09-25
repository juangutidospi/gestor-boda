import { register } from './runner.js';

const REQUIRED = [
  '--color-bg', '--color-surface', '--color-text', '--color-divider',
  '--color-accent', '--color-accent-700', '--color-accent-100', '--color-accent-200',
  '--color-accent-300', '--color-neutral-100', '--color-neutral-200', '--color-neutral-600',
  '--color-neutral-700', '--color-neutral-900', '--color-text-muted',
  '--radius-md', '--radius-sm', '--font-heading', '--font-body',
  '--space-2', '--space-3', '--space-4', '--space-6', '--space-8', '--shadow-md',
];
const DARK_ROLES = ['--color-bg', '--color-surface', '--color-text', '--color-accent'];

register('css/tokens', async () => {
  const out = [];
  const cssText = await fetch('../css/tokens.css').then((r) => r.text());

  const rootBlock = cssText.slice(cssText.indexOf(':root'), cssText.indexOf('}', cssText.indexOf(':root')));
  const missing = REQUIRED.filter((tk) => !rootBlock.includes(tk));
  out.push({ name: 'todos los tokens exigidos en :root', ok: !missing.length, detail: missing.join(', ') });

  const darkStart = cssText.indexOf('[data-theme="dark"]');
  const darkBlock = darkStart >= 0 ? cssText.slice(darkStart, cssText.indexOf('}', darkStart)) : '';
  const darkMissing = DARK_ROLES.filter((tk) => !darkBlock.includes(tk));
  out.push({ name: 'el tema oscuro redefine los roles base', ok: darkStart >= 0 && !darkMissing.length, detail: darkMissing.join(', ') });

  // El tema claro usa el fondo crema de la paleta Earthy Minimal
  out.push({ name: 'tema claro con el fondo Earthy Minimal', ok: rootBlock.includes('#f8f6ee'), detail: '' });

  return out;
});
