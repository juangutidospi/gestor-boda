import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './proveedores-view.css.js';
import { t, getLang } from '../../../i18n/index.js';
import { ENUMS } from '../../../core/enums.js';
import {
  filtrar, ordenar, calcularStats, chipsCategorias, eur, eurK,
  checklistDe, checklistProgreso, CHECKLIST_STEPS, timelinePagos,
} from './proveedores-calc.js';
import { ensureSeeded, proveedoresRepo, listaCategorias, presupuestoRepo } from '../../../core/repos.js';
import '../../ui/modal-dialog/modal-dialog.js';
import '../../ui/estado-badge/estado-badge.js';
import '../../ui/empty-state/empty-state.js';
import '../../ui/toast/toast.js';
import '../../ui/drawer/drawer.js';
import '../../ui/segmented-tabs/segmented-tabs.js';

/** Columnas del tablero Kanban (estados en el flujo de contratación). */
const TABLERO_COLS = ['pendiente', 'contactado', 'presupuesto', 'contratado', 'descartado'];

/** Orden de los estados de proveedor ofrecidos al dar de alta o editar. */
const ESTADOS_ALTA = ['pendiente', 'contactado', 'presupuesto', 'contratado', 'descartado'];

/**
 * Borrador vacío del formulario de alta/edición.
 * @param {string[]} [cats] Categorías disponibles, para preseleccionar la primera.
 */
function draftVacio(cats = []) {
  return {
    nombre: '', categoria: cats[0] || '', estado: 'pendiente', contacto: '', telefono: '', precio: '', senal: '', notas: '',
  };
}

/**
 * Vista Proveedores. Componente único: stats, filtros, chips de categorías
 * por cubrir, rejilla de tarjetas y alta/edición, todo como getters de
 * plantilla de este mismo componente (sin sub-componentes de vista propios).
 * Persistencia solo vía proveedoresRepo.
 */
export class ProveedoresView extends AppElement {
  static styles = [styles];

  /** @type {object[]} */
  _provs = [];
  /** @type {string[]} */
  _cats = [];
  _q = '';
  _categoria = 'Todas';
  _estado = 'Todos';
  /** Criterio de orden de la rejilla. */
  _orden = 'categoria';
  /** Categoría en comparación (null = comparador cerrado). */
  _compareCat = null;
  _open = false;
  /** @type {string|null} */
  _editId = null;
  _draft = draftVacio();
  /** Presupuesto límite (para el medidor de gasto del hero). */
  _limite = 0;
  /** Recuerda si ya estaban todas las categorías cubiertas (celebración una vez). */
  _wasFullyCovered = false;
  /** Modo de vista: 'rejilla' | 'tablero' (Kanban). */
  _vista = 'rejilla';
  /** Ids seleccionados para acciones en lote. */
  _selected = new Set();
  /** Id del proveedor con la ficha (drawer) abierta, o null. */
  _fichaId = null;
  /** Panel de próximos pagos desplegado. */
  _pagosOpen = false;

  /** Registra atajos de teclado y cierre del popover UNA sola vez. */
  connectedCallback() {
    super.connectedCallback();
    this.on(window, 'keydown', this._onKey);
    this.on(window, 'click', this._onWinClick);
  }

  /**
   * Atajos globales (solo si la vista es visible): "/" enfoca el buscador,
   * "N" abre el alta, "Esc" cierra el popover de estado.
   * @param {KeyboardEvent} e
   */
  _onKey = (e) => {
    if (this.offsetParent === null) return;
    if (e.key === 'Escape' && !this.$('#estado-pop')?.hidden) { this._closePop(); return; }
    const active = this.shadowRoot.activeElement;
    const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
    if (typing || this._open || this._compareCat) return;
    if (e.key === '/') { e.preventDefault(); this.$('#pf-q')?.focus(); return; }
    if (e.key.toLowerCase() === 'n') { e.preventDefault(); this._openAdd(); }
  };

