import { css } from '../../../core/css.js';

/** Estilos de la vista de tabla de fincas. Solo tokens. */
export const styles = css`
:host { display: block; }
.wrap { overflow-x: auto; }
table.table {
  width: 100%; min-width: 900px; border-collapse: collapse; font-size: 13px;
}
thead tr { background: var(--color-text); }
thead th {
  text-align: left; font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--color-surface); padding: var(--space-3) var(--space-2); white-space: nowrap;
}
thead th:first-child { padding-left: var(--space-3); width: 32px; }
thead th:last-child { padding-right: var(--space-3); }
tbody td {
  padding: var(--space-2); border-bottom: 1px solid var(--color-divider); vertical-align: middle;
}
tbody td:first-child { padding-left: var(--space-3); }
tbody td:last-child { padding-right: var(--space-3); }
tbody tr:nth-child(even) { background: var(--color-neutral-100); }
tbody tr:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
.nombre { font-family: var(--font-heading); font-weight: 600; }
.tipo { font-size: 12px; color: var(--color-text-muted); }
.coste { font-family: var(--font-heading); font-weight: 600; white-space: nowrap; }
.precio { font-size: 12px; white-space: nowrap; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--color-accent); }
`;
