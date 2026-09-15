# Vista Finca (Fase 1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el placeholder `finca-view` por la vista Finca completa del prototipo (lista rejilla/tabla, filtros/orden, stats, comparador, ficha con galería y lightbox, alta y flujo de estados), persistida vía `fincasRepo`, sobre la arquitectura de la Fase 0.

**Architecture:** Web Components vanilla sin build. La lógica de negocio (coste, formateo, filtro, orden, stats, filas del comparador) se aísla en un módulo puro `finca-calc.js` testeable sin DOM. La vista raíz `finca-view` mantiene el estado efímero (filtros, selección de comparador, id de detalle/lightbox), lee/escribe fincas por `fincasRepo` y el nº de invitados por `configRepo`, y compone subcomponentes específicos (finca-card, finca-table, finca-detail, finca-compare, finca-lightbox) más un primitivo genérico `modal-dialog`. Todo estilo por tokens; i18n con `t()`; sin `alert/confirm/prompt`.

**Tech Stack:** JavaScript (módulos ES nativos), Web Components (Custom Elements + Shadow DOM + adoptedStyleSheets), `AppElement` base de la Fase 0, `fincasRepo`/`configRepo`/`storage` de core, primitivos ui existentes, `Intl`/`toLocaleString` para formateo. Sin bundler. Tests en navegador (arnés de la Fase 0) para la lógica pura; verificación visual con Chrome headless.

**Spec:** `docs/superpowers/specs/2026-09-15-vista-finca-design.md`

## Global Constraints

- Sin build: solo módulos ES nativos; nada de bundler ni transpilación.
- Shadow DOM por componente; consultas siempre con `this.$()` / `this.$$()`, nunca `document` (salvo listeners globales de teclado, que se registran con `this.on(window, ...)`).
- Colores y espaciado con tokens `var(--…)`; sin colores de marca hardcodeados (excepción: overlays negros semitransparentes de lightbox/backdrop, como en Fase 0).
- Markup en getters `_xTpl` puros; listeners, `options` y datos en `afterRender()`.
- JSDoc en español en cada método/getter/helper; comentarios en español; sin cursiva en docs.
- i18n: todo texto con `t('clave')`; paridad de claves entre `es.js` y `en.js` (test).
- Persistencia SOLO vía repos (`fincasRepo.upsert/list/get/remove`, `configRepo`); nunca `store`/`localStorage` directo desde la vista.
- Sin `alert/confirm/prompt`. Diálogos/overlays propios; cerrar con botón, backdrop y Escape.
- Coste = `(alquiler||0) + (menu||0) * invitados`. `eur(n)` y `eurK(n)` exactamente como el prototipo (locale `es-ES`).
- Rutas de import relativas exactas: desde `components/views/finca-view/` los cores están en `../../../core/`, i18n en `../../../i18n/`, primitivos ui en `../../ui/<name>/<name>.js`.
- Estados de finca: `candidata`, `favorita`, `elegida`, `descartada`. Solo una `elegida` a la vez.
- Verificación de tests en navegador con el helper headless (se recrea abajo); RED antes de implementar, GREEN después; la suite entera debe quedar verde.
- Ubicación raíz de la app: `web/`. Repo: `gestor-boda`, rama `feat/vista-finca`.

---

### Task 1: Base — enum `elegida`, campo `senal`, i18n de la vista

**Files:**
- Modify: `web/js/core/enums.js`
- Modify: `web/js/i18n/es.js`
- Modify: `web/js/i18n/en.js`
- Modify: `web/js/components/ui/estado-badge/estado-badge.js` (variante de `elegida`)
- Test: `web/test/i18n-parity.test.js` (ya existe; debe seguir verde con las claves nuevas)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `ENUMS.fincaEstado.elegida = 'enum.finca.elegida'`; claves i18n de la vista Finca en es/en; `estado-badge` mapea `finca/elegida → tag-accent`.

- [ ] **Step 1: Verificar RED (paridad rota al añadir enum sin clave)**

Añadir primero a `web/js/core/enums.js` la entrada `elegida` en `fincaEstado`:

```js
fincaEstado: { favorita: 'enum.finca.favorita', candidata: 'enum.finca.candidata', descartada: 'enum.finca.descartada', elegida: 'enum.finca.elegida' },
```

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: FALLOS — la suite `i18n/paridad` falla porque `enum.finca.elegida` no está en es.js/en.js.

- [ ] **Step 2: Añadir claves i18n (es.js y en.js)**

En `web/js/i18n/es.js` añadir (junto a las de finca y las comunes):