  /** Cierra el popover de estado al hacer clic fuera de él. */
  _onWinClick = () => { if (!this.$('#estado-pop')?.hidden) this._closePop(); };

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._provs = proveedoresRepo.list();
    this._cats = listaCategorias();
    this._limite = Number(presupuestoRepo.get().limite) || 0;
    this._wasFullyCovered = this._cats.length > 0 && chipsCategorias(this._provs, this._cats).every((c) => c.estado === 'cubierta');
    this._paint();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="page-head">
          <span class="eyebrow">${escapeHtml(t('nav.proveedores'))}</span>
          <h1>${escapeHtml(t('prov.title'))}</h1>
          <p class="muted">${escapeHtml(t('prov.subtitle'))}</p>
        </div>
        <div id="hero">${this._heroTpl}</div>
        <div id="insights">${this._insightsTpl}</div>
        <div id="pagos">${this._pagosTpl}</div>
        <div id="stats">${this._statsTpl}</div>
        ${this._filtersTpl}
        <section class="prov-chips-wrap" id="chips">${this._chipsTpl}</section>
        <div class="prov-toolbar">
          <segmented-tabs id="pf-vista"></segmented-tabs>
        </div>
        <div id="listing">${this._listingTpl}</div>
        <p class="prov-foot muted">${escapeHtml(t('prov.foot'))}</p>
        <div id="overlay">${this._overlayTpl}</div>
        <div id="compare">${this._compareTpl}</div>
        <div id="estado-pop" class="prov-estado-pop" role="menu" hidden></div>
        <div id="bulkbar">${this._bulkbarTpl}</div>
        <app-drawer id="ficha"></app-drawer>
        <div id="confetti" aria-hidden="true"></div>
        <app-toast id="toast"></app-toast>
      </div>`;
  }

  /** @returns {string} Listado: rejilla de tarjetas o tablero Kanban según `_vista`. */
  get _listingTpl() {
    if (this._vista === 'tablero') return this._boardTpl;
    const cards = this._gridTpl;
    return cards
      ? `<div id="grid" class="prov-grid">${cards}</div>`
      : `<div id="empty">${this._emptyTpl}</div>`;
  }

  /** @returns {string} Las cuatro tarjetas de estadística. */
  get _statsTpl() {
    const stats = calcularStats(this._provs, this._cats);
    return `
      <section class="prov-stats-row">
        ${stats.map((s) => `
          <div class="prov-stat">
            <span class="prov-stat-label">${escapeHtml(t(s.label))}</span>
            <span class="prov-stat-value">${escapeHtml(String(s.value))}</span>
            <span class="prov-stat-note muted">${escapeHtml(s.noteRaw ? s.note : t(s.note, s.noteVars))}</span>
          </div>`).join('')}
      </section>`;
  }

  /**
   * Hero de progreso: donut de cobertura de categorías (cubiertas/en marcha/por
   * cubrir) y medidor de gasto (comprometido vs presupuesto límite). Se anima al pintar.
   * @returns {string}
   */
  get _heroTpl() {
    const chips = chipsCategorias(this._provs, this._cats);
    const cub = chips.filter((c) => c.estado === 'cubierta').length;
    const marcha = chips.filter((c) => c.estado === 'enMarcha').length;
    const vacia = chips.filter((c) => c.estado === 'vacia').length;
    const totalCat = this._cats.length || 1;
    const R = 54;
    const C = 2 * Math.PI * R;
    const seg = (n) => (n / totalCat) * C;
    const arc = (len, startFrac, cls) => `<circle class="prov-donut-arc ${cls}" cx="64" cy="64" r="${R}" fill="none" stroke-width="14" stroke-linecap="round"
      style="stroke-dasharray:${len.toFixed(1)} ${C.toFixed(1)};stroke-dashoffset:${len.toFixed(1)};transform:rotate(${(-90 + startFrac * 360).toFixed(2)}deg)"></circle>`;
    const contratados = this._provs.filter((p) => p.estado === 'contratado');
    const comprometido = contratados.reduce((a, p) => a + (Number(p.precio) || 0), 0);
    const senal = this._provs.reduce((a, p) => a + (Number(p.senal) || 0), 0);
    // Saldo pendiente de pago: sobre los contratados, precio menos su señal.
    const pendiente = contratados.reduce((a, p) => a + Math.max(0, (Number(p.precio) || 0) - (Number(p.senal) || 0)), 0);
    const pct = this._limite ? Math.min(100, Math.round((comprometido / this._limite) * 100)) : 0;
    const meter = this._limite
      ? `<div class="prov-meter-bar"><span class="prov-meter-fill" style="width:0" data-w="${pct}"></span></div>
         <div class="prov-meter-cap muted">${escapeHtml(t('prov.hero.gastoCap', { gasto: eurK(comprometido), limite: eurK(this._limite), senal: eurK(senal), pendiente: eurK(pendiente) }))}</div>`
      : `<div class="prov-meter-bar prov-meter-empty"></div>
         <div class="prov-meter-cap muted">${escapeHtml(t('prov.hero.sinLimite', { gasto: eurK(comprometido), pendiente: eurK(pendiente) }))}</div>`;
    return `
      <section class="prov-hero">
        <div class="prov-hero-ring">
          <svg viewBox="0 0 128 128" class="prov-donut" aria-hidden="true">
            <circle cx="64" cy="64" r="${R}" fill="none" stroke-width="14" class="prov-donut-track"></circle>
            ${cub ? arc(seg(cub), 0, 'is-cub') : ''}
            ${marcha ? arc(seg(marcha), cub / totalCat, 'is-marcha') : ''}
            ${vacia ? arc(seg(vacia), (cub + marcha) / totalCat, 'is-vacia') : ''}
          </svg>
          <div class="prov-donut-center">
            <span class="prov-donut-num"><span data-count="${cub}">0</span>/${totalCat}</span>
            <span class="prov-donut-lbl muted">${escapeHtml(t('prov.hero.cubiertas'))}</span>
          </div>
        </div>
        <div class="prov-hero-body">
          <div class="prov-hero-legend">
            <span class="prov-leg"><i class="prov-leg-dot is-cub"></i>${escapeHtml(t('prov.hero.leg.cubierta'))} <b>${cub}</b></span>
            <span class="prov-leg"><i class="prov-leg-dot is-marcha"></i>${escapeHtml(t('prov.hero.leg.enMarcha'))} <b>${marcha}</b></span>
            <span class="prov-leg"><i class="prov-leg-dot is-vacia"></i>${escapeHtml(t('prov.hero.leg.vacia'))} <b>${vacia}</b></span>
          </div>
          <div class="prov-meter">
            <div class="prov-meter-lbl">${escapeHtml(t('prov.hero.gasto'))}</div>
            ${meter}
          </div>
        </div>
      </section>`;
  }

  /** @returns {string} Chips de insight accionables (cada uno aplica un filtro de estado). */
  get _insightsTpl() {
    const porBuscar = this._provs.filter((p) => p.estado === 'pendiente').length;
    const conPres = this._provs.filter((p) => p.estado === 'presupuesto').length;
    const sinSenal = this._provs.filter((p) => p.estado === 'contratado' && !(Number(p.senal) > 0)).length;
    const items = [];
    if (porBuscar) items.push({ k: 'pendiente', txt: t('prov.insight.porBuscar', { n: porBuscar }) });
    if (conPres) items.push({ k: 'presupuesto', txt: t('prov.insight.presupuesto', { n: conPres }) });
    if (sinSenal) items.push({ k: 'sinSenal', txt: t('prov.insight.sinSenal', { n: sinSenal }) });
    if (!items.length) return '';
    return `<div class="prov-insights">${items.map((i) => `<button type="button" class="prov-insight" data-insight="${i.k}">${escapeHtml(i.txt)}</button>`).join('')}</div>`;
  }

  /** @returns {string} Barra de filtros (estática: se cablea una sola vez). */
  get _filtersTpl() {
    return `
      <section class="prov-filters">
        <div class="field prov-search">
          <label>${escapeHtml(t('prov.search'))}</label>
          <input class="input" type="search" id="pf-q" placeholder="${escapeHtml(t('prov.search.ph'))}" value="${escapeHtml(this._q)}">
        </div>
        <div class="field">
          <label>${escapeHtml(t('prov.filter.categoria'))}</label>
          <select class="input" id="pf-categoria">
            <option value="Todas"${this._categoria === 'Todas' ? ' selected' : ''}>${escapeHtml(t('prov.filter.todas'))}</option>
            ${this._cats.map((c) => `<option value="${escapeHtml(c)}"${c === this._categoria ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('prov.filter.estado'))}</label>
          <select class="input" id="pf-estado">
            <option value="Todos"${this._estado === 'Todos' ? ' selected' : ''}>${escapeHtml(t('prov.filter.todos'))}</option>
            <option value="contratado"${this._estado === 'contratado' ? ' selected' : ''}>${escapeHtml(t('prov.filter.contratados'))}</option>
            <option value="presupuesto"${this._estado === 'presupuesto' ? ' selected' : ''}>${escapeHtml(t('prov.filter.presupuesto'))}</option>
            <option value="contactado"${this._estado === 'contactado' ? ' selected' : ''}>${escapeHtml(t('prov.filter.contactados'))}</option>
            <option value="pendiente"${this._estado === 'pendiente' ? ' selected' : ''}>${escapeHtml(t('prov.filter.pendientes'))}</option>
            <option value="descartado"${this._estado === 'descartado' ? ' selected' : ''}>${escapeHtml(t('prov.filter.descartados'))}</option>
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('prov.filter.orden'))}</label>
          <select class="input" id="pf-orden">
            ${['categoria', 'precio', 'senal', 'nombre', 'estado'].map((k) => `<option value="${k}"${k === this._orden ? ' selected' : ''}>${escapeHtml(t(`prov.orden.${k}`))}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="btn btn-primary prov-add" id="add-open">+&nbsp;&nbsp;${escapeHtml(t('prov.add'))}</button>
      </section>`;
  }

  /** @returns {string} Chips de categorías por cubrir (cubierta ✓ / en marcha / vacía +). */
  get _chipsTpl() {
    const chips = chipsCategorias(this._provs, this._cats);
    return `
      <h5>${escapeHtml(t('prov.chips.title'))}</h5>
      <div class="prov-chips">
        ${chips.map((c) => {
    const cls = c.estado === 'cubierta' ? 'is-cubierta' : (c.estado === 'enMarcha' ? 'is-enmarcha' : 'is-vacia');
    const icon = c.estado === 'cubierta' ? '✓ ' : (c.estado === 'vacia' ? '+ ' : '');
    return `<button type="button" class="prov-chip ${cls}" data-cat="${escapeHtml(c.categoria)}">${icon}${escapeHtml(c.categoria)}</button>`;
  }).join('')}
      </div>`;
  }

  /** @returns {object[]} Proveedores filtrados y ordenados por categoría. */
  get _visible() {
    const filtrados = filtrar(this._provs, { q: this._q, categoria: this._categoria, estado: this._estado });
    return ordenar(filtrados, this._cats, this._orden);
  }

  /** @returns {string} Rejilla de tarjetas (vacía si ningún proveedor coincide). */
  get _gridTpl() {
    // Proveedores por categoría (sin descartados): habilita comparar cuando hay ≥2.
    const counts = {};
    this._provs.forEach((p) => { if (p.estado !== 'descartado') counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    return this._visible.map((p, idx) => this._cardTpl(p, idx, counts[p.categoria] || 0)).join('');
  }

  /**
   * Iniciales de una categoría para el monograma (1-2 letras).
   * @param {string} cat
   * @returns {string}
   */
  _monograma(cat) {
    const palabras = String(cat).trim().split(/\s+/).filter(Boolean);
    const ini = palabras.length >= 2 ? palabras[0][0] + palabras[1][0] : (palabras[0] || '?').slice(0, 2);
    return ini.toUpperCase();
  }

  /**
   * @param {object} p
   * @param {number} idx Índice visible, para escalonar la entrada.
   * @param {number} catCount Nº de proveedores comparables de su categoría (≥2 habilita comparar).
   * @returns {string} Una tarjeta de proveedor.
   */
  _cardTpl(p, idx, catCount = 0) {
    const contactoPartes = [p.contacto, p.telefono].filter(Boolean);
    const contactoLinea = contactoPartes.length ? contactoPartes.join(' · ') : t('prov.card.sinContacto');
    const precioLabel = Number(p.precio) ? eur(Number(p.precio)) : t('prov.card.sinPresupuesto');
    const senalLabel = Number(p.senal) ? eur(Number(p.senal)) : '—';
    const contratado = p.estado === 'contratado';
    const accionLabel = contratado ? t('prov.card.contratado') : t('prov.card.contratar');
    const compareBtn = catCount >= 2 && p.estado !== 'descartado'
      ? `<button class="btn btn-ghost prov-compare-btn" data-compare="${escapeHtml(p.categoria)}" type="button">${escapeHtml(t('prov.card.comparar', { n: catCount }))}</button>`
      : '';
    const selected = this._selected.has(p.id);
    const prog = checklistProgreso(p);
    return `
      <article class="prov-card${selected ? ' is-selected' : ''}" data-id="${escapeHtml(p.id)}" data-estado="${escapeHtml(p.estado)}" style="--i:${idx}">
        <div class="prov-card-top">
          <label class="prov-sel">
            <input type="checkbox" data-sel="${escapeHtml(p.id)}"${selected ? ' checked' : ''} aria-label="${escapeHtml(t('prov.bulk.seleccionar', { nombre: p.nombre }))}">
          </label>
          <button type="button" class="prov-mono" data-ficha="${escapeHtml(p.id)}" title="${escapeHtml(t('prov.ficha.abrir'))}">${escapeHtml(this._monograma(p.categoria))}</button>
          <div class="prov-card-id">
            <span class="prov-card-cat">${escapeHtml(p.categoria)}</span>
            <h3><button type="button" class="prov-name-btn" data-ficha="${escapeHtml(p.id)}">${escapeHtml(p.nombre)}</button></h3>
            <span class="prov-card-contacto muted">${escapeHtml(contactoLinea)}</span>
          </div>
          <div class="prov-card-tr">
            ${prog.done ? `<span class="prov-check" title="${escapeHtml(t('prov.ficha.checklist'))}">✓ ${prog.done}/${prog.total}</span>` : ''}
            <button type="button" class="prov-badge-btn" data-badge="${escapeHtml(p.id)}" aria-label="${escapeHtml(t('prov.card.cambiarEstado'))}" aria-haspopup="menu">
              <estado-badge class="prov-badge" data-kind="prov" data-value="${escapeHtml(p.estado)}"></estado-badge>
            </button>
          </div>
        </div>
        <div class="prov-card-panel">
          <div><span class="prov-lbl">${escapeHtml(t('prov.card.precio'))}</span><span class="prov-val">${escapeHtml(precioLabel)}</span></div>
          <div class="prov-sep"><span class="prov-lbl">${escapeHtml(t('prov.card.senal'))}</span><span class="prov-val prov-val-sm">${escapeHtml(senalLabel)}</span></div>
        </div>
        ${contratado && Number(p.precio) ? this._senalBarTpl(p) : ''}
        ${p.notas ? `<p class="prov-card-notas muted">${escapeHtml(p.notas)}</p>` : ''}
        <div class="prov-card-foot">
          <button class="btn btn-secondary" data-edit="${escapeHtml(p.id)}" type="button">${escapeHtml(t('prov.card.editar'))}</button>
          <button class="btn btn-ghost" data-del="${escapeHtml(p.id)}" type="button">${escapeHtml(t('prov.card.eliminar'))}</button>
          ${compareBtn}
          <button class="btn ${contratado ? 'btn-secondary' : 'btn-primary'}" data-contratar="${escapeHtml(p.id)}" type="button">${escapeHtml(accionLabel)}</button>
        </div>
      </article>`;
  }

  /**
   * Barra de señal pagada sobre el precio (solo tarjetas contratadas con precio).
   * @param {object} p
   * @returns {string}
   */
  _senalBarTpl(p) {
    const precio = Number(p.precio) || 0;
    const pagado = Math.min(precio, Number(p.senal) || 0);
    const pct = precio ? Math.round((pagado / precio) * 100) : 0;
    const resto = Math.max(0, precio - pagado);
    const cap = resto <= 0 ? t('prov.card.senalFull') : t('prov.card.senalBar', { pct, resto: eur(resto) });
    return `
      <div class="prov-senal">
        <div class="prov-senal-bar"><span class="prov-senal-fill" style="width:${pct}%"></span></div>
        <span class="prov-senal-cap muted">${escapeHtml(cap)}</span>
      </div>`;
  }

  /** Formatea una fecha ISO (YYYY-MM-DD) al idioma activo. */
  _fmtFecha(iso) {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** @returns {string} Panel plegable de próximos pagos (vacío si no hay saldo). */
  get _pagosTpl() {
    const { entradas, totalPendiente, totalPagado } = timelinePagos(this._provs);
    if (!entradas.length) return '';
    const list = this._pagosOpen
      ? `<ul class="prov-pagos-list">
          ${entradas.map((e) => `
            <li class="prov-pago" data-ficha="${escapeHtml(e.id)}">
              <span class="prov-pago-fecha">${e.fecha ? escapeHtml(this._fmtFecha(e.fecha)) : escapeHtml(t('prov.pagos.sinFecha'))}</span>
              <span class="prov-pago-nombre">${escapeHtml(e.nombre)}<span class="muted"> · ${escapeHtml(e.categoria)}</span></span>
              <span class="prov-pago-importe">${escapeHtml(eur(e.importe))}</span>
            </li>`).join('')}
        </ul>`
      : '';
    return `
      <section class="prov-pagos${this._pagosOpen ? ' is-open' : ''}">
        <button type="button" class="prov-pagos-head" data-pagos-toggle aria-expanded="${this._pagosOpen}">
          <span class="prov-pagos-caret" aria-hidden="true">${this._pagosOpen ? '▾' : '▸'}</span>
          <span class="prov-pagos-title">${escapeHtml(t('prov.pagos.title'))}</span>
          <span class="prov-pagos-total">${escapeHtml(t('prov.pagos.total'))} <b>${escapeHtml(eur(totalPendiente))}</b></span>
          <span class="prov-pagos-pagado muted">${escapeHtml(t('prov.pagos.pagado'))} ${escapeHtml(eur(totalPagado))}</span>
        </button>
        ${list}
      </section>`;
  }

  /** @returns {string} Tablero Kanban: una columna por estado con tarjetas arrastrables. */
  get _boardTpl() {
    const base = ordenar(filtrar(this._provs, { q: this._q, categoria: this._categoria, estado: 'Todos' }), this._cats, this._orden);
    const byCol = {};
    TABLERO_COLS.forEach((c) => { byCol[c] = []; });
    base.forEach((p) => { if (byCol[p.estado]) byCol[p.estado].push(p); });
    return `
      <div class="prov-board" id="board">
        ${TABLERO_COLS.map((col) => `
          <div class="prov-col" data-col="${col}">
            <div class="prov-col-head">
              <estado-badge class="prov-badge" data-kind="prov" data-value="${col}"></estado-badge>
              <span class="prov-col-count">${byCol[col].length}</span>
            </div>
            <div class="prov-col-body" data-col-body="${col}">
              ${byCol[col].map((p) => this._boardCardTpl(p)).join('')}
            </div>
          </div>`).join('')}
      </div>`;
  }

  /** @param {object} p @returns {string} Tarjeta compacta y arrastrable del tablero. */
  _boardCardTpl(p) {
    const prog = checklistProgreso(p);
    const precio = Number(p.precio) ? eur(Number(p.precio)) : '—';
    return `
      <article class="prov-bcard" draggable="true" data-card="${escapeHtml(p.id)}" data-ficha="${escapeHtml(p.id)}">
        <span class="prov-bcard-mono" aria-hidden="true">${escapeHtml(this._monograma(p.categoria))}</span>
        <div class="prov-bcard-txt">
          <div class="prov-bcard-nombre">${escapeHtml(p.nombre)}</div>
          <div class="prov-bcard-meta muted">${escapeHtml(p.categoria)} · ${escapeHtml(precio)}</div>
        </div>
        ${prog.done ? `<span class="prov-check">✓ ${prog.done}/${prog.total}</span>` : ''}
      </article>`;
  }

  /** @returns {string} Barra flotante de acciones en lote (vacía si no hay selección). */
  get _bulkbarTpl() {
    const n = this._selected.size;
    if (!n) return '';
    return `
      <div class="prov-bulkbar" role="toolbar" aria-label="${escapeHtml(t('prov.bulk.sel', { n }))}">
        <span class="prov-bulk-count">${escapeHtml(t('prov.bulk.sel', { n }))}</span>
        <button class="btn btn-secondary" type="button" data-bulk="contratar">${escapeHtml(t('prov.bulk.contratar'))}</button>
        <button class="btn btn-secondary" type="button" data-bulk="descartar">${escapeHtml(t('prov.bulk.descartar'))}</button>
        <button class="btn btn-ghost" type="button" data-bulk="eliminar">${escapeHtml(t('prov.bulk.eliminar'))}</button>
        <button class="btn btn-ghost" type="button" data-bulk="limpiar">${escapeHtml(t('prov.bulk.limpiar'))}</button>
      </div>`;
  }

  /** Clave i18n del próximo paso de contratación, o null si está descartado/listo. */
  _proximoPaso(p) {
    if (p.estado === 'descartado') return null;
    if (p.estado === 'pendiente') return 'prov.paso.buscar';
    if (p.estado === 'contactado') return 'prov.paso.presupuesto';
    if (p.estado === 'presupuesto') return 'prov.paso.contratar';
    const c = checklistDe(p);
    if (!c.senal) return 'prov.paso.senal';
    if (!c.contrato) return 'prov.paso.contrato';
    if (!c.confirmado) return 'prov.paso.confirmar';
    return 'prov.paso.listo';
  }

  /** @param {object} p @returns {string} Contenido de la ficha (dentro del drawer). */
  _fichaContentTpl(p) {
    const c = checklistDe(p);
    const prog = checklistProgreso(p);
    const contacto = [p.contacto, p.telefono].filter(Boolean).join(' · ') || t('prov.card.sinContacto');
    const precio = Number(p.precio) ? eur(Number(p.precio)) : t('prov.card.sinPresupuesto');
    const senal = Number(p.senal) ? eur(Number(p.senal)) : '—';
    const pendiente = p.estado === 'contratado' ? eur(Math.max(0, (Number(p.precio) || 0) - (Number(p.senal) || 0))) : '—';
    const paso = this._proximoPaso(p);
    const dato = (lbl, val) => `<div class="prov-ficha-dato"><span class="prov-lbl">${escapeHtml(lbl)}</span><span class="prov-ficha-val">${escapeHtml(val)}</span></div>`;
    return `
      <div class="prov-ficha" data-ficha-id="${escapeHtml(p.id)}">
        <div class="prov-ficha-head">
          <span class="prov-mono prov-ficha-mono" aria-hidden="true">${escapeHtml(this._monograma(p.categoria))}</span>
          <div class="prov-ficha-head-txt">
            <span class="prov-card-cat">${escapeHtml(p.categoria)}</span>
            <span class="muted">${escapeHtml(contacto)}</span>
          </div>
          <estado-badge class="prov-badge" data-kind="prov" data-value="${escapeHtml(p.estado)}"></estado-badge>
        </div>
        <div class="prov-ficha-datos">
          ${dato(t('prov.ficha.precio'), precio)}
          ${dato(t('prov.ficha.senal'), senal)}
          ${dato(t('prov.ficha.pendiente'), pendiente)}
          ${p.fechaPago ? dato(t('prov.ficha.pago'), this._fmtFecha(p.fechaPago)) : ''}
        </div>
        ${paso ? `<div class="prov-ficha-paso"><span class="prov-lbl">${escapeHtml(t('prov.ficha.proximoPaso'))}</span><span class="prov-ficha-paso-txt">${escapeHtml(t(paso))}</span></div>` : ''}
        <div class="prov-ficha-check">
          <div class="prov-ficha-check-head">
            <h5>${escapeHtml(t('prov.ficha.checklist'))}</h5>
            <span class="prov-check">${escapeHtml(t('prov.ficha.progreso', { done: prog.done, total: prog.total }))}</span>
          </div>
          ${CHECKLIST_STEPS.map((k) => `
            <label class="prov-step${c[k] ? ' is-done' : ''}">
              <input type="checkbox" data-step="${k}"${c[k] ? ' checked' : ''}>
              <span class="prov-step-mark" aria-hidden="true"></span>
              <span>${escapeHtml(t(`prov.ficha.paso.${k}`))}</span>
            </label>`).join('')}
        </div>
        <div class="prov-ficha-notas">
          <span class="prov-lbl">${escapeHtml(t('prov.ficha.notas'))}</span>
          <p class="${p.notas ? '' : 'muted'}">${escapeHtml(p.notas || t('prov.ficha.sinNotas'))}</p>
        </div>
        <div class="prov-ficha-foot">
          <button class="btn btn-secondary" type="button" data-ficha-edit="${escapeHtml(p.id)}">${escapeHtml(t('prov.ficha.editar'))}</button>
        </div>
      </div>`;
  }

  /** @returns {string} Estado vacío cuando ningún filtro coincide. */
  get _emptyTpl() {
    return `
      <empty-state title="${escapeHtml(t('prov.empty.title'))}" desc="${escapeHtml(t('prov.empty.desc'))}"></empty-state>
      <button class="btn btn-primary" id="empty-add" type="button">+&nbsp;&nbsp;${escapeHtml(t('prov.add'))}</button>`;
  }

  /** @returns {string} Diálogo de alta/edición de proveedor, dentro de modal-dialog. */
  get _overlayTpl() {
    if (!this._open) return '';
    const d = this._draft;
    return `
      <modal-dialog id="prov-dialog">
        <div class="prov-form-grid">
          <div class="field prov-form-span2">
            <label>${escapeHtml(t('prov.add.nombre'))}</label>
            <input class="input" id="pd-nombre" placeholder="${escapeHtml(t('prov.add.nombre.ph'))}" value="${escapeHtml(d.nombre)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('prov.add.categoria'))}</label>
            <select class="input" id="pd-categoria">
              ${this._cats.map((c) => `<option value="${escapeHtml(c)}"${c === d.categoria ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('prov.add.estado'))}</label>
            <select class="input" id="pd-estado">
              ${ESTADOS_ALTA.map((k) => `<option value="${escapeHtml(k)}"${k === d.estado ? ' selected' : ''}>${escapeHtml(t(ENUMS.provEstado[k]))}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('prov.add.contacto'))}</label>
            <input class="input" id="pd-contacto" value="${escapeHtml(d.contacto)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('prov.add.telefono'))}</label>
            <input class="input" id="pd-telefono" value="${escapeHtml(d.telefono)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('prov.add.precio'))}</label>
            <input class="input" id="pd-precio" type="number" min="0" value="${escapeHtml(d.precio)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('prov.add.senal'))}</label>
            <input class="input" id="pd-senal" type="number" min="0" value="${escapeHtml(d.senal)}">
          </div>
          <div class="field prov-form-span2">
            <label>${escapeHtml(t('prov.add.notas'))}</label>
            <textarea class="input" id="pd-notas" rows="3">${escapeHtml(d.notas)}</textarea>
          </div>
        </div>
        <div class="prov-form-foot">
          <button class="btn btn-primary" id="pd-save" type="button">${escapeHtml(t('prov.add.guardar'))}</button>
        </div>
      </modal-dialog>`;
  }

  /**
   * Comparador por categoría: tabla lado a lado (precio/señal/pendiente/contacto/
   * notas) de los proveedores no descartados de la categoría, con el más barato
   * resaltado. Dentro de un modal-dialog.
   * @returns {string}
   */
  get _compareTpl() {
    if (!this._compareCat) return '';
    const provs = this._provs.filter((p) => p.categoria === this._compareCat && p.estado !== 'descartado');
    const precios = provs.map((p) => Number(p.precio) || 0).filter((v) => v > 0);
    const minPrecio = precios.length ? Math.min(...precios) : 0;
    const th = (p) => `<th class="${p.estado === 'contratado' ? 'is-contratado' : ''}">${escapeHtml(p.nombre)}</th>`;
    const precioCell = (p) => {
      const v = Number(p.precio) || 0;
      const best = v > 0 && v === minPrecio && provs.length > 1;
      const label = v ? eur(v) : '—';
      return `<td class="prov-cmp-num${best ? ' is-best' : ''}">${escapeHtml(label)}${best ? `<span class="prov-cmp-tag">${escapeHtml(t('prov.compare.barato'))}</span>` : ''}</td>`;
    };
    const pendiente = (p) => {
      if (p.estado !== 'contratado' || !Number(p.precio)) return '—';
      return eur(Math.max(0, (Number(p.precio) || 0) - (Number(p.senal) || 0)));
    };
    const rows = [
      [t('prov.compare.estado'), (p) => `<estado-badge class="prov-badge" data-kind="prov" data-value="${escapeHtml(p.estado)}"></estado-badge>`, 'html'],
      [t('prov.compare.precio'), precioCell, 'raw'],
      [t('prov.compare.senal'), (p) => (Number(p.senal) ? eur(Number(p.senal)) : '—'), 'num'],
      [t('prov.compare.pendiente'), pendiente, 'num'],
      [t('prov.compare.contacto'), (p) => ([p.contacto, p.telefono].filter(Boolean).join(' · ') || '—'), 'text'],
      [t('prov.compare.notas'), (p) => (p.notas || '—'), 'text'],
    ];
    const body = rows.map(([label, fn, kind]) => {
      const cells = provs.map((p) => {
        if (kind === 'raw') return fn(p);
        if (kind === 'html') return `<td>${fn(p)}</td>`;
        return `<td${kind === 'num' ? ' class="prov-cmp-num"' : ''}>${escapeHtml(fn(p))}</td>`;
      }).join('');
      return `<tr><th scope="row">${escapeHtml(label)}</th>${cells}</tr>`;
    }).join('');
    return `
      <modal-dialog id="prov-compare-dialog">
        <div class="prov-compare-wrap">
          <table class="prov-compare">
            <thead><tr><th></th>${provs.map(th).join('')}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </modal-dialog>`;
  }

  afterRender() {
    this.on(this.$('#pf-q'), 'input', (e) => { this._q = e.target.value; this._apply(); });
    this.on(this.$('#pf-categoria'), 'change', (e) => { this._categoria = e.target.value; this._apply(true); });
    this.on(this.$('#pf-estado'), 'change', (e) => { this._estado = e.target.value; this._apply(true); });
    this.on(this.$('#pf-orden'), 'change', (e) => { this._orden = e.target.value; this._apply(true); });
    this.on(this.$('#add-open'), 'click', () => this._openAdd());

    // Toggle rejilla / tablero.
    const vt = this.$('#pf-vista');
    if (vt) {
      vt.options = [
        { value: 'rejilla', label: t('prov.vista.rejilla') },
        { value: 'tablero', label: t('prov.vista.tablero') },
      ];
      vt.value = this._vista;
      this.on(vt, 'change', (e) => { this._vista = e.detail.value; this._apply(true); });
    }

    // Contenedores estables: delegación una sola vez por render completo.
    this.on(this.$('#insights'), 'click', (e) => this._onInsightsClick(e));
    this.on(this.$('#pagos'), 'click', (e) => { if (e.target.closest('[data-pagos-toggle]')) { this._pagosOpen = !this._pagosOpen; this.$('#pagos').innerHTML = this._pagosTpl; } else { const f = e.target.closest('[data-ficha]'); if (f) this._openFicha(f.dataset.ficha); } });
    this.on(this.$('#chips'), 'click', (e) => this._onChipsClick(e));
    this.on(this.$('#listing'), 'click', (e) => this._onListingClick(e));
    this.on(this.$('#listing'), 'change', (e) => this._onListingChange(e));
    this.on(this.$('#listing'), 'dragstart', (e) => this._onDragStart(e));
    this.on(this.$('#listing'), 'dragover', (e) => this._onDragOver(e));
    this.on(this.$('#listing'), 'dragleave', (e) => this._onDragLeave(e));
    this.on(this.$('#listing'), 'drop', (e) => this._onDrop(e));
    this.on(this.$('#listing'), 'dragend', () => this._onDragEnd());
    this.on(this.$('#bulkbar'), 'click', (e) => this._onBulkClick(e));
    this.on(this.$('#overlay'), 'click', (e) => this._onOverlayClick(e));
    this.on(this.$('#overlay'), 'change', (e) => this._onOverlayChange(e));
    this.on(this.$('#overlay'), 'input', (e) => this._onOverlayInput(e));
    this.on(this.$('#estado-pop'), 'click', (e) => this._onPopClick(e));

    this._wireBadges();
    this._wireOverlayDialogs();
    this._wireCompareDialog();
    this._wireFichaDrawer();
    this._playStagger();
    this._animateHero();
  }

  /**
   * Dibuja el anillo, rellena el medidor y sube los contadores del hero.
   * Respeta prefers-reduced-motion.
   */
  _animateHero() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const arcs = this.$$('.prov-donut-arc');
    const fill = this.$('.prov-meter-fill');
    const setFinal = () => {
      arcs.forEach((a) => { a.style.strokeDashoffset = '0'; });
      if (fill) fill.style.width = `${fill.dataset.w || 0}%`;
    };
    this.$$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count) || 0;
      if (reduce) { el.textContent = String(target); return; }
      const dur = 720; const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (reduce) { setFinal(); return; }
    requestAnimationFrame(() => requestAnimationFrame(setFinal));
  }

  /** @param {MouseEvent} e */
  _onInsightsClick(e) {
    const b = e.target.closest('[data-insight]');
    if (!b) return;
    const estado = { pendiente: 'pendiente', presupuesto: 'presupuesto', sinSenal: 'contratado' }[b.dataset.insight];
    if (!estado) return;
    this._estado = estado;
    const sel = this.$('#pf-estado');
    if (sel) sel.value = estado;
    this._apply(true);
  }

  /** Confeti + aviso la primera vez que se cubren todas las categorías. */
  _maybeCelebrate() {
    const complete = this._cats.length > 0 && chipsCategorias(this._provs, this._cats).every((c) => c.estado === 'cubierta');
    if (complete && !this._wasFullyCovered) { this._confetti(); this._toast('prov.celebrate'); }
    this._wasFullyCovered = complete;
  }

  /** Confeti sobrio sobre el donut (respeta prefers-reduced-motion). */
  _confetti() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const host = this.$('#confetti');
    if (!host) return;
    const colors = ['var(--rsvp-si-dot)', 'var(--color-accent)', 'var(--lado-novia)', 'var(--lado-novio)'];
    const bits = [];
    for (let i = 0; i < 16; i++) {
      const x = (Math.random() * 2 - 1) * 120;
      const y = -60 - Math.random() * 90;
      const r = (Math.random() * 2 - 1) * 240;
      bits.push(`<span class="prov-confetti-bit" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--r:${r.toFixed(0)}deg;animation-delay:${(Math.random() * 120).toFixed(0)}ms;background:${colors[i % colors.length]}"></span>`);
    }
    host.innerHTML = bits.join('');
    clearTimeout(this._confettiT);
    this._confettiT = setTimeout(() => { host.innerHTML = ''; }, 1400);
  }

