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
- Resto de vistas (Invitados, Salón, Proveedores, Presupuesto, Timing): próximas fases.

## Imágenes

Las fincas con fotos usan las URLs remotas del seed. La subida de imágenes propias
(fincas sin fotos muestran placeholders) llegará en una fase posterior con almacenamiento
en la nube (Supabase); en Fase 1 no hay subida.
