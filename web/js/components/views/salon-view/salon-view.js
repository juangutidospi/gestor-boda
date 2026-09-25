import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './salon-view.css.js';
import { t, getLang } from '../../../i18n/index.js';
import {
  confirmados, ocupacionMesa, sinAsignar, calcularStats, mesaSize, sillasGeom, autoOrganizar, ladoTokens,
  autoSentar, resumenMesa, saludPlano, resumenGlobal, detectarSolapes, autoDistribuir,
} from './salon-calc.js';
import {
  ensureSeeded, mesasRepo, invitadosRepo, reglasRepo, salonRepo, zonasRepo,
} from '../../../core/repos.js';
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
  /** Texto del buscador (filtra). */
  _q = '';
  /** @type {object[]} Reglas de convivencia. */
  _reglas = [];
  /** Snapshot para deshacer la última acción, o null. */
  _undo = null;
  /** Imagen de fondo del plano (data URL), o ''. */
  _bg = '';
  /** Alto elegido a mano para el plano (p. ej. '720px'), o null. */
  _planoH = null;
  /** @type {ResizeObserver|null} */
  _ro = null;
  /** Zoom y desplazamiento del lienzo. */
  _zoom = 1;
  _panX = 0;
  _panY = 0;
  /** @type {object[]} Zonas del plano (sala, escenario, pista…). */
  _zonas = [];
  /** Id de la zona seleccionada en el editor de sala, o null. */
  _zonaSel = null;
  /** @type {Array<{a:object,b:object}>} Solapes detectados (geometría del plano). */
  _solapes = [];

  /**
   * Catálogo de zonas colocables: tamaño por defecto (px) e icono. La sala es el contorno
   * del recinto (solo borde) y solo puede haber una.
   */
  static ZONAS = [
    { tipo: 'sala', icon: '▢', w: 640, h: 440 },
    { tipo: 'escenario', icon: '🎤', w: 230, h: 70 },
    { tipo: 'pista', icon: '💃', w: 190, h: 150 },
    { tipo: 'barra', icon: '🍸', w: 180, h: 56 },
    { tipo: 'dj', icon: '🎧', w: 96, h: 74 },
    { tipo: 'photocall', icon: '📸', w: 130, h: 88 },
    { tipo: 'entrada', icon: '🚪', w: 96, h: 52 },
    { tipo: 'buffet', icon: '🍽️', w: 200, h: 60 },
    { tipo: 'regalos', icon: '🎁', w: 96, h: 74 },
    { tipo: 'tarta', icon: '🎂', w: 84, h: 84 },
    { tipo: 'aseos', icon: '🚻', w: 96, h: 74 },
  ];

  /** Registra los atajos de teclado UNA sola vez. */
  connectedCallback() {
    super.connectedCallback();
    this.on(window, 'keydown', this._onKey);
  }

  /**
   * Atajos (solo si la vista es visible): "/" buscar, +/− zoom, Esc deselecciona; con una
   * mesa seleccionada, flechas la mueven (Shift = más) y Supr la borra.
   * @param {KeyboardEvent} e
   */
  _onKey = (e) => {
    if (this.offsetParent === null) return;
    const active = this.shadowRoot.activeElement;
    const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
    if (typing) { if (e.key === 'Escape') active.blur(); return; }
    if (e.key === '/') { e.preventDefault(); this.$('#sv-buscar')?.focus(); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); this._zoomBy('in'); return; }
    if (e.key === '-') { e.preventDefault(); this._zoomBy('out'); return; }
    if (e.key === 'Escape') {
      if (this._mesaSel) { this._mesaSel = null; this._refreshMesaPanel(); this._markSelected(null); }
      if (this._zonaSel) { this._zonaSel = null; this._markZonaSel(null); }
      return;
    }
    if (this._zonaSel && !this._mesaSel) {
      const z = this._zonas.find((x) => x.id === this._zonaSel);
      if (z) {
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this._removeZona(z.id); return; }
        const stepZ = e.shiftKey ? 3 : 1;
        const nudgeZ = (dx, dy) => {
          e.preventDefault();
          const x = Math.min(100, Math.max(0, Math.round(((z.x ?? 50) + dx) * 2) / 2));
          const y = Math.min(100, Math.max(0, Math.round(((z.y ?? 50) + dy) * 2) / 2));
          this._setZona(z.id, { x, y }, true);
          const el = this.$(`[data-zona="${z.id}"]`);
          if (el) { el.style.left = `${x}%`; el.style.top = `${y}%`; }
        };
        if (e.key === 'ArrowLeft') return nudgeZ(-stepZ, 0);
        if (e.key === 'ArrowRight') return nudgeZ(stepZ, 0);
        if (e.key === 'ArrowUp') return nudgeZ(0, -stepZ);
        if (e.key === 'ArrowDown') return nudgeZ(0, stepZ);
      }
    }
    if (!this._mesaSel) return;
    const m = this._mesas.find((x) => x.id === this._mesaSel);
    if (!m) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this._removeMesa(m.id); return; }
    const step = e.shiftKey ? 3 : 1;
    const nudge = (dx, dy) => {
      e.preventDefault();
      const x = Math.min(94, Math.max(6, Math.round(((m.x ?? 50) + dx) * 2) / 2));
      const y = Math.min(92, Math.max(8, Math.round(((m.y ?? 50) + dy) * 2) / 2));
      this._setMesa(m.id, { x, y }, true);
      const wrap = this.$(`[data-mesa="${m.id}"]`)?.closest('.sal-mesa-wrap');
      if (wrap) { wrap.style.left = `${x}%`; wrap.style.top = `${y}%`; }
    };
    if (e.key === 'ArrowLeft') nudge(-step, 0);
    else if (e.key === 'ArrowRight') nudge(step, 0);
    else if (e.key === 'ArrowUp') nudge(0, -step);
    else if (e.key === 'ArrowDown') nudge(0, step);
  };

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._mesas = mesasRepo.list();
    this._invitados = invitadosRepo.list();
    this._reglas = reglasRepo.list();
    this._zonas = zonasRepo.list();
    this._bg = salonRepo.getBg();
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
          <input type="file" id="sv-bg-file" accept="image/*" hidden>
          <button class="btn btn-ghost" id="sv-fondo" type="button">${escapeHtml(t('salon.fondo'))}</button>
          <button class="btn btn-ghost" id="sv-tarjetas" type="button">${escapeHtml(t('salon.placecards'))}</button>
          <button class="btn btn-ghost" id="sv-plano" type="button">${escapeHtml(t('salon.exportPlano'))}</button>
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
          <div id="salud">${this._saludTpl}</div>
          <div id="mesa-panel">${this._mesaPanelTpl}</div>
          <div id="sin-asignar" class="sal-sin">${this._sinAsignarTpl}</div>
          <div id="reglas">${this._reglasTpl}</div>
        </aside>
      </div>`;
  }

  // ---------- Plano ----------

  /** @returns {string} Lienzo del plano con decoración/zonas y mesas. */
  get _planoTpl() {
    const confs = this._confs;
    const decor = !this._bg && this._zonas.length === 0;
    const zonaOpts = SalonView.ZONAS.map((z) => `<option value="${z.tipo}">${z.icon}&nbsp;&nbsp;${escapeHtml(t(`salon.zona.${z.tipo}`))}</option>`).join('');
    return `
      <div class="sal-plano-wrap">
        <div class="sal-plano${this._bg ? ' has-bg' : ''}" id="plano"${this._planoH ? ` style="height:${this._planoH}"` : ''}>
          ${decor ? '<div class="sal-plano-grid" aria-hidden="true"></div><div class="sal-plano-vignette" aria-hidden="true"></div><div class="sal-plano-inner1" aria-hidden="true"></div>' : '<div class="sal-plano-grid is-plain" aria-hidden="true"></div>'}
          <div class="sal-plano-tools">
            <button class="btn btn-secondary sal-auto" id="sv-auto" type="button">${escapeHtml(t('salon.plano.distribuir'))}</button>
            <select class="input sal-zona-sel" id="sv-zona-add" aria-label="${escapeHtml(t('salon.zona.add'))}">
              <option value="">${escapeHtml(t('salon.zona.add'))}</option>${zonaOpts}
            </select>
            ${this._bg ? `<button class="btn btn-secondary sal-auto" id="sv-bg-quitar" type="button">${escapeHtml(t('salon.fondo.quitar'))}</button>` : ''}
          </div>
          <div class="sal-zoom">
            <button type="button" data-zoom="out" aria-label="−">−</button>
            <button type="button" data-zoom="reset" class="sal-zoom-pct">${Math.round(this._zoom * 100)}%</button>
            <button type="button" data-zoom="in" aria-label="+">+</button>
          </div>
          <div class="sal-canvas" id="canvas" style="transform:translate(${this._panX}px,${this._panY}px) scale(${this._zoom})">
            ${this._bg ? `<div class="sal-bg" style="background-image:url('${this._bg}')"></div>` : ''}
            ${decor ? `
            <div class="sal-presidencia">${escapeHtml(t('salon.plano.presidencia'))}</div>
            <div class="sal-pista">${escapeHtml(t('salon.plano.pista'))}</div>
            <div class="sal-barra">${escapeHtml(t('salon.plano.barra'))}</div>` : ''}
            <div class="sal-zonas" id="zonas">${this._zonasTpl}</div>
            <div class="sal-guide sal-guide-v" id="guide-x" hidden></div>
            <div class="sal-guide sal-guide-h" id="guide-y" hidden></div>
            ${this._mesas.map((m) => this._mesaTpl(m, confs)).join('')}
          </div>
        </div>
      </div>`;
  }

  /** @returns {string} Capa de zonas del plano (la sala primero, detrás de todo). */
  get _zonasTpl() {
    const orden = [...this._zonas].sort((a, b) => (a.tipo === 'sala' ? -1 : b.tipo === 'sala' ? 1 : 0));
    return orden.map((z) => this._zonaTpl(z)).join('');
  }

  /** @param {object} z @returns {string} Una zona posicionada, con etiqueta y tiradores (si está seleccionada). */
  _zonaTpl(z) {
    const meta = SalonView.ZONAS.find((k) => k.tipo === z.tipo) || { icon: '' };
    const sel = this._zonaSel === z.id;
    const rot = Number(z.rot) || 0;
    const esSala = z.tipo === 'sala';
    return `
      <div class="sal-zona zona-${escapeHtml(z.tipo)}${sel ? ' is-sel' : ''}" data-zona="${escapeHtml(z.id)}"
           style="left:${z.x ?? 50}%;top:${z.y ?? 50}%;width:${z.w}px;height:${z.h}px;transform:translate(-50%,-50%) rotate(${rot}deg)">
        <span class="sal-zona-lbl">${meta.icon} ${escapeHtml(t(`salon.zona.${z.tipo}`))}</span>
        <button class="sal-zona-del" type="button" data-zona-del="${escapeHtml(z.id)}" aria-label="${escapeHtml(t('salon.zona.borrar'))}">×</button>
        <span class="sal-zona-h sal-zona-resize" data-zona-resize="${escapeHtml(z.id)}" aria-hidden="true"></span>
        ${esSala ? '' : `<span class="sal-zona-h sal-zona-rot" data-zona-rot="${escapeHtml(z.id)}" aria-hidden="true"></span>`}
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

  // ---------- Avisos / salud del plano ----------

  /** @returns {string} Panel de avisos (vacío si no hay ninguno). */
  get _saludTpl() {
    const avisos = saludPlano(this._mesas, this._invitados, this._reglas);
    const solapes = this._solapes || [];
    if (!avisos.length && !solapes.length) return '';
    const txt = (a) => {
      if (a.tipo === 'sobrecupo') return t('salon.salud.sobrecupo', { mesa: a.texto });
      if (a.tipo === 'porSentar') return t('salon.salud.porSentar', { n: a.n });
      if (a.tipo === 'vacia') return t('salon.salud.vacia', { mesa: a.texto });
      if (a.tipo === 'reglaJuntos') return t('salon.salud.reglaJuntos', { texto: a.texto });
      if (a.tipo === 'reglaSeparados') return t('salon.salud.reglaSeparados', { texto: a.texto });
      return '';
    };
    const warn = (a) => (a.tipo === 'sobrecupo' || a.tipo === 'reglaSeparados' || a.tipo === 'reglaJuntos');
    // Aviso de solape: enfoca la mesa implicada (la primera de las dos que sea mesa).
    const solapeLi = (s) => {
      const mesa = s.a.kind === 'mesa' ? s.a : s.b;
      return `<li class="sal-aviso is-warn" data-salud-mesa="${escapeHtml(mesa.id)}">${escapeHtml(t('salon.salud.solape', { a: s.a.nombre, b: s.b.nombre }))}</li>`;
    };
    const n = avisos.length + solapes.length;
    return `
      <div class="sal-salud">
        <div class="sal-salud-head">${escapeHtml(t('salon.salud.title'))} <span class="sal-salud-n">${n}</span></div>
        <ul class="sal-salud-list">
          ${avisos.map((a) => `<li class="sal-aviso${warn(a) ? ' is-warn' : ''}"${a.mesa ? ` data-salud-mesa="${escapeHtml(a.mesa)}"` : ' data-salud-sentar'}>${escapeHtml(txt(a))}</li>`).join('')}
          ${solapes.map(solapeLi).join('')}
        </ul>
      </div>`;
  }

  // ---------- Reglas de convivencia ----------

  /** @returns {string} Panel de reglas (lista + alta). */
  get _reglasTpl() {
    const confs = this._confs;
    const nombre = (id) => confs.find((g) => g.id === id)?.nombre || '—';
    const opciones = confs.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.nombre)}</option>`).join('');
    return `
      <div class="sal-reglas">
        <h3 class="sal-aside-title">${escapeHtml(t('salon.reglas.title'))}</h3>
        <div class="sal-reglas-list">
          ${this._reglas.length
    ? this._reglas.map((r) => `
            <div class="sal-regla${r.tipo === 'separados' ? ' is-sep' : ''}">
              <span class="sal-regla-txt">${escapeHtml(nombre(r.a))} <b>${escapeHtml(t(r.tipo === 'juntos' ? 'salon.reglas.juntos' : 'salon.reglas.separados'))}</b> ${escapeHtml(nombre(r.b))}</span>
              <button class="sal-regla-x" type="button" data-regla-del="${escapeHtml(r.id)}" aria-label="×">×</button>
            </div>`).join('')
    : `<span class="muted">${escapeHtml(t('salon.reglas.vacio'))}</span>`}
        </div>
        <div class="sal-regla-add">
          <select class="input" data-regla-a><option value="">${escapeHtml(t('salon.reglas.sel'))}</option>${opciones}</select>
          <select class="input" data-regla-tipo>
            <option value="juntos">${escapeHtml(t('salon.reglas.juntos'))}</option>
            <option value="separados">${escapeHtml(t('salon.reglas.separados'))}</option>
          </select>
          <select class="input" data-regla-b><option value="">${escapeHtml(t('salon.reglas.sel'))}</option>${opciones}</select>
          <button class="btn btn-secondary sal-regla-add-btn" type="button" data-regla-add>${escapeHtml(t('salon.reglas.add'))}</button>
        </div>
      </div>`;
  }

  /** Selecciona una mesa (desde un aviso): abre su panel y la marca. */
  _selectMesa(id) {
    this._mesaSel = id;
    this._refreshMesaPanel();
    this._markSelected(id);
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
        <input class="input" type="search" id="sv-buscar" placeholder="${escapeHtml(t('salon.buscar.ph'))}" value="${escapeHtml(this._q)}">
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
    this.on(this.$('#sv-plano'), 'click', () => this._exportarPlano());
    this.on(this.$('#sv-tarjetas'), 'click', () => this._exportarPlaceCards());
    this.on(this.$('#sv-fondo'), 'click', () => this.$('#sv-bg-file')?.click());
    this.on(this.$('#sv-bg-file'), 'change', (e) => this._onBgFile(e));
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
    this._observePlano();
    this._refreshSalud();
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
    this._refreshSalud();
    if (this._q) this._buscar(this._q);
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
    if (e.target.closest('#sv-auto')) { this._autoLayout(); return; }
    if (e.target.closest('#sv-bg-quitar')) { this._clearBg(); return; }
    const zonaDel = e.target.closest('[data-zona-del]');
    if (zonaDel) { this._removeZona(zonaDel.dataset.zonaDel); return; }
    if (e.target.closest('#sv-autosentar')) { this._autoSentar(); return; }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom) { this._zoomBy(zoom.dataset.zoom); return; }
    if (e.target.closest('[data-deselect]')) { this._mesaSel = null; this._refreshMesaPanel(); this._markSelected(null); return; }
    const saludMesa = e.target.closest('[data-salud-mesa]');
    if (saludMesa) { this._selectMesa(saludMesa.dataset.saludMesa); return; }
    if (e.target.closest('[data-salud-sentar]')) { this.$('#sv-buscar')?.focus(); return; }
    const reglaDel = e.target.closest('[data-regla-del]');
    if (reglaDel) { reglasRepo.remove(reglaDel.dataset.reglaDel); this._reglas = reglasRepo.list(); this._apply(); return; }
    if (e.target.closest('[data-regla-add]')) { this._addRegla(); return; }
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
    const zonaAdd = e.target.closest('#sv-zona-add');
    if (zonaAdd) { if (zonaAdd.value) this._addZona(zonaAdd.value); zonaAdd.value = ''; return; }
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

  /** @param {PointerEvent} e Arrastra/edita una zona o mesa, o desplaza (pan) el lienzo. */
  _onPointerDown(e) {
    const resize = e.target.closest('[data-zona-resize]');
    if (resize) { this._startZonaResize(e, resize.dataset.zonaResize); return; }
    const rot = e.target.closest('[data-zona-rot]');
    if (rot) { this._startZonaRot(e, rot.dataset.zonaRot); return; }
    const mesa = e.target.closest('[data-mesa]');
    if (mesa) { this._startMesaDrag(e, mesa); return; }
    const zona = e.target.closest('[data-zona]');
    if (zona && !e.target.closest('button')) { this._startZonaDrag(e, zona); return; }
    if (e.target.closest('.sal-av, button, input, select, a')) return;
    if (e.target.closest('#canvas') || e.target.closest('#plano')) this._startPan(e);
  }

  /** @param {PointerEvent} e @param {HTMLElement} mesa Arrastre de mesa con corrección de zoom y guías de alineación. */
  _startMesaDrag(e, mesa) {
    const id = mesa.dataset.mesa;
    this._mesaSel = id;
    this._dragMesaId = id;
    this._zonaSel = null;
    this._markZonaSel(null);
    this._refreshMesaPanel();
    this._markSelected(id);
    const box = this.$('#plano');
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const wrap = mesa.closest('.sal-mesa-wrap');
    // Sin transición mientras se arrastra (la de .sal-mesa-wrap es para auto-organizar).
    if (wrap) wrap.style.transition = 'none';
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
      if (wrap) wrap.style.transition = '';
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

  // ---------- Editor de sala (zonas) ----------

  /** Marca visualmente la zona seleccionada (muestra sus tiradores) sin repintar. */
  _markZonaSel(id) {
    this.$$('.sal-zona').forEach((el) => el.classList.toggle('is-sel', el.dataset.zona === id));
  }

  /** Selecciona una zona: deselecciona mesa y muestra sus tiradores. */
  _selectZona(id) {
    this._zonaSel = id;
    this._mesaSel = null;
    this._markSelected(null);
    this._refreshMesaPanel();
    this._markZonaSel(id);
  }

  /** @param {PointerEvent} e @param {HTMLElement} zona Arrastra una zona (corrige zoom). */
  _startZonaDrag(e, zona) {
    const id = zona.dataset.zona;
    this._selectZona(id);
    const box = this.$('#plano');
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const snap = (v) => Math.round(v * 2) / 2;
    let moved = false;
    let pos = null;
    const move = (ev) => {
      moved = true;
      const x = snap(Math.min(100, Math.max(0, ((ev.clientX - rect.left - this._panX) / (rect.width * this._zoom)) * 100)));
      const y = snap(Math.min(100, Math.max(0, ((ev.clientY - rect.top - this._panY) / (rect.height * this._zoom)) * 100)));
      zona.style.left = `${x}%`;
      zona.style.top = `${y}%`;
      pos = { x, y };
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved && pos) this._setZona(id, pos, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** @param {PointerEvent} e @param {string} id Redimensiona una zona anclando su esquina superior-izquierda. */
  _startZonaResize(e, id) {
    e.preventDefault();
    const z = this._zonas.find((x) => x.id === id);
    const zona = this.$(`[data-zona="${id}"]`);
    const canvas = this.$('#canvas');
    if (!z || !zona || !canvas) return;
    this._selectZona(id);
    const W = canvas.offsetWidth || 1;
    const H = canvas.offsetHeight || 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const w0 = z.w;
    const h0 = z.h;
    const tlx = ((z.x ?? 50) / 100) * W - w0 / 2; // esquina sup-izq fija (px)
    const tly = ((z.y ?? 50) / 100) * H - h0 / 2;
    let out = null;
    const move = (ev) => {
      const w = Math.max(44, Math.round(w0 + (ev.clientX - startX) / this._zoom));
      const h = Math.max(36, Math.round(h0 + (ev.clientY - startY) / this._zoom));
      const x = ((tlx + w / 2) / W) * 100;
      const y = ((tly + h / 2) / H) * 100;
      zona.style.width = `${w}px`;
      zona.style.height = `${h}px`;
      zona.style.left = `${x}%`;
      zona.style.top = `${y}%`;
      out = { w, h, x, y };
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (out) this._setZona(id, out, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** @param {PointerEvent} e @param {string} id Rota una zona arrastrando el tirador superior (pasos de 15°). */
  _startZonaRot(e, id) {
    e.preventDefault();
    const zona = this.$(`[data-zona="${id}"]`);
    if (!zona) return;
    this._selectZona(id);
    const r = zona.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let deg = 0;
    const move = (ev) => {
      const a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      deg = Math.round(a / 15) * 15;
      zona.style.transform = `translate(-50%,-50%) rotate(${deg}deg)`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this._setZona(id, { rot: ((deg % 360) + 360) % 360 }, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** Añade una zona nueva del tipo dado (la sala es única) y la selecciona. */
  _addZona(tipo) {
    const meta = SalonView.ZONAS.find((z) => z.tipo === tipo);
    if (!meta) return;
    if (tipo === 'sala') {
      const existe = this._zonas.find((z) => z.tipo === 'sala');
      if (existe) { this._selectZona(existe.id); return; }
    }
    const created = zonasRepo.upsert({ tipo, x: 50, y: tipo === 'sala' ? 50 : 62, w: meta.w, h: meta.h, rot: 0 });
    this._zonas.push(created);
    this._zonaSel = created.id;
    this._apply();
    this._toast('salon.toast.zonaCreada', { nombre: t(`salon.zona.${tipo}`) });
  }

  /** @param {string} id @param {object} patch @param {boolean} [silent] Persiste una zona. */
  _setZona(id, patch, silent) {
    const z = this._zonas.find((x) => x.id === id);
    if (!z) return;
    const updated = zonasRepo.upsert({ ...z, ...patch });
    const idx = this._zonas.findIndex((x) => x.id === id);
    this._zonas[idx] = updated;
    if (!silent) this._apply();
    else this._refreshSalud();
  }

  /** @param {string} id Elimina una zona del plano. */
  _removeZona(id) {
    zonasRepo.remove(id);
    this._zonas = this._zonas.filter((x) => x.id !== id);
    if (this._zonaSel === id) this._zonaSel = null;
    this._apply();
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

  /** @param {'in'|'out'|'reset'} dir Zoom desde los botones o el teclado (hacia el centro). */
  _zoomBy(dir) {
    const rect = this.$('#plano')?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : null;
    const cy = rect ? rect.height / 2 : null;
    if (dir === 'in') this._setZoom(this._zoom * 1.2, cx, cy);
    else if (dir === 'out') this._setZoom(this._zoom / 1.2, cx, cy);
    else { this._zoom = 1; this._panX = 0; this._panY = 0; this._applyCanvasTransform(); }
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
    else { this._refreshStats(); this._refreshSalud(); }
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
    this._snapshot();
    this._invitados = this._invitados.map((g) => {
      if (g.mesa !== id) return g;
      return invitadosRepo.upsert({ ...g, mesa: null });
    });
    this._apply();
    if (m) this._toastUndo('salon.toast.vaciada', { nombre: m.nombre });
  }

  /** @param {string} id Elimina la mesa y libera a sus comensales. */
  _removeMesa(id) {
    const m = this._mesas.find((x) => x.id === id);
    this._snapshot();
    mesasRepo.remove(id);
    this._mesas = this._mesas.filter((x) => x.id !== id);
    this._invitados = this._invitados.map((g) => (g.mesa === id ? invitadosRepo.upsert({ ...g, mesa: null }) : g));
    if (this._mesaSel === id) this._mesaSel = null;
    this._apply();
    if (m) this._toastUndo('salon.toast.eliminada', { nombre: m.nombre });
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
    this._snapshot();
    autoOrganizar(this._mesas).forEach((m) => {
      this._setMesa(m.id, { x: m.x, y: m.y }, true);
      const wrap = this.$(`[data-mesa="${m.id}"]`)?.closest('.sal-mesa-wrap');
      if (wrap) { wrap.style.left = `${m.x}%`; wrap.style.top = `${m.y}%`; }
    });
    this._toastUndo('salon.toast.auto');
  }

  /** Distribuye las mesas esquivando las zonas si las hay; si no, usa la rejilla clásica. */
  _autoLayout() {
    const zonas = this._zonas.filter((z) => z.tipo !== 'sala');
    const canvas = this.$('#canvas');
    if (!zonas.length || !canvas) { this._autoOrganizar(); return; }
    const W = canvas.offsetWidth || 1;
    const H = canvas.offsetHeight || 1;
    const sala = this._zonas.find((z) => z.tipo === 'sala');
    const pad = 40;
    const area = sala
      ? { cx: (sala.x / 100) * W, cy: (sala.y / 100) * H, w: Math.max(220, sala.w - pad * 2), h: Math.max(220, sala.h - pad * 2) }
      : { cx: W / 2, cy: H / 2, w: W * 0.92, h: H * 0.92 };
    const obst = zonas.map((z) => ({ cx: ((z.x ?? 50) / 100) * W, cy: ((z.y ?? 50) / 100) * H, w: z.w + 30, h: z.h + 30 }));
    const sizes = this._mesas.map((m) => mesaSize(m));
    const maxW = Math.max(120, ...sizes.map((s) => s.w));
    const maxH = Math.max(110, ...sizes.map((s) => s.h));
    const cell = { cw: maxW + 56, ch: maxH + 70 };
    const centros = autoDistribuir(area, this._mesas.length, obst, cell);
    if (!centros.length) return;
    this._snapshot();
    this._mesas.forEach((m, i) => {
      const c = centros[i];
      if (!c) return;
      const x = Math.min(97, Math.max(3, Math.round((c.cx / W * 100) * 2) / 2));
      const y = Math.min(97, Math.max(3, Math.round((c.cy / H * 100) * 2) / 2));
      this._setMesa(m.id, { x, y }, true);
      const wrap = this.$(`[data-mesa="${m.id}"]`)?.closest('.sal-mesa-wrap');
      if (wrap) { wrap.style.left = `${x}%`; wrap.style.top = `${y}%`; }
    });
    this._toastUndo('salon.toast.distribuir');
  }

  /** Sienta a todos los confirmados sin mesa (auto-sentado inteligente) y persiste. */
  _autoSentar() {
    const asign = autoSentar(this._mesas, this._invitados, this._reglas);
    if (!asign.length) return;
    this._snapshot();
    asign.forEach(({ id, mesa }) => {
      const g = this._invitados.find((x) => x.id === id);
      if (!g) return;
      const idx = this._invitados.findIndex((x) => x.id === id);
      this._invitados[idx] = invitadosRepo.upsert({ ...g, mesa });
    });
    this._apply();
    this._toastUndo('salon.toast.sentados', { n: asign.length });
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
      body { font-family: -apple-system, system-ui, sans-serif; color: #2e3a2f; background: #fff; margin: 0; padding: 24px; }
      header { border-bottom: 3px solid #c96f4f; padding-bottom: 10px; margin-bottom: 20px; }
      h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 30px; margin: 0; }
      header p { margin: 4px 0 0; color: #6f6a55; }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .mesa { border: 1px solid #e4ddcc; border-radius: 12px; padding: 12px 16px; break-inside: avoid; }
      .mesa h2 { font-family: Georgia, serif; font-size: 18px; margin: 0 0 8px; display: flex; justify-content: space-between; align-items: baseline; }
      .mesa h2 span { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #8a8065; font-family: -apple-system, sans-serif; }
      ol { margin: 0; padding-left: 20px; }
      li { padding: 2px 0; font-size: 13px; }
      .empty { color: #8a8065; font-style: italic; font-size: 13px; margin: 4px 0; }
      .menus { margin: 8px 0 0; font-size: 12px; color: #c96f4f; }`;
    const global = resumenGlobal(this._invitados);
    const cateringHtml = global.length
      ? `<section class="catering"><h3>${escapeHtml(t('salon.export.catering'))}</h3><ul>${global.map((x) => `<li><span>${escapeHtml(x.menu)}</span><b>${x.n}</b></li>`).join('')}</ul></section>`
      : '';
    const doc = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><title>${escapeHtml(t('salon.export.title'))}</title><style>${styles}
      .catering { margin: 0 0 20px; border: 1px solid #e4ddcc; border-radius: 12px; padding: 12px 16px; break-inside: avoid; }
      .catering h3 { font-family: Georgia, serif; font-size: 16px; margin: 0 0 8px; }
      .catering ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }
      .catering li { display: flex; gap: 8px; font-size: 13px; } .catering b { color: #c96f4f; }</style></head><body><header><h1>${escapeHtml(t('salon.export.title'))}</h1><p>${escapeHtml(t('salon.export.sub'))}</p></header>${cateringHtml}<div class="grid">${bloques}</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { this._toast('salon.export'); return; }
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  }

  /**
   * Dibuja el plano actual (sala, zonas y mesas con nombres) como SVG a escala del lienzo.
   * @param {number} W @param {number} H
   * @returns {string} Markup SVG.
   */
  _planoSvg(W, H) {
    const confs = this._confs;
    const px = (v, tot) => (v / 100) * tot;
    const parts = [`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`];
    const zonas = [...this._zonas].sort((a, b) => (a.tipo === 'sala' ? -1 : b.tipo === 'sala' ? 1 : 0));
    zonas.forEach((z) => {
      const cx = px(z.x ?? 50, W);
      const cy = px(z.y ?? 50, H);
      const x = cx - z.w / 2;
      const y = cy - z.h / 2;
      const rot = Number(z.rot) || 0;
      const g = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';
      if (z.tipo === 'sala') {
        parts.push(`<rect x="${x}" y="${y}" width="${z.w}" height="${z.h}" rx="10" fill="none" stroke="#b9ad93" stroke-width="2"${g}/>`);
        parts.push(`<text x="${x + 8}" y="${y + 16}" font-size="11" fill="#8a8065" font-family="sans-serif" letter-spacing="1">${escapeHtml(t('salon.zona.sala').toUpperCase())}</text>`);
        return;
      }
      const pal = z.tipo === 'pista' ? ['#f6e7db', '#c96f4f', '#a4512f']
        : z.tipo === 'escenario' ? ['#eef2e7', '#6b7f5b', '#55663f']
          : ['#f1ece1', '#d9c9b2', '#6f6a55'];
      parts.push(`<rect x="${x}" y="${y}" width="${z.w}" height="${z.h}" rx="8" fill="${pal[0]}" stroke="${pal[1]}" stroke-width="1.2"${g}/>`);
      parts.push(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" fill="${pal[2]}" font-family="sans-serif" letter-spacing="1"${g}>${escapeHtml(t(`salon.zona.${z.tipo}`).toUpperCase())}</text>`);
    });
    this._mesas.forEach((m) => {
      const { rect, w, h } = mesaSize(m);
      const cx = px(m.x ?? 50, W);
      const cy = px(m.y ?? 50, H);
      const { asignados, ocupadas } = ocupacionMesa(m, confs);
      const people = this._peopleDeMesa(asignados).map((p) => String(p.nombre).split(' ')[0]);
      if (rect) parts.push(`<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="14" fill="#fffdf7" stroke="#c9b89c" stroke-width="1.4"/>`);
      else parts.push(`<circle cx="${cx}" cy="${cy}" r="${w / 2}" fill="#fffdf7" stroke="#c9b89c" stroke-width="1.4"/>`);
      const nameY = cy - h / 2 + 20;
      parts.push(`<text x="${cx}" y="${nameY}" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="#2e3a2f">${escapeHtml(m.nombre)}</text>`);
      parts.push(`<text x="${cx}" y="${nameY + 13}" text-anchor="middle" font-size="9" fill="#c96f4f" font-family="sans-serif" letter-spacing="1">${ocupadas}/${Number(m.capacidad) || 0}</text>`);
      const maxLines = Math.max(0, Math.floor((h - 52) / 11));
      const shown = people.slice(0, maxLines);
      let ly = nameY + 27;
      shown.forEach((nm) => { parts.push(`<text x="${cx}" y="${ly}" text-anchor="middle" font-size="9" fill="#4a4a3f" font-family="sans-serif">${escapeHtml(nm)}</text>`); ly += 11; });
      if (people.length > shown.length) parts.push(`<text x="${cx}" y="${ly}" text-anchor="middle" font-size="8.5" fill="#8a8065" font-family="sans-serif">+${people.length - shown.length}</text>`);
    });
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:100%;height:auto">${parts.join('')}</svg>`;
  }

  /** Abre una hoja imprimible (PDF) con el plano del salón dibujado a escala. */
  _exportarPlano() {
    const canvas = this.$('#canvas');
    const W = Math.round(canvas?.offsetWidth || 960);
    const H = Math.round(canvas?.offsetHeight || 620);
    const svg = this._planoSvg(W, H);
    const styles = `
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, sans-serif; color: #2e3a2f; margin: 0; padding: 20px; }
      header { border-bottom: 3px solid #c96f4f; padding-bottom: 8px; margin-bottom: 14px; }
      h1 { font-family: Georgia, serif; font-size: 26px; margin: 0; }
      header p { margin: 3px 0 0; color: #6f6a55; font-size: 13px; }
      .plano { width: 100%; border: 1px solid #e4ddcc; border-radius: 10px; padding: 10px; }`;
    const doc = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><title>${escapeHtml(t('salon.exportPlano.title'))}</title><style>${styles}</style></head><body><header><h1>${escapeHtml(t('salon.exportPlano.title'))}</h1><p>${escapeHtml(t('salon.exportPlano.sub'))}</p></header><div class="plano">${svg}</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { this._toast('salon.export'); return; }
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  }

  /** Abre una hoja imprimible con una tarjeta de sitio por comensal (lado, nombre, mesa y menú). */
  _exportarPlaceCards() {
    const nombreMesa = (id) => this._mesas.find((m) => m.id === id)?.nombre || '';
    const esEstandar = (m) => !m || /^est[aá]ndar$/i.test(String(m).trim());
    const cards = [];
    this._confs.filter((g) => g.mesa).forEach((g) => {
      const mesa = nombreMesa(g.mesa);
      const lado = g.lado === 'novia' ? 'novia' : 'novio';
      cards.push({ nombre: g.nombre, mesa, lado, menu: g.menu || '' });
      const comps = Array.isArray(g.acompanantes) ? g.acompanantes : [];
      const n = Number(g.plus) || 0;
      // Los acompañantes heredan el lado del titular; su menú no se registra por separado.
      for (let k = 0; k < n; k++) cards.push({ nombre: comps[k] || `${String(g.nombre).split(' ')[0]} +1`, mesa, lado, menu: '' });
    });
    if (!cards.length) return;
    const ladoLbl = { novia: t('salon.leyenda.novia'), novio: t('salon.leyenda.novio') };
    const styles = `
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 10mm; }
      .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
      .card { position: relative; overflow: hidden; border: 1px solid #ddd0bb; border-top: 4px solid #c96f4f;
        border-radius: 8px; height: 54mm; display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center; padding: 7mm 6mm; break-inside: avoid;
        background: linear-gradient(180deg, #fffdf7, #f4efe3); }
      .card.novia { border-top-color: #bd6f79; }
      .card.novio { border-top-color: #6a8dab; }
      .card .lado { position: absolute; top: 5mm; left: 0; right: 0; font-size: 9px; letter-spacing: .18em;
        text-transform: uppercase; font-weight: 600; }
      .card.novia .lado { color: #bd6f79; }
      .card.novio .lado { color: #6a8dab; }
      .card .nombre { font-family: Georgia, 'Times New Roman', serif; font-size: 23px; color: #2e3a2f; line-height: 1.15; }
      .card .mesa { margin-top: 7px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #c96f4f; }
      .card .menu { margin-top: 9px; font-size: 11px; color: #6f6a55; }
      .card .menu b { color: #2e3a2f; }
      .card .menu.esp { margin-top: 9px; padding: 3px 10px; border-radius: 999px;
        background: #f6e7db; color: #a4512f; font-weight: 600; letter-spacing: .02em; }`;
    const html = cards.map((c) => {
      const menuTpl = c.menu
        ? (esEstandar(c.menu)
          ? `<div class="menu">${escapeHtml(t('salon.placecards.menu'))}: <b>${escapeHtml(c.menu)}</b></div>`
          : `<div class="menu esp">${escapeHtml(t('salon.placecards.especial'))}: ${escapeHtml(c.menu)}</div>`)
        : '';
      return `<div class="card ${c.lado}"><span class="lado">${escapeHtml(ladoLbl[c.lado])}</span>`
        + `<div class="nombre">${escapeHtml(c.nombre)}</div>`
        + `<div class="mesa">${escapeHtml(c.mesa)}</div>${menuTpl}</div>`;
    }).join('');
    const doc = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><title>${escapeHtml(t('salon.placecards.title'))}</title><style>${styles}</style></head><body><div class="sheet">${html}</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  }

  /** @param {Event} e Lee la imagen elegida, la redimensiona y la fija como fondo del plano. */
  _onBgFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 1400;
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      try {
        const url = c.toDataURL('image/jpeg', 0.82);
        salonRepo.setBg(url);
        this._bg = url;
        this._apply();
      } catch { /* cuota superada u otro error: se ignora */ }
    };
    img.src = URL.createObjectURL(file);
  }

  /** Quita la imagen de fondo del plano. */
  _clearBg() {
    salonRepo.setBg('');
    this._bg = '';
    this._apply();
  }

  /** @param {Event} e Buscador de invitado (filtra la lista y el plano). */
  _onMainInput(e) {
    const buscar = e.target.closest('#sv-buscar');
    if (buscar) { this._q = buscar.value; this._buscar(this._q); }
  }

  /**
   * Filtra por nombre: en "Sin asignar" muestra solo las filas que coinciden; en el plano
   * atenúa las mesas que no contienen a nadie que coincida y resalta los asientos que sí.
   * @param {string} q
   */
  _buscar(q) {
    const needle = q.trim().toLowerCase();
    const active = !!needle;
    const match = (g) => g && String(g.nombre).toLowerCase().includes(needle);
    // Lista "Sin asignar": ocultar las que no coinciden.
    this.$$('.sal-guest[data-guest]').forEach((row) => {
      const g = this._invitados.find((x) => x.id === row.dataset.guest);
      row.hidden = active && !match(g);
    });
    // Plano: mesas con algún comensal que coincide.
    const mesasMatch = new Set();
    if (active) this._confs.forEach((g) => { if (g.mesa && match(g)) mesasMatch.add(g.mesa); });
    this.$$('.sal-mesa-wrap').forEach((wrap) => {
      const id = wrap.querySelector('[data-mesa]')?.dataset.mesa;
      wrap.classList.toggle('is-dimmed', active && mesasMatch.size > 0 && !mesasMatch.has(id));
    });
    // Resalta los asientos que coinciden.
    this.$$('.sal-av').forEach((av) => {
      const g = this._invitados.find((x) => x.id === av.dataset.guest);
      av.classList.toggle('is-found', active && match(g) && !!g.mesa);
    });
  }

  /** Repinta solo la fila de stats (tras mover/redimensionar sin repintar el plano). */
  _refreshStats() {
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
  }

  /**
   * Detecta solapes en el plano (mesa-mesa y mesa-zona) midiendo el lienzo real.
   * @returns {Array<{a:object,b:object}>}
   */
  _computeSolapes() {
    if (this._vista !== 'plano') return [];
    const canvas = this.$('#canvas');
    if (!canvas) return [];
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return [];
    const items = [];
    this._mesas.forEach((m) => {
      const { w, h } = mesaSize(m);
      items.push({ id: m.id, nombre: m.nombre, kind: 'mesa', cx: ((m.x ?? 50) / 100) * W, cy: ((m.y ?? 50) / 100) * H, w, h });
    });
    this._zonas.filter((z) => z.tipo !== 'sala').forEach((z) => {
      items.push({ id: z.id, nombre: t(`salon.zona.${z.tipo}`), kind: 'zona', cx: ((z.x ?? 50) / 100) * W, cy: ((z.y ?? 50) / 100) * H, w: z.w, h: z.h });
    });
    return detectarSolapes(items, 10);
  }

  /** Recalcula los solapes con el lienzo ya montado y repinta el panel de Salud. */
  _refreshSalud() {
    this._solapes = this._computeSolapes();
    const el = this.$('#salud');
    if (el) el.innerHTML = this._saludTpl;
  }

  /**
   * @param {string} key @param {Record<string,string|number>} [vars]
   */
  _toast(key, vars, opts) {
    const el = this.$('#toast');
    if (el && typeof el.show === 'function') el.show(t(key, vars), opts);
  }

  /** Guarda un snapshot (asignaciones + mesas) para poder deshacer la última acción. */
  _snapshot() {
    this._undo = {
      inv: this._invitados.map((g) => ({ id: g.id, mesa: g.mesa ?? null })),
      mesas: this._mesas.map((m) => ({ ...m })),
    };
  }

  /** Restaura el último snapshot (deshacer). */
  _restore() {
    const s = this._undo;
    if (!s) return;
    s.inv.forEach((r) => {
      const g = this._invitados.find((x) => x.id === r.id);
      if (g) invitadosRepo.upsert({ ...g, mesa: r.mesa });
    });
    const ids = new Set(s.mesas.map((m) => m.id));
    this._mesas.filter((m) => !ids.has(m.id)).forEach((m) => mesasRepo.remove(m.id));
    s.mesas.forEach((m) => mesasRepo.upsert(m));
    this._mesas = mesasRepo.list();
    this._invitados = invitadosRepo.list();
    this._undo = null;
    this._apply();
  }

  /** Toast con acción de deshacer. @param {string} key @param {object} [vars] */
  _toastUndo(key, vars) {
    this._toast(key, vars, { actionLabel: t('salon.toast.deshacer'), onAction: () => this._restore() });
  }

  /** Añade una regla de convivencia desde los selectores del panel. */
  _addRegla() {
    const a = this.$('[data-regla-a]')?.value;
    const b = this.$('[data-regla-b]')?.value;
    const tipo = this.$('[data-regla-tipo]')?.value || 'juntos';
    if (!a || !b || a === b) return;
    reglasRepo.upsert({ tipo, a, b });
    this._reglas = reglasRepo.list();
    this._apply();
  }
}

customElements.define('salon-view', SalonView);
