import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-view.css.js';
import { t } from '../../../i18n/index.js';
import { ensureSeeded, fincasRepo } from '../../../core/repos.js';

/**
 * Vista Finca. En la Fase 0 es un placeholder que valida el cableado del
 * router y el seam con los repositorios. La Fase 1 la reemplaza por completo.
 */
export class FincaView extends AppElement {
  static styles = [styles];
  #count = 0;

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="page-head">
          <span class="eyebrow">${escapeHtml(t('nav.finca'))}</span>
          <h1>${escapeHtml(t('nav.finca'))}</h1>
        </div>
        <p class="muted">${escapeHtml(String(this.#count))} ${escapeHtml(t('nav.finca'))}</p>
      </div>`;
  }

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this.#count = fincasRepo.list().length;
    this._paint();
  }
}

customElements.define('finca-view', FincaView);
