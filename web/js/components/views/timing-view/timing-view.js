import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './timing-view.css.js';
import { t, getLang } from '../../../i18n/index.js';
import {
  BLOQUES, toMin, toHHMM, durLabel, ordenar, absTimes, encadenar, avisos, resumen, porBloque,
  dobleReserva, porResponsable, diasHasta, icsStamp,
  iniciales, estadoDia, responsablesSinContratar,
} from './timing-calc.js';
import { ensureSeeded, timingRepo, proveedoresRepo, configRepo } from '../../../core/repos.js';
import '../../ui/segmented-tabs/segmented-tabs.js';
import '../../ui/toast/toast.js';

/** Estados del día D de un momento y su icono. */
const ESTADOS = ['pendiente', 'curso', 'hecho'];
const ESTADO_ICON = { pendiente: '○', curso: '◐', hecho: '✓' };

/**
 * Vista Timing (guion del día), nivel premium. Eje de tiempo proporcional con regla horaria,
 * línea de "ahora" en vivo, hora dorada, marcador de cuenta atrás; arrastrar para mover y
 * estirar la duración; vista por responsable con aviso de doble-reserva; export a minuta PDF
 * y a calendario .ics. Persistencia en `timingRepo`; fecha/hora dorada en `configRepo`.
 */
export class TimingView extends AppElement {
  static styles = [styles];

  /** @type {object[]} */
  _momentos = [];
  /** @type {object[]} */
  _proveedores = [];
  _q = '';
  _editId = null;
  _undo = null;
  /** Modo de la escena: 'dia' (eje) | 'responsable' (call sheet). */
  _modo = 'dia';
  /** Fecha de la boda (ISO) y hora dorada (HH:MM), de configRepo. */
  _boda = '';
  _dorada = '';
  /** @type {number|null} Intervalo de la línea "ahora". */
  _nowTimer = null;

  connectedCallback() {
    super.connectedCallback();
    this._nowTimer = setInterval(() => this._tickNow(), 30000);
  }

