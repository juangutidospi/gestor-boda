import { register } from './runner.js';
import { SEED } from '../js/core/seed.js';

register('core/seed', () => {
  const out = [];
  out.push({ name: '9 fincas', ok: SEED.fincas.length === 9, detail: String(SEED.fincas.length) });
  out.push({ name: '15 invitados', ok: SEED.invitados.length === 15, detail: String(SEED.invitados.length) });
  out.push({ name: '14 proveedores', ok: SEED.proveedores.length === 14, detail: String(SEED.proveedores.length) });
  out.push({ name: '4 mesas', ok: SEED.mesas.length === 4, detail: String(SEED.mesas.length) });
  out.push({ name: 'límite 45000', ok: SEED.presupuesto.limite === 45000, detail: '' });
  out.push({ name: 'guestCount 140', ok: SEED.config.guestCount === 140, detail: '' });
  const jarama = SEED.fincas.find((f) => f.nombre === 'La Quinta de Jarama');
  out.push({ name: 'La Quinta de Jarama con fotos', ok: !!jarama && jarama.fotos.length > 0, detail: '' });
  return out;
});
