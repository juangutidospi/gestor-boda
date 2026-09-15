import { AppElement } from '../../../core/AppElement.js';
import { styles } from './search-field.css.js';

/**
 * Campo de búsqueda. Emite `search` con { value } (debounce 200 ms).
 * @fires search
 */
export class SearchField extends AppElement {
  static styles = [styles];
  #timer = null;

  /** @returns {string} */
  get value() { return this.$('input')?.value ?? ''; }
  /** @param {string} v */
  set value(v) { const i = this.$('input'); if (i) i.value = v; }

  render() {
    const ph = this.getAttribute('placeholder') ?? '';
    this.shadowRoot.innerHTML = `<input type="search" placeholder="${ph}" aria-label="${ph}">`;
  }

  afterRender() {
    this.on(this.$('input'), 'input', () => {
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('search', { detail: { value: this.value } }));
      }, 200);
    });
  }
}

customElements.define('search-field', SearchField);