  /**
   * Re-renderiza solo stats/chips/rejilla/vacío para que la búsqueda no
   * pierda el foco del input (la barra de filtros nunca se vuelve a pintar).
   */
  _apply(stagger = false, refreshHero = false, flashId = null) {
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
    const chips = this.$('#chips');
    if (chips) chips.innerHTML = this._chipsTpl;
    const listing = this.$('#listing');
    if (listing) listing.innerHTML = this._listingTpl;
    const bulk = this.$('#bulkbar');
    if (bulk) bulk.innerHTML = this._bulkbarTpl;
    this._wireBadges();
    if (stagger) this._playStagger();
    if (refreshHero) {
      const hero = this.$('#hero');
      if (hero) { hero.innerHTML = this._heroTpl; this._animateHero(); }
      const ins = this.$('#insights');
      if (ins) ins.innerHTML = this._insightsTpl;
      const pagos = this.$('#pagos');
      if (pagos) pagos.innerHTML = this._pagosTpl;
      this._maybeCelebrate();
    }
    if (flashId) {
      const c = this.$(`.prov-card[data-id="${flashId}"]`);
      if (c) { c.classList.add('prov-flash'); setTimeout(() => c.classList.remove('prov-flash'), 620); }
    }
  }

  /** Reproduce (una vez) la entrada escalonada de las tarjetas de la rejilla. */
  _playStagger() {
    const grid = this.$('.prov-grid');
    if (!grid) return;
    grid.classList.remove('prov-stagger');
    // reflow para reiniciar la animación aunque la clase ya estuviera puesta
    void grid.offsetWidth;
    grid.classList.add('prov-stagger');
    clearTimeout(this._staggerT);
    this._staggerT = setTimeout(() => grid.classList.remove('prov-stagger'), 900);
  }

