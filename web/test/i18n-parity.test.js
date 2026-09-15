import { register } from './runner.js';
import es from '../js/i18n/es.js';
import en from '../js/i18n/en.js';
import { ENUMS } from '../js/core/enums.js';

register('i18n/paridad', () => {
  const out = [];
  const esKeys = Object.keys(es), enKeys = Object.keys(en);

  const missingEn = esKeys.filter((k) => !(k in en));
  out.push({ name: 'toda clave de es.js existe en en.js', ok: !missingEn.length, detail: missingEn.join(', ') });

  const missingEs = enKeys.filter((k) => !(k in es));
  out.push({ name: 'toda clave de en.js existe en es.js', ok: !missingEs.length, detail: missingEs.join(', ') });

  const empty = esKeys.filter((k) => !String(es[k]).trim() || !String(en[k] ?? '').trim());
  out.push({ name: 'ninguna traducción vacía', ok: !empty.length, detail: empty.join(', ') });

  const enumKeys = [...new Set(Object.values(ENUMS).flatMap((g) => Object.values(g)))];
  const noKey = enumKeys.filter((k) => !(k in es) || !(k in en));
  out.push({ name: 'todo valor de enum tiene su clave', ok: !noKey.length, detail: noKey.join(', ') });

  const looksRaw = esKeys.filter((k) => /^[a-z]+([._][a-z0-9_]+)+$/.test(String(es[k])));
  out.push({ name: 'ninguna traducción es una clave', ok: !looksRaw.length, detail: looksRaw.join(', ') });

  return out;
});