  disconnectedCallback() {
    if (this._nowTimer) { clearInterval(this._nowTimer); this._nowTimer = null; }
    super.disconnectedCallback();
  }

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._momentos = ordenar(timingRepo.list());
    this._proveedores = proveedoresRepo.list();
    const cfg = configRepo.get();
    this._boda = cfg.bodaFecha || '';
    this._dorada = cfg.horaDorada || '';
    this._paint();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="tl-toolbar">
          <segmented-tabs id="tl-modo"></segmented-tabs>
          <div id="stats" class="tl-statstrip">${this._statsTpl}</div>
          <div class="tl-tools">
            <input class="input tl-search" type="search" id="tl-buscar" placeholder="${escapeHtml(t('timing.buscar.ph'))}" value="${escapeHtml(this._q)}">
            <button class="btn btn-secondary" id="tl-encadenar" type="button">${escapeHtml(t('timing.encadenar'))}</button>
            <button class="btn btn-ghost" id="tl-ics" type="button">${escapeHtml(t('timing.ics'))}</button>
            <button class="btn btn-ghost" id="tl-export" type="button">${escapeHtml(t('timing.export'))}</button>
            <button class="btn btn-primary" id="tl-add" type="button">+&nbsp;&nbsp;${escapeHtml(t('timing.add'))}</button>
          </div>
        </div>
        <div id="main">${this._mainTpl}</div>
        <app-toast id="toast"></app-toast>
      </div>`;
  }

  /** @returns {string} Tira de 4 estadísticas (momentos, inicio, fin, duración). */
  get _statsTpl() {
    const r = resumen(this._momentos);
    const stats = [
      { value: r.n, label: t('timing.stat.momentos') },
      { value: r.inicio || '—', label: t('timing.stat.inicio') },
      { value: r.fin || '—', label: t('timing.stat.fin') },
      { value: r.span ? durLabel(r.span) : '—', label: t('timing.stat.duracion') },
    ];
    return stats.map((s) => `
      <div class="tl-mini">
        <span class="tl-mini-value">${escapeHtml(String(s.value))}</span>
        <span class="tl-mini-label">${escapeHtml(s.label)}</span>
      </div>`).join('');
  }

  /** @returns {string} Rejilla: escena (eje o responsable) + aside. */
  get _mainTpl() {
    return `
      <div class="tl-grid">
        <div id="stage" class="tl-stage">${this._modo === 'dia' ? this._timelineTpl : this._responsableTpl}</div>
        <aside class="tl-aside">
          <div id="live">${this._liveTpl}</div>
          ${this._countdownTpl}
          <div id="resumen">${this._resumenTpl}</div>
          <div id="avisos">${this._avisosTpl}</div>
          <div class="tl-legend-card">${this._legendTpl}</div>
        </aside>
      </div>`;
  }

  // ---------- Línea de tiempo por bloque ----------

  /** @returns {string} Bloques del día con sus momentos (filtrados por el buscador). */
  get _timelineTpl() {
    const full = this._momentos;
    if (!full.length) return `<div class="tl-empty muted">${escapeHtml(t('timing.vacio'))}</div>`;
    const at = absTimes(full);
    const timeById = new Map(full.map((m, i) => [m.id, at[i]]));
    const dayStart = at[0].absStart;
    const dayEnd = Math.max(...at.map((x) => x.absEnd));
    // "Ahora" y hora dorada se sitúan en el momento que las contiene (no hora a hora).
    this._nowMark = this._nowAbs(dayStart, dayEnd);
    this._goldenMark = this._goldenAbs(dayStart, dayEnd);
    this._cAbs = this._clockAbs(dayStart); // reloj mapeado, para deducir el estado
    const q = this._q.trim().toLowerCase();
    const match = (m) => !q || `${m.titulo} ${m.lugar || ''}`.toLowerCase().includes(q);
    return porBloque(full).map((b) => {
      const items = b.items.filter(match);
      if (!items.length) return '';
      return `
        <section class="tl-block bloque-${escapeHtml(b.id)}">
          <div class="tl-block-head">
            <span class="tl-block-icon">${b.icon}</span>
            <h2 class="tl-block-name">${escapeHtml(t(`timing.bloque.${b.id}`))}</h2>
            <span class="tl-block-meta">${escapeHtml(b.inicio)}–${escapeHtml(b.fin)} · ${escapeHtml(durLabel(b.mins))}</span>
          </div>
          <div class="tl-rows">
            ${items.map((m) => this._momentoTpl(m, timeById.get(m.id))).join('')}
          </div>
        </section>`;
    }).join('');
  }

  /** @param {object} m @param {{absStart:number,absEnd:number}} at @returns {string} Tarjeta de un momento. */
  _momentoTpl(m, at) {
    const fin = at ? toHHMM(at.absEnd) : '';
    const prov = this._proveedores.find((p) => p.id === m.prov);
    const ahora = at && this._nowMark != null && this._nowMark >= at.absStart && this._nowMark < at.absEnd;
    const dorada = at && this._goldenMark != null && this._goldenMark >= at.absStart && this._goldenMark < at.absEnd;
    const editing = this._editId === m.id;
    const estado = this._estadoEfectivo(m, at, this._cAbs);
    return `
      <article class="tl-card bloque-${escapeHtml(m.bloque)} estado-${estado}${ahora ? ' is-now' : ''}${editing ? ' is-editing' : ''}" data-mid="${escapeHtml(m.id)}" draggable="${editing ? 'false' : 'true'}">
        <div class="tl-card-time">
          <span class="tl-time-ini">${escapeHtml(m.inicio)}</span>
          <span class="tl-time-fin muted">${escapeHtml(fin)}</span>
          ${ahora ? `<span class="tl-now">${escapeHtml(t('timing.ahora'))}</span>` : ''}
        </div>
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-card-body">
          <div class="tl-card-top">
            <button class="tl-estado" type="button" data-estado="${escapeHtml(m.id)}" title="${escapeHtml(t(`timing.estado.${estado}`))}" aria-label="${escapeHtml(t('timing.estado.marcar'))}">${ESTADO_ICON[estado]}</button>
            <span class="tl-card-titulo">${escapeHtml(m.titulo)}</span>
            ${dorada ? `<span class="tl-dorada-chip">☀ ${escapeHtml(t('timing.dorada'))}</span>` : ''}
            <span class="tl-card-dur">${escapeHtml(durLabel(m.dur))}</span>
            <div class="tl-card-acts">
              <button class="tl-act" type="button" data-edit="${escapeHtml(m.id)}" aria-label="${escapeHtml(t('timing.campo.titulo'))}">✎</button>
              <button class="tl-act" type="button" data-move="up" data-mid="${escapeHtml(m.id)}" aria-label="${escapeHtml(t('timing.mover.subir'))}">▲</button>
              <button class="tl-act" type="button" data-move="down" data-mid="${escapeHtml(m.id)}" aria-label="${escapeHtml(t('timing.mover.bajar'))}">▼</button>
              <button class="tl-act tl-act-del" type="button" data-del="${escapeHtml(m.id)}" aria-label="${escapeHtml(t('timing.eliminar'))}">×</button>
            </div>
          </div>
          <div class="tl-card-meta muted">
            ${m.lugar ? `<span class="tl-meta-lugar">${escapeHtml(m.lugar)}</span>` : ''}
            ${prov ? `<span class="tl-meta-resp"><span class="tl-avatar">${escapeHtml(iniciales(prov.nombre))}</span>${escapeHtml(prov.nombre)}${this._contactoTpl(prov)}</span>` : ''}
          </div>
          ${m.nota ? `<div class="tl-card-note">${escapeHtml(m.nota)}</div>` : ''}
          ${editing ? this._editTpl(m) : ''}
        </div>
      </article>`;
  }

  /** @param {object} prov @returns {string} Enlace de contacto (teléfono o email) del responsable. */
  _contactoTpl(prov) {
    const val = String(prov.telefono || '').trim();
    if (!val) return '';
    const esMail = val.includes('@');
    const href = esMail ? `mailto:${val}` : `tel:${val.replace(/\s+/g, '')}`;
    return `<a class="tl-contacto" href="${escapeHtml(href)}" title="${escapeHtml(val)}" aria-label="${escapeHtml(t('timing.contacto'))}" data-noclick>${esMail ? '✉' : '☎'}</a>`;
  }

  /** @param {object} m @returns {string} Panel de edición en línea. */
  _editTpl(m) {
    const bloqueOpts = BLOQUES.map((b) => `<option value="${b.id}"${m.bloque === b.id ? ' selected' : ''}>${b.icon}&nbsp;&nbsp;${escapeHtml(t(`timing.bloque.${b.id}`))}</option>`).join('');
    const provOpts = `<option value="">${escapeHtml(t('timing.resp.ninguno'))}</option>`
      + this._proveedores.map((p) => `<option value="${escapeHtml(p.id)}"${m.prov === p.id ? ' selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('');
    return `
      <div class="tl-edit">
        <label class="tl-field tl-f-titulo"><span>${escapeHtml(t('timing.campo.titulo'))}</span>
          <input class="input" data-f="titulo" data-mid="${escapeHtml(m.id)}" value="${escapeHtml(m.titulo)}"></label>
        <label class="tl-field"><span>${escapeHtml(t('timing.campo.inicio'))}</span>
          <input class="input" type="time" data-f="inicio" data-mid="${escapeHtml(m.id)}" value="${escapeHtml(m.inicio)}"></label>
        <label class="tl-field"><span>${escapeHtml(t('timing.campo.dur'))}</span>
          <input class="input" type="number" min="0" step="5" data-f="dur" data-mid="${escapeHtml(m.id)}" value="${escapeHtml(String(m.dur))}"></label>
        <label class="tl-field"><span>${escapeHtml(t('timing.campo.bloque'))}</span>
          <select class="input" data-f="bloque" data-mid="${escapeHtml(m.id)}">${bloqueOpts}</select></label>
        <label class="tl-field"><span>${escapeHtml(t('timing.campo.lugar'))}</span>
          <input class="input" data-f="lugar" data-mid="${escapeHtml(m.id)}" value="${escapeHtml(m.lugar || '')}"></label>
        <label class="tl-field tl-f-resp"><span>${escapeHtml(t('timing.campo.resp'))}</span>
          <select class="input" data-f="prov" data-mid="${escapeHtml(m.id)}">${provOpts}</select></label>
        <label class="tl-field tl-f-nota"><span>${escapeHtml(t('timing.campo.nota'))}</span>
          <input class="input" data-f="nota" data-mid="${escapeHtml(m.id)}" value="${escapeHtml(m.nota || '')}"></label>
        <button class="btn btn-secondary tl-done" type="button" data-done="${escapeHtml(m.id)}" aria-label="OK">✓</button>
      </div>`;
  }

