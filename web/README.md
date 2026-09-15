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
