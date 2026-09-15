import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './finca-view.css.js';
import { t } from '../../../i18n/index.js';
import {
  coste, eur, eurK, filtrar, ordenar, tiposDe, calcularStats, filasComparador,
} from './finca-calc.js';
import { storage } from '../../../core/storage-adapter.js';
import { ensureSeeded, fincasRepo, configRepo } from '../../../core/repos.js';
import '../../ui/modal-dialog/modal-dialog.js';
import '../../ui/estado-badge/estado-badge.js';

/** Tipos disponibles al dar de alta una finca nueva. */
const TIPOS_ALTA = ['Finca', 'Masía', 'Hacienda', 'Castillo', 'Hotel', 'Casa rural', 'Bodega', 'Restaurante', 'Espacio singular'];

/** Borrador vacío del formulario de alta. */
function draftVacio() {
  return { nombre: '', tipo: 'Finca', zona: '', capSent: '', menu: '', alquiler: '', km: '', senal: '' };
}

/**
 * Vista Finca. Componente único: rejilla/tabla, ficha a pantalla completa,
 * visor de fotos, comparador y alta, todo como getters de plantilla de este
 * mismo componente (sin sub-componentes de vista propios). Persistencia solo
 * vía fincasRepo/configRepo.
 */
export class FincaView extends AppElement {
  static styles = [styles];

  /** @type {object[]} */
  _fincas = [];
  _invitados = 140;
  _q = '';
  _tipo = 'Todos';
  _estado = 'Todos';
  _sort = 'valoracion';
  /** @type {'rejilla'|'tabla'} */
  _view = 'rejilla';
  /** @type {string[]} ids en comparación, máx. 4. */
  _compare = [];
  /** @type {string|null} */
  _detailId = null;
  /** @type {number|null} */
  _lightboxIdx = null;
  _addOpen = false;
  _compareOpen = false;
  _draft = draftVacio();
  _toastTimer = null;

