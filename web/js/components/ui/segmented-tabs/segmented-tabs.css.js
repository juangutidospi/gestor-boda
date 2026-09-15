import { css } from '../../../core/css.js';

export const styles = css`
:host { display: inline-block; }
.tabs { display: inline-flex; border: 1px solid var(--color-divider); border-radius: 999px; overflow: hidden; }
button {
  min-height: 34px; padding: 0 14px; border: 0; background: transparent; cursor: pointer;
  font-family: var(--font-body); font-size: 12.5px; letter-spacing: .02em; color: var(--color-neutral-700);
  &[aria-selected="true"] { background: var(--color-accent); color: var(--color-surface); }
  &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
}
`;
