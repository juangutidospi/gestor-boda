import { css } from '../../../core/css.js';

export const styles = css`
:host { display: block; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
  padding: var(--space-8) var(--space-6); color: var(--color-text-muted); }
.empty h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 20px; color: var(--color-text); }
.empty p { margin: 0; font-size: 13px; }
`;
