# Vista Salón (Fase 5) — Plan de implementación

> **Para ejecutores:** implementar por tareas; cada una acaba con su prueba en verde y un
> commit por capa/feature.

**Objetivo:** Reemplazar el placeholder de Salón por el plano de mesas del prototipo (un
componente + calc pura) con capa premium (arrastrar invitados al plano), bilingüe y solo
tokens.

**Arquitectura:** `refresh()` lee `mesasRepo`/`invitadosRepo`; `salon-calc.js` calcula
stats, ocupación, sin-asignar y geometría (mesaSize/sillasGeom/autoOrganizar); la vista
pinta Plano (mesas arrastrables + sillas por lado) o Listado, con panel "Sin asignar".

**Spec:** `docs/superpowers/specs/2026-09-21-vista-salon-design.md`

## Restricciones globales

- Solo colores con tokens `var(--…)`; nada de hex. Lienzo→`--color-surface`/`--color-divider`,
  sillas por lado→`--lado-*`, sobrecupo→`--color-accent`.
- Bilingüe con paridad es/en; toda cadena vía `t()`.
- Markup en getters puros; wiring y lectura de repos en `afterRender()`/`refresh()`.
- Solo se reparten confirmados (`rsvp === 'confirmado'`).
- Persistencia por acción: mesa se guarda al soltar (no en cada `pointermove`).

---

## Tarea 1: Lógica pura `salon-calc.js` + tests

**Files:**
- Crear: `web/js/components/views/salon-view/salon-calc.js`
- Crear: `web/test/salon-calc.test.js` + registrar en `web/test/index.html`

**Produce:** `plazas(g)`; `ocupacionMesa(mesa, confirmados)` → `{asignados, ocupadas, pct,
sobra, exceso}`; `calcularStats(mesas, invitados)` → 4 stats (claves i18n + vars);
`sinAsignar(confirmados)`; `mesaSize(mesa)` → `{rect, w, h}`; `sillasGeom(mesa, n)` →
`[{x, y, deg}]`; `autoOrganizar(mesas)` → mesas con `x,y` nuevos; helper `ladoTokens(lado)`.

- [ ] Escribir las funciones puras según spec §4.
- [ ] Tests: `plazas`; ocupación con y sin sobrecupo; stats solo con confirmados
      (mesas/plazas, sentados, por sentar, plazas libres); `sinAsignar` excluye no
      confirmados y con mesa; `mesaSize` redonda vs rectangular; `sillasGeom` reparte `n`
      (primera arriba, `deg≈0`); `autoOrganizar` pone la rectangular en `y≈19`.
- [ ] Suite → verde. Commit: `feat(salon): lógica pura (stats, ocupación, geometría) + tests`.

## Tarea 2: i18n (es + en)

**Files:** Modificar `web/js/i18n/es.js`, `web/js/i18n/en.js`.

- [ ] Claves `salon.*`: título, toggle plano/listado, 4 stats (label+note), plano (auto-
      organizar, presidencia/pista/barra, leyenda novio/novia, "arrastra…"), panel de mesa
      (ocupación, hacer redonda/rectangular, vaciar), listado (capacidad, borrar, aviso
      sobrecupo, sin comensales), sin-asignar (título, "N por sentar", asignar…, todos
      asignados), añadir mesa, toasts. Paridad es/en.
- [ ] Suite (paridad) → verde. Commit: `feat(i18n): claves de la vista Salón`.

## Tarea 3: Componente base — Listado + Sin asignar + stats

**Files:** Crear `web/js/components/views/salon-view/salon-view.js` + `.css.js`.

- [ ] `refresh()`: `ensureSeeded()`, lee mesas + invitados, `_paint()`. Estado: `_vista`
      ('plano'|'listado'), `_mesaSel`.
- [ ] Getters: `_statsTpl`, `_filtersTpl` (toggle segmented-tabs), `_listadoTpl` +
      `_mesaCardTpl` (nombre editable, barra, comensales con quitar, capacidad, borrar),
      `_sinAsignarTpl` (aside con selector de mesa por invitado).
- [ ] `afterRender()`: wire toggle, delegación de asignar/quitar/rename/setCap/borrar/
      añadir. `_apply()` repinta el cuerpo sin perder foco.
- [ ] Estilos base solo con tokens.
- [ ] Cablear en `index.html` + `main.js`. Suite → verde; revisar en navegador (listado y
      asignación). Commit: `feat(salon): vista base (listado, sin-asignar, stats, toggle)`.

## Tarea 4: Plano con mesas arrastrables + sillas

**Files:** Modificar `salon-view.js` + `.css.js`.

- [ ] `_planoTpl` (lienzo con presidencia/pista/barra + mesas), `_mesaChairsTpl` (sillas
      por lado con `sillasGeom`), `_mesaPanelTpl` (mesa seleccionada: ocupación, forma,
      vaciar, quitar comensales).
- [ ] Arrastre de mesa con Pointer Events (snap 0.5 + clamp), seleccionar al arrastrar,
      persistir al soltar. Auto-organizar (animado) y añadir mesa.
- [ ] Suite → verde; navegador (arrastrar mesa, seleccionar, forma, auto-organizar).
      Commit: `feat(salon): plano arrastrable con sillas por lado y panel de mesa`.

## Tarea 5: Premium — arrastrar invitado al plano + pulido

**Files:** Modificar `salon-view.js` + `.css.js`.

- [ ] HTML5 DnD: arrastrar un invitado desde "Sin asignar" y soltarlo en una mesa (plano
      o tarjeta del listado) lo asigna; resaltar mesas con hueco al arrastrar.
- [ ] Sobrecupo marcado; micro-interacciones (hover, anillo de selección, tooltips);
      toasts. `prefers-reduced-motion` respetado.
- [ ] Suite → verde; navegador (DnD invitado→mesa, sobrecupo, temas). Screenshots.
      Commit: `feat(salon): arrastrar invitado a la mesa y pulido premium`.

## Tarea 6: Cierre

**Files:** `web/README.md`.

- [ ] Entrada de la vista Salón (Fase 5) en el README. Commit: `docs: README de Salón`.

---

## Autorrevisión

- Cobertura del spec: §4 lógica → T1; §5 interacción → T3-T4; §7 premium → T5; §9 tests →
  T1-T2; §10 cableado → T3. Sin huecos.
- Tipos coherentes: `ocupacionMesa`, `sillasGeom`, `mesaSize`, `autoOrganizar`,
  `ladoTokens` con los mismos nombres en calc, vista y tests.
