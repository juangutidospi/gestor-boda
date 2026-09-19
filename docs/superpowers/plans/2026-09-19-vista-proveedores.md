# Vista Proveedores (Fase 3) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el placeholder de Proveedores por la vista completa del prototipo (stats, filtros, chips de categorías por cubrir, tarjetas con precio/señal y acciones, alta/edición y deshacer) como UN componente con getters de plantilla, persistida vía `proveedoresRepo`.

**Architecture:** Web Components vanilla sin build. Un único componente `views/proveedores-view/proveedores-view.js` (+ `.css.js`) que compone bloques con getters y hace el wiring en `afterRender()`. Lógica pura en `proveedores-view/proveedores-calc.js`. Formato monetario compartido en `core/money.js` (extraído de finca-calc). Reutiliza `modal-dialog`, `estado-badge`, `empty-state`, `app-toast`. Persistencia solo por `proveedoresRepo`; categorías desde `repos.listaCategorias()`.

**Tech Stack:** JavaScript (módulos ES nativos), Web Components, `AppElement`, repos de core, tokens. Sin bundler. Tests en navegador (arnés de Fase 0); verificación visual con Chrome headless.

**Spec:** `docs/superpowers/specs/2026-09-19-vista-proveedores-design.md`

## Global Constraints

- Sin build: módulos ES nativos.
- Una vista = UN componente con getters; NO crear un web component por bloque. Solo se reutilizan primitivos de `ui/`.
- Shadow DOM; `this.$()/$$()`, nunca `document` (listeners globales con `this.on(window,...)`, registrados una vez).
- Colores/espaciado con tokens `var(--…)`; sin colores hardcodeados (salvo overlays convencionales ya existentes).
- Markup en getters `_xTpl`; listeners/datos en `afterRender()`. JSDoc/comentarios en español.
- i18n: todo texto con `t()`; paridad es/en (test). Persistencia SOLO vía `proveedoresRepo`.
- Sin `alert/confirm/prompt`. Buscador con preservación de foco (re-render parcial).
- Importes con `eur`/`eurK` (locale es-ES). Estados de proveedor: contratado/presupuesto/contactado/pendiente/descartado.
- Rutas relativas exactas: desde `views/proveedores-view/` core en `../../../core/`, i18n en `../../../i18n/`, primitivos en `../../ui/<name>/<name>.js`.
- Verificación con el helper headless (recrear como en fases previas): RED antes, GREEN después; suite entera verde.
- Ubicación `web/`. Rama `feat/vista-proveedores`.

---

### Task 1: Base — money compartido, enum `descartado`, categorías e i18n

**Files:**
- Create: `web/js/core/money.js`
- Modify: `web/js/components/views/finca-view/finca-calc.js` (re-exporta eur/eurK desde core/money)
- Modify: `web/js/core/enums.js` (añadir `descartado` a `provEstado`)
- Modify: `web/js/components/ui/estado-badge/estado-badge.js` (variante prov `descartado`)
- Modify: `web/js/core/repos.js` (exportar `listaCategorias()`)
- Modify: `web/js/i18n/es.js`, `web/js/i18n/en.js` (enum + claves `prov.*`)

**Interfaces:**
- Produces: `eur(n)`, `eurK(n)` en `core/money.js`; `ENUMS.provEstado.descartado = 'enum.prov.descartado'`; `listaCategorias() -> string[]`; claves i18n de la vista.

- [ ] **Step 1: Crear `core/money.js`**

```js
/** Formato monetario compartido (locale es-ES). */

/**
 * @param {number} n
 * @returns {string} Importe con separador de miles, p. ej. "1.234 €".
 */
export function eur(n) { return Math.round(n).toLocaleString('es-ES', { useGrouping: true }) + ' €'; }

/**
 * @param {number} n
 * @returns {string} En miles con una decimal si >= 10000, si no como eur().
 */
export function eurK(n) {
  return n >= 10000
    ? (Math.round(n / 100) / 10).toLocaleString('es-ES', { minimumFractionDigits: 1 }) + 'k €'
    : eur(n);
}
```

- [ ] **Step 2: `finca-calc.js` re-exporta eur/eurK desde core/money**

En `web/js/components/views/finca-view/finca-calc.js`, sustituir las definiciones locales de `eur` y `eurK` por una reexportación (mantiene su API pública y sus tests):

