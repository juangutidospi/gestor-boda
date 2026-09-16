import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Invitados (componente único). Stats con divisores,
 * barra de filtros flexible, tarjetas agrupadas por círculo, tabla con
 * overflow-x, píldoras de lado/círculo y el .seg de confirmación dentro de
 * cada tarjeta. Solo tokens.
 */
export const styles = css`
:host { display: block; }

/* Compensa el nav superior fijo (sticky en el light DOM) para que el título
   de la vista no quede tapado. */
.page-head { padding-top: var(--space-6); }

/* ---------- Stats ---------- */
.inv-stats-row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  border-top: 1px solid var(--color-divider); border-bottom: 1px solid var(--color-divider);
}
.inv-stat { padding: var(--space-4); border-left: 1px solid var(--color-divider); }
.inv-stat:first-child { border-left: 0; }
.inv-stat-label { display: block; font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.inv-stat-value { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; margin-top: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.inv-stat-note { display: block; }

/* ---------- Hero de progreso (donut + medidor de aforo) ---------- */
.inv-hero {
  display: flex; align-items: center; gap: var(--space-6); flex-wrap: wrap;
  padding: var(--space-5) var(--space-4); margin-bottom: var(--space-2);
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
}
.inv-hero-ring { position: relative; flex: none; width: 128px; height: 128px; }
.inv-donut { width: 128px; height: 128px; }
.inv-donut-track { stroke: color-mix(in srgb, var(--color-text) 9%, transparent); }
.inv-donut-arc { transform-origin: 64px 64px; transition: stroke-dashoffset 1s cubic-bezier(.22,.61,.36,1); }
.inv-donut-arc.is-si { stroke: var(--rsvp-si-dot); }
.inv-donut-arc.is-pend { stroke: var(--color-accent); }
.inv-donut-arc.is-no { stroke: color-mix(in srgb, var(--color-text) 34%, transparent); }
.inv-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.inv-donut-pct { font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums; }
.inv-donut-lbl { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
.inv-hero-body { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: var(--space-4); }
.inv-hero-legend { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.inv-leg { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--color-neutral-700); }
.inv-leg b { color: var(--color-text); font-variant-numeric: tabular-nums; }
.inv-leg-dot { width: 9px; height: 9px; border-radius: 50%; }
.inv-leg-dot.is-si { background: var(--rsvp-si-dot); }
.inv-leg-dot.is-pend { background: var(--color-accent); }
.inv-leg-dot.is-no { background: color-mix(in srgb, var(--color-text) 34%, transparent); }
.inv-meter-lbl { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-neutral-700); margin-bottom: 6px; }
.inv-meter-bar { height: 9px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--color-text) 8%, transparent); }
.inv-meter-fill { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--color-accent-700), var(--color-accent)); transition: width 1s cubic-bezier(.22,.61,.36,1); }
.inv-meter-empty { opacity: .6; }
.inv-meter-cap { font-size: 12px; margin-top: 6px; font-variant-numeric: tabular-nums; }
.inv-meter-cap b { color: var(--color-text); }
@media (prefers-reduced-motion: reduce) {
  .inv-donut-arc, .inv-meter-fill { transition: none; }
}

/* ---------- Filtros ---------- */
.inv-filtros { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-end; padding-bottom: var(--space-2); }
.inv-filtros .field { min-width: 150px; }
.inv-search { flex: 1; min-width: 220px; }
.inv-view-toggle { margin-bottom: 1px; }
.inv-add { margin-left: auto; }

/* ---------- Encabezado de grupo (círculo) ---------- */
.inv-grupo-head {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-3);
  padding: var(--space-5) 0 0;
}
.inv-grupo-head:first-child { padding-top: 0; }
.inv-grupo-head h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 24px; }
.inv-grupo-sub { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-700); font-variant-numeric: tabular-nums; }
.inv-grupo-head::after { content: ''; flex: 1; height: 1px; background: var(--color-divider); min-width: 40px; }

/* ---------- Rejilla y tarjeta de invitado ---------- */
.inv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding-top: var(--space-3); }

.inv-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 10px;
  padding: var(--space-4); border-radius: 16px;
  background: var(--color-surface); border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease, opacity .2s ease;
}
/* Línea de acento superior fina en el color del lado (sustituye al borde izquierdo). */
.inv-card::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 2px;
  background: var(--card-lado, var(--color-divider)); opacity: .5;
  transition: opacity .2s ease;
}
.inv-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--card-lado) 42%, var(--color-divider));
  box-shadow: var(--shadow-lg), inset 0 0 0 1px color-mix(in srgb, var(--card-lado) 22%, transparent);
}
.inv-card:hover::before { opacity: 1; }
/* Jerarquía por estado: se atenúan los que no vienen; sube el foco a los confirmados. */
.inv-card[data-rsvp="no"] { opacity: .82; }
.inv-card[data-rsvp="no"]:hover { opacity: 1; }

.inv-card-top { display: flex; align-items: center; gap: 11px; }
.inv-card-id { min-width: 0; flex: 1; }

/* Avatar con monograma (teñido por lado) y punto de estado de confirmación. */
.inv-avatar {
  position: relative; flex: none; width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--font-heading); font-weight: 600; font-size: 16px; letter-spacing: .02em;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--card-lado) 40%, transparent);
}
.inv-avatar-status {
  position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid var(--color-surface); background: var(--color-neutral-600);
  transition: background .2s ease;
}
.inv-card[data-rsvp="confirmado"] .inv-avatar-status,
.inv-table tr[data-rsvp="confirmado"] .inv-avatar-status { background: var(--rsvp-si-dot); }
.inv-card[data-rsvp="pendiente"] .inv-avatar-status,
.inv-table tr[data-rsvp="pendiente"] .inv-avatar-status { background: var(--rsvp-pend-dot); }
.inv-card[data-rsvp="no"] .inv-avatar-status,
.inv-table tr[data-rsvp="no"] .inv-avatar-status { background: var(--rsvp-no-dot); }
/* Avatar pequeño para el listado. */
.inv-avatar-sm { width: 32px; height: 32px; font-size: 12px; }
.inv-avatar-sm .inv-avatar-status { width: 10px; height: 10px; }

.inv-card-nombre { font-family: var(--font-heading); font-weight: 600; font-size: 20px; line-height: 1.15;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.inv-card-meta { font-size: 12px; }
.inv-card-remove { margin-left: auto; font-size: 11px; padding: 4px 8px; align-self: flex-start; }

/* Iconos de línea en filas de metadatos. */
.inv-row-ic { width: 13px; height: 13px; flex: none; opacity: .85; }

.inv-card-pills { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.inv-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  padding: 4px 11px 4px 9px; border-radius: 999px; border: 1px solid transparent;
}
.inv-pill-outline { background: transparent; padding-left: 11px; }
.inv-pill-ic { width: 14px; height: 14px; flex: none; }

.inv-card-pills .tag { gap: 5px; }
.inv-card-inv { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 11px; }
.inv-inv-state {
  display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  background: var(--color-neutral-100); border: 1px solid var(--color-divider); color: var(--color-neutral-700);
}
.inv-card-inv button { font-size: 11px; padding: 3px 8px; }

.inv-card-acomp { font-size: 12px; color: var(--color-neutral-700); }
.inv-card-acomp-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }

.inv-card-mesa { display: flex; align-items: center; gap: 8px; }
.inv-card-mesa-lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-700); }
.inv-card-mesa select { padding: 5px 8px; font-size: 12px; flex: 1; min-height: 34px; }

/* Chevron propio para los <select> (el nativo abarata el conjunto). */
.inv-card-mesa select, .inv-table select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a8f7e' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center; background-size: 11px;
}

/* Control de confirmación Sí / Pendiente / No: pastillas con color semántico
   sobre un carril suave. El seleccionado toma su color (verde/dorado/neutro). */
.inv-card-rsvp {
  width: 100%; overflow: visible; gap: 3px; padding: 3px;
  background: color-mix(in srgb, var(--color-text) 5%, transparent);
  border-color: var(--color-divider);
}
.inv-card-rsvp .seg-opt {
  flex: 1; min-height: 32px; border-radius: 999px; font-weight: 600;
  color: var(--color-neutral-700);
  transition: background .16s ease, color .16s ease, box-shadow .16s ease;
}
.inv-card-rsvp .seg-opt:hover { background: color-mix(in srgb, var(--color-text) 7%, transparent); }
.inv-card-rsvp .seg-opt:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.inv-card-rsvp .seg-opt[aria-selected="true"] { color: var(--color-surface); box-shadow: var(--shadow-sm); }
.inv-card-rsvp .seg-opt[data-set="confirmado"][aria-selected="true"] { background: var(--rsvp-si-dot); }
.inv-card-rsvp .seg-opt[data-set="pendiente"][aria-selected="true"] { background: var(--color-accent); }
.inv-card-rsvp .seg-opt[data-set="no"][aria-selected="true"] { background: color-mix(in srgb, var(--color-text) 42%, transparent); }

/* ---------- Tabla (modo listado) ---------- */
.inv-table-wrap { overflow-x: auto; padding-top: var(--space-2); }
table.inv-table { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 13px; background: var(--color-surface); }
.inv-table thead tr { background: var(--color-text); }
.inv-table thead th {
  text-align: left; font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--color-surface); padding: var(--space-3) var(--space-2); white-space: nowrap;
}
.inv-table thead th:first-child { padding-left: var(--space-3); }
.inv-table thead th:last-child { padding-right: var(--space-3); }
.inv-table tbody td { padding: var(--space-2); border-bottom: 1px solid var(--color-divider); vertical-align: middle; }
.inv-table tbody td:first-child { padding-left: var(--space-3); }
.inv-table tbody td:last-child { padding-right: var(--space-3); }
.inv-table tbody tr:nth-child(even) { background: var(--color-neutral-100); }
.inv-table tbody tr:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
.inv-table tbody tr[data-rsvp="no"] { opacity: .72; }
.inv-table tbody tr[data-rsvp="no"]:hover { opacity: 1; }
.inv-table-who { display: flex; align-items: center; gap: 10px; }
.inv-table-id { min-width: 0; display: flex; flex-direction: column; }
.inv-table-nombre { font-family: var(--font-heading); font-weight: 600; font-size: 15px; }
.inv-table-meta { font-size: 11px; }
.inv-table-num { font-variant-numeric: tabular-nums; }
.inv-table select { padding: 6px 10px; font-size: 12px; min-height: 34px; }

/* ---------- Vacío y pie ---------- */
#empty { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); }
#empty:empty { display: none; }
.inv-foot { padding: var(--space-4) 0 var(--space-8); }

/* ---------- Alta de invitado (dentro de modal-dialog) ---------- */
.inv-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); padding: var(--space-4) 0; }
.inv-add-span2 { grid-column: span 2; }
.inv-add-foot { display: flex; gap: var(--space-2); align-items: center; border-top: 2px solid var(--color-divider); padding-top: var(--space-3); }
.inv-add-foot button { margin-left: auto; }
`;