  /** Repinta solo el overlay (alta/edición) y recablea su diálogo. */
  _paintOverlay() {
    const overlay = this.$('#overlay');
    if (overlay) overlay.innerHTML = this._overlayTpl;
    this._wireOverlayDialogs();
  }

  /** Asigna kind/value a cada estado-badge tras (re)pintar su contenedor. */
  _wireBadges() {
    this.$$('.prov-badge').forEach((b) => {
      b.kind = b.dataset.kind || 'prov';
      b.value = b.dataset.value;
    });
  }

  /** Abre/cierra el modal-dialog de alta/edición y cablea su evento `close`. */
  _wireOverlayDialogs() {
    const dialog = this.$('#prov-dialog');
    if (dialog) {
      dialog.heading = this._editId ? t('prov.modal.editar') : t('prov.modal.nuevo');
      this.on(dialog, 'close', () => { this._open = false; this._editId = null; this._paintOverlay(); });
      if (this._open) dialog.open();
    }
  }

  /** @param {MouseEvent} e */
  _onChipsClick(e) {
    const chip = e.target.closest('[data-cat]');
    if (chip) this._openAdd(chip.dataset.cat);
  }

  /** @param {MouseEvent} e Clicks en la rejilla o el tablero. */
  _onListingClick(e) {
    if (e.target.closest('[data-sel]')) return; // la selección va por 'change'
    const badge = e.target.closest('[data-badge]');
    if (badge) { e.stopPropagation(); this._toggleEstadoPop(badge, badge.dataset.badge); return; }
    const compare = e.target.closest('[data-compare]');
    if (compare) { this._openCompare(compare.dataset.compare); return; }
    const edit = e.target.closest('[data-edit]');
    if (edit) { this._openEdit(edit.dataset.edit); return; }
    const del = e.target.closest('[data-del]');
    if (del) { this._removeProv(del.dataset.del); return; }
    const contratar = e.target.closest('[data-contratar]');
    if (contratar) { this._toggleContratar(contratar.dataset.contratar); return; }
    if (e.target.closest('#empty-add')) { this._openAdd(); return; }
    const ficha = e.target.closest('[data-ficha]');
    if (ficha) this._openFicha(ficha.dataset.ficha);
  }

