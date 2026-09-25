import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Timing (componente único). Prefijo `tl-`. Solo tokens (claro/oscuro).
 * Línea de tiempo agrupada por bloque; cada bloque define su color en `--tl-c` (degradado
 * salvia → terracota). "Ahora" y hora dorada se marcan en el momento que las contiene.
 */
export const styles = css`
:host { display: block; }

/* Barra de herramientas */
.tl-toolbar { display: flex; align-items: center; gap: var(--space-4) var(--space-6); flex-wrap: wrap; padding: var(--space-6) 0 var(--space-3); border-bottom: 1px solid var(--color-divider); }
.tl-statstrip { display: flex; gap: var(--space-6); flex-wrap: wrap; align-items: baseline; }
.tl-mini { display: flex; flex-direction: column; gap: 1px; }
.tl-mini-value { font-family: var(--font-heading); font-weight: 600; font-size: 22px; line-height: 1; font-variant-numeric: tabular-nums; }
.tl-mini-label { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--color-neutral-700); white-space: nowrap; }
.tl-tools { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.tl-search { width: 170px; max-width: 40vw; }

/* Rejilla: escena + aside */
.tl-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 24px; align-items: start; padding-top: var(--space-6); }
@media (max-width: 920px) { .tl-grid { grid-template-columns: 1fr; } }

/* Colores por bloque (degradado del día) */
.bloque-preparativos { --tl-c: var(--color-secondary); }
.bloque-ceremonia { --tl-c: color-mix(in srgb, var(--color-secondary) 45%, var(--color-accent)); }
.bloque-celebracion { --tl-c: var(--color-accent); }
.bloque-fiesta { --tl-c: var(--color-accent-700); }

.tl-empty { padding: 12vh 0; text-align: center; font-size: 15px; }

/* ---------- Línea de tiempo por bloque ---------- */
.tl-stage { display: flex; flex-direction: column; gap: var(--space-8); }

.tl-block-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: var(--space-3); padding-bottom: 8px; border-bottom: 1px solid var(--color-divider); }
.tl-block-icon { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; align-self: center; background: color-mix(in srgb, var(--tl-c) 16%, var(--color-surface)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tl-c) 45%, transparent); }
.tl-block-name { font-family: var(--font-heading); font-size: 22px; margin: 0; color: color-mix(in srgb, var(--tl-c) 55%, var(--color-text)); }
.tl-block-meta { margin-left: auto; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--color-neutral-700); font-variant-numeric: tabular-nums; }

/* Rail vertical con conector */
.tl-rows { position: relative; display: flex; flex-direction: column; gap: 12px; }
.tl-rows::before { content: ''; position: absolute; left: calc(64px + 9px); top: 6px; bottom: 6px; width: 2px; background: linear-gradient(var(--color-divider), color-mix(in srgb, var(--color-divider) 30%, transparent)); }

/* Tarjeta de momento */
.tl-card { position: relative; display: grid; grid-template-columns: 64px 20px minmax(0, 1fr); align-items: start; gap: 8px; }
.tl-card-time { display: flex; flex-direction: column; align-items: flex-end; padding-top: 12px; text-align: right; }
.tl-time-ini { font-family: var(--font-heading); font-weight: 600; font-size: 16px; line-height: 1; font-variant-numeric: tabular-nums; }
.tl-time-fin { font-size: 10px; font-variant-numeric: tabular-nums; margin-top: 2px; }
.tl-now { margin-top: 5px; font-size: 9px; letter-spacing: .11em; text-transform: uppercase; font-weight: 800; color: var(--color-surface); background: var(--color-accent); border-radius: 999px; padding: 2px 9px; box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent) 45%, transparent); }

.tl-dot { position: relative; z-index: 1; width: 14px; height: 14px; margin: 15px auto 0; border-radius: 50%; background: var(--tl-c); box-shadow: 0 0 0 3px var(--color-bg), 0 0 0 4px color-mix(in srgb, var(--tl-c) 35%, transparent); }

.tl-card-body {
  background: var(--color-surface); border: 1px solid var(--color-divider); border-left: 3px solid var(--tl-c);
  border-radius: 12px; padding: 10px 14px; box-shadow: 0 1px 2px color-mix(in srgb, var(--color-text) 6%, transparent);
  transition: box-shadow .2s ease, border-color .2s ease, transform .2s ease;
}
.tl-card.is-now .tl-card-body {
  border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-divider));
  background: color-mix(in srgb, var(--color-accent) 6%, var(--color-surface));
  box-shadow:
    0 2px 6px color-mix(in srgb, var(--color-accent) 16%, transparent),
    0 10px 24px color-mix(in srgb, var(--color-accent) 20%, transparent),
    0 26px 50px color-mix(in srgb, var(--color-text) 14%, transparent);
  transform: translateY(-1px);
}
.tl-card.is-now .tl-card-titulo, .tl-card.is-now .tl-time-ini { color: var(--color-accent-700); }
.tl-card.is-now .tl-time-fin { color: color-mix(in srgb, var(--color-accent-700) 70%, transparent); }
.tl-card.is-now .tl-dot { width: 18px; height: 18px; margin-top: 13px; background: var(--color-accent); box-shadow: 0 0 0 3px var(--color-bg), 0 0 0 5px color-mix(in srgb, var(--color-accent) 40%, transparent); }
.tl-card.is-now .tl-dot::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 2px solid var(--color-accent); animation: tl-radar 1.8s ease-out infinite; }
@keyframes tl-radar { 0% { transform: scale(.75); opacity: .85; } 100% { transform: scale(1.9); opacity: 0; } }
/* Sobre 'hecho' gana 'ahora' (se está tildando en el momento en curso) */
.tl-card.is-now.estado-hecho .tl-card-body { opacity: 1; }
.tl-card.is-editing .tl-card-body { border-color: color-mix(in srgb, var(--tl-c) 60%, transparent); box-shadow: 0 6px 20px color-mix(in srgb, var(--color-text) 12%, transparent); }
.tl-card-top { display: flex; align-items: center; gap: 10px; }
.tl-card-titulo { font-family: var(--font-heading); font-size: 18px; line-height: 1.1; flex: 1; min-width: 0; }
.tl-dorada-chip { flex: 0 0 auto; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; font-weight: 700; color: #8a6317; background: color-mix(in srgb, #f0cf6a 55%, var(--color-surface)); border: 1px solid color-mix(in srgb, #e0a92e 60%, transparent); border-radius: 999px; padding: 2px 8px; }
.tl-card-dur { flex: 0 0 auto; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: color-mix(in srgb, var(--tl-c) 60%, var(--color-text)); background: color-mix(in srgb, var(--tl-c) 12%, var(--color-surface)); border-radius: 999px; padding: 2px 9px; font-variant-numeric: tabular-nums; }
.tl-card-acts { flex: 0 0 auto; display: flex; gap: 2px; opacity: 0; transition: opacity .15s ease; }
.tl-card:hover .tl-card-acts, .tl-card.is-editing .tl-card-acts { opacity: 1; }
.tl-act { border: 0; background: none; cursor: pointer; color: var(--color-neutral-700); width: 24px; height: 24px; border-radius: 6px; font-size: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
.tl-act:hover { background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-text); }
.tl-act-del:hover { color: var(--color-accent-700); }
.tl-card-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; font-size: 12.5px; }
.tl-meta-resp { display: inline-flex; align-items: center; gap: 6px; }
.tl-resp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tl-c); }
.tl-card-note { margin-top: 6px; font-size: 12.5px; color: var(--color-neutral-700); }

/* Estado del día D */
.tl-estado { flex: 0 0 auto; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--tl-c) 55%, transparent); background: var(--color-surface); color: color-mix(in srgb, var(--tl-c) 60%, var(--color-text)); cursor: pointer; font-size: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
.tl-estado:hover { background: color-mix(in srgb, var(--tl-c) 12%, transparent); }
.estado-curso .tl-estado { background: color-mix(in srgb, var(--tl-c) 18%, var(--color-surface)); }
.estado-hecho .tl-estado { background: var(--tl-c); border-color: var(--tl-c); color: var(--color-surface); }
.estado-hecho .tl-card-body { opacity: .62; }
.estado-hecho .tl-card-titulo { text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--color-text) 40%, transparent); }
.estado-curso .tl-card-body { border-left-width: 5px; }

/* Avatar del responsable + contacto */
.tl-avatar { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-size: 8.5px; font-weight: 700; letter-spacing: .02em; color: var(--color-surface); background: var(--tl-c); }
.tl-contacto { margin-left: 4px; text-decoration: none; color: var(--color-neutral-700); font-size: 12px; }
.tl-contacto:hover { color: var(--color-accent-700); }

/* Indicadores de arrastre */
.tl-card { transition: opacity .12s ease; }
.tl-card.is-dragging { opacity: .45; }
.tl-card.is-drop-before .tl-card-body { box-shadow: inset 0 3px 0 var(--color-accent); }
.tl-card.is-drop-after .tl-card-body { box-shadow: inset 0 -3px 0 var(--color-accent); }
.tl-card-body { cursor: grab; }
.tl-card.is-editing .tl-card-body { cursor: default; }

/* Panel "En vivo" */
.tl-live { background: linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)), var(--color-surface)); }
.tl-live-head { display: flex; align-items: center; gap: 7px; font-family: var(--font-heading); font-size: 18px; margin-bottom: 8px; }
.tl-live-pulse { width: 9px; height: 9px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 60%, transparent); animation: tl-pulse 2s infinite; }
@keyframes tl-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 55%, transparent); } 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.tl-live-body { display: flex; flex-direction: column; gap: 2px; }
.tl-live-lbl { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; margin-top: 6px; }
.tl-live-now { font-family: var(--font-heading); font-size: 19px; line-height: 1.1; }
.tl-live-next { font-size: 13.5px; }
.tl-live-next b { color: var(--color-accent-700); font-weight: 600; }
.tl-live-soon { font-family: var(--font-heading); font-size: 17px; }
.tl-live-bar { height: 6px; border-radius: 999px; background: var(--color-neutral-200); overflow: hidden; margin-top: 12px; }
.tl-live-fill { display: block; height: 100%; background: var(--color-accent); border-radius: 999px; transition: width .5s ease; }
.tl-live-pct { font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; margin-top: 4px; }

.tl-aviso-contrato { background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface)); border: 1px solid var(--color-accent-300); color: var(--color-accent-700); }
.tl-aviso-contrato::before { content: '◇ '; }

/* Panel de edición en línea */
.tl-edit { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--color-divider); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 10px; align-items: end; }
.tl-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tl-field > span { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--color-neutral-700); }
.tl-field .input { width: 100%; padding: 6px 8px; font-size: 13px; }
.tl-f-titulo, .tl-f-nota, .tl-f-resp { grid-column: 1 / -1; }
.tl-done { grid-column: 1 / -1; justify-self: end; padding: 5px 14px; font-size: 14px; }

/* ---------- Vista por responsable ---------- */
.tl-resp { display: flex; flex-direction: column; gap: var(--space-4); }
.tl-resp-group { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); }
.tl-resp-group.is-none { border-style: dashed; }
.tl-resp-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.tl-resp-name { font-family: var(--font-heading); font-size: 19px; margin: 0; }
.tl-resp-meta { margin-left: auto; font-size: 11px; letter-spacing: .04em; }
.tl-resp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.tl-resp-item { display: flex; align-items: baseline; gap: 10px; padding: 5px 10px; border-left: 3px solid var(--tl-c); border-radius: 6px; background: color-mix(in srgb, var(--tl-c) 6%, transparent); }
.tl-resp-hora { font-variant-numeric: tabular-nums; font-size: 12px; color: color-mix(in srgb, var(--tl-c) 55%, var(--color-text)); font-weight: 600; flex: 0 0 auto; }
.tl-resp-tit { font-size: 13.5px; }
.tl-resp-lugar { margin-left: auto; font-size: 12px; }

/* ---------- Aside ---------- */
.tl-aside { position: sticky; top: 80px; display: flex; flex-direction: column; gap: var(--space-3); }
.tl-panel { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); }
.tl-panel-title { margin: 0 0 8px; font-family: var(--font-heading); font-size: 18px; display: flex; align-items: center; gap: 6px; }

/* Cuenta atrás */
.tl-count { background: linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 12%, var(--color-surface)), var(--color-surface)); }
.tl-count-big { font-family: var(--font-heading); font-weight: 600; font-size: 46px; line-height: 1; color: var(--color-accent-700); font-variant-numeric: tabular-nums; }
.tl-count-sub { font-size: 12px; margin-top: 2px; }
.tl-count-fields { display: flex; gap: 8px; margin-top: 12px; }
.tl-count-fields .tl-field { flex: 1; }

.tl-resumen-rango { font-size: 13px; color: var(--color-neutral-700); }
.tl-resumen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.tl-resumen-cell { display: flex; flex-direction: column; gap: 1px; }
.tl-resumen-v { font-family: var(--font-heading); font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
.tl-resumen-l { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
.tl-resumen-bloques { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px solid var(--color-divider); display: flex; flex-direction: column; gap: 7px; }
.tl-resumen-bloque { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.tl-resumen-dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: var(--tl-c); }
.tl-resumen-bnombre { font-weight: 500; }
.tl-resumen-bmeta { margin-left: auto; font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }

.tl-avisos-n { background: var(--color-accent); color: var(--color-surface); border-radius: 999px; font-size: 11px; padding: 0 7px; font-variant-numeric: tabular-nums; }
.tl-avisos-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.tl-aviso { font-size: 12.5px; padding: 6px 9px; border-radius: 8px; }
.tl-aviso-hueco { background: var(--color-accent-100); border: 1px solid var(--color-accent-200); color: var(--color-text); }
.tl-aviso-hueco::before { content: '◔ '; color: var(--color-accent-700); }
.tl-aviso-solape { background: color-mix(in srgb, var(--color-accent) 16%, var(--color-surface)); border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent); color: var(--color-accent-700); }
.tl-aviso-solape::before { content: '⚠ '; }
.tl-aviso-doble { background: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface)); border: 1px solid var(--color-accent); color: var(--color-accent-700); font-weight: 500; }
.tl-aviso-doble::before { content: '⚑ '; }
.tl-ok { font-size: 12.5px; margin: 0; }
.tl-avisos.is-ok { background: var(--rsvp-si-bg); border-color: var(--rsvp-si-line); }

.tl-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.tl-legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.tl-legend-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--tl-c); }

@media (max-width: 560px) {
  .tl-edit { grid-template-columns: 1fr; }
  .tl-count-fields { flex-direction: column; }
  .tl-card { grid-template-columns: 52px 16px minmax(0, 1fr); }
  .tl-rows::before { left: calc(52px + 7px); }
}
@media (prefers-reduced-motion: reduce) {
  .tl-card-body, .tl-card-acts { transition: none; }
  .tl-card.is-now .tl-dot::after, .tl-live-pulse { animation: none; }
}
`;
