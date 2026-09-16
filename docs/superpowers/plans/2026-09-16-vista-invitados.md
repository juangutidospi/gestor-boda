# Vista Invitados (Fase 2) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el placeholder de Invitados por la vista completa del prototipo (stats por lado, tarjetas por círculo / listado, filtros, ciclo de invitación, RSVP, mesa, acompañantes y alta), como UN solo componente con getters de plantilla, persistida vía `invitadosRepo`.

**Architecture:** Web Components vanilla sin build. La vista es un único componente `views/invitados-view/invitados-view.js` (+ `.css.js`) que compone bloques con getters (`_statsTpl`, `_filtrosTpl`, `_gruposTpl`, `_tablaTpl`, `_altaTpl`) y hace el wiring en `afterRender()`. La lógica pura (filtrar, agrupar, stats, parseAcomp, ciclo de invitación) vive en `invitados-view/invitados-calc.js`, testeada sin DOM. Reutiliza `modal-dialog`, `empty-state`, `app-toast`. Colores de lado/rsvp por tokens nuevos. Persistencia solo por `invitadosRepo` (+ lectura de `mesasRepo` y `fincasRepo`).

**Tech Stack:** JavaScript (módulos ES nativos), Web Components, `AppElement`, repos de core, `Intl`/tokens. Sin bundler. Tests en navegador (arnés de Fase 0) para la lógica pura; verificación visual con Chrome headless.

**Spec:** `docs/superpowers/specs/2026-09-16-vista-invitados-design.md`

## Global Constraints

- Sin build: solo módulos ES nativos.
- Una vista = UN componente con getters de plantilla; NO crear un web component por bloque. Solo se reutilizan primitivos de `ui/` (modal-dialog, empty-state, app-toast).
- Shadow DOM; `this.$()`/`this.$$()`, nunca `document` (salvo listeners globales con `this.on(window,...)`).
- Colores y espaciado con tokens `var(--…)`; sin colores hardcodeados (los de lado/rsvp se añaden como tokens).
- Markup en getters `_xTpl` puros; listeners/datos en `afterRender()`.
- JSDoc/comentarios en español; sin cursiva en docs.
- i18n: todo texto con `t()`; paridad es/en (test). Enums lado/invitacion/rsvp ya existen.
- Persistencia SOLO vía repos (`invitadosRepo.list/get/upsert/remove`); lectura de `mesasRepo`/`fincasRepo`. Nunca store/localStorage directo.
- Sin `alert/confirm/prompt`. Buscador con preservación de foco (re-render parcial de lista/stats).
- Rutas relativas exactas: desde `views/invitados-view/` core en `../../../core/`, i18n en `../../../i18n/`, primitivos en `../../ui/<name>/<name>.js`.
- Verificación con el helper headless (recreado igual que en fases previas): RED antes, GREEN después; suite entera verde.
- Ubicación `web/`. Rama `feat/vista-invitados`.

---

### Task 1: Base — tokens de lado/rsvp e i18n de la vista

**Files:**
- Modify: `web/css/tokens.css` (tokens de lado/rsvp, tema claro + oscuro)
- Modify: `web/js/i18n/es.js`
- Modify: `web/js/i18n/en.js`

**Interfaces:**
- Produces: tokens `--lado-novia`, `--lado-novia-bg`, `--lado-novia-ink`, `--lado-novio`, `--lado-novio-bg`, `--lado-novio-ink`, `--rsvp-si-bg`, `--rsvp-si-line`, `--rsvp-no-bg`, `--rsvp-no-line`; y las claves i18n `inv.*` de la vista en es/en (paridad).

- [ ] **Step 1: Añadir tokens a `tokens.css`**

En `:root` (tema claro, valores del prototipo):

```css
  --lado-novia: #b98a91; --lado-novia-bg: #f9ecee; --lado-novia-ink: #8a4f58;
  --lado-novio: #7f9bb3; --lado-novio-bg: #e8eff5; --lado-novio-ink: #3f5a73;
  --rsvp-si-bg: #eef4ec; --rsvp-si-line: #cbdcc5;
  --rsvp-no-bg: #f2eeea; --rsvp-no-line: #ded4c8;
```

En `[data-theme="dark"]` (variante cálida/oscura, contraste correcto):

