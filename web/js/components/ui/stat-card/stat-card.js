import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './stat-card.css.js';

/** Tarjeta de dato: rótulo, valor grande y nota. Se configura por atributos. */
export class StatCard extends AppElement {
  static styles = [styles];
  static observedAttributes = ['label', 'value', 'note'];

  attributeChangedCallback() { if (this.shadowRoot) this._paint(); }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="stat">
        <span class="label">${escapeHtml(this.getAttribute('label') ?? '')}</span>
        <span class="value">${escapeHtml(this.getAttribute('value') ?? '')}</span>
        <span class="note">${escapeHtml(this.getAttribute('note') ?? '')}</span>
      </div>`;
  }
}

customElements.define('stat-card', StatCard);
