import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Salón (componente único). Prefijo `sal-`. Solo tokens (claro/oscuro).
 * Sillas por lado con `--lado-*`; sobrecupo con `--color-accent`.
 */
export const styles = css`
:host { display: block; }

/* Barra de herramientas: toggle Plano/Listado + tira de stats + añadir mesa */
.sal-toolbar { display: flex; align-items: center; gap: var(--space-4) var(--space-6); flex-wrap: wrap; padding: var(--space-6) 0 var(--space-3); border-bottom: 1px solid var(--color-divider); }
.sal-legend { margin-left: auto; display: flex; align-items: center; gap: var(--space-4); font-size: 12px; }
.sal-legend-help { max-width: 30ch; }
@media (max-width: 1180px) { .sal-legend-help { display: none; } }
.sal-statstrip { display: flex; gap: var(--space-6); flex-wrap: wrap; align-items: baseline; }
.sal-mini { display: flex; flex-direction: column; gap: 1px; }
.sal-mini-value { font-family: var(--font-heading); font-weight: 600; font-size: 22px; line-height: 1; font-variant-numeric: tabular-nums; }
.sal-mini-label { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--color-neutral-700); white-space: nowrap; }

/* ---------- Rejilla: escenario + aside lateral ---------- */
.sal-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
@media (max-width: 920px) { .sal-grid { grid-template-columns: 1fr; } }

/* ---------- Plano (ajustado a la altura de pantalla) ---------- */
.sal-plano {
  position: relative; width: 100%; height: min(74vh, 760px); min-height: 440px; max-height: 92vh;
  overflow: hidden; resize: vertical;
  background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 20px;
  touch-action: none; box-shadow: 0 1px 3px color-mix(in srgb, var(--color-text) 8%, transparent);
}
/* Tirador de redimensionado en la esquina inferior derecha */
.sal-plano::after {
  content: ''; position: absolute; right: 4px; bottom: 4px; width: 14px; height: 14px; pointer-events: none; z-index: 5;
  background:
    linear-gradient(135deg, transparent 40%, var(--color-neutral-600) 40%, var(--color-neutral-600) 52%, transparent 52%,
    transparent 66%, var(--color-neutral-600) 66%, var(--color-neutral-600) 78%, transparent 78%);
  opacity: .55;
}
.sal-plano-grid { position: absolute; inset: 0; background-image: radial-gradient(var(--color-divider) 1px, transparent 1px); background-size: 28px 28px; opacity: .45; }
.sal-plano-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 35%, color-mix(in srgb, var(--color-surface) 90%, transparent), color-mix(in srgb, var(--color-accent-100) 55%, transparent)); }
.sal-plano-inner1 { position: absolute; inset: 14px; border: 1px solid var(--color-divider); border-radius: 14px; pointer-events: none; }
.sal-plano.is-panning { cursor: grabbing; }

/* Capa de lienzo (zoom + desplazamiento) */
.sal-canvas { position: absolute; inset: 0; transform-origin: 0 0; }

/* Filtro del buscador: atenúa las mesas que no coinciden */
.sal-mesa-wrap.is-dimmed { opacity: .14; pointer-events: none; transition: opacity .15s ease; }

/* Controles de zoom */
.sal-zoom { position: absolute; right: 16px; top: 16px; z-index: 6; display: flex; align-items: center; gap: 2px; background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 999px; padding: 2px; box-shadow: var(--shadow-sm); }
.sal-zoom button { border: 0; background: none; cursor: pointer; font-family: var(--font-body); font-size: 15px; color: var(--color-text); width: 26px; height: 26px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
.sal-zoom button:hover { background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
.sal-zoom .sal-zoom-pct { width: auto; padding: 0 8px; font-size: 11px; font-variant-numeric: tabular-nums; }

/* Guías de alineación al mover mesas */
.sal-guide { position: absolute; z-index: 1; background: var(--color-accent); opacity: .5; pointer-events: none; }
.sal-guide-v { top: 0; bottom: 0; width: 1px; }
.sal-guide-h { left: 0; right: 0; height: 1px; }
.sal-guide[hidden] { display: none; }
.sal-plano-tools { position: absolute; left: 22px; top: 22px; z-index: 6; display: flex; gap: 6px; flex-wrap: wrap; max-width: 60%; }
.sal-auto { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; padding: 6px 12px; }
.sal-bg { position: absolute; inset: 0; background-size: contain; background-position: center; background-repeat: no-repeat; }
.sal-presidencia {
  position: absolute; left: 50%; top: 14px; transform: translateX(-50%); z-index: 2;
  padding: 6px 24px; background: var(--color-accent-100); color: var(--color-accent-700);
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase; border-radius: 0 0 10px 10px;
  border: 1px solid var(--color-accent-200); border-top: none;
}
.sal-pista {
  position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); width: 32%; height: 19%;
  border: 1px dashed var(--color-accent-300); border-radius: 10px; display: flex; align-items: flex-end;
  justify-content: center; padding-bottom: 8px; color: var(--color-neutral-700);
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
}
.sal-barra {
  position: absolute; right: 26px; top: 50px; width: 13%; height: 11%;
  border: 1px dashed var(--color-divider); border-radius: 8px; display: flex; align-items: center;
  justify-content: center; color: var(--color-neutral-700); font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase;
}

.sal-plano-grid.is-plain { opacity: .3; }

/* ---------- Editor de sala (zonas) ---------- */
.sal-zona-sel { font-size: 10px; letter-spacing: .04em; padding: 6px 8px; border-radius: 8px; background: var(--color-surface); border: 1px solid var(--color-divider); color: var(--color-text); max-width: 160px; cursor: pointer; }
.sal-zonas { position: absolute; inset: 0; pointer-events: none; }
.sal-zona {
  position: absolute; transform: translate(-50%, -50%); z-index: 2; pointer-events: auto;
  display: flex; align-items: center; justify-content: center; text-align: center;
  border-radius: 12px; cursor: grab; user-select: none; touch-action: none;
  background: color-mix(in srgb, var(--color-neutral-600) 12%, transparent);
  border: 1.5px dashed color-mix(in srgb, var(--color-neutral-600) 55%, transparent);
  color: var(--color-neutral-700);
}
.sal-zona:active { cursor: grabbing; }
.sal-zona-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; line-height: 1.15; padding: 2px 6px; pointer-events: none; }
.zona-pista { border-radius: 50% / 42%; background: color-mix(in srgb, var(--color-accent) 12%, transparent); border-color: color-mix(in srgb, var(--color-accent) 55%, transparent); color: var(--color-accent-700); }
.zona-escenario { background: color-mix(in srgb, var(--color-secondary) 16%, transparent); border-color: color-mix(in srgb, var(--color-secondary) 60%, transparent); color: color-mix(in srgb, var(--color-secondary) 72%, var(--color-text)); }
.zona-sala { z-index: 1; background: none; border: 2px solid color-mix(in srgb, var(--color-neutral-600) 60%, transparent); border-radius: 16px; align-items: flex-start; justify-content: flex-start; }
.zona-sala .sal-zona-lbl { color: var(--color-neutral-600); }
.sal-zona.is-sel { border-style: solid; border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent); z-index: 5; }
/* Tiradores (solo al seleccionar) */
.sal-zona-del, .sal-zona-h { display: none; }
.sal-zona.is-sel .sal-zona-del { display: flex; }
.sal-zona.is-sel .sal-zona-h { display: block; }
.sal-zona-del { position: absolute; top: -10px; right: -10px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-accent-700); cursor: pointer; align-items: center; justify-content: center; font-size: 13px; line-height: 1; z-index: 6; }
.sal-zona-h { position: absolute; background: var(--color-surface); border: 1.5px solid var(--color-accent); z-index: 6; }
.sal-zona-resize { right: -7px; bottom: -7px; width: 13px; height: 13px; border-radius: 3px; cursor: nwse-resize; }
.sal-zona-rot { left: 50%; top: -22px; transform: translateX(-50%); width: 13px; height: 13px; border-radius: 50%; cursor: grab; }
.sal-zona-rot::before { content: ''; position: absolute; left: 50%; top: 12px; width: 1px; height: 11px; background: var(--color-accent); transform: translateX(-50%); }

/* Mesa (envoltorio posicionado en % + cuerpo centrado + sillas) */
.sal-mesa-wrap { position: absolute; transform: translate(-50%, -50%); pointer-events: none; transition: left .5s cubic-bezier(.22,.61,.36,1), top .5s cubic-bezier(.22,.61,.36,1); }
.sal-mesa {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 3; pointer-events: auto;
  background: color-mix(in srgb, var(--color-text) 5%, var(--color-surface));
  border: 1px solid var(--color-divider); cursor: grab; user-select: none; touch-action: none;
  box-shadow: 0 3px 12px color-mix(in srgb, var(--color-text) 10%, transparent);
  transition: box-shadow .18s ease, border-color .18s ease;
}
.sal-mesa.is-round { border-radius: 50%; }
.sal-mesa.is-rect { border-radius: 16px; }
.sal-mesa:active { cursor: grabbing; }
.sal-mesa.is-sel { box-shadow: 0 0 0 1.5px var(--color-accent), 0 10px 26px color-mix(in srgb, var(--color-text) 20%, transparent); }
.sal-mesa.is-over { border-color: var(--color-accent); }
.sal-mesa.is-droppable { box-shadow: 0 0 0 1.5px var(--color-accent-300); }
.sal-mesa.is-drop-over { box-shadow: 0 0 0 2px var(--color-accent); }
.sal-mesa.is-found { box-shadow: 0 0 0 2px var(--color-accent), 0 0 0 7px color-mix(in srgb, var(--color-accent) 22%, transparent); }
.sal-card.is-found { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent); }
.sal-unassigned.is-drop-over { outline: 2px dashed var(--color-accent-300); outline-offset: 3px; border-radius: 10px; }
.sal-mesa-center {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 58%; height: 58%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; text-align: center; padding: 0 6px;
  background: var(--color-surface); box-shadow: inset 0 0 0 1px var(--color-divider), 0 1px 4px color-mix(in srgb, var(--color-text) 8%, transparent);
}
.sal-mesa.is-round .sal-mesa-center { border-radius: 50%; }
.sal-mesa.is-rect .sal-mesa-center { border-radius: 10px; width: 64%; height: 58%; }
.sal-mesa.is-over .sal-mesa-center { color: var(--color-accent-700); }
.sal-mesa-nombre { font-family: var(--font-heading); font-size: 15px; line-height: 1.05; }
.sal-mesa-plazas { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--color-neutral-700); font-variant-numeric: tabular-nums; }

/* Asiento ocupado: avatar (persona vista desde arriba) con hombros por lado */
.sal-av { position: absolute; width: 26px; height: 26px; z-index: 4; pointer-events: auto; cursor: grab; }
.sal-av:active { cursor: grabbing; }
.sal-av.is-dragging { opacity: .4; }
.sal-av { transition: scale .15s ease; }
.sal-av.is-found { outline: 2px solid var(--color-accent); outline-offset: 1px; border-radius: 50%; scale: 1.45; z-index: 6; }
.sal-av.sal-lado-novia { --sal-lado: var(--lado-novia); }
.sal-av.sal-lado-novio { --sal-lado: var(--lado-novio); }
.sal-av-body { position: absolute; left: 50%; bottom: 1px; transform: translateX(-50%); width: 22px; height: 15px; border-radius: 11px 11px 8px 8px; background: var(--sal-lado); }
.sal-av-head { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 15px; height: 15px; border-radius: 50%; background: color-mix(in srgb, var(--color-text) 68%, transparent); display: flex; align-items: center; justify-content: center; z-index: 1; }
.sal-av-face { width: 9px; height: 9px; border-radius: 50%; background: color-mix(in srgb, var(--color-accent) 34%, var(--color-surface)); }

/* Nombre del comensal alrededor de la mesa */
.sal-seat-name { position: absolute; z-index: 4; pointer-events: none; width: 60px; text-align: center; font-size: 9px; line-height: 1.05; letter-spacing: .01em; color: var(--color-text); }

/* Asiento vacío: círculo punteado con su número */
.sal-seat-empty {
  position: absolute; transform: translate(-50%, -50%); z-index: 2; pointer-events: none;
  width: 20px; height: 20px; border-radius: 50%; border: 1.5px dashed var(--color-divider);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--color-neutral-700); font-variant-numeric: tabular-nums;
}

.sal-leg { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.sal-leg-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-surface); }
.sal-leg-dot.sal-lado-novio { box-shadow: 0 0 0 2px var(--lado-novio) inset; }
.sal-leg-dot.sal-lado-novia { box-shadow: 0 0 0 2px var(--lado-novia) inset; }

/* Panel de la mesa seleccionada */
.sal-panel { background: var(--color-surface); border: 1px solid var(--color-accent-300); border-radius: 14px; padding: var(--space-4); box-shadow: var(--shadow-sm); }
.sal-panel-top { display: flex; align-items: flex-start; gap: var(--space-2); }
.sal-panel-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sal-panel-nombre { font-family: var(--font-heading); font-size: 20px; line-height: 1.1; }
.sal-panel-ocup { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--color-neutral-700); }
.sal-panel-close { flex: 0 0 auto; border: 0; background: none; cursor: pointer; font-size: 20px; line-height: 1; color: var(--color-neutral-700); padding: 0 2px; }
.sal-panel-close:hover { color: var(--color-text); }
.sal-panel-forma { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: var(--space-3); }
.sal-forma-lbl { font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); margin-right: 2px; }
.sal-forma-btn { border: 1px solid var(--color-divider); background: var(--color-surface); color: var(--color-text); border-radius: 999px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: var(--font-body); }
.sal-forma-btn:hover { border-color: var(--color-accent-300); }
.sal-forma-btn.is-active { border-color: var(--color-accent); background: var(--color-accent-100); color: var(--color-accent-700); }
.sal-rotar { font-size: 11px; padding: 4px 10px; }
.sal-panel-acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-3); }
.sal-panel-acts button { font-size: 11px; letter-spacing: .05em; padding: 6px 10px; }
.sal-panel-del { color: var(--color-accent-700); margin-left: auto; }
.sal-panel-guests { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-3); }
.sal-panel-add { margin-top: var(--space-3); }
.sal-panel-add .input { width: 100%; padding: 6px 10px; font-size: 13px; }
.sal-chip { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 10px; border-radius: 999px; }
.sal-chip-x { border: 0; background: none; color: inherit; cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px; }

/* ---------- Listado ---------- */
.sal-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 16px; }
.sal-card { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); display: flex; flex-direction: column; gap: 10px; }
.sal-card.is-drop-over { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent); }
.sal-card.is-droppable { border-color: var(--color-accent-300); }
.sal-card-top { display: flex; align-items: flex-start; gap: 8px; }
.sal-card-id { min-width: 0; flex: 1; }
.sal-card-nombre { font-family: var(--font-heading); font-size: 20px; padding: 4px 8px; border-color: transparent; background: transparent; width: 100%; }
.sal-card-ocup { font-size: 12px; padding-left: 8px; }
.sal-fill { height: 6px; border-radius: 999px; background: var(--color-neutral-200); overflow: hidden; }
.sal-fill-bar { display: block; height: 100%; background: var(--color-accent-300); transition: width .3s ease; }
.sal-fill-bar.is-over { background: var(--color-accent); }
.sal-card-aviso { font-size: 12px; color: var(--color-accent-700); }
.sal-card-guests { display: flex; flex-direction: column; gap: 6px; }
.sal-card-guests .sal-chip { justify-content: space-between; }
.sal-card-cap { margin-top: auto; }
.sal-card-cap .input { padding: 6px 10px; font-size: 13px; }

/* ---------- Aside "Sin asignar" ---------- */
.sal-aside { position: sticky; top: 80px; display: flex; flex-direction: column; gap: var(--space-3); max-height: calc(100vh - 96px); overflow: auto; }
#mesa-panel:empty, #salud:empty { display: none; }

/* Avisos / salud del plano */
.sal-salud { background: var(--color-accent-100); border: 1px solid var(--color-accent-200); border-radius: 14px; padding: var(--space-3) var(--space-4); }
.sal-salud-head { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: var(--color-accent-700); }
.sal-salud-n { background: var(--color-accent); color: var(--color-surface); border-radius: 999px; font-size: 11px; padding: 0 7px; font-variant-numeric: tabular-nums; }
.sal-salud-list { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.sal-aviso { font-size: 12.5px; color: var(--color-text); cursor: pointer; padding: 2px 0; }
.sal-aviso:hover { color: var(--color-accent-700); text-decoration: underline; }
.sal-aviso.is-warn::before { content: '⚠ '; }

/* Reglas de convivencia */
.sal-reglas { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); }
.sal-reglas-list { display: flex; flex-direction: column; gap: 6px; margin: var(--space-3) 0; }
.sal-regla { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 5px 8px; border-radius: 8px; background: var(--rsvp-si-bg); border: 1px solid var(--rsvp-si-line); }
.sal-regla.is-sep { background: var(--color-accent-100); border-color: var(--color-accent-200); }
.sal-regla-txt { flex: 1; min-width: 0; }
.sal-regla-x { border: 0; background: none; cursor: pointer; color: inherit; font-size: 14px; line-height: 1; padding: 0 2px; }
.sal-regla-add { display: flex; flex-direction: column; gap: 6px; }
.sal-regla-add .input { width: 100%; padding: 5px 8px; font-size: 12px; }
.sal-regla-add-btn { align-self: flex-start; padding: 5px 12px; font-size: 12px; }
.sal-sin { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); display: flex; flex-direction: column; flex: 0 0 auto; }
.sal-aside-head { display: flex; align-items: center; gap: var(--space-2); }
.sal-aside-title { margin: 0; font-size: 20px; flex: 1; }
.sal-autosentar { font-size: 12px; padding: 6px 12px; white-space: nowrap; }
.sal-aside-sub { font-size: 12px; margin-top: 2px; }
.sal-search { margin-top: var(--space-3); }
.sal-search .input { width: 100%; }
.sal-unassigned { display: flex; flex-direction: column; gap: 8px; margin-top: var(--space-3); overflow: auto; max-height: 42vh; }

/* Resumen de mesa (lado + menús) en el panel */
.sal-resumen { margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--color-divider); display: flex; flex-direction: column; gap: 5px; }
.sal-resumen-lado { display: flex; gap: var(--space-4); font-size: 13px; font-variant-numeric: tabular-nums; }
.sal-resumen-menus { font-size: 12px; }
.sal-guest { display: flex; align-items: center; gap: 8px; border: 1px solid var(--color-divider); border-left: 4px solid var(--color-divider); border-radius: 10px; padding: 8px 10px; cursor: grab; }
.sal-guest.is-dragging { opacity: .5; }
.sal-guest[hidden] { display: none; }
.sal-guest.is-found { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent); }
.sal-guest-txt { min-width: 0; }
.sal-guest-name { font-size: 13px; font-weight: 500; }
.sal-guest-grupo { font-size: 11px; }
.sal-guest-seat { margin-left: auto; padding: 6px 8px; font-size: 12px; width: 120px; flex: 0 0 auto; }

@media (prefers-reduced-motion: reduce) {
  .sal-mesa-wrap, .sal-fill-bar, .sal-mesa { transition: none; }
}
`;
