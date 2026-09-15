# Vista Finca (Fase 1) — Diseño

Reemplaza el placeholder `finca-view` por la vista Finca completa, replicando
exactamente el prototipo `Fincas.dc.html`, sobre la arquitectura base de la Fase 0.

- Fecha: 2026-09-15
- Repositorio: `gestor-boda` · Rama: `feat/vista-finca`
- Base: Fase 0 (mergeada en `main`)
- Estado: propuesto

---

## 1. Objetivo y alcance

Implementar la vista "Elegir la finca" tal como en el prototipo: lista en rejilla o
tabla con filtros/orden, stats, comparador, ficha de detalle con galería y lightbox,
alta de finca, edición de notas y flujo de estados (candidata → favorita → elegida /
descartada). Todo con Web Components vanilla sobre la infraestructura de la Fase 0
(`AppElement`, `repos`, tokens, i18n, primitivos, drawer/toast).

**Entra:** toda la vista Finca y su interacción, persistida vía `fincasRepo`.
**No entra:** las otras cinco vistas (fases 2-6); subida de imágenes a la nube
(Fase 7 — en Fase 1 la subida es local/sesión con el `StorageAdapter`).

## 2. Cambios en la capa base (mínimos, compartidos)

- **Enum de estado de finca:** añadir `elegida` a `ENUMS.fincaEstado` y a `es.js`/`en.js`
  (`enum.finca.elegida` = "Elegida" / "Chosen"). El prototipo usa cuatro estados:
  candidata, favorita, elegida, descartada. `estado-badge` mapea `elegida` a la
  variante `tag-accent` (como favorita).
- **i18n:** añadir todas las claves de la vista Finca a `es.js` y `en.js` (paridad).
- **Config:** la vista usa `configRepo.get().guestCount` (por defecto 140) como número
  de invitados inicial para el cálculo de coste; un control local permite ajustarlo y
  lo persiste en `configRepo` (fuente de verdad, como en el chrome).
- **Campo opcional en finca:** `notas` ya existe en el seed; se persistirá su edición.
  El estado `elegida` puede fijarse en cualquier finca (solo una a la vez).
- **Campo `senal`:** se añade un campo opcional `senal` (número, €) al modelo de finca y
  al formulario de alta; el banner de "finca elegida" muestra la señal pendiente desde
  `finca.senal` (o "—" si no se ha fijado). El seed no lo trae, así que por defecto es 0/—.

## 3. Estructura de componentes

La vista es grande; se descompone en subcomponentes con una responsabilidad clara.
Los reutilizables entre ≥2 vistas van a `ui/`; los específicos de Finca viven bajo
`components/views/finca-view/`.

```
components/views/finca-view/
├── finca-view.js / .css.js        vista raíz: estado, filtros, orquesta subcomponentes
├── finca-card.js / .css.js        tarjeta de rejilla (una finca)
├── finca-table.js / .css.js       tabla de fincas
├── finca-detail.js / .css.js      ficha a pantalla completa (galería, datos, acciones)
├── finca-compare.js / .css.js     diálogo comparativo
└── finca-lightbox.js / .css.js    visor de fotos con teclado

components/ui/  (nuevos reutilizables)
├── modal-dialog/                  diálogo centrado con backdrop (compare/alta) — genérico
└── (se reutilizan) segmented-tabs, stat-card, estado-badge, search-field,
    empty-state, skeleton, drawer, toast
```

Nota: el prototipo usa un `dialog-backdrop` centrado para "Comparar" y "Añadir finca",
y un `drawer` no. Para el alta se usará el primitivo `app-drawer` de la Fase 0 (panel
lateral) o el nuevo `modal-dialog` centrado; se elige **`modal-dialog` centrado** para
fidelidad con el prototipo (el alta y el comparador son diálogos centrados, no drawers).
`app-drawer` queda disponible para vistas futuras.

## 4. Lógica de negocio (portada del prototipo, exacta)

Se centraliza en helpers puros dentro de `finca-view.js` (o un `finca-calc.js` si crece):

- `coste(finca, invitados) = (alquiler || 0) + (menu || 0) * invitados`.
- `eur(n) = Math.round(n).toLocaleString('es-ES') + ' €'`.
- `eurK(n) = n >= 10000 ? (redondeo a 0,1k) + 'k €' : eur(n)`.
- **Filtro:** por `tipo` (Todos + tipos presentes), `estado` (Todos/candidata/favorita/
  elegida/descartada) y búsqueda en `nombre + zona + notas` (case-insensitive).
- **Orden:** `valoracion` (desc), `coste-asc`, `coste-desc`, `aforo` (capSent desc),
  `km` (asc), `nombre` (localeCompare 'es').
- **Stats (5):** En seguimiento (no descartadas / total), Favoritas, Coste medio,
  Rango (min–max), Descartadas. Coste medio/rango calculados sobre las no descartadas
  con el nº de invitados actual.
- **Comparador:** hasta 4 fincas seleccionadas (`.slice(-4)`); filas con mejor valor
  resaltado. Filas: Coste estimado (min), Menú/invitado (min), Alquiler (min,
  "Incluido" si 0), y las demás del prototipo (aforo max, valoración max, km min…).
