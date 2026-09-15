import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './empty-state.css.js';
import { t } from '../../../i18n/index.js';

/** Estado vacío con título y descripción. */
export class EmptyState extends AppElement {
  static styles = [styles];
  static observedAttributes = ['title', 'desc'];

  attributeChangedCallback() { if (this.shadowRoot) this._paint(); }

  render() {
    const title = this.getAttribute('title') || t('common.empty');
    const desc = this.getAttribute('desc') || '';
    this.shadowRoot.innerHTML = `
      <div class="empty">
        <h3>${escapeHtml(title)}</h3>
        ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
      </div>`;
  }
}

customElements.define('empty-state', EmptyState);
