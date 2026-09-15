import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-lightbox.css.js';
import { t } from '../../../i18n/index.js';
import { storage } from '../../../core/storage-adapter.js';

/**
 * Visor de fotos a pantalla completa. Props `fotos` (array {url,pie}) e
 * `index` (number|null, foto activa). `open(i)`/`close()`/`next()`/`prev()`.
 * Navega con ←/→ y cierra con Escape o click en el backdrop. Emite `close`.
 * @fires close
 */
export class FincaLightbox extends AppElement {
  static styles = [styles];
  #fotos = [];
  #index = null;

  /** @param {Array<{url: string, pie: string}>} list */
  set fotos(list) { this.#fotos = list || []; this._paint(); }
  get fotos() { return this.#fotos; }
  /** @param {number|null} i */
  set index(i) { this.#index = i; this._paint(); }
  get index() { return this.#index; }

  /**
   * Abre el visor en la foto `i`.
   * @param {number} i
   */
  open(i) { this.#index = i; this._paint(); }

  /** Cierra el visor y emite `close`. */
  close() {
    this.#index = null;
    this._paint();
    this.dispatchEvent(new CustomEvent('close'));
  }

  /** Avanza a la siguiente foto (circular). */
  next() {
    if (!this.#fotos.length || this.#index == null) return;
    this.#index = (this.#index + 1) % this.#fotos.length;
    this._paint();
  }

  /** Retrocede a la foto anterior (circular). */
  prev() {
    if (!this.#fotos.length || this.#index == null) return;
    this.#index = (this.#index - 1 + this.#fotos.length) % this.#fotos.length;
    this._paint();
  }

  /**
   * Registra el listener de teclado UNA sola vez (no en afterRender, que se
   * repinta en cada open/next/prev y apilaría listeners duplicados en window).
   */
  connectedCallback() {
    super.connectedCallback();
    this.on(window, 'keydown', this.#onKey);
  }

  /**
   * Maneja Escape/←/→ solo cuando el visor está abierto.
   * @param {KeyboardEvent} e
   */
  #onKey = (e) => {
    if (this.#index == null) return;
    if (e.key === 'Escape') this.close();
    else if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
  };

  render() {
    const abierto = this.#index != null && !!this.#fotos[this.#index];
    const foto = abierto ? this.#fotos[this.#index] : null;
    const total = this.#fotos.length;
    this.shadowRoot.innerHTML = `
      <div class="overlay" id="overlay" data-open="${abierto ? 'true' : 'false'}">
        <div class="head">
          <span class="pie">${foto ? escapeHtml(foto.pie || '') : ''}</span>
          <span class="contador">${foto ? escapeHtml(`${this.#index + 1}/${total}`) : ''}</span>
          <button class="close" id="close" type="button">${escapeHtml(t('finca.lightbox.close'))}</button>
        </div>
        <div class="stage">
          <button class="nav" id="prev" type="button">←</button>
          ${foto ? `<img id="img" src="${escapeHtml(storage.url(foto.url))}" alt="${escapeHtml(foto.pie || '')}">` : ''}
          <button class="nav" id="next" type="button">→</button>
        </div>
      </div>`;
  }

  afterRender() {
    const overlay = this.$('#overlay');
    if (!overlay) return;
    this.on(this.$('#close'), 'click', () => this.close());
    this.on(overlay, 'click', (e) => { if (e.target === overlay) this.close(); });
    this.on(this.$('#prev'), 'click', () => this.prev());
    this.on(this.$('#next'), 'click', () => this.next());
  }
}

customElements.define('finca-lightbox', FincaLightbox);
