import { css } from '../../../core/css.js';

/** Estilos de la tarjeta de finca en la rejilla. Solo tokens. */
export const styles = css`
:host { display: block; }
.card {
  display: flex; flex-direction: column; gap: 10px;
  padding: var(--space-4); border-radius: 18px;
  background: var(--color-surface); border: 1px solid var(--color-divider);
  box-shadow: var(--shadow-sm);
}
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.tipo { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-neutral-700); }
.cmp {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--color-neutral-700);
  cursor: pointer;
  input { width: 14px; height: 14px; accent-color: var(--color-accent); }
}
h3 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 19px; }
.zona { font-size: 12px; color: var(--color-text-muted); }
.cover {
  height: 170px; border-radius: var(--radius-sm); overflow: hidden; cursor: pointer;
  background: var(--color-neutral-100); border: 1px solid var(--color-divider);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ph {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: var(--color-neutral-600);
  }
}
.panel {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
  background: var(--color-accent-100); border-radius: 12px; padding: var(--space-3);
  .lbl { display: block; font-size: 10px; letter-spacing: .09em; text-transform: uppercase; color: var(--color-neutral-700); }
  .val { display: block; font-family: var(--font-heading); font-weight: 600; font-size: 22px; }
  .sub { display: block; font-size: 11px; color: var(--color-text-muted); }
}
.panel .sep { border-left: 1px solid var(--color-divider); padding-left: var(--space-3); }
.servicios { display: flex; flex-wrap: wrap; gap: 4px; }
.foot {
  margin-top: auto; display: flex; align-items: center; gap: var(--space-2);
  padding-top: var(--space-2); border-top: 1px solid var(--color-divider);
  #ficha { margin-left: auto; }
}
`;
