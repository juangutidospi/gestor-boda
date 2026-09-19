import { css } from '../../../core/css.js';

export const styles = css`
:host { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 120; }
.toast { display: none; align-items: center; gap: 14px; padding: 10px 12px 10px 18px; border-radius: 999px; font-size: 13px;
  background: var(--color-text); color: var(--color-surface); box-shadow: var(--shadow-md); }
.toast[data-show="true"] { display: inline-flex; animation: rise .2s ease; }
.toast-action { border: 0; cursor: pointer; padding: 5px 12px; border-radius: 999px;
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600; letter-spacing: .02em;
  background: color-mix(in srgb, var(--color-surface) 22%, transparent); color: var(--color-surface); }
.toast-action:hover { background: color-mix(in srgb, var(--color-surface) 34%, transparent); }
.toast-action:focus-visible { outline: 2px solid var(--color-surface); outline-offset: 2px; }
@keyframes rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
`;
