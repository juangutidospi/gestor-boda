import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Salón (componente único). Prefijo `sal-`. Solo tokens (claro/oscuro).
 * Sillas por lado con `--lado-*`; sobrecupo con `--color-accent`.
 */
export const styles = css`
:host { display: block; }

.page-head { padding-top: var(--space-6); }
/* Fila: título a la izquierda, acciones a la derecha (sobrescribe el column del .page-head base). */
.sal-head { flex-direction: row; flex-wrap: wrap; gap: var(--space-4); align-items: flex-end; }
.sal-head-txt { flex: 1 1 220px; min-width: 220px; }
.sal-head-actions { display: flex; align-items: center; gap: var(--space-3); }

/* ---------- Stats ---------- */
.sal-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  border-top: 1px solid var(--color-divider); border-bottom: 1px solid var(--color-divider);
}
.sal-stat { padding: var(--space-4); border-left: 1px solid var(--color-divider); }
.sal-stat:first-child { border-left: 0; }
.sal-stat-label { display: block; font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.sal-stat-value { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; margin-top: 4px; font-variant-numeric: tabular-nums; }
.sal-stat-note { display: block; font-size: 12px; }

/* ---------- Rejilla: escenario + aside ---------- */
.sal-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: 24px; align-items: start; }
@media (max-width: 900px) { .sal-grid { grid-template-columns: 1fr; } }

/* ---------- Plano ---------- */
.sal-plano {
  position: relative; width: 100%; aspect-ratio: 4 / 3; min-height: 440px; overflow: hidden;
  background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 20px;
  touch-action: none; box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-surface) 60%, #fff), 0 1px 3px color-mix(in srgb, var(--color-text) 8%, transparent);
}
.sal-plano-grid { position: absolute; inset: 0; background-image: radial-gradient(var(--color-divider) 1px, transparent 1px); background-size: 28px 28px; opacity: .45; }
.sal-plano-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 35%, color-mix(in srgb, var(--color-surface) 90%, transparent), color-mix(in srgb, var(--color-accent-100) 55%, transparent)); }
.sal-plano-inner1 { position: absolute; inset: 14px; border: 1px solid var(--color-divider); border-radius: 14px; pointer-events: none; }
.sal-auto { position: absolute; left: 22px; top: 22px; z-index: 4; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; padding: 6px 12px; }
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
.sal-av { position: absolute; width: 30px; height: 30px; z-index: 4; pointer-events: none; }
.sal-av.sal-lado-novia { --sal-lado: var(--lado-novia); }
.sal-av.sal-lado-novio { --sal-lado: var(--lado-novio); }
.sal-av-body { position: absolute; left: 50%; bottom: 1px; transform: translateX(-50%); width: 26px; height: 17px; border-radius: 13px 13px 9px 9px; background: var(--sal-lado); }
.sal-av-head { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 18px; height: 18px; border-radius: 50%; background: color-mix(in srgb, var(--color-text) 68%, transparent); display: flex; align-items: center; justify-content: center; z-index: 1; }
.sal-av-face { width: 11px; height: 11px; border-radius: 50%; background: color-mix(in srgb, var(--color-accent) 34%, var(--color-surface)); }

/* Nombre del comensal alrededor de la mesa */
.sal-seat-name { position: absolute; z-index: 4; pointer-events: none; width: 66px; text-align: center; font-size: 9.5px; line-height: 1.05; letter-spacing: .01em; color: var(--color-text); }

/* Asiento vacío: círculo punteado con su número */
.sal-seat-empty {
  position: absolute; transform: translate(-50%, -50%); z-index: 2; pointer-events: none;
  width: 24px; height: 24px; border-radius: 50%; border: 1.5px dashed var(--color-divider);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--color-neutral-700); font-variant-numeric: tabular-nums;
}

.sal-plano-foot { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; padding: var(--space-3) 4px; font-size: 12px; }
.sal-leg { display: inline-flex; align-items: center; gap: 6px; }
.sal-leg-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-surface); }
.sal-leg-dot.sal-lado-novio { box-shadow: 0 0 0 2px var(--lado-novio) inset; }
.sal-leg-dot.sal-lado-novia { box-shadow: 0 0 0 2px var(--lado-novia) inset; }

/* Panel de la mesa seleccionada */
.sal-panel { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); margin-top: var(--space-2); box-shadow: var(--shadow-sm); }
.sal-panel-head { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: baseline; }
.sal-panel-nombre { font-family: var(--font-heading); font-size: 24px; }
.sal-panel-ocup { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--color-neutral-700); }
.sal-panel-head [data-forma] { margin-left: auto; }
.sal-panel-head button { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; padding: 6px 12px; }
.sal-panel-guests { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-3); }
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
.sal-aside { background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: 14px; padding: var(--space-4); position: sticky; top: 88px; }
.sal-aside-title { margin: 0 0 4px; font-size: 24px; }
.sal-aside-sub { font-size: 12px; }
.sal-unassigned { display: flex; flex-direction: column; gap: 8px; margin-top: var(--space-3); max-height: 60vh; overflow: auto; }
.sal-guest { display: flex; align-items: center; gap: 8px; border: 1px solid var(--color-divider); border-left: 4px solid var(--color-divider); border-radius: 10px; padding: 8px 10px; cursor: grab; }
.sal-guest.is-dragging { opacity: .5; }
.sal-guest-txt { min-width: 0; }
.sal-guest-name { font-size: 13px; font-weight: 500; }
.sal-guest-grupo { font-size: 11px; }
.sal-guest-seat { margin-left: auto; padding: 6px 8px; font-size: 12px; width: 120px; flex: 0 0 auto; }

@media (prefers-reduced-motion: reduce) {
  .sal-mesa-wrap, .sal-fill-bar, .sal-mesa { transition: none; }
}
`;
