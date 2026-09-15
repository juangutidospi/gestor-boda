import { css } from './css.js';

/** Estilos compartidos por todas las vistas y primitivos. Solo tokens, nunca color hardcodeado. */
export const base = css`
:host { display: block; font-family: var(--font-body); color: var(--color-text); }
* { box-sizing: border-box; }

.view-content { display: flex; flex-direction: column; gap: var(--space-6); }
.page-head {
  display: flex; flex-direction: column; gap: 2px;
  .eyebrow { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-text-muted); }
  h1 { margin: 0; font-family: var(--font-heading); font-weight: 600; }
}
.card {
  display: flex; flex-direction: column; gap: 11px;
  padding: var(--space-6); border-radius: var(--radius-md);
  background: var(--color-surface); border: 1px solid var(--color-divider);
}
.card-label { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.muted { color: var(--color-text-muted); font-size: 12px; line-height: 1.45; }

.btn {
  min-height: 40px; padding: 0 16px; border-radius: 999px; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; letter-spacing: .02em; color: var(--color-text);
  background: transparent; border: 1px solid var(--color-divider);
  &:hover { background: color-mix(in srgb, var(--color-accent) 12%, transparent); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
}
.btn-primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-surface);
  &:hover { background: var(--color-accent-700); border-color: var(--color-accent-700); } }
.btn-secondary { background: var(--color-surface); }
.btn-ghost { border-color: transparent; color: var(--color-accent-700); }

.tag {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px;
  font-size: 11px; letter-spacing: .02em; border: 1px solid var(--color-divider); color: var(--color-neutral-700);
}
.tag-accent { color: var(--color-accent-700); border-color: var(--color-accent-300);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface)); }
.tag-outline { border-color: var(--color-accent-300); }
.tag-neutral { background: var(--color-neutral-100); }

.field { display: flex; flex-direction: column; gap: 5px;
  label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--color-neutral-700); } }

input, select, textarea {
  min-height: 40px; padding: 0 12px; border-radius: var(--radius-sm);
  font-family: var(--font-body); font-size: 13px; color: var(--color-text);
  background: var(--color-surface); border: 1px solid var(--color-divider);
  &:hover { border-color: var(--color-accent-300); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
}
textarea { padding: 9px 12px; min-height: 84px; line-height: 1.5; resize: vertical; }
input::placeholder, textarea::placeholder { color: var(--color-neutral-600); }
select { appearance: none; padding-right: 26px; }
input[type="checkbox"], input[type="radio"] { min-height: 0; accent-color: var(--color-accent); }

.seg { display: inline-flex; border: 1px solid var(--color-divider); border-radius: 999px; overflow: hidden; }
.seg-opt { min-height: 34px; padding: 0 14px; border: 0; background: transparent; cursor: pointer;
  font-family: var(--font-body); font-size: 12.5px; letter-spacing: .02em; color: var(--color-neutral-700);
  &[aria-selected="true"] { background: var(--color-accent); color: var(--color-surface); } }

.bar { display: block; height: 5px; border-radius: 3px; overflow: hidden;
  background: color-mix(in srgb, var(--color-text) 10%, transparent);
  span { display: block; height: 100%; background: var(--color-accent); } }
`;
