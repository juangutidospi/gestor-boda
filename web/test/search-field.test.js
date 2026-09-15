import { register } from './runner.js';
import '../js/components/ui/search-field/search-field.js';
import '../js/components/ui/empty-state/empty-state.js';
import '../js/components/ui/skeleton/skeleton.js';

register('ui/search-field + empty-state + skeleton', async () => {
  const out = [];

  const sf = document.createElement('search-field');
  sf.setAttribute('placeholder', 'Nombre…');
  document.body.appendChild(sf);
  const input = sf.shadowRoot.querySelector('input');
  out.push({ name: 'search-field pinta un input con placeholder', ok: input?.placeholder === 'Nombre…', detail: '' });

  const fired = await new Promise((resolve) => {
    sf.addEventListener('search', (e) => resolve(e.detail.value), { once: true });
    input.value = 'ana';
    input.dispatchEvent(new Event('input'));
    setTimeout(() => resolve('__timeout__'), 500);
  });
  out.push({ name: 'search-field emite search (debounced)', ok: fired === 'ana', detail: String(fired) });

  const es = document.createElement('empty-state');
  es.setAttribute('title', 'Vacío');
  document.body.appendChild(es);
  out.push({ name: 'empty-state muestra el título', ok: es.shadowRoot.textContent.includes('Vacío'), detail: '' });

  const sk = document.createElement('ui-skeleton');
  document.body.appendChild(sk);
  out.push({ name: 'skeleton pinta un bloque', ok: !!sk.shadowRoot.querySelector('.sk'), detail: '' });

  sf.remove(); es.remove(); sk.remove();
  return out;
});
