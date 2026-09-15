import { register } from './runner.js';
import { getGroup, get, set, toggle, reset } from '../js/core/store.js';

register('core/store', () => {
  const out = [];
  reset();

  set('fincas', 'f1', { nombre: 'A' });
  out.push({ name: 'set/get devuelve el valor', ok: get('fincas', 'f1')?.nombre === 'A', detail: '' });

  out.push({ name: 'getGroup devuelve el mapa', ok: Object.keys(getGroup('fincas')).length === 1, detail: '' });

  const nv = toggle('ui', 'flag', false);
  out.push({ name: 'toggle invierte el booleano', ok: nv === true, detail: String(nv) });

  let fired = false;
  const h = () => { fired = true; };
  window.addEventListener('store:changed', h, { once: true });
  set('ui', 'x', 1);
  out.push({ name: 'set emite store:changed', ok: fired, detail: '' });

  out.push({ name: 'get con fallback', ok: get('fincas', 'noexiste', 'def') === 'def', detail: '' });

  reset();
  out.push({ name: 'reset vacía el grupo', ok: Object.keys(getGroup('fincas')).length === 0, detail: '' });
  return out;
});
