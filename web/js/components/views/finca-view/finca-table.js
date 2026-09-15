import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-table.css.js';
import { t } from '../../../i18n/index.js';
import { coste, eur, eurK } from './finca-calc.js';
import '../../ui/estado-badge/estado-badge.js';

/**
 * Vista de tabla de fincas (alternativa a la rejilla). Emite `open` y `togglecompare`.
 * @fires open
 * @fires togglecompare
 */
export class FincaTable extends AppElement {
  static styles = [styles];
  #fincas = [];
  #invitados = 140;

  /** @param {object[]} list Fincas ya filtradas/ordenadas, decoradas con `comparing`. */
  set fincas(list) { this.#fincas = list || []; this._paint(); }
  get fincas() { return this.#fincas; }
  /** @param {number} n */
  set invitados(n) { this.#invitados = n; this._paint(); }
  get invitados() { return this.#invitados; }

  render() {
    const rows = this.#fincas.map((f, i) => {
      const precioLabel = f.alquiler
        ? `${eur(f.alquiler)} + ${f.menu} €/inv.`
        : `${f.menu} €/inv.`;
      return `
        <tr data-idx="${i}">
          <td><input type="checkbox" class="cmp"${f.comparing ? ' checked' : ''}></td>
          <td><div class="nombre">${escapeHtml(f.nombre)}</div><div class="tipo">${escapeHtml(f.tipo)}</div></td>
          <td>${escapeHtml(`${f.zona} · ${f.km} km`)}</td>
          <td>${escapeHtml(`${f.capSent} sent.`)}</td>
          <td class="precio">${escapeHtml(precioLabel)}</td>
          <td class="coste">${escapeHtml(eurK(coste(f, this.#invitados)))}</td>
          <td>${escapeHtml(f.valoracion.toString().replace('.', ','))}</td>
          <td><estado-badge class="badge"></estado-badge></td>
          <td><button class="btn btn-ghost ficha" type="button">${escapeHtml(t('finca.card.ficha'))}</button></td>
        </tr>`;
    }).join('');
    this.shadowRoot.innerHTML = `
      <div class="wrap">
        <table class="table">
          <thead>
            <tr>
              <th></th>
              <th>${escapeHtml(t('finca.table.finca'))}</th>
              <th>${escapeHtml(t('finca.table.zona'))}</th>
              <th>${escapeHtml(t('finca.table.aforo'))}</th>
              <th>${escapeHtml(t('finca.table.precio'))}</th>
              <th>${escapeHtml(t('finca.table.coste'))}</th>
              <th>${escapeHtml(t('finca.table.val'))}</th>
              <th>${escapeHtml(t('finca.table.estado'))}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  afterRender() {
    this.$$('tr[data-idx]').forEach((tr) => {
      const f = this.#fincas[Number(tr.dataset.idx)];
      if (!f) return;
      const badge = tr.querySelector('.badge');
      if (badge) { badge.kind = 'finca'; badge.value = f.estado; }
      this.on(tr.querySelector('.ficha'), 'click', () => this.dispatchEvent(new CustomEvent('open', { detail: { id: f.id } })));
      this.on(tr.querySelector('.cmp'), 'change', () => this.dispatchEvent(new CustomEvent('togglecompare', { detail: { id: f.id } })));
    });
  }
}

customElements.define('finca-table', FincaTable);
