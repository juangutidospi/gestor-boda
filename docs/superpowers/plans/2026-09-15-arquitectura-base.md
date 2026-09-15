# Arquitectura base (Fase 0) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Montar la arquitectura base compartida (core, tokens/temas, i18n, chrome+router, repos de datos, primitivos UI y arnés de tests) sobre la que se construirán las seis vistas del gestor de bodas, sin implementar todavía la lógica de ninguna vista.

**Architecture:** Web Components vanilla sin build, servidos como módulos ES nativos desde `web/`. Cada componente extiende una clase base `AppElement` (Shadow DOM, estilos adoptados, auto-cleanup de listeners, repintado en `i18n:changed`). El estado vive en `localStorage` detrás de repositorios por entidad (`repos.js`) para poder cambiar a backend sin tocar vistas. Los estilos usan solo tokens CSS (`var(--…)`) definidos en `css/tokens.css`, con tema claro (paleta exacta del prototipo) y oscuro. El chrome global (nav, cabecera, toggles) vive en light DOM en `index.html`; el router por hash activa vistas y llama su `refresh()`.

**Tech Stack:** JavaScript (módulos ES nativos), Web Components (Custom Elements + Shadow DOM + adoptedStyleSheets + CSSStyleSheet), CSS custom properties con `color-mix()` y nesting nativo, Google Fonts (Cormorant Garamond + Jost). Sin bundler ni transpilación. Servidor estático para desarrollo (`python3 -m http.server`). Tests en navegador (página HTML que ejecuta suites JS).

**Spec:** `docs/superpowers/specs/2026-09-15-gestor-boda-arquitectura-design.md`

## Global Constraints

- Sin build: solo módulos ES nativos; nada de bundler, SASS ni transpilación.
- Shadow DOM por componente; consultas siempre con `this.$()` / `this.$$()`, nunca `document`.
- Colores y espaciado SOLO con tokens `var(--…)`; ningún color hardcodeado en componentes.
- Markup en getters `_xTpl` puros; listeners, `options` y datos en `afterRender()`.
- JSDoc en cada método/getter/helper (descripción + `@param` / `@returns`).
- Nombres descriptivos por rol; elementos del DOM con sufijo `…El` si guardan un elemento.
- i18n: todo texto con `t('clave')`; paridad de claves entre `es.js` y `en.js` (test).
- Idioma del código y comentarios: español. Sin texto en cursiva en documentación.
- Todo texto del chrome (light DOM) declara su clave con `data-i18n`.
- Rutas de import relativas exactas (p. ej. `../../../core/css.js` desde `ui/<name>/`).
- Ubicación raíz de la app: `web/`. Ruta de trabajo del repo: `gestor-boda`.

---

### Task 1: Andamiaje `web/` y helper `css`

**Files:**
- Create: `web/js/core/css.js`
- Create: `web/test/index.html`
- Create: `web/test/runner.js`
- Create: `web/test/css.test.js`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces:
  - `css(strings, ...values) -> CSSStyleSheet` en `web/js/core/css.js`.
  - `runner.js` exporta `register(name, runFn)` y `runAll() -> Promise<void>`, donde `runFn` devuelve `Array<{name: string, ok: boolean, detail: string}>`. Pinta resultados en `#out` de `test/index.html` y expone `window.__testFailures` (número) al terminar.

- [ ] **Step 1: Escribir el runner de tests**

Crear `web/test/runner.js`:

```js
/**
 * Arnés mínimo de tests en navegador: registra suites y las ejecuta,
 * pintando el resultado en la página. Sin dependencias ni build.
 */
const suites = [];

/**
 * Registra una suite.
 * @param {string} name Nombre visible de la suite.
 * @param {() => Array<{name: string, ok: boolean, detail: string}> | Promise<Array<{name: string, ok: boolean, detail: string}>>} runFn
 */
export function register(name, runFn) {
  suites.push({ name, runFn });
}

/** Ejecuta todas las suites y pinta el informe. Fija window.__testFailures. */
export async function runAll() {
  const out = document.getElementById('out');
  let failures = 0;
  for (const suite of suites) {
    const results = await suite.runFn();
    const section = document.createElement('section');
    section.innerHTML = `<h2>${suite.name}</h2>`;
    for (const r of results) {
      if (!r.ok) failures++;
      const line = document.createElement('div');
      line.textContent = `${r.ok ? 'PASS' : 'FAIL'} — ${r.name}${r.detail ? ` · ${r.detail}` : ''}`;
      line.style.color = r.ok ? '#2f9d78' : '#c0392b';
      section.appendChild(line);
    }
    out.appendChild(section);
  }
  window.__testFailures = failures;
  const summary = document.createElement('p');
  summary.textContent = failures === 0 ? 'TODO VERDE' : `${failures} fallo(s)`;
  summary.style.fontWeight = '700';
  out.prepend(summary);
}
```

- [ ] **Step 2: Escribir el test de `css` (falla primero)**

Crear `web/test/css.test.js`:

```js
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
```

Crear `web/test/index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Tests · Gestor de bodas</title>
<style> body { font-family: system-ui, sans-serif; padding: 24px; } h2 { margin: 18px 0 6px; font-size: 15px; } </style>
</head>
<body>
<h1>Tests</h1>
<div id="out"></div>
<script type="module">
  import './css.test.js';
  import { runAll } from './runner.js';
  runAll();
</script>
</body>
</html>
```

- [ ] **Step 3: Verificar que falla**

Run: `cd web && python3 -m http.server 8080` y abrir `http://localhost:8080/test/index.html`.
Expected: la página carga con error de consola porque `../js/core/css.js` no existe (404 / import fallido).

- [ ] **Step 4: Implementar `css.js`**

Crear `web/js/core/css.js`:

```js
/**
 * Helper de estilos: css`…` → CSSStyleSheet adoptable por un shadow root.
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {CSSStyleSheet}
 */
export function css(strings, ...values) {
  const text = strings.reduce((out, s, i) => out + s + (values[i] ?? ''), '');
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  return sheet;
}
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar `http://localhost:8080/test/index.html`.
Expected: "TODO VERDE"; la suite `core/css` con dos PASS.

- [ ] **Step 6: Commit**

```bash
git add web/js/core/css.js web/test/
git commit -m "feat(core): helper css y arnés de tests en navegador"
```

---

### Task 2: `escape-html` y `AppElement` (clase base)

**Files:**
- Create: `web/js/core/escape-html.js`
- Create: `web/js/core/base.css.js`
- Create: `web/js/core/AppElement.js`
- Create: `web/test/app-element.test.js`
- Modify: `web/test/index.html` (añadir import de la nueva suite)

**Interfaces:**
- Consumes: `css` de `core/css.js`.
- Produces:
  - `escapeHtml(str) -> string` en `core/escape-html.js`.
  - `base` (CSSStyleSheet) en `core/base.css.js` (en esta tarea, hoja mínima; se amplía en Task 4).
  - `class AppElement extends HTMLElement` en `core/AppElement.js` con: `static styles = []`, `render()`, `afterRender()`, `on(target, event, fn, opts)`, `$(sel)`, `$$(sel)`, `_paint()`, y repintado en `i18n:changed`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/app-element.test.js`:

```js
import { register } from './runner.js';
import { AppElement } from '../js/core/AppElement.js';
import { escapeHtml } from '../js/core/escape-html.js';