```css
  --lado-novia: #d9a6ad; --lado-novia-bg: color-mix(in srgb, #d9a6ad 22%, var(--color-surface)); --lado-novia-ink: #e7c3c8;
  --lado-novio: #8fb0cc; --lado-novio-bg: color-mix(in srgb, #8fb0cc 22%, var(--color-surface)); --lado-novio-ink: #cfe0ee;
  --rsvp-si-bg: color-mix(in srgb, #5f9e6f 18%, var(--color-surface)); --rsvp-si-line: color-mix(in srgb, #5f9e6f 40%, transparent);
  --rsvp-no-bg: color-mix(in srgb, var(--color-text) 8%, var(--color-surface)); --rsvp-no-line: var(--color-divider);
```

- [ ] **Step 2: Añadir las claves i18n (es.js y en.js) y verificar RED→GREEN**

Añadir a `es.js` (y las mismas claves en `en.js` con su traducción; paridad obligatoria). Claves:

```
inv.title = Invitados / Guests
inv.subtitle = Lista por lado y círculo. Los totales de cada lado se recalculan con cada alta. / By side and circle. Each side's totals recalculate with every addition.
inv.search = Buscar invitado / Search guest
inv.search.ph = Nombre o nota… / Name or note…
inv.filter.lado = Lado / Side
inv.filter.ambos = Ambos lados / Both sides
inv.filter.circulo = Círculo / Circle
inv.filter.todos = Todos / All
inv.filter.confirmacion = Confirmación / RSVP
inv.filter.todas = Todas / All
inv.filter.confirmados = Confirmados / Confirmed
inv.filter.pendientes = Pendientes / Pending
inv.filter.noVienen = No vienen / Not coming
inv.filter.invitacion = Invitación / Invitation
inv.filter.inv.sinEnviar = Sin enviar / Not sent
inv.filter.inv.enviada = Enviada / Sent
inv.filter.inv.recordatorio = Con recordatorio / With reminder
inv.filter.inv.respondida = Ha respondido / Replied
inv.filter.menu = Menú / Menu
inv.filter.menu.especiales = Solo especiales / Special only
inv.view.cards = Tarjetas / Cards
inv.view.list = Listado / List
inv.stat.total = Total con acompañantes / Total incl. companions
inv.stat.total.note = {n} invitaciones / {n} invitations
inv.stat.confirmados = Confirmados / Confirmed
inv.stat.confirmados.note = {n} pendientes de respuesta / {n} awaiting reply
inv.stat.sinResponder = Sin responder / No reply
inv.stat.sinResponder.note = {n} con recordatorio enviado / {n} with reminder sent
inv.stat.menus = Menús especiales / Special menus
inv.stat.menus.note = para avisar a la finca / to tell the venue
inv.stat.novio = Del novio / Groom's side
inv.stat.novia = De la novia / Bride's side
inv.stat.lado.note = personas / people
inv.stat.aforo = Aforo elegido / Chosen capacity
inv.stat.aforo.note.sin = sin finca elegida / no venue chosen
inv.table.invitado = Invitado / Guest
inv.table.lado = Lado / Side
inv.table.circulo = Círculo / Circle
inv.table.menu = Menú / Menu
inv.table.invitacion = Invitación / Invitation
inv.table.acomp = Acomp. / Comp.
inv.table.mesa = Mesa / Table
inv.table.confirmacion = Confirmación / RSVP
inv.grupo.subtotal = {inv} invitaciones · {pax} personas · {conf} confirmadas / {inv} invitations · {pax} people · {conf} confirmed
inv.card.con = Con / With
inv.card.mesa = Mesa / Table
inv.card.sinMesa = Sin asignar / Unassigned
inv.card.si = Sí / Yes
inv.card.pendiente = Pendiente / Pending
inv.card.no = No / No
inv.card.quitar = Quitar / Remove
inv.meta.acomp = Con acompañantes / With companions
inv.meta.individual = Invitación individual / Single invitation
inv.acomp.sinNombre = {n} sin nombre / {n} unnamed
inv.inv.accion.enviada = Marcar enviada / Mark sent
inv.inv.accion.recordatorio = Enviar recordatorio / Send reminder
inv.inv.accion.respondida = Marcar respondida / Mark replied
inv.inv.accion.reabrir = Reabrir / Reopen
inv.empty.title = Ningún invitado coincide con el filtro / No guest matches the filter
inv.empty.desc = Cambia los filtros o añade a alguien nuevo a la lista. / Change the filters or add someone new.
inv.add = Añadir invitado / Add guest
inv.foot = {n} personas en lista · el coste de la finca se calcula sobre {inv} invitados. / {n} people on the list · the venue cost is based on {inv} guests.
inv.add.title = Añadir invitado / Add guest
inv.add.nombre = Nombre y apellidos / Full name
inv.add.nombre.ph = Ej. Carmen Ibáñez Ruiz / e.g. Carmen Ibáñez Ruiz
inv.add.lado = ¿De qué lado viene? / Which side?
inv.add.circulo = Círculo / Circle
inv.add.acomp = Acompañantes (un nombre por línea) / Companions (one name per line)
inv.add.menu = Menú / Menu
inv.add.invitacion = Invitación / Invitation
inv.add.rsvp = Confirmación / RSVP
inv.add.nota = Nota (opcional) / Note (optional)
inv.add.nota.ph = Ej. menú sin gluten, viene desde Bilbao / e.g. gluten-free menu, coming from Bilbao
inv.add.save = Guardar invitado / Save guest
inv.add.needName = Escribe el nombre del invitado / Enter the guest's name
inv.toast.creado = {nombre} añadido a la lista / {nombre} added to the list
inv.toast.quitado = {nombre} quitado de la lista / {nombre} removed
```

