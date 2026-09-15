import { css } from '../../../core/css.js';

/**
 * Estilos del visor de fotos a pantalla completa. El fondo oscuro (#2b231b)
 * es el overlay convencional del prototipo, aceptado como excepción a los
 * tokens de color para este tipo de superposición.
 */
export const styles = css`
:host { display: block; }
.overlay {
  position: fixed; inset: 0; z-index: 90; background: #2b231b;
  display: none; flex-direction: column; animation: fade .12s ease-out;
}
.overlay[data-open="true"] { display: flex; }
.head {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); color: #f7f2ea;
}
.pie { font-family: var(--font-heading); font-size: 18px; }
.contador { font-size: 12px; opacity: .7; }
.close { margin-left: auto; color: #f7f2ea; border: 1px solid rgba(247,242,234,.4); background: transparent; }
.stage {
  flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
  gap: var(--space-3); padding: 0 var(--space-4) var(--space-6);
}
.nav {
  color: #f7f2ea; border: 1px solid rgba(247,242,234,.4); background: transparent;
  flex: 0 0 auto; min-height: 40px; padding: 0 16px; border-radius: 999px; cursor: pointer;
  font-family: var(--font-body); font-size: 13px;
}
img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; border-radius: 8px; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
`;