- **Estados y acciones de la ficha:** marcar Favorita, Descartar, Elegir (fija
  `elegida`, desmarca cualquier otra elegida). El banner superior "Finca elegida"
  aparece si hay una, con señal pendiente y coste; botón "Volver a candidata".
- **Coverlabels:** `zonaLinea = zona · km km`, `precioLabel` (alquiler+menú o €/invitado),
  `aforoLabel`, `valoracionLabel` (coma decimal, "/5 · N de pie").

## 5. Galería, imágenes y lightbox

- Fincas **con fotos** (seed de La Quinta de Jarama): portada = primera foto; galería en
  rejilla; click en foto abre `finca-lightbox` (navegación ←/→ y Escape por teclado,
  contador "i/total", pie). Si hay `tour`, tarjeta destacada que enlaza a `tour.url`
  (nueva pestaña, `rel="noopener"`).
- Fincas **sin fotos:** se muestran huecos/placeholder (rejilla de huecos como el
  prototipo, con rótulos "Portada"/"Foto N"). La subida real de imágenes se DIFIERE a la
  Fase 7 (Supabase); en Fase 1 no hay control de subida, solo los placeholders. El
  `StorageAdapter` se usa únicamente para `url()` (passthrough de las URLs remotas del seed).
- Las URLs remotas del seed se sirven vía `storage.url()` (passthrough de http).
- Imágenes con `loading="lazy"`, `object-fit: cover`, `max-width:100%`.

## 6. Persistencia

Todo cambio pasa por `fincasRepo.upsert(finca)` (nunca `store`/`localStorage` directo):

- Cambiar estado (favorita/descartada/elegida/candidata) → `upsert` de la finca.
- Editar notas de la ficha → `upsert`.
- Alta de finca → `fincasRepo.upsert(nueva)` (estado inicial `candidata`, id string).
- Selección de comparador y filtros → estado efímero de la vista (no se persiste), salvo
  `guestCount` que va a `configRepo`.

## 7. Interacción y accesibilidad

- Sin `alert/confirm/prompt`. Diálogos con backdrop propio; cierran con botón, click en
  backdrop y tecla Escape; foco atrapado dentro del diálogo/ficha.
- La ficha de detalle y el lightbox son overlays a pantalla completa (`position:fixed`),
  con scroll propio y barra de acciones fija abajo.
- Toasts no bloqueantes con `app-toast` (o el patrón toast del prototipo) para avisos
  ("pasa a favoritas", etc.).
- Todo texto vía `t()`; consultas del shadow con `this.$()`.

## 8. Tests

Los componentes con DOM no se testean unitariamente (convención); sí lo puro/transversal:

- `finca-calc.test.js`: `coste`, `eur`, `eurK`, filtro, orden, stats y filas del
  comparador (mejor valor) con datos del seed — lógica pura, sin DOM.
- Paridad i18n (ampliada con las claves nuevas) y enum `elegida` cubierto.
- La suite existente debe seguir verde; se retira el test del placeholder de `finca-view`
  y se sustituye por el/los de la vista real (al menos que `refresh()` puebla y filtra).

## 9. Cableado

- `finca-view` sigue montada en `index.html` como `#view-finca`; el router ya llama a su
  `refresh()`. Se elimina el marcado placeholder y se importa la vista real en `main.js`
  (ya importada). Los subcomponentes se importan desde `finca-view.js`.
- El control de "invitados" de la vista inicializa desde `configRepo.get().guestCount`.

## 10. Criterios de aceptación

1. La vista lista las 9 fincas del seed en rejilla y tabla, con portada/coste/aforo/
   valoración/servicios/estado correctos.
2. Filtros (tipo, estado, búsqueda) y los 6 órdenes funcionan como el prototipo.
3. Las 5 stats muestran los valores correctos y reaccionan al nº de invitados.
4. El comparador selecciona hasta 4, muestra la barra inferior y el diálogo con el mejor
   valor por fila resaltado.
5. La ficha abre a pantalla completa con galería; el lightbox navega con ←/→ y Escape;
   el tour 360 enlaza fuera. Editar notas persiste.
6. Marcar Favorita/Descartar/Elegir persiste vía `fincasRepo` y actualiza la lista, el
   badge y el banner de "elegida"; solo una finca elegida a la vez.
7. Alta de finca crea una candidata persistida y visible.
8. Tema claro/oscuro e idioma ES/EN correctos en toda la vista.
9. Tests verdes (incluida la lógica pura nueva y la paridad i18n con `elegida`).
10. Fidelidad visual con el prototipo (rejilla de 3 columnas, tarjetas, ficha, diálogos).

## 11. Decisiones tomadas / riesgos

- **Subida de imágenes (DECIDIDO):** en Fase 1 solo placeholders en fincas sin fotos; la
  subida real se difiere a la Fase 7 (Supabase). Sin control de subida en la UI.
- **Señal de la finca elegida (DECIDIDO):** se añade un campo opcional `senal` al modelo
  de finca y al alta; el banner lo muestra (o "—" si no está fijado).
- **`modal-dialog` vs `app-drawer` para el alta:** se opta por diálogo centrado por
  fidelidad con el prototipo; el drawer lateral queda disponible para vistas futuras.