Run helper: primero fallará si alguna clave está en un idioma y no en el otro (RED); con paridad completa → `RESULTADO: TODO VERDE`.

- [ ] **Step 3: Commit**

```bash
git add web/css/tokens.css web/js/i18n/
git commit -m "feat(invitados): tokens de lado/rsvp y claves i18n de la vista"
```

---

### Task 2: Lógica pura `invitados-calc.js`

**Files:**
- Create: `web/js/components/views/invitados-view/invitados-calc.js`
- Test: `web/test/invitados-calc.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Produces:
  - `parseAcomp(text) -> string[]` (líneas no vacías, trim).
  - `filtrar(invitados, { q, lado, grupo, rsvp, inv, menu }) -> Invitado[]`.
  - `pax(invitado) -> number` (1 + plus).
  - `circulosDe(invitados) -> string[]` (círculos únicos presentes, en orden de aparición).
  - `menusDe(invitados) -> string[]` (menús únicos presentes).
  - `agrupar(invitadosFiltrados) -> Array<{ titulo, items, inv, pax, conf }>` (por círculo, solo con items).
  - `calcularStats(invitados, elegida) -> Array<{key,label,value,note,noteVars}>` (los 7; `elegida` = finca elegida o null).
  - `siguienteInvitacion(estado) -> string` (ciclo sin enviar→enviada→recordatorio→respondida→sin enviar).
  - `accionInvitacion(estado) -> string` (clave i18n de la acción del botón).

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/invitados-calc.test.js`:

```js
import { register } from './runner.js';
import { parseAcomp, filtrar, pax, circulosDe, agrupar, calcularStats, siguienteInvitacion } from '../js/components/views/invitados-view/invitados-calc.js';

register('invitados/calc', () => {
  const out = [];
  const g = (over) => ({ id: 'x', nombre: 'N', lado: 'novia', grupo: 'Familia directa', rsvp: 'pendiente', plus: 0, nota: '', invitacion: 'sin enviar', menu: 'Estándar', acompanantes: [], ...over });
  const inv = [
    g({ id: 'a', lado: 'novia', rsvp: 'confirmado', plus: 1, menu: 'Celíaco', invitacion: 'respondida' }),
    g({ id: 'b', lado: 'novia', rsvp: 'pendiente', grupo: 'Amigos' }),
    g({ id: 'c', lado: 'novio', rsvp: 'confirmado', plus: 2 }),
  ];

  out.push({ name: 'parseAcomp separa líneas no vacías', ok: JSON.stringify(parseAcomp('Ana\n\n Luis ')) === JSON.stringify(['Ana', 'Luis']), detail: '' });
  out.push({ name: 'pax = 1 + plus', ok: pax(inv[2]) === 3, detail: String(pax(inv[2])) });
  out.push({ name: 'filtrar por lado', ok: filtrar(inv, { q: '', lado: 'novio', grupo: 'Todos', rsvp: 'Todos', inv: 'Todas', menu: 'Todos' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por menú especiales', ok: filtrar(inv, { q: '', lado: 'Todos', grupo: 'Todos', rsvp: 'Todos', inv: 'Todas', menu: 'especiales' }).length === 1, detail: '' });
  out.push({ name: 'circulosDe únicos', ok: JSON.stringify(circulosDe(inv)) === JSON.stringify(['Familia directa', 'Amigos']), detail: '' });

  const grupos = agrupar(inv);
  const fam = grupos.find((x) => x.titulo === 'Familia directa');
  out.push({ name: 'agrupar: pax por círculo', ok: fam.pax === 2 + 3, detail: String(fam.pax) });

  const stats = calcularStats(inv, { capSent: 300, nombre: 'X' });
  out.push({ name: 'stats: 7 tarjetas', ok: stats.length === 7, detail: String(stats.length) });
  const total = stats.find((s) => s.key === 'total');
  out.push({ name: 'stats: total pax = 5', ok: total.value === 5, detail: String(total.value) });
  const novio = stats.find((s) => s.key === 'novio');
  out.push({ name: 'stats: del novio = 3 pax', ok: novio.value === 3, detail: String(novio.value) });

  out.push({ name: 'ciclo invitación', ok: siguienteInvitacion('enviada') === 'recordatorio' && siguienteInvitacion('respondida') === 'sin enviar', detail: '' });
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './invitados-calc.test.js';
```