  // ---------- Vista por responsable (call sheet) ----------

  /** @returns {string} El día visto desde cada responsable (proveedor). */
  get _responsableTpl() {
    if (!this._momentos.length) return `<div class="tl-empty muted">${escapeHtml(t('timing.vacio'))}</div>`;
    const at = absTimes(this._momentos);
    const finById = new Map(this._momentos.map((m, i) => [m.id, toHHMM(at[i].absEnd)]));
    const q = this._q.trim().toLowerCase();
    const grupos = porResponsable(this._momentos);
    return `<div class="tl-resp">${grupos.map((g) => {
      const items = g.items.filter((m) => !q || `${m.titulo} ${m.lugar || ''}`.toLowerCase().includes(q));
      if (!items.length) return '';
      const nombre = g.prov ? (this._proveedores.find((p) => p.id === g.prov)?.nombre || t('timing.resp.sin')) : t('timing.resp.sin');
      const mins = items.reduce((a, m) => a + (Number(m.dur) || 0), 0);
      return `
        <section class="tl-resp-group${g.prov ? '' : ' is-none'}">
          <div class="tl-resp-head">
            <h2 class="tl-resp-name">${escapeHtml(nombre)}</h2>
            <span class="muted tl-resp-meta">${escapeHtml(t('timing.resp.momentos', { n: items.length, dur: durLabel(mins) }))}</span>
          </div>
          <ul class="tl-resp-list">
            ${items.map((m) => `
              <li class="tl-resp-item bloque-${escapeHtml(m.bloque)}">
                <span class="tl-resp-hora">${escapeHtml(m.inicio)}–${escapeHtml(finById.get(m.id) || '')}</span>
                <span class="tl-resp-tit">${escapeHtml(m.titulo)}</span>
                ${m.lugar ? `<span class="muted tl-resp-lugar">${escapeHtml(m.lugar)}</span>` : ''}
              </li>`).join('')}
          </ul>
        </section>`;
    }).join('')}</div>`;
  }

  // ---------- Aside ----------

  /** @returns {number} Minuto del reloj actual (0..1439). */
  _clockMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

  /** @param {number} dayStart @returns {number} Reloj actual en minutos absolutos del guion. */
  _clockAbs(dayStart) { let c = this._clockMin(); if (c < dayStart - 720) c += 1440; return c; }

  /**
   * Estado efectivo de un momento: el manual si el usuario lo fijó; si no, se deduce del
   * reloj (los anteriores al momento en curso salen completados; los futuros, pendientes).
   * @param {object} m @param {{absStart:number,absEnd:number}} at @param {number} cAbs
   * @returns {'pendiente'|'curso'|'hecho'}
   */
  _estadoEfectivo(m, at, cAbs) {
    if (ESTADOS.includes(m.estado)) return m.estado;
    if (!at) return 'pendiente';
    if (cAbs >= at.absEnd) return 'hecho';
    if (cAbs >= at.absStart) return 'curso';
    return 'pendiente';
  }

  /** @returns {string} Tarjeta "En vivo": momento en curso, siguiente y avance del día. */
  get _liveTpl() {
    if (!this._momentos.length) return '';
    const st = estadoDia(this._momentos, this._clockMin());
    const list = ordenar(this._momentos);
    const sig = st.sigIdx >= 0 ? list[st.sigIdx] : null;
    const actual = st.actualIdx >= 0 ? list[st.actualIdx] : null;
    let ahoraTxt = '';
    let sigTxt = '';
    if (st.state === 'antes') {
      ahoraTxt = `<span class="tl-live-soon">${escapeHtml(t('timing.live.empieza', { dur: durLabel(st.mins) }))}</span>`;
      sigTxt = sig ? `<span class="tl-live-next">${escapeHtml(sig.titulo)}</span>` : '';
    } else if (st.state === 'despues') {
      ahoraTxt = `<span class="tl-live-soon">${escapeHtml(t('timing.live.fin'))}</span>`;
    } else {
      ahoraTxt = `<span class="tl-live-lbl muted">${escapeHtml(t('timing.live.ahora'))}</span><span class="tl-live-now">${escapeHtml(actual ? actual.titulo : t('timing.live.nada'))}</span>`;
      if (sig) sigTxt = `<span class="tl-live-lbl muted">${escapeHtml(t('timing.live.siguiente'))}</span><span class="tl-live-next">${escapeHtml(sig.titulo)} <b>${escapeHtml(t('timing.live.en', { dur: durLabel(st.mins) }))}</b></span>`;
    }
    return `
      <div class="tl-panel tl-live">
        <div class="tl-live-head"><span class="tl-live-pulse"></span>${escapeHtml(t('timing.live.title'))}</div>
        <div class="tl-live-body">${ahoraTxt}${sigTxt}</div>
        <div class="tl-live-bar"><span class="tl-live-fill" style="width:${st.progreso}%"></span></div>
        <div class="tl-live-pct muted">${escapeHtml(t('timing.live.progreso', { n: st.progreso }))}</div>
      </div>`;
  }

