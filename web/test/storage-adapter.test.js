import { register } from './runner.js';
import { storage } from '../js/core/storage-adapter.js';

register('core/storage-adapter', async () => {
  const out = [];
  out.push({ name: 'url() con http devuelve la misma url', ok: storage.url('https://x/y.jpg') === 'https://x/y.jpg', detail: '' });

  const file = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
  const u = await storage.put(file, 'k1');
  out.push({ name: 'put() devuelve una url usable', ok: typeof u === 'string' && u.startsWith('blob:'), detail: u });
  out.push({ name: 'url(k1) recupera la subida', ok: storage.url('k1') === u, detail: '' });

  await storage.remove('k1');
  out.push({ name: 'remove borra la clave', ok: storage.url('k1') === 'k1', detail: '' });
  return out;
});