```js
export { eur, eurK } from '../../../core/money.js';
```
Eliminar las funciones `eur`/`eurK` locales; el resto del módulo (coste, filtrar, etc.) usa las importadas (siguen en el mismo espacio de nombres del módulo, así que `eur(...)`/`eurK(...)` internos deben pasar a usar las reexportadas: añadir también `import { eur, eurK } from '../../../core/money.js';` para el uso interno).

- [ ] **Step 3: enum + estado-badge + categorías + i18n**

`web/js/core/enums.js`, en `provEstado` añadir: `descartado: 'enum.prov.descartado'`.

`web/js/components/ui/estado-badge/estado-badge.js`, en `VARIANT.prov` añadir: `descartado: 'tag-neutral'`.

`web/js/core/repos.js`, añadir (importa ya `SEED`):
```js
/** @returns {string[]} Las categorías de proveedor del seed. */
export function listaCategorias() { return SEED.categorias; }
```

`web/js/i18n/es.js` (y las mismas claves en `en.js`):
```
enum.prov.descartado = Descartado / Discarded
prov.title = Proveedores / Vendors
prov.subtitle = Quién falta, quién está contratado y cuánto llevamos comprometido. / Who's missing, who's booked, and how much is committed.
prov.search = Buscar proveedor / Search vendor
prov.search.ph = Nombre, categoría o nota… / Name, category or note…
prov.filter.categoria = Categoría / Category
prov.filter.todas = Todas las categorías / All categories
prov.filter.estado = Estado / Status
prov.filter.todos = Todos / All
prov.filter.contratados = Contratados / Booked
prov.filter.presupuesto = Con presupuesto / With quote
prov.filter.contactados = Contactados / Contacted
prov.filter.pendientes = Por buscar / To find
prov.filter.descartados = Descartados / Discarded
prov.stat.contratados = Contratados / Booked
prov.stat.contratados.note = proveedores en la lista / vendors on the list
prov.stat.comprometido = Comprometido / Committed
prov.stat.comprometido.note = suma de los contratados / sum of booked
prov.stat.senales = Señales pagadas / Deposits paid
prov.stat.senales.note = ya desembolsado / already paid out
prov.stat.cubiertas = Categorías cubiertas / Categories covered
prov.stat.cubiertas.note = {n} sin nadie todavía / {n} with nobody yet
prov.chips.title = Categorías por cubrir / Categories to cover
prov.card.precio = Precio / Price
prov.card.senal = Señal / Deposit
prov.card.sinPresupuesto = Sin presupuesto / No quote
prov.card.sinContacto = Sin contacto anotado / No contact noted
prov.card.editar = Editar / Edit
prov.card.eliminar = Eliminar / Delete
prov.card.contratar = Contratar / Book
prov.card.contratado = Contratado ✓ / Booked ✓
prov.empty.title = Ningún proveedor coincide con el filtro / No vendor matches the filter
prov.empty.desc = Prueba con otra categoría o añade uno nuevo. / Try another category or add a new one.
prov.add = Añadir proveedor / Add vendor
prov.foot = Los importes de proveedores no incluyen el banquete de la finca salvo el catering. / Vendor amounts exclude the venue banquet except catering.
prov.modal.nuevo = Añadir proveedor / Add vendor
prov.modal.editar = Editar proveedor / Edit vendor
prov.add.nombre = Nombre del proveedor / Vendor name
prov.add.nombre.ph = Ej. Cuarteto Alameda / e.g. Cuarteto Alameda
prov.add.categoria = Categoría / Category
prov.add.estado = Estado / Status
prov.add.contacto = Persona de contacto / Contact person
prov.add.telefono = Teléfono o email / Phone or email
prov.add.precio = Precio (€) / Price (€)
prov.add.senal = Señal pagada (€) / Deposit paid (€)
prov.add.notas = Notas / Notes
prov.add.guardar = Guardar proveedor / Save vendor
prov.add.needName = Escribe el nombre del proveedor / Enter the vendor's name
prov.toast.creado = {nombre} añadido / {nombre} added
prov.toast.actualizado = {nombre} actualizado / {nombre} updated
prov.toast.eliminado = {nombre} eliminado / {nombre} deleted
prov.toast.deshacer = Deshacer / Undo
prov.toast.contratado = {nombre} contratado / {nombre} booked
prov.toast.presupuesto = {nombre} vuelve a presupuesto / {nombre} back to quote
```

- [ ] **Step 4: Verificar** — `bash <WORKSPACE>/run-tests.sh …` → `TODO VERDE` (paridad + finca-calc siguen verdes tras la extracción).

- [ ] **Step 5: Commit**

