import './js/components/views/finca-view/finca-view.js';
import './js/components/views/invitados-view/invitados-view.js';
import './js/components/views/proveedores-view/proveedores-view.js';
import { t, setLang, getLang } from './js/i18n/index.js';
import { configRepo, ensureSeeded } from './js/core/repos.js';
import { escapeHtml } from './js/core/escape-html.js';

/** Las seis vistas del prototipo, con su id y su clave de rótulo. */
const NAV = [
  { id: 'view-invitados', key: 'nav.invitados' },
  { id: 'view-finca', key: 'nav.finca' },
  { id: 'view-salon', key: 'nav.salon' },
  { id: 'view-proveedores', key: 'nav.proveedores' },
  { id: 'view-presupuesto', key: 'nav.presupuesto' },
  { id: 'view-timing', key: 'nav.timing' },
];

/** Pinta los enlaces de navegación. */
function paintNav() {
  const nav = document.getElementById('nav');
  const active = document.querySelector('.view.active')?.id ?? 'view-finca';
  nav.innerHTML = NAV.map((n) => `
    <button data-nav="${n.id}" aria-current="${n.id === active}">${escapeHtml(t(n.key))}</button>`).join('');
  nav.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => setActiveView(b.dataset.nav));
  });
}

/** Traduce los rótulos del chrome con clave data-i18n. */
function paintChrome() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

/**
 * Muestra una vista por su id, le pide refrescarse y rellena el placeholder
 * de las vistas aún no implementadas.
 * @param {string} id
 */
function setActiveView(id) {
  const known = NAV.some((n) => n.id === id) ? id : 'view-finca';
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === known));
  document.querySelectorAll('[data-nav]').forEach((b) => b.setAttribute('aria-current', b.dataset.nav === known));
  const el = document.getElementById(known);
  if (typeof el.refresh === 'function') el.refresh();
  else fillSoon(el); // vistas no-Finca: placeholder "próximamente"
  if (location.hash.slice(1) !== known) history.replaceState(null, '', `#${known}`);
}

/**
 * Rellena una vista aún no implementada con un mensaje "próximamente".
 * @param {HTMLElement} el
 */
function fillSoon(el) {
  el.innerHTML = `
    <div style="max-width:520px;margin:10vh auto;text-align:center;color:var(--color-text-muted)">
      <h2 style="font-family:var(--font-heading);color:var(--color-text)">${escapeHtml(t('common.soon'))}</h2>
      <p>${escapeHtml(t('common.soon.desc'))}</p>
    </div>`;
}

/** @param {string} id Tema a aplicar ('light' | 'dark'). */
function applyTheme(id) { document.documentElement.dataset.theme = id; }

// Toggle de tema: alterna claro/oscuro y lo recuerda en configRepo
document.getElementById('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  configRepo.set({ theme: next });
});

// Toggle de idioma: alterna ES/EN y lo recuerda en configRepo
document.getElementById('lang').addEventListener('click', () => {
  const next = getLang() === 'es' ? 'en' : 'es';
  setLang(next);
  configRepo.set({ lang: next });
});

// Al cambiar idioma, repintar el chrome y el nav
window.addEventListener('i18n:changed', () => { paintChrome(); paintNav(); });

// Arranque: sembrar datos de ejemplo antes de nada que pueda leerlos
ensureSeeded();

// Arranque: tema e idioma recordados en configRepo (única fuente de verdad)
const cfg = configRepo.get();
if (cfg.theme) applyTheme(cfg.theme);
if (cfg.lang && cfg.lang !== getLang()) setLang(cfg.lang);

paintChrome();
paintNav();
setActiveView(location.hash.slice(1) || 'view-finca');
window.addEventListener('hashchange', () => setActiveView(location.hash.slice(1) || 'view-finca'));