  /** @returns {string} Cuenta atrás + fecha de la boda y hora dorada editables. */
  get _countdownTpl() {
    const dias = this._boda ? diasHasta(this._boda, this._hoyISO()) : null;
    let big = '—';
    let sub = t('timing.countdown.sinFecha');
    if (dias != null) {
      if (dias > 0) { big = String(dias); sub = `${dias === 1 ? t('timing.countdown.dia') : t('timing.countdown.dias')} ${t('timing.countdown.faltan')}`; }
      else if (dias === 0) { big = '🎉'; sub = t('timing.countdown.hoy'); }
      else { big = String(-dias); sub = t('timing.countdown.pasado', { n: `${-dias} ${(-dias) === 1 ? t('timing.countdown.dia') : t('timing.countdown.dias')}` }); }
    }
    return `
      <div class="tl-panel tl-count">
        <h3 class="tl-panel-title">${escapeHtml(t('timing.countdown.title'))}</h3>
        <div class="tl-count-big">${escapeHtml(big)}</div>
        <div class="tl-count-sub muted">${escapeHtml(sub)}</div>
        <div class="tl-count-fields">
          <label class="tl-field"><span>${escapeHtml(t('timing.boda'))}</span>
            <input class="input" type="date" data-cfg="boda" value="${escapeHtml(this._boda)}"></label>
          <label class="tl-field"><span>${escapeHtml(t('timing.dorada'))}</span>
            <input class="input" type="time" data-cfg="dorada" value="${escapeHtml(this._dorada)}"></label>
        </div>
      </div>`;
  }