```bash
git add web/js/core/money.js web/js/components/views/finca-view/finca-calc.js web/js/core/enums.js web/js/components/ui/estado-badge/estado-badge.js web/js/core/repos.js web/js/i18n/
git commit -m "feat(proveedores): money compartido, enum descartado, listaCategorias e i18n de la vista"
```

---

### Task 2: Lógica pura `proveedores-calc.js`

**Files:**
- Create: `web/js/components/views/proveedores-view/proveedores-calc.js`
- Test: `web/test/proveedores-calc.test.js`
- Modify: `web/test/index.html` (import)

**Interfaces:**
- Consumes: `eur`/`eurK` de `core/money.js`.
- Produces:
  - `filtrar(provs, { q, categoria, estado }) -> Proveedor[]`.
  - `ordenar(provs, categorias) -> Proveedor[]` (por orden de `categorias`; no muta).
  - `calcularStats(provs, categorias) -> Array<{key,label,value,note,noteVars,noteRaw}>` (los 4).
  - `chipsCategorias(provs, categorias) -> Array<{categoria, estado:'cubierta'|'enMarcha'|'vacia'}>`.

- [ ] **Step 1: Test (falla primero)** — crear `web/test/proveedores-calc.test.js`:

```js
import { register } from './runner.js';
import { filtrar, ordenar, calcularStats, chipsCategorias } from '../js/components/views/proveedores-view/proveedores-calc.js';

register('proveedores/calc', () => {
  const out = [];
  const cats = ['Fotografía', 'Vídeo', 'Flores'];
  const p = (over) => ({ id: 'x', nombre: 'N', categoria: 'Flores', estado: 'contactado', precio: 0, senal: 0, contacto: '', telefono: '', notas: '', ...over });
  const provs = [
    p({ id: 'a', categoria: 'Fotografía', estado: 'contratado', precio: 2400, senal: 600 }),
    p({ id: 'b', categoria: 'Flores', estado: 'presupuesto', precio: 1650, notas: 'olivo' }),
    p({ id: 'c', categoria: 'Vídeo', estado: 'descartado', precio: 0 }),
  ];

  out.push({ name: 'filtrar por estado', ok: filtrar(provs, { q: '', categoria: 'Todas', estado: 'contratado' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por categoría', ok: filtrar(provs, { q: '', categoria: 'Flores', estado: 'Todos' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por texto (nota)', ok: filtrar(provs, { q: 'olivo', categoria: 'Todas', estado: 'Todos' }).length === 1, detail: '' });

  const ord = ordenar(provs, cats).map((x) => x.categoria);
  out.push({ name: 'ordenar por categorías', ok: ord[0] === 'Fotografía' && ord[2] === 'Flores', detail: ord.join(',') });

  const stats = calcularStats(provs, cats);
  out.push({ name: 'stats: 4', ok: stats.length === 4, detail: String(stats.length) });
  const comp = stats.find((s) => s.key === 'comprometido');
  out.push({ name: 'comprometido = solo contratados (2400)', ok: String(comp.value).includes('2.400'), detail: String(comp.value) });
  const cub = stats.find((s) => s.key === 'cubiertas');
  out.push({ name: 'cubiertas = 1 categoría', ok: String(cub.value).startsWith('1'), detail: String(cub.value) });

  const chips = chipsCategorias(provs, cats);
  out.push({ name: 'chip Fotografía cubierta', ok: chips.find((c) => c.categoria === 'Fotografía').estado === 'cubierta', detail: '' });
  out.push({ name: 'chip Flores en marcha', ok: chips.find((c) => c.categoria === 'Flores').estado === 'enMarcha', detail: '' });
  out.push({ name: 'chip Vídeo vacía (descartado no cuenta)', ok: chips.find((c) => c.categoria === 'Vídeo').estado === 'vacia', detail: '' });
  return out;
});
```

- [ ] **Step 2: Import en `web/test/index.html`** (`import './proveedores-calc.test.js';` antes de `runAll()`).
- [ ] **Step 3: Verificar RED.**
- [ ] **Step 4: Implementar `proveedores-calc.js`**

