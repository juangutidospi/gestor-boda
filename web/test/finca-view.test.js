import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import '../js/components/views/finca-view/finca-view.js';

register('views/finca-view (placeholder)', () => {
  const out = [];
  reset();
  const el = document.createElement('finca-view');
  document.body.appendChild(el);

  out.push({ name: 'expone refresh()', ok: typeof el.refresh === 'function', detail: '' });

  el.refresh();
  out.push({ name: 'refresh siembra y cuenta 9 fincas', ok: el.shadowRoot.textContent.includes('9'), detail: '' });

  el.remove(); reset();
  return out;
});