  /** @returns {string} Resumen con subtotales por bloque. */
  get _resumenTpl() {
    const r = resumen(this._momentos);
    if (!r.n) return '';
    const bloques = porBloque(this._momentos);
    return `
      <div class="tl-panel">
        <h3 class="tl-panel-title">${escapeHtml(t('timing.resumen.title'))}</h3>
        <div class="tl-resumen-rango">${escapeHtml(t('timing.resumen.rango', { inicio: r.inicio, fin: r.fin }))}</div>
        <div class="tl-resumen-grid">
          <div class="tl-resumen-cell"><span class="tl-resumen-v">${escapeHtml(durLabel(r.span))}</span><span class="tl-resumen-l muted">${escapeHtml(t('timing.resumen.duracion'))}</span></div>
          <div class="tl-resumen-cell"><span class="tl-resumen-v">${r.n}</span><span class="tl-resumen-l muted">${escapeHtml(t('timing.resumen.momentos'))}</span></div>
        </div>
        <ul class="tl-resumen-bloques">
          ${bloques.map((b) => `
            <li class="tl-resumen-bloque bloque-${escapeHtml(b.id)}">
              <i class="tl-resumen-dot"></i>
              <span class="tl-resumen-bnombre">${escapeHtml(t(`timing.bloque.${b.id}`))}</span>
              <span class="muted tl-resumen-bmeta">${escapeHtml(b.inicio)}–${escapeHtml(b.fin)} · ${escapeHtml(durLabel(b.mins))}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  /** @returns {string} Avisos: huecos, solapes y doble-reserva. */
  get _avisosTpl() {
    const av = avisos(this._momentos);
    const dr = dobleReserva(this._momentos);
    const sc = responsablesSinContratar(this._momentos, this._proveedores);
    const nombreProv = (id) => this._proveedores.find((p) => p.id === id)?.nombre || id;
    const total = av.length + dr.length + sc.length;
    if (!total) {
      if (!this._momentos.length) return '';
      return `<div class="tl-panel tl-avisos is-ok"><h3 class="tl-panel-title">${escapeHtml(t('timing.avisos.title'))}</h3><p class="muted tl-ok">${escapeHtml(t('timing.avisos.ok'))}</p></div>`;
    }
    const avTxt = (a) => (a.tipo === 'hueco'
      ? t('timing.avisos.hueco', { mins: durLabel(a.mins), a: a.a, b: a.b })
      : t('timing.avisos.solape', { mins: durLabel(a.mins), a: a.a, b: a.b }));
    return `
      <div class="tl-panel tl-avisos">
        <h3 class="tl-panel-title">${escapeHtml(t('timing.avisos.title'))} <span class="tl-avisos-n">${total}</span></h3>
        <ul class="tl-avisos-list">
          ${dr.map((d) => `<li class="tl-aviso tl-aviso-doble">${escapeHtml(t('timing.avisos.doble', { prov: nombreProv(d.prov), a: d.a, b: d.b }))}</li>`).join('')}
          ${sc.map((s) => `<li class="tl-aviso tl-aviso-contrato">${escapeHtml(t('timing.avisos.sinContratar', { prov: s.nombre, titulo: s.titulo }))}</li>`).join('')}
          ${av.map((a) => `<li class="tl-aviso tl-aviso-${a.tipo}">${escapeHtml(avTxt(a))}</li>`).join('')}
        </ul>
      </div>`;
  }

  /** @returns {string} Leyenda de bloques. */
  get _legendTpl() {
    return `
      <div class="tl-panel">
        <ul class="tl-legend">
          ${BLOQUES.map((b) => `<li class="tl-legend-item bloque-${b.id}"><i class="tl-legend-dot"></i>${b.icon} ${escapeHtml(t(`timing.bloque.${b.id}`))}</li>`).join('')}
        </ul>
      </div>`;
  }

  // ---------- Wiring ----------

  afterRender() {
    const modo = this.$('#tl-modo');
    if (modo) {
      modo.options = [
        { value: 'dia', label: t('timing.modo.dia') },
        { value: 'responsable', label: t('timing.modo.responsable') },
      ];
      modo.value = this._modo;
      this.on(modo, 'change', (e) => { this._modo = e.detail.value; this._refreshMain(); });
    }
    this.on(this.$('#tl-add'), 'click', () => this._addMomento());
    this.on(this.$('#tl-encadenar'), 'click', () => this._encadenar());
    this.on(this.$('#tl-ics'), 'click', () => this._exportarIcs());
    this.on(this.$('#tl-export'), 'click', () => this._exportar());
    this.on(this.$('#tl-buscar'), 'input', (e) => { this._q = e.target.value; this._refreshMain(); });
    this.on(this.$('#main'), 'click', (e) => this._onMainClick(e));
    this.on(this.$('#main'), 'change', (e) => this._onMainChange(e));
    this.on(this.$('#main'), 'dragstart', (e) => this._onDragStart(e));
    this.on(this.$('#main'), 'dragover', (e) => this._onDragOver(e));
    this.on(this.$('#main'), 'dragleave', (e) => this._onDragLeave(e));
    this.on(this.$('#main'), 'drop', (e) => this._onDrop(e));
    this.on(this.$('#main'), 'dragend', () => this._onDragEnd());
    this._tickNow();
  }

  _apply() {
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
    this._refreshMain();
  }

  _refreshMain() {
    const main = this.$('#main');
    if (main) main.innerHTML = this._mainTpl;
    this._tickNow();
  }

  /** @param {MouseEvent} e */
  _onMainClick(e) {
    const est = e.target.closest('[data-estado]');
    if (est) { this._cicloEstado(est.dataset.estado); return; }
    const edit = e.target.closest('[data-edit]');
    if (edit) { this._editId = this._editId === edit.dataset.edit ? null : edit.dataset.edit; this._refreshMain(); return; }
    const done = e.target.closest('[data-done]');
    if (done) { this._editId = null; this._refreshMain(); return; }
    const move = e.target.closest('[data-move]');
    if (move) { this._moveMomento(move.dataset.mid, move.dataset.move); return; }
    const del = e.target.closest('[data-del]');
    if (del) { this._removeMomento(del.dataset.del); return; }
  }

  /** @param {Event} e */
  _onMainChange(e) {
    const cfg = e.target.closest('[data-cfg]');
    if (cfg) {
      if (cfg.dataset.cfg === 'boda') { this._boda = cfg.value; configRepo.set({ bodaFecha: cfg.value }); }
      else { this._dorada = cfg.value; configRepo.set({ horaDorada: cfg.value }); }
      this._refreshMain();
      return;
    }
    const f = e.target.closest('[data-f]');
    if (!f) return;
    const id = f.dataset.mid;
    const campo = f.dataset.f;
    let value = f.value;
    if (campo === 'dur') value = Math.max(0, Number(f.value) || 0);
    if (campo === 'titulo') value = f.value.trim() || t('timing.momento.default');
    this._setMomento(id, { [campo]: value });
  }

  // ---------- "Ahora" en vivo (resalta el momento en curso) ----------

  /** Marca el momento en curso y refresca la tarjeta "En vivo", sin repintar todo. */
  _tickNow() {
    if (this.offsetParent === null || !this._momentos.length) return;
    const live = this.$('#live');
    if (live) live.innerHTML = this._liveTpl;
    if (this._modo !== 'dia') return;
    const at = absTimes(this._momentos);
    const dayStart = at[0].absStart;
    const now = this._nowAbs(dayStart, Math.max(...at.map((x) => x.absEnd)));
    const cAbs = this._clockAbs(dayStart);
    this._cAbs = cAbs;
    this.$$('.tl-card').forEach((card) => {
      const i = this._momentos.findIndex((m) => m.id === card.dataset.mid);
      if (i < 0) return;
      const on = now != null && now >= at[i].absStart && now < at[i].absEnd;
      card.classList.toggle('is-now', on);
      const est = this._estadoEfectivo(this._momentos[i], at[i], cAbs);
      card.classList.remove('estado-pendiente', 'estado-curso', 'estado-hecho');
      card.classList.add(`estado-${est}`);
      const btn = card.querySelector('.tl-estado');
      if (btn) { btn.textContent = ESTADO_ICON[est]; btn.title = t(`timing.estado.${est}`); }
    });
  }

  /** @param {string} id Cicla el estado del día desde el que se muestra (manual override). */
  _cicloEstado(id) {
    const i = this._momentos.findIndex((x) => x.id === id);
    if (i < 0) return;
    const at = absTimes(this._momentos);
    const cAbs = this._cAbs ?? this._clockAbs(at[0].absStart);
    const cur = this._estadoEfectivo(this._momentos[i], at[i], cAbs);
    const next = ESTADOS[(ESTADOS.indexOf(cur) + 1) % ESTADOS.length];
    this._setMomento(id, { estado: next });
  }

  // ---------- Reordenar arrastrando (HTML5 DnD) ----------

  /** @param {DragEvent} e */
  _onDragStart(e) {
    const card = e.target.closest('.tl-card[data-mid]');
    if (!card || card.classList.contains('is-editing')) return;
    this._dragId = card.dataset.mid;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this._dragId);
    card.classList.add('is-dragging');
  }

