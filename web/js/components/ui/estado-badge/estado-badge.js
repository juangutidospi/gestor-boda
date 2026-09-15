import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './estado-badge.css.js';
import { t } from '../../../i18n/index.js';
import { ENUMS } from '../../../core/enums.js';

/** Variante visual (.tag-*) por estado. */
const VARIANT = {
  finca: { favorita: 'tag-accent', candidata: 'tag-outline', descartada: 'tag-neutral', elegida: 'tag-accent' },
  prov: { contratado: 'tag-accent', presupuesto: 'tag-outline', contactado: 'tag-neutral', pendiente: 'tag-outline' },
};
const ENUM_GROUP = { finca: ENUMS.fincaEstado, prov: ENUMS.provEstado };

/** Etiqueta de estado traducida, con variante por token. */
export class EstadoBadge extends AppElement {
  static styles = [styles];

  #kind = 'finca';
  #value = '';

  /** @param {'finca'|'prov'} k */
  set kind(k) { this.#kind = k; this._paint(); }
  get kind() { return this.#kind; }

  /** @param {string} v Valor de enum (p. ej. 'favorita'). */
  set value(v) { this.#value = v; this._paint(); }
  get value() { return this.#value; }

  render() {
    const variant = VARIANT[this.#kind]?.[this.#value] ?? 'tag-neutral';
    const key = ENUM_GROUP[this.#kind]?.[this.#value];
    const label = key ? t(key) : this.#value;
    this.shadowRoot.innerHTML = `<span class="tag ${variant}">${escapeHtml(label)}</span>`;
  }
}

customElements.define('estado-badge', EstadoBadge);
