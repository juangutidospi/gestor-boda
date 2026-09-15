import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './skeleton.css.js';

/** Bloque de carga. Tamaño por atributos w/h (por defecto 100% × 16px). */
export class Skeleton extends AppElement {
  static styles = [styles];

  render() {
    const w = escapeHtml(this.getAttribute('w') || '100%');
    const h = escapeHtml(this.getAttribute('h') || '16px');
    this.shadowRoot.innerHTML = `<div class="sk" style="width:${w};height:${h}"></div>`;
  }
}

customElements.define('ui-skeleton', Skeleton);
