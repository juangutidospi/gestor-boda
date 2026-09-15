import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.scrim { position: fixed; inset: 0; z-index: 90; background: color-mix(in srgb, #000 44%, transparent);
  display: none; }
.scrim[data-open="true"] { display: block; animation: fade .15s ease; }
.panel { position: fixed; top: 0; right: 0; height: 100vh; width: min(440px, 100%);
  background: var(--color-surface); border-left: 1px solid var(--color-divider); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; }
.scrim[data-open="true"] .panel { animation: slide .2s ease; }
.head { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-divider); }
.head h2 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 20px; flex: 1; }
.x { min-height: 34px; min-width: 34px; border: 0; background: transparent; cursor: pointer;
  font-size: 18px; color: var(--color-neutral-700); border-radius: 999px;
  &:hover { background: color-mix(in srgb, var(--color-text) 8%, transparent); } }
.body { padding: var(--space-6); overflow: auto; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes slide { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
`;
