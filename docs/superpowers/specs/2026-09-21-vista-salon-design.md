# Vista Salón (Fase 5) — Diseño

Reemplaza el placeholder de Salón por el plano de mesas del prototipo (UN componente con
getters de plantilla), más una capa premium. Réplica del comportamiento del prototipo.

- Fecha: 2026-09-21
- Repositorio: `gestor-boda` · Rama: `feat/vista-salon`
- Base: Fases 0-4 (en `main`)
- Estado: propuesto

---

## 1. Objetivo y alcance

Implementar la vista "Salón": el plano de mesas. Colocar mesas en un lienzo
arrastrándolas, repartir a los invitados **confirmados** en las mesas (dibujados como
sillas alrededor, coloreadas por lado), con un listado alternativo, un panel de
"Sin asignar" y utilidades (auto-organizar, formas, capacidades, añadir/borrar mesa).

**Entra:** toda la vista Salón (base del prototipo + capa premium).
**No entra:** Timing.

**Estado escribible:** mesas (`mesasRepo`: nombre, capacidad, forma, x, y) y la mesa
asignada de cada invitado (`invitadosRepo`, campo `mesa`). Solo se reparten invitados
**confirmados** (rsvp === 'confirmado').

## 2. Arquitectura (patrón consolidado)

- UN componente: `components/views/salon-view/salon-view.js` + `.css.js`, con getters de
  plantilla (`_statsTpl`, `_planoTpl`, `_mesaChairsTpl`, `_listadoTpl`, `_mesaCardTpl`,
  `_sinAsignarTpl`, `_mesaPanelTpl`) y wiring en `afterRender()`.
- Lógica pura en `salon-view/salon-calc.js` (sin DOM, testeable): stats, ocupación por
  mesa, sin-asignar, tamaño/geometría de sillas y auto-organización.
- Reutiliza: `segmented-tabs` (Plano/Listado). `mesasRepo`/`invitadosRepo`. `app-toast`.
- Helper de colores de lado (color/bg/ink por `--lado-*`) local en `salon-calc.js`
  (si un tercer sitio lo necesita, se extrae a `core/lado.js`).

```
components/views/salon-view/
├── salon-view.js / .css.js
└── salon-calc.js
```

## 3. Modelo de datos (ya en el seed de Fase 0)

- `mesasRepo` — `{ id, nombre, capacidad, forma: 'redonda'|'rectangular', x, y }` (x/y en
  % del lienzo). Seed: 4 mesas (Presidencial rectangular + 3 redondas).
- `invitadosRepo` — cada invitado tiene `mesa` (id de mesa o null) y `lado`/`plus`.
- `plazas(g) = 1 + (plus || 0)`.

## 4. Lógica de negocio (portada del prototipo)

- **Confirmados:** solo `rsvp === 'confirmado'` entran en el reparto.
- **Ocupación de una mesa:** `ocupadas = Σ plazas(asignados)`; `pct = min(100,
  round(ocupadas/capacidad*100))`; `sobra = ocupadas > capacidad` (aviso con el nº de
  plazas de más).
- **Stats (4):** Mesas (`n` + `Σ capacidad` plazas totales), Sentados (`Σ plazas de
  confirmados con mesa` de `Σ plazas de confirmados`), Por sentar (`nº invitaciones
  confirmadas sin mesa`), Plazas libres (`max(0, totalPlazas − sentados)`).
- **Sin asignar:** confirmados sin `mesa`, con selector para asignar mesa.
- **Tamaño de mesa** (`mesaSize`): rectangular → 210×84; redonda → lado
  `104 + max(0, cap−8)*5` (cuadrada). **Geometría de sillas** (`sillasGeom`): reparte `n`
  sillas en elipse alrededor (`rx = w/2 + margen`, `ry = h/2 + 20`), ángulo
  `-90° + i·360/n`; devuelve por silla `{x, y, deg}` (sin estilos; la vista compone CSS).
- **Auto-organizar** (`autoOrganizar`): la rectangular (presidencial) arriba centrada
  (`x:50,y:19`); las redondas en rejilla (2-4 columnas) centradas, filas a `y:40+row*21`.

## 5. Interacción

- **Toggle Plano / Listado** (`segmented-tabs`), estado en memoria.
- **Arrastrar mesa** (Plano): `pointerdown` en la mesa → `pointermove` actualiza `x,y`
  (en %, con snap a 0.5 y clamp a los bordes) → persiste en `mesasRepo` al soltar.
  Seleccionar la mesa al empezar a arrastrar.
