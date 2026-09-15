# Gestor de bodas — Arquitectura base (Fase 0)

Diseño de la arquitectura inicial para migrar el prototipo `Fincas.dc.html` a una
aplicación real de Web Components vanilla, siguiendo el patrón de frontend del
usuario (sin build, Shadow DOM por componente, estilos por tokens, i18n ES/EN).

- Fecha: 2026-09-15
- Autor: Juan Gutiérrez Álvarez
- Repositorio: `gestor-boda`
- Estado: propuesto (pendiente de revisión)

---

## 1. Contexto y objetivo

El prototipo `Gestor de bodas finca/Fincas.dc.html` es una maqueta generada con un
builder visual propietario (framework `dc` en `support.js`, bindings `{{ }}`,
etiquetas `sc-if` / `sc-for`). Todo el estado y los datos de ejemplo viven en un
único objeto; no es código reutilizable tal cual.

El objetivo global es reconstruir ese prototipo como una app de Web Components
vanilla, **replicando exactamente** su aspecto y funcionalidad, organizada por
vistas. Esta Fase 0 monta únicamente la **arquitectura base compartida** por todas
las vistas; ninguna vista funcional se implementa aquí (salvo un esqueleto vacío
que valide el cableado del router).

Principios que se respetan (del patrón `Patron-Web-Components.html`):

- Sin build: se sirve vanilla JS con módulos ES nativos.
- Shadow DOM por componente; estilos encapsulados.
- Colores y espaciado solo con tokens `var(--…)` (soporta tema claro/oscuro).
- Markup en getters `_xTpl` puros; listeners y datos en `afterRender()`.
- i18n con paridad ES/EN verificada por test.
- Composición: las vistas reusan primitivos de `ui/`.

## 2. Alcance de la Fase 0

**Entra:**

- Estructura de carpetas `web/` completa.
- Capa `core/`: clase base `AppElement`, helper `css`, `base.css.js`,
  `escape-html.js`, `store.js` (localStorage), repositorios de datos por entidad y
  `StorageAdapter` para imágenes (implementación local).
- `css/tokens.css`: paleta del prototipo (tema claro beige/dorado) portada a
  tokens, más un tema oscuro y el sistema de espaciado / tipografía.
- Capa base de primitivos de UI (`base.css.js`) equivalente a las clases `.btn`,
  `.input`, `.field`, `.tag`, `.seg` del design-system del prototipo.
- i18n: `i18n/index.js`, `es.js`, `en.js` (solo claves del chrome y comunes).
- Chrome global en `index.html`: barra de navegación (Invitados · Finca · Salón ·
  Proveedores · Presupuesto · Timing), cabecera con título, toggle de idioma y
  toggle de tema. Router por hash.
- `main.js` que registra vistas, pinta el chrome y gestiona el router.
- Primitivos de UI transversales que la primera vista (Finca) necesitará y que se
  comparten: `segmented-tabs`, `stat-card`, `estado-badge`, `search-field`,
  `empty-state`, `skeleton`, `drawer`, `toast`.
- Arnés de tests en navegador (`web/test/index.html`) con dos suites: paridad i18n
  y temas ↔ tokens.
- Una vista placeholder (`finca-view` vacía) solo para validar router + refresh.

**No entra (fases siguientes):**

- La lógica y el markup real de las seis vistas.
- Integración con Supabase / Cloudflare (Fase 7).
- Autenticación / multiusuario.
- Persistencia de datos estructurados en backend.

## 3. Roadmap de fases (norte, fuera del alcance de este spec)

Cada fase es su propio ciclo spec → plan → implementación con revisión.

| Fase | Contenido |
|------|-----------|
| 0 | Arquitectura base (este documento) |
| 1 | Vista Finca (rejilla/tabla, filtros, comparador, detalle con galería, alta) |
| 2 | Vista Invitados (stats por lado, agrupado por círculo, alta/edición, acompañantes) |
| 3 | Vista Proveedores (lista por categoría, estados, alta/edición) |
| 4 | Vista Presupuesto (límite, partidas por categoría, pagado/pendiente, señales) |
| 5 | Vista Salón (plano de mesas arrastrable, asignación de invitados) |
| 6 | Vista Timing (cronograma del día) |
| 7 | Nube de imágenes: `SupabaseAdapter`, subida real, migración opcional de datos |

## 4. Arquitectura general — estructura de carpetas