- [ ] **Step 3: Verificar RED** — `bash <WORKSPACE>/run-tests.sh …` → FALLOS (módulo inexistente).

- [ ] **Step 4: Implementar `invitados-calc.js`**

```js
/**
 * Lógica pura de la vista Invitados: parseo de acompañantes, filtro, personas
 * (pax), círculos/menús presentes, agrupación por círculo, estadísticas y ciclo
 * de invitación. Sin DOM ni estado; recibe los datos por parámetro.
 */

const ORDEN_INV = ['sin enviar', 'enviada', 'recordatorio', 'respondida'];

/**
 * Convierte el textarea de acompañantes (un nombre por línea) en un array.
 * @param {string} text
 * @returns {string[]}
 */
export function parseAcomp(text) {
  return String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Personas que suma una invitación: el titular más sus acompañantes.
 * @param {object} invitado
 * @returns {number}
 */
export function pax(invitado) { return 1 + (Number(invitado.plus) || 0); }

/**
 * Filtra por lado, círculo, rsvp, invitación, menú y texto (nombre+nota+grupo).
 * @param {object[]} invitados
 * @param {{q,lado,grupo,rsvp,inv,menu}} filtros
 * @returns {object[]}
 */
export function filtrar(invitados, { q, lado, grupo, rsvp, inv, menu }) {
  const needle = (q || '').trim().toLowerCase();
  return invitados.filter((g) => {
    if (lado !== 'Todos' && g.lado !== lado) return false;
    if (grupo !== 'Todos' && g.grupo !== grupo) return false;
    if (rsvp !== 'Todos' && g.rsvp !== rsvp) return false;
    if (inv !== 'Todas' && (g.invitacion || 'sin enviar') !== inv) return false;
    if (menu === 'especiales' && (!g.menu || g.menu === 'Estándar')) return false;
    if (menu !== 'Todos' && menu !== 'especiales' && (g.menu || 'Estándar') !== menu) return false;
    if (!needle) return true;
    return `${g.nombre} ${g.nota || ''} ${g.grupo}`.toLowerCase().includes(needle);
  });
}

/** @param {object[]} invitados @returns {string[]} Círculos únicos, en orden de aparición. */
export function circulosDe(invitados) {
  const set = [];
  invitados.forEach((g) => { if (g.grupo && !set.includes(g.grupo)) set.push(g.grupo); });
  return set;
}

/** @param {object[]} invitados @returns {string[]} Menús únicos presentes. */
export function menusDe(invitados) {
  const set = [];
  invitados.forEach((g) => { const m = g.menu || 'Estándar'; if (!set.includes(m)) set.push(m); });
  return set;
}

/**
 * Agrupa los invitados por círculo (solo grupos con items), con subtotales.
 * @param {object[]} invitados Ya filtrados.
 * @returns {Array<{titulo,items,inv,pax,conf}>}
 */
export function agrupar(invitados) {
  return circulosDe(invitados).map((titulo) => {
    const items = invitados.filter((g) => g.grupo === titulo);
    return {
      titulo, items,
      inv: items.length,
      pax: items.reduce((a, g) => a + pax(g), 0),
      conf: items.filter((g) => g.rsvp === 'confirmado').length,
    };
  }).filter((gr) => gr.items.length > 0);
}

/**
 * Las siete tarjetas de estadística. Devuelve claves i18n + vars; el componente
 * traduce con t().
 * @param {object[]} invitados Todos (no filtrados).
 * @param {object|null} elegida Finca elegida (para el aforo), o null.
 * @returns {Array<{key,label,value,note,noteVars}>}
 */
export function calcularStats(invitados, elegida) {
  const head = invitados.reduce((a, g) => a + pax(g), 0);
  const confPax = invitados.filter((g) => g.rsvp === 'confirmado').reduce((a, g) => a + pax(g), 0);
  const pend = invitados.filter((g) => g.rsvp === 'pendiente').length;
  const ladoPax = (lado) => invitados.filter((g) => g.lado === lado).reduce((a, g) => a + pax(g), 0);
  return [
    { key: 'total', label: 'inv.stat.total', value: head, note: 'inv.stat.total.note', noteVars: { n: invitados.length } },
    { key: 'confirmados', label: 'inv.stat.confirmados', value: confPax, note: 'inv.stat.confirmados.note', noteVars: { n: pend } },
    { key: 'sinResponder', label: 'inv.stat.sinResponder', value: invitados.filter((g) => (g.invitacion || 'sin enviar') !== 'respondida').length, note: 'inv.stat.sinResponder.note', noteVars: { n: invitados.filter((g) => g.invitacion === 'recordatorio').length } },
    { key: 'menus', label: 'inv.stat.menus', value: invitados.filter((g) => g.menu && g.menu !== 'Estándar').length, note: 'inv.stat.menus.note', noteVars: {} },
    { key: 'novio', label: 'inv.stat.novio', value: ladoPax('novio'), note: 'inv.stat.lado.note', noteVars: {} },
    { key: 'novia', label: 'inv.stat.novia', value: ladoPax('novia'), note: 'inv.stat.lado.note', noteVars: {} },
    { key: 'aforo', label: 'inv.stat.aforo', value: elegida ? elegida.capSent : '—', note: elegida ? elegida.nombre : 'inv.stat.aforo.note.sin', noteVars: {}, noteRaw: !!elegida },
  ];
}

/**
 * Siguiente estado del ciclo de invitación.
 * @param {string} estado
 * @returns {string}
 */
export function siguienteInvitacion(estado) {
  const i = ORDEN_INV.indexOf(estado || 'sin enviar');
  return ORDEN_INV[(i + 1) % ORDEN_INV.length];
}

/**
 * Clave i18n de la acción del botón de invitación según el estado actual.
 * @param {string} estado
 * @returns {string}
 */
export function accionInvitacion(estado) {
  return estado === 'sin enviar' ? 'inv.inv.accion.enviada'
    : estado === 'enviada' ? 'inv.inv.accion.recordatorio'
      : estado === 'recordatorio' ? 'inv.inv.accion.respondida'
        : 'inv.inv.accion.reabrir';
}
```