- **Seleccionar mesa** (Plano): muestra panel con ocupación, cambiar forma
  (redonda↔rectangular), vaciar mesa y quitar comensales.
- **Asignar / quitar:** selector en "Sin asignar" asigna; `×` en un comensal lo quita
  (`mesa = null`). Persistido en `invitadosRepo`.
- **Listado:** por mesa, nombre editable (`rename`), capacidad editable (`setCap`, 2-20),
  barra de llenado, aviso de sobrecupo, comensales con quitar, borrar mesa.
- **Auto-organizar** y **Añadir mesa** (redonda, capacidad 10, posición nueva).

## 6. Colores → tokens (regla de la casa)

El prototipo usa hex sueltos (`#fbf7f0`, `#9db4c8`, `#e0b3b9`, gradientes). Se mapean:
- Lienzo/mesas → `--color-surface`, `--color-divider`, `--color-accent-100/200/300`.
- Sillas por lado → `--lado-novia/-bg/-ink` y `--lado-novio/-bg/-ink` (ya existen).
- Sobrecupo → `--color-accent`. Rejilla del plano con `color-mix` sobre tokens.
Sin hex hardcodeado.

## 7. Diseño premium (base + premium)

- **Arrastrar un invitado desde "Sin asignar" y soltarlo en una mesa del plano**
  (HTML5 DnD): al arrastrar, se **resaltan las mesas con hueco**; soltar asigna esa mesa.
  También funciona sobre las tarjetas del Listado.
- **Auto-organizar animado**: transición CSS de `x,y` (respeta `prefers-reduced-motion`).
- **Sobrecupo** marcado en rojo/acento en mesa y barra, con aviso.
- Micro-interacciones: hover de mesa, anillo en la seleccionada, tooltips de sillas,
  toasts al asignar/vaciar/borrar/auto-organizar.

## 8. Persistencia

- Posición/forma/capacidad/nombre de mesa → `mesasRepo.upsert`; borrar → `mesasRepo.remove`
  (y `mesa=null` en sus invitados). Alta → `mesasRepo.upsert` (nuevo id).
- Asignación → `invitadosRepo.upsert` con `mesa` actualizado.
- `refresh()` (router) lee mesas + invitados y pinta.

## 9. Tests

- `salon-calc.test.js` (pura): `plazas`; ocupación (ocupadas, pct, sobra) con y sin
  sobrecupo; stats (mesas/plazas totales, sentados, por sentar, plazas libres) solo con
  confirmados; sin-asignar excluye no-confirmados y con mesa; `mesaSize` redonda/rectangular;
  `sillasGeom` reparte `n` sillas (primera arriba); `autoOrganizar` coloca la rectangular
  arriba y no solapa.
- Paridad i18n es/en y tokens↔temas (sin hex).

## 10. Cableado

- `index.html`: `<section id="view-salon">` → `<salon-view class="view" id="view-salon">`.
- `main.js`: import de `salon-view.js`. El router llama `refresh()` al abrir.

## 11. Criterios de aceptación

1. Plano con mesas arrastrables (snap + clamp) y sillas por lado; seleccionar mesa abre su
   panel; asignar/quitar/vaciar/forma/capacidad/borrar/añadir/auto-organizar funcionan y
   persisten.
2. Listado alternativo con capacidad y llenado; panel "Sin asignar" solo con confirmados.
3. Arrastrar un invitado desde "Sin asignar" a una mesa lo asigna; mesas con hueco se
   resaltan al arrastrar. Auto-organizar animado. Respeta `prefers-reduced-motion`.
4. Bilingüe es/en con paridad; solo tokens (claro/oscuro correctos).
5. Suite completa en verde.

## 12. Decisiones / riesgos

- **Solo confirmados** se reparten (fiel al prototipo); los no confirmados no aparecen en
  el plano ni en "Sin asignar".
- **Geometría pura en la calc**: `sillasGeom`/`mesaSize`/`autoOrganizar` sin DOM, para
  poder testearlas; la vista solo compone CSS con esos números.
- **Arrastre de mesa** con Pointer Events (como el prototipo); **arrastre de invitado**
  con HTML5 DnD (como en el tablero de Proveedores) para reutilizar patrón conocido.
- **Persistencia por acción** (no en cada `pointermove`): la mesa se guarda al soltar.