```js
  'enum.finca.elegida': 'Elegida',
  // Vista Finca
  'finca.title': 'Elegir la finca',
  'finca.subtitle': 'Espacios en seguimiento. Compara aforo, coste real con tus invitados y lo que cada sitio te obliga a contratar.',
  'finca.search': 'Buscar',
  'finca.search.ph': 'Nombre, zona o notas…',
  'finca.filter.tipo': 'Tipo',
  'finca.filter.estado': 'Estado',
  'finca.filter.todos': 'Todos',
  'finca.filter.candidatas': 'Candidatas',
  'finca.filter.favoritas': 'Favoritas',
  'finca.filter.elegida': 'Elegida',
  'finca.filter.descartadas': 'Descartadas',
  'finca.sort': 'Ordenar por',
  'finca.sort.valoracion': 'Mejor valoradas',
  'finca.sort.costeAsc': 'Coste (menor)',
  'finca.sort.costeDesc': 'Coste (mayor)',
  'finca.sort.aforo': 'Aforo (mayor)',
  'finca.sort.km': 'Distancia (menor)',
  'finca.sort.nombre': 'Nombre (A-Z)',
  'finca.invitados': 'Invitados',
  'finca.view.grid': 'Rejilla',
  'finca.view.table': 'Tabla',
  'finca.stat.seguimiento': 'En seguimiento',
  'finca.stat.seguimiento.note': '{total} fichas en total',
  'finca.stat.favoritas': 'Favoritas',
  'finca.stat.favoritas.note': 'listas para segunda visita',
  'finca.stat.costeMedio': 'Coste medio',
  'finca.stat.costeMedio.note': '{inv} invitados',
  'finca.stat.rango': 'Rango',
  'finca.stat.rango.note': 'de la más barata a la más cara',
  'finca.stat.descartadas': 'Descartadas',
  'finca.stat.descartadas.note': 'con motivo anotado',
  'finca.card.coste': 'Coste estimado',
  'finca.card.aforoVal': 'Aforo · Valoración',
  'finca.card.compare': 'Comparar',
  'finca.card.ficha': 'Ver ficha',
  'finca.table.finca': 'Finca',
  'finca.table.zona': 'Zona',
  'finca.table.aforo': 'Aforo',
  'finca.table.precio': 'Precio',
  'finca.table.coste': 'Coste estimado',
  'finca.table.val': 'Val.',
  'finca.table.estado': 'Estado',
  'finca.empty.title': 'Ninguna finca coincide con el filtro',
  'finca.empty.desc': 'Amplía la búsqueda o añade un espacio nuevo a la lista de candidatas.',
  'finca.add': 'Añadir finca',
  'finca.foot': 'Coste estimado sobre {inv} invitados · menú + alquiler, sin barra libre extra.',
  'finca.compare.bar': '{n} para comparar',
  'finca.compare.clear': 'Limpiar',
  'finca.compare.open': 'Comparar',
  'finca.compare.title': 'Comparativa',
  'finca.compare.hint': 'Mejor valor de cada fila resaltado · {inv} invitados',
  'finca.compare.close': 'Cerrar',
  'finca.compare.row.coste': 'Coste estimado',
  'finca.compare.row.menu': 'Menú / invitado',
  'finca.compare.row.alquiler': 'Alquiler del espacio',
  'finca.compare.row.aforo': 'Aforo sentados',
  'finca.compare.row.val': 'Valoración',
  'finca.compare.row.km': 'Distancia',
  'finca.compare.incluido': 'Incluido',
  'finca.detail.back': 'Volver a fincas',
  'finca.detail.coste': 'Coste estimado',
  'finca.detail.galeria': 'Galería',
  'finca.detail.datos': 'Datos',
  'finca.detail.servicios': 'Servicios',
  'finca.detail.fechas': 'Fechas y promociones',
  'finca.detail.notas': 'Notas de la visita',
  'finca.detail.tour': 'Ver tour 360º',
  'finca.detail.tourFoot': 'se abre en Bodas.net',
  'finca.detail.sinFotos': 'Aún no hay fotos · se podrán subir en una fase posterior',
  'finca.action.favorita': 'Favorita',
  'finca.action.descartar': 'Descartar',
  'finca.action.elegir': 'Elegir esta finca',
  'finca.elegida.banner': 'Finca elegida',
  'finca.elegida.senal': 'Señal pendiente',
  'finca.elegida.coste': 'Coste estimado',
  'finca.elegida.volver': 'Volver a candidata',
  'finca.lightbox.close': 'Cerrar',
  'finca.add.title': 'Añadir finca',
  'finca.add.cancel': 'Cancelar',
  'finca.add.nombre': 'Nombre',
  'finca.add.nombre.ph': 'Ej. Finca Valdetrigos',
  'finca.add.tipo': 'Tipo',
  'finca.add.zona': 'Zona / municipio',
  'finca.add.zona.ph': 'Ej. Guadarrama, Madrid',
  'finca.add.aforo': 'Aforo sentados',
  'finca.add.menu': 'Menú por invitado (€)',
  'finca.add.alquiler': 'Alquiler del espacio (€)',
  'finca.add.km': 'A cuántos km',
  'finca.add.senal': 'Señal pagada (€)',
  'finca.add.hint': 'Se añade como candidata; podrás valorarla tras la visita.',
  'finca.add.save': 'Guardar finca',
  'finca.toast.favorita': '{nombre} pasa a favoritas',
  'finca.toast.descartada': '{nombre} descartada',
  'finca.toast.elegida': '{nombre} es la finca elegida',
  'finca.toast.candidata': '{nombre} vuelve a candidata',
  'finca.toast.creada': '{nombre} añadida como candidata',
```

Replicar EXACTAMENTE las mismas claves en `web/js/i18n/en.js` con su traducción inglesa (p. ej. `'enum.finca.elegida': 'Chosen'`, `'finca.title': 'Choose the venue'`, `'finca.card.compare': 'Compare'`, etc.). Toda clave añadida en es.js debe existir en en.js.

- [ ] **Step 3: Variante de estado-badge para `elegida`**

En `web/js/components/ui/estado-badge/estado-badge.js`, ampliar el mapa `VARIANT.finca` para incluir `elegida`:

```js
finca: { favorita: 'tag-accent', candidata: 'tag-outline', descartada: 'tag-neutral', elegida: 'tag-accent' },
```

(No cambia nada más; `ENUM_GROUP.finca` ya apunta a `ENUMS.fincaEstado`, que ahora incluye `elegida`.)

- [ ] **Step 4: Verificar GREEN**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE` — la suite de paridad pasa con todas las claves nuevas.

- [ ] **Step 5: Commit**

```bash
git add web/js/core/enums.js web/js/i18n/ web/js/components/ui/estado-badge/estado-badge.js
git commit -m "feat(finca): enum elegida, campo senal (i18n) y claves de la vista Finca"
```

---

### Task 2: Lógica pura `finca-calc.js` (coste, formateo, filtro, orden, stats, comparador)

**Files:**
- Create: `web/js/components/views/finca-view/finca-calc.js`
- Test: `web/test/finca-calc.test.js`
- Modify: `web/test/index.html` (añadir import de la suite)

**Interfaces:**
- Consumes: nada (módulo puro; recibe arrays de fincas e invitados por parámetro).
- Produces en `finca-calc.js`:
  - `eur(n) -> string`, `eurK(n) -> string`, `coste(finca, invitados) -> number`.
  - `filtrar(fincas, { q, tipo, estado }) -> Finca[]`.
  - `ordenar(fincas, sort, invitados) -> Finca[]` (no muta; devuelve copia).
  - `tiposDe(fincas) -> string[]` (['Todos', ...tipos únicos]).
  - `calcularStats(fincas, invitados) -> Array<{key,label,value,note}>` con claves i18n y vars.
  - `filasComparador(fincas, invitados) -> Array<{key,label,cells:Array<{txt,win}>}>`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/finca-calc.test.js`:

