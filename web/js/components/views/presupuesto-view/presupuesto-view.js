import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './presupuesto-view.css.js';
import { t } from '../../../i18n/index.js';
import { eur } from '../../../core/money.js';
import { calcularPresupuesto } from './presupuesto-calc.js';
import {
  ensureSeeded, fincasRepo, proveedoresRepo, invitadosRepo, configRepo, presupuestoRepo,
} from '../../../core/repos.js';
import '../../ui/toast/toast.js';

/**
 * Vista Presupuesto (Fase 4). Componente único y agregado: cruza finca, proveedores e
 * invitados contra un límite editable y muestra total previsto, margen/exceso, barra
 * apilada y tres bloques. Único estado escribible: el límite (`presupuestoRepo`).
 */
export class PresupuestoView extends AppElement {
  static styles = [styles];

  /** @type {ReturnType<typeof calcularPresupuesto>|null} */
  _data = null;
  /** Valor del input límite (crudo, para no perder el foco al teclear). */
  _limite = 0;
  /** Recuerda si ya se estaba dentro del límite (celebración una sola vez). */
  _wasWithin = false;

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._limite = Number(presupuestoRepo.get().limite) || 0;
    this._recompute();
    this._wasWithin = this._data.dif >= 0;
    this._paint();
  }

  /** Recalcula `_data` leyendo todos los repos con el límite actual. */
  _recompute() {
    this._data = calcularPresupuesto({
      fincas: fincasRepo.list(),
      proveedores: proveedoresRepo.list(),
      invitados: invitadosRepo.list(),
      guestCount: configRepo.get().guestCount || 0,
      limite: this._limite,
    });
  }

  /** Traduce una referencia de texto de la calc: `{k,v}` (i18n) o `{r}` (literal). */
  _tx(field) {
    return field && field.k ? t(field.k, field.v) : (field ? field.r : '');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="page-head pres-head">
          <div class="pres-head-txt">
            <span class="eyebrow">${escapeHtml(t('nav.presupuesto'))}</span>
            <h1>${escapeHtml(t('pres.title'))}</h1>
            <p class="muted">${escapeHtml(t('pres.subtitle'))}</p>
          </div>
          <div class="field pres-limite">
            <label for="pv-limite">${escapeHtml(t('pres.limite'))}</label>
            <input class="input" id="pv-limite" type="number" min="0" step="1000" value="${escapeHtml(String(this._limite))}">
          </div>
        </div>
        <div id="body">${this._bodyTpl}</div>
        <div id="confetti" aria-hidden="true"></div>
        <app-toast id="toast"></app-toast>
      </div>`;
  }

  /** @returns {string} Resumen + insights + bloques + footer (lo repintable). */
  get _bodyTpl() {
    return `${this._resumenTpl}${this._insightsTpl}${this._bloquesTpl}
      <p class="pres-foot muted">${escapeHtml(t('pres.footer', this._data.footerVars))}</p>`;
  }

  /** @returns {string} Tarjeta de resumen: total, margen/exceso, barra y leyenda. */
  get _resumenTpl() {
    const d = this._data;
    const difLabelKey = d.difIsNeg ? 'pres.exceso.label' : 'pres.margen';
    return `
      <section class="pres-resumen">
        <div class="pres-resumen-top">
          <div class="pres-total">
            <div class="pres-k">${escapeHtml(t('pres.total.label'))}</div>
            <div class="pres-total-num" data-count="${d.total}">${escapeHtml(d.totalLabel)}</div>
            <div class="muted pres-total-sub">${escapeHtml(this._tx(d.porInvitado))}</div>
          </div>
          <div class="pres-margen">
            <div class="pres-k">${escapeHtml(t(difLabelKey))}</div>
            <div class="pres-margen-num${d.difIsNeg ? ' is-neg' : ''}" data-count="${d.dif}">${escapeHtml(d.difLabel)}</div>
            <div class="muted pres-margen-sub">${escapeHtml(t('pres.sobreLimite', { limite: d.limiteLabel }))}</div>
          </div>
        </div>
        <div class="pres-bar">
          <span class="pres-bar-seg is-contratado" style="width:0" data-w="${d.barContratado}"></span>
          <span class="pres-bar-seg is-previsto" style="width:0" data-w="${d.barPrevisto}"></span>
          <span class="pres-bar-seg is-exceso" style="width:0" data-w="${d.barExceso}"></span>
        </div>
        <div class="pres-legend">
          <span class="pres-leg"><i class="pres-leg-dot is-contratado"></i>${escapeHtml(t('pres.leg.contratado'))} <b>${escapeHtml(d.contratadoLabel)}</b></span>
          <span class="pres-leg"><i class="pres-leg-dot is-previsto"></i>${escapeHtml(t('pres.leg.porConfirmar'))} <b>${escapeHtml(d.pendienteLabel)}</b></span>
          <span class="pres-leg"><i class="pres-leg-dot is-exceso"></i>${escapeHtml(t('pres.leg.fuera'))} <b>${escapeHtml(d.excesoLabel)}</b></span>
          <span class="pres-leg pres-leg-senales muted">${escapeHtml(t('pres.leg.senales', { senales: d.senalesLabel }))}</span>
        </div>
      </section>`;
  }

  /** @returns {string} Chips de insight accionables (navegan a la vista relevante). */
  get _insightsTpl() {
    const d = this._data;
    const items = [];
    if (d.difIsNeg) items.push({ nav: '', txt: t('pres.insight.exceso', { v: d.excesoLabel }), tone: 'warn' });
    else items.push({ nav: '', txt: t('pres.insight.margen', { v: d.difLabel }), tone: 'good' });
    if (d.nPorConfirmar) items.push({ nav: 'view-proveedores', txt: t('pres.insight.porConfirmar', { n: d.nPorConfirmar }), tone: '' });
    if (d.sinFinca) items.push({ nav: 'view-finca', txt: t('pres.insight.sinFinca'), tone: '' });
    return `<div class="pres-insights">${items.map((i) => (i.nav
      ? `<button type="button" class="pres-insight ${i.tone}" data-nav="${i.nav}">${escapeHtml(i.txt)}</button>`
      : `<span class="pres-insight ${i.tone} is-static">${escapeHtml(i.txt)}</span>`)).join('')}</div>`;
  }

  /** @returns {string} Los tres bloques (finca y banquete, proveedores, pagos y ratios). */
  get _bloquesTpl() {
    return `<section class="pres-bloques">${this._data.bloques.map((b) => this._bloqueTpl(b)).join('')}</section>`;
  }

  /** @param {object} b @returns {string} Una tarjeta de bloque con sus líneas. */
  _bloqueTpl(b) {
    return `
      <article class="pres-bloque">
        <div class="pres-bloque-head">
          <h5>${escapeHtml(this._tx(b.titulo))}</h5>
          <span class="pres-bloque-total">${escapeHtml(b.total)}</span>
        </div>
        <div class="muted pres-bloque-nota">${escapeHtml(this._tx(b.nota))}</div>
        <div class="pres-lineas">
          ${b.lineas.map((l) => `
            <div class="pres-linea">
              <div class="pres-linea-txt">
                <div class="pres-linea-concepto">${escapeHtml(this._tx(l.concepto))}</div>
                <div class="muted pres-linea-detalle">${escapeHtml(this._tx(l.detalle))}</div>
              </div>
              <span class="pres-linea-importe">${escapeHtml(l.importe)}</span>
            </div>`).join('')}
        </div>
      </article>`;
  }

  afterRender() {
    this.on(this.$('#pv-limite'), 'input', (e) => this._onLimite(e));
    this.on(this.$('#body'), 'click', (e) => this._onBodyClick(e));
    this._animate();
  }

  /** @param {Event} e Cambia el límite sin perder el foco del input. */
  _onLimite(e) {
    this._limite = Math.max(0, Number(e.target.value) || 0);
    presupuestoRepo.setLimite(this._limite);
    this._apply();
  }

  /** @param {MouseEvent} e Navega a la vista relevante desde un chip de insight. */
  _onBodyClick(e) {
    const nav = e.target.closest('[data-nav]');
    if (nav) window.location.hash = `#${nav.dataset.nav}`;
  }

  /** Recalcula y repinta solo el cuerpo (no el input), re-animando barra y contadores. */
  _apply() {
    this._recompute();
    const body = this.$('#body');
    if (body) body.innerHTML = this._bodyTpl;
    this._animate();
    this._maybeCelebrate();
  }

  /** Sube los contadores y rellena la barra apilada (respeta prefers-reduced-motion). */
  _animate() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const segs = this.$$('.pres-bar-seg');
    const setBar = () => segs.forEach((s) => { s.style.width = `${s.dataset.w || 0}%`; });
    this.$$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count) || 0;
      const fmt = (v) => (v < 0 ? `-${eur(Math.abs(v))}` : eur(v));
      if (reduce) { el.textContent = fmt(target); return; }
      const dur = 760; const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(Math.round(target * (1 - (1 - p) ** 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (reduce) { setBar(); return; }
    requestAnimationFrame(() => requestAnimationFrame(setBar));
  }

  /** Confeti sobrio la primera vez que se pasa de estar por encima a caber en el límite. */
  _maybeCelebrate() {
    const within = this._data.dif >= 0;
    if (within && !this._wasWithin) this._confetti();
    this._wasWithin = within;
  }

  /** Confeti sobre el resumen (respeta prefers-reduced-motion). */
  _confetti() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const host = this.$('#confetti');
    if (!host) return;
    const colors = ['var(--rsvp-si-dot)', 'var(--color-accent)', 'var(--color-accent-300)', 'var(--lado-novia)'];
    const bits = [];
    for (let i = 0; i < 18; i++) {
      const x = (Math.random() * 2 - 1) * 220;
      const y = -40 - Math.random() * 120;
      const r = (Math.random() * 2 - 1) * 260;
      bits.push(`<span class="pres-confetti-bit" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--r:${r.toFixed(0)}deg;animation-delay:${(Math.random() * 140).toFixed(0)}ms;background:${colors[i % colors.length]}"></span>`);
    }
    host.innerHTML = bits.join('');
    clearTimeout(this._confettiT);
    this._confettiT = setTimeout(() => { host.innerHTML = ''; }, 1500);
  }
}

customElements.define('presupuesto-view', PresupuestoView);