Nota: en `calcularStats`, la stat `aforo` marca `noteRaw:true` cuando hay finca elegida (la nota es el nombre literal de la finca, no una clave i18n); el componente muestra `note` tal cual si `noteRaw`, o `t(note, noteVars)` si no.

- [ ] **Step 5: Verificar GREEN** — `RESULTADO: TODO VERDE`; suite `invitados/calc` en verde.

- [ ] **Step 6: Commit**

```bash
git add web/js/components/views/invitados-view/invitados-calc.js web/test/
git commit -m "feat(invitados): lógica pura (filtro, agrupación, stats, ciclo de invitación)"
```

---

### Task 3: `invitados-view` (el componente único) + alta

**Files:**
- Create: `web/js/components/views/invitados-view/invitados-view.js`
- Create: `web/js/components/views/invitados-view/invitados-view.css.js`
- Create: `web/test/invitados-view.test.js`
- Modify: `web/test/index.html` (añadir import)
- Modify: `web/index.html` (montar `<invitados-view>` en `#view-invitados`)
- Modify: `web/main.js` (import de la vista)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`, `invitados-calc` (todo), `invitadosRepo`/`mesasRepo`/`fincasRepo`/`ensureSeeded` de repos, `modal-dialog`, `empty-state`, `app-toast`.
- Produces: `<invitados-view>` con `refresh()` público. Estado efímero: `q`, `lado`, `grupo`, `rsvp`, `inv`, `menu`, `view` ('tarjetas'|'lista'), `addOpen`, `draft`. Getters de plantilla: `_headTpl`, `_statsTpl`, `_filtrosTpl`, `_gruposTpl` (tarjetas por círculo), `_tablaTpl` (listado), `_emptyTpl`, `_altaTpl` (dentro de `modal-dialog`). Wiring en `afterRender()`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/invitados-view.test.js`:

