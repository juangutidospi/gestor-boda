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
.inv-stat-value { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; margin-top: 4px; white-space: nowrap; }
.inv-stat-note { display: block; }

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
.inv-grupo-sub { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-700); }
.inv-grupo-head::after { content: ''; flex: 1; height: 1px; background: var(--color-divider); min-width: 40px; }

/* ---------- Rejilla y tarjeta de invitado ---------- */
.inv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; padding-top: var(--space-3); }

.inv-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: var(--space-4); border-radius: 14px;
  border: 1px solid var(--color-divider); border-left: 4px solid var(--color-divider);
}
.inv-card-top { display: flex; align-items: flex-start; gap: var(--space-2); }
.inv-card-nombre { font-family: var(--font-heading); font-weight: 600; font-size: 20px; line-height: 1.15; }
.inv-card-meta { font-size: 12px; }
.inv-card-remove { margin-left: auto; font-size: 11px; padding: 4px 8px; }

.inv-card-pills { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.inv-pill {
  font-size: 11px; letter-spacing: .06em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px; border: 1px solid transparent;
}
.inv-pill-outline { background: transparent; }

.inv-card-inv { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 11px; }
.inv-inv-state {
  letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;
  background: var(--color-neutral-100); border: 1px solid var(--color-divider); color: var(--color-neutral-700);
}
.inv-card-inv button { font-size: 11px; padding: 3px 8px; }

.inv-card-acomp { font-size: 12px; color: var(--color-neutral-700); }
.inv-card-acomp-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }

.inv-card-mesa { display: flex; align-items: center; gap: 8px; }
.inv-card-mesa-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-700); }
.inv-card-mesa select { padding: 5px 8px; font-size: 12px; flex: 1; min-height: 34px; }

.inv-card-rsvp { width: 100%; }
.inv-card-rsvp .seg-opt { flex: 1; }

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
.inv-table-nombre { font-family: var(--font-heading); font-weight: 600; font-size: 15px; }
.inv-table-meta { font-size: 11px; }
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
