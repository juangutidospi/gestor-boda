import { css } from '../../../core/css.js';

/**
 * Estilos de la vista Inicio (Home). Portada inmersiva con degradado de
 * acento y cuenta atrás, más una rejilla de tarjetas de acceso a cada
 * sección con un dato en vivo. Solo tokens; tema claro/oscuro por variables.
 */
export const styles = css`
:host { display: block; }

/* Wash de fondo: dos glows suaves de acento/salvia detrás de todo el contenido. */
.home {
  padding-top: var(--space-5); display: flex; flex-direction: column; gap: var(--space-5);
  background:
    radial-gradient(60% 50% at 100% 0%, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 70%),
    radial-gradient(55% 45% at 0% 60%, color-mix(in srgb, var(--color-secondary) 8%, transparent), transparent 70%);
}

/* ---------- Portada inmersiva (composición editorial) ---------- */
.home-hero {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "main aside" "ribbon ribbon";
  align-items: center; column-gap: clamp(24px, 4vw, 64px); row-gap: clamp(18px, 2.4vw, 30px);
  padding: clamp(26px, 3vw, 44px) clamp(28px, 3.4vw, 52px);
  border: 1px solid color-mix(in srgb, var(--color-accent) 26%, var(--color-divider)); border-radius: 26px;
  background:
    radial-gradient(80% 130% at 100% -20%, color-mix(in srgb, var(--color-accent) 70%, transparent), transparent 55%),
    radial-gradient(70% 115% at -5% 120%, color-mix(in srgb, var(--color-secondary) 50%, transparent), transparent 48%),
    linear-gradient(128deg, color-mix(in srgb, var(--color-accent) 32%, var(--color-surface)), color-mix(in srgb, var(--color-accent) 6%, var(--color-surface)) 64%);
  box-shadow: var(--shadow-lg);
  animation: home-rise .5s cubic-bezier(.22,.61,.36,1) both;
}
/* Grano/textura muy sutil (acabado mate premium) + viñeta inferior */
.home-hero-grain {
  position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: .5; mix-blend-mode: soft-light;
}
/* Anillos entrelazados en dorado, grandes y recortados */
.home-hero-rings {
  position: absolute; top: -60px; right: -36px; width: 150px; height: 150px; z-index: -1;
  color: var(--color-gold); opacity: .3; pointer-events: none;
}
.home-hero-rings svg { width: 100%; height: 100%; }

.home-hero-main { grid-area: main; min-width: 0; }
.home-kicker { font-size: 11px; font-weight: 600; letter-spacing: .26em; text-transform: uppercase; color: var(--color-accent-700); }
.home-title {
  font-family: var(--font-heading); font-weight: 600; line-height: .98;
  font-size: clamp(34px, 5vw, 62px); margin: 8px 0 0; color: var(--color-text); letter-spacing: -.015em;
}
.home-amp { font-style: italic; font-weight: 500; color: var(--color-accent-700); padding: 0 .04em; }
.home-hero-rule { width: 58px; height: 2px; margin: 14px 0 0; border-radius: 2px;
  background: linear-gradient(90deg, var(--color-gold), color-mix(in srgb, var(--color-gold) 10%, transparent)); }
.home-sub { margin-top: 12px; font-size: clamp(13px, 1.3vw, 15px); color: var(--color-neutral-700); max-width: 52ch; }
.home-sub b { color: var(--color-text); font-variant-numeric: tabular-nums; }

/* Medallón de cuenta atrás (derecha, anclado abajo con holgura sobre los anillos) */
.home-hero-aside { grid-area: aside; justify-self: end; align-self: end; display: flex; flex-direction: column; justify-content: flex-end; min-height: 128px; }
.home-count { display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
.home-count-num {
  font-family: var(--font-heading); font-weight: 600; line-height: 1;
  font-size: clamp(52px, 6.4vw, 88px); color: var(--color-accent-700);
  font-variant-numeric: tabular-nums; letter-spacing: -.03em;
}
.home-count-side { display: flex; flex-direction: column; align-items: flex-end; margin-top: 9px; }
.home-count-lbl { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--color-accent-700); font-weight: 600; }
.home-count-date { margin-top: 4px; font-size: 13px; color: var(--color-neutral-700); }
.home-count.is-hoy { align-items: flex-end; }
.home-count-hoy { font-family: var(--font-heading); font-weight: 600; font-size: clamp(30px, 4vw, 44px); color: var(--color-accent-700); line-height: 1; }

/* Cinta de metadatos en vivo (abajo, estilo cabecera de revista) */
.home-hero-ribbon {
  grid-area: ribbon; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px;
  padding-top: clamp(14px, 1.8vw, 22px); border-top: 1px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
}
.home-rib-item { font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--color-neutral-700); font-weight: 500; }
.home-rib-dot { color: color-mix(in srgb, var(--color-accent) 55%, transparent); font-weight: 700; }

.home-hero-actions { margin-top: clamp(16px, 2vw, 22px); display: flex; gap: 10px; flex-wrap: wrap; }
.home-btn {
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 10px 16px; border-radius: 999px; font: inherit; font-size: 13.5px; font-weight: 500;
  border: 1px solid var(--color-divider); background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  color: var(--color-text); transition: border-color .15s ease, background .15s ease, transform .15s ease;
  backdrop-filter: blur(2px);
}
.home-btn:hover { border-color: var(--color-accent-300); background: var(--color-surface); transform: translateY(-1px); }
.home-btn svg { width: 16px; height: 16px; }
.home-btn.is-primary { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.home-btn.is-primary:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); }

/* ---------- Rejilla de accesos ---------- */
.home-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
@media (max-width: 1000px) { .home-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .home-grid { grid-template-columns: 1fr; } }

/* Cada tarjeta expone su color de sección en --c (base) y --c7 (texto/énfasis). */
.home-card {
  --c: var(--color-accent); --c7: var(--color-accent-700);
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: auto 1fr;
  grid-template-areas: "ic body" ". met" ". foot";
  column-gap: 16px; row-gap: 14px; align-items: start;
  padding: var(--space-5);
  border-radius: 22px; text-decoration: none; color: inherit;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--c) 4%, var(--color-surface)), var(--color-surface) 42%),
    var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-text) 6%, transparent);
  box-shadow: var(--shadow-md);
  transition: transform .22s cubic-bezier(.22,.61,.36,1), box-shadow .22s ease, border-color .22s ease;
  animation: home-rise .5s cubic-bezier(.22,.61,.36,1) both;
}
.home-card:hover, .home-card:focus-visible {
  transform: translateY(-6px); box-shadow: var(--shadow-lg);
  border-color: color-mix(in srgb, var(--c) 32%, transparent); outline: none;
}

/* Marca de agua: el icono de la sección, gigante y fantasma, en la esquina */
.home-card-wm {
  position: absolute; right: -26px; bottom: -32px; width: 156px; height: 156px; z-index: 0;
  color: var(--c); opacity: .05; pointer-events: none; transition: opacity .25s ease, transform .25s ease;
}
.home-card-wm svg { width: 100%; height: 100%; stroke-width: 1; }
.home-card:hover .home-card-wm, .home-card:focus-visible .home-card-wm { opacity: .08; transform: rotate(-6deg) scale(1.05); }
.home-card > *:not(.home-card-wm):not(.home-card-go) { position: relative; z-index: 1; }

.home-card-ic {
  grid-area: ic; display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; flex: none;
  border-radius: 13px; background: color-mix(in srgb, var(--c) 14%, var(--color-surface)); color: var(--c7);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 18%, transparent);
}
.home-card-ic svg { width: 23px; height: 23px; }
.home-card-go {
  position: absolute; top: var(--space-5); right: var(--space-5); z-index: 2;
  display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;
  border-radius: 50%; border: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent); color: var(--color-neutral-600);
  transition: transform .2s ease, background .2s ease, color .2s ease, border-color .2s ease;
}
.home-card-go svg { width: 17px; height: 17px; }
.home-card:hover .home-card-go, .home-card:focus-visible .home-card-go {
  background: var(--c); border-color: var(--c); color: var(--color-surface); transform: translateX(3px);
}

.home-card-body { grid-area: body; display: flex; flex-direction: column; gap: 4px; padding-top: 4px; padding-right: 40px; }
.home-card-title { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 24px; line-height: 1.05; letter-spacing: -.01em; color: var(--color-text); }
.home-card-desc { margin: 0; font-size: 13px; color: var(--color-neutral-600); line-height: 1.4; }

/* ----- Métrica: número grande (protagonista) + mini-viz de apoyo ----- */
/* min-height iguala la fila entre donut (más alto) y barras/estrellas → sin vacíos. */
.home-card-metric { grid-area: met; min-height: 60px; display: flex; align-items: center; gap: 16px; }
.home-metric-num { display: flex; flex-direction: column; gap: 6px; flex: none; }
.home-metric-num .n {
  font-family: var(--font-heading); font-weight: 600; font-size: 38px; line-height: .95;
  color: var(--c7); font-variant-numeric: tabular-nums; letter-spacing: -.015em;
}
.home-metric-num .u { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--color-neutral-600); }
.home-metric-viz { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: flex-end; }

.home-mini-donut { flex: none; width: 60px; height: 60px; }
.home-mini-donut svg { width: 60px; height: 60px; }

.home-mini-bar { width: 100%; height: 10px; border-radius: 999px; overflow: hidden; display: flex;
  background: color-mix(in srgb, var(--color-text) 8%, transparent); }
.home-mini-bar > span { display: block; height: 100%; }
.home-mini-bar > span:first-child { border-radius: 999px 0 0 999px; }

.home-mini-track { position: relative; width: 100%; height: 22px; }
.home-track-line { position: absolute; top: 50%; left: 2px; right: 2px; height: 2px; transform: translateY(-50%);
  border-radius: 2px; background: color-mix(in srgb, var(--color-text) 12%, transparent); }
.home-mini-track i { position: absolute; top: 50%; width: 6px; height: 6px; border-radius: 50%;
  transform: translate(-50%, -50%); background: color-mix(in srgb, var(--c) 50%, var(--color-neutral-600)); }
.home-mini-track i.is-first { width: 11px; height: 11px; background: var(--c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 20%, transparent); }

.home-mini-stars { display: flex; align-items: center; gap: 3px; }
.home-star { width: 20px; height: 20px; color: color-mix(in srgb, var(--color-text) 13%, transparent); }
.home-star svg { width: 100%; height: 100%; fill: currentColor; }
.home-star.is-full { color: var(--color-gold); }

/* ----- Pie: metadatos con filete separador ----- */
.home-card-foot {
  grid-area: foot; padding-top: 12px; border-top: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  font-size: 12px; letter-spacing: .01em; color: var(--color-neutral-600);
}
.home-card-foot b { color: var(--color-text); font-variant-numeric: tabular-nums; }

/* ---------- Editor de la boda (campos del formulario) ---------- */
.home-edit { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-2) 0; }
.home-edit .field { display: flex; flex-direction: column; gap: 6px; }
.home-edit label { font-size: 13px; color: var(--color-neutral-700); font-weight: 500; }
.home-edit .input {
  width: 100%; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 14px;
  border: 1px solid var(--color-divider); background: var(--color-bg); color: var(--color-text);
}
.home-edit .input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
.home-edit-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: var(--space-2); }

/* Entrada escalonada */
@keyframes home-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

@media (max-width: 760px) {
  .home { padding-top: var(--space-4); gap: var(--space-5); }
  .home-hero { border-radius: 20px; grid-template-columns: 1fr; grid-template-areas: "main" "aside" "ribbon"; row-gap: 12px; padding: clamp(20px, 5vw, 28px); }
  .home-title { font-size: clamp(30px, 8.5vw, 40px); }
  .home-hero-actions { margin-top: 14px; }
  /* Cuenta atrás horizontal y compacta */
  .home-hero-aside { justify-self: start; align-self: start; min-height: 0; }
  .home-count { flex-direction: row; align-items: center; text-align: left; gap: 12px; }
  .home-count-num { font-size: clamp(44px, 13vw, 58px); }
  .home-count-side { margin-top: 0; align-items: flex-start; }
  .home-hero-rings { width: 132px; top: -24px; right: -20px; }
  .home-hero-ribbon { gap: 6px 10px; padding-top: 14px; }
  .home-rib-item { font-size: 10.5px; letter-spacing: .07em; }
}
/* Móvil (1 columna): datos reestructurados — icono junto al título, más compacto. */
@media (max-width: 620px) {
  .home-grid { gap: var(--space-3); }
  .home-card {
    display: grid; grid-template-columns: auto 1fr;
    grid-template-areas: "ic body" ". met" ". foot";
    column-gap: 13px; row-gap: 11px; align-items: start;
    padding: var(--space-4); border-radius: 18px; min-width: 0;
  }
  .home-card-ic { grid-area: ic; width: 42px; height: 42px; border-radius: 11px; }
  .home-card-ic svg { width: 21px; height: 21px; }
  .home-card-body { grid-area: body; gap: 4px; padding-right: 34px; } /* deja aire para la flecha */
  .home-card-title { font-size: 21px; }
  .home-card-desc { font-size: 12.5px; }
  .home-card-metric { grid-area: met; min-height: 0; margin-top: 0; gap: 14px; align-items: center; }
  .home-metric-num .n { font-size: 30px; }
  .home-metric-num .u { font-size: 10px; }
  .home-mini-donut, .home-mini-donut svg { width: 46px; height: 46px; }
  .home-star { width: 17px; height: 17px; }
  .home-card-foot { grid-area: foot; margin-top: 0; padding-top: 11px; font-size: 11.5px; }
  .home-card-go { top: var(--space-4); right: var(--space-4); width: 30px; height: 30px; }
  .home-card-go svg { width: 15px; height: 15px; }
  .home-card-wm { width: 104px; right: -18px; bottom: -22px; }
}
@media (prefers-reduced-motion: reduce) {
  .home-hero, .home-card { animation: none; }
  .home-card { transition: border-color .2s ease; }
  .home-card:hover, .home-card:focus-visible { transform: none; }
}
`;
