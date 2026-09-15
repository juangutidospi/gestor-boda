import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './segmented-tabs.css.js';

/**
 * Barra de pestañas. Emite `change` con { value } al elegir una.
 * @fires change
 */
export class SegmentedTabs extends AppElement {
  static styles = [styles];

  /** @type {Array<{value: string, label: string}>} */
  #options = [];
  #value = '';

  /** @param {Array<{value: string, label: string}>} list */
  set options(list) {
    this.#options = list ?? [];
    if (!this.#value && this.#options.length) this.#value = this.#options[0].value;
    this._paint();
  }

  get options() { return this.#options; }

  /** @param {string} v */
  set value(v) {
    if (v === this.#value) return;
    this.#value = v;
    this._paint();
  }

  get value() { return this.#value; }

  render() {
    this.shadowRoot.innerHTML = `<div class="tabs" role="tablist">${this._optionsTpl}</div>`;
  }

  /** @returns {string} Un botón por opción. */
  get _optionsTpl() {
    return this.#options.map((o) => `
      <button role="tab" data-value="${escapeHtml(o.value)}" aria-selected="${o.value === this.#value}">
        ${escapeHtml(o.label)}
      </button>`).join('');
  }

  afterRender() {
    this.$$('button').forEach((btn) => {
      this.on(btn, 'click', () => {
        this.value = btn.dataset.value;
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value } }));
      });
    });
  }
}

customElements.define('segmented-tabs', SegmentedTabs);
