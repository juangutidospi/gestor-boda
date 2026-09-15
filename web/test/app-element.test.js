import { register } from './runner.js';
import { AppElement } from '../js/core/AppElement.js';
import { escapeHtml } from '../js/core/escape-html.js';

register('core/AppElement + escapeHtml', () => {
  const out = [];

  out.push({ name: 'escapeHtml escapa <, >, &, "', ok:
    escapeHtml('<a b="1" & 2>') === '&lt;a b=&quot;1&quot; &amp; 2&gt;',
    detail: escapeHtml('<a b="1" & 2>') });

  class Demo extends AppElement {
    render() { this.shadowRoot.innerHTML = `<button id="b">hola</button>`; }
    afterRender() { this.clicks = 0; this.on(this.$('#b'), 'click', () => this.clicks++); }
  }
  customElements.define('demo-el', Demo);

  const el = document.createElement('demo-el');
  document.body.appendChild(el);
  out.push({ name: 'crea shadow root', ok: !!el.shadowRoot, detail: '' });
  out.push({ name: '$ consulta dentro del shadow', ok: el.$('#b')?.textContent === 'hola', detail: '' });

  el.$('#b').click();
  out.push({ name: 'on() cablea el listener', ok: el.clicks === 1, detail: String(el.clicks) });

  el.remove();
  el.$('#b')?.click?.();
  out.push({ name: 'on() se limpia al desconectar', ok: el.clicks === 1, detail: String(el.clicks) });

  return out;
});