```js
import { register } from './runner.js';
import { eur, eurK, coste, filtrar, ordenar, tiposDe, calcularStats, filasComparador } from '../js/components/views/finca-view/finca-calc.js';

register('finca/calc', () => {
  const out = [];
  const fincas = [
    { id: '1', nombre: 'Alfa', tipo: 'Finca', zona: 'Madrid', km: 30, capSent: 300, capPie: 500, menu: 100, alquiler: 0, valoracion: 4.5, estado: 'favorita', notas: '' },
    { id: '2', nombre: 'Beta', tipo: 'Bodega', zona: 'Toledo', km: 80, capSent: 150, capPie: 200, menu: 90, alquiler: 4800, valoracion: 4.2, estado: 'candidata', notas: 'con barra' },
    { id: '3', nombre: 'Gamma', tipo: 'Finca', zona: 'Ávila', km: 120, capSent: 250, capPie: 400, menu: 96, alquiler: 0, valoracion: 4.9, estado: 'descartada', notas: '' },
  ];

  out.push({ name: 'coste = alquiler + menu*inv', ok: coste(fincas[1], 140) === 4800 + 90 * 140, detail: String(coste(fincas[1], 140)) });
  out.push({ name: 'eur formatea es-ES', ok: eur(1234) === '1.234 €', detail: eur(1234) });
  out.push({ name: 'eurK sobre 10k', ok: eurK(18200) === '18,2k €', detail: eurK(18200) });
  out.push({ name: 'eurK bajo 10k = eur', ok: eurK(4800) === eur(4800), detail: eurK(4800) });

  out.push({ name: 'filtrar por estado', ok: filtrar(fincas, { q: '', tipo: 'Todos', estado: 'favorita' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por tipo', ok: filtrar(fincas, { q: '', tipo: 'Finca', estado: 'Todos' }).length === 2, detail: '' });
  out.push({ name: 'filtrar por texto (zona/notas)', ok: filtrar(fincas, { q: 'barra', tipo: 'Todos', estado: 'Todos' }).length === 1, detail: '' });

  const porCoste = ordenar(fincas, 'coste-asc', 140).map(f => f.id);
  out.push({ name: 'ordenar coste-asc', ok: porCoste[0] === '3' || porCoste[0] === '1', detail: porCoste.join(',') }); // 1 y 3 tienen alquiler 0; menor menu*inv gana

  const porVal = ordenar(fincas, 'valoracion', 140).map(f => f.id);
  out.push({ name: 'ordenar valoracion desc', ok: porVal[0] === '3', detail: porVal.join(',') });

  out.push({ name: 'tiposDe incluye Todos y únicos', ok: JSON.stringify(tiposDe(fincas)) === JSON.stringify(['Todos', 'Finca', 'Bodega']), detail: tiposDe(fincas).join(',') });

  const stats = calcularStats(fincas, 140);
  out.push({ name: 'stats: 5 tarjetas', ok: stats.length === 5, detail: String(stats.length) });
  const seg = stats.find(s => s.key === 'seguimiento');
  out.push({ name: 'stats: en seguimiento = no descartadas', ok: seg.value === 2, detail: String(seg.value) });

  const filas = filasComparador([fincas[0], fincas[1]], 140);
  const costeRow = filas.find(r => r.key === 'coste');
  out.push({ name: 'comparador: mejor coste marcado (min)', ok: costeRow.cells[0].win === true && costeRow.cells[1].win === false, detail: '' });

  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './finca-calc.test.js';
```

- [ ] **Step 3: Verificar RED**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: FALLOS — el módulo `finca-calc.js` no existe (import roto).

- [ ] **Step 4: Implementar `finca-calc.js`**

Crear `web/js/components/views/finca-view/finca-calc.js`:

