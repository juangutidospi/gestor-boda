import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-card.css.js';
import { t } from '../../../i18n/index.js';
import { coste, eur, eurK } from './finca-calc.js';
import { storage } from '../../../core/storage-adapter.js';
import '../../ui/estado-badge/estado-badge.js';

/**
 * Tarjeta de una finca en la rejilla. Emite `open` y `togglecompare`.
 * @fires open
 * @fires togglecompare
 */
export class FincaCard extends AppElement {
  static styles = [styles];
  #finca = null;
  #invitados = 140;
  #comparing = false;

  /** @param {object} f */
  set finca(f) { this.#finca = f; this._paint(); }
  get finca() { return this.#finca; }
  /** @param {number} n */
  set invitados(n) { this.#invitados = n; this._paint(); }
  /** @param {boolean} v */
  set comparing(v) { this.#comparing = v; this._paint(); }

  render() {
    const f = this.#finca;
    if (!f) { this.shadowRoot.innerHTML = ''; return; }
    const fotos = f.fotos || [];
    const cover = fotos.length ? storage.url(fotos[0].url) : '';
    const precioLabel = f.alquiler
      ? `${eur(f.alquiler)} alquiler + ${f.menu} €/inv.`
      : `${f.menu} € por invitado`;
    this.shadowRoot.innerHTML = `
      <article class="card">
        <div class="top">
          <span class="tipo">${escapeHtml(f.tipo)}</span>
          <label class="cmp"><input type="checkbox" id="cmp"${this.#comparing ? ' checked' : ''}>${escapeHtml(t('finca.card.compare'))}</label>
        </div>
        <h3>${escapeHtml(f.nombre)}</h3>
        <div class="zona">${escapeHtml(`${f.zona} · ${f.km} km`)}</div>
        <div class="cover" id="cover">
          ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(f.nombre)}" loading="lazy">` : `<div class="ph">${escapeHtml(t('finca.detail.sinFotos'))}</div>`}
        </div>
        <div class="panel">
          <div><span class="lbl">${escapeHtml(t('finca.card.coste'))}</span><span class="val">${escapeHtml(eurK(coste(f, this.#invitados)))}</span><span class="sub">${escapeHtml(precioLabel)}</span></div>
          <div class="sep"><span class="lbl">${escapeHtml(t('finca.card.aforoVal'))}</span><span class="val">${escapeHtml(`${f.capSent} sent.`)}</span><span class="sub">${escapeHtml(`${f.valoracion.toString().replace('.', ',')} / 5 · ${f.capPie} de pie`)}</span></div>
        </div>
        <div class="servicios">${(f.servicios || []).map((s) => `<span class="tag tag-neutral">${escapeHtml(s)}</span>`).join('')}</div>
        <div class="foot">
          <estado-badge id="badge"></estado-badge>
          <button class="btn btn-ghost" id="ficha">${escapeHtml(t('finca.card.ficha'))}</button>
        </div>
      </article>`;
  }

  afterRender() {
    if (!this.#finca) return;
    const badge = this.$('#badge');
    if (badge) { badge.kind = 'finca'; badge.value = this.#finca.estado; }
    this.on(this.$('#ficha'), 'click', () => this.dispatchEvent(new CustomEvent('open', { detail: { id: this.#finca.id } })));
    this.on(this.$('#cover'), 'click', () => this.dispatchEvent(new CustomEvent('open', { detail: { id: this.#finca.id } })));
    this.on(this.$('#cmp'), 'change', () => this.dispatchEvent(new CustomEvent('togglecompare', { detail: { id: this.#finca.id } })));
  }
}

customElements.define('finca-card', FincaCard);
