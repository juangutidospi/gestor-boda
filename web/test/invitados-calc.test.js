import { register } from './runner.js';
import { parseAcomp, filtrar, pax, circulosDe, agrupar, calcularStats, siguienteInvitacion } from '../js/components/views/invitados-view/invitados-calc.js';

register('invitados/calc', () => {
  const out = [];
  const g = (over) => ({ id: 'x', nombre: 'N', lado: 'novia', grupo: 'Familia directa', rsvp: 'pendiente', plus: 0, nota: '', invitacion: 'sin enviar', menu: 'Estándar', acompanantes: [], ...over });
  const inv = [
    g({ id: 'a', lado: 'novia', rsvp: 'confirmado', plus: 1, menu: 'Celíaco', invitacion: 'respondida' }),
    g({ id: 'b', lado: 'novia', rsvp: 'pendiente', grupo: 'Amigos' }),
    g({ id: 'c', lado: 'novio', rsvp: 'confirmado', plus: 2 }),
  ];

  out.push({ name: 'parseAcomp separa líneas no vacías', ok: JSON.stringify(parseAcomp('Ana\n\n Luis ')) === JSON.stringify(['Ana', 'Luis']), detail: '' });
  out.push({ name: 'pax = 1 + plus', ok: pax(inv[2]) === 3, detail: String(pax(inv[2])) });
  out.push({ name: 'filtrar por lado', ok: filtrar(inv, { q: '', lado: 'novio', grupo: 'Todos', rsvp: 'Todos', inv: 'Todas', menu: 'Todos' }).length === 1, detail: '' });
  out.push({ name: 'filtrar por menú especiales', ok: filtrar(inv, { q: '', lado: 'Todos', grupo: 'Todos', rsvp: 'Todos', inv: 'Todas', menu: 'especiales' }).length === 1, detail: '' });
  out.push({ name: 'circulosDe únicos', ok: JSON.stringify(circulosDe(inv)) === JSON.stringify(['Familia directa', 'Amigos']), detail: '' });

  const grupos = agrupar(inv);
  const fam = grupos.find((x) => x.titulo === 'Familia directa');
  out.push({ name: 'agrupar: pax por círculo', ok: fam.pax === 2 + 3, detail: String(fam.pax) });

  const stats = calcularStats(inv, { capSent: 300, nombre: 'X' });
  out.push({ name: 'stats: 7 tarjetas', ok: stats.length === 7, detail: String(stats.length) });
  const total = stats.find((s) => s.key === 'total');
  out.push({ name: 'stats: total pax = 6', ok: total.value === 6, detail: String(total.value) });
  const novio = stats.find((s) => s.key === 'novio');
  out.push({ name: 'stats: del novio = 3 pax', ok: novio.value === 3, detail: String(novio.value) });

  out.push({ name: 'ciclo invitación', ok: siguienteInvitacion('enviada') === 'recordatorio' && siguienteInvitacion('respondida') === 'sin enviar', detail: '' });
  return out;
});