```js
/**
 * Lógica pura de la vista Finca: cálculo de coste, formateo monetario, filtro,
 * orden, estadísticas y filas del comparador. Sin DOM ni dependencias de estado;
 * recibe los datos por parámetro para poder testearse en aislamiento.
 */

/**
 * Formatea un importe en euros con separador de miles es-ES.
 * @param {number} n
 * @returns {string}
 */
export function eur(n) { return Math.round(n).toLocaleString('es-ES') + ' €'; }

/**
 * Formatea un importe: en miles con una decimal si es >= 10000, si no como eur().
 * @param {number} n
 * @returns {string}
 */
export function eurK(n) {
  return n >= 10000
    ? (Math.round(n / 100) / 10).toLocaleString('es-ES', { minimumFractionDigits: 1 }) + 'k €'
    : eur(n);
}

/**
 * Coste estimado de una finca para un nº de invitados.
 * @param {object} finca
 * @param {number} invitados
 * @returns {number}
 */
export function coste(finca, invitados) { return (finca.alquiler || 0) + (finca.menu || 0) * invitados; }

/**
 * Filtra por tipo, estado y texto (nombre + zona + notas).
 * @param {object[]} fincas
 * @param {{q: string, tipo: string, estado: string}} filtros
 * @returns {object[]}
 */
export function filtrar(fincas, { q, tipo, estado }) {
  const needle = (q || '').trim().toLowerCase();
  return fincas.filter((f) => {
    if (tipo !== 'Todos' && f.tipo !== tipo) return false;
    if (estado !== 'Todos' && f.estado !== estado) return false;
    if (!needle) return true;
    return `${f.nombre} ${f.zona} ${f.notas || ''}`.toLowerCase().includes(needle);
  });
}

/**
 * Devuelve una copia ordenada según el criterio.
 * @param {object[]} fincas
 * @param {string} sort
 * @param {number} invitados
 * @returns {object[]}
 */
export function ordenar(fincas, sort, invitados) {
  const cmp = {
    valoracion: (a, b) => b.valoracion - a.valoracion,
    'coste-asc': (a, b) => coste(a, invitados) - coste(b, invitados),
    'coste-desc': (a, b) => coste(b, invitados) - coste(a, invitados),
    aforo: (a, b) => b.capSent - a.capSent,
    km: (a, b) => a.km - b.km,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  }[sort] || ((a, b) => 0);
  return [...fincas].sort(cmp);
}

/**
 * Lista de tipos para el filtro: 'Todos' más los tipos únicos presentes.
 * @param {object[]} fincas
 * @returns {string[]}
 */
export function tiposDe(fincas) {
  const set = [];
  fincas.forEach((f) => { if (!set.includes(f.tipo)) set.push(f.tipo); });
  return ['Todos', ...set];
}

/**
 * Calcula las cinco tarjetas de estadística. Devuelve claves i18n + vars; el
 * componente traduce con t().
 * @param {object[]} fincas
 * @param {number} invitados
 * @returns {Array<{key: string, label: string, note: string, noteVars: object, value: string|number}>}
 */
export function calcularStats(fincas, invitados) {
  const activas = fincas.filter((f) => f.estado !== 'descartada');
  const costes = activas.map((f) => coste(f, invitados));
  const media = costes.length ? costes.reduce((a, b) => a + b, 0) / costes.length : 0;
  return [
    { key: 'seguimiento', label: 'finca.stat.seguimiento', value: activas.length, note: 'finca.stat.seguimiento.note', noteVars: { total: fincas.length } },
    { key: 'favoritas', label: 'finca.stat.favoritas', value: fincas.filter((f) => f.estado === 'favorita').length, note: 'finca.stat.favoritas.note', noteVars: {} },
    { key: 'costeMedio', label: 'finca.stat.costeMedio', value: costes.length ? eurK(media) : '—', note: 'finca.stat.costeMedio.note', noteVars: { inv: invitados } },
    { key: 'rango', label: 'finca.stat.rango', value: costes.length ? `${eurK(Math.min(...costes))} – ${eurK(Math.max(...costes))}` : '—', note: 'finca.stat.rango.note', noteVars: {} },
    { key: 'descartadas', label: 'finca.stat.descartadas', value: fincas.filter((f) => f.estado === 'descartada').length, note: 'finca.stat.descartadas.note', noteVars: {} },
  ];
}

/**
 * Filas del comparador con la celda de mejor valor marcada (win=true).
 * @param {object[]} seleccion Fincas a comparar (máx 4).
 * @param {number} invitados
 * @returns {Array<{key: string, label: string, cells: Array<{txt: string, win: boolean}>}>}
 */
export function filasComparador(seleccion, invitados) {
  const defs = [
    { key: 'coste', label: 'finca.compare.row.coste', get: (f) => coste(f, invitados), fmt: (v) => eur(v), best: 'min' },
    { key: 'menu', label: 'finca.compare.row.menu', get: (f) => f.menu, fmt: (v) => `${v} €`, best: 'min' },
    { key: 'alquiler', label: 'finca.compare.row.alquiler', get: (f) => f.alquiler, fmt: (v) => (v ? eur(v) : 'finca.compare.incluido'), best: 'min' },
    { key: 'aforo', label: 'finca.compare.row.aforo', get: (f) => f.capSent, fmt: (v) => `${v}`, best: 'max' },
    { key: 'val', label: 'finca.compare.row.val', get: (f) => f.valoracion, fmt: (v) => v.toString().replace('.', ','), best: 'max' },
    { key: 'km', label: 'finca.compare.row.km', get: (f) => f.km, fmt: (v) => `${v} km`, best: 'min' },
  ];
  return defs.map((d) => {
    const vals = seleccion.map((f) => d.get(f));
    const winner = d.best === 'min' ? Math.min(...vals) : Math.max(...vals);
    return {
      key: d.key,
      label: d.label,
      cells: seleccion.map((f) => ({ txt: d.fmt(d.get(f)), win: d.get(f) === winner })),
    };
  });
}
```

Nota: en `filasComparador`, la celda `txt` puede ser una clave i18n (`finca.compare.incluido`); el componente decide si traducir (si empieza por `finca.`) o mostrar tal cual. Documentarlo así en el componente.

- [ ] **Step 5: Verificar GREEN**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE`; la suite `finca/calc` con todos los PASS.

- [ ] **Step 6: Commit**

```bash
git add web/js/components/views/finca-view/finca-calc.js web/test/
git commit -m "feat(finca): lógica pura de coste, filtro, orden, stats y comparador"
```

---

### Task 3: Primitivo `modal-dialog`

**Files:**
- Create: `web/js/components/ui/modal-dialog/modal-dialog.css.js`
- Create: `web/js/components/ui/modal-dialog/modal-dialog.js`
- Create: `web/test/modal-dialog.test.js`
- Modify: `web/test/index.html` (añadir import)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`.
- Produces: `<modal-dialog>` con `heading` (prop), `open()`/`close()`, evento `close`, contenido por `<slot>`, ancho por atributo `width` (por defecto `min(620px,100%)`). Cierra con botón, click en backdrop y Escape. Sin `alert/confirm/prompt`.

- [ ] **Step 1: Escribir el test (falla primero)**

Crear `web/test/modal-dialog.test.js`:

```js
import { register } from './runner.js';
import '../js/components/ui/modal-dialog/modal-dialog.js';

register('ui/modal-dialog', () => {
  const out = [];
  const d = document.createElement('modal-dialog');
  d.heading = 'Comparativa';
  document.body.appendChild(d);
  out.push({ name: 'nace cerrado', ok: d.shadowRoot.querySelector('.backdrop')?.getAttribute('data-open') === 'false', detail: '' });

  d.open();
  out.push({ name: 'open() abre y muestra heading', ok: d.shadowRoot.querySelector('.backdrop')?.getAttribute('data-open') === 'true' && d.shadowRoot.textContent.includes('Comparativa'), detail: '' });

  let closed = false;
  d.addEventListener('close', () => { closed = true; });
  d.close();
  out.push({ name: 'close() emite close y cierra', ok: closed && d.shadowRoot.querySelector('.backdrop')?.getAttribute('data-open') === 'false', detail: '' });

  d.remove();
  return out;
});
```