```js
/**
 * Lógica pura de la vista Proveedores: filtro, orden por categoría, estadísticas
 * y estado de los chips de categorías. Sin DOM; recibe datos por parámetro.
 */
import { eur, eurK } from '../../../core/money.js';

/**
 * @param {object[]} provs
 * @param {{q:string, categoria:string, estado:string}} filtros
 * @returns {object[]}
 */
export function filtrar(provs, { q, categoria, estado }) {
  const needle = (q || '').trim().toLowerCase();
  return provs.filter((p) => {
    if (categoria !== 'Todas' && p.categoria !== categoria) return false;
    if (estado !== 'Todos' && p.estado !== estado) return false;
    if (!needle) return true;
    return `${p.nombre} ${p.categoria} ${p.notas || ''} ${p.contacto || ''}`.toLowerCase().includes(needle);
  });
}

/**
 * Copia ordenada por el orden de `categorias`.
 * @param {object[]} provs
 * @param {string[]} categorias
 * @returns {object[]}
 */
export function ordenar(provs, categorias) {
  return [...provs].sort((a, b) => categorias.indexOf(a.categoria) - categorias.indexOf(b.categoria));
}

/**
 * Las cuatro tarjetas de estadística (claves i18n + vars; el componente traduce).
 * @param {object[]} provs
 * @param {string[]} categorias
 * @returns {Array<{key,label,value,note,noteVars,noteRaw}>}
 */
export function calcularStats(provs, categorias) {
  const contratados = provs.filter((p) => p.estado === 'contratado');
  const comprometido = contratados.reduce((a, p) => a + (Number(p.precio) || 0), 0);
  const pagado = provs.reduce((a, p) => a + (Number(p.senal) || 0), 0);
  const cubiertas = new Set(contratados.map((p) => p.categoria));
  const usadas = new Set(provs.filter((p) => p.estado !== 'descartado').map((p) => p.categoria));
  return [
    { key: 'contratados', label: 'prov.stat.contratados', value: `${contratados.length} / ${provs.length}`, note: 'prov.stat.contratados.note', noteVars: {}, noteRaw: false },
    { key: 'comprometido', label: 'prov.stat.comprometido', value: eurK(comprometido), note: 'prov.stat.comprometido.note', noteVars: {}, noteRaw: false },
    { key: 'senales', label: 'prov.stat.senales', value: eurK(pagado), note: 'prov.stat.senales.note', noteVars: {}, noteRaw: false },
    { key: 'cubiertas', label: 'prov.stat.cubiertas', value: `${cubiertas.size} / ${categorias.length}`, note: 'prov.stat.cubiertas.note', noteVars: { n: categorias.length - usadas.size }, noteRaw: false },
  ];
}

/**
 * Estado visual de cada categoría para los chips.
 * @param {object[]} provs
 * @param {string[]} categorias
 * @returns {Array<{categoria:string, estado:'cubierta'|'enMarcha'|'vacia'}>}
 */
export function chipsCategorias(provs, categorias) {
  const cubiertas = new Set(provs.filter((p) => p.estado === 'contratado').map((p) => p.categoria));
  const enMarcha = new Set(provs.filter((p) => p.estado !== 'descartado').map((p) => p.categoria));
  return categorias.map((categoria) => ({
    categoria,
    estado: cubiertas.has(categoria) ? 'cubierta' : (enMarcha.has(categoria) ? 'enMarcha' : 'vacia'),
  }));
}

export { eur, eurK };
```

- [ ] **Step 5: Verificar GREEN.**
- [ ] **Step 6: Commit** `feat(proveedores): lógica pura (filtro, orden, stats, chips de categorías)`.

---

### Task 3: `proveedores-view` (el componente) + alta/edición + deshacer

**Files:**
- Create: `web/js/components/views/proveedores-view/proveedores-view.js`, `.css.js`
- Test: `web/test/proveedores-view.test.js`
- Modify: `web/test/index.html`, `web/index.html`, `web/main.js`

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`, `ENUMS`, `proveedores-calc` (todo), `proveedoresRepo`/`ensureSeeded`/`listaCategorias` de repos, `modal-dialog`, `estado-badge`, `app-toast`.
- Produces: `<proveedores-view>` con `refresh()` público. Estado efímero: `q`, `categoria`, `estado`, `open` (bool), `editId` (id|null), `draft`.

- [ ] **Step 1: Test (falla primero)** — crear `web/test/proveedores-view.test.js`:

```js
import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/proveedores-view/proveedores-view.js';

register('views/proveedores-view', () => {
  const out = [];
  reset();
  const el = document.createElement('proveedores-view');
  document.body.appendChild(el);
  el.refresh();
  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });
  const cards = el.shadowRoot.querySelectorAll('.prov-card');
  out.push({ name: 'lista 14 proveedores', ok: cards.length === 14, detail: String(cards.length) });
  const sel = el.shadowRoot.querySelector('#pf-estado');
  sel.value = 'contratado'; sel.dispatchEvent(new Event('change'));
  const n = el.shadowRoot.querySelectorAll('.prov-card').length;
  out.push({ name: 'filtra por estado contratado (<14)', ok: n > 0 && n < 14, detail: String(n) });
  el.remove(); reset();
  return out;
});
```
La vista debe dar a las tarjetas la clase `.prov-card` y al select de estado el id `#pf-estado` (o ajustar el test en coherencia).

