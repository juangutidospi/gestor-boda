import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Finca (componente único). Reúne, re-namespaced con el
 * prefijo `fc-`, lo que antes vivía en finca-card/-table/-lightbox/-compare/
 * -detail, más el layout propio de la vista (filtros, stats, banner,
 * comparebar, toast). Solo tokens, salvo el overlay oscuro del lightbox
 * (excepción ya aceptada del prototipo).
 */
export const styles = css`
:host { display: block; }

/* Compensa el nav superior fijo (sticky en el light DOM) para que el título
   de la vista no quede tapado. */
.page-head { padding-top: var(--space-6); }

/* ---------- Banner de finca elegida ---------- */
.fc-banner {
  display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-end;
  padding: var(--space-4) var(--space-6); background: var(--color-accent); color: var(--color-surface);
  border-radius: var(--radius-md);
}
.fc-banner-kicker { display: block; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
.fc-banner-nombre { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 34px; line-height: 1.05; }
.fc-banner-stats { display: flex; gap: var(--space-6); font-size: 13px; }
.fc-banner-lbl { display: block; opacity: .8; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.fc-banner-val { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 18px; }
.fc-banner button { border: 1px solid var(--color-surface); color: var(--color-surface); background: transparent; }

/* ---------- Stats ---------- */
.fc-stats-row {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  border-top: 1px solid var(--color-divider); border-bottom: 1px solid var(--color-divider);
}
.fc-stat { padding: var(--space-4); border-left: 1px solid var(--color-divider); }
.fc-stat:first-child { border-left: 0; }
.fc-stat-label { display: block; font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.fc-stat-value { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; margin-top: 4px; white-space: nowrap; }
.fc-stat-note { display: block; }

/* ---------- Filtros ---------- */
.fc-filters { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-end; padding-bottom: var(--space-2); }
.fc-filters .field { min-width: 150px; }
.fc-search { flex: 1; min-width: 220px; }
.fc-invitados { width: 120px; }
.fc-view-toggle { margin-bottom: 1px; }
.fc-add { margin-left: auto; }

/* ---------- Rejilla y tarjeta (antes finca-card) ---------- */
.fc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
@media (max-width: 900px) { .fc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .fc-grid { grid-template-columns: 1fr; } }

.fc-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: var(--space-4); border-radius: 18px;
  background: var(--color-surface); border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
}
.fc-card-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.fc-card-tipo { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-neutral-700); }
.fc-card-cmp {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--color-neutral-700);
  cursor: pointer;
  input { width: 14px; height: 14px; accent-color: var(--color-accent); }
}
.fc-card h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 19px; }
.fc-card-zona { font-size: 12px; color: var(--color-text-muted); }
.fc-card-cover {
  height: 170px; border-radius: var(--radius-sm); overflow: hidden; cursor: pointer;
  background: var(--color-neutral-100); border: 1px solid var(--color-divider);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}
.fc-ph {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--color-neutral-600); text-align: center; padding: var(--space-2);
}
.fc-card-panel {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
  background: var(--color-accent-100); border-radius: 12px; padding: var(--space-3);
}
.fc-card-panel .fc-sep { border-left: 1px solid var(--color-divider); padding-left: var(--space-3); }
.fc-lbl { display: block; font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.fc-val { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 22px; }
.fc-sub { display: block; font-size: 11px; color: var(--color-text-muted); }
.fc-card-servicios { display: flex; flex-wrap: wrap; gap: 4px; }
.fc-card-foot {
  margin-top: auto; display: flex; align-items: center; gap: var(--space-2);
  padding-top: var(--space-2); border-top: 1px solid var(--color-divider);
  button { margin-left: auto; }
}

/* ---------- Tabla (antes finca-table) ---------- */
.fc-table-wrap { overflow-x: auto; }
table.fc-table { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 13px; }
.fc-table thead tr { background: var(--color-text); }
.fc-table thead th {
  text-align: left; font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--color-surface); padding: var(--space-3) var(--space-2); white-space: nowrap;
}
.fc-table thead th:first-child { padding-left: var(--space-3); width: 32px; }
.fc-table thead th:last-child { padding-right: var(--space-3); }
.fc-table tbody td { padding: var(--space-2); border-bottom: 1px solid var(--color-divider); vertical-align: middle; }
.fc-table tbody td:first-child { padding-left: var(--space-3); }
.fc-table tbody td:last-child { padding-right: var(--space-3); }
.fc-table tbody tr:nth-child(even) { background: var(--color-neutral-100); }
.fc-table tbody tr:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
.fc-table-nombre { font-family: var(--font-heading); font-weight: 600; }
.fc-table-tipo { font-size: 12px; color: var(--color-text-muted); }
.fc-table-coste { font-family: var(--font-heading); font-weight: 600; white-space: nowrap; }
.fc-table-precio { font-size: 12px; white-space: nowrap; }
.fc-table input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--color-accent); }

/* ---------- Vacío y pie ---------- */
.fc-empty { padding: var(--space-8) var(--space-6); border-bottom: 2px solid var(--color-divider); }
.fc-empty h3 { margin: 0; }
.fc-empty p { max-width: 40ch; }
.fc-foot { padding: var(--space-4) 0 var(--space-8); }

/* ---------- Barra de comparar ---------- */
.fc-comparebar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; justify-content: center; padding: var(--space-4); pointer-events: none; }
.fc-comparebar-inner {
  pointer-events: auto; display: flex; align-items: center; gap: var(--space-4);
  background: var(--color-text); color: var(--color-surface); padding: var(--space-3) var(--space-4);
  border-radius: 999px; box-shadow: var(--shadow-md);
}
.fc-comparebar-count { font-family: var(--font-heading); font-weight: 600; font-size: 14px; }
.fc-comparebar-names { font-size: 12px; opacity: .7; }
.fc-comparebar-inner button { color: var(--color-surface); border: 1px solid var(--color-neutral-600); }

/* ---------- Comparador (antes finca-compare, dentro de modal-dialog) ---------- */
.fc-compare-hint { margin: 0 0 var(--space-3); font-size: 13px; color: var(--color-text-muted); }
.fc-compare-wrap { overflow-x: auto; }
table.fc-compare-table { width: 100%; min-width: 480px; border-collapse: collapse; font-size: 13px; }
.fc-compare-table thead th {
  text-align: left; font-size: 12px; color: var(--color-text);
  padding: var(--space-2); border-bottom: 2px solid var(--color-divider); white-space: nowrap;
}
.fc-compare-crit { width: 190px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-neutral-700); }
.fc-compare-table tbody td { padding: var(--space-2); border-bottom: 1px solid var(--color-divider); vertical-align: middle; }
.fc-compare-label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-neutral-700); }
.fc-compare-table tbody tr:nth-child(even) { background: var(--color-neutral-100); }

/* ---------- Añadir finca (dentro de modal-dialog) ---------- */
.fc-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); padding: var(--space-4) 0; }
.fc-add-span2 { grid-column: span 2; }
.fc-add-foot { display: flex; gap: var(--space-2); align-items: center; border-top: 2px solid var(--color-divider); padding-top: var(--space-3); }
.fc-add-hint { max-width: 34ch; }
.fc-add-foot button { margin-left: auto; }

/* ---------- Ficha a pantalla completa (antes finca-detail) ---------- */
.fc-detail {
  position: fixed; inset: 0; z-index: 50; background: var(--color-bg);
  overflow: auto; animation: fc-fade .14s ease-out;
  display: flex; flex-direction: column;
}
.fc-detail-head {
  position: sticky; top: 0; z-index: 5; display: flex; align-items: center; flex-wrap: wrap;
  gap: var(--space-2); padding: var(--space-3) var(--space-6);
  background: var(--color-surface); border-bottom: 1px solid var(--color-divider);
}
.fc-detail-nombre { font-family: var(--font-heading); font-size: 20px; margin-left: var(--space-2); }
.fc-detail-badge { margin-left: auto; }
.fc-detail-body { max-width: 1200px; margin: 0 auto; padding: 0 var(--space-6) 140px; width: 100%; }
.fc-detail-titlebar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); padding: var(--space-8) 0 var(--space-4); }
.fc-detail-tipo { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-accent-700); }
.fc-detail-titlebar h1 { margin: 4px 0 2px; font-size: clamp(32px, 5vw, 56px); font-family: var(--font-heading); font-weight: 600; }
.fc-detail-sub { font-size: 14px; }
.fc-detail-costebox { margin-left: auto; text-align: right; }
.fc-detail-costebox .fc-val { font-size: 36px; line-height: 1; }
.fc-detail-cover {
  position: relative; aspect-ratio: 16 / 7; background: var(--color-neutral-200);
  border: 1px solid var(--color-divider); border-radius: 18px; overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}
.fc-detail-section { padding: var(--space-6) 0 0; }
.fc-detail-section h5 { margin: 0 0 var(--space-3); }
.fc-detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 12px; margin-top: var(--space-3); }
.fc-detail-grid figure { margin: 0; }
.fc-detail-grid figcaption { font-size: 11px; padding: 6px 2px 0; }
.fc-detail-foto {
  aspect-ratio: 3 / 2; border-radius: 12px; overflow: hidden; background: var(--color-neutral-200); cursor: zoom-in;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}
.fc-detail-tour { grid-column: span 2; }
.fc-detail-tour a {
  display: block; position: relative; aspect-ratio: 3 / 2; border-radius: 12px; overflow: hidden;
  background: var(--color-neutral-200); border: 1px solid var(--color-accent-300);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}
.fc-detail-tour-badge {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  span {
    background: var(--color-surface); color: var(--color-text); font-size: 12px; letter-spacing: .1em;
    text-transform: uppercase; padding: 10px 18px; border-radius: 999px; box-shadow: var(--shadow-sm);
  }
}
.fc-detail-sinfotos { font-size: 12px; margin: var(--space-3) 0 0; }
.fc-detail-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-6); padding-top: var(--space-8); }
.fc-detail-cols h5 { margin: 0 0 var(--space-2); }
.fc-detail-cols h5.mt { margin-top: var(--space-6); }
table.fc-detail-table { width: 100%; border-collapse: collapse; background: var(--color-surface); }
.fc-detail-table td { padding: var(--space-2) 0; border-bottom: 1px solid var(--color-divider); }
.fc-detail-table td.k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-neutral-700); width: 45%; }
.fc-detail-table td.v { font-family: var(--font-heading); font-weight: 600; }
.fc-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.fc-detail-actionbar {
  position: fixed; left: 0; right: 0; bottom: 0; background: var(--color-surface);
  border-top: 1px solid var(--color-divider); padding: var(--space-4) var(--space-6);
  display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center;
}
.fc-detail-nombre-mini { font-size: 12px; margin-right: var(--space-3); }
.fc-detail-actionbar #detail-elegir { margin-left: auto; }

/* ---------- Visor de fotos (antes finca-lightbox). Fondo oscuro: excepción
   de tokens ya aceptada para overlays de foto a pantalla completa. ---------- */
.fc-lightbox {
  position: fixed; inset: 0; z-index: 90; background: #2b231b;
  display: flex; flex-direction: column; animation: fc-fade .12s ease-out;
}
.fc-lightbox-head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); color: #f8f6ee; }
.fc-lightbox-pie { font-family: var(--font-heading); font-size: 18px; }
.fc-lightbox-contador { font-size: 12px; opacity: .7; }
.fc-lightbox-close { margin-left: auto; color: #f8f6ee; border: 1px solid rgba(248, 246, 238, .4); background: transparent; }
.fc-lightbox-stage {
  flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
  gap: var(--space-3); padding: 0 var(--space-4) var(--space-6);
  img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; border-radius: 8px; }
}
.fc-lightbox-nav {
  color: #f8f6ee; border: 1px solid rgba(248, 246, 238, .4); background: transparent;
  flex: 0 0 auto; min-height: 40px; padding: 0 16px; border-radius: 999px; cursor: pointer;
  font-family: var(--font-body); font-size: 13px;
}

/* ---------- Toast ---------- */
.fc-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 120;
  display: none; padding: 10px 16px; border-radius: 999px; font-size: 13px;
  background: var(--color-text); color: var(--color-surface); box-shadow: var(--shadow-md);
}
.fc-toast[data-open="true"] { display: block; animation: fc-rise .2s ease; }

@keyframes fc-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes fc-rise {
  from { opacity: 0; transform: translateX(-50%) translateY(8px) }
  to { opacity: 1; transform: translateX(-50%) translateY(0) }
}
`;