- [ ] **Step 2: Añadir la suite al runner**

En `web/test/index.html` añadir antes de `runAll()`:

```js
  import './modal-dialog.test.js';
```

- [ ] **Step 3: Verificar RED**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: FALLOS — el componente no existe.

- [ ] **Step 4: Implementar el componente**

Crear `web/js/components/ui/modal-dialog/modal-dialog.css.js`:

```js
import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.backdrop { position: fixed; inset: 0; z-index: 60; display: none;
  background: color-mix(in srgb, #000 42%, transparent); padding: var(--space-4);
  align-items: flex-start; justify-content: center; overflow: auto; }
.backdrop[data-open="true"] { display: flex; animation: fade .12s ease-out; }
.dialog { width: var(--dialog-w, min(620px, 100%)); margin: 6vh auto; background: var(--color-surface);
  border-radius: 20px; padding: var(--space-6); box-shadow: var(--shadow-lg); }
.head { display: flex; align-items: flex-start; gap: var(--space-4);
  border-bottom: 2px solid var(--color-divider); padding-bottom: var(--space-3); }
.head h2 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 24px; flex: 1; }
.x { min-height: 36px; padding: 0 14px; border: 1px solid var(--color-divider); background: var(--color-surface);
  border-radius: 999px; cursor: pointer; font-family: var(--font-body); font-size: 12.5px; color: var(--color-text); }
.body { padding-top: var(--space-4); }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
`;
```

Crear `web/js/components/ui/modal-dialog/modal-dialog.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './modal-dialog.css.js';
import { t } from '../../../i18n/index.js';

/**
 * Diálogo centrado con backdrop. open()/close(); emite `close`. Contenido por slot.
 * Cierra con el botón, click en el backdrop y la tecla Escape. Sin alert/confirm/prompt.
 * @fires close
 */
export class ModalDialog extends AppElement {
  static styles = [styles];
  #open = false;
  #heading = '';

