import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.backdrop { position: fixed; inset: 0; z-index: 60; display: none;
  background: color-mix(in srgb, #000 42%, transparent); padding: var(--space-4);
  align-items: flex-start; justify-content: center; overflow: auto; }
.backdrop[data-open="true"] { display: flex; animation: fade .12s ease-out; }
.dialog { width: var(--dialog-w, min(620px, 100%)); margin: 6vh auto; background: var(--color-surface);
  border-radius: 20px; padding: var(--space-6); box-shadow: var(--shadow-lg); }
.head { display: flex; align-items: flex-start; gap: var(--space-4);
  border-bottom: 2px solid var(--color-divider); padding-bottom: var(--space-3); }
.head h2 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 24px; flex: 1; }
.x { min-height: 36px; padding: 0 14px; border: 1px solid var(--color-divider); background: var(--color-surface);
  border-radius: 999px; cursor: pointer; font-family: var(--font-body); font-size: 12.5px; color: var(--color-text); }
.body { padding-top: var(--space-4); }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
`;
