import { register } from './runner.js';
import {
  plazas, confirmados, ocupacionMesa, sinAsignar, calcularStats, mesaSize, sillasGeom, autoOrganizar, autoSentar, resumenMesa, saludPlano, resumenGlobal,
} from '../js/components/views/salon-view/salon-calc.js';

register('salon/calc', () => {
  const out = [];
  const g = (over) => ({ id: 'g', nombre: 'N', lado: 'novia', rsvp: 'confirmado', plus: 0, mesa: null, ...over });
  const mesas = [
    { id: 'm1', nombre: 'Presidencial', capacidad: 10, forma: 'rectangular', x: 50, y: 20 },
    { id: 'm2', nombre: 'Mesa 2', capacidad: 8, forma: 'redonda', x: 26, y: 48 },
  ];
  const invitados = [
    g({ id: 'a', plus: 1, mesa: 'm1' }), // 2 plazas en m1
    g({ id: 'b', plus: 0, mesa: 'm1' }), // 1 plaza en m1
    g({ id: 'c', plus: 0, mesa: null }), // sin mesa
    g({ id: 'd', plus: 0, rsvp: 'pendiente', mesa: null }), // no confirmado
  ];

  out.push({ name: 'plazas = 1 + plus', ok: plazas({ plus: 2 }) === 3, detail: '' });
  out.push({ name: 'confirmados excluye no confirmados', ok: confirmados(invitados).length === 3, detail: String(confirmados(invitados).length) });

  const confs = confirmados(invitados);
  const oc = ocupacionMesa(mesas[0], confs);
  out.push({ name: 'ocupación suma plazas de asignados', ok: oc.ocupadas === 3, detail: String(oc.ocupadas) });
  out.push({ name: 'ocupación pct = 30% (3/10)', ok: oc.pct === 30, detail: String(oc.pct) });
  out.push({ name: 'sin sobrecupo si ocupadas <= capacidad', ok: oc.sobra === false && oc.exceso === 0, detail: `${oc.sobra}/${oc.exceso}` });

  const ocSob = ocupacionMesa({ id: 'm2', capacidad: 2 }, [g({ id: 'x', plus: 2, mesa: 'm2' })]);
  out.push({ name: 'sobrecupo detectado (3 en cap 2)', ok: ocSob.sobra === true && ocSob.exceso === 1, detail: `${ocSob.exceso}` });

  const sa = sinAsignar(confs);
  out.push({ name: 'sin-asignar solo confirmados sin mesa', ok: sa.length === 1 && sa[0].id === 'c', detail: sa.map((x) => x.id).join(',') });

  const stats = calcularStats(mesas, invitados);
  out.push({ name: 'stats: 4 tarjetas', ok: stats.length === 4, detail: String(stats.length) });
  out.push({ name: 'stat mesas = 2, plazas totales = 18', ok: stats[0].value === 2 && stats[0].noteVars.plazas === 18, detail: String(stats[0].noteVars.plazas) });
  out.push({ name: 'stat sentados = 3 plazas', ok: stats[1].value === 3, detail: String(stats[1].value) });
  out.push({ name: 'stat por sentar = 1 invitación', ok: stats[2].value === 1, detail: String(stats[2].value) });
  out.push({ name: 'stat plazas libres = 15', ok: stats[3].value === 15, detail: String(stats[3].value) });

  const rSize = mesaSize({ forma: 'rectangular', capacidad: 10 });
  const oSize = mesaSize({ forma: 'redonda', capacidad: 12 });
  out.push({ name: 'mesaSize rectangular 172x92', ok: rSize.rect && rSize.w === 172 && rSize.h === 92, detail: `${rSize.w}x${rSize.h}` });
  out.push({ name: 'mesaSize redonda cuadrada crece con capacidad', ok: !oSize.rect && oSize.w === oSize.h && oSize.w === 158, detail: `${oSize.w}` });

  const sillas = sillasGeom({ forma: 'redonda', capacidad: 8 }, 4);
  out.push({ name: 'sillasGeom devuelve n posiciones', ok: sillas.length === 4, detail: String(sillas.length) });
  out.push({ name: 'primera silla arriba (deg≈0, y<0)', ok: Math.abs(sillas[0].deg) < 0.01 && sillas[0].y < 0, detail: `${sillas[0].deg.toFixed(1)}` });

  const org = autoOrganizar(mesas);
  const pres = org.find((m) => m.forma === 'rectangular');
  out.push({ name: 'autoOrganizar pone la presidencial arriba (y=19)', ok: pres.x === 50 && pres.y === 19, detail: `${pres.x},${pres.y}` });

  // Auto-sentar: mantiene grupos juntos y no supera capacidad.
  const mesasAS = [{ id: 'A', capacidad: 4 }, { id: 'B', capacidad: 4 }];
  const invAS = [
    g({ id: 'f1', grupo: 'Familia', mesa: null }), g({ id: 'f2', grupo: 'Familia', mesa: null }), g({ id: 'f3', grupo: 'Familia', mesa: null }),
    g({ id: 'a1', grupo: 'Amigos', mesa: null }), g({ id: 'a2', grupo: 'Amigos', mesa: null }),
  ];
  const as = autoSentar(mesasAS, invAS);
  const mesaDe = (id) => as.find((x) => x.id === id)?.mesa;
  out.push({ name: 'autoSentar asigna a todos', ok: as.length === 5, detail: String(as.length) });
  out.push({ name: 'autoSentar mantiene la Familia junta', ok: mesaDe('f1') === mesaDe('f2') && mesaDe('f2') === mesaDe('f3'), detail: `${mesaDe('f1')},${mesaDe('f2')},${mesaDe('f3')}` });
  out.push({ name: 'autoSentar respeta capacidad (no mete 5 en una de 4)', ok: as.filter((x) => x.mesa === mesaDe('f1')).length <= 4, detail: '' });

  // Resumen de mesa: lado y menús especiales.
  const res = resumenMesa([
    g({ lado: 'novia', menu: 'Vegano', plus: 0 }),
    g({ lado: 'novio', menu: 'Estándar', plus: 1 }),
    g({ lado: 'novia', menu: 'Sin gluten', plus: 0 }),
  ]);
  out.push({ name: 'resumenMesa cuenta lado (novia=2 plazas, novio=2)', ok: res.novia === 2 && res.novio === 2, detail: `${res.novia}/${res.novio}` });
  out.push({ name: 'resumenMesa cuenta menús especiales (2, sin estándar)', ok: res.especiales === 2 && res.menus.length === 2, detail: JSON.stringify(res.menus) });

  // Reglas: "no sentar juntos" separa a dos enemigos si hay hueco.
  const mesasR = [{ id: 'A', capacidad: 4 }, { id: 'B', capacidad: 4 }];
  const invR = [
    g({ id: 'x', grupo: 'G1', mesa: null }), g({ id: 'y', grupo: 'G2', mesa: null }),
  ];
  const asR = autoSentar(mesasR, invR, [{ tipo: 'separados', a: 'x', b: 'y' }]);
  const mesaDeR = (id) => asR.find((z) => z.id === id)?.mesa;
  out.push({ name: 'autoSentar respeta "no sentar juntos"', ok: mesaDeR('x') !== mesaDeR('y'), detail: `${mesaDeR('x')},${mesaDeR('y')}` });
  const asJ = autoSentar(mesasR, [g({ id: 'p', grupo: 'GA', mesa: null }), g({ id: 'q', grupo: 'GB', mesa: null })], [{ tipo: 'juntos', a: 'p', b: 'q' }]);
  const mesaDeJ = (id) => asJ.find((z) => z.id === id)?.mesa;
  out.push({ name: 'autoSentar respeta "sentar juntos"', ok: mesaDeJ('p') === mesaDeJ('q'), detail: `${mesaDeJ('p')},${mesaDeJ('q')}` });

  // Salud del plano: sobrecupo, sin sentar, reglas incumplidas.
  const mesasS = [{ id: 'M', capacidad: 2, nombre: 'M' }];
  const invS = [
    g({ id: 's1', mesa: 'M', plus: 0 }), g({ id: 's2', mesa: 'M', plus: 1 }), // 3 en cap 2 → sobrecupo
    g({ id: 's3', mesa: null }), // sin sentar
  ];
  const salud = saludPlano(mesasS, invS, [{ tipo: 'separados', a: 's1', b: 's2' }]);
  out.push({ name: 'saludPlano detecta sobrecupo', ok: salud.some((a) => a.tipo === 'sobrecupo'), detail: '' });
  out.push({ name: 'saludPlano detecta por sentar', ok: salud.some((a) => a.tipo === 'porSentar' && a.n === 1), detail: '' });
  out.push({ name: 'saludPlano detecta regla "separados" incumplida', ok: salud.some((a) => a.tipo === 'reglaSeparados'), detail: '' });

  // Resumen global de menús.
  const rg = resumenGlobal([
    g({ menu: 'Vegano', plus: 1 }), g({ menu: 'Vegano', plus: 0 }), g({ menu: 'Estándar', plus: 0 }),
  ]);
  out.push({ name: 'resumenGlobal suma menús especiales (Vegano ×3)', ok: rg.length === 1 && rg[0].menu === 'Vegano' && rg[0].n === 3, detail: JSON.stringify(rg) });

  return out;
});
