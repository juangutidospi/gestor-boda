import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './toast.css.js';

/**
 * Aviso breve no bloqueante. show(mensaje) lo muestra unos segundos; puede
 * llevar una acción opcional (p. ej. "Deshacer").
 */
export class AppToast extends AppElement {
  static styles = [styles];
  #msg = '';
  #show = false;
  #timer = null;
  #actionLabel = '';
  /** @type {(() => void)|null} */
  #onAction = null;

  /**
   * @param {string} message
   * @param {{actionLabel?: string, onAction?: () => void, duration?: number}} [opts]
   */
  show(message, opts = {}) {
    this.#msg = message;
    this.#actionLabel = opts.actionLabel || '';
    this.#onAction = opts.onAction || null;
    this.#show = true;
    this._paint();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => { this.#show = false; this.#onAction = null; this._paint(); }, opts.duration || (this.#actionLabel ? 5000 : 3000));
  }

  render() {
    this.shadowRoot.innerHTML = `<div class="toast" data-show="${this.#show}" role="status">
      <span>${escapeHtml(this.#msg)}</span>
      ${this.#actionLabel ? `<button class="toast-action" id="act" type="button">${escapeHtml(this.#actionLabel)}</button>` : ''}
    </div>`;
  }

  afterRender() {
    const act = this.$('#act');
    if (act) {
      this.on(act, 'click', () => {
        const fn = this.#onAction;
        this.#show = false; this.#onAction = null; this._paint();
        clearTimeout(this.#timer);
        if (fn) fn();
      });
    }
  }
}

customElements.define('app-toast', AppToast);
