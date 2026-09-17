import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './invitados-view.css.js';
import { t } from '../../../i18n/index.js';
import { ENUMS } from '../../../core/enums.js';
import {
  parseAcomp, filtrar, pax, circulosDe, menusDe, agrupar, calcularStats,
  siguienteInvitacion, accionInvitacion,
} from './invitados-calc.js';
import {
  ensureSeeded, invitadosRepo, mesasRepo, fincasRepo, configRepo,
} from '../../../core/repos.js';
import '../../ui/modal-dialog/modal-dialog.js';
import '../../ui/empty-state/empty-state.js';
import '../../ui/toast/toast.js';

/** Círculos por defecto ofrecidos al dar de alta (se completan con los ya usados). */
const GRUPOS_ALTA = ['Familia directa', 'Familia extensa', 'Amigos de siempre', 'Amigos del trabajo'];

/** Orden de los estados de invitación y de confirmación usados en los selects de alta. */
const ORDEN_INVITACION = ['sin enviar', 'enviada', 'recordatorio', 'respondida'];
const ORDEN_RSVP_ALTA = ['pendiente', 'confirmado', 'no'];

/** Borrador vacío del formulario de alta. */
function draftVacio() {
  return {
    nombre: '', lado: 'novio', grupo: GRUPOS_ALTA[0], acomp: '', menu: 'Estándar', invitacion: 'sin enviar', rsvp: 'pendiente', nota: '',
  };
}

/**
 * Tokens de color según el lado (solo variables, nunca literales).
 * @param {string} lado
 * @returns {{color:string, bg:string, ink:string, label:string}}
 */
function ladoTokens(lado) {
  const key = lado === 'novia' ? 'novia' : 'novio';
  return {
    color: `var(--lado-${key})`, bg: `var(--lado-${key}-bg)`, ink: `var(--lado-${key}-ink)`, label: t(ENUMS.invLado[key]),
  };
}

/**
 * Icono representativo del lado (novia con velo / novio con pajarita) como SVG
 * inline; hereda el color con currentColor. Decorativo (aria-hidden).
 * @param {string} lado
 * @returns {string}
 */
function ladoIcon(lado) {
  if (lado === 'novia') {
    return '<svg class="inv-pill-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="6.5" r="2.7"/><path d="M9.3 6.9C7 8.4 6 10.8 6 13.8S7.4 19.2 9.5 20.2"/>'
      + '<path d="M14.7 6.9C17 8.4 18 10.8 18 13.8s-1.4 5.4-3.5 6.4"/><path d="M9.5 20.2h5"/></svg>';
  }
  return '<svg class="inv-pill-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<circle cx="12" cy="6.5" r="2.7"/><path d="M6 20.2c0-3.4 2.7-5.7 6-5.7s6 2.3 6 5.7"/>'
    + '<path d="M12 15.6 9 14v3.2l3-1.6 3 1.6V14z" fill="currentColor" stroke="none"/></svg>';
}

/**
 * Iniciales para el avatar (primeras letras de las dos primeras palabras).
 * @param {string} nombre
 * @returns {string}
 */
function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase() || '·';
}

/**
 * Icono de línea pequeño para las filas de metadatos de la tarjeta.
 * @param {string} paths Contenido del SVG (paths).
 * @returns {string}
 */
