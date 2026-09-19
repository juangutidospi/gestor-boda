# Vista Invitados (Fase 2) — Diseño

Reemplaza el placeholder de Invitados por la vista completa del prototipo, sobre la
arquitectura de la Fase 0 y siguiendo el patrón consolidado en la Fase 1
(una vista = UN componente con getters de plantilla).

- Fecha: 2026-09-16
- Repositorio: `gestor-boda` · Rama: `feat/vista-invitados`
- Base: Fase 0 + Fase 1 (en `main`)
- Estado: propuesto

---

## 1. Objetivo y alcance

Implementar la vista "Invitados": stats por lado, lista agrupada por círculo (tarjetas)
o en tabla (listado), filtros, ciclo de invitación, confirmación (RSVP), asignación de
mesa, acompañantes y alta de invitado. Persistido vía `invitadosRepo`. Replica exacta
del prototipo.

**Entra:** toda la vista Invitados y su interacción.
**No entra:** el resto de vistas (Salón/Proveedores/Presupuesto/Timing).

## 2. Arquitectura (patrón consolidado)

- La vista es **UN componente**: `components/views/invitados-view/invitados-view.js` +
  `invitados-view.css.js`, con getters de plantilla para cada bloque (stats, filtros,
  tarjetas agrupadas, tabla, alta) y wiring en `afterRender()`.
- Lógica pura en `invitados-view/invitados-calc.js` (filtrar, agrupar, stats, parseAcomp,
  ciclo de invitación) — sin DOM, testeable en aislamiento.
- Reutiliza primitivos existentes: `modal-dialog` (alta), `segmented-tabs` o `.seg`
  (toggle tarjetas/listado), `empty-state`, `app-toast`. No se crean componentes por bloque.

```
components/views/invitados-view/
├── invitados-view.js / .css.js   la vista (getters de plantilla + wiring)
└── invitados-calc.js             lógica pura (filtro, grupos, stats, parseAcomp, ciclo inv.)
```

## 3. Modelo de datos

El invitado ya existe en el seed (Fase 0): `{ id, nombre, lado: 'novia'|'novio',
grupo (círculo), rsvp: 'confirmado'|'pendiente'|'no', plus (nº acompañantes), nota,
invitacion: 'sin enviar'|'enviada'|'recordatorio'|'respondida', menu, acompanantes:
string[], mesa?: id }`. No hacen falta cambios de modelo. `plus` se deriva de
`acompanantes.length` al crear/editar.

## 4. Lógica de negocio (portada del prototipo, exacta)

- **Filtro:** lado (Todos/novio/novia), círculo (Todos + círculos presentes), confirmación
  (Todos/confirmado/pendiente/no), invitación (Todas/sin enviar/enviada/recordatorio/
  respondida), menú (Todos/especiales/menú concreto), y búsqueda en `nombre + nota + grupo`.
- **Personas (pax):** cada invitación cuenta `1 + plus`. `head` = suma de pax; `conf` = pax
  confirmados; `ladoCount(lado)` = pax por lado.
- **Stats (7):** Total con acompañantes (head; nota = nº invitaciones), Confirmados (pax
  confirmados; nota = pendientes), Sin responder (invitación ≠ respondida; nota = con
  recordatorio), Menús especiales (menú ≠ Estándar), Del novio (pax), De la novia (pax),
  Aforo elegido (capSent de la finca elegida, o "—"; lee `fincasRepo`).
- **Agrupación por círculo (tarjetas):** por cada círculo con invitados, un bloque con
  título, subtotal "N invitaciones · M personas · K confirmadas" y sus tarjetas.
- **Ciclo de invitación:** botón que avanza `sin enviar → enviada → recordatorio →
  respondida → (reabre a sin enviar)`; la etiqueta de acción cambia según el estado.
- **RSVP:** por tarjeta (Sí/Pendiente/No) y por fila (select). El fondo de la tarjeta se
  tiñe según rsvp (confirmado/no/pendiente).
- **Mesa:** desplegable por invitado con las mesas de `mesasRepo` (o "Sin asignar").
- **Acompañantes:** textarea "un nombre por línea" → `parseAcomp` (líneas no vacías) →
  `acompanantes[]` y `plus = length`.
