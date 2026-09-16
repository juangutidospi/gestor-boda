import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/finca-view/finca-view.js';

register('views/finca-view', () => {
  const out = [];
  reset();
  const el = document.createElement('finca-view');
  document.body.appendChild(el);
  el.refresh();
  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });
  const cards = el.shadowRoot.querySelectorAll('.fc-card');
  out.push({ name: 'lista 9 tarjetas', ok: cards.length === 9, detail: String(cards.length) });
  // filtrar por estado favorita disparando el change del <select> de estado
  const sel = el.shadowRoot.querySelector('#f-estado');
  sel.value = 'favorita'; sel.dispatchEvent(new Event('change'));
  out.push({ name: 'filtra favorita = 3', ok: el.shadowRoot.querySelectorAll('.fc-card').length === 3, detail: String(el.shadowRoot.querySelectorAll('.fc-card').length) });
  el.remove(); reset();
  return out;
});
