import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/invitados-view/invitados-view.js';

register('views/invitados-view', () => {
  const out = [];
  reset();
  const el = document.createElement('invitados-view');
  document.body.appendChild(el);
  el.refresh();

  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });
  const cards = el.shadowRoot.querySelectorAll('.inv-card');
  out.push({ name: 'lista 15 invitados (tarjetas)', ok: cards.length === 15, detail: String(cards.length) });

  // filtrar por lado 'novio' disparando el change del select
  const sel = el.shadowRoot.querySelector('#f-lado');
  sel.value = 'novio'; sel.dispatchEvent(new Event('change'));
  const novio = el.shadowRoot.querySelectorAll('.inv-card').length;
  out.push({ name: 'filtra por lado novio (<15)', ok: novio > 0 && novio < 15, detail: String(novio) });

  el.remove(); reset();
  return out;
});
