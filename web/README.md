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
- `js/components/ui/` — primitivos reutilizables (segmented-tabs, stat-card, estado-badge, search-field, empty-state, skeleton, drawer, toast, modal-dialog).
- `js/components/views/` — vistas. Cada vista es UN componente con getters de plantilla.
- `test/` — arnés y suites en navegador.

## Vistas

- **Finca** (Fase 1, implementada): elegir/comparar fincas. Rejilla o tabla, filtros
  (tipo/estado/búsqueda), 6 órdenes, 5 stats, comparador de hasta 4 fincas con el mejor
  valor por fila, ficha a pantalla completa con galería y visor de fotos (teclado), alta
  de finca y flujo de estados (candidata/favorita/elegida/descartada). Un solo componente
  `views/finca-view/finca-view.js` + su `finca-view.css.js`; la lógica pura (coste, filtro,
  orden, stats, comparador) vive en `finca-view/finca-calc.js`.
- **Invitados** (Fase 2, implementada): lista por lado y círculo. 7 stats (personas por
  lado, confirmados, etc.), vista de tarjetas agrupadas por círculo o listado, filtros
  (lado, círculo, confirmación, invitación, menú, búsqueda), ciclo de invitación, RSVP,
  asignación de mesa, acompañantes y alta de invitado. Un solo componente
  `views/invitados-view/invitados-view.js` + su `.css.js`; lógica pura en `invitados-calc.js`.
  Colores de lado/rsvp por tokens (`--lado-*`, `--rsvp-*`).
- **Proveedores** (Fase 3, implementada): quién falta y quién está contratado. Hero con
  donut de cobertura y medidor de gasto (comprometido / límite / señal / **saldo pendiente**),
  4 stats (contratados, comprometido, señales, categorías cubiertas), insights accionables,
  filtros (categoría, estado, búsqueda), chips de "categorías por cubrir", tarjetas con
  precio/señal y acciones (editar, eliminar con deshacer, contratar). Las contratadas tienen
  fondo verde suave y una **barra de señal pagada** (% del precio, cuánto falta). El **badge
  es un menú rápido** para cambiar de estado sin abrir el modal. Cada card lleva un
  **monograma** de su categoría. **Orden configurable** (categoría, precio, señal, nombre,
  estado) y **comparador por categoría** (tabla lado a lado con precio/señal/pendiente/
  contacto/notas y el más barato resaltado) cuando hay ≥2 proveedores. **Atajos**: `/` buscar,
  `N` alta, `Esc` cierra el menú. Un solo componente
  `views/proveedores-view/proveedores-view.js`; lógica pura en `proveedores-calc.js`;
  formato monetario compartido en `core/money.js`.
- **Presupuesto** (Fase 4, implementada): vista agregada (solo edita el límite; el resto
  se calcula de finca elegida/candidatas, proveedores e invitados). Tarjeta resumen con
  Total previsto, Margen disponible / Te pasas por, barra apilada (contratado / por
  confirmar / fuera de presupuesto) y señales pagadas; chips de insight accionables
  (margen o exceso, proveedores por confirmar → Proveedores, sin finca → Finca); y tres
  bloques (Finca y banquete, Proveedores por categoría, Pagos y ratios). Premium:
  contadores animados, barra animada y confeti al pasar a caber en el límite. Regla clave:
  el catering es banquete, nunca cuenta en proveedores. Un solo componente
  `views/presupuesto-view/presupuesto-view.js`; lógica pura en `presupuesto-calc.js`
  (reutiliza `coste` de finca-calc, `pax` de invitados-calc y `money`).
- Resto de vistas (Salón, Timing): próximas fases.

## Imágenes

Las fincas con fotos usan las URLs remotas del seed. La subida de imágenes propias
(fincas sin fotos muestran placeholders) llegará en una fase posterior con almacenamiento
en la nube (Supabase); en Fase 1 no hay subida.
