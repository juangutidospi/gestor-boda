import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './toast.css.js';

/** Aviso breve no bloqueante. show(mensaje) lo muestra 3 s. */
export class AppToast extends AppElement {
  static styles = [styles];
  #msg = '';
  #show = false;
  #timer = null;

  /** @param {string} message */
  show(message) {
    this.#msg = message;
    this.#show = true;
    this._paint();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => { this.#show = false; this._paint(); }, 3000);
  }

  render() {
    this.shadowRoot.innerHTML = `<div class="toast" data-show="${this.#show}" role="status">${escapeHtml(this.#msg)}</div>`;
  }
}

customElements.define('app-toast', AppToast);
