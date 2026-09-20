# Vista Presupuesto (Fase 4) — Plan de implementación

> **Para ejecutores:** implementar tarea a tarea. Cada tarea acaba con su prueba en
> verde y un commit por capa/feature.

**Objetivo:** Reemplazar el placeholder de Presupuesto por la vista agregada del
prototipo (un componente + calc pura) con capa premium, bilingüe y solo tokens.

**Arquitectura:** Vista read-mostly: `refresh()` lee `fincasRepo/proveedoresRepo/
invitadosRepo/configRepo/presupuestoRepo`, calcula con `presupuesto-calc.js` (reutiliza
`coste`, `pax`, `eur/eurK`) y pinta resumen + 3 bloques. Único estado escribible: el
límite.

**Stack:** Web Components vanilla (sin build), Shadow DOM, i18n `t()`, tests en navegador
(headless Chrome dump-dom).

**Spec:** `docs/superpowers/specs/2026-09-20-vista-presupuesto-design.md`

## Restricciones globales

- Solo colores con tokens `var(--…)`; nada de hex. Verde `#8fae84`→`--rsvp-si-dot`,
  por confirmar→`--color-accent-300`, exceso→`--color-accent`, pista→`--color-neutral-200`.
- Bilingüe con paridad es/en; toda cadena vía `t()`.
- Markup en getters puros; wiring y lectura de repos en `afterRender()`/`refresh()`.
- Cálculo idéntico al prototipo (ver spec §4); catering = banquete, nunca en proveedores.
- `guestCount` de solo lectura (se edita en Finca).

---

## Tarea 1: Lógica pura `presupuesto-calc.js` + tests

**Files:**
- Crear: `web/js/components/views/presupuesto-view/presupuesto-calc.js`
- Crear: `web/test/presupuesto-calc.test.js`
- Registrar suite en `web/test/index.html`

**Produce:** `calcularPresupuesto({ fincas, proveedores, invitados, guestCount, limite })`
→ objeto con `{ inv, cabezas, contratado, pendiente, total, dif, exceso, senales,
banquete, fincaCoste, fincaPend, barContratado, barPrevisto, barExceso, bloques[] }`.
Reutiliza `coste` de `../finca-view/finca-calc.js`, `pax` de
`../invitados-view/invitados-calc.js`, `eur/eurK` de `../../../core/money.js`.

- [ ] Escribir la función pura replicando spec §4 (banquete, contratado/pendiente/total,
      dif/exceso, anchos de barra, los 3 bloques con sus líneas y notas). Devuelve
      importes ya formateados con `eur` donde el prototipo lo hace, y crudos numéricos
      (`total`, `dif`, `exceso`, `contratado`, `pendiente`) para que la vista anime.
- [ ] Tests: `total = contratado + pendiente`; `dif`/`exceso` con y sin exceso; con finca
      elegida (pendiente sin banquete) vs sin elegida (banquete en pendiente); catering
      cuenta como banquete y no aparece en bloque Proveedores; bloque Proveedores ordenado
      por importe desc; `barContratado+barPrevisto ≤ 100`.
- [ ] Ejecutar suite → verde. Commit: `feat(presupuesto): lógica pura de cálculo + tests`.

## Tarea 2: i18n (es + en)

**Files:** Modificar `web/js/i18n/es.js`, `web/js/i18n/en.js`.

- [ ] Añadir claves `pres.*`: título/subtítulo, `pres.limite`, `pres.total`,
      `pres.porInvitado` (con vars), `pres.margen`/`pres.exceso` labels, leyenda
      (`contratado/porConfirmar/fuera/senales`), títulos y notas de los 3 bloques, las
      líneas fijas (finca sin elegir, señal 25 %, coste por invitado, en lista real,
      margen libre, pendiente de pago…), footer, y chips de insight
      (`pres.insight.exceso/margen/porConfirmar/sinFinca`). Paridad es/en.
- [ ] Ejecutar suite (paridad i18n) → verde. Commit: `feat(i18n): claves de Presupuesto`.

## Tarea 3: Componente `presupuesto-view` (base del prototipo)

**Files:**
- Crear: `web/js/components/views/presupuesto-view/presupuesto-view.js`
- Crear: `web/js/components/views/presupuesto-view/presupuesto-view.css.js`

**Consume:** `calcularPresupuesto` (Tarea 1), claves i18n (Tarea 2).

- [ ] `refresh()`: `ensureSeeded()`, lee los 5 repos, guarda `_data = calcular...`,
      semilla `_wasWithin = dif>=0`, `_paint()`.
- [ ] Getters de plantilla: `_headerTpl` (título + input límite), `_resumenTpl` (total,
      por invitado, margen/exceso con color por token, barra apilada + leyenda + señales),
      `_bloquesTpl`/`_bloqueTpl` (3 tarjetas con líneas), `_insightsTpl`, footer.
- [ ] `afterRender()`: wire input límite (`input`→`setLimite`→`_apply()` sin perder foco),
      delegación en `#insights` (navegar a Proveedores/Finca por hash), animaciones.
- [ ] `_apply()`: recalcula `_data` y repinta solo resumen/bloques/insights (no el input),
      re-anima barra y contadores.
- [ ] Estilos solo con tokens (spec §5); `tabular-nums`; `break-inside: avoid` en bloques.
- [ ] Commit: `feat(presupuesto): vista agregada (resumen, barra, 3 bloques)`.

## Tarea 4: Capa premium

**Files:** Modificar `presupuesto-view.js` + `.css.js`.

- [ ] Contadores animados (rAF, easing cúbico) para Total y Margen (`[data-count]`).
- [ ] Barra apilada animada al pintar (anchos desde 0), guard `prefers-reduced-motion`.
- [ ] Chips de insight accionables (exceso/margen/porConfirmar/sinFinca) que navegan.
- [ ] Confeti sobrio una vez al cruzar `dif` a ≥0 (`_wasWithin`); guard reduced-motion.
- [ ] Ejecutar suite → verde. Commit: `feat(presupuesto): capa premium (contadores, barra
      animada, insights, celebración)`.

## Tarea 5: Cableado + verificación

**Files:** Modificar `web/index.html`, `web/main.js`, `web/README.md`.

- [ ] `index.html`: `<section id="view-presupuesto">` → `<presupuesto-view class="view"
      id="view-presupuesto">`.
- [ ] `main.js`: import de `presupuesto-view.js`.
- [ ] Suite completa en verde; verificación en navegador (screenshots claro/oscuro) del
      resumen, barra, bloques e insights; editar el límite recalcula en vivo.
- [ ] `README.md`: entrada de la vista Presupuesto (Fase 4).
- [ ] Commit: `feat(presupuesto): cableado en el router` + `docs: README de Presupuesto`.

---

## Autorrevisión

- Cobertura del spec: §4 lógica → Tarea 1; §5 tokens → Tareas 3-4; §8 premium → Tarea 4;
  §9 tests → Tareas 1-2; §10 cableado → Tarea 5. Sin huecos.
- Sin placeholders. Tipos coherentes: `calcularPresupuesto` mismo nombre en todas las
  tareas; `_data`, `_wasWithin` consistentes.
