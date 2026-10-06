import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './home-view.css.js';
import { t, getLang } from '../../../i18n/index.js';
import {
  ensureSeeded, invitadosRepo, fincasRepo, mesasRepo, proveedoresRepo,
  timingRepo, presupuestoRepo, configRepo, listaCategorias,
} from '../../../core/repos.js';
import { chipsCategorias } from '../proveedores-view/proveedores-calc.js';
import { calcularPresupuesto } from '../presupuesto-view/presupuesto-calc.js';
import { ordenar as ordenarMomentos, diasHasta, toMin } from '../timing-view/timing-calc.js';
import '../../ui/modal-dialog/modal-dialog.js';

/** Envuelve el `<path>`/`<circle>` de un icono en un SVG de trazo (hereda el color). */
const svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Iconos por sección (mismos trazos que el rail de navegación). */
const ICON = {
  invitados: svg('<circle cx="9" cy="8" r="3.1"/><path d="M3.2 20c0-3.2 2.6-5.8 5.8-5.8s5.8 2.6 5.8 5.8"/><path d="M16.2 4.1a3.1 3.1 0 0 1 0 6M18 14.4c2.1.5 3.8 2.4 3.8 4.9"/>'),
  finca: svg('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v9.5h13V10"/><path d="M9.8 19.5V14h4.4v5.5"/>'),
  salon: svg('<circle cx="7.2" cy="7.5" r="2.4"/><circle cx="16.8" cy="7.5" r="2.4"/><circle cx="12" cy="16.2" r="2.6"/>'),
  proveedores: svg('<rect x="3.2" y="7.3" width="17.6" height="12.5" rx="2"/><path d="M8.3 7.3V5.6a2 2 0 0 1 2-2h3.4a2 2 0 0 1 2 2v1.7"/><path d="M3.2 12.2h17.6"/>'),
  presupuesto: svg('<path d="M16.5 8.2a4.6 4.6 0 1 0 0 7.6"/><path d="M4.3 11h8.4M4.3 13.6h7.2"/>'),
  timing: svg('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.3V12l3.1 2"/>'),
  arrow: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  cal: svg('<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M8 3v4M16 3v4"/>'),
};

/** Suma de cabezas (invitado + acompañantes) de un grupo. */
const pax = (g) => 1 + (Number(g.plus) || 0);

/**
 * Vista Inicio: portada inmersiva con cuenta atrás editable y una rejilla de
 * tarjetas de acceso a cada sección, cada una con un dato en vivo.
 */
export class HomeView extends AppElement {
  static styles = [styles];

  connectedCallback() {
    ensureSeeded();
    super.connectedCallback();
  }

  /** Repinta con datos frescos (lo llama el router al abrir la vista). */
  refresh() { this._paint(); }

  render() {
    this.shadowRoot.innerHTML = `
      <section class="home">
        <header id="hero" class="home-hero">${this._heroTpl}</header>
        <div class="home-grid">${this._cardsTpl}</div>
        <modal-dialog id="edit" width="440">${this._editTpl}</modal-dialog>
      </section>`;
  }

  afterRender() {
    const modal = this.$('#edit');
    this.$$('[data-edit]').forEach((b) => this.on(b, 'click', () => modal.open()));
    const save = this.$('#home-save');
    if (save) this.on(save, 'click', () => this._guardar());
    const cancel = this.$('#home-cancel');
    if (cancel) this.on(cancel, 'click', () => modal.close());
  }

  /** Guarda nombres y fecha de la boda y repinta. */
  _guardar() {
    const novios = this.$('#home-novios')?.value.trim() ?? '';
    const weddingDate = this.$('#home-fecha')?.value ?? '';
    configRepo.set({ novios, weddingDate });
    this.$('#edit')?.close();
    this.refresh();
  }

  /* ---------------------------- Portada ---------------------------- */

  get _heroTpl() {
    const cfg = configRepo.get();
    const novios = (cfg.novios || '').trim();
    const title = (novios || t('home.hero.title'));
    // La "&" (o " y ") se vuelve caligráfica.
    const titleHtml = escapeHtml(title).replace(/&amp;/g, '<span class="home-amp">&amp;</span>');
    const d = this._datos;
    return `
      <div class="home-hero-grain" aria-hidden="true"></div>
      <div class="home-hero-rings" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.7"><circle cx="9.3" cy="12" r="6.1"/><circle cx="14.7" cy="12" r="6.1"/></svg></div>
      <div class="home-hero-main">
        <p class="home-kicker">${escapeHtml(t('home.kicker'))}</p>
        <h1 class="home-title">${titleHtml}</h1>
        <div class="home-hero-rule"></div>
        <p class="home-sub">${escapeHtml(t('home.hero.lugar', { finca: d.finca.elegida || t('home.hero.sinFinca') }))}</p>
        <div class="home-hero-actions">
          ${cfg.weddingDate
    ? `<button type="button" class="home-btn" data-edit>${ICON.cal}${escapeHtml(t('home.hero.editar'))}</button>`
    : `<button type="button" class="home-btn is-primary" data-edit>${ICON.cal}${escapeHtml(t('home.hero.fijar'))}</button>`}
        </div>
      </div>
      <aside class="home-hero-aside">${this._countTpl(cfg.weddingDate)}</aside>
      <div class="home-hero-ribbon">${this._ribbonTpl(d)}</div>`;
  }

