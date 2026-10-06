import './js/components/views/home-view/home-view.js';
import './js/components/views/finca-view/finca-view.js';
import './js/components/views/invitados-view/invitados-view.js';
import './js/components/views/proveedores-view/proveedores-view.js';
import './js/components/views/presupuesto-view/presupuesto-view.js';
import './js/components/views/salon-view/salon-view.js';
import './js/components/views/timing-view/timing-view.js';
import './js/components/views/login-view/login-view.js';
import { t, setLang, getLang } from './js/i18n/index.js';
import { configRepo, ensureSeeded } from './js/core/repos.js';
import { escapeHtml } from './js/core/escape-html.js';
import { isConfigured, getSession, onAuthChange, signOut } from './js/core/auth.js';
import { hydrate } from './js/core/remote.js';

/** Envuelve el `<path>` de un icono en un SVG de trazo (hereda el color del texto). */
const svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Las seis vistas del prototipo, con su id, su clave de rótulo y su icono. */
const NAV = [
  { id: 'view-home', key: 'nav.inicio', icon: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>') },
  { id: 'view-invitados', key: 'nav.invitados', icon: svg('<circle cx="9" cy="8" r="3.1"/><path d="M3.2 20c0-3.2 2.6-5.8 5.8-5.8s5.8 2.6 5.8 5.8"/><path d="M16.2 4.1a3.1 3.1 0 0 1 0 6M18 14.4c2.1.5 3.8 2.4 3.8 4.9"/>') },
  { id: 'view-finca', key: 'nav.finca', icon: svg('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v9.5h13V10"/><path d="M9.8 19.5V14h4.4v5.5"/>') },
  { id: 'view-salon', key: 'nav.salon', icon: svg('<circle cx="7.2" cy="7.5" r="2.4"/><circle cx="16.8" cy="7.5" r="2.4"/><circle cx="12" cy="16.2" r="2.6"/>') },
  { id: 'view-proveedores', key: 'nav.proveedores', icon: svg('<rect x="3.2" y="7.3" width="17.6" height="12.5" rx="2"/><path d="M8.3 7.3V5.6a2 2 0 0 1 2-2h3.4a2 2 0 0 1 2 2v1.7"/><path d="M3.2 12.2h17.6"/>') },
  { id: 'view-presupuesto', key: 'nav.presupuesto', icon: svg('<path d="M16.5 8.2a4.6 4.6 0 1 0 0 7.6"/><path d="M4.3 11h8.4M4.3 13.6h7.2"/>') },
  { id: 'view-timing', key: 'nav.timing', icon: svg('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.3V12l3.1 2"/>') },
];

/** Pinta los enlaces de navegación (icono + rótulo). */
function paintNav() {
  const nav = document.getElementById('nav');
  const active = document.querySelector('.view.active')?.id ?? 'view-home';
  nav.innerHTML = NAV.map((n) => `
    <button type="button" data-nav="${n.id}"${n.id === active ? ' aria-current="page"' : ''}><span class="nav-ic">${n.icon}</span><span class="nav-lb">${escapeHtml(t(n.key))}</span></button>`).join('');
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
  const known = NAV.some((n) => n.id === id) ? id : 'view-home';
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === known));
  document.querySelectorAll('[data-nav]').forEach((b) => {
    if (b.dataset.nav === known) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const el = document.getElementById(known);
  if (typeof el.refresh === 'function') el.refresh();
  else fillSoon(el); // vistas no-Finca: placeholder "próximamente"
  if (location.hash.slice(1) !== known) history.replaceState(null, '', `#${known}`);
  closeMenu(); // cierra el menú móvil tras navegar
  window.scrollTo(0, 0); // al entrar en una sección, el scroll arriba
}

/** Cierra el menú hamburguesa (móvil). */
function closeMenu() {
  document.querySelector('.nav')?.classList.remove('is-open');
  document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'false');
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

// Menú hamburguesa (móvil): alterna el desplegable
document.getElementById('nav-toggle').addEventListener('click', () => {
  const nav = document.querySelector('.nav');
  const open = nav.classList.toggle('is-open');
  document.getElementById('nav-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
});

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

// Al cambiar idioma, repintar el chrome y el nav, y sincronizar <html lang>
window.addEventListener('i18n:changed', () => { document.documentElement.lang = getLang(); paintChrome(); paintNav(); });

/** Muestra u oculta la pantalla de acceso; conmuta la visibilidad del chrome+main. */
function showLogin(show) {
  const login = document.getElementById('login');
  const nav = document.querySelector('.nav');
  const main = document.querySelector('main.content');
  if (login) login.hidden = !show;
  if (nav) nav.style.display = show ? 'none' : '';
  if (main) main.style.display = show ? 'none' : '';
}

/** Arranca la app (tema/idioma, chrome, vista inicial). Idempotente. */
let appStarted = false;
function startApp() {
  if (appStarted) return;
  appStarted = true;
  ensureSeeded();
  const cfg = configRepo.get();
  if (cfg.theme) applyTheme(cfg.theme);
  if (cfg.lang && cfg.lang !== getLang()) setLang(cfg.lang);
  document.documentElement.lang = getLang();
  paintChrome();
  paintNav();
  setActiveView(location.hash.slice(1) || 'view-home');
  window.addEventListener('hashchange', () => setActiveView(location.hash.slice(1) || 'view-home'));
}

// Botón de salir (visible solo con sesión activa)
document.getElementById('logout')?.addEventListener('click', async () => { await signOut(); });

/**
 * Arranque con gate de autenticación. Sin Supabase configurado, la app corre en
 * modo local (como siempre). Con Supabase, exige sesión antes de mostrarla.
 */
async function boot() {
  if (!isConfigured()) { startApp(); return; } // modo local
  const logoutBtn = document.getElementById('logout');

  /** Hidrata desde Supabase (si procede) y arranca la app con sesión. */
  async function enter() {
    showLogin(false);
    if (logoutBtn) logoutBtn.hidden = false;
    try { await hydrate(); } catch (e) { console.warn('[remote] hidratación fallida:', e.message || e); }
    startApp();
  }

  // Muestra el login de inmediato (no depende de la red); si ya hay sesión,
  // enter() lo oculta. Así un fallo/lentitud del SDK nunca deja la página en blanco.
  showLogin(true);
  try {
    const session = await getSession();
    if (session) await enter();
    // Reacciona a login/logout en vivo. Importante: onAuthChange emite un evento
    // inicial con sesión nula; solo recargamos ante un cierre de sesión REAL
    // (cuando la app ya estaba arrancada), nunca en ese evento inicial.
    onAuthChange((s) => {
      if (s) { if (!appStarted) enter(); }
      else if (appStarted) { appStarted = false; location.reload(); }
    });
  } catch (e) {
    console.error('[auth] no se pudo iniciar Supabase:', e);
  }
}

boot();