```js
import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/invitados-view/invitados-view.js';

register('views/invitados-view', () => {
  const out = [];
  reset();
  const el = document.createElement('invitados-view');
  document.body.appendChild(el);
  el.refresh();

  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });
  const cards = el.shadowRoot.querySelectorAll('.inv-card');
  out.push({ name: 'lista 15 invitados (tarjetas)', ok: cards.length === 15, detail: String(cards.length) });

  // filtrar por lado 'novio' disparando el change del select
  const sel = el.shadowRoot.querySelector('#f-lado');
  sel.value = 'novio'; sel.dispatchEvent(new Event('change'));
  const novio = el.shadowRoot.querySelectorAll('.inv-card').length;
  out.push({ name: 'filtra por lado novio (<15)', ok: novio > 0 && novio < 15, detail: String(novio) });

  el.remove(); reset();
  return out;
});
```

Nota: la vista debe dar a las tarjetas la clase `.inv-card` y al select de lado el id `#f-lado` para que el test case encaje; si se nombran distinto, actualizar el test en coherencia.

- [ ] **Step 2: Añadir la suite al runner** — `import './invitados-view.test.js';` antes de `runAll()`.

- [ ] **Step 3: Verificar RED** — la vista no existe / sigue el placeholder.

- [ ] **Step 4: Implementar el componente**

Crear `invitados-view.js` como UN componente `AppElement` (mismo patrón que `finca-view.js`, que sirve de plantilla de referencia). Reglas:
- Orden del fichero: `static styles` → `connectedCallback` (si hace falta) → `render()` (compone getters) → getters `_xTpl` → `afterRender()` (wiring) → `refresh()` → privados agrupados.
- `render()` monta un esqueleto con contenedores estables: cabecera, `#stats`, barra de filtros ESTÁTICA (buscar, selects de lado/círculo/confirmación/invitación/menú, toggle tarjetas/listado con `.seg`), `#list` (tarjetas por círculo o tabla), `#empty`, footer, y `#overlay` (host del alta), más `app-toast`.
- Preservación de foco: al teclear en buscar (`input`) o cambiar un select, actualizar estado y re-renderizar SOLO `#stats` + `#list` (+ `#empty`), nunca toda la vista. Método `_apply()`.
- Tarjetas agrupadas: por cada grupo de `agrupar(filtrados)`, un encabezado (título + subtotal con `t('inv.grupo.subtotal', {inv,pax,conf})`) y una rejilla de tarjetas `.inv-card`. Cada tarjeta: borde izquierdo con `var(--lado-<lado>)`, fondo por rsvp (`--rsvp-si-bg`/`--rsvp-no-bg`/surface), nombre, meta, píldoras de lado (`--lado-*`) y círculo, tag de menú especial, estado de invitación + botón de ciclo (`accionInvitacion`), acompañantes (`inv.card.con` + acompLinea), selector de mesa (opciones de `mesasRepo` + "Sin asignar"), y `.seg` de RSVP (Sí/Pendiente/No). Botón Quitar.
- Listado (tabla): columnas Invitado(+meta), Lado (píldora), Círculo, Menú, Invitación, Acomp. (`+plus` o "—"), Mesa (nombre), Confirmación (select), Quitar. Cabecera con `inv.table.*`.
- Delegación de eventos en `#list`: cambio de rsvp (`data-rsvp`/`data-conf`), ciclo de invitación (`data-nextinv`), cambio de mesa (`data-mesa`), quitar (`data-remove`). Cada uno lee el id y hace `invitadosRepo.upsert({...g, ...})` o `remove`, recarga `_invitados`, `_apply()`, y toast donde aplique.
- Alta: `modal-dialog` con el formulario (nombre, lado novio/novia, círculo, acompañantes textarea, menú, invitación, rsvp, nota). Guardar valida nombre (si vacío, `app-toast` con `inv.add.needName`), calcula `plus = parseAcomp(acomp).length`, `invitadosRepo.upsert({ nombre, lado, grupo, rsvp, plus, acompanantes, menu, invitacion, nota })`, recarga y toast `inv.toast.creado`.
- `refresh()`: `ensureSeeded()`, `_invitados = invitadosRepo.list()`, `_mesas = mesasRepo.list()`, `_elegida = fincasRepo.list().find(f => f.estado === 'elegida') || null`, `_paint()`.
- Colores SIEMPRE por token (incluidos lado/rsvp con los tokens de Task 1). Texto por `t()`. Escape de texto dinámico. Sin `document`, sin `alert/confirm/prompt`.

