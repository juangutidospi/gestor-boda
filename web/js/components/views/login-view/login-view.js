import { AppElement } from '../../../core/AppElement.js';
import { escapeHtml } from '../../../core/escape-html.js';
import { styles } from './login-view.css.js';
import { t } from '../../../i18n/index.js';
import { signInPassword, signUp, signInMagicLink } from '../../../core/auth.js';

const rings = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8" aria-hidden="true"><circle cx="9.3" cy="12" r="6.1"/><circle cx="14.7" cy="12" r="6.1"/></svg>';

/**
 * Pantalla de acceso (gate). Entrar / crear cuenta con email+contraseña, más
 * enlace mágico. Al autenticarse, Supabase emite el cambio de sesión y
 * `main.js` oculta esta vista; aquí solo se disparan las llamadas.
 */
export class LoginView extends AppElement {
  static styles = [styles];

  /** @type {'login'|'signup'} */
  _mode = 'login';
  _busy = false;

  render() {
    const signup = this._mode === 'signup';
    this.shadowRoot.innerHTML = `
      <div class="lg">
        <div class="lg-card">
          <div class="lg-rings" aria-hidden="true">${rings}</div>
          <div class="lg-brand">
            <span class="lg-brand-mark">${rings}</span>
            <span class="lg-brand-txt">${escapeHtml(t('app.brand'))}</span>
          </div>
          <p class="lg-kicker">${escapeHtml(t(signup ? 'login.kicker.signup' : 'login.kicker.login'))}</p>
          <h1 class="lg-title">${escapeHtml(t(signup ? 'login.title.signup' : 'login.title.login'))}</h1>
          <p class="lg-sub">${escapeHtml(t(signup ? 'login.sub.signup' : 'login.sub.login'))}</p>

          <form class="lg-form" id="form" novalidate>
            ${signup ? `
            <div class="lg-field">
              <label for="lg-name">${escapeHtml(t('login.name'))}</label>
              <input class="lg-input" id="lg-name" type="text" autocomplete="name" placeholder="${escapeHtml(t('login.name.ph'))}">
            </div>` : ''}
            <div class="lg-field">
              <label for="lg-email">${escapeHtml(t('login.email'))}</label>
              <input class="lg-input" id="lg-email" type="email" autocomplete="email" required placeholder="tu@email.com">
            </div>
            <div class="lg-field">
              <label for="lg-pass">${escapeHtml(t('login.password'))}</label>
              <input class="lg-input" id="lg-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="6" placeholder="••••••••">
            </div>
            <button class="lg-btn" id="submit" type="submit">${escapeHtml(t(signup ? 'login.cta.signup' : 'login.cta.login'))}</button>
          </form>

          <div class="lg-msg" id="msg" hidden></div>

          <div class="lg-alt">
            <div class="lg-sep">${escapeHtml(t('login.or'))}</div>
            <button class="lg-ghost" id="magic" type="button">${escapeHtml(t('login.magic'))}</button>
          </div>

          <p class="lg-foot">
            ${escapeHtml(t(signup ? 'login.have' : 'login.new'))}
            <button class="lg-link" id="toggle" type="button">${escapeHtml(t(signup ? 'login.toLogin' : 'login.toSignup'))}</button>
          </p>
        </div>
      </div>`;
  }

  afterRender() {
    this.on(this.$('#form'), 'submit', (e) => { e.preventDefault(); this._submit(); });
    this.on(this.$('#toggle'), 'click', () => { this._mode = this._mode === 'login' ? 'signup' : 'login'; this._paint(); });
    this.on(this.$('#magic'), 'click', () => this._magic());
  }

  /** Entrar o crear cuenta con email+contraseña. */
  async _submit() {
    if (this._busy) return;
    const email = this.$('#lg-email').value.trim();
    const pass = this.$('#lg-pass').value;
    const name = this.$('#lg-name')?.value.trim() ?? '';
    if (!email || pass.length < 6) return this._show('error', t('login.err.fields'));
    this._setBusy(true);
    try {
      if (this._mode === 'signup') {
        await signUp(email, pass, name);
        this._show('ok', t('login.ok.signup'));
      } else {
        await signInPassword(email, pass);
        // El cambio de sesión lo gestiona main.js (onAuthChange).
      }
    } catch (err) {
      this._show('error', this._msgFor(err));
    } finally {
      this._setBusy(false);
    }
  }

  /** Enviar enlace mágico. */
  async _magic() {
    if (this._busy) return;
    const email = this.$('#lg-email').value.trim();
    if (!email) return this._show('error', t('login.err.email'));
    this._setBusy(true);
    try {
      await signInMagicLink(email);
      this._show('ok', t('login.ok.magic'));
    } catch (err) {
      this._show('error', this._msgFor(err));
    } finally {
      this._setBusy(false);
    }
  }

  /** Traduce errores comunes de Supabase a un mensaje claro. */
  _msgFor(err) {
    const m = (err && err.message) || '';
    if (/Invalid login credentials/i.test(m)) return t('login.err.creds');
    if (/already registered/i.test(m)) return t('login.err.exists');
    if (/rate limit/i.test(m)) return t('login.err.rate');
    return m || t('login.err.generic');
  }

  _setBusy(b) {
    this._busy = b;
    const btn = this.$('#submit'); const magic = this.$('#magic');
    if (btn) btn.disabled = b;
    if (magic) magic.disabled = b;
  }

  /** @param {'error'|'ok'} kind @param {string} text */
  _show(kind, text) {
    const el = this.$('#msg');
    el.className = `lg-msg is-${kind}`;
    el.textContent = text;
    el.hidden = false;
  }
}

customElements.define('login-view', LoginView);