register('core/AppElement + escapeHtml', () => {
  const out = [];

  out.push({ name: 'escapeHtml escapa <, >, &, "', ok:
    escapeHtml('<a b="1" & 2>') === '&lt;a b=&quot;1&quot; &amp; 2&gt;',
    detail: escapeHtml('<a b="1" & 2>') });

  class Demo extends AppElement {
    render() { this.shadowRoot.innerHTML = `<button id="b">hola</button>`; }
    afterRender() { this.clicks = 0; this.on(this.$('#b'), 'click', () => this.clicks++); }
  }
  customElements.define('demo-el', Demo);

  const el = document.createElement('demo-el');
  document.body.appendChild(el);
  out.push({ name: 'crea shadow root', ok: !!el.shadowRoot, detail: '' });
  out.push({ name: '$ consulta dentro del shadow', ok: el.$('#b')?.textContent === 'hola', detail: '' });

  el.$('#b').click();
  out.push({ name: 'on() cablea el listener', ok: el.clicks === 1, detail: String(el.clicks) });

  el.remove();
  el.$('#b')?.click?.();
  out.push({ name: 'on() se limpia al desconectar', ok: el.clicks === 1, detail: String(el.clicks) });

  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html`, dentro del `<script type="module">`, añadir antes de `runAll()`:

```js
  import './app-element.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar `http://localhost:8080/test/index.html`.
Expected: error de import (los ficheros `escape-html.js`, `base.css.js`, `AppElement.js` no existen).

- [ ] **Step 4: Implementar los tres ficheros**

Crear `web/js/core/escape-html.js`:

```js
/**
 * Escapa texto para insertarlo en HTML sin riesgo de inyección.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
```

Crear `web/js/core/base.css.js` (mínima; se amplía en Task 4):

```js
import { css } from './css.js';

/** Estilos compartidos por todos los componentes. Se amplía en Task 4. */
export const base = css`
  :host { display: block; font-family: var(--font-body); color: var(--color-text); }
  * { box-sizing: border-box; }
`;
```

Crear `web/js/core/AppElement.js`:

```js
import { base } from './base.css.js';

/**
 * Clase base de todo componente: crea el shadow root, adopta los estilos,
 * re-renderiza al cambiar el idioma y limpia sus listeners al desconectarse.
 */
export class AppElement extends HTMLElement {
  /** @type {CSSStyleSheet[]} Hojas propias del componente. */
  static styles = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [base, ...this.constructor.styles];
    /** @type {Array<() => void>} */
    this._off = [];
  }

  connectedCallback() {
    this._paint();
    this.on(window, 'i18n:changed', () => this._paint());
  }

  disconnectedCallback() {
    this._off.forEach((off) => off());
    this._off = [];
  }

  /** Render + wiring en el orden que fija el patrón. */
  _paint() {
    this.render();
    this.afterRender();
  }

  /** Compone los getters de plantilla en el shadow root. Lo implementa cada componente. */
  render() {}

  /** Todo el cableado: listeners, options, fetch. Lo implementa cada componente. */
  afterRender() {}

  /**
   * Listener que se elimina solo al desconectar el componente.
   * @param {EventTarget} target
   * @param {string} event
   * @param {(e: Event) => void} fn
   * @param {AddEventListenerOptions} [opts]
   */
  on(target, event, fn, opts) {
    target.addEventListener(event, fn, opts);
    this._off.push(() => target.removeEventListener(event, fn, opts));
  }

  /**
   * Consulta dentro del shadow (nunca document).
   * @param {string} sel
   * @returns {Element|null}
   */
  $(sel) { return this.shadowRoot.querySelector(sel); }

  /**
   * Consulta múltiple dentro del shadow.
   * @param {string} sel
   * @returns {Element[]}
   */
  $$(sel) { return [...this.shadowRoot.querySelectorAll(sel)]; }
}
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar `http://localhost:8080/test/index.html`.
Expected: la suite `core/AppElement + escapeHtml` con cinco PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/core/escape-html.js web/js/core/base.css.js web/js/core/AppElement.js web/test/
git commit -m "feat(core): AppElement (clase base) y escapeHtml con tests"
```

---

### Task 3: Tokens y temas (`tokens.css`)

**Files:**
- Create: `web/css/tokens.css`
- Create: `web/test/theme-tokens.test.js`
- Modify: `web/test/index.html` (añadir import de la suite)

**Interfaces:**
- Consumes: nada (CSS puro).
- Produces: `css/tokens.css` con `:root` (tema claro = paleta del prototipo) y `[data-theme="dark"]`. Define los tokens: `--color-bg`, `--color-surface`, `--color-text`, `--color-divider`, `--color-accent`, `--color-accent-700`, `--color-accent-100`, `--color-accent-200`, `--color-accent-300`, `--color-neutral-100`, `--color-neutral-200`, `--color-neutral-600`, `--color-neutral-700`, `--color-neutral-900`, `--color-text-muted`, `--radius-md`, `--radius-sm`, `--font-heading`, `--font-body`, `--space-2`..`--space-8`, `--shadow-md`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/theme-tokens.test.js`. El test carga `tokens.css` como texto y verifica que los tokens exigidos están declarados en `:root` y que el tema oscuro redefine los roles base:

```js
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

  // El tema claro usa la paleta exacta del prototipo
  out.push({ name: 'tema claro con el fondo del prototipo', ok: rootBlock.includes('#f7f2ea'), detail: '' });

  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './theme-tokens.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar `http://localhost:8080/test/index.html`.
Expected: la suite `css/tokens` falla porque `../css/tokens.css` no existe (fetch 404).

- [ ] **Step 4: Implementar `tokens.css`**

Crear `web/css/tokens.css`:

```css
/* Tokens del gestor de bodas. Tema claro = paleta exacta del prototipo Fincas.
   Se enlaza en el <head> y se hereda al shadow DOM de cada componente. */
:root {
  /* Roles base (prototipo) */
  --color-bg: #f7f2ea;
  --color-surface: #fffdf9;
  --color-text: #3d3227;
  --color-divider: #e6dccd;
  --color-accent: #b08256;
  --color-accent-700: #8a6239;
  --color-accent-100: #f4ece0;
  --color-accent-200: #ecdfcd;
  --color-accent-300: #ddc8ab;
  --color-neutral-100: #f9f5ee;
  --color-neutral-200: #eee7db;
  --color-neutral-600: #b6a894;
  --color-neutral-700: #6f6150;
  --color-neutral-900: #3d3227;

  /* Derivados (valen para ambos temas con color-mix) */
  --color-text-muted: color-mix(in srgb, var(--color-text) 48%, transparent);

  /* Forma y tipografía */
  --radius-md: 16px;
  --radius-sm: 12px;
  --font-heading: "Cormorant Garamond", Georgia, serif;
  --font-body: "Jost", "Helvetica Neue", sans-serif;

  /* Espaciado (escala portada del design-system del prototipo) */
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Sombras */
  --shadow-sm: 0 0 0 1px color-mix(in srgb, var(--color-text) 8%, transparent);
  --shadow-md: 0 1px 2px color-mix(in srgb, var(--color-text) 8%, transparent),
               0 8px 24px color-mix(in srgb, var(--color-text) 12%, transparent);
  --shadow-lg: 0 2px 4px color-mix(in srgb, var(--color-text) 10%, transparent),
               0 18px 44px color-mix(in srgb, var(--color-text) 18%, transparent);
}

/* Tema oscuro: cálido, derivado de la misma paleta. Solo se redefinen los roles. */
[data-theme="dark"] {
  --color-bg: #211c16;
  --color-surface: #2b241c;
  --color-text: #efe7da;
  --color-divider: color-mix(in srgb, var(--color-text) 16%, transparent);
  --color-accent: #cf9d68;
  --color-accent-700: #b7854f;
  --color-accent-100: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface));
  --color-accent-200: color-mix(in srgb, var(--color-accent) 30%, var(--color-surface));
  --color-accent-300: color-mix(in srgb, var(--color-accent) 62%, #fff);
  --color-neutral-100: #322a20;
  --color-neutral-200: #3a3126;
  --color-neutral-600: #a3927c;
  --color-neutral-700: #c3b6a2;
  --color-neutral-900: #efe7da;
  --shadow-sm: 0 0 0 1px color-mix(in srgb, var(--color-text) 16%, transparent);
  --shadow-md: 0 0 0 1px color-mix(in srgb, var(--color-text) 20%, transparent), 0 6px 18px rgb(0 0 0 / .5);
  --shadow-lg: 0 0 0 1px color-mix(in srgb, var(--color-text) 28%, transparent), 0 16px 40px rgb(0 0 0 / .6);
}
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar `http://localhost:8080/test/index.html`.
Expected: la suite `css/tokens` con tres PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/css/tokens.css web/test/
git commit -m "feat(css): tokens con tema claro del prototipo y tema oscuro"
```

---

### Task 4: Ampliar `base.css.js` (capa de componentes)

**Files:**
- Modify: `web/js/core/base.css.js`
- Create: `web/test/base-css.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `css` de `core/css.js`; tokens de `css/tokens.css`.
- Produces: `base` ampliada con las clases `.view-content`, `.page-head`, `.card`, `.card-label`, `.grid`, `.muted`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.tag`, `.tag-accent`, `.tag-outline`, `.tag-neutral`, `.field`, `.seg`, `.seg-opt`, `.bar`, y estilos base de `input/select/textarea`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/base-css.test.js`. Verifica que la hoja `base` incluye las reglas clave y no usa colores hardcodeados (heurística: no hay `#rrggbb` fuera de comentarios):

```js
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
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './base-css.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: `core/base.css` falla (faltan `.card`, `.btn`, etc.).

- [ ] **Step 4: Ampliar `base.css.js`**

Reemplazar el contenido de `web/js/core/base.css.js` por:

```js
import { css } from './css.js';

/** Estilos compartidos por todas las vistas y primitivos. Solo tokens, nunca color hardcodeado. */
export const base = css`
:host { display: block; font-family: var(--font-body); color: var(--color-text); }
* { box-sizing: border-box; }

.view-content { display: flex; flex-direction: column; gap: var(--space-6); }
.page-head {
  display: flex; flex-direction: column; gap: 2px;
  .eyebrow { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-text-muted); }
  h1 { margin: 0; font-family: var(--font-heading); font-weight: 600; }
}
.card {
  display: flex; flex-direction: column; gap: 11px;
  padding: var(--space-6); border-radius: var(--radius-md);
  background: var(--color-surface); border: 1px solid var(--color-divider);
}
.card-label { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.muted { color: var(--color-text-muted); font-size: 12px; line-height: 1.45; }

.btn {
  min-height: 40px; padding: 0 16px; border-radius: 999px; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; letter-spacing: .02em; color: var(--color-text);
  background: transparent; border: 1px solid var(--color-divider);
  &:hover { background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
}
.btn-primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-surface);
  &:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); } }
.btn-secondary { background: var(--color-surface); }
.btn-ghost { border-color: transparent; color: var(--color-accent-700); }

.tag {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px;
  font-size: 11px; letter-spacing: .02em; border: 1px solid var(--color-divider); color: var(--color-neutral-700);
}
.tag-accent { color: var(--color-accent-700); border-color: var(--color-accent-300);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface)); }
.tag-outline { border-color: var(--color-accent-300); }
.tag-neutral { background: var(--color-neutral-100); }

.field { display: flex; flex-direction: column; gap: 5px;
  label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--color-neutral-700); } }

input, select, textarea {
  min-height: 40px; padding: 0 12px; border-radius: var(--radius-sm);
  font-family: var(--font-body); font-size: 13px; color: var(--color-text);
  background: var(--color-surface); border: 1px solid var(--color-divider);
  &:hover { border-color: var(--color-accent-300); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
}
textarea { padding: 9px 12px; min-height: 84px; line-height: 1.5; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--color-neutral-600); }
select { appearance: none; padding-right: 26px; }
input[type="checkbox"], input[type="radio"] { min-height: 0; accent-color: var(--color-accent); }

.seg { display: inline-flex; border: 1px solid var(--color-divider); border-radius: 999px; overflow: hidden; }
.seg-opt { min-height: 34px; padding: 0 14px; border: 0; background: transparent; cursor: pointer;
  font-family: var(--font-body); font-size: 12.5px; letter-spacing: .02em; color: var(--color-neutral-700);
  &[aria-selected="true"] { background: var(--color-accent); color: var(--color-surface); } }

.bar { display: block; height: 5px; border-radius: 3px; overflow: hidden;
  background: color-mix(in srgb, var(--color-text) 10%, transparent);
  span { display: block; height: 100%; background: var(--color-accent); } }
`;
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: `core/base.css` con tres PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/core/base.css.js web/test/
git commit -m "feat(core): capa de componentes en base.css (botones, campos, tags, seg)"
```

---

### Task 5: i18n (`index.js`, `es.js`, `en.js`, `enums.js`) + paridad

**Files:**
- Create: `web/js/core/enums.js`
- Create: `web/js/i18n/es.js`
- Create: `web/js/i18n/en.js`
- Create: `web/js/i18n/index.js`
- Create: `web/test/i18n-parity.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `ENUMS` en `core/enums.js`: objeto con grupos `fincaEstado`, `invLado`, `invRsvp`, `invInvitacion`, `provEstado`, `mesaForma`, cada uno mapeando valor → clave i18n.
  - `t(key, vars) -> string`, `setLang(next)`, `getLang() -> 'es'|'en'` en `i18n/index.js`.
  - `es` y `en`: objetos planos clave→texto (export default) en `i18n/es.js` y `i18n/en.js`.

- [ ] **Step 1: Escribir el test de paridad (falla primero)**

Crear `web/test/i18n-parity.test.js`:

```js
import { register } from './runner.js';
import es from '../js/i18n/es.js';
import en from '../js/i18n/en.js';
import { ENUMS } from '../js/core/enums.js';

register('i18n/paridad', () => {
  const out = [];
  const esKeys = Object.keys(es), enKeys = Object.keys(en);

  const missingEn = esKeys.filter((k) => !(k in en));
  out.push({ name: 'toda clave de es.js existe en en.js', ok: !missingEn.length, detail: missingEn.join(', ') });

  const missingEs = enKeys.filter((k) => !(k in es));
  out.push({ name: 'toda clave de en.js existe en es.js', ok: !missingEs.length, detail: missingEs.join(', ') });

  const empty = esKeys.filter((k) => !String(es[k]).trim() || !String(en[k] ?? '').trim());
  out.push({ name: 'ninguna traducción vacía', ok: !empty.length, detail: empty.join(', ') });

  const enumKeys = [...new Set(Object.values(ENUMS).flatMap((g) => Object.values(g)))];
  const noKey = enumKeys.filter((k) => !(k in es) || !(k in en));
  out.push({ name: 'todo valor de enum tiene su clave', ok: !noKey.length, detail: noKey.join(', ') });

  const looksRaw = esKeys.filter((k) => /^[a-z]+([._][a-z0-9_]+)+$/.test(String(es[k])));
  out.push({ name: 'ninguna traducción es una clave', ok: !looksRaw.length, detail: looksRaw.join(', ') });

  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './i18n-parity.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (faltan los ficheros de i18n y enums).

- [ ] **Step 4: Implementar enums e i18n**

Crear `web/js/core/enums.js`:

```js
/**
 * Valores de enum del modelo → clave i18n. El test de paridad verifica que
 * cada clave existe en es.js y en.js.
 */
export const ENUMS = {
  fincaEstado: { favorita: 'enum.finca.favorita', candidata: 'enum.finca.candidata', descartada: 'enum.finca.descartada' },
  invLado: { novia: 'enum.lado.novia', novio: 'enum.lado.novio' },
  invRsvp: { confirmado: 'enum.rsvp.confirmado', pendiente: 'enum.rsvp.pendiente', no: 'enum.rsvp.no' },
  invInvitacion: {
    'sin enviar': 'enum.invitacion.sin_enviar', enviada: 'enum.invitacion.enviada',
    recordatorio: 'enum.invitacion.recordatorio', respondida: 'enum.invitacion.respondida',
  },
  provEstado: {
    contratado: 'enum.prov.contratado', presupuesto: 'enum.prov.presupuesto',
    contactado: 'enum.prov.contactado', pendiente: 'enum.prov.pendiente',
  },
  mesaForma: { redonda: 'enum.mesa.redonda', rectangular: 'enum.mesa.rectangular' },
};
```

Crear `web/js/i18n/es.js`:

```js
/** Diccionario español. Toda clave debe existir también en en.js. */
export default {
  'app.brand': 'Nuestra boda',
  'nav.invitados': 'Invitados',
  'nav.finca': 'Finca',
  'nav.salon': 'Salón',
  'nav.proveedores': 'Proveedores',
  'nav.presupuesto': 'Presupuesto',
  'nav.timing': 'Timing',
  'chrome.lang': 'ES / EN',
  'chrome.theme': 'Tema',
  'common.loading': 'Cargando…',
  'common.empty': 'Nada por aquí todavía',
  'common.cancel': 'Cancelar',
  'common.save': 'Guardar',
  'common.search': 'Buscar',
  'common.soon': 'Próximamente',
  'common.soon.desc': 'Esta sección llegará en una próxima fase.',
  'enum.finca.favorita': 'Favorita',
  'enum.finca.candidata': 'Candidata',
  'enum.finca.descartada': 'Descartada',
  'enum.lado.novia': 'De la novia',
  'enum.lado.novio': 'Del novio',
  'enum.rsvp.confirmado': 'Confirmado',
  'enum.rsvp.pendiente': 'Pendiente',
  'enum.rsvp.no': 'No asiste',
  'enum.invitacion.sin_enviar': 'Sin enviar',
  'enum.invitacion.enviada': 'Enviada',
  'enum.invitacion.recordatorio': 'Recordatorio',
  'enum.invitacion.respondida': 'Respondida',
  'enum.prov.contratado': 'Contratado',
  'enum.prov.presupuesto': 'Presupuesto',
  'enum.prov.contactado': 'Contactado',
  'enum.prov.pendiente': 'Por buscar',
  'enum.mesa.redonda': 'Redonda',
  'enum.mesa.rectangular': 'Rectangular',
};
```

Crear `web/js/i18n/en.js`:

```js
/** English dictionary. Every key must also exist in es.js. */
export default {
  'app.brand': 'Our wedding',
  'nav.invitados': 'Guests',
  'nav.finca': 'Venue',
  'nav.salon': 'Seating',
  'nav.proveedores': 'Vendors',
  'nav.presupuesto': 'Budget',
  'nav.timing': 'Timing',
  'chrome.lang': 'ES / EN',
  'chrome.theme': 'Theme',
  'common.loading': 'Loading…',
  'common.empty': 'Nothing here yet',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.search': 'Search',
  'common.soon': 'Coming soon',
  'common.soon.desc': 'This section will arrive in a later phase.',
  'enum.finca.favorita': 'Favorite',
  'enum.finca.candidata': 'Shortlisted',
  'enum.finca.descartada': 'Discarded',
  'enum.lado.novia': "Bride's side",
  'enum.lado.novio': "Groom's side",
  'enum.rsvp.confirmado': 'Confirmed',
  'enum.rsvp.pendiente': 'Pending',
  'enum.rsvp.no': 'Not attending',
  'enum.invitacion.sin_enviar': 'Not sent',
  'enum.invitacion.enviada': 'Sent',
  'enum.invitacion.recordatorio': 'Reminder',
  'enum.invitacion.respondida': 'Replied',
  'enum.prov.contratado': 'Booked',
  'enum.prov.presupuesto': 'Quoted',
  'enum.prov.contactado': 'Contacted',
  'enum.prov.pendiente': 'To find',
  'enum.mesa.redonda': 'Round',
  'enum.mesa.rectangular': 'Rectangular',
};
```

Crear `web/js/i18n/index.js`:

```js
import es from './es.js';
import en from './en.js';

const DICTS = { es, en };
let lang = 'es';

/**
 * Traduce una clave del diccionario activo.
 * @param {string} key
 * @param {Record<string, string|number>} [vars] Sustituye los huecos {nombre}.
 * @returns {string}
 */
export function t(key, vars) {
  const s = DICTS[lang][key] ?? DICTS.es[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/**
 * Cambia el idioma y avisa a los componentes para que se repinten.
 * @param {'es'|'en'} next
 */
export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: next } }));
}