```
web/
├── index.html                 chrome global (light DOM) + montaje de vistas
├── main.js                    registro de vistas, router por hash, pinta el chrome
├── css/
│   └── tokens.css             paleta + temas + espaciado + tipografía (enlazado en <head>)
├── js/
│   ├── core/
│   │   ├── AppElement.js       clase base (shadow, adopta estilos, i18n, on/$/$$)
│   │   ├── css.js              css`…` → CSSStyleSheet
│   │   ├── base.css.js         estilos compartidos (.card, .btn, .input, .tag, campos)
│   │   ├── escape-html.js      escapeHtml()
│   │   ├── store.js            estado en localStorage + eventos
│   │   ├── enums.js            valores de enum (estados, lados, categorías) → claves i18n
│   │   ├── repos.js            repositorios de datos por entidad (sobre store.js)
│   │   ├── seed.js             datos de ejemplo portados del prototipo
│   │   └── storage-adapter.js  interfaz de imágenes + LocalAdapter
│   ├── i18n/
│   │   ├── index.js            t(), setLang(), getLang()
│   │   ├── es.js
│   │   └── en.js
│   └── components/
│       ├── ui/
│       │   ├── segmented-tabs/
│       │   ├── stat-card/
│       │   ├── estado-badge/
│       │   ├── search-field/
│       │   ├── empty-state/
│       │   ├── skeleton/
│       │   ├── drawer/
│       │   └── toast/
│       └── views/
│           └── finca-view/     placeholder en Fase 0; se rellena en Fase 1
└── test/
    ├── index.html             corre las suites en el navegador
    ├── i18n-parity.test.js
    └── theme-tokens.test.js
```

Cada componente vive en su carpeta con `<name>.js` + `<name>.css.js`. El JS importa
sus estilos: `import { styles } from './<name>.css.js'`.

## 5. Capa core

### 5.1 `AppElement` (clase base)

Idéntica en responsabilidades a `DronElement` del proyecto de referencia:

- Constructor: crea shadow root abierto y adopta `[base, ...this.constructor.styles]`.
- `connectedCallback()`: `_paint()` + escucha `i18n:changed` para repintar.
- `disconnectedCallback()`: ejecuta y limpia todos los `_off` (auto-cleanup).
- `_paint()`: `render()` seguido de `afterRender()`.
- `render()` / `afterRender()`: los implementa cada componente.
- `on(target, event, fn, opts)`: listener con auto-eliminación al desconectar.
- `$(sel)` / `$$(sel)`: consultas dentro del shadow, nunca `document`.

### 5.2 `css.js`

Helper `css\`…\`` que devuelve un `CSSStyleSheet` con `replaceSync`, adoptable por
el shadow root. Igual al de referencia.

### 5.3 `base.css.js`

Hoja compartida adoptada por todos los componentes. Recrea, con los tokens del
prototipo, las clases del design-system que el prototipo tomaba del bundle `_ds`
propietario (que no se reutiliza):

- `.card`, `.page-head`, `.grid`, `.muted`.
- Botones: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` (radio 999px,
  como el prototipo).
- Campos: `input`, `select`, `textarea`, `.field` con su `label`, `.input`
  (radio 12px), buscadores `input[type="search"]`.
- Etiquetas de estado: `.tag`, `.tag-accent`, `.tag-outline`, `.tag-neutral`.
- Segmentos: `.seg`, `.seg-opt` (radio 999px).

Regla de oro: colores y espaciado siempre por token; nada hardcodeado, para que el
tema oscuro funcione sin tocar componentes.

### 5.4 `store.js`

Estado en un único objeto de `localStorage`, plano y con claves por entidad. API
igual a la de referencia, adaptada a las entidades de la boda:

```js
const EMPTY = { fincas: {}, invitados: {}, proveedores: {}, mesas: {},
  presupuesto: {}, config: {}, ui: {} };