  /** @param {Event} e Cambios en la rejilla/tablero (checkbox de selección). */
  _onListingChange(e) {
    const sel = e.target.closest('[data-sel]');
    if (sel) this._toggleSelect(sel.dataset.sel, sel.checked);
  }

  // ---------- Multi-selección y acciones en lote ----------

  /** @param {string} id @param {boolean} checked */
  _toggleSelect(id, checked) {
    if (checked) this._selected.add(id); else this._selected.delete(id);
    const bulk = this.$('#bulkbar');
    if (bulk) bulk.innerHTML = this._bulkbarTpl;
    const card = this.$(`.prov-card[data-id="${id}"]`);
    if (card) card.classList.toggle('is-selected', checked);
  }

  /** @param {MouseEvent} e */
  _onBulkClick(e) {
    const b = e.target.closest('[data-bulk]');
    if (!b) return;
    const action = b.dataset.bulk;
    if (action === 'limpiar') { this._selected.clear(); this._apply(); return; }
    const ids = [...this._selected];
    if (!ids.length) return;
    if (action === 'eliminar') {
      ids.forEach((id) => proveedoresRepo.remove(id));
      this._provs = this._provs.filter((p) => !this._selected.has(p.id));
      this._selected.clear();
      this._apply(false, true);
      this._toast('prov.toast.loteEliminado', { n: ids.length });
      return;
    }
    const estado = action === 'contratar' ? 'contratado' : 'descartado';
    ids.forEach((id) => {
      const p = this._provs.find((x) => x.id === id);
      if (p) this._syncProv(proveedoresRepo.upsert({ ...p, estado }));
    });
    this._selected.clear();
    this._apply(false, true);
    this._toast('prov.toast.lote', { n: ids.length });
  }

