import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/proveedores-view/proveedores-view.js';

register('views/proveedores-view', () => {
  const out = [];
  reset();
  const el = document.createElement('proveedores-view');
  document.body.appendChild(el);
  el.refresh();
  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });
  const cards = el.shadowRoot.querySelectorAll('.prov-card');
  out.push({ name: 'lista 14 proveedores', ok: cards.length === 14, detail: String(cards.length) });
  const sel = el.shadowRoot.querySelector('#pf-estado');
  sel.value = 'contratado'; sel.dispatchEvent(new Event('change'));
  const n = el.shadowRoot.querySelectorAll('.prov-card').length;
  out.push({ name: 'filtra por estado contratado (<14)', ok: n > 0 && n < 14, detail: String(n) });
  el.remove(); reset();
  return out;
});