/** @returns {'es'|'en'} El idioma activo. */
export function getLang() { return lang; }
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `i18n/paridad` con cinco PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/core/enums.js web/js/i18n/ web/test/
git commit -m "feat(i18n): diccionarios es/en, enums y test de paridad"
```

---

### Task 6: `store.js` (localStorage)

**Files:**
- Create: `web/js/core/store.js`
- Create: `web/test/store.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: nada.
- Produces en `core/store.js`: `getGroup(group) -> object`, `get(group, id, fallback) -> any`, `set(group, id, value)`, `toggle(group, id, initial) -> boolean`, `reset()`. Grupos válidos: `fincas`, `invitados`, `proveedores`, `mesas`, `presupuesto`, `config`, `ui`. Emite `store:changed` en cada `set`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/store.test.js`:

```js
import { register } from './runner.js';
import { getGroup, get, set, toggle, reset } from '../js/core/store.js';

register('core/store', () => {
  const out = [];
  reset();

  set('fincas', 'f1', { nombre: 'A' });
  out.push({ name: 'set/get devuelve el valor', ok: get('fincas', 'f1')?.nombre === 'A', detail: '' });

  out.push({ name: 'getGroup devuelve el mapa', ok: Object.keys(getGroup('fincas')).length === 1, detail: '' });

  const nv = toggle('ui', 'flag', false);
  out.push({ name: 'toggle invierte el booleano', ok: nv === true, detail: String(nv) });

  let fired = false;
  const h = () => { fired = true; };
  window.addEventListener('store:changed', h, { once: true });
  set('ui', 'x', 1);
  out.push({ name: 'set emite store:changed', ok: fired, detail: '' });

  out.push({ name: 'get con fallback', ok: get('fincas', 'noexiste', 'def') === 'def', detail: '' });

  reset();
  out.push({ name: 'reset vacía el grupo', ok: Object.keys(getGroup('fincas')).length === 0, detail: '' });
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './store.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (`store.js` no existe).

- [ ] **Step 4: Implementar `store.js`**

Crear `web/js/core/store.js`:

```js
const KEY = 'gestorboda.state';

/** Estado persistente, plano y con una clave por entidad. */
const EMPTY = { fincas: {}, invitados: {}, proveedores: {}, mesas: {}, presupuesto: {}, config: {}, ui: {} };

let state = load();

/** @returns {object} El estado guardado, o uno vacío. */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(EMPTY), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return structuredClone(EMPTY);
  }
}

/** Escribe el estado; si el almacenamiento falla, la app sigue en memoria. */
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
}

/**
 * Lee un grupo del estado.
 * @param {keyof EMPTY} group
 * @returns {object} El mapa de ese grupo (no mutar).
 */
export function getGroup(group) { return state[group] ?? {}; }

/**
 * Lee un valor concreto.
 * @param {keyof EMPTY} group
 * @param {string} id
 * @param {*} [fallback]
 * @returns {*}
 */
export function get(group, id, fallback) {
  const bag = state[group];
  return bag && id in bag ? bag[id] : fallback;
}

/**
 * Guarda un valor y avisa a la app.
 * @param {keyof EMPTY} group
 * @param {string} id
 * @param {*} value
 */
export function set(group, id, value) {
  if (!state[group]) state[group] = {};
  state[group][id] = value;
  save();
  window.dispatchEvent(new CustomEvent('store:changed', { detail: { group, id, value } }));
}

/**
 * Conmuta un booleano.
 * @param {keyof EMPTY} group
 * @param {string} id
 * @param {boolean} [initial]
 * @returns {boolean} El valor nuevo.
 */
export function toggle(group, id, initial = false) {
  const next = !get(group, id, initial);
  set(group, id, next);
  return next;
}

/** Borra todo el estado. */
export function reset() {
  state = structuredClone(EMPTY);
  save();
  window.dispatchEvent(new CustomEvent('store:changed', { detail: { group: '*', id: '*', value: null } }));
}
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `core/store` con seis PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/core/store.js web/test/
git commit -m "feat(core): store en localStorage con eventos"
```

---

### Task 7: `seed.js` (datos del prototipo)

**Files:**
- Create: `web/js/core/seed.js`
- Create: `web/test/seed.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: nada.
- Produces en `core/seed.js`: `SEED` (objeto con `fincas`, `invitados`, `proveedores`, `mesas`, `categorias`, `presupuesto`, `config`), como arrays/valores. Portado literal del prototipo.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/seed.test.js`:

```js
import { register } from './runner.js';
import { SEED } from '../js/core/seed.js';

register('core/seed', () => {
  const out = [];
  out.push({ name: '9 fincas', ok: SEED.fincas.length === 9, detail: String(SEED.fincas.length) });
  out.push({ name: '15 invitados', ok: SEED.invitados.length === 15, detail: String(SEED.invitados.length) });
  out.push({ name: '14 proveedores', ok: SEED.proveedores.length === 14, detail: String(SEED.proveedores.length) });
  out.push({ name: '4 mesas', ok: SEED.mesas.length === 4, detail: String(SEED.mesas.length) });
  out.push({ name: 'límite 45000', ok: SEED.presupuesto.limite === 45000, detail: '' });
  out.push({ name: 'guestCount 140', ok: SEED.config.guestCount === 140, detail: '' });
  const jarama = SEED.fincas.find((f) => f.nombre === 'La Quinta de Jarama');
  out.push({ name: 'La Quinta de Jarama con fotos', ok: !!jarama && jarama.fotos.length > 0, detail: '' });
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './seed.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (`seed.js` no existe).

- [ ] **Step 4: Implementar `seed.js`**

Portar los datos del prototipo (`Fincas.dc.html`, métodos `seed()`, `seedGuests()`, `seedProv()`, `cats()` y el estado inicial). Crear `web/js/core/seed.js` con la forma:

```js
/**
 * Datos de ejemplo portados del prototipo Fincas.dc.html. Se cargan una sola
 * vez, cuando el store está vacío (ver repos.js).
 */
export const SEED = {
  config: { guestCount: 140, defaultView: 'rejilla', theme: 'light', lang: 'es' },
  presupuesto: { limite: 45000, partidas: [] },
  categorias: ['Wedding planner', 'Fotografía', 'Vídeo', 'Flores', 'Decoración', 'Catering',
    'Grupo de música', 'DJ', 'Saxofonista', 'Actuaciones y shows', 'Fotomatón', 'Tarta',
    'Peluquería y maquillaje', 'Invitaciones y papelería', 'Coche de novios', 'Autobuses',
    'Barra y cócteles', 'Animación infantil', 'Fuegos artificiales'],
  mesas: [
    { id: 'm1', nombre: 'Presidencial', capacidad: 10, forma: 'rectangular', x: 50, y: 20 },
    { id: 'm2', nombre: 'Mesa 2', capacidad: 10, forma: 'redonda', x: 26, y: 48 },
    { id: 'm3', nombre: 'Mesa 3', capacidad: 10, forma: 'redonda', x: 50, y: 62 },
    { id: 'm4', nombre: 'Mesa 4', capacidad: 8, forma: 'redonda', x: 74, y: 48 },
  ],
  fincas: [ /* las 9 fincas del prototipo, con id/nombre/tipo/zona/km/capSent/capPie/menu/alquiler/valoracion/estado/servicios/fechas/notas/motivo y, en La Quinta de Jarama, fotos[] + tour */ ],
  invitados: [ /* los 15 invitados: id/nombre/lado/grupo/rsvp/plus/nota/invitacion/menu/acompanantes/mesa? */ ],
  proveedores: [ /* los 14 proveedores: id/nombre/categoria/estado/precio/senal/contacto/telefono/notas */ ],
};
```

Copiar los arrays completos de `fincas`, `invitados` y `proveedores` desde el prototipo (líneas ~1162-1262 de `Fincas.dc.html`), preservando todos los campos, incluidas las URLs de `fotos` y `tour` de La Quinta de Jarama. Asignar ids estables a invitados y proveedores (p. ej. `g01`..`g15`, `p01`..`p14`) en lugar de los aleatorios del prototipo, para que las mesas asignadas (`mesa: 'm1'` a los tres primeros, `'m2'` a los tres siguientes) referencien ids fijos.

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `core/seed` con siete PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/core/seed.js web/test/
git commit -m "feat(core): datos de ejemplo portados del prototipo"
```

---

### Task 8: `repos.js` (repositorios por entidad)

**Files:**
- Create: `web/js/core/repos.js`
- Create: `web/test/repos.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `store.js` (`getGroup`, `get`, `set`, `reset`), `SEED` de `seed.js`.
- Produces en `core/repos.js`:
  - `ensureSeeded()`: si el grupo está vacío, siembra desde `SEED`.
  - `fincasRepo`, `invitadosRepo`, `proveedoresRepo`, `mesasRepo`, cada uno con `list() -> T[]`, `get(id) -> T|undefined`, `upsert(entity) -> T` (genera id si falta), `remove(id)`.
  - `presupuestoRepo`: `get() -> {limite, partidas}`, `setLimite(n)`, `setPartidas(arr)`.
  - `configRepo`: `get() -> object`, `set(patch)`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/repos.test.js`:

```js
import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import { ensureSeeded, fincasRepo, invitadosRepo, configRepo } from '../js/core/repos.js';

register('core/repos', () => {
  const out = [];
  reset();
  ensureSeeded();

  out.push({ name: 'siembra 9 fincas', ok: fincasRepo.list().length === 9, detail: String(fincasRepo.list().length) });

  const nueva = fincasRepo.upsert({ nombre: 'Prueba', tipo: 'Finca', estado: 'candidata' });
  out.push({ name: 'upsert genera id', ok: !!nueva.id, detail: nueva.id });
  out.push({ name: 'upsert añade a la lista', ok: fincasRepo.list().length === 10, detail: '' });

  nueva.nombre = 'Prueba 2';
  fincasRepo.upsert(nueva);
  out.push({ name: 'upsert actualiza sin duplicar', ok: fincasRepo.list().length === 10 && fincasRepo.get(nueva.id).nombre === 'Prueba 2', detail: '' });

  fincasRepo.remove(nueva.id);
  out.push({ name: 'remove borra', ok: fincasRepo.list().length === 9, detail: '' });

  out.push({ name: 'invitados sembrados', ok: invitadosRepo.list().length === 15, detail: '' });

  configRepo.set({ theme: 'dark' });
  out.push({ name: 'config set/get', ok: configRepo.get().theme === 'dark', detail: '' });

  reset();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './repos.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (`repos.js` no existe).

- [ ] **Step 4: Implementar `repos.js`**

Crear `web/js/core/repos.js`:

```js
import { getGroup, get, set } from './store.js';
import { SEED } from './seed.js';

/** @returns {string} Id corto y único. */
function newId(prefix) { return prefix + Math.random().toString(36).slice(2, 8); }

/**
 * Crea un repositorio de colección sobre un grupo del store. Los items se
 * guardan por id dentro del grupo.
 * @param {string} group Clave del grupo en el store.
 * @param {string} prefix Prefijo para ids nuevos.
 */
function collection(group, prefix) {
  return {
    /** @returns {object[]} Todos los items del grupo. */
    list() { return Object.values(getGroup(group)); },
    /** @param {string} id @returns {object|undefined} */
    get(id) { return get(group, id, undefined); },
    /**
     * Crea (si no trae id) o actualiza un item.
     * @param {object} entity
     * @returns {object} El item con su id.
     */
    upsert(entity) {
      const item = { ...entity };
      if (!item.id) item.id = newId(prefix);
      set(group, item.id, item);
      return item;
    },
    /** @param {string} id */
    remove(id) {
      const bag = { ...getGroup(group) };
      delete bag[id];
      set(group, '__replace__', undefined); // fuerza persistencia
      // Reemplaza el grupo completo
      Object.keys(getGroup(group)).forEach((k) => { if (!(k in bag)) set(group, k, undefined); });
      window.dispatchEvent(new CustomEvent('store:changed', { detail: { group, id, value: null } }));
    },
  };
}
```

Nota para el implementador: el borrado por reemplazo de grupo es delicado con la API `set(group, id, value)` por id. Implementar `remove(id)` escribiendo el grupo directamente. Sustituir el método `remove` anterior por esta versión y añadir al store un helper `setGroup(group, map)` si hiciera falta; si se añade `setGroup`, exportarlo desde `store.js` y actualizar el test de store con un caso. Versión recomendada de `remove` usando un `setGroup`:

```js
// en store.js, añadir y exportar:
export function setGroup(group, map) {
  state[group] = { ...map };
  save();
  window.dispatchEvent(new CustomEvent('store:changed', { detail: { group, id: '*', value: null } }));
}
```

```js
// en repos.js, remove definitivo:
remove(id) {
  const bag = { ...getGroup(group) };
  delete bag[id];
  setGroup(group, bag);
},
```

Repositorios y siembra (resto de `repos.js`):

```js
import { getGroup, get, set, setGroup } from './store.js';
import { SEED } from './seed.js';

export const fincasRepo = collection('fincas', 'f');
export const invitadosRepo = collection('invitados', 'g');
export const proveedoresRepo = collection('proveedores', 'p');
export const mesasRepo = collection('mesas', 'm');

/** Presupuesto: un único registro bajo la clave 'main'. */
export const presupuestoRepo = {
  get() { return get('presupuesto', 'main', { limite: 0, partidas: [] }); },
  setLimite(n) { const p = this.get(); set('presupuesto', 'main', { ...p, limite: n }); },
  setPartidas(arr) { const p = this.get(); set('presupuesto', 'main', { ...p, partidas: arr }); },
};

/** Configuración de la app (guestCount, tema, idioma, vista por defecto). */
export const configRepo = {
  get() { return get('config', 'main', {}); },
  set(patch) { set('config', 'main', { ...this.get(), ...patch }); },
};

/** Siembra los datos del prototipo la primera vez (grupos vacíos). */
export function ensureSeeded() {
  if (!fincasRepo.list().length) {
    const byId = {};
    SEED.fincas.forEach((f) => { byId[f.id] = f; });
    setGroup('fincas', byId);
  }
  if (!invitadosRepo.list().length) {
    const byId = {};
    SEED.invitados.forEach((g) => { byId[g.id] = g; });
    setGroup('invitados', byId);
  }
  if (!proveedoresRepo.list().length) {
    const byId = {};
    SEED.proveedores.forEach((p) => { byId[p.id] = p; });
    setGroup('proveedores', byId);
  }
  if (!mesasRepo.list().length) {
    const byId = {};
    SEED.mesas.forEach((m) => { byId[m.id] = m; });
    setGroup('mesas', byId);
  }
  if (!presupuestoRepo.get().limite) set('presupuesto', 'main', SEED.presupuesto);
  if (!configRepo.get().guestCount) set('config', 'main', SEED.config);
}
```

El bloque `collection(...)` debe quedar definido antes de su uso; ordenar el fichero: imports, `newId`, `collection`, repos, `ensureSeeded`. Eliminar la primera versión provisional de `remove`.

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `core/repos` con siete PASS; "TODO VERDE". La suite `core/store` sigue verde (si se añadió `setGroup`, su test opcional también).

- [ ] **Step 6: Commit**

```bash
git add web/js/core/repos.js web/js/core/store.js web/test/
git commit -m "feat(core): repositorios por entidad y siembra inicial"
```

---

### Task 9: `storage-adapter.js` (imágenes)

**Files:**
- Create: `web/js/core/storage-adapter.js`
- Create: `web/test/storage-adapter.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: nada.
- Produces en `core/storage-adapter.js`: `LocalAdapter` (objeto con `put(file, key) -> Promise<string>`, `url(key) -> string`, `remove(key) -> Promise<void>`) y `storage` (instancia activa, = `LocalAdapter`).

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/storage-adapter.test.js`:

```js
import { register } from './runner.js';
import { storage } from '../js/core/storage-adapter.js';

register('core/storage-adapter', async () => {
  const out = [];
  out.push({ name: 'url() con http devuelve la misma url', ok: storage.url('https://x/y.jpg') === 'https://x/y.jpg', detail: '' });

  const file = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
  const u = await storage.put(file, 'k1');
  out.push({ name: 'put() devuelve una url usable', ok: typeof u === 'string' && u.startsWith('blob:'), detail: u });
  out.push({ name: 'url(k1) recupera la subida', ok: storage.url('k1') === u, detail: '' });

  await storage.remove('k1');
  out.push({ name: 'remove borra la clave', ok: storage.url('k1') === 'k1', detail: '' });
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './storage-adapter.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (`storage-adapter.js` no existe).

- [ ] **Step 4: Implementar `storage-adapter.js`**

Crear `web/js/core/storage-adapter.js`:

```js
/**
 * Adaptador de imágenes. En la Fase 0 solo hay implementación local; la Fase 7
 * añadirá un SupabaseAdapter con la misma interfaz sin tocar las vistas.
 *
 * @typedef {Object} StorageAdapter
 * @property {(file: File, key: string) => Promise<string>} put
 * @property {(key: string) => string} url
 * @property {(key: string) => Promise<void>} remove
 */

/** @type {Map<string, string>} clave → objectURL de sesión. */
const local = new Map();

/** @type {StorageAdapter} Guarda las subidas como object URLs de sesión. */
export const LocalAdapter = {
  /**
   * Registra un fichero y devuelve una URL usable en <img src>.
   * @param {File} file
   * @param {string} key
   * @returns {Promise<string>}
   */
  async put(file, key) {
    const objectUrl = URL.createObjectURL(file);
    local.set(key, objectUrl);
    return objectUrl;
  },

  /**
   * URL servible para una clave. Si la clave ya es una URL http(s) o blob, se
   * devuelve tal cual (las fotos sembradas del prototipo son URLs remotas).
   * @param {string} key
   * @returns {string}
   */
  url(key) {
    if (/^(https?:|blob:|data:)/.test(key)) return key;
    return local.get(key) ?? key;
  },

  /**
   * Libera y olvida una subida de sesión.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async remove(key) {
    const u = local.get(key);
    if (u) { URL.revokeObjectURL(u); local.delete(key); }
  },
};

/** Implementación activa. */
export const storage = LocalAdapter;
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `core/storage-adapter` con cuatro PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/core/storage-adapter.js web/test/
git commit -m "feat(core): storage-adapter de imágenes (LocalAdapter)"
```

---

### Task 10: Primitivo `segmented-tabs`

**Files:**
- Create: `web/js/components/ui/segmented-tabs/segmented-tabs.css.js`
- Create: `web/js/components/ui/segmented-tabs/segmented-tabs.js`
- Create: `web/test/segmented-tabs.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`.
- Produces: elemento `<segmented-tabs>` con propiedad `options` (`Array<{value, label}>`), propiedad `value`, y evento `change` con `{ value }`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/segmented-tabs.test.js`:

```js
import { register } from './runner.js';
import '../js/components/ui/segmented-tabs/segmented-tabs.js';

register('ui/segmented-tabs', () => {
  const out = [];
  const el = document.createElement('segmented-tabs');
  document.body.appendChild(el);
  el.options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];

  out.push({ name: 'pinta un botón por opción', ok: el.shadowRoot.querySelectorAll('button').length === 2, detail: '' });
  out.push({ name: 'primera opción seleccionada por defecto', ok: el.value === 'a', detail: el.value });

  let got = null;
  el.addEventListener('change', (e) => { got = e.detail.value; });
  el.shadowRoot.querySelectorAll('button')[1].click();
  out.push({ name: 'click emite change con el valor', ok: got === 'b' && el.value === 'b', detail: String(got) });

  el.remove();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './segmented-tabs.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (el componente no existe).

- [ ] **Step 4: Implementar el componente**

Crear `web/js/components/ui/segmented-tabs/segmented-tabs.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: inline-block; }
.tabs { display: inline-flex; border: 1px solid var(--color-divider); border-radius: 999px; overflow: hidden; }
button {
  min-height: 34px; padding: 0 14px; border: 0; background: transparent; cursor: pointer;
  font-family: var(--font-body); font-size: 12.5px; letter-spacing: .02em; color: var(--color-neutral-700);
  &[aria-selected="true"] { background: var(--color-accent); color: var(--color-surface); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
}
`;
```

Crear `web/js/components/ui/segmented-tabs/segmented-tabs.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './segmented-tabs.css.js';

/**
 * Barra de pestañas. Emite `change` con { value } al elegir una.
 * @fires change
 */
export class SegmentedTabs extends AppElement {
  static styles = [styles];

  /** @type {Array<{value: string, label: string}>} */
  #options = [];
  #value = '';

  /** @param {Array<{value: string, label: string}>} list */
  set options(list) {
    this.#options = list ?? [];
    if (!this.#value && this.#options.length) this.#value = this.#options[0].value;
    this._paint();
  }

  get options() { return this.#options; }

  /** @param {string} v */
  set value(v) {
    if (v === this.#value) return;
    this.#value = v;
    this._paint();
  }

  get value() { return this.#value; }

  render() {
    this.shadowRoot.innerHTML = `<div class="tabs" role="tablist">${this._optionsTpl}</div>`;
  }

  /** @returns {string} Un botón por opción. */
  get _optionsTpl() {
    return this.#options.map((o) => `
      <button role="tab" data-value="${escapeHtml(o.value)}" aria-selected="${o.value === this.#value}">
        ${escapeHtml(o.label)}
      </button>`).join('');
  }

  afterRender() {
    this.$$('button').forEach((btn) => {
      this.on(btn, 'click', () => {
        this.value = btn.dataset.value;
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value } }));
      });
    });
  }
}

customElements.define('segmented-tabs', SegmentedTabs);
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `ui/segmented-tabs` con tres PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/components/ui/segmented-tabs/ web/test/
git commit -m "feat(ui): primitivo segmented-tabs"
```

---

### Task 11: Primitivos `stat-card` y `estado-badge`

**Files:**
- Create: `web/js/components/ui/stat-card/stat-card.css.js`
- Create: `web/js/components/ui/stat-card/stat-card.js`
- Create: `web/js/components/ui/estado-badge/estado-badge.css.js`
- Create: `web/js/components/ui/estado-badge/estado-badge.js`
- Create: `web/test/stat-card.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t` de i18n, `ENUMS`.
- Produces:
  - `<stat-card>`: atributos `label`, `value`, `note` (reflejados como propiedades); pinta una tarjeta de dato.
  - `<estado-badge>`: propiedades `kind` (`'finca'|'prov'`) y `value` (el valor de enum); pinta una `.tag` con la variante y el texto traducido.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/stat-card.test.js`:

```js
import { register } from './runner.js';
import '../js/components/ui/stat-card/stat-card.js';
import '../js/components/ui/estado-badge/estado-badge.js';

register('ui/stat-card + estado-badge', () => {
  const out = [];

  const card = document.createElement('stat-card');
  card.setAttribute('label', 'Confirmados');
  card.setAttribute('value', '42');
  card.setAttribute('note', 'de 140');
  document.body.appendChild(card);
  const txt = card.shadowRoot.textContent;
  out.push({ name: 'stat-card muestra label/value/note', ok: txt.includes('Confirmados') && txt.includes('42') && txt.includes('de 140'), detail: '' });

  const badge = document.createElement('estado-badge');
  badge.kind = 'finca';
  badge.value = 'favorita';
  document.body.appendChild(badge);
  out.push({ name: 'estado-badge traduce el estado', ok: badge.shadowRoot.textContent.trim() === 'Favorita', detail: badge.shadowRoot.textContent.trim() });
  out.push({ name: 'estado-badge aplica la clase tag', ok: !!badge.shadowRoot.querySelector('.tag'), detail: '' });

  card.remove(); badge.remove();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './stat-card.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (los componentes no existen).

- [ ] **Step 4: Implementar los dos componentes**

Crear `web/js/components/ui/stat-card/stat-card.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.stat { display: flex; flex-direction: column; gap: 4px; padding: var(--space-4);
  border-left: 1px solid var(--color-divider); }
.label { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.value { font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; }
.note { font-size: 12px; color: var(--color-text-muted); }
`;
```

Crear `web/js/components/ui/stat-card/stat-card.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './stat-card.css.js';

/** Tarjeta de dato: rótulo, valor grande y nota. Se configura por atributos. */
export class StatCard extends AppElement {
  static styles = [styles];
  static observedAttributes = ['label', 'value', 'note'];

  attributeChangedCallback() { if (this.shadowRoot) this._paint(); }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="stat">
        <span class="label">${escapeHtml(this.getAttribute('label') ?? '')}</span>
        <span class="value">${escapeHtml(this.getAttribute('value') ?? '')}</span>
        <span class="note">${escapeHtml(this.getAttribute('note') ?? '')}</span>
      </div>`;
  }
}

customElements.define('stat-card', StatCard);
```

Crear `web/js/components/ui/estado-badge/estado-badge.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: inline-block; }
`;
```

Nota: `estado-badge` reutiliza `.tag`, `.tag-accent`, `.tag-outline`, `.tag-neutral` de `base.css.js` (ya adoptada por la clase base), por eso su hoja propia es mínima.

Crear `web/js/components/ui/estado-badge/estado-badge.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './estado-badge.css.js';
import { t } from '../../../i18n/index.js';
import { ENUMS } from '../../../core/enums.js';

/** Variante visual (.tag-*) por estado. */
const VARIANT = {
  finca: { favorita: 'tag-accent', candidata: 'tag-outline', descartada: 'tag-neutral' },
  prov: { contratado: 'tag-accent', presupuesto: 'tag-outline', contactado: 'tag-neutral', pendiente: 'tag-outline' },
};
const ENUM_GROUP = { finca: ENUMS.fincaEstado, prov: ENUMS.provEstado };

/** Etiqueta de estado traducida, con variante por token. */
export class EstadoBadge extends AppElement {
  static styles = [styles];

  #kind = 'finca';
  #value = '';

  /** @param {'finca'|'prov'} k */
  set kind(k) { this.#kind = k; this._paint(); }
  get kind() { return this.#kind; }

  /** @param {string} v Valor de enum (p. ej. 'favorita'). */
  set value(v) { this.#value = v; this._paint(); }
  get value() { return this.#value; }

  render() {
    const variant = VARIANT[this.#kind]?.[this.#value] ?? 'tag-neutral';
    const key = ENUM_GROUP[this.#kind]?.[this.#value];
    const label = key ? t(key) : this.#value;
    this.shadowRoot.innerHTML = `<span class="tag ${variant}">${escapeHtml(label)}</span>`;
  }
}

customElements.define('estado-badge', EstadoBadge);
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `ui/stat-card + estado-badge` con tres PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/components/ui/stat-card/ web/js/components/ui/estado-badge/ web/test/
git commit -m "feat(ui): primitivos stat-card y estado-badge"
```

---

### Task 12: Primitivos `search-field`, `empty-state`, `skeleton`

**Files:**
- Create: `web/js/components/ui/search-field/search-field.css.js`
- Create: `web/js/components/ui/search-field/search-field.js`
- Create: `web/js/components/ui/empty-state/empty-state.css.js`
- Create: `web/js/components/ui/empty-state/empty-state.js`
- Create: `web/js/components/ui/skeleton/skeleton.css.js`
- Create: `web/js/components/ui/skeleton/skeleton.js`
- Create: `web/test/search-field.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`.
- Produces:
  - `<search-field>`: atributo `placeholder`; propiedad `value`; emite `search` con `{ value }` (debounce 200 ms).
  - `<empty-state>`: atributos `title`, `desc`; pinta un estado vacío.
  - `<skeleton>`: atributos `w`, `h`; pinta un bloque con animación de carga.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/search-field.test.js`:

```js
import { register } from './runner.js';
import '../js/components/ui/search-field/search-field.js';
import '../js/components/ui/empty-state/empty-state.js';
import '../js/components/ui/skeleton/skeleton.js';

register('ui/search-field + empty-state + skeleton', async () => {
  const out = [];

  const sf = document.createElement('search-field');
  sf.setAttribute('placeholder', 'Nombre…');
  document.body.appendChild(sf);
  const input = sf.shadowRoot.querySelector('input');
  out.push({ name: 'search-field pinta un input con placeholder', ok: input?.placeholder === 'Nombre…', detail: '' });

  const fired = await new Promise((resolve) => {
    sf.addEventListener('search', (e) => resolve(e.detail.value), { once: true });
    input.value = 'ana';
    input.dispatchEvent(new Event('input'));
    setTimeout(() => resolve('__timeout__'), 500);
  });
  out.push({ name: 'search-field emite search (debounced)', ok: fired === 'ana', detail: String(fired) });

  const es = document.createElement('empty-state');
  es.setAttribute('title', 'Vacío');
  document.body.appendChild(es);
  out.push({ name: 'empty-state muestra el título', ok: es.shadowRoot.textContent.includes('Vacío'), detail: '' });

  const sk = document.createElement('skeleton');
  document.body.appendChild(sk);
  out.push({ name: 'skeleton pinta un bloque', ok: !!sk.shadowRoot.querySelector('.sk'), detail: '' });

  sf.remove(); es.remove(); sk.remove();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './search-field.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (los componentes no existen).

- [ ] **Step 4: Implementar los tres componentes**

Crear `web/js/components/ui/search-field/search-field.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
input[type="search"] { width: 100%; }
input[type="search"]::-webkit-search-cancel-button { filter: grayscale(1) opacity(.6); }
`;
```

Crear `web/js/components/ui/search-field/search-field.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { styles } from './search-field.css.js';

/**
 * Campo de búsqueda. Emite `search` con { value } (debounce 200 ms).
 * @fires search
 */
export class SearchField extends AppElement {
  static styles = [styles];
  #timer = null;

  /** @returns {string} */
  get value() { return this.$('input')?.value ?? ''; }
  /** @param {string} v */
  set value(v) { const i = this.$('input'); if (i) i.value = v; }

  render() {
    const ph = this.getAttribute('placeholder') ?? '';
    this.shadowRoot.innerHTML = `<input type="search" placeholder="${ph}" aria-label="${ph}">`;
  }

  afterRender() {
    this.on(this.$('input'), 'input', () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('search', { detail: { value: this.value } }));
      }, 200);
    });
  }
}

customElements.define('search-field', SearchField);
```

Crear `web/js/components/ui/empty-state/empty-state.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
  padding: var(--space-8) var(--space-6); color: var(--color-text-muted); }
.empty h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 20px; color: var(--color-text); }
.empty p { margin: 0; font-size: 13px; }
`;
```

Crear `web/js/components/ui/empty-state/empty-state.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './empty-state.css.js';
import { t } from '../../../i18n/index.js';

/** Estado vacío con título y descripción. */
export class EmptyState extends AppElement {
  static styles = [styles];
  static observedAttributes = ['title', 'desc'];

  attributeChangedCallback() { if (this.shadowRoot) this._paint(); }

  render() {
    const title = this.getAttribute('title') || t('common.empty');
    const desc = this.getAttribute('desc') || '';
    this.shadowRoot.innerHTML = `
      <div class="empty">
        <h3>${escapeHtml(title)}</h3>
        ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
      </div>`;
  }
}

customElements.define('empty-state', EmptyState);
```

Crear `web/js/components/ui/skeleton/skeleton.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.sk { border-radius: var(--radius-sm); background: color-mix(in srgb, var(--color-text) 8%, transparent);
  position: relative; overflow: hidden; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-text) 6%, transparent), transparent);
  animation: sweep 1.2s infinite; }
@keyframes sweep { to { transform: translateX(100%); } }
`;
```

Crear `web/js/components/ui/skeleton/skeleton.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { styles } from './skeleton.css.js';

/** Bloque de carga. Tamaño por atributos w/h (por defecto 100% × 16px). */
export class Skeleton extends AppElement {
  static styles = [styles];

  render() {
    const w = this.getAttribute('w') || '100%';
    const h = this.getAttribute('h') || '16px';
    this.shadowRoot.innerHTML = `<div class="sk" style="width:${w};height:${h}"></div>`;
  }
}

customElements.define('skeleton', Skeleton);
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite con cuatro PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/components/ui/search-field/ web/js/components/ui/empty-state/ web/js/components/ui/skeleton/ web/test/
git commit -m "feat(ui): primitivos search-field, empty-state y skeleton"
```

---

### Task 13: Primitivos `drawer` y `toast`

**Files:**
- Create: `web/js/components/ui/drawer/drawer.css.js`
- Create: `web/js/components/ui/drawer/drawer.js`
- Create: `web/js/components/ui/toast/toast.css.js`
- Create: `web/js/components/ui/toast/toast.js`
- Create: `web/test/drawer-toast.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `AppElement`, `css`, `t`.
- Produces:
  - `<app-drawer>`: métodos `open()` / `close()`; propiedad `heading`; slot para contenido; emite `close`. No usa `confirm/alert/prompt`.
  - `<app-toast>`: método `show(message)`; se autooculta a los 3 s.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/drawer-toast.test.js`:

```js
import { register } from './runner.js';
import '../js/components/ui/drawer/drawer.js';
import '../js/components/ui/toast/toast.js';

register('ui/drawer + toast', () => {
  const out = [];

  const d = document.createElement('app-drawer');
  d.heading = 'Añadir';
  document.body.appendChild(d);
  out.push({ name: 'drawer nace cerrado', ok: d.hasAttribute('hidden') || d.shadowRoot.querySelector('.scrim')?.getAttribute('data-open') === 'false', detail: '' });

  d.open();
  out.push({ name: 'open() lo abre', ok: d.shadowRoot.querySelector('.scrim')?.getAttribute('data-open') === 'true', detail: '' });
  out.push({ name: 'muestra el heading', ok: d.shadowRoot.textContent.includes('Añadir'), detail: '' });

  let closed = false;
  d.addEventListener('close', () => { closed = true; });
  d.close();
  out.push({ name: 'close() emite close y cierra', ok: closed && d.shadowRoot.querySelector('.scrim')?.getAttribute('data-open') === 'false', detail: '' });

  const tt = document.createElement('app-toast');
  document.body.appendChild(tt);
  tt.show('Guardado');
  out.push({ name: 'toast muestra el mensaje', ok: tt.shadowRoot.textContent.includes('Guardado'), detail: '' });

  d.remove(); tt.remove();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './drawer-toast.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (los componentes no existen).

- [ ] **Step 4: Implementar los dos componentes**

Crear `web/js/components/ui/drawer/drawer.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.scrim { position: fixed; inset: 0; z-index: 90; background: color-mix(in srgb, #000 44%, transparent);
  display: none; }
.scrim[data-open="true"] { display: block; animation: fade .15s ease; }
.panel { position: fixed; top: 0; right: 0; height: 100vh; width: min(440px, 100%);
  background: var(--color-surface); border-left: 1px solid var(--color-divider); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; }
.scrim[data-open="true"] .panel { animation: slide .2s ease; }
.head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider); }
.head h2 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 20px; flex: 1; }
.x { min-height: 34px; min-width: 34px; border: 0; background: transparent; cursor: pointer;
  font-size: 18px; color: var(--color-neutral-700); border-radius: 999px;
  &:hover { background: color-mix(in srgb, var(--color-text) 8%, transparent); } }
.body { padding: var(--space-6); overflow: auto; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes slide { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
`;
```

Crear `web/js/components/ui/drawer/drawer.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './drawer.css.js';

/**
 * Panel lateral para altas/edición. open()/close(); emite `close`.
 * El contenido se proyecta por <slot>. No usa alert/confirm/prompt.
 * @fires close
 */
export class AppDrawer extends AppElement {
  static styles = [styles];
  #open = false;
  #heading = '';

  /** @param {string} v */
  set heading(v) { this.#heading = v; this._paint(); }
  get heading() { return this.#heading; }

  /** Abre el panel. */
  open() { this.#open = true; this._paint(); }

  /** Cierra el panel y emite `close`. */
  close() {
    this.#open = false;
    this._paint();
    this.dispatchEvent(new CustomEvent('close'));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="scrim" data-open="${this.#open}">
        <div class="panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(this.#heading)}">
          <div class="head">
            <h2>${escapeHtml(this.#heading)}</h2>
            <button class="x" id="x" aria-label="Cerrar">×</button>
          </div>
          <div class="body"><slot></slot></div>
        </div>
      </div>`;
  }

  afterRender() {
    const scrim = this.$('.scrim');
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(scrim, 'click', (e) => { if (e.target === scrim) this.close(); });
  }
}

customElements.define('app-drawer', AppDrawer);
```

Crear `web/js/components/ui/toast/toast.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 120; }
.toast { display: none; padding: 10px 16px; border-radius: 999px; font-size: 13px;
  background: var(--color-text); color: var(--color-surface); box-shadow: var(--shadow-md); }
.toast[data-show="true"] { display: block; animation: rise .2s ease; }
@keyframes rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
`;
```

Crear `web/js/components/ui/toast/toast.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './toast.css.js';

/** Aviso breve no bloqueante. show(mensaje) lo muestra 3 s. */
export class AppToast extends AppElement {
  static styles = [styles];
  #msg = '';
  #show = false;
  #timer = null;

  /** @param {string} message */
  show(message) {
    this.#msg = message;
    this.#show = true;
    this._paint();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => { this.#show = false; this._paint(); }, 3000);
  }

  render() {
    this.shadowRoot.innerHTML = `<div class="toast" data-show="${this.#show}" role="status">${escapeHtml(this.#msg)}</div>`;
  }
}

customElements.define('app-toast', AppToast);
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `ui/drawer + toast` con cinco PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/components/ui/drawer/ web/js/components/ui/toast/ web/test/
git commit -m "feat(ui): primitivos drawer y toast"
```

---

### Task 14: Vista placeholder `finca-view`

**Files:**
- Create: `web/js/components/views/finca-view/finca-view.css.js`
- Create: `web/js/components/views/finca-view/finca-view.js`
- Create: `web/test/finca-view.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `AppElement`, `css`, `t`, `fincasRepo` + `ensureSeeded` de `repos.js`.
- Produces: elemento `<finca-view>` con método público `refresh()`. En Fase 0 solo muestra la cabecera de la vista y el recuento de fincas sembradas (placeholder), validando el seam repos↔vista. La Fase 1 lo reemplaza.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/finca-view.test.js`:

```js
import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/finca-view/finca-view.js';

register('views/finca-view (placeholder)', () => {
  const out = [];
  reset();
  const el = document.createElement('finca-view');
  document.body.appendChild(el);

  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });

  el.refresh();
  out.push({ name: 'refresh siembra y cuenta 9 fincas', ok: el.shadowRoot.textContent.includes('9'), detail: '' });

  el.remove(); reset();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './finca-view.test.js';
```

- [ ] **Step 3: Verificar que falla**

Run: recargar la página de tests.
Expected: error de import (la vista no existe).

- [ ] **Step 4: Implementar la vista placeholder**

Crear `web/js/components/views/finca-view/finca-view.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
`;
```

Crear `web/js/components/views/finca-view/finca-view.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-view.css.js';
import { t } from '../../../i18n/index.js';
import { ensureSeeded, fincasRepo } from '../../../core/repos.js';

/**
 * Vista Finca. En la Fase 0 es un placeholder que valida el cableado del
 * router y el seam con los repositorios. La Fase 1 la reemplaza por completo.
 */
export class FincaView extends AppElement {
  static styles = [styles];
  #count = 0;

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="page-head">
          <span class="eyebrow">${escapeHtml(t('nav.finca'))}</span>
          <h1>${escapeHtml(t('nav.finca'))}</h1>
        </div>
        <p class="muted">${escapeHtml(String(this.#count))} ${escapeHtml(t('nav.finca'))}</p>
      </div>`;
  }

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this.#count = fincasRepo.list().length;
    this._paint();
  }
}

customElements.define('finca-view', FincaView);
```

- [ ] **Step 5: Verificar que pasa**

Run: recargar la página de tests.
Expected: la suite `views/finca-view (placeholder)` con dos PASS; "TODO VERDE".

- [ ] **Step 6: Commit**

```bash
git add web/js/components/views/finca-view/ web/test/
git commit -m "feat(views): finca-view placeholder que valida el seam con repos"
```

---

### Task 15: Chrome global + router (`index.html`, `main.js`)

**Files:**
- Create: `web/index.html`
- Create: `web/main.js`

**Interfaces:**
- Consumes: `finca-view`, primitivos (para que queden registrados si se usan), `t/setLang/getLang`, `configRepo`, tokens.css.
- Produces: la app navegable. `main.js` define `NAV`, `setActiveView(id)`, pinta el chrome traducido, gestiona toggles de idioma y tema (persistidos), y el router por hash. No hay tests unitarios de esta tarea (chrome en light DOM); se valida a mano en el navegador.

- [ ] **Step 1: Crear `index.html`**

Crear `web/index.html`:

```html
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gestor de bodas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Jost:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="css/tokens.css">
<style>
  html, body { margin: 0; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); }
  .nav { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: var(--space-4);
    background: var(--color-surface); border-bottom: 1px solid var(--color-divider);
    padding: var(--space-3) var(--space-6); }
  .nav-brand { font-family: var(--font-heading); font-weight: 600; font-size: 20px; margin-right: var(--space-8); }
  .nav-links { display: flex; gap: var(--space-2); margin-right: auto; flex-wrap: wrap; }
  .nav-links button { min-height: 40px; padding: 0 14px; border: 0; background: transparent; cursor: pointer;
    font-family: var(--font-body); font-size: 13px; color: var(--color-text); border-radius: 999px; }
  .nav-links button:hover { background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
  .nav-links button[aria-current="true"] { background: color-mix(in srgb, var(--color-accent) 16%, transparent);
    color: var(--color-accent-700); }
  .nav-actions { display: flex; gap: var(--space-2); align-items: center; }
  .nav-actions button { min-height: 40px; padding: 0 14px; border: 1px solid var(--color-divider);
    background: var(--color-surface); cursor: pointer; border-radius: 999px; font-size: 12.5px; color: var(--color-text); }
  main.content { padding: var(--space-6); }
  .view { display: none; }
  .view.active { display: block; }
</style>
</head>
<body>
  <nav class="nav">
    <span class="nav-brand" id="brand" data-i18n="app.brand">Nuestra boda</span>
    <div class="nav-links" id="nav"></div>
    <div class="nav-actions">
      <button id="theme" data-i18n="chrome.theme">Tema</button>
      <button id="lang" data-i18n="chrome.lang">ES / EN</button>
    </div>
  </nav>

  <main class="content">
    <finca-view class="view" id="view-finca"></finca-view>
    <section class="view" id="view-invitados"></section>
    <section class="view" id="view-salon"></section>
    <section class="view" id="view-proveedores"></section>
    <section class="view" id="view-presupuesto"></section>
    <section class="view" id="view-timing"></section>
  </main>

  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `main.js`**

Crear `web/main.js`:

```js
import './js/components/views/finca-view/finca-view.js';
import { t, setLang, getLang } from './js/i18n/index.js';
import { configRepo } from './js/core/repos.js';
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

const THEME_KEY = 'gestorboda.theme';
const LANG_KEY = 'gestorboda.lang';

/** @param {string} id Tema a aplicar ('light' | 'dark'). */
function applyTheme(id) { document.documentElement.dataset.theme = id; }

// Toggle de tema: alterna claro/oscuro y lo recuerda
document.getElementById('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* sin almacenamiento */ }
  configRepo.set({ theme: next });
});

// Toggle de idioma: alterna ES/EN y lo recuerda
document.getElementById('lang').addEventListener('click', () => {
  const next = getLang() === 'es' ? 'en' : 'es';
  setLang(next);
  try { localStorage.setItem(LANG_KEY, next); } catch { /* sin almacenamiento */ }
  configRepo.set({ lang: next });
});

// Al cambiar idioma, repintar el chrome y el nav
window.addEventListener('i18n:changed', () => { paintChrome(); paintNav(); });

// Arranque: tema e idioma recordados
let storedTheme = null, storedLang = null;
try { storedTheme = localStorage.getItem(THEME_KEY); storedLang = localStorage.getItem(LANG_KEY); } catch { /* sin almacenamiento */ }
if (storedTheme) applyTheme(storedTheme);
if (storedLang && storedLang !== getLang()) setLang(storedLang);

paintChrome();
paintNav();
setActiveView(location.hash.slice(1) || 'view-finca');
window.addEventListener('hashchange', () => setActiveView(location.hash.slice(1) || 'view-finca'));
```

- [ ] **Step 3: Verificación manual en el navegador**

Run: `cd web && python3 -m http.server 8080`, abrir `http://localhost:8080/`.
Expected:
- Carga sin errores de consola.
- El nav muestra las seis vistas; Finca está activa y muestra "9 Finca" (placeholder).
- Al pulsar Invitados/Salón/etc. aparece "Próximamente".
- El botón Tema alterna claro/oscuro (persiste al recargar).
- El botón ES/EN cambia los rótulos del nav y se mantiene al recargar.

- [ ] **Step 4: Verificar tests globales**

Run: abrir `http://localhost:8080/test/index.html`.
Expected: "TODO VERDE" con todas las suites.

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/main.js
git commit -m "feat(chrome): index.html + main.js con nav, router y toggles de tema/idioma"
```

---

### Task 16: Capturas de verificación y README

**Files:**
- Create: `web/README.md`
- Modify: `README.md` (raíz, apuntar a `web/`)

**Interfaces:**
- Consumes: la app terminada.
- Produces: documentación de cómo servir y testear; capturas en el Desktop (claro y oscuro) por la guía de flujo de trabajo del usuario.

- [ ] **Step 1: Capturas de la app (claro y oscuro)**

Con el servidor en marcha, abrir la app en el navegador, capturar la vista Finca en tema claro y en tema oscuro, y guardar ambos PNG en el Desktop (`gestor-boda-fase0-claro.png`, `gestor-boda-fase0-oscuro.png`). Revisar que la fidelidad de fuentes y paleta coincide con el prototipo.

- [ ] **Step 2: Escribir `web/README.md`**

```markdown
# Gestor de bodas — web

App de Web Components vanilla (sin build). Migración del prototipo Fincas.

## Servir en local

    cd web
    python3 -m http.server 8080

Abrir http://localhost:8080/

## Tests

Abrir http://localhost:8080/test/index.html — deben salir todas las suites en verde.

## Estructura

- `css/tokens.css` — tokens y temas (claro del prototipo + oscuro).
- `js/core/` — clase base, css, store, repos, seed, storage-adapter.
- `js/i18n/` — diccionarios es/en y helper t().
- `js/components/ui/` — primitivos reutilizables.
- `js/components/views/` — vistas (Fase 0: finca-view placeholder).
- `test/` — arnés y suites en navegador.
```

- [ ] **Step 3: Actualizar el README raíz**

Añadir al `README.md` de la raíz una línea que apunte a `web/` como la app y a `docs/superpowers/` como specs y planes.

- [ ] **Step 4: Commit**

```bash
git add web/README.md README.md
git commit -m "docs: README de la app web y capturas de la Fase 0"
```

---

## Self-Review

**Cobertura del spec (sección → tarea):**

- 4 Estructura de carpetas → Tasks 1-16 (se crea toda `web/`).
- 5.1 AppElement → Task 2. 5.2 css → Task 1. 5.3 base.css → Tasks 2 (mínima) + 4 (completa). 5.4 store → Task 6. 5.5 repos → Task 8. 5.6 seed → Task 7. 5.7 storage-adapter → Task 9.
- 6 Modelo de datos → Task 7 (seed) + enums en Task 5.
- 7 Tokens y temas → Task 3.
- 8 i18n → Task 5.
- 9 Chrome y router → Task 15.
- 10 Primitivos UI (8) → Tasks 10 (segmented-tabs), 11 (stat-card, estado-badge), 12 (search-field, empty-state, skeleton), 13 (drawer, toast).
- 11 Tests → suites por tarea + arnés en Task 1.
- 12 Sin build → verificación manual con http.server en Tasks 15-16.
- 13 Criterios de aceptación → Task 15 (Step 3) verificación manual + Task 16 (capturas).

Todos los puntos del spec tienen tarea. El primitivo `drawer` y `toast` (criterio 6) y el resto de primitivos quedan cubiertos.

**Escaneo de placeholders:** el único bloque con arrays elididos es el seed (Task 7 Step 4), que remite explícitamente a las líneas del prototipo a copiar (no es un "TODO": es una instrucción de portado literal con la ruta y los campos exactos). El resto de pasos llevan código completo.

**Consistencia de tipos:** `AppElement` (no `DronElement`) usado en todos los componentes. `_paint()` público-interno usado por `refresh()` y setters. `set(group,id,value)`, `getGroup`, `setGroup` consistentes entre store (Task 6/8) y repos (Task 8). `storage` exportado en Task 9 y consumido donde haga falta. Eventos: `change` (segmented-tabs), `search` (search-field), `close` (drawer), `store:changed`, `i18n:changed` coherentes entre emisor y test. Nombres de vista (`view-finca`, etc.) idénticos en `index.html`, `main.js` y `NAV`.

Nota de implementación pendiente para Task 8: al añadir `setGroup` al store, ampliar `store.test.js` con un caso mínimo (`setGroup('ui', {a:1})` → `getGroup('ui').a === 1`) para no dejar API sin cubrir.
