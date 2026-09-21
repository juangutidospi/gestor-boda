import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './salon-view.css.js';
import { t, getLang } from '../../../i18n/index.js';
import {
  confirmados, ocupacionMesa, sinAsignar, calcularStats, mesaSize, sillasGeom, autoOrganizar, ladoTokens,
  autoSentar, resumenMesa,
} from './salon-calc.js';
import { ensureSeeded, mesasRepo, invitadosRepo } from '../../../core/repos.js';
import '../../ui/segmented-tabs/segmented-tabs.js';
import '../../ui/toast/toast.js';

/**
 * Vista Salón (Fase 5). Componente único: plano de mesas arrastrables con los invitados
 * confirmados sentados como sillas por lado, listado alternativo y panel "Sin asignar".
 * Persistencia: mesas en `mesasRepo`, mesa asignada en `invitadosRepo` (campo `mesa`).
 */
export class SalonView extends AppElement {
  static styles = [styles];

  /** @type {object[]} */
  _mesas = [];
  /** @type {object[]} */
  _invitados = [];
  /** Vista: 'plano' | 'listado'. */
  _vista = 'plano';
  /** Id de la mesa seleccionada en el plano, o null. */
  _mesaSel = null;
  /** Id de la mesa que se está arrastrando (pointer), o null. */
  _dragMesaId = null;
  /** Alto elegido a mano para el plano (p. ej. '720px'), o null. */
  _planoH = null;
  /** @type {ResizeObserver|null} */
  _ro = null;
  /** Zoom y desplazamiento del lienzo. */
  _zoom = 1;
  _panX = 0;
  _panY = 0;

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._mesas = mesasRepo.list();
    this._invitados = invitadosRepo.list();
    this._paint();
  }

  /** @returns {object[]} Invitados confirmados. */
  get _confs() { return confirmados(this._invitados); }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="sal-toolbar">
          <segmented-tabs id="sv-vista"></segmented-tabs>
          <div id="stats" class="sal-statstrip">${this._statsTpl}</div>
          ${this._legendTpl}
          <button class="btn btn-secondary sal-toolbar-export" id="sv-export" type="button">${escapeHtml(t('salon.export'))}</button>
          <button class="btn btn-primary sal-toolbar-add" id="sv-add" type="button">+&nbsp;&nbsp;${escapeHtml(t('salon.add'))}</button>
        </div>
        <div id="main">${this._mainTpl}</div>
        <app-toast id="toast"></app-toast>
      </div>`;
  }

  /** @returns {string} Ayuda de arrastre + leyenda de lado (novio/novia) para la toolbar. */
  get _legendTpl() {
    return `
      <div class="sal-legend">
        <span class="muted sal-legend-help">${escapeHtml(t('salon.plano.ayuda'))}</span>
        <span class="sal-leg"><i class="sal-leg-dot sal-lado-novio"></i>${escapeHtml(t('salon.leyenda.novio'))}</span>
        <span class="sal-leg"><i class="sal-leg-dot sal-lado-novia"></i>${escapeHtml(t('salon.leyenda.novia'))}</span>
      </div>`;
  }

  /** @returns {string} Tira compacta de 4 estadísticas para la cabecera. */
  get _statsTpl() {
    const stats = calcularStats(this._mesas, this._invitados);
    return stats.map((s) => `
      <div class="sal-mini" title="${escapeHtml(t(s.note, s.noteVars))}">
        <span class="sal-mini-value">${escapeHtml(String(s.value))}</span>
        <span class="sal-mini-label">${escapeHtml(t(s.label))}</span>
      </div>`).join('');
  }

  /** @returns {string} Rejilla: escenario (plano/listado) + aside lateral. */
  get _mainTpl() {
    return `
      <div class="sal-grid">
        <div id="stage" class="sal-stage">${this._vista === 'plano' ? this._planoTpl : this._listadoTpl}</div>
        <aside id="aside" class="sal-aside">
          <div id="mesa-panel">${this._mesaPanelTpl}</div>
          <div id="sin-asignar" class="sal-sin">${this._sinAsignarTpl}</div>
        </aside>
      </div>`;
  }

  // ---------- Plano ----------

  /** @returns {string} Lienzo del plano con decoración y mesas. */
  get _planoTpl() {
    const confs = this._confs;
    return `
      <div class="sal-plano-wrap">
        <div class="sal-plano" id="plano"${this._planoH ? ` style="height:${this._planoH}"` : ''}>
          <div class="sal-plano-grid" aria-hidden="true"></div>
          <div class="sal-plano-vignette" aria-hidden="true"></div>
          <div class="sal-plano-inner1" aria-hidden="true"></div>
          <button class="btn btn-secondary sal-auto" id="sv-auto" type="button">${escapeHtml(t('salon.plano.auto'))}</button>
          <div class="sal-zoom">
            <button type="button" data-zoom="out" aria-label="−">−</button>
            <button type="button" data-zoom="reset" class="sal-zoom-pct">${Math.round(this._zoom * 100)}%</button>
            <button type="button" data-zoom="in" aria-label="+">+</button>
          </div>
          <div class="sal-canvas" id="canvas" style="transform:translate(${this._panX}px,${this._panY}px) scale(${this._zoom})">
            <div class="sal-presidencia">${escapeHtml(t('salon.plano.presidencia'))}</div>
            <div class="sal-pista">${escapeHtml(t('salon.plano.pista'))}</div>
            <div class="sal-barra">${escapeHtml(t('salon.plano.barra'))}</div>
            <div class="sal-guide sal-guide-v" id="guide-x" hidden></div>
            <div class="sal-guide sal-guide-h" id="guide-y" hidden></div>
            ${this._mesas.map((m) => this._mesaTpl(m, confs)).join('')}
          </div>
        </div>
      </div>`;
  }

  /** @param {object} m @param {object[]} confs @returns {string} Una mesa en el plano con sus asientos. */
  _mesaTpl(m, confs) {
    const { asignados, ocupadas, sobra } = ocupacionMesa(m, confs);
    const cap = Number(m.capacidad) || 0;
    const { rect, w, h } = mesaSize(m);
    const rot = Number(m.rot) || 0;
    const sel = this._mesaSel === m.id;
    const people = this._peopleDeMesa(asignados);
    const seats = sillasGeom(m, cap).map((pos, i) => this._seatTpl(people[i], i, pos, rot)).join('');
    return `
      <div class="sal-mesa-wrap" style="left:${m.x ?? 50}%;top:${m.y ?? 50}%;width:${w + 170}px;height:${h + 170}px;transform:translate(-50%,-50%) rotate(${rot}deg)">
        <div class="sal-mesa ${rect ? 'is-rect' : 'is-round'}${sobra ? ' is-over' : ''}${sel ? ' is-sel' : ''}"
             data-mesa="${escapeHtml(m.id)}" data-mesa-drop="${escapeHtml(m.id)}" style="width:${w}px;height:${h}px">
          <div class="sal-mesa-center"${rot ? ` style="transform:translate(-50%,-50%) rotate(${-rot}deg)"` : ''}>
            <div class="sal-mesa-nombre">${escapeHtml(m.nombre)}</div>
            <div class="sal-mesa-plazas">${ocupadas}/${cap}</div>
          </div>
        </div>
        ${seats}
      </div>`;
  }

  /**
   * Expande las invitaciones asignadas en personas (titular + acompañantes), una por
   * asiento.
   * @param {object[]} asignados
   * @returns {Array<{nombre:string, lado:string}>}
   */
  _peopleDeMesa(asignados) {
    const people = [];
    asignados.forEach((g) => {
      people.push({ id: g.id, nombre: g.nombre, lado: g.lado });
      const comps = Array.isArray(g.acompanantes) ? g.acompanantes : [];
      const n = Number(g.plus) || 0;
      for (let k = 0; k < n; k++) people.push({ id: g.id, nombre: comps[k] || `${String(g.nombre).split(' ')[0]} +1`, lado: g.lado });
    });
    return people;
  }

  /**
   * @param {{nombre:string, lado:string}|undefined} person Persona sentada, o undefined (vacío).
   * @param {number} i Índice del asiento (para numerar los vacíos).
   * @param {object} pos Geometría del asiento.
   * @returns {string} Avatar + nombre (ocupado) o círculo punteado con número (vacío).
   */
  _seatTpl(person, i, pos, rot = 0) {
    const at = `left:calc(50% + ${pos.x.toFixed(1)}px);top:calc(50% + ${pos.y.toFixed(1)}px)`;
    if (!person) {
      return `<span class="sal-seat-empty" style="${at}">${i + 1}</span>`;
    }
    const lado = person.lado === 'novia' ? 'novia' : 'novio';
    // Orientación legible del nombre teniendo en cuenta la rotación de la mesa.
    let nameDeg = pos.deg - rot;
    while (nameDeg <= -180) nameDeg += 360;
    while (nameDeg > 180) nameDeg -= 360;
    if (nameDeg > 90 && nameDeg < 270) nameDeg -= 180;
    const nameAt = `left:calc(50% + ${pos.nx.toFixed(1)}px);top:calc(50% + ${pos.ny.toFixed(1)}px)`;
    return `
      <span class="sal-av sal-lado-${lado}" draggable="true" data-guest="${escapeHtml(person.id)}" style="${at};transform:translate(-50%,-50%) rotate(${pos.faceDeg.toFixed(1)}deg)" title="${escapeHtml(person.nombre)}">
        <span class="sal-av-head"><span class="sal-av-face"></span></span>
        <span class="sal-av-body"></span>
      </span>
      <span class="sal-seat-name" style="${nameAt};transform:translate(-50%,-50%) rotate(${nameDeg.toFixed(1)}deg)">${escapeHtml(person.nombre)}</span>`;
  }

  /** @returns {string} Panel de la mesa seleccionada (o vacío). */
  get _mesaPanelTpl() {
    const m = this._mesaSel && this._mesas.find((x) => x.id === this._mesaSel);
    if (!m) return '';
    const { asignados, ocupadas } = ocupacionMesa(m, this._confs);
    const esVacia = asignados.length === 0;
    const libres = sinAsignar(this._confs);
    return `
      <div class="sal-panel">
        <div class="sal-panel-top">
          <div class="sal-panel-id">
            <span class="sal-panel-nombre">${escapeHtml(m.nombre)}</span>
            <span class="sal-panel-ocup">${escapeHtml(t('salon.mesa.plazas', { ocupadas, cap: m.capacidad }))}</span>
          </div>
          <button class="sal-panel-close" type="button" data-deselect aria-label="${escapeHtml(t('salon.mesa.cerrar'))}">×</button>
        </div>
        <div class="sal-panel-forma">
          <span class="sal-forma-lbl">${escapeHtml(t('salon.mesa.forma'))}</span>
          ${['redonda', 'rectangular', 'imperial'].map((f) => `<button class="sal-forma-btn${(m.forma || 'redonda') === f ? ' is-active' : ''}" type="button" data-forma-set="${f}">${escapeHtml(t(`salon.forma.${f}`))}</button>`).join('')}
          ${(m.forma || 'redonda') !== 'redonda' ? `<button class="btn btn-ghost sal-rotar" type="button" data-rotar>${escapeHtml(t('salon.mesa.rotar'))}</button>` : ''}
        </div>
        <div class="sal-panel-acts">
          <button class="btn btn-ghost" type="button" data-vaciar="${escapeHtml(m.id)}">${escapeHtml(t('salon.mesa.vaciar'))}</button>
          <button class="btn btn-ghost sal-panel-del" type="button" data-del-mesa="${escapeHtml(m.id)}">${escapeHtml(t('salon.mesa.eliminar'))}</button>
        </div>
        <div class="sal-panel-guests">
          ${esVacia
    ? `<span class="muted">${escapeHtml(t('salon.mesa.vacia'))}</span>`
    : asignados.map((g) => this._guestChipTpl(g)).join('')}
        </div>
        ${esVacia ? '' : this._resumenMesaTpl(asignados)}
        ${libres.length ? `
          <div class="sal-panel-add">
            <select class="input" data-seat-mesa="${escapeHtml(m.id)}">
              <option value="">${escapeHtml(t('salon.mesa.anadir'))}</option>
              ${libres.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.nombre)}</option>`).join('')}
            </select>
          </div>` : ''}
      </div>`;
  }

  /** @param {object[]} asignados @returns {string} Resumen de la mesa: lado + menús especiales. */
  _resumenMesaTpl(asignados) {
    const r = resumenMesa(asignados);
    const menus = r.especiales
      ? `${escapeHtml(t('salon.resumen.menus'))}: ${r.menus.map((x) => `${escapeHtml(x.menu)} ×${x.n}`).join(' · ')}`
      : escapeHtml(t('salon.resumen.sinMenus'));
    return `
      <div class="sal-resumen">
        <div class="sal-resumen-lado">
          <span class="sal-leg"><i class="sal-leg-dot sal-lado-novia"></i>${r.novia}</span>
          <span class="sal-leg"><i class="sal-leg-dot sal-lado-novio"></i>${r.novio}</span>
        </div>
        <div class="sal-resumen-menus muted">${menus}</div>
      </div>`;
  }

  /** @param {object} g @returns {string} Chip de comensal con quitar (colores por lado). */
  _guestChipTpl(g) {
    const { bg, ink } = ladoTokens(g.lado);
    const p = Number(g.plus) || 0;
    const etiqueta = `${g.nombre}${p ? ` +${p}` : ''}`;
    return `<span class="sal-chip" style="background:${bg};color:${ink}">${escapeHtml(etiqueta)}<button class="sal-chip-x" type="button" data-unseat="${escapeHtml(g.id)}" aria-label="×">×</button></span>`;
  }

  // ---------- Listado ----------

  /** @returns {string} Rejilla de tarjetas por mesa. */
  get _listadoTpl() {
    const confs = this._confs;
    return `<div class="sal-cards">${this._mesas.map((m) => this._mesaCardTpl(m, confs)).join('')}</div>`;
  }

  /** @param {object} m @param {object[]} confs @returns {string} Tarjeta de mesa (listado). */
  _mesaCardTpl(m, confs) {
    const { asignados, ocupadas, pct, sobra, exceso } = ocupacionMesa(m, confs);
    const aviso = exceso === 1 ? t('salon.mesa.sobra1') : t('salon.mesa.sobraN', { n: exceso });
    return `
      <article class="sal-card" data-mesa-drop="${escapeHtml(m.id)}">
        <div class="sal-card-top">
          <div class="sal-card-id">
            <input class="input sal-card-nombre" data-rename="${escapeHtml(m.id)}" value="${escapeHtml(m.nombre)}">
            <div class="muted sal-card-ocup">${escapeHtml(t('salon.mesa.plazas', { ocupadas, cap: m.capacidad }))}</div>
          </div>
          <button class="btn btn-ghost" type="button" data-del-mesa="${escapeHtml(m.id)}">${escapeHtml(t('salon.mesa.borrar'))}</button>
        </div>
        <div class="sal-fill"><span class="sal-fill-bar${sobra ? ' is-over' : ''}" style="width:${pct}%"></span></div>
        ${sobra ? `<div class="sal-card-aviso">${escapeHtml(aviso)}</div>` : ''}
        <div class="sal-card-guests">
          ${asignados.length
    ? asignados.map((g) => this._guestChipTpl(g)).join('')
    : `<span class="muted">${escapeHtml(t('salon.mesa.vaciaLista'))}</span>`}
        </div>
        <div class="field sal-card-cap">
          <label>${escapeHtml(t('salon.mesa.capacidad'))}</label>
          <input class="input" type="number" min="2" max="20" data-cap="${escapeHtml(m.id)}" value="${escapeHtml(String(m.capacidad))}">
        </div>
      </article>`;
  }

  // ---------- Sin asignar ----------

  /** @returns {string} Aside con los confirmados sin mesa. */
  get _sinAsignarTpl() {
    const sa = sinAsignar(this._confs);
    const label = sa.length
      ? t(sa.length === 1 ? 'salon.sinAsignar.uno' : 'salon.sinAsignar.varias', { n: sa.length })
      : t('salon.sinAsignar.nada');
    const opciones = this._mesas.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nombre)}</option>`).join('');
    return `
      <div class="sal-aside-head">
        <h3 class="sal-aside-title">${escapeHtml(t('salon.sinAsignar.title'))}</h3>
        ${sa.length ? `<button class="btn btn-primary sal-autosentar" type="button" id="sv-autosentar">${escapeHtml(t('salon.autoSentar'))}</button>` : ''}
      </div>
      <div class="muted sal-aside-sub">${escapeHtml(label)}</div>
      <div class="field sal-search">
        <input class="input" type="search" id="sv-buscar" placeholder="${escapeHtml(t('salon.buscar.ph'))}">
      </div>
      <div class="sal-unassigned" data-sin-drop>
        ${sa.map((g) => {
    const { color } = ladoTokens(g.lado);
    return `
          <div class="sal-guest" draggable="true" data-guest="${escapeHtml(g.id)}" style="border-left-color:${color}">
            <div class="sal-guest-txt">
              <div class="sal-guest-name">${escapeHtml(g.nombre)}</div>
              <div class="muted sal-guest-grupo">${escapeHtml(g.grupo || '')}</div>
            </div>
            <select class="input sal-guest-seat" data-seat="${escapeHtml(g.id)}">
              <option value="">${escapeHtml(t('salon.sinAsignar.asignar'))}</option>
              ${opciones}
            </select>
          </div>`;
  }).join('')}
        ${sa.length ? '' : `<span class="muted">${escapeHtml(t('salon.sinAsignar.todos'))}</span>`}
      </div>`;
  }

  // ---------- Wiring ----------

  afterRender() {
    const vt = this.$('#sv-vista');
    if (vt) {
      vt.options = [
        { value: 'plano', label: t('salon.vista.plano') },
        { value: 'listado', label: t('salon.vista.listado') },
      ];
      vt.value = this._vista;
      this.on(vt, 'change', (e) => { this._vista = e.detail.value; this._apply(); });
    }
    this.on(this.$('#sv-add'), 'click', () => this._addMesa());
    this.on(this.$('#sv-export'), 'click', () => this._exportar());
    // Escenario: clicks, arrastre de mesa (pointer) y soltar invitado (DnD).
    this.on(this.$('#main'), 'click', (e) => this._onMainClick(e));
    this.on(this.$('#main'), 'pointerdown', (e) => this._onPointerDown(e));
    this.on(this.$('#main'), 'change', (e) => this._onMainChange(e));
    this.on(this.$('#main'), 'input', (e) => this._onMainInput(e));
    this.on(this.$('#main'), 'dragstart', (e) => this._onGuestDragStart(e));
    this.on(this.$('#main'), 'dragover', (e) => this._onGuestDragOver(e));
    this.on(this.$('#main'), 'dragleave', (e) => this._onGuestDragLeave(e));
    this.on(this.$('#main'), 'drop', (e) => this._onGuestDrop(e));
    this.on(this.$('#main'), 'dragend', () => this._onGuestDragEnd());
    this.on(this.$('#main'), 'wheel', (e) => this._onWheel(e), { passive: false });
    this._observePlano();
  }

  /** Repinta stats + escenario + aside; conserva el alto del plano redimensionado. */
  _apply() {
    const plano = this.$('#plano');
    if (plano && plano.style.height) this._planoH = plano.style.height;
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
    const main = this.$('#main');
    if (main) main.innerHTML = this._mainTpl;
    this._observePlano();
  }

  /** Observa el plano para recordar el alto que el usuario ajusta a mano (CSS resize). */
  _observePlano() {
    if (this._ro) this._ro.disconnect();
    const plano = this.$('#plano');
    if (!plano || typeof ResizeObserver === 'undefined') return;
    this._ro = new ResizeObserver(() => {
      const h = plano.style.height;
      if (h) this._planoH = h;
    });
    this._ro.observe(plano);
  }

  /** @param {MouseEvent} e */
  _onMainClick(e) {
    if (e.target.closest('#sv-auto')) { this._autoOrganizar(); return; }
    if (e.target.closest('#sv-autosentar')) { this._autoSentar(); return; }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom) {
      const rect = this.$('#plano')?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : null;
      const cy = rect ? rect.height / 2 : null;
      if (zoom.dataset.zoom === 'in') this._setZoom(this._zoom * 1.2, cx, cy);
      else if (zoom.dataset.zoom === 'out') this._setZoom(this._zoom / 1.2, cx, cy);
      else { this._zoom = 1; this._panX = 0; this._panY = 0; this._applyCanvasTransform(); }
      return;
    }
    if (e.target.closest('[data-deselect]')) { this._mesaSel = null; this._refreshMesaPanel(); this._markSelected(null); return; }
    const unseat = e.target.closest('[data-unseat]');
    if (unseat) { this._setMesaGuest(unseat.dataset.unseat, null); return; }
    const formaSet = e.target.closest('[data-forma-set]');
    if (formaSet) { if (this._mesaSel) this._setMesa(this._mesaSel, { forma: formaSet.dataset.formaSet }); return; }
    if (e.target.closest('[data-rotar]')) {
      const m = this._mesas.find((x) => x.id === this._mesaSel);
      if (m) this._setMesa(m.id, { rot: ((Number(m.rot) || 0) + 90) % 360 });
      return;
    }
    const vaciar = e.target.closest('[data-vaciar]');
    if (vaciar) { this._vaciarMesa(vaciar.dataset.vaciar); return; }
    const del = e.target.closest('[data-del-mesa]');
    if (del) { this._removeMesa(del.dataset.delMesa); return; }
  }

  /** @param {Event} e */
  _onMainChange(e) {
    const seat = e.target.closest('[data-seat]');
    if (seat) { if (seat.value) this._setMesaGuest(seat.dataset.seat, seat.value, true); return; }
    const seatMesa = e.target.closest('[data-seat-mesa]');
    if (seatMesa) { if (seatMesa.value) this._setMesaGuest(seatMesa.value, seatMesa.dataset.seatMesa, true); return; }
    const cap = e.target.closest('[data-cap]');
    if (cap) { this._setMesa(cap.dataset.cap, { capacidad: Math.max(2, Math.min(20, Number(cap.value) || 2)) }); return; }
    const rename = e.target.closest('[data-rename]');
    if (rename) { this._setMesa(rename.dataset.rename, { nombre: rename.value.trim() || t('salon.mesa.nombreDefault') }); }
  }

  // ---------- Arrastre de mesa (Pointer Events) ----------

  /** @param {PointerEvent} e Arrastra una mesa, o desplaza (pan) el fondo del lienzo. */
  _onPointerDown(e) {
    const mesa = e.target.closest('[data-mesa]');
    if (mesa) { this._startMesaDrag(e, mesa); return; }
    if (e.target.closest('.sal-av, button, input, select, a')) return;
    if (e.target.closest('#canvas') || e.target.closest('#plano')) this._startPan(e);
  }

  /** @param {PointerEvent} e @param {HTMLElement} mesa Arrastre de mesa con corrección de zoom y guías de alineación. */
  _startMesaDrag(e, mesa) {
    const id = mesa.dataset.mesa;
    this._mesaSel = id;
    this._dragMesaId = id;
    this._refreshMesaPanel();
    this._markSelected(id);
    const box = this.$('#plano');
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const wrap = mesa.closest('.sal-mesa-wrap');
    const gx = this.$('#guide-x');
    const gy = this.$('#guide-y');
    const otras = this._mesas.filter((m) => m.id !== id);
    let moved = false;
    const snap = (v) => Math.round(v * 2) / 2;
    const move = (ev) => {
      moved = true;
      let x = snap(Math.min(94, Math.max(6, ((ev.clientX - rect.left - this._panX) / (rect.width * this._zoom)) * 100)));
      let y = snap(Math.min(92, Math.max(8, ((ev.clientY - rect.top - this._panY) / (rect.height * this._zoom)) * 100)));
      const nearX = otras.find((m) => Math.abs((m.x ?? 50) - x) < 1.5);
      const nearY = otras.find((m) => Math.abs((m.y ?? 50) - y) < 1.5);
      if (nearX) { x = nearX.x; if (gx) { gx.style.left = `${x}%`; gx.hidden = false; } } else if (gx) gx.hidden = true;
      if (nearY) { y = nearY.y; if (gy) { gy.style.top = `${y}%`; gy.hidden = false; } } else if (gy) gy.hidden = true;
      if (wrap) { wrap.style.left = `${x}%`; wrap.style.top = `${y}%`; }
      this._pendingPos = { id, x, y };
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (gx) gx.hidden = true;
      if (gy) gy.hidden = true;
      if (moved && this._pendingPos && this._pendingPos.id === id) {
        this._setMesa(id, { x: this._pendingPos.x, y: this._pendingPos.y }, true);
      }
      this._pendingPos = null;
      this._dragMesaId = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** @param {PointerEvent} e Desplaza el lienzo (pan) arrastrando el fondo. */
  _startPan(e) {
    const startX = e.clientX;
    const startY = e.clientY;
    const px = this._panX;
    const py = this._panY;
    const plano = this.$('#plano');
    if (plano) plano.classList.add('is-panning');
    const move = (ev) => {
      this._panX = px + (ev.clientX - startX);
      this._panY = py + (ev.clientY - startY);
      this._applyCanvasTransform();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (plano) plano.classList.remove('is-panning');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** @param {WheelEvent} e Zoom hacia el cursor con la rueda. */
  _onWheel(e) {
    if (!e.target.closest('#plano')) return;
    e.preventDefault();
    const rect = this.$('#plano').getBoundingClientRect();
    this._setZoom(this._zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - rect.left, e.clientY - rect.top);
  }

  /** @param {number} z @param {number} [cx] @param {number} [cy] Ajusta el zoom manteniendo fijo el punto (cx,cy). */
  _setZoom(z, cx, cy) {
    const nz = Math.min(2.5, Math.max(0.5, z));
    if (cx != null && cy != null) {
      this._panX = cx - (cx - this._panX) * (nz / this._zoom);
      this._panY = cy - (cy - this._panY) * (nz / this._zoom);
    }
    this._zoom = nz;
    this._applyCanvasTransform();
  }

  /** Aplica el transform del lienzo (zoom + pan) y actualiza el % sin repintar. */
  _applyCanvasTransform() {
    const canvas = this.$('#canvas');
    if (canvas) canvas.style.transform = `translate(${this._panX}px,${this._panY}px) scale(${this._zoom})`;
    const pct = this.$('.sal-zoom-pct');
    if (pct) pct.textContent = `${Math.round(this._zoom * 100)}%`;
  }

  /** Marca visualmente la mesa seleccionada sin repintar el plano entero. */
  _markSelected(id) {
    this.$$('.sal-mesa').forEach((el) => el.classList.toggle('is-sel', el.dataset.mesa === id));
  }

  /** Repinta solo el panel de la mesa seleccionada. */
  _refreshMesaPanel() {
    const panel = this.$('#mesa-panel');
    if (panel) panel.innerHTML = this._mesaPanelTpl;
  }

  // ---------- Arrastrar invitado → mesa (HTML5 DnD, premium) ----------

  /** @param {DragEvent} e */
  _onGuestDragStart(e) {
    const guest = e.target.closest('[data-guest]');
    if (!guest) return;
    this._dragGuestId = guest.dataset.guest;
    e.dataTransfer.setData('text/plain', this._dragGuestId);
    e.dataTransfer.effectAllowed = 'move';
    guest.classList.add('is-dragging');
    // Resalta las mesas con hueco.
    const confs = this._confs;
    this.$$('[data-mesa-drop]').forEach((el) => {
      const m = this._mesas.find((x) => x.id === el.dataset.mesaDrop);
      if (!m) return;
      const { ocupadas } = ocupacionMesa(m, confs);
      el.classList.toggle('is-droppable', ocupadas < (Number(m.capacidad) || 0));
    });
  }

  /** @param {DragEvent} e */
  _onGuestDragOver(e) {
    const target = e.target.closest('[data-mesa-drop], [data-sin-drop]');
    if (!target || !this._dragGuestId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    target.classList.add('is-drop-over');
  }

  /** @param {DragEvent} e */
  _onGuestDragLeave(e) {
    const target = e.target.closest('[data-mesa-drop], [data-sin-drop]');
    if (target && !target.contains(e.relatedTarget)) target.classList.remove('is-drop-over');
  }

  /** @param {DragEvent} e */
  _onGuestDrop(e) {
    const gid = e.dataTransfer.getData('text/plain') || this._dragGuestId;
    const mesa = e.target.closest('[data-mesa-drop]');
    const sin = e.target.closest('[data-sin-drop]');
    if (!mesa && !sin) return;
    e.preventDefault();
    this._onGuestDragEnd();
    if (!gid) return;
    if (mesa) this._setMesaGuest(gid, mesa.dataset.mesaDrop, true);
    else this._setMesaGuest(gid, null);
  }

  /** Limpia las clases de arrastre de invitado. */
  _onGuestDragEnd() {
    this._dragGuestId = null;
    this.$$('.is-dragging').forEach((el) => el.classList.remove('is-dragging'));
    this.$$('.is-drop-over').forEach((el) => el.classList.remove('is-drop-over'));
    this.$$('.is-droppable').forEach((el) => el.classList.remove('is-droppable'));
  }

  // ---------- Operaciones (persisten) ----------

  /** @param {string} id @param {object} patch @param {boolean} [silent] */
  _setMesa(id, patch, silent) {
    const m = this._mesas.find((x) => x.id === id);
    if (!m) return;
    const updated = mesasRepo.upsert({ ...m, ...patch });
    const idx = this._mesas.findIndex((x) => x.id === id);
    this._mesas[idx] = updated;
    if (!silent) this._apply();
    else { this._refreshStats(); }
  }

  /** Asigna (o quita) la mesa de un invitado y repinta. */
  _setMesaGuest(guestId, mesaId, toast) {
    const g = this._invitados.find((x) => x.id === guestId);
    if (!g) return;
    const updated = invitadosRepo.upsert({ ...g, mesa: mesaId || null });
    const idx = this._invitados.findIndex((x) => x.id === guestId);
    this._invitados[idx] = updated;
    this._apply();
    if (toast && mesaId) {
      const m = this._mesas.find((x) => x.id === mesaId);
      if (m) this._toast('salon.toast.sentado', { nombre: g.nombre, mesa: m.nombre });
    }
  }

  /** @param {string} id */
  _toggleForma(id) {
    const m = this._mesas.find((x) => x.id === id);
    if (!m) return;
    this._setMesa(id, { forma: m.forma === 'rectangular' ? 'redonda' : 'rectangular' });
  }

  /** @param {string} id Quita a todos los comensales de la mesa. */
  _vaciarMesa(id) {
    const m = this._mesas.find((x) => x.id === id);
    this._invitados = this._invitados.map((g) => {
      if (g.mesa !== id) return g;
      return invitadosRepo.upsert({ ...g, mesa: null });
    });
    this._apply();
    if (m) this._toast('salon.toast.vaciada', { nombre: m.nombre });
  }

  /** @param {string} id Elimina la mesa y libera a sus comensales. */
  _removeMesa(id) {
    const m = this._mesas.find((x) => x.id === id);
    mesasRepo.remove(id);
    this._mesas = this._mesas.filter((x) => x.id !== id);
    this._invitados = this._invitados.map((g) => (g.mesa === id ? invitadosRepo.upsert({ ...g, mesa: null }) : g));
    if (this._mesaSel === id) this._mesaSel = null;
    this._apply();
    if (m) this._toast('salon.toast.eliminada', { nombre: m.nombre });
  }

  /** Añade una mesa redonda nueva en una posición libre. */
  _addMesa() {
    const n = this._mesas.length + 1;
    const created = mesasRepo.upsert({
      nombre: `${t('salon.mesa.nombreDefault')} ${n}`, capacidad: 10, forma: 'redonda',
      x: 18 + (n * 11) % 64, y: 78,
    });
    this._mesas.push(created);
    this._mesaSel = created.id;
    this._apply();
    this._toast('salon.toast.creada', { nombre: created.nombre });
  }

  /** Reorganiza las mesas actualizando su posición en sitio (transición CSS) y persiste. */
  _autoOrganizar() {
    autoOrganizar(this._mesas).forEach((m) => {
      this._setMesa(m.id, { x: m.x, y: m.y }, true);
      const wrap = this.$(`[data-mesa="${m.id}"]`)?.closest('.sal-mesa-wrap');
      if (wrap) { wrap.style.left = `${m.x}%`; wrap.style.top = `${m.y}%`; }
    });
    this._toast('salon.toast.auto');
  }

  /** Sienta a todos los confirmados sin mesa (auto-sentado inteligente) y persiste. */
  _autoSentar() {
    const asign = autoSentar(this._mesas, this._invitados);
    if (!asign.length) return;
    asign.forEach(({ id, mesa }) => {
      const g = this._invitados.find((x) => x.id === id);
      if (!g) return;
      const idx = this._invitados.findIndex((x) => x.id === id);
      this._invitados[idx] = invitadosRepo.upsert({ ...g, mesa });
    });
    this._apply();
    this._toast('salon.toast.sentados', { n: asign.length });
  }

  /** Abre una hoja imprimible (PDF) con el reparto de invitados por mesa. */
  _exportar() {
    const confs = this._confs;
    const bloques = this._mesas.map((m) => {
      const { asignados, ocupadas } = ocupacionMesa(m, confs);
      const r = resumenMesa(asignados);
      const guests = asignados.map((g) => escapeHtml(`${g.nombre}${Number(g.plus) ? ` +${g.plus}` : ''}`));
      const especiales = r.especiales
        ? `<p class="menus">${escapeHtml(t('salon.export.especiales'))}: ${r.menus.map((x) => escapeHtml(`${x.menu} ×${x.n}`)).join(' · ')}</p>`
        : '';
      return `<section class="mesa">
        <h2>${escapeHtml(m.nombre)} <span>${escapeHtml(t('salon.export.plazas', { ocupadas, cap: m.capacidad }))}</span></h2>
        ${guests.length ? `<ol>${guests.map((n) => `<li>${n}</li>`).join('')}</ol>` : `<p class="empty">${escapeHtml(t('salon.export.vacia'))}</p>`}
        ${especiales}
      </section>`;
    }).join('');
    const styles = `
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, sans-serif; color: #2b241c; background: #fff; margin: 0; padding: 24px; }
      header { border-bottom: 3px solid #b07d46; padding-bottom: 10px; margin-bottom: 20px; }
      h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 30px; margin: 0; }
      header p { margin: 4px 0 0; color: #7a6a55; }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .mesa { border: 1px solid #e6dccb; border-radius: 12px; padding: 12px 16px; break-inside: avoid; }
      .mesa h2 { font-family: Georgia, serif; font-size: 18px; margin: 0 0 8px; display: flex; justify-content: space-between; align-items: baseline; }
      .mesa h2 span { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #9a8871; font-family: -apple-system, sans-serif; }
      ol { margin: 0; padding-left: 20px; }
      li { padding: 2px 0; font-size: 13px; }
      .empty { color: #9a8871; font-style: italic; font-size: 13px; margin: 4px 0; }
      .menus { margin: 8px 0 0; font-size: 12px; color: #b07d46; }`;
    const doc = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><title>${escapeHtml(t('salon.export.title'))}</title><style>${styles}</style></head><body><header><h1>${escapeHtml(t('salon.export.title'))}</h1><p>${escapeHtml(t('salon.export.sub'))}</p></header><div class="grid">${bloques}</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { this._toast('salon.export'); return; }
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  }

  /** @param {Event} e Buscador de invitado (resalta su mesa y su asiento). */
  _onMainInput(e) {
    const buscar = e.target.closest('#sv-buscar');
    if (buscar) this._buscar(buscar.value);
  }

  /** @param {string} q Resalta la mesa y el avatar del invitado que coincide. */
  _buscar(q) {
    const needle = q.trim().toLowerCase();
    this.$$('.is-found').forEach((el) => el.classList.remove('is-found'));
    if (!needle) return;
    const g = this._confs.find((x) => x.mesa && String(x.nombre).toLowerCase().includes(needle));
    if (!g) return;
    this.$$(`[data-mesa-drop="${g.mesa}"]`).forEach((el) => el.classList.add('is-found'));
    this.$$(`.sal-av[data-guest="${g.id}"]`).forEach((el) => el.classList.add('is-found'));
  }

  /** Repinta solo la fila de stats (tras mover/redimensionar sin repintar el plano). */
  _refreshStats() {
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
  }

  /**
   * @param {string} key @param {Record<string,string|number>} [vars]
   */
  _toast(key, vars) {
    const el = this.$('#toast');
    if (el && typeof el.show === 'function') el.show(t(key, vars));
  }
}

customElements.define('salon-view', SalonView);
