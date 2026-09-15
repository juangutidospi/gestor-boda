import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.stat { display: flex; flex-direction: column; gap: 4px; padding: var(--space-4);
  border-left: 1px solid var(--color-divider); }
.label { font-size: 11px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
.value { font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1.1; }
.note { font-size: 12px; color: var(--color-text-muted); }
`;