```

- `getGroup(group)`, `get(group, id, fallback)`, `set(group, id, value)`,
  `toggle(group, id, initial)`, `reset()`.
- Cada `set` emite `store:changed` con `{ group, id, value }` para que las vistas
  puedan refrescarse.
- Si `localStorage` falla, la app sigue en memoria (try/catch).

Nota: en la Fase 0 el store guarda mapas por id. Las colecciones (listas) se
exponen a través de `repos.js`, no directamente.

### 5.5 `repos.js` (repositorios por entidad)

Capa de acceso a datos que las vistas usan en lugar de tocar `store.js` o
`localStorage`. Un repositorio por entidad, con API homogénea:

```js
fincasRepo.list()            // → Finca[]
fincasRepo.get(id)           // → Finca | undefined
fincasRepo.upsert(finca)     // crea o actualiza, devuelve la entidad
fincasRepo.remove(id)
```

Repositorios: `fincasRepo`, `invitadosRepo`, `proveedoresRepo`, `mesasRepo`,
`presupuestoRepo` (límite + partidas), `configRepo` (guestCount, defaultView,
theme, lang). En el primer arranque, si el store está vacío, se siembra con
`seed.js`. Este seam es lo que permite cambiar a Supabase en la Fase 7 sin tocar
vistas: solo se reimplementan los repos.

### 5.6 `seed.js`

Datos de ejemplo portados literalmente del prototipo (8+1 fincas, 15 invitados, 14
proveedores, 4 mesas, 19 categorías de proveedor, límite 45000, guestCount 140).
Se cargan solo una vez, cuando el store está vacío.

### 5.7 `storage-adapter.js` (imágenes)

Interfaz mínima para imágenes de fincas, con una implementación local en Fase 0:

```js
interface StorageAdapter {
  put(file: File, key: string): Promise<string>  // devuelve una URL usable en <img src>
  url(key: string): string                        // URL pública/servible por key
  remove(key: string): Promise<void>
}
```

- `LocalAdapter`: usa `URL.createObjectURL` para subidas de sesión y sirve las URLs
  ya presentes en los datos sembrados (las fotos del prototipo son URLs remotas de
  bodas.net, que se conservan tal cual). No persiste binarios en localStorage.
- La interfaz queda lista para un `SupabaseAdapter` en la Fase 7 sin cambiar las
  vistas.

## 6. Modelo de datos (entidades, portado del prototipo)

Se documenta aquí como referencia para todas las fases; en la Fase 0 solo se
implementan las estructuras y el seed, no la UI.

- **Finca**: `{ id, nombre, tipo, zona, km, capSent, capPie, menu, alquiler,
  valoracion, estado: 'favorita'|'candidata'|'descartada', servicios: string[],
  fechas: string[], notas, motivo, fotos: {url,pie}[], tour?: {poster,url,label} }`.
  Coste calculado = `alquiler + menu * nºInvitados`.
- **Invitado**: `{ id, nombre, lado: 'novia'|'novio', grupo (círculo), rsvp:
  'confirmado'|'pendiente'|'no', plus (nº acompañantes), nota, invitacion: 'sin
  enviar'|'enviada'|'recordatorio'|'respondida', menu, acompanantes: string[],
  mesa?: id }`.
- **Proveedor**: `{ id, nombre, categoria, estado:
  'contratado'|'presupuesto'|'contactado'|'pendiente', precio, senal, contacto,
  telefono, notas }`.
- **Mesa**: `{ id, nombre, capacidad, forma: 'redonda'|'rectangular', x, y }`.
- **Presupuesto**: `{ limite, partidas: {categoria, concepto, coste, pagado,
  senal}[] }` (las señales pueden derivar de proveedores/finca).
- **Config**: `{ guestCount: 140, defaultView, theme, lang }`.

Los valores de enum (estados, lados, invitación, categorías) viven en `enums.js` y
cada uno tiene su clave en `es.js` y `en.js`; el test de paridad verifica cobertura.

## 7. Tokens y temas

`css/tokens.css` se enlaza en el `<head>` de `index.html` y se hereda al shadow DOM.

- **Tema claro (por defecto) = paleta exacta del prototipo:** `--color-bg #f7f2ea`,
  `--color-surface #fffdf9`, `--color-text #3d3227`, `--color-divider #e6dccd`,
  `--color-accent #b08256`, `--color-accent-700 #8a6239`, escalas
  `--color-accent-100/200/300`, `--color-neutral-100/200/600/700/900`,
  `--radius-md 16px`, fuentes `--font-heading` (Cormorant Garamond) y `--font-body`
  (Jost). Se cargan las Google Fonts igual que el prototipo.
- **Espaciado:** se define la escala `--space-2..--space-8` que el prototipo tomaba
  del bundle `_ds` (no reutilizado), con los mismos valores efectivos.
- **Tema oscuro** (`[data-theme="dark"]`): variante derivada de la misma paleta
  (fondos oscuros cálidos, acento dorado más luminoso), redefiniendo solo los
  cuatro roles + divisor; sombras y derivados se recalculan con `color-mix`.
- **Tokens semánticos derivados** (`--color-text-muted`, sombras) se calculan con
  `color-mix` a partir de texto/acento, para no repetirlos por tema.
- El toggle de tema fija `document.documentElement.dataset.theme` y lo recuerda en
  localStorage; el arranque respeta lo guardado.

El test de temas verifica que ningún componente use color hardcodeado fuera de los
tokens declarados (se apoya en la lista de tokens de `tokens.css`).

## 8. i18n

- `i18n/index.js`: `t(key, vars)`, `setLang(next)`, `getLang()`. `setLang` cambia
  `document.documentElement.lang` y emite `i18n:changed`.
- `es.js` / `en.js`: diccionarios planos clave→texto. En Fase 0 cubren el chrome
  (nav, cabecera, toggles), textos comunes de primitivos (vacío, cargando, cancelar,
  guardar) y los valores de enum del modelo.
- El toggle de idioma del chrome alterna ES/EN y persiste la elección.
- Todo texto del chrome se declara con `data-i18n` (sin literales a mano).

