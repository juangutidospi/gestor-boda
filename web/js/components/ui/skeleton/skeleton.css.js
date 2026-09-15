import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.sk { border-radius: var(--radius-sm); background: color-mix(in srgb, var(--color-text) 8%, transparent);
  position: relative; overflow: hidden; }
.sk::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-text) 6%, transparent), transparent);
  animation: sweep 1.2s infinite; }
@keyframes sweep { to { transform: translateX(100%); } }
`;