- **Alta:** nombre (obligatorio; si vacío, toast), lado (novio/novia), círculo, menú,
  invitación, rsvp, acompañantes, nota → `invitadosRepo.upsert({ estado inicial })`.

## 5. Tokens de lado y RSVP

El prototipo usa colores fijos para el lado (novia/novio) y tintes de tarjeta por RSVP.
Para respetar "colores solo con tokens", se añaden a `tokens.css` (tema claro con los
valores del prototipo + variante oscura):

- `--lado-novia`, `--lado-novia-bg`, `--lado-novia-ink`; `--lado-novio`, `--lado-novio-bg`,
  `--lado-novio-ink` (prototipo: novio `#9db4c8`/`#e8eff5`/`#3f5a73`, novia `#e0b3b9`/
  `#f9ecee`/`#8a4f58`).
- `--rsvp-si-bg`/`--rsvp-si-line` (verde suave `#eef4ec`/`#cbdcc5`), `--rsvp-no-bg`/
  `--rsvp-no-line` (`#f2eeea`/`#ded4c8`); pendiente usa surface/divider.

Los enums de lado/invitación/rsvp ya tienen claves i18n (Fase 0). Se añaden las claves de
texto de la vista (stats, filtros, alta, etc.) en `es.js`/`en.js` con paridad.

## 6. Persistencia

Todo vía `invitadosRepo` (nunca store/localStorage directo): alta, quitar, cambio de rsvp,
invitación, menú y mesa → `upsert`/`remove`. Lee `mesasRepo` (opciones de mesa) y
`fincasRepo` (finca elegida para el stat de aforo). Filtros y vista (tarjetas/listado) son
estado efímero.

## 7. Interacción y accesibilidad

- Sin `alert/confirm/prompt`; el alta usa `modal-dialog` (cierra con botón/backdrop/Escape).
- Buscador con preservación de foco: al teclear se re-renderiza solo la lista/stats, no toda
  la vista (mismo patrón que Finca).
- Todo texto vía `t()`; consultas del shadow con `this.$()`; escape de texto dinámico.

## 8. Tests

- `invitados-calc.test.js` (lógica pura): filtrar (por cada filtro), pax (1+plus), stats
  (los 7 valores con datos del seed), agrupación por círculo con subtotales, parseAcomp,
  y el ciclo de invitación (siguiente estado). Sin DOM.
- Paridad i18n ampliada con las claves nuevas; la suite entera debe seguir verde.
- Se sustituye el placeholder de Invitados por la vista real; un test de vista comprueba
  que `refresh()` puebla y que un filtro reduce la lista.

## 9. Cableado

- `index.html`: `<section id="view-invitados">` se sustituye por
  `<invitados-view class="view" id="view-invitados">`; `main.js` importa
  `invitados-view.js` y el router ya llama a su `refresh()`. Se quita el placeholder
  "próximamente" para esta vista.

## 10. Criterios de aceptación

1. Lista los 15 invitados del seed, agrupados por círculo (tarjetas) y en tabla (listado).
2. Los 7 stats muestran los valores correctos (pax por lado, confirmados, etc.).
3. Los 6 filtros y la búsqueda funcionan como el prototipo.
4. El ciclo de invitación avanza y persiste; el RSVP (tarjeta y fila) persiste y tiñe la
   tarjeta; la asignación de mesa persiste.
5. Alta de invitado con acompañantes (una línea por nombre) crea el invitado con su `plus`.
6. Bilingüe ES/EN y tema claro/oscuro correctos, incluidos los colores de lado/rsvp.
7. Tests verdes (lógica pura + paridad i18n).
8. Fidelidad visual con el prototipo (stats con divisores, tarjetas por círculo con borde
   de lado, tabla).

## 11. Decisiones / riesgos

- **Colores de lado/rsvp:** se añaden como tokens (claro del prototipo + oscuro derivado),
  para no hardcodear color y soportar tema. Es la única ampliación de `tokens.css`.
- **Stat "Aforo elegido":** depende de la finca elegida (Fase 1). Si no hay elegida, "—".
  Cruza `fincasRepo`; de solo lectura.
- **Edición de invitado:** el prototipo permite editar inline (rsvp, invitación, menú, mesa)
  y quitar; el alta es solo creación (no hay editar-todo). Se replica igual (no se añade un
  editor completo en Fase 2).