  /** @param {string} v */
  set heading(v) { this.#heading = v; this._paint(); }
  get heading() { return this.#heading; }

  /** Abre el diálogo. */
  open() { this.#open = true; this._paint(); }

  /** Cierra el diálogo y emite `close`. */
  close() { this.#open = false; this._paint(); this.dispatchEvent(new CustomEvent('close')); }

  render() {
    const w = this.getAttribute('width');
    this.shadowRoot.innerHTML = `
      <div class="backdrop" data-open="${this.#open}"${w ? ` style="--dialog-w:${escapeHtml(w)}"` : ''}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(this.#heading)}">
          <div class="head">
            <h2>${escapeHtml(this.#heading)}</h2>
            <button class="x" id="x">${escapeHtml(t('common.cancel'))}</button>
          </div>
          <div class="body"><slot></slot></div>
        </div>
      </div>`;
  }

  afterRender() {
    const backdrop = this.$('.backdrop');
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(backdrop, 'click', (e) => { if (e.target === backdrop) this.close(); });
    this.on(window, 'keydown', (e) => { if (this.#open && e.key === 'Escape') this.close(); });
  }
}

customElements.define('modal-dialog', ModalDialog);
```

- [ ] **Step 5: Verificar GREEN**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE`; suite `ui/modal-dialog` con tres PASS.

- [ ] **Step 6: Commit**

```bash
git add web/js/components/ui/modal-dialog/ web/test/
git commit -m "feat(ui): primitivo modal-dialog (diálogo centrado)"
```

---

### Task 4: `finca-card` (tarjeta de rejilla)

**Files:**
- Create: `web/js/components/views/finca-view/finca-card.css.js`
- Create: `web/js/components/views/finca-view/finca-card.js`
- Test: verificación visual (componente con DOM; sin test unitario, por convención)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`, `estado-badge`, `finca-calc` (`coste`, `eur`, `eurK`), `storage` (`url`).
- Produces: `<finca-card>` con propiedades `finca` (objeto) e `invitados` (number) y `comparing` (bool). Emite `open` (detail: {id}) al pulsar "Ver ficha"/portada, y `togglecompare` (detail: {id}) al marcar el check de comparar. Muestra tipo, nombre, zona·km, portada (o placeholder), coste estimado + precioLabel, aforo + valoración, servicios (tags), badge de estado.

- [ ] **Step 1: Implementar el componente (sin test unitario)**

Crear `web/js/components/views/finca-view/finca-card.css.js` con estilos por token (tarjeta: borde, radio 18px, `var(--color-surface)`, sombra suave; portada 170px con `object-fit:cover`; panel de coste con `var(--color-accent-100)`; grid interno). Sin colores hardcodeados salvo sombras suaves derivadas de token.

Crear `web/js/components/views/finca-view/finca-card.js`:

```js
import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-card.css.js';
import { t } from '../../../i18n/index.js';
import { coste, eur, eurK } from './finca-calc.js';
import { storage } from '../../../core/storage-adapter.js';
import '../../ui/estado-badge/estado-badge.js';

/**
 * Tarjeta de una finca en la rejilla. Emite `open` y `togglecompare`.
 * @fires open
 * @fires togglecompare
 */
export class FincaCard extends AppElement {
  static styles = [styles];
  #finca = null;
  #invitados = 140;
  #comparing = false;

  /** @param {object} f */
  set finca(f) { this.#finca = f; this._paint(); }
  get finca() { return this.#finca; }
  /** @param {number} n */
  set invitados(n) { this.#invitados = n; this._paint(); }
  /** @param {boolean} v */
  set comparing(v) { this.#comparing = v; this._paint(); }

  render() {
    const f = this.#finca;
    if (!f) { this.shadowRoot.innerHTML = ''; return; }
    const fotos = f.fotos || [];
    const cover = fotos.length ? storage.url(fotos[0].url) : '';
    const precioLabel = f.alquiler
      ? `${eur(f.alquiler)} alquiler + ${f.menu} €/inv.`
      : `${f.menu} € por invitado`;
    this.shadowRoot.innerHTML = `
      <article class="card">
        <div class="top">
          <span class="tipo">${escapeHtml(f.tipo)}</span>
          <label class="cmp"><input type="checkbox" id="cmp"${this.#comparing ? ' checked' : ''}>${escapeHtml(t('finca.card.compare'))}</label>
        </div>
        <h3>${escapeHtml(f.nombre)}</h3>
        <div class="zona">${escapeHtml(`${f.zona} · ${f.km} km`)}</div>
        <div class="cover" id="cover">
          ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(f.nombre)}" loading="lazy">` : `<div class="ph">${escapeHtml(t('finca.detail.sinFotos'))}</div>`}
        </div>
        <div class="panel">
          <div><span class="lbl">${escapeHtml(t('finca.card.coste'))}</span><span class="val">${escapeHtml(eurK(coste(f, this.#invitados)))}</span><span class="sub">${escapeHtml(precioLabel)}</span></div>
          <div class="sep"><span class="lbl">${escapeHtml(t('finca.card.aforoVal'))}</span><span class="val">${escapeHtml(`${f.capSent} sent.`)}</span><span class="sub">${escapeHtml(`${f.valoracion.toString().replace('.', ',')} / 5 · ${f.capPie} de pie`)}</span></div>
        </div>
        <div class="servicios">${(f.servicios || []).map((s) => `<span class="tag tag-neutral">${escapeHtml(s)}</span>`).join('')}</div>
        <div class="foot">
          <estado-badge id="badge"></estado-badge>
          <button class="btn btn-ghost" id="ficha">${escapeHtml(t('finca.card.ficha'))}</button>
        </div>
      </article>`;
  }

  afterRender() {
    if (!this.#finca) return;
    const badge = this.$('#badge');
    if (badge) { badge.kind = 'finca'; badge.value = this.#finca.estado; }
    this.on(this.$('#ficha'), 'click', () => this.dispatchEvent(new CustomEvent('open', { detail: { id: this.#finca.id } })));
    this.on(this.$('#cover'), 'click', () => this.dispatchEvent(new CustomEvent('open', { detail: { id: this.#finca.id } })));
    this.on(this.$('#cmp'), 'change', () => this.dispatchEvent(new CustomEvent('togglecompare', { detail: { id: this.#finca.id } })));
  }
}

customElements.define('finca-card', FincaCard);
```

- [ ] **Step 2: Verificación visual**

Servir la app y confirmar que la tarjeta renderiza (esto se valida de verdad en Task 8 cuando la vista raíz las lista). Aquí basta con que el módulo cargue sin romper la suite:
Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE` (el import del componente no rompe nada; aún no se instancia en la app).

- [ ] **Step 3: Commit**

```bash
git add web/js/components/views/finca-view/finca-card.js web/js/components/views/finca-view/finca-card.css.js
git commit -m "feat(finca): finca-card (tarjeta de rejilla)"
```

---

### Task 5: `finca-table` (vista de tabla)

**Files:**
- Create: `web/js/components/views/finca-view/finca-table.css.js`
- Create: `web/js/components/views/finca-view/finca-table.js`

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`, `estado-badge`, `finca-calc` (`coste`, `eur`, `eurK`).
- Produces: `<finca-table>` con propiedades `fincas` (array ya filtrado/ordenado y decorado con `comparing`), `invitados`. Emite `open` (detail {id}) y `togglecompare` (detail {id}). Columnas: check, Finca (+tipo), Zona, Aforo, Precio, Coste estimado, Val., Estado, Ficha.

- [ ] **Step 1: Implementar el componente**

Crear `finca-table.css.js` (tabla con cabecera oscura, filas cebra, `overflow-x:auto`, `min-width:900px`, todo por token) y `finca-table.js` análogo a `finca-card` pero renderizando una `<table>`; un botón "Ficha" por fila y un checkbox de comparar por fila; usa `estado-badge` por fila. Emite los mismos eventos `open`/`togglecompare` con el id de la fila. Precio/coste con `eur`/`eurK`, valoración corta con coma.

- [ ] **Step 2: Verificar que la suite sigue verde**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE`.

- [ ] **Step 3: Commit**

```bash
git add web/js/components/views/finca-view/finca-table.js web/js/components/views/finca-view/finca-table.css.js
git commit -m "feat(finca): finca-table (vista de tabla)"
```

---

### Task 6: `finca-lightbox` (visor de fotos con teclado)

**Files:**
- Create: `web/js/components/views/finca-view/finca-lightbox.css.js`
- Create: `web/js/components/views/finca-view/finca-lightbox.js`

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`, `storage`.
- Produces: `<finca-lightbox>` con `fotos` (array {url,pie}) e `index` (number|null). `open(i)`, `close()`, `next()`, `prev()`. Navega con ←/→ y Escape (listeners globales via `this.on(window,...)`, activos solo cuando `index != null`). Emite `close`. Overlay a pantalla completa (fondo oscuro convencional permitido).

- [ ] **Step 1: Implementar el componente**

Crear `finca-lightbox.css.js` (overlay `position:fixed; inset:0; z-index:90; background:#2b231b;` — overlay convencional; imagen `object-fit:contain`; botones ←/→ y cerrar con texto claro) y `finca-lightbox.js`: guarda `#fotos`/`#index`; `render()` muestra la foto actual, el pie y el contador `i/total`; `afterRender()` cablea click en cerrar/←/→ y en el backdrop, y registra teclado con `this.on(window,'keydown', ...)` que solo actúa si `#index != null`. `open(i)` fija index y repinta; `close()` pone index=null, repinta y emite `close`.

- [ ] **Step 2: Verificar suite verde**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE`.

- [ ] **Step 3: Commit**

```bash
git add web/js/components/views/finca-view/finca-lightbox.js web/js/components/views/finca-view/finca-lightbox.css.js
git commit -m "feat(finca): finca-lightbox (visor de fotos con teclado)"
```

---

### Task 7: `finca-compare` (diálogo comparativo) y `finca-detail` (ficha)

**Files:**
- Create: `web/js/components/views/finca-view/finca-compare.css.js`
- Create: `web/js/components/views/finca-view/finca-compare.js`
- Create: `web/js/components/views/finca-view/finca-detail.css.js`
- Create: `web/js/components/views/finca-view/finca-detail.js`

**Interfaces:**
- `finca-compare`: consumes `AppElement`, `t`, `escapeHtml`, `css`, `finca-calc` (`filasComparador`), `modal-dialog`. Produces `<finca-compare>` con `fincas` (selección) e `invitados`; `open()`/`close()`; renderiza dentro de un `modal-dialog` una tabla con una columna por finca y las filas de `filasComparador`, resaltando `win`. Traduce `txt` si empieza por `finca.`.
- `finca-detail`: consumes `AppElement`, `t`, `escapeHtml`, `css`, `estado-badge`, `finca-calc` (`coste`, `eur`, `eurK`), `storage`, `finca-lightbox`. Produces `<finca-detail>` con `finca` e `invitados`; overlay a pantalla completa; galería (fotos → abre lightbox; tour 360 si existe; placeholders si no hay fotos), tabla de datos (specs), servicios y fechas (tags), textarea de notas. Emite: `back`, `notas` (detail {id, notas}), `estado` (detail {id, estado}) para Favorita/Descartar/Elegir. Barra de acciones fija abajo.

- [ ] **Step 1: Implementar `finca-compare`**

`finca-compare.js`: envuelve un `<modal-dialog heading=…>`; `set fincas`/`set invitados` repintan; `render()` compone la tabla (thead con nombres, tbody con `filasComparador`); celdas `win` con `tag tag-accent`; el `txt` que empiece por `finca.` se pasa por `t()`. `open()`/`close()` delegan en el `modal-dialog` interno y emite `close`.

- [ ] **Step 2: Implementar `finca-detail`**

`finca-detail.js` según el prototipo (líneas 943-1058): cabecera sticky con volver + nombre + badge; hero de portada; galería (con tour destacado y fotos que abren `finca-lightbox`; si no hay fotos, rejilla de placeholders con rótulos y el aviso `finca.detail.sinFotos`); columna de datos (`specs`: tipo, zona, km, aforo sentados, de pie, menú, alquiler, valoración) y columna de servicios + fechas + notas (textarea que emite `notas` en `change`); barra fija inferior con Favorita/Descartar/Elegir (emiten `estado`). Incluir un `<finca-lightbox>` interno cableado a las fotos.

- [ ] **Step 3: Verificar suite verde**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE` (los componentes cargan sin romper nada).

- [ ] **Step 4: Commit**

```bash
git add web/js/components/views/finca-view/finca-compare.js web/js/components/views/finca-view/finca-compare.css.js web/js/components/views/finca-view/finca-detail.js web/js/components/views/finca-view/finca-detail.css.js
git commit -m "feat(finca): finca-compare (diálogo) y finca-detail (ficha)"
```

---

### Task 8: `finca-view` raíz (orquesta todo) + alta

**Files:**
- Modify: `web/js/components/views/finca-view/finca-view.js` (reemplaza el placeholder)
- Modify: `web/js/components/views/finca-view/finca-view.css.js`
- Modify: `web/test/finca-view.test.js` (sustituye el test del placeholder)

**Interfaces:**
- Consumes: `AppElement`, `escapeHtml`, `css`, `t`, `fincasRepo`/`ensureSeeded`/`configRepo` de repos, `finca-calc`, y los subcomponentes (`finca-card`, `finca-table`, `finca-detail`, `finca-compare`, `modal-dialog`, `segmented-tabs`, `stat-card`, `empty-state`, `app-toast`).
- Produces: `<finca-view>` con `refresh()` público que puebla desde `fincasRepo`. Estado efímero: `q`, `tipo`, `estado`, `sort`, `view` (grid/table), `invitados`, `compare[]`, `detailId`. Persistencia de estado/notas/alta vía `fincasRepo.upsert`; `invitados` vía `configRepo`.

- [ ] **Step 1: Escribir el test (reemplaza el del placeholder) — falla primero**

Reemplazar `web/test/finca-view.test.js`:

```js
import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/finca-view/finca-view.js';

register('views/finca-view', () => {
  const out = [];
  reset();
  const el = document.createElement('finca-view');
  document.body.appendChild(el);
  el.refresh();

  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });
  out.push({ name: 'lista 9 tarjetas de finca', ok: el.$$('finca-card').length === 9, detail: String(el.$$('finca-card').length) });

  // Filtro por estado favorita (el seed trae 3 favoritas)
  el._setEstado('favorita');
  out.push({ name: 'filtra por estado favorita', ok: el.$$('finca-card').length === 3, detail: String(el.$$('finca-card').length) });

  el.remove(); reset();
  return out;
});
```

Nota: `_setEstado(valor)` es un método interno de la vista que fija el filtro de estado y repinta; exponerlo (privado por convención pero accesible para el test) o, si se prefiere no exponer internals, cambiar el test para disparar el `change` del `<select>` de estado. Elegir una y dejarla coherente.

- [ ] **Step 2: Verificar RED**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: FALLOS — `finca-view` sigue siendo el placeholder (no monta `finca-card`).

- [ ] **Step 3: Implementar `finca-view` raíz**

Reescribir `finca-view.js` reemplazando el placeholder. Estructura según el patrón (orden: `static styles` → `render()` compone getters → getters `_xTpl` → `afterRender()` wiring → `refresh()` → privados). Componer: banner de elegida (si hay), cabecera (título+subtítulo), stats (con `stat-card` o markup propio usando `calcularStats`), barra de filtros (search-field/inputs + selects de tipo/estado/orden + input invitados + `segmented-tabs` rejilla/tabla), y la lista (rejilla de `finca-card` o `finca-table`), empty-state si no hay resultados, barra de comparador (si hay selección) y footer. Overlays: `finca-detail` (si `detailId`), `finca-compare` (modal), `modal-dialog` de alta, `app-toast`.

Comportamiento (portado de `renderVals`/`decorate`/acciones del prototipo, ver spec §4):
- `refresh()`: `ensureSeeded()`, carga `this._fincas = fincasRepo.list()`, `this._invitados = configRepo.get().guestCount || 140`, y repinta.
- Filtro/orden con `finca-calc.filtrar/ordenar`; `tiposDe` para el select de tipo.
- Selección de comparador en `this._compare` (máx 4, `.slice(-4)`).
- Acciones de estado (favorita/descartada/elegida/candidata): `fincasRepo.upsert({...f, estado})`; al elegir, quitar `elegida` de cualquier otra (`upsert` de la anterior a `candidata`); recargar `this._fincas`; toast con la clave correspondiente.
- Editar notas: `fincasRepo.upsert({...f, notas})`.
- Alta: `modal-dialog` con el formulario (nombre, tipo, zona, aforo, menú, alquiler, km, senal); `saveDraft` → `fincasRepo.upsert({ nombre, tipo, zona, capSent, menu, alquiler, km, senal, estado:'candidata', servicios:[], fechas:[], notas:'', fotos:[] })`; recargar y toast.
- `invitados`: al cambiar el input, `configRepo.set({ guestCount })` y recomputar.
- Cablear los eventos de los subcomponentes: `open` → `this._detailId = id`; `togglecompare` → alternar en `_compare`; de `finca-detail`: `back`/`notas`/`estado`; de `finca-compare`: `close`.

Actualizar `finca-view.css.js` con el layout de la vista (grid de 3 columnas para la rejilla con los breakpoints del prototipo: 2 columnas <900px, 1 <620px; barra de filtros flexible; banner de elegida; stats con borde entre columnas). Solo tokens.

- [ ] **Step 4: Verificar GREEN**

Run: `bash <WORKSPACE>/run-tests.sh /Users/juangutierrezalvarez/Desktop/gestor-boda`
Expected: `RESULTADO: TODO VERDE`; suite `views/finca-view` con sus PASS (9 tarjetas, filtro favorita = 3).

- [ ] **Step 5: Verificación visual en el navegador**

Servir y capturar la vista Finca en claro y oscuro:
```
cd /Users/juangutierrezalvarez/Desktop/gestor-boda/web && python3 -m http.server 8261 >/dev/null 2>&1 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --window-size=1440,1000 --screenshot="/Users/juangutierrezalvarez/Desktop/gestor-boda-fase1-claro.png" "http://localhost:8261/#view-finca"
```
Confirmar que se ven las 9 fincas en rejilla, la portada de La Quinta de Jarama, stats y filtros. Matar el servidor. (El controlador revisará las capturas.)

- [ ] **Step 6: Commit**

```bash
git add web/js/components/views/finca-view/ web/test/finca-view.test.js
git commit -m "feat(finca): vista raíz que orquesta la vista Finca (lista, filtros, detalle, comparador, alta)"
```

---

### Task 9: README y capturas de la Fase 1

**Files:**
- Modify: `web/README.md` (nota de la vista Finca y la limitación de imágenes)

- [ ] **Step 1: Actualizar `web/README.md`**

Añadir una sección breve: la vista Finca está implementada (Fase 1); la subida de imágenes llega en la Fase 7 (por ahora solo placeholders en fincas sin fotos); las fincas con fotos usan las URLs remotas del seed.

- [ ] **Step 2: Capturas claro y oscuro**

Generar `gestor-boda-fase1-claro.png` y `gestor-boda-fase1-oscuro.png` en el Desktop (la oscura con el truco de copia temporal `__dark.html` con `data-theme="dark"`, borrándola después). Revisar fidelidad y borrar cualquier fichero temporal.

- [ ] **Step 3: Commit**

```bash
git add web/README.md
git commit -m "docs: nota de la vista Finca (Fase 1) en el README"
```

---

## Self-Review

**Cobertura del spec (sección → tarea):**
- §2 base (enum elegida, senal, i18n) → Task 1.
- §4 lógica de negocio → Task 2 (finca-calc puro, testeado).
- §3 modal-dialog → Task 3; subcomponentes → Tasks 4 (card), 5 (table), 6 (lightbox), 7 (compare+detail); vista raíz + alta → Task 8.
- §5 galería/lightbox/placeholders → Tasks 6 y 7 (detail); sin subida (decidido) → placeholders en card/detail.
- §6 persistencia vía repos → Task 8.
- §7 interacción/accesibilidad (Escape, sin alert) → modal-dialog (3), lightbox (6), detail (7), view (8).
- §8 tests → Task 2 (calc), Task 1 (paridad), Task 8 (view).
- §9 cableado → Task 8 (ya montada en index.html desde Fase 0).
- §10 criterios de aceptación → Tasks 1-8; verificación visual en Task 8/9.

**Escaneo de placeholders:** Tasks 5, 6, 7 describen los componentes en prosa densa en vez de código completo, porque son análogos estructurales de componentes ya dados con código completo (finca-card en Task 4, drawer/lightbox-patрón en Fase 0) y de markup literal del prototipo (líneas citadas). No son "TODO": cada uno nombra props, eventos, imports y el markup de referencia. El código con lógica no trivial (finca-calc, modal-dialog, finca-card, finca-view) va completo.

**Consistencia de tipos:** `coste(finca, invitados)`, `eur`, `eurK`, `filtrar`, `ordenar`, `tiposDe`, `calcularStats`, `filasComparador` idénticos entre finca-calc (Task 2), su test (Task 2) y los consumidores (Tasks 4-8). Eventos consistentes: `open`/`togglecompare` (card, table → view), `back`/`notas`/`estado` (detail → view), `close` (modal-dialog, compare, lightbox). Estados `candidata|favorita|elegida|descartada` en enums (Task 1), estado-badge (Task 1), calc y view. `configRepo.get().guestCount` / `configRepo.set({guestCount})` coherente con Fase 0. Persistencia siempre por `fincasRepo.upsert`.

Nota para el ejecutor: sustituir `<WORKSPACE>` por el directorio del plan que imprime `scripts/sdd-workspace` (donde vive `run-tests.sh`, recreado igual que en la Fase 0 si no existe).