Crear `invitados-view.css.js` con el layout (stats con divisores como el prototipo; barra de filtros flexible; rejilla de tarjetas `repeat(auto-fit,minmax(280px,1fr))`; encabezados de grupo; tabla con overflow-x; píldoras de lado/círculo; `.seg` de rsvp). Solo tokens.

- [ ] **Step 5: Cablear en `index.html` y `main.js`**

En `web/index.html` sustituir `<section class="view" id="view-invitados"></section>` por `<invitados-view class="view" id="view-invitados"></invitados-view>`. En `web/main.js` añadir `import './js/components/views/invitados-view/invitados-view.js';` junto al de finca-view. (El router ya llama `refresh()`; al tener la vista su propio `refresh`, deja de usar el placeholder "próximamente".)

- [ ] **Step 6: Verificar GREEN + visual**

Run helper → `RESULTADO: TODO VERDE` (suite `views/invitados-view`: 15 tarjetas, filtro novio <15). Luego screenshot:
```
cd web && python3 -m http.server 8281 >/dev/null 2>&1 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --window-size=1440,1200 --screenshot="/private/tmp/.../scratchpad/inv-check.png" "http://localhost:8281/#view-invitados"
```
Confirmar que se ven los grupos por círculo con sus tarjetas y las stats. Matar el servidor.

- [ ] **Step 7: Commit**

```bash
git add web/js/components/views/invitados-view/ web/test/invitados-view.test.js web/index.html web/main.js
git commit -m "feat(invitados): vista Invitados en un solo componente (stats, tarjetas/listado, filtros, alta)"
```

---

### Task 4: README y capturas

**Files:**
- Modify: `web/README.md`

- [ ] **Step 1: Actualizar `web/README.md`** — añadir la vista Invitados a la lista de vistas (implementada) con un resumen de una línea.

- [ ] **Step 2: Capturas** — generar `gestor-boda-fase2-invitados-claro.png` y `-oscuro.png` en el Desktop (la oscura pre-sembrando `localStorage['gestorboda.state']` con `config.main.theme='dark'` antes de `main.js`, ver método de fases previas), revisarlas y borrar temporales.

- [ ] **Step 3: Commit**

```bash
git add web/README.md
git commit -m "docs: nota de la vista Invitados (Fase 2) en el README"
```

---

## Self-Review

**Cobertura del spec:** §2 arquitectura (un componente) → Task 3. §3 modelo (sin cambios). §4 lógica → Task 2 (calc) + Task 3 (wiring). §5 tokens lado/rsvp → Task 1. §6 persistencia por repos → Task 3. §7 interacción/foco/sin diálogos nativos → Task 3. §8 tests → Task 2 (calc) + Task 1 (paridad) + Task 3 (vista). §9 cableado → Task 3 Step 5. §10 criterios → Tasks 1-3 + capturas Task 4.

**Placeholders:** Task 3 describe el componente por contrato + referencia a `finca-view.js` como plantilla y a las líneas del prototipo (85-256 vista, 652-717 alta, 1458-1587 lógica). El código con lógica no trivial (invitados-calc) va completo en Task 2; los tokens e i18n van completos en Task 1.

**Consistencia:** funciones de `invitados-calc` idénticas entre definición (Task 2), su test y el consumidor (Task 3). Tokens `--lado-*`/`--rsvp-*` definidos en Task 1 y usados en Task 3. Clases `.inv-card` e id `#f-lado` acordados entre el test (Task 3 Step 1) y la implementación (Step 4). Enums lado/invitacion/rsvp ya existen en i18n (Fase 0). Persistencia siempre por `invitadosRepo`.

Nota para el ejecutor: sustituir `<WORKSPACE>` por el directorio que imprime `scripts/sdd-workspace` (donde vive `run-tests.sh`, recreado como en fases previas si no existe).