## 9. Chrome global y router

`index.html` mantiene el chrome en light DOM (no es un componente):

- Barra superior de navegación con la marca "Nuestra boda" y los seis enlaces de
  vista, más los botones de idioma y tema (replica la `nav` del prototipo).
- Contenedor `main` con las vistas como custom elements `<x-view class="view">`.
- `main.js`:
  - Registra las vistas (import de cada `views/<x>/<x>.js`).
  - `NAV`: lista de `{ id, key, sub }` para pintar el nav y el título.
  - Router por hash: `setActiveView(id)` alterna `.active`, llama `refresh?.()` de la
    vista y actualiza el hash; escucha `hashchange`.
  - Pinta el chrome traducido (`data-i18n`), reacciona a `i18n:changed` y a
    `theme:changed`.

En la Fase 0 solo `finca-view` existe (placeholder); el resto de entradas del nav
apuntan a vistas que se añaden en sus fases. El nav mostrará los seis enlaces, pero
solo Finca navega a contenido; el resto navega a un placeholder "próximamente"
hasta su fase (los enlaces del nav siguen activos y clicables).

## 10. Primitivos de UI (Fase 0)

Se construyen los que Finca (Fase 1) necesitará y que serán compartidos:

- `segmented-tabs`: barra de pestañas; emite `change` con `{ value }`.
- `stat-card`: tarjeta de dato (rótulo, valor, nota). Usada en stats de varias vistas.
- `estado-badge`: etiqueta de estado con variante por token (favorita/candidata/…,
  contratado/presupuesto/…). Mapea estado → clase → clave i18n.
- `search-field`: campo de búsqueda con `input` debounced; emite `search`.
- `empty-state`: estado vacío con icono, título y descripción.
- `skeleton`: bloque de carga.
- `drawer`: panel lateral para altas/edición (el prototipo usa `drawerIn`); abre/
  cierra, atrapa foco, emite `close`. No usa `alert/confirm/prompt`.
- `toast`: aviso breve no bloqueante.

Cada uno con JSDoc, estilos por token y su clave i18n donde muestre texto propio.

## 11. Tests

Arnés en navegador `web/test/index.html` que carga y ejecuta las suites (sin build,
como el proyecto de referencia):

- `i18n-parity.test.js`: toda clave de `es.js` existe en `en.js` y viceversa;
  ninguna traducción vacía; todo valor de enum tiene clave; ninguna traducción es
  literalmente una clave.
- `theme-tokens.test.js`: los tokens exigidos existen en ambos temas; el tema
  oscuro redefine los roles necesarios; heurística de "sin color hardcodeado".

Tras cada cambio, las suites deben quedar verdes. Los componentes con DOM no se
testean unitariamente (convención del patrón); si hiciera falta, E2E aparte.

## 12. Estrategia sin build

- Módulos ES nativos servidos por un servidor estático (p. ej.
  `python3 -m http.server` o `npx serve` sobre `web/`). No hay transpilación ni
  bundler.
- Las Google Fonts se cargan por `<link>` como en el prototipo.
- La app abre en `index.html`; los tests en `test/index.html`.

## 13. Criterios de aceptación (Fase 0)

1. `web/` se sirve estáticamente y `index.html` carga sin errores de consola.
2. El chrome muestra el nav de seis vistas, el título y los toggles de idioma y tema.
3. El toggle de tema alterna claro/oscuro y persiste; el de idioma alterna ES/EN y
   persiste; ambos repintan sin recargar.
4. El router navega por hash a `finca-view` (placeholder) y llama a su `refresh()`.
5. `repos.js` siembra los datos del prototipo en el primer arranque y los expone;
   `store.js` persiste en localStorage.
6. Existen y funcionan los ocho primitivos de UI, con estilos por token en ambos
   temas.
7. Las dos suites de test pasan en `test/index.html`.
8. Ningún componente usa `document` para consultar su DOM ni colores hardcodeados.
9. Fidelidad visual del chrome respecto al prototipo (fuentes, paleta, formas).

## 14. Decisiones abiertas / riesgos

- **Fuentes**: se cargan de Google Fonts como el prototipo (requiere red). Si se
  quiere offline total, se pospone a una mejora posterior (self-host).
- **Tema oscuro**: el prototipo es solo claro; el tema oscuro es una extensión del
  patrón. Se deriva de la paleta cálida; su ajuste fino puede refinarse al ver las
  vistas reales.
- **Fotos remotas**: el seed conserva las URLs de bodas.net del prototipo; si dejan
  de estar disponibles, se sustituyen por las de `uploads/` o por Supabase (Fase 7).
- **Enlaces de nav no implementados**: en Fase 0 las cinco vistas no-Finca muestran
  un placeholder "próximamente"; se sustituyen por su vista en cada fase.