  /** Cinta inferior de metadatos en vivo (los días ya los muestra el medallón). */
  _ribbonTpl(d) {
    const items = [
      t('home.rib.invitados', { n: d.inv.pax }),
      t('home.rib.confirmados', { n: d.inv.pct }),
      t('home.rib.proveedores', { cub: d.prov.cub, total: d.prov.total }),
      d.finca.elegida ? escapeHtml(d.finca.elegida) : t('home.rib.fincas', { n: d.finca.candidatas }),
    ];
    return items.map((x) => `<span class="home-rib-item">${x}</span>`).join('<span class="home-rib-dot" aria-hidden="true">·</span>');
  }

  /** @param {string} iso Fecha de boda 'YYYY-MM-DD' (o vacío). Medallón de cuenta atrás. */
  _countTpl(iso) {
    if (!iso) return '';
    const hoy = new Date().toISOString().slice(0, 10);
    const dias = diasHasta(iso, hoy);
    if (dias === null) return '';
    const fecha = this._fechaLarga(iso);
    if (dias === 0) {
      return `<div class="home-count is-hoy"><span class="home-count-hoy">${escapeHtml(t('home.count.hoy'))}</span>
        <span class="home-count-date">${escapeHtml(fecha)}</span></div>`;
    }
    const n = Math.abs(dias);
    const lbl = dias > 0 ? t('home.count.faltan') : t('home.count.pasada');
    return `
      <div class="home-count">
        <span class="home-count-num">${n}</span>
        <span class="home-count-lbl">${escapeHtml(lbl)}</span>
        <span class="home-count-date">${escapeHtml(fecha)}</span>
      </div>`;
  }

