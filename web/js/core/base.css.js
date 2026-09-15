import { css } from './css.js';

/** Estilos compartidos por todos los componentes. Se amplía en Task 4. */
export const base = css`
  :host { display: block; font-family: var(--font-body); color: var(--color-text); }
  * { box-sizing: border-box; }
`;
