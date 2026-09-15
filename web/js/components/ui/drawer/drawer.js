import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './drawer.css.js';

/**
 * Panel lateral para altas/edición. open()/close(); emite `close`.
 * El contenido se proyecta por <slot>. No usa alert/confirm/prompt.
 * @fires close
 */
export class AppDrawer extends AppElement {
  static styles = [styles];
  #open = false;
  #heading = '';

  /** @param {string} v */
  set heading(v) { this.#heading = v; this._paint(); }
  get heading() { return this.#heading; }

  /** Abre el panel. */
  open() { this.#open = true; this._paint(); }

  /** Cierra el panel y emite `close`. */
  close() {
    this.#open = false;
    this._paint();
    this.dispatchEvent(new CustomEvent('close'));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="scrim" data-open="${this.#open}">
        <div class="panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(this.#heading)}">
          <div class="head">
            <h2>${escapeHtml(this.#heading)}</h2>
            <button class="x" id="x" aria-label="Cerrar">×</button>
          </div>
          <div class="body"><slot></slot></div>
        </div>
      </div>`;
  }

  afterRender() {
    const scrim = this.$('.scrim');
    this.on(this.$('#x'), 'click', () => this.close());
    this.on(scrim, 'click', (e) => { if (e.target === scrim) this.close(); });
  }
}

customElements.define('app-drawer', AppDrawer);
