import { css } from '../../../core/css.js';

/**
 * Estilos de la pantalla de acceso (gate). Portada a pantalla completa con
 * degradado de acento, anillos dorados y una tarjeta de formulario. Solo tokens.
 */
export const styles = css`
:host { display: block; }
:host([hidden]) { display: none; }

.lg {
  position: fixed; inset: 0; z-index: 60; overflow: auto;
  display: grid; place-items: center; padding: var(--space-6);
  background:
    radial-gradient(70% 90% at 100% -10%, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent 55%),
    radial-gradient(60% 80% at -5% 110%, color-mix(in srgb, var(--color-secondary) 42%, transparent), transparent 52%),
    linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 20%, var(--color-bg)), var(--color-bg) 60%);
}

.lg-card {
  position: relative; overflow: hidden; width: 100%; max-width: 420px;
  padding: clamp(26px, 4vw, 40px);
  background: var(--color-surface); border: 1px solid var(--color-divider);
  border-radius: 24px; box-shadow: var(--shadow-lg);
  animation: lg-rise .5s cubic-bezier(.22,.61,.36,1) both;
}
.lg-rings { position: absolute; top: -56px; right: -40px; width: 180px; height: 180px; z-index: 0;
  color: var(--color-gold); opacity: .26; pointer-events: none; }
.lg-rings svg { width: 100%; height: 100%; }
.lg-card > *:not(.lg-rings) { position: relative; z-index: 1; }

.lg-brand { display: flex; align-items: center; gap: 10px; }
.lg-brand-mark { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 11px; background: var(--color-accent-100); color: var(--color-accent-700); }
.lg-brand-mark svg { width: 22px; height: 22px; }
.lg-brand-txt { font-family: var(--font-heading); font-weight: 600; font-size: 18px; color: var(--color-text); }

.lg-kicker { margin-top: 20px; font-size: 11px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--color-accent-700); }
.lg-title { font-family: var(--font-heading); font-weight: 600; font-size: clamp(26px, 4vw, 34px); line-height: 1.05; margin: 6px 0 0; color: var(--color-text); }
.lg-sub { margin-top: 8px; font-size: 14px; color: var(--color-neutral-600); }

.lg-form { margin-top: 22px; display: flex; flex-direction: column; gap: 14px; }
.lg-field { display: flex; flex-direction: column; gap: 6px; }
.lg-field label { font-size: 13px; color: var(--color-neutral-700); font-weight: 500; }
.lg-input {
  width: 100%; padding: 11px 13px; border-radius: 11px; font: inherit; font-size: 14px;
  border: 1px solid var(--color-divider); background: var(--color-bg); color: var(--color-text);
}
.lg-input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }

.lg-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  width: 100%; padding: 12px 16px; border-radius: 999px; font: inherit; font-size: 14.5px; font-weight: 500;
  border: 1px solid var(--color-accent); background: var(--color-accent); color: #fff;
  transition: background .15s ease, border-color .15s ease, transform .15s ease, opacity .15s ease;
}
.lg-btn:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); transform: translateY(-1px); }
.lg-btn[disabled] { opacity: .6; cursor: default; transform: none; }

.lg-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;
  width: 100%; padding: 11px 16px; border-radius: 999px; font: inherit; font-size: 13.5px; font-weight: 500;
  border: 1px solid var(--color-divider); background: transparent; color: var(--color-text);
  transition: border-color .15s ease, background .15s ease;
}
.lg-ghost:hover { border-color: var(--color-accent-300); background: var(--color-accent-100); }

.lg-alt { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
.lg-sep { display: flex; align-items: center; gap: 12px; color: var(--color-neutral-600); font-size: 12px; }
.lg-sep::before, .lg-sep::after { content: ''; flex: 1; height: 1px; background: var(--color-divider); }

.lg-foot { margin-top: 18px; font-size: 13px; color: var(--color-neutral-600); text-align: center; }
.lg-link { color: var(--color-accent-700); font-weight: 500; cursor: pointer; background: none; border: 0; font: inherit; padding: 0; }
.lg-link:hover { text-decoration: underline; }

.lg-msg { margin-top: 14px; padding: 10px 13px; border-radius: 11px; font-size: 13px; line-height: 1.4; }
.lg-msg.is-error { background: color-mix(in srgb, #c0392b 12%, var(--color-surface)); color: #9a2d22; border: 1px solid color-mix(in srgb, #c0392b 24%, transparent); }
.lg-msg.is-ok { background: color-mix(in srgb, var(--color-secondary) 16%, var(--color-surface)); color: var(--color-secondary-700); border: 1px solid color-mix(in srgb, var(--color-secondary) 30%, transparent); }
.lg-msg[hidden] { display: none; }

@keyframes lg-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .lg-card { animation: none; } }
`;
