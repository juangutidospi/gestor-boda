# Vista Proveedores (Fase 3) — Diseño

Reemplaza el placeholder de Proveedores por la vista completa del prototipo, como UN
componente con getters de plantilla (patrón consolidado en Fases 1-2).

- Fecha: 2026-09-19
- Repositorio: `gestor-boda` · Rama: `feat/vista-proveedores`
- Base: Fases 0-2 (en `main`)
- Estado: propuesto

---

## 1. Objetivo y alcance

Implementar la vista "Proveedores": stats de contratación/gasto, filtros, chips de
"categorías por cubrir", rejilla de tarjetas de proveedor con precio/señal y acciones
(editar, eliminar, contratar), y alta/edición en diálogo. Persistido vía
`proveedoresRepo`. Réplica exacta del prototipo.

**Entra:** toda la vista Proveedores. **No entra:** Salón, Presupuesto, Timing.

## 2. Arquitectura (patrón consolidado)

- UN componente: `components/views/proveedores-view/proveedores-view.js` + `.css.js`,
  con getters de plantilla (`_statsTpl`, `_filtrosTpl`, `_chipsTpl`, `_gridTpl`,
  `_cardTpl`, `_altaTpl`) y wiring en `afterRender()`.
- Lógica pura en `proveedores-view/proveedores-calc.js` (filtrar, ordenar por categoría,
  stats, datos de los chips) — sin DOM, testeable.
- Reutiliza primitivos: `modal-dialog` (alta/edición), `estado-badge` (estado del
  proveedor), `empty-state`, `app-toast`.

```
components/views/proveedores-view/
├── proveedores-view.js / .css.js
└── proveedores-calc.js
core/
└── money.js   nuevo: eur() y eurK() compartidos (extraídos para no duplicar)
```

## 3. Modelo de datos

Proveedor (ya en el seed de Fase 0): `{ id, nombre, categoria, estado, precio, senal,
contacto, telefono, notas }`. Estados: `contratado | presupuesto | contactado |
pendiente | descartado`. **Nuevo:** se añade `descartado` a `ENUMS.provEstado` (con su
clave i18n) y a la variante `prov` de `estado-badge`. Categorías: las 19 del seed
(`SEED.categorias`), expuestas por un helper del repo o del seed.

## 4. Lógica de negocio (portada del prototipo, exacta)

- **Filtro:** categoría (Todas + las 19), estado (Todos + los 5), y búsqueda en
  `nombre + categoria + notas + contacto`. La lista se **ordena por el orden de
  categorías** del seed.
- **Stats (4):** Contratados (`nContratados / total`), Comprometido (`eurK` de la suma
  de `precio` de los contratados), Señales pagadas (`eurK` de la suma de `senal` de
  todos), Categorías cubiertas (`nº categorías con algún contratado / 19`; nota = cuántas
  sin nadie).
- **Chips "categorías por cubrir":** por cada categoría, un chip con estado visual:
  **cubierta** (tiene contratado → verde + "✓"), **en marcha** (tiene algún proveedor no
  descartado → acento), **vacía** (nadie → contorno + "+"). Al pulsar, abre el alta con
  esa categoría preseleccionada.
- **Tarjeta:** eyebrow de categoría, nombre, línea de contacto (`contacto · telefono` o
  "Sin contacto anotado"), `estado-badge`, panel con Precio (`eur` o "Sin presupuesto")
  y Señal (`eur` o "—"), notas si las hay, y acciones: **Editar**, **Eliminar**,
  **Contratar** (alterna contratado↔presupuesto; muestra "Contratado ✓" si ya lo está).
- **Alta/Edición (`modal-dialog`):** nombre (obligatorio), categoría, estado, contacto,
  teléfono, precio (número), señal (número), notas. Guardar valida nombre; edición
  actualiza, alta crea. `precio`/`senal` se guardan como número (0 si vacío).
- **Eliminar:** con **deshacer** (toast con acción), como en Invitados.

## 5. Formato monetario compartido

Se extrae `eur(n)` y `eurK(n)` a `core/money.js` (misma implementación que hoy vive en
`finca-view/finca-calc.js`). `finca-calc.js` pasa a re-exportarlas desde `core/money.js`
(sin cambiar su API pública ni sus tests), y `proveedores-calc.js` las importa de ahí.
Evita duplicar la lógica de formateo.

## 6. Persistencia

Todo vía `proveedoresRepo` (`list/get/upsert/remove`), nunca store/localStorage directo.
Filtros y estado del diálogo son efímeros. Las categorías se leen del seed/repo.

## 7. Interacción y accesibilidad

- Sin `alert/confirm/prompt`; alta/edición en `modal-dialog` (cierra con botón/backdrop/
  Escape). Eliminar con deshacer.
- Buscador con preservación de foco (re-render parcial de stats/grid/chips, no de la
  barra de filtros), como en las vistas previas.
- Todo texto vía `t()`; `this.$()` en el shadow; escape de texto dinámico; colores por
  tokens; animaciones con `prefers-reduced-motion`.

## 8. Diseño premium (coherente con Finca/Invitados)

- Tarjetas sobre `surface` con borde/sombra suave y **hover** (elevación + halo fino),
  `estado-badge` para el estado, panel de precio/señal con `--color-accent-100`,
  `tabular-nums` en importes. Entrada escalonada de tarjetas al abrir/filtrar. No se
  fuerzan avatares (los proveedores no son personas); el color de acento por categoría
  se limita al eyebrow y a los chips.

## 9. Tests

- `proveedores-calc.test.js` (puro): filtrar (categoría/estado/texto), orden por
  categoría, stats (los 4 valores con el seed), y datos de chips (cubierta/en marcha/
  vacía). `core/money.test.js` o cobertura vía la suite existente de finca-calc (que ya
  prueba eur/eurK) — se mantiene verde tras la extracción.
- Paridad i18n con las claves nuevas + `enum.prov.descartado`.
- Se sustituye el placeholder de Proveedores; test de vista: `refresh()` puebla (14) y un
  filtro reduce la lista.

## 10. Cableado

`index.html`: `<section id="view-proveedores">` → `<proveedores-view class="view"
id="view-proveedores">`; `main.js` importa la vista; el router ya llama `refresh()`.

## 11. Criterios de aceptación

1. Lista los 14 proveedores del seed, ordenados por categoría, con estado, precio y señal.
2. Los 4 stats correctos (contratados, comprometido, señales, categorías cubiertas).
3. Filtros (categoría, estado, búsqueda) y chips de categorías funcionan; el chip abre el
   alta con la categoría preseleccionada.
4. Contratar alterna estado y persiste; Editar/Eliminar (con deshacer) persisten.
5. Alta/edición con validación de nombre; precio/señal numéricos.
6. Bilingüe ES/EN, tema claro/oscuro; importes con formato es-ES.
7. Tests verdes (calc + paridad i18n + money).
8. Fidelidad visual y coherencia premium con Finca/Invitados.

## 12. Decisiones / riesgos

- **`descartado`:** se añade al enum de proveedor y a `estado-badge` (variante `tag-neutral`).
- **`eur/eurK` compartidos:** extracción a `core/money.js`; `finca-calc` re-exporta para
  no romper nada.
- **Deshacer en eliminar:** se reutiliza el patrón de `app-toast` con acción de Invitados.
- No se replica el "wow pack" completo de Invitados aquí (hero donut, bulk, etc.); se
  mantiene una vista premium pero más sobria, acorde a la naturaleza de la vista. Si se
  quiere, se puede elevar después.