  // ---------- Tablero Kanban: arrastrar y soltar ----------

  /** @param {DragEvent} e */
  _onDragStart(e) {
    const card = e.target.closest('[data-card]');
    if (!card) return;
    this._dragId = card.dataset.card;
    e.dataTransfer.setData('text/plain', this._dragId);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-dragging');
  }

  /** @param {DragEvent} e */
  _onDragOver(e) {
    const body = e.target.closest('[data-col-body]');
    if (!body) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    body.classList.add('is-over');
  }

  /** @param {DragEvent} e */
  _onDragLeave(e) {
    const body = e.target.closest('[data-col-body]');
    if (body && !body.contains(e.relatedTarget)) body.classList.remove('is-over');
  }

  /** @param {DragEvent} e */
  _onDrop(e) {
    const body = e.target.closest('[data-col-body]');
    if (!body) return;
    e.preventDefault();
    body.classList.remove('is-over');
    const id = e.dataTransfer.getData('text/plain') || this._dragId;
    const col = body.dataset.colBody;
    this._dragId = null;
    const p = this._provs.find((x) => x.id === id);
    if (id && col && p && p.estado !== col) this._setEstado(id, col);
  }

  /** Limpia las clases de arrastre. */
  _onDragEnd() {
    this.$$('.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
    this.$$('.is-over').forEach((el) => el.classList.remove('is-over'));
    this._dragId = null;
  }

  // ---------- Ficha (drawer) + checklist ----------

  /** @param {string} id */
  _openFicha(id) {
    this._fichaId = id;
    this._paintFicha();
  }

  /** Pinta el contenido del drawer de ficha y lo abre. */
  _paintFicha() {
    const drawer = this.$('#ficha');
    if (!drawer) return;
    const p = this._fichaId ? this._provs.find((x) => x.id === this._fichaId) : null;
    if (!p) { drawer.innerHTML = ''; return; }
    drawer.heading = p.nombre;
    drawer.innerHTML = this._fichaContentTpl(p);
    this._wireBadges();
    drawer.open();
  }

  /** Cablea el drawer de ficha (una vez): cierre, checklist y editar. */
  _wireFichaDrawer() {
    const drawer = this.$('#ficha');
    if (!drawer) return;
    this.on(drawer, 'close', () => { this._fichaId = null; drawer.innerHTML = ''; });
    this.on(drawer, 'change', (e) => this._onFichaChange(e));
    this.on(drawer, 'click', (e) => {
      const ed = e.target.closest('[data-ficha-edit]');
      if (ed) { const id = ed.dataset.fichaEdit; this._fichaId = null; drawer.close(); this._openEdit(id); }
    });
  }

  /** @param {Event} e Marca/desmarca un paso del checklist y persiste. */
  _onFichaChange(e) {
    const step = e.target.closest('[data-step]');
    if (!step) return;
    const wrap = this.$('#ficha .prov-ficha');
    const id = wrap?.dataset.fichaId;
    const p = id && this._provs.find((x) => x.id === id);
    if (!p) return;
    const checklist = { ...(p.checklist || {}), [step.dataset.step]: step.checked };
    this._syncProv(proveedoresRepo.upsert({ ...p, checklist }));
    this._paintFicha();
    this._apply(false, false); // refresca el progreso en la tarjeta del listado
  }

  // ---------- Comparador por categoría ----------

  /** @param {string} cat */
  _openCompare(cat) {
    this._compareCat = cat;
    this._paintCompare();
  }

  /** Repinta solo el contenedor del comparador y recablea su diálogo. */
  _paintCompare() {
    const c = this.$('#compare');
    if (c) c.innerHTML = this._compareTpl;
    this._wireBadges();
    this._wireCompareDialog();
  }

  /** Abre el modal del comparador y cablea su evento `close`. */
  _wireCompareDialog() {
    const dialog = this.$('#prov-compare-dialog');
    if (!dialog) return;
    dialog.heading = t('prov.compare.title', { categoria: this._compareCat });
    this.on(dialog, 'close', () => { this._compareCat = null; this._paintCompare(); });
    dialog.open();
  }

  // ---------- Popover de cambio rápido de estado ----------

  /**
   * Abre (o cierra si ya estaba sobre esta tarjeta) el popover de estado.
   * @param {HTMLElement} anchor Botón del badge pulsado.
   * @param {string} id
   */
  _toggleEstadoPop(anchor, id) {
    const pop = this.$('#estado-pop');
    if (!pop) return;
    if (!pop.hidden && pop.dataset.id === id) { this._closePop(); return; }
    const p = this._provs.find((x) => x.id === id);
    if (!p) return;
    pop.dataset.id = id;
    pop.innerHTML = ESTADOS_ALTA.map((k) => `
      <button type="button" role="menuitem" class="prov-estado-opt${k === p.estado ? ' is-current' : ''}" data-estado="${k}">
        <i class="prov-estado-dot is-${k}"></i>${escapeHtml(t(ENUMS.provEstado[k]))}
      </button>`).join('');
    // Posición: bajo el badge, alineado a su borde derecho, relativo al host.
    const hostRect = this.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    pop.style.top = `${(r.bottom - hostRect.top + 6).toFixed(0)}px`;
    pop.style.right = `${Math.max(0, hostRect.right - r.right).toFixed(0)}px`;
    pop.hidden = false;
  }

  /** @param {MouseEvent} e */
  _onPopClick(e) {
    const opt = e.target.closest('[data-estado]');
    if (!opt) return;
    e.stopPropagation();
    const pop = this.$('#estado-pop');
    this._setEstado(pop?.dataset.id, opt.dataset.estado);
    this._closePop();
  }

  /** Oculta y limpia el popover de estado. */
  _closePop() {
    const pop = this.$('#estado-pop');
    if (pop) { pop.hidden = true; pop.dataset.id = ''; }
  }

  /**
   * Cambia el estado de un proveedor desde el popover.
   * @param {string} id
   * @param {string} estado
   */
  _setEstado(id, estado) {
    const p = this._provs.find((x) => x.id === id);
    if (!p || p.estado === estado) return;
    const updated = proveedoresRepo.upsert({ ...p, estado });
    this._syncProv(updated);
    this._toast('prov.toast.estado', { nombre: p.nombre, estado: t(ENUMS.provEstado[estado]) });
    this._apply(false, true, id);
  }

  /** @param {MouseEvent} e */
  _onOverlayClick(e) {
    if (e.target.closest('#pd-save')) this._saveDraft();
  }

  /** @param {Event} e */
  _onOverlayChange(e) {
    if (String(e.target.id).startsWith('pd-')) this._updateDraftField(e.target);
  }

  /** @param {Event} e */
  _onOverlayInput(e) {
    if (String(e.target.id).startsWith('pd-')) this._updateDraftField(e.target);
  }

  // ---------- Alta / edición ----------

  /** @param {string} [categoria] Categoría a preseleccionar (p. ej. desde un chip). */
  _openAdd(categoria) {
    this._draft = draftVacio(this._cats);
    if (categoria) this._draft.categoria = categoria;
    this._editId = null;
    this._open = true;
    this._paintOverlay();
  }

  /** @param {string} id */
  _openEdit(id) {
    const p = this._provs.find((x) => x.id === id);
    if (!p) return;
    this._draft = {
      nombre: p.nombre,
      categoria: p.categoria,
      estado: p.estado,
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      precio: p.precio || '',
      senal: p.senal || '',
      notas: p.notas || '',
    };
    this._editId = id;
    this._open = true;
    this._paintOverlay();
  }

  /** @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} el */
  _updateDraftField(el) {
    const map = {
      'pd-nombre': 'nombre', 'pd-categoria': 'categoria', 'pd-estado': 'estado', 'pd-contacto': 'contacto',
      'pd-telefono': 'telefono', 'pd-precio': 'precio', 'pd-senal': 'senal', 'pd-notas': 'notas',
    };
    const key = map[el.id];
    if (key) this._draft[key] = el.value;
  }

  _saveDraft() {
    const d = this._draft;
    const nombre = (d.nombre || '').trim();
    if (!nombre) { this._toast('prov.add.needName'); return; }
    const payload = {
      nombre,
      categoria: d.categoria || this._cats[0] || '',
      estado: d.estado || 'pendiente',
      contacto: (d.contacto || '').trim(),
      telefono: (d.telefono || '').trim(),
      precio: Number(d.precio) || 0,
      senal: Number(d.senal) || 0,
      notas: (d.notas || '').trim(),
    };
    if (this._editId) {
      const updated = proveedoresRepo.upsert({ ...payload, id: this._editId });
      this._syncProv(updated);
      this._toast('prov.toast.actualizado', { nombre: updated.nombre });
    } else {
      const created = proveedoresRepo.upsert(payload);
      this._provs.push(created);
      this._toast('prov.toast.creado', { nombre: created.nombre });
    }
    this._open = false;
    this._editId = null;
    this._apply(false, true);
    this._paintOverlay();
  }

  // ---------- Acciones sobre la tarjeta ----------

  /** @param {string} id */
  _toggleContratar(id) {
    const p = this._provs.find((x) => x.id === id);
    if (!p) return;
    const nextEstado = p.estado === 'contratado' ? 'presupuesto' : 'contratado';
    const updated = proveedoresRepo.upsert({ ...p, estado: nextEstado });
    this._syncProv(updated);
    this._toast(nextEstado === 'contratado' ? 'prov.toast.contratado' : 'prov.toast.presupuesto', { nombre: p.nombre });
    this._apply(false, true, id);
  }

  /** Elimina un proveedor con opción de deshacer (snapshot + app-toast con acción). */
  _removeProv(id) {
    const p = this._provs.find((x) => x.id === id);
    if (!p) return;
    const snapshot = { ...p };
    proveedoresRepo.remove(id);
    this._provs = this._provs.filter((x) => x.id !== id);
    this._apply(false, true);
    this._toast('prov.toast.eliminado', { nombre: p.nombre }, {
      actionLabel: t('prov.toast.deshacer'),
      onAction: () => this._undoRemove(snapshot),
    });
  }

  /** @param {object} p Proveedor a restaurar. */
  _undoRemove(p) {
    const restored = proveedoresRepo.upsert({ ...p });
    this._syncProv(restored);
    this._apply(false, true);
  }

  /**
   * Sustituye (o añade) un proveedor en la copia local tras persistirlo.
   * @param {object} updated
   */
  _syncProv(updated) {
    const idx = this._provs.findIndex((x) => x.id === updated.id);
    if (idx >= 0) this._provs[idx] = updated;
    else this._provs.push(updated);
  }

  // ---------- Toast ----------

  /**
   * Muestra un aviso breve reutilizando el primitivo app-toast.
   * @param {string} key Clave i18n.
   * @param {Record<string, string|number>} [vars]
   * @param {{actionLabel?: string, onAction?: () => void}} [opts]
   */
  _toast(key, vars, opts) {
    const el = this.$('#toast');
    if (el && typeof el.show === 'function') el.show(t(key, vars), opts);
  }
}

customElements.define('proveedores-view', ProveedoresView);