  /** @param {DragEvent} e */
  _onDragOver(e) {
    if (!this._dragId) return;
    const card = e.target.closest('.tl-card[data-mid]');
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.$$('.tl-card').forEach((c) => c.classList.remove('is-drop-before', 'is-drop-after'));
    if (card && card.dataset.mid !== this._dragId) {
      const r = card.getBoundingClientRect();
      card.classList.add(e.clientY > r.top + r.height / 2 ? 'is-drop-after' : 'is-drop-before');
    }
  }

  /** @param {DragEvent} e */
  _onDragLeave(e) {
    const card = e.target.closest('.tl-card');
    if (card && !card.contains(e.relatedTarget)) card.classList.remove('is-drop-before', 'is-drop-after');
  }

  /** @param {DragEvent} e */
  _onDrop(e) {
    const draggedId = this._dragId;
    if (!draggedId) return;
    e.preventDefault();
    const order = ordenar(this._momentos).map((m) => m.id).filter((id) => id !== draggedId);
    let nuevoBloque = null;
    const card = e.target.closest('.tl-card[data-mid]');
    const block = e.target.closest('.tl-block');
    if (card && card.dataset.mid !== draggedId) {
      const tid = card.dataset.mid;
      const r = card.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      const ti = order.indexOf(tid);
      order.splice(after ? ti + 1 : ti, 0, draggedId);
      nuevoBloque = this._momentos.find((m) => m.id === tid)?.bloque;
    } else if (block) {
      nuevoBloque = [...block.classList].find((c) => c.startsWith('bloque-'))?.slice(7) || null;
      const ultimo = ordenar(this._momentos).filter((m) => m.id !== draggedId && m.bloque === nuevoBloque).pop();
      if (ultimo) order.splice(order.indexOf(ultimo.id) + 1, 0, draggedId);
      else order.push(draggedId);
    } else { this._onDragEnd(); return; }
    this._onDragEnd();
    this._applyOrder(order, draggedId, nuevoBloque);
  }

  /** Limpia las clases de arrastre. */
  _onDragEnd() {
    this._dragId = null;
    this.$$('.is-dragging').forEach((c) => c.classList.remove('is-dragging'));
    this.$$('.is-drop-before, .is-drop-after').forEach((c) => c.classList.remove('is-drop-before', 'is-drop-after'));
  }

  /**
   * Aplica un nuevo orden global reasignando `orden` y, si procede, el bloque del arrastrado.
   * @param {string[]} orderIds @param {string} draggedId @param {string|null} nuevoBloque
   */
  _applyOrder(orderIds, draggedId, nuevoBloque) {
    const byId = new Map(this._momentos.map((m) => [m.id, m]));
    orderIds.forEach((id, k) => {
      const m = byId.get(id);
      if (!m) return;
      const patch = {};
      if (m.orden !== k + 1) patch.orden = k + 1;
      if (id === draggedId && nuevoBloque && m.bloque !== nuevoBloque) patch.bloque = nuevoBloque;
      if (Object.keys(patch).length) byId.set(id, timingRepo.upsert({ ...m, ...patch }));
    });
    this._momentos = ordenar([...byId.values()]);
    this._apply();
  }

  /** @param {number} dayStart @param {number} dayEnd @returns {number|null} Minuto absoluto de "ahora" si cae en el evento. */
  _nowAbs(dayStart, dayEnd) {
    const d = new Date();
    let c = d.getHours() * 60 + d.getMinutes();
    while (c < dayStart) c += 1440;
    return c <= dayEnd ? c : null;
  }

  /** @param {number} dayStart @param {number} dayEnd @returns {number|null} Minuto absoluto de la hora dorada si cae en el evento. */
  _goldenAbs(dayStart, dayEnd) {
    if (!this._dorada) return null;
    let c = toMin(this._dorada);
    while (c < dayStart) c += 1440;
    return c <= dayEnd ? c : null;
  }

  // ---------- Operaciones (persisten) ----------

  /** @param {string} id @param {object} patch */
  _setMomento(id, patch) {
    const m = this._momentos.find((x) => x.id === id);
    if (!m) return;
    const updated = timingRepo.upsert({ ...m, ...patch });
    const idx = this._momentos.findIndex((x) => x.id === id);
    this._momentos[idx] = updated;
    this._momentos = ordenar(this._momentos);
    this._apply();
  }

