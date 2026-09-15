import { base } from './base.css.js';

/**
 * Clase base de todo componente: crea el shadow root, adopta los estilos,
 * re-renderiza al cambiar el idioma y limpia sus listeners al desconectarse.
 */
export class AppElement extends HTMLElement {
  /** @type {CSSStyleSheet[]} Hojas propias del componente. */
  static styles = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [base, ...this.constructor.styles];
    /** @type {Array<() => void>} */
    this._off = [];
  }

  connectedCallback() {
    this._paint();
    this.on(window, 'i18n:changed', () => this._paint());
  }

  disconnectedCallback() {
    this._off.forEach((off) => off());
    this._off = [];
  }

  /** Render + wiring en el orden que fija el patrón. */
  _paint() {
    this.render();
    this.afterRender();
  }

  /** Compone los getters de plantilla en el shadow root. Lo implementa cada componente. */
  render() {}

  /** Todo el cableado: listeners, options, fetch. Lo implementa cada componente. */
  afterRender() {}

  /**
   * Listener que se elimina solo al desconectar el componente.
   * @param {EventTarget} target
   * @param {string} event
   * @param {(e: Event) => void} fn
   * @param {AddEventListenerOptions} [opts]
   */
  on(target, event, fn, opts) {
    target.addEventListener(event, fn, opts);
    this._off.push(() => target.removeEventListener(event, fn, opts));
  }

  /**
   * Consulta dentro del shadow (nunca document).
   * @param {string} sel
   * @returns {Element|null}
   */
  $(sel) { return this.shadowRoot.querySelector(sel); }

  /**
   * Consulta múltiple dentro del shadow.
   * @param {string} sel
   * @returns {Element[]}
   */
  $$(sel) { return [...this.shadowRoot.querySelectorAll(sel)]; }
}
