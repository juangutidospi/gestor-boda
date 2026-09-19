import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './proveedores-view.css.js';
import { t } from '../../../i18n/index.js';
import { ENUMS } from '../../../core/enums.js';
import {
  filtrar, ordenar, calcularStats, chipsCategorias, eur,
} from './proveedores-calc.js';
import { ensureSeeded, proveedoresRepo, listaCategorias } from '../../../core/repos.js';
import '../../ui/modal-dialog/modal-dialog.js';
import '../../ui/estado-badge/estado-badge.js';
import '../../ui/empty-state/empty-state.js';
import '../../ui/toast/toast.js';

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
  _open = false;
  /** @type {string|null} */
  _editId = null;
  _draft = draftVacio();

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._provs = proveedoresRepo.list();
    this._cats = listaCategorias();
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
        <div id="stats">${this._statsTpl}</div>
        ${this._filtersTpl}
        <section class="prov-chips-wrap" id="chips">${this._chipsTpl}</section>
        <div id="grid" class="prov-grid">${this._gridTpl}</div>
        <div id="empty">${this._visible.length ? '' : this._emptyTpl}</div>
        <p class="prov-foot muted">${escapeHtml(t('prov.foot'))}</p>
        <div id="overlay">${this._overlayTpl}</div>
        <app-toast id="toast"></app-toast>
      </div>`;
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
    return ordenar(filtrados, this._cats);
  }

  /** @returns {string} Rejilla de tarjetas (vacía si ningún proveedor coincide). */
  get _gridTpl() {
    return this._visible.map((p, idx) => this._cardTpl(p, idx)).join('');
  }

  /**
   * @param {object} p
   * @param {number} idx Índice visible, para escalonar la entrada.
   * @returns {string} Una tarjeta de proveedor.
   */
  _cardTpl(p, idx) {
    const contactoPartes = [p.contacto, p.telefono].filter(Boolean);
    const contactoLinea = contactoPartes.length ? contactoPartes.join(' · ') : t('prov.card.sinContacto');
    const precioLabel = Number(p.precio) ? eur(Number(p.precio)) : t('prov.card.sinPresupuesto');
    const senalLabel = Number(p.senal) ? eur(Number(p.senal)) : '—';
    const contratado = p.estado === 'contratado';
    const accionLabel = contratado ? t('prov.card.contratado') : t('prov.card.contratar');
    return `
      <article class="prov-card" data-id="${escapeHtml(p.id)}" style="--i:${idx}">
        <div class="prov-card-top">
          <div class="prov-card-id">
            <span class="prov-card-cat">${escapeHtml(p.categoria)}</span>
            <h3>${escapeHtml(p.nombre)}</h3>
            <span class="prov-card-contacto muted">${escapeHtml(contactoLinea)}</span>
          </div>
          <estado-badge class="prov-badge" data-kind="prov" data-value="${escapeHtml(p.estado)}"></estado-badge>
        </div>
        <div class="prov-card-panel">
          <div><span class="prov-lbl">${escapeHtml(t('prov.card.precio'))}</span><span class="prov-val">${escapeHtml(precioLabel)}</span></div>
          <div class="prov-sep"><span class="prov-lbl">${escapeHtml(t('prov.card.senal'))}</span><span class="prov-val prov-val-sm">${escapeHtml(senalLabel)}</span></div>
        </div>
        ${p.notas ? `<p class="prov-card-notas muted">${escapeHtml(p.notas)}</p>` : ''}
        <div class="prov-card-foot">
          <button class="btn btn-secondary" data-edit="${escapeHtml(p.id)}" type="button">${escapeHtml(t('prov.card.editar'))}</button>
          <button class="btn btn-ghost" data-del="${escapeHtml(p.id)}" type="button">${escapeHtml(t('prov.card.eliminar'))}</button>
          <button class="btn ${contratado ? 'btn-secondary' : 'btn-primary'}" data-contratar="${escapeHtml(p.id)}" type="button">${escapeHtml(accionLabel)}</button>
        </div>
      </article>`;
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

  afterRender() {
    this.on(this.$('#pf-q'), 'input', (e) => { this._q = e.target.value; this._apply(); });
    this.on(this.$('#pf-categoria'), 'change', (e) => { this._categoria = e.target.value; this._apply(true); });
    this.on(this.$('#pf-estado'), 'change', (e) => { this._estado = e.target.value; this._apply(true); });
    this.on(this.$('#add-open'), 'click', () => this._openAdd());

    // Contenedores estables: delegación una sola vez por render completo.
    this.on(this.$('#chips'), 'click', (e) => this._onChipsClick(e));
    this.on(this.$('#grid'), 'click', (e) => this._onGridClick(e));
    this.on(this.$('#empty'), 'click', (e) => { if (e.target.closest('#empty-add')) this._openAdd(); });
    this.on(this.$('#overlay'), 'click', (e) => this._onOverlayClick(e));
    this.on(this.$('#overlay'), 'change', (e) => this._onOverlayChange(e));
    this.on(this.$('#overlay'), 'input', (e) => this._onOverlayInput(e));

    this._wireBadges();
    this._wireOverlayDialogs();
    this._playStagger();
  }

  /**
   * Re-renderiza solo stats/chips/rejilla/vacío para que la búsqueda no
   * pierda el foco del input (la barra de filtros nunca se vuelve a pintar).
   */
  _apply(stagger = false) {
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
    const chips = this.$('#chips');
    if (chips) chips.innerHTML = this._chipsTpl;
    const grid = this.$('#grid');
    if (grid) grid.innerHTML = this._gridTpl;
    const empty = this.$('#empty');
    if (empty) empty.innerHTML = this._visible.length ? '' : this._emptyTpl;
    this._wireBadges();
    if (stagger) this._playStagger();
  }

  /** Reproduce (una vez) la entrada escalonada de las tarjetas de la rejilla. */
  _playStagger() {
    const grid = this.$('#grid');
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

  /** @param {MouseEvent} e */
  _onGridClick(e) {
    const edit = e.target.closest('[data-edit]');
    if (edit) { this._openEdit(edit.dataset.edit); return; }
    const del = e.target.closest('[data-del]');
    if (del) { this._removeProv(del.dataset.del); return; }
    const contratar = e.target.closest('[data-contratar]');
    if (contratar) this._toggleContratar(contratar.dataset.contratar);
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
    this._apply();
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
    this._apply();
  }

  /** Elimina un proveedor con opción de deshacer (snapshot + app-toast con acción). */
  _removeProv(id) {
    const p = this._provs.find((x) => x.id === id);
    if (!p) return;
    const snapshot = { ...p };
    proveedoresRepo.remove(id);
    this._provs = this._provs.filter((x) => x.id !== id);
    this._apply();
    this._toast('prov.toast.eliminado', { nombre: p.nombre }, {
      actionLabel: t('prov.toast.deshacer'),
      onAction: () => this._undoRemove(snapshot),
    });
  }

  /** @param {object} p Proveedor a restaurar. */
  _undoRemove(p) {
    const restored = proveedoresRepo.upsert({ ...p });
    this._syncProv(restored);
    this._apply();
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
