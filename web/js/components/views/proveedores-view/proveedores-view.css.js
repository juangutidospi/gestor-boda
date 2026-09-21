import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Proveedores (componente único). Prefijo `prov-` para
 * todo el layout: stats, filtros, chips de categorías por cubrir, rejilla y
 * tarjeta premium, formulario de alta/edición. Solo tokens.
 */
export const styles = css`
:host { display: block; }

.page-head { padding-top: var(--space-6); }

/* ---------- Stats ---------- */
.prov-stats-row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  border-top: 1px solid var(--color-divider); border-bottom: 1px solid var(--color-divider);
}
.prov-stat { padding: var(--space-4); border-left: 1px solid var(--color-divider); }
.prov-stat:first-child { border-left: 0; }
.prov-stat-label { display: block; font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.prov-stat-value { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; margin-top: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.prov-stat-note { display: block; }

/* ---------- Hero (donut de cobertura + medidor de gasto) ---------- */
:host { position: relative; }
.prov-hero {
  display: flex; align-items: center; gap: var(--space-6); flex-wrap: wrap;
  padding: var(--space-5) var(--space-4); margin-bottom: var(--space-2);
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
}
.prov-hero-ring { position: relative; flex: none; width: 128px; height: 128px; }
.prov-donut { width: 128px; height: 128px; }
.prov-donut-track { stroke: color-mix(in srgb, var(--color-text) 9%, transparent); }
.prov-donut-arc { transform-origin: 64px 64px; transition: stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1); }
.prov-donut-arc.is-cub { stroke: var(--rsvp-si-dot); }
.prov-donut-arc.is-marcha { stroke: var(--color-accent); }
.prov-donut-arc.is-vacia { stroke: color-mix(in srgb, var(--color-text) 22%, transparent); }
.prov-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.prov-donut-num { font-family: var(--font-heading); font-weight: 600; font-size: 26px; line-height: 1; font-variant-numeric: tabular-nums; }
.prov-donut-lbl { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
.prov-hero-body { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: var(--space-4); }
.prov-hero-legend { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.prov-leg { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--color-neutral-700); }
.prov-leg b { color: var(--color-text); font-variant-numeric: tabular-nums; }
.prov-leg-dot { width: 9px; height: 9px; border-radius: 50%; }
.prov-leg-dot.is-cub { background: var(--rsvp-si-dot); }
.prov-leg-dot.is-marcha { background: var(--color-accent); }
.prov-leg-dot.is-vacia { background: color-mix(in srgb, var(--color-text) 22%, transparent); }
.prov-meter-lbl { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-neutral-700); margin-bottom: 6px; }
.prov-meter-bar { height: 9px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--color-text) 8%, transparent); }
.prov-meter-fill { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--color-accent-700), var(--color-accent)); transition: width 1s cubic-bezier(.22,.61,.36,1); }
.prov-meter-empty { opacity: .6; }
.prov-meter-cap { font-size: 12px; margin-top: 6px; font-variant-numeric: tabular-nums; }

/* ---------- Insights accionables ---------- */
#insights:empty { display: none; }
.prov-insights { display: flex; flex-wrap: wrap; gap: 8px; }
.prov-insight { display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 6px 12px; border-radius: 999px; font-size: 12.5px; color: var(--color-text);
  background: var(--color-surface); border: 1px solid var(--color-divider);
  transition: border-color .15s ease, background .15s ease; }
.prov-insight:hover { border-color: var(--color-accent-300); background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)); }
.prov-insight:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* ---------- Flash al contratar + confeti al cubrir todo ---------- */
@keyframes provFlash {
  0% { box-shadow: var(--shadow-sm), inset 0 0 0 2px color-mix(in srgb, var(--rsvp-si-dot) 65%, transparent); }
  100% { box-shadow: var(--shadow-sm); }
}
.prov-card.prov-flash { animation: provFlash .6s ease-out; }
#confetti { position: absolute; left: 88px; top: 250px; width: 0; height: 0; z-index: 40; pointer-events: none; }
.prov-confetti-bit { position: absolute; width: 8px; height: 8px; border-radius: 2px;
  animation: provConfetti 1.2s cubic-bezier(.2,.7,.3,1) forwards; }
@keyframes provConfetti { 0% { opacity: 1; transform: translate(0,0) rotate(0); } 100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--r)); } }
@media (prefers-reduced-motion: reduce) {
  .prov-donut-arc, .prov-meter-fill { transition: none; }
  .prov-card.prov-flash { animation: none; }
  .prov-confetti-bit { animation: none; opacity: 0; }
}

/* ---------- Filtros ---------- */
.prov-filters { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-end; padding-bottom: var(--space-2); }
.prov-filters .field { min-width: 170px; }
.prov-search { flex: 1; min-width: 220px; }
.prov-add { margin-left: auto; }

/* ---------- Chips de categorías por cubrir ---------- */
.prov-chips-wrap h5 { margin: 0 0 var(--space-3); }
.prov-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.prov-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; border-radius: 999px;
  font-family: var(--font-body); font-size: 12px; letter-spacing: .02em; cursor: pointer;
  border: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-text);
}
.prov-chip:hover { background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface)); }
.prov-chip:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.prov-chip.is-cubierta {
  border-color: var(--rsvp-si-line); background: var(--rsvp-si-bg); color: var(--rsvp-si-dot);
}
.prov-chip.is-enmarcha {
  border-color: var(--color-accent-300); background: var(--color-accent-100); color: var(--color-accent-700);
}
.prov-chip.is-vacia { border-color: var(--color-divider); color: var(--color-neutral-700); }

/* ---------- Rejilla y tarjeta ---------- */
.prov-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }

.prov-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: var(--space-4); border-radius: 16px;
  background: var(--color-surface); border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm); transition: transform .14s ease, box-shadow .14s ease;
}
.prov-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
/* Los contratados destacan con fondo verde muy suave y borde de acento verde. */
.prov-card[data-estado="contratado"] { background: var(--rsvp-si-bg); border-color: var(--rsvp-si-line); }
/* Los descartados se atenúan para bajarlos en la jerarquía visual. */
.prov-card[data-estado="descartado"] { opacity: .72; }
.prov-card[data-estado="descartado"]:hover { opacity: 1; }
.prov-card-top { display: flex; align-items: flex-start; gap: var(--space-2); }
.prov-card-id { display: flex; flex-direction: column; gap: 1px; }
.prov-card-cat { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-accent-700); }
.prov-card-id h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 22px; line-height: 1.15; }
.prov-card-contacto { font-size: 12px; }
.prov-card-top .prov-badge-btn {
  margin-left: auto; flex: 0 0 auto; display: inline-flex; padding: 2px; border: 0;
  background: none; cursor: pointer; border-radius: 999px; transition: box-shadow .14s ease;
}
.prov-card-top .prov-badge-btn:hover { box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent); }
.prov-card-top .prov-badge-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* ---------- Barra de señal pagada (tarjetas contratadas) ---------- */
.prov-senal { display: flex; flex-direction: column; gap: 5px; }
.prov-senal-bar { height: 6px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--color-text) 10%, transparent); }
.prov-senal-fill { display: block; height: 100%; border-radius: 999px; background: var(--rsvp-si-dot); transition: width .5s cubic-bezier(.22,.61,.36,1); }
.prov-senal-cap { font-size: 11px; font-variant-numeric: tabular-nums; }

/* ---------- Popover de cambio rápido de estado ---------- */
.prov-estado-pop[hidden] { display: none; }
.prov-estado-pop {
  position: absolute; z-index: 60; display: flex; flex-direction: column; gap: 2px;
  min-width: 168px; padding: 6px; border-radius: 12px;
  background: var(--color-surface); border: 1px solid var(--color-divider); box-shadow: var(--shadow-md);
}
.prov-estado-opt {
  display: inline-flex; align-items: center; gap: 9px; width: 100%; text-align: left;
  padding: 8px 10px; border: 0; border-radius: 8px; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; color: var(--color-text); background: none;
}
.prov-estado-opt:hover { background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface)); }
.prov-estado-opt:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
.prov-estado-opt.is-current { font-weight: 600; background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)); }
.prov-estado-dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
.prov-estado-dot.is-contratado { background: var(--rsvp-si-dot); }
.prov-estado-dot.is-presupuesto { background: var(--color-accent); }
.prov-estado-dot.is-contactado { background: color-mix(in srgb, var(--color-text) 40%, transparent); }
.prov-estado-dot.is-pendiente { background: var(--color-accent-300); }
.prov-estado-dot.is-descartado { background: color-mix(in srgb, var(--color-text) 22%, transparent); }
@media (prefers-reduced-motion: reduce) { .prov-senal-fill { transition: none; } }

/* ---------- Monograma de categoría ---------- */
.prov-card-top .prov-mono {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-heading); font-weight: 600; font-size: 15px; letter-spacing: .02em;
  background: var(--color-accent-100); color: var(--color-accent-700);
}
.prov-card[data-estado="contratado"] .prov-mono {
  background: color-mix(in srgb, var(--rsvp-si-dot) 16%, transparent); color: var(--rsvp-si-dot);
}

/* ---------- Botón comparar en la tarjeta ---------- */
.prov-compare-btn { color: var(--color-accent-700); }

/* ---------- Comparador por categoría (tabla en modal) ---------- */
.prov-compare-wrap { overflow-x: auto; padding: var(--space-2) 0 var(--space-4); }
.prov-compare { border-collapse: collapse; width: 100%; min-width: 420px; font-size: 13px; }
.prov-compare th, .prov-compare td {
  text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--color-divider); vertical-align: top;
}
.prov-compare thead th {
  font-family: var(--font-heading); font-weight: 600; font-size: 15px; border-bottom: 2px solid var(--color-divider); white-space: nowrap;
}
.prov-compare thead th.is-contratado { color: var(--rsvp-si-dot); }
.prov-compare tbody th[scope="row"] {
  font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); font-weight: 600; white-space: nowrap;
}
.prov-compare th[scope="row"], .prov-compare thead th:first-child {
  position: sticky; left: 0; background: var(--color-surface); z-index: 1;
}
.prov-compare .prov-cmp-num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.prov-compare .prov-cmp-num.is-best { color: var(--rsvp-si-dot); font-weight: 600; }
.prov-cmp-tag {
  display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10px;
  background: var(--rsvp-si-bg); color: var(--rsvp-si-dot); border: 1px solid var(--rsvp-si-line);
}
.prov-card-panel {
  display: flex; align-items: baseline; gap: var(--space-3);
  background: var(--color-accent-100); border-radius: 12px; padding: 10px 12px;
}
.prov-card-panel .prov-sep { margin-left: auto; text-align: right; }
.prov-lbl { display: block; font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.prov-val { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 22px; font-variant-numeric: tabular-nums; }
.prov-val-sm { font-size: 16px; }
.prov-card-notas { margin: 0; font-size: 13px; }
.prov-card-foot {
  display: flex; gap: var(--space-2); margin-top: auto; padding-top: var(--space-2);
  border-top: 1px solid var(--color-divider);
  button { font-size: 12px; padding: 0 12px; min-height: 34px; }
}
.prov-card-foot [data-contratar] { margin-left: auto; }

/* Entrada escalonada de las tarjetas al pintar (respeta prefers-reduced-motion). */
@keyframes provRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.prov-stagger .prov-card { animation: provRise .4s cubic-bezier(.22,.61,.36,1) both; animation-delay: calc(var(--i, 0) * 30ms); }
@media (prefers-reduced-motion: reduce) { .prov-stagger .prov-card { animation: none; } }

/* ---------- Vacío y pie ---------- */
#empty { padding: 0 0 var(--space-4); }
.prov-foot { padding: var(--space-4) 0 var(--space-8); }

/* ---------- Formulario de alta/edición (dentro de modal-dialog) ---------- */
.prov-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); padding: var(--space-4) 0; }
.prov-form-span2 { grid-column: span 2; }
.prov-form-foot { display: flex; gap: var(--space-2); align-items: center; border-top: 2px solid var(--color-divider); padding-top: var(--space-3); }
.prov-form-foot button { margin-left: auto; }

/* ---------- Toolbar (toggle rejilla/tablero) ---------- */
.prov-toolbar { display: flex; justify-content: flex-end; }

/* ---------- Selección múltiple ---------- */
.prov-card { position: relative; }
.prov-card-top .prov-sel { flex: 0 0 auto; display: inline-flex; align-items: center; }
.prov-sel input { width: 17px; height: 17px; accent-color: var(--color-accent); cursor: pointer; }
.prov-card.is-selected { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent); }

/* Monograma (botón que abre la ficha) y nombre clicable */
.prov-card-top .prov-mono { border: 0; cursor: pointer; }
.prov-card-id h3 { margin: 0; }
.prov-name-btn { border: 0; background: none; padding: 0; margin: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.prov-name-btn:hover { text-decoration: underline; text-underline-offset: 2px; }

/* Bloque superior derecho: progreso del checklist + badge */
.prov-card-tr { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.prov-card-tr .prov-badge-btn { margin-left: 0; }
.prov-check {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap;
  background: var(--rsvp-si-bg); color: var(--rsvp-si-dot); border: 1px solid var(--rsvp-si-line);
}

/* ---------- Panel de próximos pagos ---------- */
.prov-pagos { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: var(--radius-md); overflow: hidden; }
.prov-pagos-head {
  display: flex; align-items: center; gap: var(--space-3); width: 100%;
  padding: 12px var(--space-4); background: none; border: 0; cursor: pointer; font: inherit;
  color: var(--color-text); text-align: left;
}
.prov-pagos-head:hover { background: color-mix(in srgb, var(--color-accent) 5%, var(--color-surface)); }
.prov-pagos-caret { color: var(--color-accent-700); font-size: 12px; }
.prov-pagos-title { font-weight: 600; }
.prov-pagos-total { font-variant-numeric: tabular-nums; }
.prov-pagos-total b { color: var(--color-accent-700); }
.prov-pagos-pagado { margin-left: auto; font-size: 12px; }
.prov-pagos-list { list-style: none; margin: 0; padding: 0 var(--space-4) var(--space-3); }
.prov-pago { display: flex; align-items: baseline; gap: var(--space-3); padding: 8px 0; border-top: 1px solid var(--color-divider); cursor: pointer; }
.prov-pago:hover { color: var(--color-accent-700); }
.prov-pago-fecha { flex: 0 0 auto; width: 108px; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--color-neutral-700); }
.prov-pago-nombre { flex: 1; min-width: 0; }
.prov-pago-importe { margin-left: auto; font-family: var(--font-heading); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* ---------- Tablero Kanban ---------- */
.prov-board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(238px, 1fr); gap: 14px; overflow-x: auto; padding-bottom: var(--space-3); }
.prov-col { background: color-mix(in srgb, var(--color-text) 3%, var(--color-surface)); border: 1px solid var(--color-divider); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.prov-col-head { display: flex; align-items: center; gap: 8px; }
.prov-col-count { margin-left: auto; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--color-neutral-700); }
.prov-col-body { display: flex; flex-direction: column; gap: 8px; min-height: 48px; border-radius: 10px; transition: background .12s ease; }
.prov-col-body.is-over { background: color-mix(in srgb, var(--color-accent) 12%, transparent); outline: 2px dashed var(--color-accent-300); outline-offset: 2px; }
.prov-bcard { display: flex; align-items: center; gap: 9px; padding: 10px; border-radius: 10px; background: var(--color-surface); border: 1px solid var(--color-divider); box-shadow: var(--shadow-sm); cursor: grab; }
.prov-bcard:hover { border-color: var(--color-accent-300); }
.prov-bcard.is-dragging { opacity: .5; cursor: grabbing; }
.prov-bcard-mono { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-weight: 600; font-size: 12px; background: var(--color-accent-100); color: var(--color-accent-700); }
.prov-bcard-txt { min-width: 0; flex: 1; }
.prov-bcard-nombre { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prov-bcard-meta { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prov-bcard .prov-check { flex: 0 0 auto; padding: 1px 6px; font-size: 10px; }

/* ---------- Barra flotante de acciones en lote ---------- */
.prov-bulkbar {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 22px; z-index: 50;
  display: flex; align-items: center; gap: 8px; padding: 8px 10px 8px 16px; max-width: calc(100% - 32px);
  border-radius: 999px; background: var(--color-surface); border: 1px solid var(--color-divider); box-shadow: var(--shadow-md);
}
.prov-bulk-count { font-size: 13px; font-weight: 600; white-space: nowrap; }
.prov-bulkbar .btn { min-height: 34px; font-size: 12px; padding: 0 12px; }

/* ---------- Ficha (dentro del drawer) ---------- */
.prov-ficha { display: flex; flex-direction: column; gap: var(--space-4); }
.prov-ficha-head { display: flex; align-items: flex-start; gap: var(--space-3); }
.prov-ficha-mono { width: 44px; height: 44px; cursor: default; }
.prov-ficha-head-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.prov-ficha-datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: var(--space-3); padding: var(--space-3); background: var(--color-accent-100); border-radius: 12px; }
.prov-ficha-dato { display: flex; flex-direction: column; gap: 2px; }
.prov-ficha-val { font-family: var(--font-heading); font-weight: 600; font-size: 18px; font-variant-numeric: tabular-nums; }
.prov-ficha-paso { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; background: var(--rsvp-si-bg); border: 1px solid var(--rsvp-si-line); }
.prov-ficha-paso-txt { font-weight: 600; color: var(--rsvp-si-dot); }
.prov-ficha-check-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.prov-ficha-check-head h5 { margin: 0; }
.prov-ficha-check-head .prov-check { margin-left: auto; }
.prov-step { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--color-divider); cursor: pointer; font-size: 14px; }
.prov-step input { position: absolute; opacity: 0; width: 0; height: 0; }
.prov-step-mark { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 6px; border: 2px solid var(--color-divider); display: inline-flex; align-items: center; justify-content: center; transition: background .12s, border-color .12s; }
.prov-step.is-done .prov-step-mark { background: var(--rsvp-si-dot); border-color: var(--rsvp-si-dot); }
.prov-step.is-done .prov-step-mark::after { content: '✓'; color: var(--color-surface); font-size: 12px; line-height: 1; }
.prov-step.is-done { color: var(--color-neutral-700); }
.prov-step input:focus-visible + .prov-step-mark { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.prov-ficha-notas p { margin: 4px 0 0; font-size: 13px; }
.prov-ficha-foot { display: flex; }
@media (prefers-reduced-motion: reduce) { .prov-col-body, .prov-step-mark { transition: none; } }
`;
