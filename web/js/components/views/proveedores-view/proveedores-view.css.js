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
.prov-card-top { display: flex; align-items: flex-start; gap: var(--space-2); }
.prov-card-id { display: flex; flex-direction: column; gap: 1px; }
.prov-card-cat { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-accent-700); }
.prov-card-id h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 22px; line-height: 1.15; }
.prov-card-contacto { font-size: 12px; }
.prov-card-top estado-badge { margin-left: auto; flex: 0 0 auto; }
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
`;
