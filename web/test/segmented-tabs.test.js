import { register } from './runner.js';
import '../js/components/ui/segmented-tabs/segmented-tabs.js';

register('ui/segmented-tabs', () => {
  const out = [];
  const el = document.createElement('segmented-tabs');
  document.body.appendChild(el);
  el.options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];

  out.push({ name: 'pinta un botón por opción', ok: el.shadowRoot.querySelectorAll('button').length === 2, detail: '' });
  out.push({ name: 'primera opción seleccionada por defecto', ok: el.value === 'a', detail: el.value });

  let got = null;
  el.addEventListener('change', (e) => { got = e.detail.value; });
  el.shadowRoot.querySelectorAll('button')[1].click();
  out.push({ name: 'click emite change con el valor', ok: got === 'b' && el.value === 'b', detail: String(got) });

  el.remove();
  return out;
});