- [ ] **Step 2: Import en index.html.** **Step 3: Verificar RED.**
- [ ] **Step 4: Implementar `proveedores-view.js`** siguiendo `finca-view.js` como plantilla de referencia (mismo patrón: skeleton estable, `_apply()` parcial con preservación de foco, delegación en contenedores estables, overlay con `modal-dialog`, `app-toast`). Bloques (getters): cabecera; `#stats` (`_statsTpl` con `calcularStats`, `tabular-nums`); barra de filtros ESTÁTICA (buscar + selects de categoría/estado); `#chips` (`_chipsTpl` con `chipsCategorias`: cubierta ✓ / en marcha / vacía +, cada chip `data-cat` abre el alta con esa categoría); `#grid` (tarjetas `.prov-card` de `ordenar(filtrar(...))`); `#empty`; footer; `#overlay` (alta/edición). Markup de tarjeta y formulario portados del prototipo (líneas 385-430 y 432-530). Acciones por delegación en `#grid`: `data-edit` (abre edición), `data-del` (elimina con deshacer), `data-contratar` (alterna contratado↔presupuesto). Persistencia por `proveedoresRepo.upsert/remove`. `refresh()`: `ensureSeeded()`, `_provs = proveedoresRepo.list()`, `_cats = listaCategorias()`, `_paint()`. Eliminar con deshacer (snapshot + `app-toast` con acción, patrón de Invitados). Estado del proveedor con `estado-badge kind="prov"`. Colores por token; `prefers-reduced-motion`; entrada escalonada opcional coherente con las otras vistas.

`proveedores-view.css.js`: stats con divisores; barra de filtros; chips (variantes cubierta/enMarcha/vacía por token: verde/acento/contorno); rejilla `repeat(auto-fit,minmax(300px,1fr))`; tarjeta premium (borde/sombra/hover, panel de precio/señal con `--color-accent-100`, `tabular-nums`); formulario en grid. Solo tokens.

- [ ] **Step 5: Cablear** en `index.html` (`<proveedores-view class="view" id="view-proveedores">`) y `main.js` (import).
- [ ] **Step 6: Verificar GREEN + captura** (`#view-proveedores`).
- [ ] **Step 7: Commit** `feat(proveedores): vista Proveedores en un componente (stats, filtros, chips, tarjetas, alta/edición, deshacer)`.

---

### Task 4: README y capturas

- [ ] **Step 1:** Añadir la vista Proveedores a `web/README.md` (implementada; resumen de una línea).
- [ ] **Step 2:** Capturas `gestor-boda-fase3-proveedores-claro.png` / `-oscuro.png` en el Desktop (oscura con el pre-seed de `localStorage` theme=dark), revisarlas y borrar temporales.
- [ ] **Step 3: Commit** `docs: nota de la vista Proveedores (Fase 3) en el README`.

---

## Self-Review

**Cobertura del spec:** §2 arquitectura (un componente) → Task 3. §3 modelo + descartado → Task 1. §4 lógica → Task 2 (calc) + Task 3 (wiring). §5 money compartido → Task 1. §6 persistencia repos → Task 3. §7 interacción → Task 3. §8 premium → Task 3 (css). §9 tests → Task 2 (calc) + Task 1 (paridad/money) + Task 3 (vista). §10 cableado → Task 3. §11 criterios → Tasks 1-3 + capturas Task 4.

**Placeholders:** money.js y proveedores-calc.js van con código completo; Task 3 (la vista) va por contrato + finca-view.js como plantilla + líneas del prototipo (385-530). i18n completo en Task 1.

**Consistencia:** `eur/eurK` en `core/money.js`, reexportados por finca-calc (sus tests siguen verdes), importados por proveedores-calc. `listaCategorias()` en repos consumido por la vista. Clases `.prov-card` / id `#pf-estado` acordados test↔impl. Enum `descartado` en enums + estado-badge + i18n. Persistencia por `proveedoresRepo`.

Nota: sustituir `<WORKSPACE>` por el directorio de `scripts/sdd-workspace` (donde vive `run-tests.sh`, recreado como en fases previas).
