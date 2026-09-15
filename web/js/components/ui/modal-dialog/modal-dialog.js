import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './modal-dialog.css.js';
import { t } from '../../../i18n/index.js';

/**
 * Diálogo centrado con backdrop. open()/close(); emite `close`. Contenido por slot.
 * Cierra con el botón, click en el backdrop y la tecla Escape. Sin alert/confirm/prompt.
 * @fires close
 */
export class ModalDialog extends AppElement {
  static styles = [styles];
  #open = false;
  #heading = '';

  /** @param {string} v */
  set heading(v) { this.#heading = v; this._paint(); }
  get heading() { return this.#heading; }

  /** Abre el diálogo. */
  open() { this.#open = true; this._paint(); }

  /** Cierra el diálogo y emite `close`. */
  close() { this.#open = false; this._paint(); this.dispatchEvent(new CustomEvent('close')); }

  render() {
    const w = this.getAttribute('width');
    this.shadowRoot.innerHTML = `
      <div class="backdrop" data-open="${this.#open}"${w ? ` style="--dialog-w:${escapeHtml(w)}"` : ''}>
        <div class="dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(this.#heading)}">
          <div class="head">
            <h2>${escapeHtml(this.#heading)}</h2>
            <button class="x" id="x">${escapeHtml(t('common.cancel'))}</button>
          </div>
          <div class="body"><slot></slot></div>
        </div>
      </div>`;
  }

  afterRender() {
    const backdrop = this.$('.backdrop');
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(backdrop, 'click', (e) => { if (e.target === backdrop) this.close(); });
    this.on(window, 'keydown', (e) => { if (this.#open && e.key === 'Escape') this.close(); });
  }
}

customElements.define('modal-dialog', ModalDialog);