  /**
   * Registra el listener de teclado del visor UNA sola vez (no en cada
   * repintado, que apilaría listeners duplicados en window).
   */
  connectedCallback() {
    super.connectedCallback();
    this.on(window, 'keydown', this._onWindowKey);
  }

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._fincas = fincasRepo.list();
    this._invitados = configRepo.get().guestCount || 140;
    this._paint();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div id="banner">${this._bannerTpl}</div>
        <div class="page-head">
          <span class="eyebrow">${escapeHtml(t('nav.finca'))}</span>
          <h1>${escapeHtml(t('finca.title'))}</h1>
          <p class="muted">${escapeHtml(t('finca.subtitle'))}</p>
        </div>
        <div id="stats">${this._statsTpl}</div>
        ${this._filtersTpl}
        <div id="list">${this._listTpl}</div>
        <p class="fc-foot muted">${escapeHtml(t('finca.foot', { inv: this._invitados }))}</p>
        <div id="comparebar">${this._comparebarTpl}</div>
        <div id="overlay">${this._overlayTpl}</div>
        <div class="fc-toast" id="toast" data-open="false"></div>
      </div>`;
  }

  /** @returns {string} Banner de finca elegida (vacío si no hay ninguna). */
  get _bannerTpl() {
    const elegida = this._fincas.find((f) => f.estado === 'elegida');
    if (!elegida) return '';
    const costeVal = coste(elegida, this._invitados);
    const senal = Number(elegida.senal) || Math.round(costeVal * 0.25);
    return `
      <div class="fc-banner">
        <div>
          <span class="fc-banner-kicker">${escapeHtml(t('finca.elegida.banner'))}</span>
          <span class="fc-banner-nombre">${escapeHtml(elegida.nombre)}</span>
        </div>
        <div class="fc-banner-stats">
          <div><span class="fc-banner-lbl">${escapeHtml(t('finca.elegida.senal'))}</span><span class="fc-banner-val">${escapeHtml(eur(senal))}</span></div>
          <div><span class="fc-banner-lbl">${escapeHtml(t('finca.elegida.coste'))}</span><span class="fc-banner-val">${escapeHtml(eur(costeVal))}</span></div>
        </div>
        <button class="btn" id="clear-elegida" type="button">${escapeHtml(t('finca.elegida.volver'))}</button>
      </div>`;
  }

  /** @returns {string} Las cinco tarjetas de estadística. */
  get _statsTpl() {
    const stats = calcularStats(this._fincas, this._invitados);
    return `
      <section class="fc-stats-row">
        ${stats.map((s) => `
          <div class="fc-stat">
            <span class="fc-stat-label">${escapeHtml(t(s.label))}</span>
            <span class="fc-stat-value">${escapeHtml(String(s.value))}</span>
            <span class="fc-stat-note muted">${escapeHtml(t(s.note, s.noteVars))}</span>
          </div>`).join('')}
      </section>`;
  }

  /** @returns {string} Barra de filtros (estática: se cablea una sola vez). */
  get _filtersTpl() {
    const tipos = tiposDe(this._fincas);
    return `
      <section class="fc-filters">
        <div class="field fc-search">
          <label>${escapeHtml(t('finca.search'))}</label>
          <input class="input" type="search" id="f-q" placeholder="${escapeHtml(t('finca.search.ph'))}" value="${escapeHtml(this._q)}">
        </div>
        <div class="field">
          <label>${escapeHtml(t('finca.filter.tipo'))}</label>
          <select class="input" id="f-tipo">
            ${tipos.map((x) => `<option value="${escapeHtml(x)}"${x === this._tipo ? ' selected' : ''}>${escapeHtml(x === 'Todos' ? t('finca.filter.todos') : x)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('finca.filter.estado'))}</label>
          <select class="input" id="f-estado">
            <option value="Todos"${this._estado === 'Todos' ? ' selected' : ''}>${escapeHtml(t('finca.filter.todos'))}</option>
            <option value="candidata"${this._estado === 'candidata' ? ' selected' : ''}>${escapeHtml(t('finca.filter.candidatas'))}</option>
            <option value="favorita"${this._estado === 'favorita' ? ' selected' : ''}>${escapeHtml(t('finca.filter.favoritas'))}</option>
            <option value="elegida"${this._estado === 'elegida' ? ' selected' : ''}>${escapeHtml(t('finca.filter.elegida'))}</option>
            <option value="descartada"${this._estado === 'descartada' ? ' selected' : ''}>${escapeHtml(t('finca.filter.descartadas'))}</option>
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('finca.sort'))}</label>
          <select class="input" id="f-sort">
            <option value="valoracion"${this._sort === 'valoracion' ? ' selected' : ''}>${escapeHtml(t('finca.sort.valoracion'))}</option>
            <option value="coste-asc"${this._sort === 'coste-asc' ? ' selected' : ''}>${escapeHtml(t('finca.sort.costeAsc'))}</option>
            <option value="coste-desc"${this._sort === 'coste-desc' ? ' selected' : ''}>${escapeHtml(t('finca.sort.costeDesc'))}</option>
            <option value="aforo"${this._sort === 'aforo' ? ' selected' : ''}>${escapeHtml(t('finca.sort.aforo'))}</option>
            <option value="km"${this._sort === 'km' ? ' selected' : ''}>${escapeHtml(t('finca.sort.km'))}</option>
            <option value="nombre"${this._sort === 'nombre' ? ' selected' : ''}>${escapeHtml(t('finca.sort.nombre'))}</option>
          </select>
        </div>
        <div class="field fc-invitados">
          <label>${escapeHtml(t('finca.invitados'))}</label>
          <input class="input" type="number" id="f-invitados" min="20" max="400" step="5" value="${this._invitados}">
        </div>
        <div class="seg fc-view-toggle">
          <button type="button" class="seg-opt" id="v-rejilla" aria-selected="${this._view === 'rejilla'}">${escapeHtml(t('finca.view.grid'))}</button>
          <button type="button" class="seg-opt" id="v-tabla" aria-selected="${this._view === 'tabla'}">${escapeHtml(t('finca.view.table'))}</button>
        </div>
        <button type="button" class="btn btn-primary fc-add" id="add-open">+&nbsp;&nbsp;${escapeHtml(t('finca.add'))}</button>
      </section>`;
  }

  /** @returns {object[]} Fincas filtradas y ordenadas según el estado actual. */
  get _visible() {
    const filtradas = filtrar(this._fincas, { q: this._q, tipo: this._tipo, estado: this._estado });
    return ordenar(filtradas, this._sort, this._invitados);
  }

  /** @returns {string} Rejilla, tabla o el estado vacío, según corresponda. */
  get _listTpl() {
    const lista = this._visible;
    if (!lista.length) return this._emptyTpl;
    return this._view === 'tabla' ? this._tableTpl(lista) : this._gridTpl(lista);
  }

  /**
   * @param {object[]} lista
   * @returns {string} Rejilla de tarjetas.
   */
  _gridTpl(lista) {
    return `<section class="fc-grid">${lista.map((f) => this._cardTpl(f)).join('')}</section>`;
  }

  /**
   * @param {object} f
   * @returns {string} Una tarjeta de finca (antes finca-card).
   */
  _cardTpl(f) {
    const comparando = this._compare.includes(f.id);
    const fotos = f.fotos || [];
    const cover = fotos.length ? storage.url(fotos[0].url) : '';
    const precioLabel = f.alquiler
      ? `${eur(f.alquiler)} alquiler + ${f.menu} €/inv.`
      : `${f.menu} € por invitado`;
    return `
      <article class="fc-card" data-id="${escapeHtml(f.id)}">
        <div class="fc-card-top">
          <span class="fc-card-tipo">${escapeHtml(f.tipo)}</span>
          <label class="fc-card-cmp"><input type="checkbox" data-cmp="${escapeHtml(f.id)}"${comparando ? ' checked' : ''}>${escapeHtml(t('finca.card.compare'))}</label>
        </div>
        <h3>${escapeHtml(f.nombre)}</h3>
        <div class="fc-card-zona">${escapeHtml(`${f.zona} · ${f.km} km`)}</div>
        <div class="fc-card-cover" data-open="${escapeHtml(f.id)}">
          ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(f.nombre)}" loading="lazy">` : `<div class="fc-ph">${escapeHtml(t('finca.detail.sinFotos'))}</div>`}
        </div>
        <div class="fc-card-panel">
          <div><span class="fc-lbl">${escapeHtml(t('finca.card.coste'))}</span><span class="fc-val">${escapeHtml(eurK(coste(f, this._invitados)))}</span><span class="fc-sub">${escapeHtml(precioLabel)}</span></div>
          <div class="fc-sep"><span class="fc-lbl">${escapeHtml(t('finca.card.aforoVal'))}</span><span class="fc-val">${escapeHtml(`${f.capSent} sent.`)}</span><span class="fc-sub">${escapeHtml(`${String(f.valoracion).replace('.', ',')} / 5 · ${f.capPie || 0} de pie`)}</span></div>
        </div>
        <div class="fc-card-servicios">${(f.servicios || []).map((s) => `<span class="tag tag-neutral">${escapeHtml(s)}</span>`).join('')}</div>
        <div class="fc-card-foot">
          <estado-badge class="fc-badge" data-kind="finca" data-value="${escapeHtml(f.estado)}"></estado-badge>
          ${f.estado === 'descartada' && f.motivo ? `<span class="muted">${escapeHtml(f.motivo)}</span>` : ''}
          <button class="btn btn-ghost" data-open="${escapeHtml(f.id)}" type="button">${escapeHtml(t('finca.card.ficha'))}</button>
        </div>
      </article>`;
  }

  /**
   * @param {object[]} lista
   * @returns {string} Tabla de fincas (antes finca-table).
   */
  _tableTpl(lista) {
    return `
      <div class="fc-table-wrap">
        <table class="fc-table">
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
          <tbody>${lista.map((f) => this._rowTpl(f)).join('')}</tbody>
        </table>
      </div>`;
  }

  /**
   * @param {object} f
   * @returns {string} Una fila de la tabla.
   */
  _rowTpl(f) {
    const comparando = this._compare.includes(f.id);
    const precioLabel = f.alquiler ? `${eur(f.alquiler)} + ${f.menu} €/inv.` : `${f.menu} €/inv.`;
    return `
      <tr data-id="${escapeHtml(f.id)}">
        <td><input type="checkbox" data-cmp="${escapeHtml(f.id)}"${comparando ? ' checked' : ''}></td>
        <td><div class="fc-table-nombre">${escapeHtml(f.nombre)}</div><div class="fc-table-tipo">${escapeHtml(f.tipo)}</div></td>
        <td>${escapeHtml(`${f.zona} · ${f.km} km`)}</td>
        <td>${escapeHtml(`${f.capSent} sent.`)}</td>
        <td class="fc-table-precio">${escapeHtml(precioLabel)}</td>
        <td class="fc-table-coste">${escapeHtml(eurK(coste(f, this._invitados)))}</td>
        <td>${escapeHtml(String(f.valoracion).replace('.', ','))}</td>
        <td><estado-badge class="fc-badge" data-kind="finca" data-value="${escapeHtml(f.estado)}"></estado-badge></td>
        <td><button class="btn btn-ghost" data-open="${escapeHtml(f.id)}" type="button">${escapeHtml(t('finca.card.ficha'))}</button></td>
      </tr>`;
  }

  /** @returns {string} Estado vacío cuando ningún filtro coincide. */
  get _emptyTpl() {
    return `
      <div class="fc-empty">
        <h3>${escapeHtml(t('finca.empty.title'))}</h3>
        <p class="muted">${escapeHtml(t('finca.empty.desc'))}</p>
        <button class="btn btn-primary" data-add type="button">+&nbsp;&nbsp;${escapeHtml(t('finca.add'))}</button>
      </div>`;
  }

  /** @returns {string} Barra fija de comparación (vacía si no hay selección). */
  get _comparebarTpl() {
    if (!this._compare.length) return '';
    const nombres = this._compare
      .map((id) => this._fincas.find((f) => f.id === id)?.nombre)
      .filter(Boolean)
      .join(' · ');
    return `
      <div class="fc-comparebar">
        <div class="fc-comparebar-inner">
          <span class="fc-comparebar-count">${escapeHtml(t('finca.compare.bar', { n: this._compare.length }))}</span>
          <span class="fc-comparebar-names">${escapeHtml(nombres)}</span>
          <button class="btn" id="cmp-clear" type="button">${escapeHtml(t('finca.compare.clear'))}</button>
          <button class="btn btn-primary" id="cmp-open" type="button">${escapeHtml(t('finca.compare.open'))}</button>
        </div>
      </div>`;
  }

  /** @returns {string} Ficha, comparador, alta y visor, todo en un mismo host. */
  get _overlayTpl() {
    return `${this._detailTpl}${this._addOpen ? this._addTpl : ''}${this._compare.length ? this._compareTpl : ''}${this._lightboxTpl}`;
  }

  /** @returns {string} Ficha de finca a pantalla completa (antes finca-detail). */
  get _detailTpl() {
    const f = this._fincas.find((x) => x.id === this._detailId);
    if (!f) return '';
    const fotos = f.fotos || [];
    const cover = fotos.length ? storage.url(fotos[0].url) : '';
    const costeVal = coste(f, this._invitados);
    const precioLabel = f.alquiler
      ? `${eur(f.alquiler)} alquiler + ${f.menu} €/inv.`
      : `${f.menu} € por invitado`;
    const specs = [
      { k: t('finca.table.zona'), v: `${f.zona} · ${f.km} km` },
      { k: t('finca.card.aforoVal'), v: `${f.capSent} sent. · ${f.capPie || 0} de pie` },
      { k: t('finca.table.val'), v: `${String(f.valoracion).replace('.', ',')} / 5` },
      { k: t('finca.compare.row.menu'), v: `${f.menu} €/inv.` },
      { k: t('finca.compare.row.alquiler'), v: f.alquiler ? eur(f.alquiler) : t('finca.compare.incluido') },
    ];
    return `
      <div class="fc-detail">
        <div class="fc-detail-head">
          <button class="btn btn-secondary" id="detail-back" type="button">←&nbsp;&nbsp;${escapeHtml(t('finca.detail.back'))}</button>
          <span class="fc-detail-nombre">${escapeHtml(f.nombre)}</span>
          <estado-badge class="fc-badge fc-detail-badge" data-kind="finca" data-value="${escapeHtml(f.estado)}"></estado-badge>
        </div>
        <div class="fc-detail-body">
          <div class="fc-detail-titlebar">
            <div>
              <div class="fc-detail-tipo">${escapeHtml(f.tipo)}</div>
              <h1>${escapeHtml(f.nombre)}</h1>
              <div class="fc-detail-sub muted">${escapeHtml(`${f.zona} · ${f.km} km`)} · ${escapeHtml(`${String(f.valoracion).replace('.', ',')} / 5`)}</div>
            </div>
            <div class="fc-detail-costebox">
              <div class="fc-lbl">${escapeHtml(t('finca.detail.coste'))}</div>
              <div class="fc-val">${escapeHtml(eurK(costeVal))}</div>
              <div class="fc-sub muted">${escapeHtml(precioLabel)}</div>
            </div>
          </div>
          <div class="fc-detail-cover">
            ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(f.nombre)}">` : `<div class="fc-ph">${escapeHtml(t('finca.detail.sinFotos'))}</div>`}
          </div>
          <div class="fc-detail-section">
            <h5>${escapeHtml(t('finca.detail.galeria'))}</h5>
            ${fotos.length ? this._galeriaTpl(f, fotos) : `<p class="fc-detail-sinfotos muted">${escapeHtml(t('finca.detail.sinFotos'))}</p>`}
          </div>
          <div class="fc-detail-cols">
            <div>
              <h5>${escapeHtml(t('finca.detail.datos'))}</h5>
              <table class="fc-detail-table">
                <tbody>${specs.map((sp) => `<tr><td class="k">${escapeHtml(sp.k)}</td><td class="v">${escapeHtml(sp.v)}</td></tr>`).join('')}</tbody>
              </table>
            </div>
            <div>
              <h5>${escapeHtml(t('finca.detail.servicios'))}</h5>
              <div class="fc-detail-tags">${(f.servicios || []).map((s) => `<span class="tag tag-neutral">${escapeHtml(s)}</span>`).join('')}</div>
              <h5 class="mt">${escapeHtml(t('finca.detail.fechas'))}</h5>
              <div class="fc-detail-tags">${(f.fechas || []).map((fe) => `<span class="tag tag-outline">${escapeHtml(fe)}</span>`).join('')}</div>
              <div class="field mt">
                <label>${escapeHtml(t('finca.detail.notas'))}</label>
                <textarea id="detail-notas" rows="6">${escapeHtml(f.notas || '')}</textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="fc-detail-actionbar">
          <span class="fc-detail-nombre-mini muted">${escapeHtml(f.nombre)}</span>
          <button class="btn btn-secondary" id="detail-favorita" type="button">${escapeHtml(t('finca.action.favorita'))}</button>
          <button class="btn btn-secondary" id="detail-descartar" type="button">${escapeHtml(t('finca.action.descartar'))}</button>
          <button class="btn btn-primary" id="detail-elegir" type="button">${escapeHtml(t('finca.action.elegir'))}</button>
        </div>
      </div>`;
  }

  /**
   * @param {object} f
   * @param {Array<{url: string, pie: string}>} fotos
   * @returns {string} Galería de la ficha, con el tour 360º si lo hay.
   */
  _galeriaTpl(f, fotos) {
    const tour = f.tour ? `
      <figure class="fc-detail-tour">
        <a href="${escapeHtml(f.tour.url)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(storage.url(f.tour.poster))}" alt="${escapeHtml(t('finca.detail.tour'))}" loading="lazy">
          <span class="fc-detail-tour-badge"><span>${escapeHtml(t('finca.detail.tour'))}</span></span>
        </a>
        <figcaption class="muted">${escapeHtml(f.tour.label || '')} · ${escapeHtml(t('finca.detail.tourFoot'))}</figcaption>
      </figure>` : '';
    const items = fotos.map((p, i) => `
      <figure>
        <div class="fc-detail-foto" data-lightbox="${i}">
          <img src="${escapeHtml(storage.url(p.url))}" alt="${escapeHtml(p.pie || '')}" loading="lazy">
        </div>
        <figcaption class="muted">${escapeHtml(p.pie || '')}</figcaption>
      </figure>`).join('');
    return `<div class="fc-detail-grid">${tour}${items}</div>`;
  }

  /** @returns {string} Visor de fotos a pantalla completa (antes finca-lightbox). */
  get _lightboxTpl() {
    if (this._lightboxIdx == null) return '';
    const f = this._fincas.find((x) => x.id === this._detailId);
    const fotos = f?.fotos || [];
    const foto = fotos[this._lightboxIdx];
    if (!foto) return '';
    return `
      <div class="fc-lightbox" id="lightbox-overlay">
        <div class="fc-lightbox-head">
          <span class="fc-lightbox-pie">${escapeHtml(foto.pie || '')}</span>
          <span class="fc-lightbox-contador">${escapeHtml(`${this._lightboxIdx + 1}/${fotos.length}`)}</span>
          <button class="fc-lightbox-close" id="lightbox-close" type="button">${escapeHtml(t('finca.lightbox.close'))}</button>
        </div>
        <div class="fc-lightbox-stage">
          <button class="fc-lightbox-nav" id="lightbox-prev" type="button">←</button>
          <img src="${escapeHtml(storage.url(foto.url))}" alt="${escapeHtml(foto.pie || '')}">
          <button class="fc-lightbox-nav" id="lightbox-next" type="button">→</button>
        </div>
      </div>`;
  }

  /** @returns {string} Diálogo comparativo (antes finca-compare), dentro de modal-dialog. */
  get _compareTpl() {
    const seleccion = this._compare.map((id) => this._fincas.find((f) => f.id === id)).filter(Boolean);
    const filas = filasComparador(seleccion, this._invitados);
    const thead = seleccion.map((f) => `<th>${escapeHtml(f.nombre)}</th>`).join('');
    const rows = filas.map((r) => {
      const cells = r.cells.map((c) => {
        const txt = c.txt.startsWith('finca.') ? t(c.txt) : c.txt;
        return c.win
          ? `<td><span class="tag tag-accent">${escapeHtml(txt)}</span></td>`
          : `<td>${escapeHtml(txt)}</td>`;
      }).join('');
      return `<tr><td class="fc-compare-label">${escapeHtml(t(r.label))}</td>${cells}</tr>`;
    }).join('');
    return `
      <modal-dialog id="compare-dialog" width="1100px">
        <p class="fc-compare-hint">${escapeHtml(t('finca.compare.hint', { inv: this._invitados }))}</p>
        <div class="fc-compare-wrap">
          <table class="fc-compare-table">
            <thead><tr><th class="fc-compare-crit">Criterio</th>${thead}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </modal-dialog>`;
  }

  /** @returns {string} Diálogo de alta de finca, dentro de modal-dialog. */
  get _addTpl() {
    const d = this._draft;
    return `
      <modal-dialog id="add-dialog">
        <div class="fc-add-grid">
          <div class="field fc-add-span2">
            <label>${escapeHtml(t('finca.add.nombre'))}</label>
            <input class="input" id="add-nombre" placeholder="${escapeHtml(t('finca.add.nombre.ph'))}" value="${escapeHtml(d.nombre)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.tipo'))}</label>
            <select class="input" id="add-tipo">
              ${TIPOS_ALTA.map((x) => `<option value="${escapeHtml(x)}"${x === d.tipo ? ' selected' : ''}>${escapeHtml(x)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.zona'))}</label>
            <input class="input" id="add-zona" placeholder="${escapeHtml(t('finca.add.zona.ph'))}" value="${escapeHtml(d.zona)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.aforo'))}</label>
            <input class="input" id="add-cap" type="number" min="0" value="${escapeHtml(d.capSent)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.menu'))}</label>
            <input class="input" id="add-menu" type="number" min="0" value="${escapeHtml(d.menu)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.alquiler'))}</label>
            <input class="input" id="add-alquiler" type="number" min="0" value="${escapeHtml(d.alquiler)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.km'))}</label>
            <input class="input" id="add-km" type="number" min="0" value="${escapeHtml(d.km)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('finca.add.senal'))}</label>
            <input class="input" id="add-senal" type="number" min="0" value="${escapeHtml(d.senal)}">
          </div>
        </div>
        <div class="fc-add-foot">
          <span class="fc-add-hint muted">${escapeHtml(t('finca.add.hint'))}</span>
          <button class="btn btn-primary" id="add-save" type="button">${escapeHtml(t('finca.add.save'))}</button>
        </div>
      </modal-dialog>`;
  }

  afterRender() {
    this.on(this.$('#f-q'), 'input', (e) => { this._q = e.target.value; this._apply(); });
    this.on(this.$('#f-tipo'), 'change', (e) => { this._tipo = e.target.value; this._apply(); });
    this.on(this.$('#f-estado'), 'change', (e) => { this._estado = e.target.value; this._apply(); });
    this.on(this.$('#f-sort'), 'change', (e) => { this._sort = e.target.value; this._apply(); });
    this.on(this.$('#f-invitados'), 'change', (e) => {
      this._invitados = Number(e.target.value) || 140;
      configRepo.set({ guestCount: this._invitados });
      this._apply();
    });
    this.on(this.$('#v-rejilla'), 'click', () => this._setView('rejilla'));
    this.on(this.$('#v-tabla'), 'click', () => this._setView('tabla'));
    this.on(this.$('#add-open'), 'click', () => this._openAdd());

    // Contenedores estables: delegación una sola vez por render completo.
    this.on(this.$('#banner'), 'click', (e) => this._onBannerClick(e));
    this.on(this.$('#list'), 'click', (e) => this._onListClick(e));
    this.on(this.$('#list'), 'change', (e) => this._onListChange(e));
    this.on(this.$('#comparebar'), 'click', (e) => this._onComparebarClick(e));
    this.on(this.$('#overlay'), 'click', (e) => this._onOverlayClick(e));
    this.on(this.$('#overlay'), 'change', (e) => this._onOverlayChange(e));
    this.on(this.$('#overlay'), 'input', (e) => this._onOverlayInput(e));

    this._wireBadges();
    this._wireOverlayDialogs();
  }

  /**
   * Re-renderiza solo banner/stats/lista/comparebar para que la búsqueda no
   * pierda el foco del input (nunca se toca el resto del árbol).
   */
  _apply() {
    const banner = this.$('#banner');
    if (banner) banner.innerHTML = this._bannerTpl;
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
    const list = this.$('#list');
    if (list) list.innerHTML = this._listTpl;
    const comparebar = this.$('#comparebar');
    if (comparebar) comparebar.innerHTML = this._comparebarTpl;
    this._wireBadges();
  }

  /** Repinta solo el overlay (ficha/comparador/alta/visor) y recablea sus diálogos. */
  _paintOverlay() {
    const overlay = this.$('#overlay');
    if (overlay) overlay.innerHTML = this._overlayTpl;
    this._wireBadges();
    this._wireOverlayDialogs();
  }

  /** Asigna kind/value a cada estado-badge tras (re)pintar su contenedor. */
  _wireBadges() {
    this.$$('.fc-badge').forEach((b) => {
      b.kind = b.dataset.kind || 'finca';
      b.value = b.dataset.value;
    });
  }

  /** Abre/cierra los modal-dialog del overlay y cablea su evento `close`. */
  _wireOverlayDialogs() {
    const compareDialog = this.$('#compare-dialog');
    if (compareDialog) {
      compareDialog.heading = t('finca.compare.title');
      this.on(compareDialog, 'close', () => { this._compareOpen = false; this._paintOverlay(); });
      if (this._compareOpen) compareDialog.open();
    }
    const addDialog = this.$('#add-dialog');
    if (addDialog) {
      addDialog.heading = t('finca.add.title');
      this.on(addDialog, 'close', () => { this._addOpen = false; this._paintOverlay(); });
      if (this._addOpen) addDialog.open();
    }
  }

  /**
   * Maneja Escape/←/→ del visor, solo cuando está abierto.
   * @param {KeyboardEvent} e
   */
  _onWindowKey = (e) => {
    if (this._lightboxIdx == null) return;
    if (e.key === 'Escape') this._closeLightbox();
    else if (e.key === 'ArrowRight') this._lightboxStep(1);
    else if (e.key === 'ArrowLeft') this._lightboxStep(-1);
  };

  /** @param {MouseEvent} e */
  _onBannerClick(e) {
    if (!e.target.closest('#clear-elegida')) return;
    const elegida = this._fincas.find((f) => f.estado === 'elegida');
    if (elegida) this._setEstado(elegida, 'candidata', 'finca.toast.candidata');
  }

  /** @param {MouseEvent} e */
  _onListClick(e) {
    const openEl = e.target.closest('[data-open]');
    if (openEl) { this._detailId = openEl.dataset.open; this._lightboxIdx = null; this._paintOverlay(); return; }
    if (e.target.closest('[data-add]')) this._openAdd();
  }

  /** @param {Event} e */
  _onListChange(e) {
    const cmp = e.target.closest('[data-cmp]');
    if (cmp) this._toggleCompare(cmp.dataset.cmp);
  }

  /** @param {MouseEvent} e */
  _onComparebarClick(e) {
    if (e.target.closest('#cmp-clear')) { this._compare = []; this._apply(); return; }
    if (e.target.closest('#cmp-open')) { this._compareOpen = true; this._paintOverlay(); }
  }

  /** @param {MouseEvent} e */
  _onOverlayClick(e) {
    if (e.target.closest('#detail-back')) { this._closeDetail(); return; }
    if (e.target.closest('#detail-favorita')) { this._detailAction('favorita', 'finca.toast.favorita'); return; }
    if (e.target.closest('#detail-descartar')) { this._detailAction('descartada', 'finca.toast.descartada'); return; }
    if (e.target.closest('#detail-elegir')) { this._elegirDetail(); return; }
    const foto = e.target.closest('[data-lightbox]');
    if (foto) { this._lightboxIdx = Number(foto.dataset.lightbox); this._paintOverlay(); return; }
    if (e.target.closest('#lightbox-close')) { this._closeLightbox(); return; }
    if (e.target.closest('#lightbox-prev')) { this._lightboxStep(-1); return; }
    if (e.target.closest('#lightbox-next')) { this._lightboxStep(1); return; }
    if (e.target.id === 'lightbox-overlay') { this._closeLightbox(); return; }
    if (e.target.closest('#add-save')) this._saveDraft();
  }

  /** @param {Event} e */
  _onOverlayChange(e) {
    if (e.target.id === 'detail-notas') { this._saveNotas(e.target.value); return; }
    if (String(e.target.id).startsWith('add-')) this._updateDraftField(e.target);
  }

  /** @param {Event} e */
  _onOverlayInput(e) {
    if (String(e.target.id).startsWith('add-')) this._updateDraftField(e.target);
  }

  // ---------- Filtros y vista ----------

  /** @param {'rejilla'|'tabla'} view */
  _setView(view) {
    if (this._view === view) return;
    this._view = view;
    const rejilla = this.$('#v-rejilla');
    const tabla = this.$('#v-tabla');
    if (rejilla) rejilla.setAttribute('aria-selected', String(view === 'rejilla'));
    if (tabla) tabla.setAttribute('aria-selected', String(view === 'tabla'));
    this._apply();
  }

  // ---------- Comparador ----------

  /** @param {string} id */
  _toggleCompare(id) {
    const idx = this._compare.indexOf(id);
    if (idx >= 0) this._compare.splice(idx, 1);
    else if (this._compare.length < 4) this._compare.push(id);
    this._apply();
  }

  // ---------- Ficha de detalle ----------

  _closeDetail() { this._detailId = null; this._lightboxIdx = null; this._paintOverlay(); }

  /**
   * @param {string} estado
   * @param {string} toastKey
   */
  _detailAction(estado, toastKey) {
    const f = this._fincas.find((x) => x.id === this._detailId);
    if (!f) return;
    this._setEstado(f, estado, toastKey);
    this._paintOverlay();
  }

  /** Marca la ficha abierta como elegida y degrada cualquier otra elegida a candidata. */
  _elegirDetail() {
    const f = this._fincas.find((x) => x.id === this._detailId);
    if (!f) return;
    this._fincas
      .filter((x) => x.estado === 'elegida' && x.id !== f.id)
      .forEach((x) => this._syncFinca(fincasRepo.upsert({ ...x, estado: 'candidata' })));
    this._syncFinca(fincasRepo.upsert({ ...f, estado: 'elegida' }));
    this._toast('finca.toast.elegida', { nombre: f.nombre });
    this._apply();
    this._paintOverlay();
  }

  /**
   * @param {object} f
   * @param {string} estado
   * @param {string} [toastKey]
   */
  _setEstado(f, estado, toastKey) {
    const updated = fincasRepo.upsert({ ...f, estado });
    this._syncFinca(updated);
    if (toastKey) this._toast(toastKey, { nombre: f.nombre });
    this._apply();
  }

  /** @param {string} value */
  _saveNotas(value) {
    const f = this._fincas.find((x) => x.id === this._detailId);
    if (!f) return;
    this._syncFinca(fincasRepo.upsert({ ...f, notas: value }));
    this._apply();
  }

  /**
   * Sustituye (o añade) una finca en la copia local tras persistirla.
   * @param {object} updated
   */
  _syncFinca(updated) {
    const idx = this._fincas.findIndex((x) => x.id === updated.id);
    if (idx >= 0) this._fincas[idx] = updated;
    else this._fincas.push(updated);
  }

  // ---------- Visor de fotos ----------

  _closeLightbox() { this._lightboxIdx = null; this._paintOverlay(); }

  /** @param {number} dir +1 siguiente, -1 anterior (circular). */
  _lightboxStep(dir) {
    const f = this._fincas.find((x) => x.id === this._detailId);
    const total = f?.fotos?.length || 0;
    if (!total || this._lightboxIdx == null) return;
    this._lightboxIdx = (this._lightboxIdx + dir + total) % total;
    this._paintOverlay();
  }

  // ---------- Alta de finca ----------

  _openAdd() {
    this._draft = draftVacio();
    this._addOpen = true;
    this._paintOverlay();
  }

  /** @param {HTMLInputElement|HTMLSelectElement} el */
  _updateDraftField(el) {
    const map = {
      'add-nombre': 'nombre', 'add-tipo': 'tipo', 'add-zona': 'zona', 'add-cap': 'capSent',
      'add-menu': 'menu', 'add-alquiler': 'alquiler', 'add-km': 'km', 'add-senal': 'senal',
    };
    const key = map[el.id];
    if (key) this._draft[key] = el.value;
  }

  _saveDraft() {
    const d = this._draft;
    const nombre = (d.nombre || '').trim();
    if (!nombre) return;
    const capSent = Number(d.capSent) || 0;
    const created = fincasRepo.upsert({
      nombre,
      tipo: d.tipo || 'Finca',
      zona: (d.zona || '').trim(),
      capSent,
      capPie: capSent,
      menu: Number(d.menu) || 0,
      alquiler: Number(d.alquiler) || 0,
      km: Number(d.km) || 0,
      senal: Number(d.senal) || 0,
      valoracion: 0,
      estado: 'candidata',
      servicios: [],
      fechas: [],
      notas: '',
      fotos: [],
    });
    this._fincas.push(created);
    this._addOpen = false;
    this._toast('finca.toast.creada', { nombre: created.nombre });
    this._apply();
    this._paintOverlay();
  }

  // ---------- Toast ----------

  /**
   * Muestra un aviso breve y lo oculta a los ~2.6 s.
   * @param {string} key Clave i18n.
   * @param {Record<string, string|number>} [vars]
   */
  _toast(key, vars) {
    const el = this.$('#toast');
    if (!el) return;
    el.textContent = t(key, vars);
    el.setAttribute('data-open', 'true');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.setAttribute('data-open', 'false'); }, 2600);
  }
}

customElements.define('finca-view', FincaView);