function metaIcon(paths) {
  return `<svg class="inv-row-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
/** @returns {string} Icono de sobre (invitación). */
function icSobre() { return metaIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>'); }
/** @returns {string} Icono de mesa (asignación). */
function icMesa() { return metaIcon('<rect x="3" y="8" width="18" height="3" rx="1"/><path d="M6 11v7M18 11v7"/>'); }
/** @returns {string} Icono de cubiertos (menú especial). */
function icCubiertos() { return metaIcon('<path d="M7 3v7M5 3v3.5a2 2 0 0 0 4 0V3M7 10v11"/><path d="M17.5 3c-1.4 0-2.4 2-2.4 5s1 4 2.4 4M17.5 12v9"/>'); }

/**
 * Vista Invitados. Componente único: stats, filtros, tarjetas agrupadas por
 * círculo o listado en tabla, y alta, todo como getters de plantilla de este
 * mismo componente (sin sub-componentes de vista propios). Persistencia solo
 * vía invitadosRepo/mesasRepo/fincasRepo.
 */
export class InvitadosView extends AppElement {
  static styles = [styles];

  /** @type {object[]} */
  _invitados = [];
  /** @type {object[]} */
  _mesas = [];
  /** @type {object|null} Finca elegida, para el aforo. */
  _elegida = null;
  _q = '';
  _lado = 'Todos';
  _grupo = 'Todos';
  _rsvp = 'Todos';
  _inv = 'Todas';
  _menu = 'Todos';
  /** @type {'tarjetas'|'lista'} */
  _view = 'tarjetas';
  _addOpen = false;
  _draft = draftVacio();

  /** Público: lo llama el router al abrir la vista. */
  refresh() {
    ensureSeeded();
    this._invitados = invitadosRepo.list();
    this._mesas = mesasRepo.list();
    this._elegida = fincasRepo.list().find((f) => f.estado === 'elegida') || null;
    this._paint();
  }

  render() {
    const visibles = this._visible;
    this.shadowRoot.innerHTML = `
      <div class="view-content">
        <div class="page-head">
          <span class="eyebrow">${escapeHtml(t('nav.invitados'))}</span>
          <h1>${escapeHtml(t('inv.title'))}</h1>
        </div>
        <div id="hero">${this._heroTpl}</div>
        <div id="stats">${this._statsTpl}</div>
        ${this._filtrosTpl}
        <div id="list">${this._listTpl}</div>
        <div id="empty">${visibles.length ? '' : this._emptyTpl}</div>
        <p class="inv-foot muted">${escapeHtml(this._footTxt)}</p>
        <div id="overlay">${this._addOpen ? this._altaTpl : ''}</div>
        <app-toast id="toast"></app-toast>
      </div>`;
  }

  /** @returns {string} Texto del pie: personas en lista y base de cálculo de coste. */
  get _footTxt() {
    const n = this._invitados.reduce((a, g) => a + pax(g), 0);
    const inv = configRepo.get().guestCount || 140;
    return t('inv.foot', { n, inv });
  }

  /** @returns {string} Las siete tarjetas de estadística. */
  get _statsTpl() {
    const stats = calcularStats(this._invitados, this._elegida);
    return `
      <section class="inv-stats-row">
        ${stats.map((s) => {
    const num = typeof s.value === 'number' ? ` data-count="${s.value}"` : '';
    return `
          <div class="inv-stat">
            <span class="inv-stat-label">${escapeHtml(t(s.label))}</span>
            <span class="inv-stat-value"${num}>${escapeHtml(String(s.value))}</span>
            <span class="inv-stat-note muted">${escapeHtml(s.noteRaw ? s.note : t(s.note, s.noteVars))}</span>
          </div>`;
  }).join('')}
      </section>`;
  }

  /**
   * Hero de progreso: anillo de confirmación (confirmados/pendientes/no) y
   * medidor de aforo (personas en lista vs finca elegida). Se dibuja al pintar.
   * @returns {string}
   */
  get _heroTpl() {
    const inv = this._invitados;
    const total = inv.length;
    const conf = inv.filter((g) => g.rsvp === 'confirmado').length;
    const pend = inv.filter((g) => g.rsvp === 'pendiente').length;
    const no = inv.filter((g) => g.rsvp === 'no').length;
    const pax = inv.reduce((a, g) => a + 1 + (Number(g.plus) || 0), 0);
    const aforo = this._elegida ? this._elegida.capSent : 0;
    const pctConf = total ? Math.round((conf / total) * 100) : 0;
    const R = 54;
    const C = 2 * Math.PI * R;
    const base = total || 1;
    const seg = (n) => (n / base) * C;
    const arc = (len, startFrac, cls) => `<circle class="inv-donut-arc ${cls}" cx="64" cy="64" r="${R}" fill="none" stroke-width="14" stroke-linecap="round"
      style="stroke-dasharray:${len.toFixed(1)} ${C.toFixed(1)};stroke-dashoffset:${len.toFixed(1)};transform:rotate(${(-90 + startFrac * 360).toFixed(2)}deg)"></circle>`;
    const capPct = aforo ? Math.min(100, Math.round((pax / aforo) * 100)) : 0;
    const meter = aforo
      ? `<div class="inv-meter-bar"><span class="inv-meter-fill" style="width:0" data-w="${capPct}"></span></div>
         <div class="inv-meter-cap muted"><b>${pax}</b> / ${aforo} · ${escapeHtml(this._elegida.nombre)}</div>`
      : `<div class="inv-meter-bar inv-meter-empty"></div>
         <div class="inv-meter-cap muted"><b>${pax}</b> ${escapeHtml(t('inv.stat.lado.note'))} · ${escapeHtml(t('inv.stat.aforo.note.sin'))}</div>`;
    return `
      <section class="inv-hero">
        <div class="inv-hero-ring">
          <svg viewBox="0 0 128 128" class="inv-donut" aria-hidden="true">
            <circle cx="64" cy="64" r="${R}" fill="none" stroke-width="14" class="inv-donut-track"></circle>
            ${conf ? arc(seg(conf), 0, 'is-si') : ''}
            ${pend ? arc(seg(pend), conf / base, 'is-pend') : ''}
            ${no ? arc(seg(no), (conf + pend) / base, 'is-no') : ''}
          </svg>
          <div class="inv-donut-center">
            <span class="inv-donut-pct" data-count="${pctConf}" data-suffix="%">0%</span>
            <span class="inv-donut-lbl muted">${escapeHtml(t('inv.stat.confirmados'))}</span>
          </div>
        </div>
        <div class="inv-hero-body">
          <div class="inv-hero-legend">
            <span class="inv-leg"><i class="inv-leg-dot is-si"></i>${escapeHtml(t('inv.filter.confirmados'))} <b>${conf}</b></span>
            <span class="inv-leg"><i class="inv-leg-dot is-pend"></i>${escapeHtml(t('inv.filter.pendientes'))} <b>${pend}</b></span>
            <span class="inv-leg"><i class="inv-leg-dot is-no"></i>${escapeHtml(t('inv.filter.noVienen'))} <b>${no}</b></span>
          </div>
          <div class="inv-meter">
            <div class="inv-meter-lbl">${escapeHtml(t('inv.stat.aforo'))}</div>
            ${meter}
          </div>
        </div>
      </section>`;
  }

  /** @returns {string} Barra de filtros (estática: se cablea una sola vez). */
  get _filtrosTpl() {
    const circulos = circulosDe(this._invitados);
    const menus = menusDe(this._invitados);
    return `
      <section class="inv-filtros">
        <div class="field inv-search">
          <label>${escapeHtml(t('inv.search'))}</label>
          <input class="input" type="search" id="f-q" placeholder="${escapeHtml(t('inv.search.ph'))}" value="${escapeHtml(this._q)}">
        </div>
        <div class="field">
          <label>${escapeHtml(t('inv.filter.lado'))}</label>
          <select class="input" id="f-lado">
            <option value="Todos"${this._lado === 'Todos' ? ' selected' : ''}>${escapeHtml(t('inv.filter.ambos'))}</option>
            <option value="novio"${this._lado === 'novio' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invLado.novio))}</option>
            <option value="novia"${this._lado === 'novia' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invLado.novia))}</option>
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('inv.filter.circulo'))}</label>
          <select class="input" id="f-grupo">
            <option value="Todos"${this._grupo === 'Todos' ? ' selected' : ''}>${escapeHtml(t('inv.filter.todos'))}</option>
            ${circulos.map((c) => `<option value="${escapeHtml(c)}"${c === this._grupo ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('inv.filter.confirmacion'))}</label>
          <select class="input" id="f-rsvp">
            <option value="Todos"${this._rsvp === 'Todos' ? ' selected' : ''}>${escapeHtml(t('inv.filter.todas'))}</option>
            <option value="confirmado"${this._rsvp === 'confirmado' ? ' selected' : ''}>${escapeHtml(t('inv.filter.confirmados'))}</option>
            <option value="pendiente"${this._rsvp === 'pendiente' ? ' selected' : ''}>${escapeHtml(t('inv.filter.pendientes'))}</option>
            <option value="no"${this._rsvp === 'no' ? ' selected' : ''}>${escapeHtml(t('inv.filter.noVienen'))}</option>
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('inv.filter.invitacion'))}</label>
          <select class="input" id="f-inv">
            <option value="Todas"${this._inv === 'Todas' ? ' selected' : ''}>${escapeHtml(t('inv.filter.todas'))}</option>
            <option value="sin enviar"${this._inv === 'sin enviar' ? ' selected' : ''}>${escapeHtml(t('inv.filter.inv.sinEnviar'))}</option>
            <option value="enviada"${this._inv === 'enviada' ? ' selected' : ''}>${escapeHtml(t('inv.filter.inv.enviada'))}</option>
            <option value="recordatorio"${this._inv === 'recordatorio' ? ' selected' : ''}>${escapeHtml(t('inv.filter.inv.recordatorio'))}</option>
            <option value="respondida"${this._inv === 'respondida' ? ' selected' : ''}>${escapeHtml(t('inv.filter.inv.respondida'))}</option>
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(t('inv.filter.menu'))}</label>
          <select class="input" id="f-menu">
            <option value="Todos"${this._menu === 'Todos' ? ' selected' : ''}>${escapeHtml(t('inv.filter.todos'))}</option>
            <option value="especiales"${this._menu === 'especiales' ? ' selected' : ''}>${escapeHtml(t('inv.filter.menu.especiales'))}</option>
            ${menus.map((m) => `<option value="${escapeHtml(m)}"${m === this._menu ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}
          </select>
        </div>
        <div class="seg inv-view-toggle">
          <button type="button" class="seg-opt" id="v-tarjetas" aria-selected="${this._view === 'tarjetas'}">${escapeHtml(t('inv.view.cards'))}</button>
          <button type="button" class="seg-opt" id="v-lista" aria-selected="${this._view === 'lista'}">${escapeHtml(t('inv.view.list'))}</button>
        </div>
        <button type="button" class="btn btn-primary inv-add" id="add-open">+&nbsp;&nbsp;${escapeHtml(t('inv.add'))}</button>
      </section>`;
  }

  /** @returns {object[]} Invitados filtrados según el estado actual. */
  get _visible() {
    return filtrar(this._invitados, {
      q: this._q, lado: this._lado, grupo: this._grupo, rsvp: this._rsvp, inv: this._inv, menu: this._menu,
    });
  }

  /** @returns {string} Tarjetas agrupadas o tabla, según el modo de vista (vacío si no hay resultados). */
  get _listTpl() {
    const lista = this._visible;
    if (!lista.length) return '';
    return this._view === 'lista' ? this._tablaTpl(lista) : this._gruposTpl(lista);
  }

  /**
   * @param {object[]} lista Invitados ya filtrados.
   * @returns {string} Grupos por círculo, cada uno con encabezado y su rejilla de tarjetas.
   */
  _gruposTpl(lista) {
    const grupos = agrupar(lista);
    let idx = 0;
    return grupos.map((gr) => {
      const pctConf = gr.inv ? Math.round((gr.conf / gr.inv) * 100) : 0;
      return `
      <div class="inv-grupo-head">
        <h3>${escapeHtml(gr.titulo)}</h3>
        <span class="inv-grupo-sub">${escapeHtml(t('inv.grupo.subtotal', { inv: gr.inv, pax: gr.pax, conf: gr.conf }))}</span>
        <span class="inv-grupo-bar" title="${pctConf}%"><i style="width:${pctConf}%"></i></span>
      </div>
      <section class="inv-grid">${gr.items.map((g) => this._cardTpl(g, idx++)).join('')}</section>`;
    }).join('');
  }

  /**
   * @param {object} g
   * @returns {string} Una tarjeta de invitado.
   */
  _cardTpl(g, idx = 0) {
    const lado = ladoTokens(g.lado);
    const plus = Number(g.plus) || 0;
    const meta = g.nota ? g.nota : (plus ? t('inv.meta.acomp') : t('inv.meta.individual'));
    const menuEspecial = g.menu && g.menu !== 'Estándar';
    const invEstado = g.invitacion || 'sin enviar';
    const invLabel = t(ENUMS.invInvitacion[invEstado]);
    const invAccion = t(accionInvitacion(invEstado));
    const acompanantes = g.acompanantes || [];
    const acompLinea = acompanantes.length ? acompanantes.join(' · ') : (plus ? t('inv.acomp.sinNombre', { n: plus }) : '');
    const mesaId = g.mesa || '';
    return `
      <article class="inv-card" data-id="${escapeHtml(g.id)}" data-rsvp="${escapeHtml(g.rsvp)}" style="--card-lado:${lado.color};--i:${idx}">
        <div class="inv-card-top">
          <span class="inv-avatar" style="background:${lado.bg};color:${lado.ink}" aria-hidden="true">
            ${escapeHtml(iniciales(g.nombre))}
            <span class="inv-avatar-status"></span>
          </span>
          <div class="inv-card-id">
            <div class="inv-card-nombre">${escapeHtml(g.nombre)}</div>
            <div class="inv-card-meta muted">${escapeHtml(meta)}</div>
          </div>
          <button class="btn btn-ghost inv-card-remove" data-remove="${escapeHtml(g.id)}" type="button">${escapeHtml(t('inv.card.quitar'))}</button>
        </div>
        <div class="inv-card-pills">
          <span class="inv-pill" style="background:${lado.bg};color:${lado.ink}">${ladoIcon(g.lado)}${escapeHtml(lado.label)}</span>
          <span class="inv-pill inv-pill-outline" style="border-color:${lado.color};color:${lado.ink}">${escapeHtml(g.grupo)}</span>
          ${menuEspecial ? `<span class="tag tag-accent">${icCubiertos()}${escapeHtml(g.menu)}</span>` : ''}
        </div>
        <div class="inv-card-inv">
          <span class="inv-inv-state">${icSobre()}${escapeHtml(invLabel)}</span>
          <button class="btn btn-ghost" data-nextinv="${escapeHtml(g.id)}" type="button">${escapeHtml(invAccion)}</button>
        </div>
        ${acompLinea ? `<div class="inv-card-acomp"><span class="inv-card-acomp-lbl">${escapeHtml(t('inv.card.con'))}</span> ${escapeHtml(acompLinea)}</div>` : ''}
        <div class="inv-card-mesa">
          <span class="inv-card-mesa-lbl">${icMesa()}${escapeHtml(t('inv.card.mesa'))}</span>
          <select class="input" data-mesa="${escapeHtml(g.id)}">
            <option value=""${mesaId === '' ? ' selected' : ''}>${escapeHtml(t('inv.card.sinMesa'))}</option>
            ${this._mesas.map((m) => `<option value="${escapeHtml(m.id)}"${m.id === mesaId ? ' selected' : ''}>${escapeHtml(m.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="seg inv-card-rsvp">
          <button type="button" class="seg-opt" data-conf="${escapeHtml(g.id)}" data-set="confirmado" aria-selected="${g.rsvp === 'confirmado'}">${escapeHtml(t('inv.card.si'))}</button>
          <button type="button" class="seg-opt" data-conf="${escapeHtml(g.id)}" data-set="pendiente" aria-selected="${g.rsvp === 'pendiente'}">${escapeHtml(t('inv.card.pendiente'))}</button>
          <button type="button" class="seg-opt" data-conf="${escapeHtml(g.id)}" data-set="no" aria-selected="${g.rsvp === 'no'}">${escapeHtml(t('inv.card.no'))}</button>
        </div>
      </article>`;
  }

  /**
   * @param {object[]} lista Invitados ya filtrados.
   * @returns {string} Tabla de invitados (modo listado).
   */
  _tablaTpl(lista) {
    return `
      <div class="inv-table-wrap">
        <table class="inv-table">
          <thead>
            <tr>
              <th>${escapeHtml(t('inv.table.invitado'))}</th>
              <th>${escapeHtml(t('inv.table.lado'))}</th>
              <th>${escapeHtml(t('inv.table.circulo'))}</th>
              <th>${escapeHtml(t('inv.table.menu'))}</th>
              <th>${escapeHtml(t('inv.table.invitacion'))}</th>
              <th>${escapeHtml(t('inv.table.acomp'))}</th>
              <th>${escapeHtml(t('inv.table.mesa'))}</th>
              <th>${escapeHtml(t('inv.table.confirmacion'))}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${lista.map((g) => this._rowTpl(g)).join('')}</tbody>
        </table>
      </div>`;
  }

  /**
   * @param {object} g
   * @returns {string} Una fila de la tabla.
   */
  _rowTpl(g) {
    const lado = ladoTokens(g.lado);
    const plus = Number(g.plus) || 0;
    const meta = g.nota ? g.nota : (plus ? t('inv.meta.acomp') : t('inv.meta.individual'));
    const invEstado = g.invitacion || 'sin enviar';
    const invLabel = t(ENUMS.invInvitacion[invEstado]);
    const menuEspecial = g.menu && g.menu !== 'Estándar';
    const mesaNombre = this._mesas.find((m) => m.id === g.mesa)?.nombre || t('inv.card.sinMesa');
    const plusCorto = plus ? `+${plus}` : '—';
    return `
      <tr data-id="${escapeHtml(g.id)}" data-rsvp="${escapeHtml(g.rsvp)}">
        <td>
          <div class="inv-table-who">
            <span class="inv-avatar inv-avatar-sm" style="background:${lado.bg};color:${lado.ink};--card-lado:${lado.color}" aria-hidden="true">${escapeHtml(iniciales(g.nombre))}<span class="inv-avatar-status"></span></span>
            <span class="inv-table-id">
              <span class="inv-table-nombre">${escapeHtml(g.nombre)}</span>
              <span class="inv-table-meta muted">${escapeHtml(meta)}</span>
            </span>
          </div>
        </td>
        <td><span class="inv-pill" style="background:${lado.bg};color:${lado.ink}">${ladoIcon(g.lado)}${escapeHtml(lado.label)}</span></td>
        <td>${escapeHtml(g.grupo)}</td>
        <td>${menuEspecial ? `<span class="tag tag-accent">${icCubiertos()}${escapeHtml(g.menu)}</span>` : `<span class="muted">${escapeHtml(g.menu || 'Estándar')}</span>`}</td>
        <td><span class="inv-inv-state">${icSobre()}${escapeHtml(invLabel)}</span></td>
        <td class="inv-table-num">${escapeHtml(plusCorto)}</td>
        <td>${escapeHtml(mesaNombre)}</td>
        <td>
          <select class="input" data-rsvp="${escapeHtml(g.id)}">
            <option value="confirmado"${g.rsvp === 'confirmado' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invRsvp.confirmado))}</option>
            <option value="pendiente"${g.rsvp === 'pendiente' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invRsvp.pendiente))}</option>
            <option value="no"${g.rsvp === 'no' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invRsvp.no))}</option>
          </select>
        </td>
        <td><button class="btn btn-ghost" data-remove="${escapeHtml(g.id)}" type="button">${escapeHtml(t('inv.card.quitar'))}</button></td>
      </tr>`;
  }

  /** @returns {string} Estado vacío cuando ningún filtro coincide. */
  get _emptyTpl() {
    return `
      <empty-state title="${escapeHtml(t('inv.empty.title'))}" desc="${escapeHtml(t('inv.empty.desc'))}"></empty-state>
      <button class="btn btn-primary" id="empty-add" type="button">+&nbsp;&nbsp;${escapeHtml(t('inv.add'))}</button>`;
  }

  /** @returns {string} Diálogo de alta de invitado, dentro de modal-dialog. */
  get _altaTpl() {
    const d = this._draft;
    const circulos = Array.from(new Set([...GRUPOS_ALTA, ...circulosDe(this._invitados)]));
    const menus = menusDe(this._invitados);
    return `
      <modal-dialog id="add-dialog">
        <div class="inv-add-grid">
          <div class="field inv-add-span2">
            <label>${escapeHtml(t('inv.add.nombre'))}</label>
            <input class="input" id="add-nombre" placeholder="${escapeHtml(t('inv.add.nombre.ph'))}" value="${escapeHtml(d.nombre)}">
          </div>
          <div class="field">
            <label>${escapeHtml(t('inv.add.lado'))}</label>
            <select class="input" id="add-lado">
              <option value="novio"${d.lado === 'novio' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invLado.novio))}</option>
              <option value="novia"${d.lado === 'novia' ? ' selected' : ''}>${escapeHtml(t(ENUMS.invLado.novia))}</option>
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('inv.add.circulo'))}</label>
            <select class="input" id="add-grupo">
              ${circulos.map((c) => `<option value="${escapeHtml(c)}"${c === d.grupo ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="field inv-add-span2">
            <label>${escapeHtml(t('inv.add.acomp'))}</label>
            <textarea class="input" id="add-acomp" rows="2" placeholder="${escapeHtml(t('inv.add.nombre.ph'))}">${escapeHtml(d.acomp)}</textarea>
          </div>
          <div class="field">
            <label>${escapeHtml(t('inv.add.menu'))}</label>
            <select class="input" id="add-menu">
              ${menus.map((m) => `<option value="${escapeHtml(m)}"${m === d.menu ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('inv.add.invitacion'))}</label>
            <select class="input" id="add-invitacion">
              ${ORDEN_INVITACION.map((k) => `<option value="${escapeHtml(k)}"${k === d.invitacion ? ' selected' : ''}>${escapeHtml(t(ENUMS.invInvitacion[k]))}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>${escapeHtml(t('inv.add.rsvp'))}</label>
            <select class="input" id="add-rsvp">
              ${ORDEN_RSVP_ALTA.map((k) => `<option value="${escapeHtml(k)}"${k === d.rsvp ? ' selected' : ''}>${escapeHtml(t(ENUMS.invRsvp[k]))}</option>`).join('')}
            </select>
          </div>
          <div class="field inv-add-span2">
            <label>${escapeHtml(t('inv.add.nota'))}</label>
            <input class="input" id="add-nota" placeholder="${escapeHtml(t('inv.add.nota.ph'))}" value="${escapeHtml(d.nota)}">
          </div>
        </div>
        <div class="inv-add-foot">
          <button class="btn btn-primary" id="add-save" type="button">${escapeHtml(t('inv.add.save'))}</button>
        </div>
      </modal-dialog>`;
  }

  afterRender() {
    this.on(this.$('#f-q'), 'input', (e) => { this._q = e.target.value; this._apply(); });
    this.on(this.$('#f-lado'), 'change', (e) => { this._lado = e.target.value; this._apply(); });
    this.on(this.$('#f-grupo'), 'change', (e) => { this._grupo = e.target.value; this._apply(); });
    this.on(this.$('#f-rsvp'), 'change', (e) => { this._rsvp = e.target.value; this._apply(); });
    this.on(this.$('#f-inv'), 'change', (e) => { this._inv = e.target.value; this._apply(); });
    this.on(this.$('#f-menu'), 'change', (e) => { this._menu = e.target.value; this._apply(); });
    this.on(this.$('#v-tarjetas'), 'click', () => this._setView('tarjetas'));
    this.on(this.$('#v-lista'), 'click', () => this._setView('lista'));
    this.on(this.$('#add-open'), 'click', () => this._openAdd());

    // Contenedores estables: delegación una sola vez por render completo.
    this.on(this.$('#list'), 'click', (e) => this._onListClick(e));
    this.on(this.$('#list'), 'change', (e) => this._onListChange(e));
    this.on(this.$('#empty'), 'click', (e) => { if (e.target.closest('#empty-add')) this._openAdd(); });
    this.on(this.$('#overlay'), 'click', (e) => this._onOverlayClick(e));
    this.on(this.$('#overlay'), 'change', (e) => this._onOverlayChange(e));
    this.on(this.$('#overlay'), 'input', (e) => this._onOverlayInput(e));

    this._wireOverlayDialogs();
    this._animateHero();
    // Entrada escalonada de las tarjetas (one-shot: no se repite al filtrar).
    const list = this.$('#list');
    if (list) { list.classList.add('inv-stagger'); setTimeout(() => list.classList.remove('inv-stagger'), 900); }
  }

  /**
   * Dibuja el anillo, rellena el medidor y hace subir los contadores. Respeta
   * prefers-reduced-motion (aplica los valores finales al instante).
   */
  _animateHero() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const arcs = this.$$('.inv-donut-arc');
    const fill = this.$('.inv-meter-fill');
    const setFinal = () => {
      arcs.forEach((a) => { a.style.strokeDashoffset = '0'; });
      if (fill) fill.style.width = `${fill.dataset.w || 0}%`;
    };
    this.$$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      if (reduce) { el.textContent = `${target}${suffix}`; return; }
      const dur = 720; const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (reduce) { setFinal(); return; }
    requestAnimationFrame(() => requestAnimationFrame(setFinal));
  }

  /**
   * Re-renderiza solo stats/lista/vacío para que la búsqueda no pierda el
   * foco del input (la barra de filtros nunca se vuelve a pintar entera).
   */
  _apply(refreshHero = false, flashId = null) {
    const stats = this.$('#stats');
    if (stats) stats.innerHTML = this._statsTpl;
    const list = this.$('#list');
    if (list) list.innerHTML = this._listTpl;
    const empty = this.$('#empty');
    if (empty) empty.innerHTML = this._visible.length ? '' : this._emptyTpl;
    if (refreshHero) {
      const hero = this.$('#hero');
      if (hero) { hero.innerHTML = this._heroTpl; this._animateHero(); }
    }
    if (flashId) {
      const card = this.$(`.inv-card[data-id="${flashId}"]`);
      if (card) { card.classList.add('inv-flash'); setTimeout(() => card.classList.remove('inv-flash'), 620); }
    }
  }

  /** Repinta solo el overlay (alta) y recablea su diálogo. */
  _paintOverlay() {
    const overlay = this.$('#overlay');
    if (overlay) overlay.innerHTML = this._addOpen ? this._altaTpl : '';
    this._wireOverlayDialogs();
  }

  /** Abre/cierra el modal-dialog de alta y cablea su evento `close`. */
  _wireOverlayDialogs() {
    const addDialog = this.$('#add-dialog');
    if (addDialog) {
      addDialog.heading = t('inv.add.title');
      this.on(addDialog, 'close', () => { this._addOpen = false; this._paintOverlay(); });
      if (this._addOpen) addDialog.open();
    }
  }

  /** @param {'tarjetas'|'lista'} view */
  _setView(view) {
    if (this._view === view) return;
    this._view = view;
    const tarjetas = this.$('#v-tarjetas');
    const lista = this.$('#v-lista');
    if (tarjetas) tarjetas.setAttribute('aria-selected', String(view === 'tarjetas'));
    if (lista) lista.setAttribute('aria-selected', String(view === 'lista'));
    this._apply();
  }

  /** @param {MouseEvent} e */
  _onListClick(e) {
    const rm = e.target.closest('[data-remove]');
    if (rm) { this._removeInvitado(rm.dataset.remove); return; }
    const next = e.target.closest('[data-nextinv]');
    if (next) { this._cicloInvitacion(next.dataset.nextinv); return; }
    const conf = e.target.closest('[data-conf]');
    if (conf) this._setRsvp(conf.dataset.conf, conf.dataset.set);
  }

  /** @param {Event} e */
  _onListChange(e) {
    const rsvpSel = e.target.closest('[data-rsvp]');
    if (rsvpSel) { this._setRsvp(rsvpSel.dataset.rsvp, rsvpSel.value); return; }
    const mesaSel = e.target.closest('[data-mesa]');
    if (mesaSel) this._setMesa(mesaSel.dataset.mesa, mesaSel.value);
  }

  /** @param {MouseEvent} e */
  _onOverlayClick(e) {
    if (e.target.closest('#add-save')) this._saveDraft();
  }

  /** @param {Event} e */
  _onOverlayChange(e) {
    if (String(e.target.id).startsWith('add-')) this._updateDraftField(e.target);
  }

  /** @param {Event} e */
  _onOverlayInput(e) {
    if (String(e.target.id).startsWith('add-')) this._updateDraftField(e.target);
  }

  // ---------- Acciones sobre la lista ----------

  /**
   * @param {string} id
   * @param {string} rsvp
   */
  _setRsvp(id, rsvp) {
    const g = this._invitados.find((x) => x.id === id);
    if (!g) return;
    this._syncInvitado(invitadosRepo.upsert({ ...g, rsvp }));
    this._apply(true, id);
  }

  /**
   * @param {string} id
   * @param {string} mesaId
   */
  _setMesa(id, mesaId) {
    const g = this._invitados.find((x) => x.id === id);
    if (!g) return;
    this._syncInvitado(invitadosRepo.upsert({ ...g, mesa: mesaId || null }));
    this._apply(true);
  }

  /** @param {string} id */
  _cicloInvitacion(id) {
    const g = this._invitados.find((x) => x.id === id);
    if (!g) return;
    const invitacion = siguienteInvitacion(g.invitacion);
    this._syncInvitado(invitadosRepo.upsert({ ...g, invitacion }));
    this._apply(true, id);
  }

  /** @param {string} id */
  _removeInvitado(id) {
    const g = this._invitados.find((x) => x.id === id);
    if (!g) return;
    invitadosRepo.remove(id);
    this._invitados = this._invitados.filter((x) => x.id !== id);
    this._toast('inv.toast.quitado', { nombre: g.nombre });
    this._apply(true);
  }

  /**
   * Sustituye (o añade) un invitado en la copia local tras persistirlo.
   * @param {object} updated
   */
  _syncInvitado(updated) {
    const idx = this._invitados.findIndex((x) => x.id === updated.id);
    if (idx >= 0) this._invitados[idx] = updated;
    else this._invitados.push(updated);
  }

  // ---------- Alta de invitado ----------

  _openAdd() {
    this._draft = draftVacio();
    this._addOpen = true;
    this._paintOverlay();
  }

  /** @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} el */
  _updateDraftField(el) {
    const map = {
      'add-nombre': 'nombre', 'add-lado': 'lado', 'add-grupo': 'grupo', 'add-acomp': 'acomp',
      'add-menu': 'menu', 'add-invitacion': 'invitacion', 'add-rsvp': 'rsvp', 'add-nota': 'nota',
    };
    const key = map[el.id];
    if (key) this._draft[key] = el.value;
  }

  _saveDraft() {
    const d = this._draft;
    const nombre = (d.nombre || '').trim();
    if (!nombre) { this._toast('inv.add.needName'); return; }
    const acomp = parseAcomp(d.acomp);
    const created = invitadosRepo.upsert({
      nombre,
      lado: d.lado,
      grupo: d.grupo,
      rsvp: d.rsvp,
      plus: acomp.length,
      acompanantes: acomp,
      menu: d.menu,
      invitacion: d.invitacion,
      nota: (d.nota || '').trim(),
    });
    this._invitados.unshift(created);
    this._addOpen = false;
    this._toast('inv.toast.creado', { nombre: created.nombre });
    this._apply(true);
    this._paintOverlay();
  }

  // ---------- Toast ----------

  /**
   * Muestra un aviso breve reutilizando el primitivo app-toast.
   * @param {string} key Clave i18n.
   * @param {Record<string, string|number>} [vars]
   */
  _toast(key, vars) {
    const el = this.$('#toast');
    if (el && typeof el.show === 'function') el.show(t(key, vars));
  }
}

customElements.define('invitados-view', InvitadosView);
