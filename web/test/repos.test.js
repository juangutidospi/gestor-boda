import { register } from './runner.js';
import { reset } from '../js/core/store.js';
import { ensureSeeded, fincasRepo, invitadosRepo, configRepo } from '../js/core/repos.js';

register('core/repos', () => {
  const out = [];
  reset();
  ensureSeeded();

  out.push({ name: 'siembra 9 fincas', ok: fincasRepo.list().length === 9, detail: String(fincasRepo.list().length) });

  const nueva = fincasRepo.upsert({ nombre: 'Prueba', tipo: 'Finca', estado: 'candidata' });
  out.push({ name: 'upsert genera id', ok: !!nueva.id, detail: nueva.id });
  out.push({ name: 'upsert añade a la lista', ok: fincasRepo.list().length === 10, detail: '' });

  nueva.nombre = 'Prueba 2';
  fincasRepo.upsert(nueva);
  out.push({ name: 'upsert actualiza sin duplicar', ok: fincasRepo.list().length === 10 && fincasRepo.get(nueva.id).nombre === 'Prueba 2', detail: '' });

  fincasRepo.remove(nueva.id);
  out.push({ name: 'remove borra', ok: fincasRepo.list().length === 9, detail: '' });

  out.push({ name: 'invitados sembrados', ok: invitadosRepo.list().length === 15, detail: '' });

  configRepo.set({ theme: 'dark' });
  out.push({ name: 'config set/get', ok: configRepo.get().theme === 'dark', detail: '' });

  reset();
  return out;
});