  /** @param {string} id @param {'up'|'down'} dir */
  _moveMomento(id, dir) {
    const list = ordenar(this._momentos);
    const i = list.findIndex((x) => x.id === id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((m, k) => { if (m.orden !== k + 1) { list[k] = timingRepo.upsert({ ...m, orden: k + 1 }); } });
    this._momentos = ordenar(list);
    this._apply();
  }

  /** Añade un momento nuevo al final (encadenado) y lo abre para editar. */
  _addMomento() {
    const list = ordenar(this._momentos);
    const last = list[list.length - 1];
    const at = last ? absTimes(list)[list.length - 1] : null;
    const created = timingRepo.upsert({
      orden: (last ? last.orden : 0) + 1,
      bloque: last ? last.bloque : 'fiesta',
      titulo: t('timing.momento.default'),
      inicio: at ? toHHMM(at.absEnd) : '12:00',
      dur: 30,
      lugar: '',
      prov: '',
      nota: '',
    });
    this._momentos = ordenar([...this._momentos, created]);
    this._editId = created.id;
    this._modo = 'dia';
    this._apply();
    this._toast('timing.toast.creado', { titulo: created.titulo });
  }

  /** @param {string} id */
  _removeMomento(id) {
    const m = this._momentos.find((x) => x.id === id);
    this._snapshot();
    timingRepo.remove(id);
    this._momentos = this._momentos.filter((x) => x.id !== id);
    if (this._editId === id) this._editId = null;
    this._apply();
    if (m) this._toastUndo('timing.toast.eliminado', { titulo: m.titulo });
  }

  /** Encadena las horas (con deshacer). */
  _encadenar() {
    if (this._momentos.length < 2) return;
    this._snapshot();
    encadenar(ordenar(this._momentos)).forEach((m) => {
      const cur = this._momentos.find((x) => x.id === m.id);
      if (cur && cur.inicio !== m.inicio) timingRepo.upsert({ ...cur, inicio: m.inicio });
    });
    this._momentos = ordenar(timingRepo.list());
    this._apply();
    this._toastUndo('timing.toast.encadenado');
  }

  // ---------- Deshacer ----------

  _snapshot() { this._undo = this._momentos.map((m) => ({ ...m })); }

  _restore() {
    if (!this._undo) return;
    const ids = new Set(this._undo.map((m) => m.id));
    this._momentos.filter((m) => !ids.has(m.id)).forEach((m) => timingRepo.remove(m.id));
    this._undo.forEach((m) => timingRepo.upsert(m));
    this._momentos = ordenar(timingRepo.list());
    this._undo = null;
    this._apply();
  }

  _toastUndo(key, vars) {
    this._toast(key, vars, { actionLabel: t('timing.toast.deshacer'), onAction: () => this._restore() });
  }

  _toast(key, vars, opts) {
    const el = this.$('#toast');
    if (el && typeof el.show === 'function') el.show(t(key, vars), opts);
  }

  // ---------- Utilidades ----------

  /** @returns {string} Fecha de hoy en ISO 'YYYY-MM-DD' (hora local). */
  _hoyISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ---------- Export ----------

  /** Abre una minuta imprimible (PDF) premium: portada, bloques numerados y convocatorias. */
  _exportar() {
    const BH = { preparativos: '#6b7f5b', ceremonia: '#9a7b4e', celebracion: '#c96f4f', fiesta: '#a4512f' };
    const loc = getLang() === 'en' ? 'en-GB' : 'es-ES';
    const fechaLarga = (iso) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }); };
    const r = resumen(this._momentos);
    const bloques = porBloque(this._momentos);
    const at = absTimes(this._momentos);
    const finById = new Map(this._momentos.map((m, i) => [m.id, toHHMM(at[i].absEnd)]));
    const nombreProv = (id) => this._proveedores.find((p) => p.id === id)?.nombre || '';

    // Portada.
    const chips = [
      this._boda ? fechaLarga(this._boda) : '',
      r.n ? `${r.inicio} – ${r.fin}` : '',
      r.span ? durLabel(r.span) : '',
      r.n ? `${r.n} ${t('timing.stat.momentos').toLowerCase()}` : '',
      this._dorada ? `☀ ${t('timing.dorada')} ${this._dorada}` : '',
    ].filter(Boolean).map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('');
    const hero = `<div class="hero">
      <div class="kicker">${escapeHtml(t('timing.export.title'))}</div>
      <h1>${escapeHtml(t('app.brand'))}</h1>
      <div class="sub">${escapeHtml(t('timing.export.sub'))}</div>
      <div class="meta">${chips}</div>
    </div>`;

    // Secciones por bloque (numeradas).
    const secciones = bloques.map((b, idx) => {
      const hex = BH[b.id] || '#c96f4f';
      const filas = b.items.map((m) => {
        const prov = nombreProv(m.prov);
        return `<tr>
          <td class="hora">${escapeHtml(m.inicio)}<span class="fin">–${escapeHtml(finById.get(m.id) || '')}</span></td>
          <td><b>${escapeHtml(m.titulo)}</b>${m.nota ? `<div class="nota">${escapeHtml(m.nota)}</div>` : ''}</td>
          <td>${m.lugar ? escapeHtml(m.lugar) : '<span class="muted">—</span>'}</td>
          <td>${prov ? `<span class="dot" style="background:${hex}"></span>${escapeHtml(prov)}` : '<span class="muted">—</span>'}</td>
        </tr>`;
      }).join('');
      return `<section class="bloque" style="--bh:${hex}">
        <div class="bhead">
          <span class="num">${String(idx + 1).padStart(2, '0')}</span>
          <h2>${b.icon}&nbsp; ${escapeHtml(t(`timing.bloque.${b.id}`))}</h2>
          <span class="rango">${escapeHtml(b.inicio)}–${escapeHtml(b.fin)} · ${escapeHtml(durLabel(b.mins))}</span>
        </div>
        <table>
          <thead><tr>
            <th>${escapeHtml(t('timing.campo.inicio'))}</th><th>${escapeHtml(t('timing.campo.titulo'))}</th>
            <th>${escapeHtml(t('timing.campo.lugar'))}</th><th>${escapeHtml(t('timing.campo.resp'))}</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </section>`;
    }).join('');

    // Convocatorias por responsable (call sheet).
    const grupos = porResponsable(this._momentos).filter((g) => g.items.length);
    const callsheet = grupos.length ? `<section class="callsheet">
      <div class="bhead" style="--bh:#2e3a2f"><span class="num">☎</span><h2>${escapeHtml(t('timing.export.callsheet'))}</h2></div>
      <div class="cards">${grupos.map((g) => {
    const nombre = g.prov ? (nombreProv(g.prov) || t('timing.resp.sin')) : t('timing.resp.sin');
    const mins = g.items.reduce((a, m) => a + (Number(m.dur) || 0), 0);
    return `<div class="card">
          <div class="card-h"><span class="av">${escapeHtml(iniciales(nombre))}</span><b>${escapeHtml(nombre)}</b><span class="card-meta">${g.items.length} · ${escapeHtml(durLabel(mins))}</span></div>
          <ul>${g.items.map((m) => `<li><span class="li-h">${escapeHtml(m.inicio)}–${escapeHtml(finById.get(m.id) || '')}</span> ${escapeHtml(m.titulo)}</li>`).join('')}</ul>
        </div>`;
  }).join('')}</div>
    </section>` : '';

    const footer = `<footer><span>${escapeHtml(t('app.brand'))} · ${escapeHtml(t('timing.export.title'))}</span><span>${escapeHtml(t('timing.export.generado', { fecha: new Date().toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }) }))}</span></footer>`;

    const cssDoc = `
      @page { size: A4; margin: 14mm 13mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, sans-serif; color: #2e3a2f; margin: 0; font-size: 11.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .hero { background: linear-gradient(135deg, #2e3a2f 0%, #47583d 55%, #6b7f5b 100%); color: #f8f6ee; padding: 24px 26px; border-radius: 16px; position: relative; overflow: hidden; }
      .hero::after { content: ''; position: absolute; right: -40px; top: -40px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(201,111,79,.55), transparent 68%); }
      .hero .kicker { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: #edc3ad; position: relative; }
      .hero h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 32px; margin: 6px 0 2px; color: #fff; position: relative; }
      .hero .sub { color: rgba(248,246,238,.82); font-size: 12.5px; position: relative; }
      .hero .meta { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 7px 8px; position: relative; }
      .hero .chip { font-size: 10.5px; background: rgba(248,246,238,.14); border: 1px solid rgba(248,246,238,.28); border-radius: 999px; padding: 3px 11px; }
      .wrap { padding: 20px 2px 0; }
      .bloque, .callsheet { margin: 0 0 16px; break-inside: avoid; }
      .bhead { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--bh, #c96f4f); padding-bottom: 6px; margin-bottom: 8px; }
      .num { flex: 0 0 auto; width: 24px; height: 24px; border-radius: 6px; background: var(--bh, #c96f4f); color: #fff; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
      .bhead h2 { font-family: Georgia, serif; font-size: 16px; margin: 0; }
      .bhead .rango { margin-left: auto; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: #8a8065; }
      table { width: 100%; border-collapse: collapse; }
      thead th { text-align: left; font-size: 9px; letter-spacing: .09em; text-transform: uppercase; color: #f3efe4; background: #2e3a2f; padding: 6px 8px; }
      thead th:first-child { border-radius: 6px 0 0 6px; }
      thead th:last-child { border-radius: 0 6px 6px 0; }
      tbody td { padding: 6px 8px; border-bottom: 1px solid #efe9dc; vertical-align: top; }
      tbody tr:nth-child(even) td { background: #faf7f0; }
      td.hora { white-space: nowrap; color: #c96f4f; font-weight: 700; font-variant-numeric: tabular-nums; }
      td.hora .fin { color: #bb8b70; font-weight: 600; }
      .nota { color: #6f6a55; font-size: 10px; margin-top: 2px; }
      .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
      .muted { color: #a89d84; }
      .callsheet .cards { display: flex; flex-wrap: wrap; gap: 10px; }
      .card { flex: 1 1 240px; border: 1px solid #e4ddcc; border-radius: 10px; padding: 10px 12px; break-inside: avoid; background: #fffdf7; }
      .card-h { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .av { width: 22px; height: 22px; border-radius: 50%; background: #c96f4f; color: #fff; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
      .card-h b { font-size: 12.5px; }
      .card-meta { margin-left: auto; font-size: 9.5px; letter-spacing: .04em; text-transform: uppercase; color: #8a8065; white-space: nowrap; }
      .card ul { list-style: none; margin: 0; padding: 0; }
      .card li { font-size: 11px; padding: 2px 0; }
      .li-h { color: #c96f4f; font-weight: 600; font-variant-numeric: tabular-nums; }
      footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e4ddcc; font-size: 9.5px; color: #8a8065; display: flex; justify-content: space-between; }`;
    const doc = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><title>${escapeHtml(t('timing.export.title'))}</title><style>${cssDoc}</style></head><body>${hero}<div class="wrap">${secciones}${callsheet}${footer}</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { this._toast('timing.export'); return; }
    w.document.write(doc);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch { /* noop */ } }, 300);
  }

  /** Descarga el guion como calendario .ics (necesita la fecha de la boda). */
  _exportarIcs() {
    if (!this._boda) { this._toast('timing.toast.icsSinFecha'); return; }
    const at = absTimes(this._momentos);
    const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const nombreProv = (id) => this._proveedores.find((p) => p.id === id)?.nombre || '';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gestor-boda//timing//ES', 'CALSCALE:GREGORIAN'];
    this._momentos.forEach((m, i) => {
      const resp = nombreProv(m.prov);
      lines.push(
        'BEGIN:VEVENT',
        `UID:${m.id}@gestor-boda`,
        `DTSTART:${icsStamp(this._boda, at[i].absStart)}`,
        `DTEND:${icsStamp(this._boda, at[i].absEnd)}`,
        `SUMMARY:${esc(m.titulo)}`,
        m.lugar ? `LOCATION:${esc(m.lugar)}` : '',
        `DESCRIPTION:${esc([resp, m.nota].filter(Boolean).join(' · '))}`,
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.filter(Boolean).join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guion-boda.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this._toast('timing.toast.ics');
  }
}

customElements.define('timing-view', TimingView);
