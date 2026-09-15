import { css } from '../../../core/css.js';

export const styles = css`
:host { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 120; }
.toast { display: none; padding: 10px 16px; border-radius: 999px; font-size: 13px;
  background: var(--color-text); color: var(--color-surface); box-shadow: var(--shadow-md); }
.toast[data-show="true"] { display: block; animation: rise .2s ease; }
@keyframes rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
`;