  /** Fecha larga localizada (p. ej. "sábado, 6 de junio de 2026"). */
  _fechaLarga(iso) {
    const loc = getLang() === 'es' ? 'es-ES' : 'en-GB';
    const dt = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return iso;
    const s = dt.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1); // solo la inicial en mayúscula
  }

  /* ---------------------------- Tarjetas ---------------------------- */

  get _cardsTpl() {
    const d = this._datos;
    // Color por sección (en columnas): terracota · salvia · oro.
    const ACCENT = '--c:var(--color-accent);--c7:var(--color-accent-700)';
    const SALVIA = '--c:var(--color-secondary);--c7:var(--color-secondary-700)';
    const GOLD = '--c:var(--color-gold);--c7:var(--color-gold-700)';
    const muted = 'color-mix(in srgb, var(--color-text) 22%, transparent)';
    const cards = [
      { id: 'view-invitados', icon: ICON.invitados, color: ACCENT, title: t('nav.invitados'), desc: t('home.card.invitados'),
        num: `${d.inv.pct}%`, unit: t('home.kpi.confirmados'),
        viz: this._vizDonut([
          { v: d.inv.conf, color: 'var(--color-secondary)' },
          { v: d.inv.pend, color: 'var(--color-accent)' },
          { v: d.inv.no, color: muted },
        ]),
        foot: t('home.foot.inv', { pax: d.inv.pax, conf: d.inv.conf, pend: d.inv.pend }) },
      { id: 'view-finca', icon: ICON.finca, color: SALVIA, title: t('nav.finca'), desc: t('home.card.finca'),
        num: this._fmtNum(d.finca.rating, 1), unit: t('home.kpi.valoracion'),
        viz: this._vizStars(d.finca.rating),
        foot: d.finca.elegida
          ? `${escapeHtml(d.finca.elegida)} · ${t('home.kpi.fincaElegida')}`
          : t('home.foot.finca', { n: d.finca.candidatas }) },
      { id: 'view-salon', icon: ICON.salon, color: GOLD, title: t('nav.salon'), desc: t('home.card.salon'),
        num: `${d.salon.sentados}/${d.salon.paxConf}`, unit: t('home.kpi.sentados'),
        viz: this._vizBar([
          { pct: d.salon.paxConf ? (d.salon.sentados / d.salon.paxConf) * 100 : 0, color: 'var(--color-gold)' },
        ]),
        foot: t('home.kpi.mesas', { n: d.salon.mesas }) },
      { id: 'view-proveedores', icon: ICON.proveedores, color: ACCENT, title: t('nav.proveedores'), desc: t('home.card.proveedores'),
        num: `${d.prov.cub}/${d.prov.total}`, unit: t('home.kpi.cubiertas'),
        viz: this._vizDonut([
          { v: d.prov.cub, color: 'var(--color-secondary)' },
          { v: d.prov.marcha, color: 'var(--color-accent)' },
          { v: d.prov.vacia, color: muted },
        ]),
        foot: t('home.foot.prov', { marcha: d.prov.marcha, vacia: d.prov.vacia, cont: d.prov.contratados }) },
      { id: 'view-presupuesto', icon: ICON.presupuesto, color: SALVIA, title: t('nav.presupuesto'), desc: t('home.card.presupuesto'),
        num: d.pres.totalLabel, unit: t('home.kpi.de', { limite: d.pres.limiteLabel }),
        viz: this._vizBar([
          { pct: d.pres.barContratado, color: 'var(--color-secondary-700)' },
          { pct: d.pres.barPrevisto, color: 'var(--color-secondary)' },
          { pct: d.pres.barExceso, color: 'var(--color-accent)' },
        ]),
        foot: d.pres.nota },
      { id: 'view-timing', icon: ICON.timing, color: GOLD, title: t('nav.timing'), desc: t('home.card.timing'),
        num: d.timing.n, unit: t('home.kpi.momentos'),
        viz: this._vizTrack(d.timing.puntos),
        foot: d.timing.primero },
    ];
    return cards.map((c, i) => `
      <a class="home-card" href="#${c.id}" style="${c.color};animation-delay:${0.06 * (i + 1)}s" aria-label="${escapeHtml(c.title)}">
        <span class="home-card-wm" aria-hidden="true">${c.icon}</span>
        <div class="home-card-top">
          <span class="home-card-ic">${c.icon}</span>
          <span class="home-card-go">${ICON.arrow}</span>
        </div>
        <div class="home-card-body">
          <h3 class="home-card-title">${escapeHtml(c.title)}</h3>
          <p class="home-card-desc">${escapeHtml(c.desc)}</p>
        </div>
        <div class="home-card-metric">
          <div class="home-metric-num"><span class="n">${escapeHtml(String(c.num))}</span><span class="u">${c.unit}</span></div>
          <div class="home-metric-viz">${c.viz}</div>
        </div>
        <div class="home-card-foot">${c.foot}</div>
      </a>`).join('');
  }

  /** Número localizado con decimales fijos (p. ej. valoración 4,9). */
  _fmtNum(n, dec) {
    return (n || 0).toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  /* ---------------------------- Mini-visualizaciones ---------------------------- */

  /** Donut de anillo (sin texto central; el dato va en el número grande). @param {{v:number,color:string}[]} segs */
  _vizDonut(segs) {
    const total = segs.reduce((a, s) => a + s.v, 0) || 1;
    const R = 15.5; const C = 2 * Math.PI * R;
    let acc = 0;
    const arcs = segs.filter((s) => s.v > 0).map((s) => {
      const frac = s.v / total; const len = frac * C; const rot = -90 + acc * 360; acc += frac;
      return `<circle cx="20" cy="20" r="${R}" fill="none" stroke="${s.color}" stroke-width="5.5" stroke-linecap="round"
        stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" transform="rotate(${rot.toFixed(2)} 20 20)"></circle>`;
    }).join('');
    return `
      <div class="home-mini-donut">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="${R}" fill="none" stroke="color-mix(in srgb, var(--color-text) 7%, transparent)" stroke-width="5.5"></circle>
          ${arcs}
        </svg>
      </div>`;
  }

  /** Barra segmentada horizontal. @param {{pct:number,color:string}[]} segs */
  _vizBar(segs) {
    const spans = segs.filter((s) => s.pct > 0).map((s) =>
      `<span style="width:${Math.min(100, s.pct).toFixed(1)}%;background:${s.color}"></span>`).join('');
    return `<div class="home-mini-bar">${spans || '<span style="width:0"></span>'}</div>`;
  }

  /** Línea de tiempo con un punto por momento. @param {number[]} puntos 0..1 */
  _vizTrack(puntos) {
    const dots = puntos.map((p, i) =>
      `<i class="${i === 0 ? 'is-first' : ''}" style="left:${(p * 100).toFixed(1)}%"></i>`).join('');
    return `<div class="home-mini-track"><span class="home-track-line"></span>${dots}</div>`;
  }

  /** Cinco estrellas con relleno según la valoración (0–5). */
  _vizStars(rating) {
    const star = '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 21.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z"/>';
    const full = Math.round(rating || 0);
    const cells = [1, 2, 3, 4, 5].map((n) =>
      `<span class="home-star is-${n <= full ? 'full' : 'empty'}"><svg viewBox="0 0 24 24" aria-hidden="true">${star}</svg></span>`).join('');
    return `<div class="home-mini-stars">${cells}</div>`;
  }

  /* ---------------------------- Editor ---------------------------- */

  get _editTpl() {
    const cfg = configRepo.get();
    return `
      <form class="home-edit" onsubmit="return false">
        <div class="field">
          <label for="home-novios">${escapeHtml(t('home.edit.novios'))}</label>
          <input class="input" id="home-novios" type="text" maxlength="60"
            placeholder="${escapeHtml(t('home.edit.novios.ph'))}" value="${escapeHtml(cfg.novios || '')}">
        </div>
        <div class="field">
          <label for="home-fecha">${escapeHtml(t('home.edit.fecha'))}</label>
          <input class="input" id="home-fecha" type="date" value="${escapeHtml(cfg.weddingDate || '')}">
        </div>
        <div class="home-edit-acts">
          <button type="button" class="home-btn" id="home-cancel">${escapeHtml(t('common.cancel'))}</button>
          <button type="button" class="home-btn is-primary" id="home-save">${escapeHtml(t('common.save'))}</button>
        </div>
      </form>`;
  }

  /* ---------------------------- Datos en vivo ---------------------------- */

  /** @returns {object} Agregados de todas las secciones para la portada y tarjetas. */
  get _datos() {
    const invitados = invitadosRepo.list();
    const fincas = fincasRepo.list();
    const mesas = mesasRepo.list();
    const provs = proveedoresRepo.list();
    const cats = listaCategorias();
    const moms = timingRepo.list();
    const cfg = configRepo.get();
    const guestCount = cfg.guestCount || 0;

    // Invitados
    const total = invitados.length;
    const conf = invitados.filter((g) => g.rsvp === 'confirmado');
    const pend = invitados.filter((g) => g.rsvp === 'pendiente').length;
    const no = invitados.filter((g) => g.rsvp === 'no').length;
    const paxTotal = invitados.reduce((a, g) => a + pax(g), 0);
    const pct = total ? Math.round((conf.length / total) * 100) : 0;

    // Finca
    const elegida = fincas.find((f) => f.estado === 'elegida') || null;
    const activas = fincas.filter((f) => f.estado !== 'descartada' && f.estado !== 'elegida');
    const candidatas = activas.length;
    const rating = elegida ? (elegida.valoracion || 0)
      : activas.reduce((m, f) => Math.max(m, f.valoracion || 0), 0);

    // Salón
    const paxConf = conf.reduce((a, g) => a + pax(g), 0);
    const sentados = conf.filter((g) => g.mesa).reduce((a, g) => a + pax(g), 0);

    // Proveedores
    const chips = chipsCategorias(provs, cats);
    const cub = chips.filter((c) => c.estado === 'cubierta').length;
    const marcha = chips.filter((c) => c.estado === 'enMarcha').length;
    const vacia = chips.filter((c) => c.estado === 'vacia').length;
    const contratados = provs.filter((p) => p.estado === 'contratado').length;

    // Presupuesto
    const presu = presupuestoRepo.get();
    const p = calcularPresupuesto({ fincas, proveedores: provs, invitados, guestCount, limite: presu.limite || 0 });

    // Timing: posiciones 0..1 de cada momento entre el primero y el último
    const ordenados = ordenarMomentos(moms);
    const mins = ordenados.map((m) => toMin(m.inicio));
    const min0 = Math.min(...mins); const span = Math.max(1, Math.max(...mins) - min0);
    const puntos = mins.map((m) => (m - min0) / span);
    const primero = ordenados.length
      ? t('home.kpi.empieza', { hora: ordenados[0].inicio, titulo: ordenados[0].titulo })
      : '';

    return {
      guestCount,
      inv: { total, pax: paxTotal, pct, conf: conf.length, pend, no },
      finca: { elegida: elegida ? elegida.nombre : '', candidatas, rating },
      salon: { mesas: mesas.length, sentados, paxConf },
      prov: { cub, marcha, vacia, total: cats.length, contratados },
      pres: {
        totalLabel: p.totalLabel, limiteLabel: p.limiteLabel, over: p.difIsNeg,
        nota: p.difIsNeg ? t('home.kpi.excede', { n: p.excesoLabel }) : t('home.kpi.resta', { n: p.difLabel }),
        barContratado: p.barContratado, barPrevisto: p.barPrevisto, barExceso: p.barExceso,
      },
      timing: { n: moms.length, primero, puntos: ordenados.length ? puntos : [] },
    };
  }
}

customElements.define('home-view', HomeView);
