import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Presupuesto (componente único). Prefijo `pres-`. Solo tokens
 * (soporta claro/oscuro). Contratado→verde, por confirmar→acento-300, exceso→acento.
 */
export const styles = css`
:host { display: block; position: relative; }

.page-head { padding-top: var(--space-6); }

/* ---------- Cabecera con el input de límite ---------- */
.pres-head { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: flex-end; }
.pres-head-txt { flex: 1; min-width: 260px; }
.pres-limite { width: 210px; margin-bottom: 0; }

/* ---------- Tarjeta de resumen ---------- */
.pres-resumen {
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: 18px; padding: var(--space-6); box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-4);
}
.pres-resumen-top { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-end; }
.pres-k { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.pres-total { min-width: 0; }
.pres-total-num {
  font-family: var(--font-heading); font-weight: 600; font-size: clamp(40px, 5vw, 60px);
  line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums;
}
.pres-total-sub { font-size: 13px; margin-top: 2px; }
.pres-margen { margin-left: auto; text-align: right; }
.pres-margen-num {
  font-family: var(--font-heading); font-weight: 600; font-size: 36px; line-height: 1;
  white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--color-text);
}
.pres-margen-num.is-neg { color: var(--color-accent-700); }
.pres-margen-sub { font-size: 13px; margin-top: 2px; }

/* Barra apilada */
.pres-bar {
  display: flex; height: 16px; border-radius: 999px; overflow: hidden;
  background: var(--color-neutral-200); margin-top: var(--space-4);
}
.pres-bar-seg { height: 100%; transition: width .9s cubic-bezier(.22,.61,.36,1); }
.pres-bar-seg.is-contratado { background: var(--rsvp-si-dot); }
.pres-bar-seg.is-previsto { background: var(--color-accent-300); }
.pres-bar-seg.is-exceso { background: var(--color-accent); }

.pres-legend { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-top: var(--space-3); font-size: 12px; }
.pres-leg { display: inline-flex; align-items: center; gap: 6px; color: var(--color-neutral-700); }
.pres-leg b { color: var(--color-text); font-variant-numeric: tabular-nums; }
.pres-leg-dot { width: 10px; height: 10px; border-radius: 3px; }
.pres-leg-dot.is-contratado { background: var(--rsvp-si-dot); }
.pres-leg-dot.is-previsto { background: var(--color-accent-300); }
.pres-leg-dot.is-exceso { background: var(--color-accent); }
.pres-leg-senales { margin-left: auto; }

/* ---------- Insights accionables ---------- */
.pres-insights { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: var(--space-4); }
.pres-insight {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px;
  font-family: var(--font-body); font-size: 12.5px; color: var(--color-text);
  background: var(--color-surface); border: 1px solid var(--color-divider); cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.pres-insight.is-static { cursor: default; }
.pres-insight:not(.is-static):hover { border-color: var(--color-accent-300); background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)); }
.pres-insight:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.pres-insight.good { border-color: var(--rsvp-si-line); background: var(--rsvp-si-bg); color: var(--rsvp-si-dot); }
.pres-insight.warn { border-color: var(--color-accent-300); background: var(--color-accent-100); color: var(--color-accent-700); }

/* ---------- Bloques ---------- */
.pres-bloques {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 16px; margin-bottom: var(--space-4);
}
.pres-bloque {
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: 14px; padding: var(--space-4); break-inside: avoid;
}
.pres-bloque-head { display: flex; align-items: baseline; gap: var(--space-2); }
.pres-bloque-head h5 { margin: 0; }
.pres-bloque-total {
  font-family: var(--font-heading); font-weight: 600; font-size: 22px; margin-left: auto;
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
.pres-bloque-nota { font-size: 12px; }
.pres-lineas { display: flex; flex-direction: column; margin-top: var(--space-3); }
.pres-linea { display: flex; gap: var(--space-3); align-items: baseline; padding: 7px 0; border-top: 1px solid var(--color-divider); }
.pres-linea-txt { min-width: 0; }
.pres-linea-concepto { font-size: 13px; }
.pres-linea-detalle { font-size: 11px; }
.pres-linea-importe { margin-left: auto; font-family: var(--font-heading); font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }

.pres-foot { padding: 0 0 var(--space-8); font-size: 12px; max-width: 80ch; }

/* ---------- Confeti ---------- */
#confetti { position: absolute; left: 30%; top: 220px; width: 0; height: 0; z-index: 40; pointer-events: none; }
.pres-confetti-bit { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: presConfetti 1.3s cubic-bezier(.2,.7,.3,1) forwards; }
@keyframes presConfetti { 0% { opacity: 1; transform: translate(0,0) rotate(0); } 100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--r)); } }

@media (prefers-reduced-motion: reduce) {
  .pres-bar-seg { transition: none; }
  .pres-confetti-bit { animation: none; opacity: 0; }
}
`;
