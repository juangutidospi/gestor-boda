import { register } from './runner.js';
import {
  toMin, toHHMM, durLabel, ordenar, absTimes, encadenar, avisos, resumen, porBloque,
  dobleReserva, porResponsable, reglaHoras, diasHasta, icsStamp,
  iniciales, estadoDia, responsablesSinContratar,
} from '../js/components/views/timing-view/timing-calc.js';

register('timing/calc', () => {
  const out = [];
  const m = (over) => ({ id: 'x', orden: 1, bloque: 'celebracion', titulo: 'T', inicio: '12:00', dur: 60, lugar: '', prov: '', nota: '', ...over });

  // Conversión de horas.
  out.push({ name: 'toMin 13:30 = 810', ok: toMin('13:30') === 810, detail: String(toMin('13:30')) });
  out.push({ name: 'toMin inválido = 0', ok: toMin('') === 0 && toMin('nope') === 0, detail: '' });
  out.push({ name: 'toHHMM 810 = 13:30', ok: toHHMM(810) === '13:30', detail: toHHMM(810) });
  out.push({ name: 'toHHMM envuelve 25:00 → 01:00', ok: toHHMM(1500) === '01:00', detail: toHHMM(1500) });
  out.push({ name: 'durLabel 135 = 2 h 15 min', ok: durLabel(135) === '2 h 15 min', detail: durLabel(135) });
  out.push({ name: 'durLabel 60 = 1 h', ok: durLabel(60) === '1 h', detail: durLabel(60) });
  out.push({ name: 'durLabel 45 = 45 min', ok: durLabel(45) === '45 min', detail: durLabel(45) });

  // Orden por campo orden.
  const desordenados = [m({ id: 'b', orden: 2 }), m({ id: 'a', orden: 1 })];
  out.push({ name: 'ordenar respeta el campo orden', ok: ordenar(desordenados).map((x) => x.id).join(',') === 'a,b', detail: '' });

  // Línea de tiempo con paso de medianoche.
  const noche = [m({ orden: 1, inicio: '23:20', dur: 180 }), m({ orden: 2, inicio: '02:30', dur: 30 })];
  const at = absTimes(noche);
  out.push({ name: 'absTimes: 23:20 → 1400', ok: at[0].absStart === 1400 && at[0].absEnd === 1580, detail: JSON.stringify(at[0]) });
  out.push({ name: 'absTimes suma 24 h al cruzar medianoche', ok: at[1].absStart === 1590, detail: JSON.stringify(at[1]) });

  // Encadenar: cada inicio = fin del anterior; el primero se mantiene.
  const enc = encadenar([m({ orden: 1, inicio: '12:00', dur: 30 }), m({ orden: 2, inicio: '15:00', dur: 90 }), m({ orden: 3, inicio: '20:00', dur: 60 })]);
  out.push({ name: 'encadenar mantiene el primero', ok: enc[0].inicio === '12:00', detail: enc[0].inicio });
  out.push({ name: 'encadenar recalcula en cascada (12:30, 14:00)', ok: enc[1].inicio === '12:30' && enc[2].inicio === '14:00', detail: `${enc[1].inicio},${enc[2].inicio}` });

  // Avisos: hueco y solape.
  const hueco = [m({ orden: 1, inicio: '12:00', dur: 30 }), m({ orden: 2, inicio: '13:00', dur: 30 })];
  const av1 = avisos(hueco);
  out.push({ name: 'avisos detecta hueco de 30 min', ok: av1.length === 1 && av1[0].tipo === 'hueco' && av1[0].mins === 30, detail: JSON.stringify(av1) });
  const solape = [m({ orden: 1, inicio: '12:00', dur: 60 }), m({ orden: 2, inicio: '12:30', dur: 30 })];
  const av2 = avisos(solape);
  out.push({ name: 'avisos detecta solape de 30 min', ok: av2.length === 1 && av2[0].tipo === 'solape' && av2[0].mins === 30, detail: JSON.stringify(av2) });
  const contiguo = [m({ orden: 1, inicio: '12:00', dur: 60 }), m({ orden: 2, inicio: '13:00', dur: 30 })];
  out.push({ name: 'avisos: contiguo no genera avisos', ok: avisos(contiguo).length === 0, detail: '' });

  // Resumen.
  const r = resumen(noche);
  out.push({ name: 'resumen: inicio 23:20, fin 03:00, span 220', ok: r.inicio === '23:20' && r.fin === '03:00' && r.span === 220 && r.n === 2, detail: JSON.stringify(r) });
  out.push({ name: 'resumen vacío', ok: resumen([]).n === 0, detail: '' });

  // Por bloque: agrupa, subtotal y rango.
  const varios = [
    m({ orden: 1, bloque: 'ceremonia', inicio: '13:00', dur: 40 }),
    m({ orden: 2, bloque: 'celebracion', inicio: '14:15', dur: 90 }),
    m({ orden: 3, bloque: 'celebracion', inicio: '15:45', dur: 135 }),
  ];
  const pb = porBloque(varios);
  out.push({ name: 'porBloque agrupa (2 bloques presentes)', ok: pb.length === 2 && pb[0].id === 'ceremonia' && pb[1].id === 'celebracion', detail: pb.map((b) => b.id).join(',') });
  out.push({ name: 'porBloque suma el subtotal (celebración = 225 min)', ok: pb[1].mins === 225, detail: String(pb[1].mins) });

  // Doble-reserva: mismo responsable en momentos solapados.
  const dr = dobleReserva([
    m({ id: 'a', orden: 1, inicio: '18:00', dur: 60, prov: 'p08', titulo: 'Baile' }),
    m({ id: 'b', orden: 2, inicio: '18:30', dur: 30, prov: 'p08', titulo: 'Barra' }),
    m({ id: 'c', orden: 3, inicio: '20:00', dur: 30, prov: 'p02', titulo: 'Fotos' }),
  ]);
  out.push({ name: 'dobleReserva detecta al mismo responsable solapado', ok: dr.length === 1 && dr[0].prov === 'p08', detail: JSON.stringify(dr) });
  const drNo = dobleReserva([
    m({ id: 'a', orden: 1, inicio: '18:00', dur: 30, prov: 'p08' }),
    m({ id: 'b', orden: 2, inicio: '18:30', dur: 30, prov: 'p08' }),
  ]);
  out.push({ name: 'dobleReserva: contiguo no es doble-reserva', ok: drNo.length === 0, detail: '' });

  // Por responsable.
  const pr = porResponsable([
    m({ id: 'a', orden: 1, prov: 'p08' }), m({ id: 'b', orden: 2, prov: '' }), m({ id: 'c', orden: 3, prov: 'p08' }),
  ]);
  const grpP08 = pr.find((g) => g.prov === 'p08');
  out.push({ name: 'porResponsable agrupa (p08 con 2)', ok: !!grpP08 && grpP08.items.length === 2, detail: JSON.stringify(pr.map((g) => [g.prov, g.items.length])) });

  // Regla de horas (marcas en punto).
  const rh = reglaHoras([m({ orden: 1, inicio: '13:00', dur: 40 }), m({ orden: 2, inicio: '14:15', dur: 90 })]);
  out.push({ name: 'reglaHoras: 13:00→15:45 da marcas 13..16 (4)', ok: rh.length === 4 && rh[0] === 780 && rh[3] === 960, detail: JSON.stringify(rh) });

  // Cuenta atrás.
  out.push({ name: 'diasHasta cuenta días', ok: diasHasta('2026-09-30', '2026-09-25') === 5, detail: String(diasHasta('2026-09-30', '2026-09-25')) });
  out.push({ name: 'diasHasta mismo día = 0', ok: diasHasta('2026-09-25', '2026-09-25') === 0, detail: '' });
  out.push({ name: 'diasHasta fecha inválida = null', ok: diasHasta('', '2026-09-25') === null, detail: '' });

  // Sello .ics (con salto de día al pasar de medianoche).
  out.push({ name: 'icsStamp 13:00 → 20270612T130000', ok: icsStamp('2027-06-12', 780) === '20270612T130000', detail: icsStamp('2027-06-12', 780) });
  out.push({ name: 'icsStamp 02:05 del día siguiente (1565 min)', ok: icsStamp('2027-06-12', 1565) === '20270613T020500', detail: icsStamp('2027-06-12', 1565) });

  // Iniciales.
  out.push({ name: 'iniciales de dos palabras', ok: iniciales('Carla Nieto Fotografía') === 'CN', detail: iniciales('Carla Nieto Fotografía') });
  out.push({ name: 'iniciales de una palabra', ok: iniciales('Bruma') === 'BR', detail: iniciales('Bruma') });

  // Estado del día en vivo.
  const dia = [
    m({ id: 'a', orden: 1, inicio: '13:00', dur: 40, titulo: 'Ceremonia' }),
    m({ id: 'b', orden: 2, inicio: '14:15', dur: 90, titulo: 'Cóctel' }),
  ];
  const eAntes = estadoDia(dia, 12 * 60); // 12:00, antes
  out.push({ name: 'estadoDia antes del inicio', ok: eAntes.state === 'antes' && eAntes.sigIdx === 0 && eAntes.mins === 60, detail: JSON.stringify(eAntes) });
  const eDur = estadoDia(dia, 13 * 60 + 20); // 13:20, en Ceremonia
  out.push({ name: 'estadoDia durante (actual=Ceremonia, siguiente=Cóctel)', ok: eDur.state === 'durante' && eDur.actualIdx === 0 && eDur.sigIdx === 1, detail: JSON.stringify(eDur) });
  const eFin = estadoDia(dia, 20 * 60); // 20:00, después
  out.push({ name: 'estadoDia después del fin', ok: eFin.state === 'despues' && eFin.progreso === 100, detail: JSON.stringify(eFin) });

  // Responsables sin contratar.
  const provs = [{ id: 'p1', nombre: 'Fotógrafo', estado: 'contratado' }, { id: 'p2', nombre: 'DJ', estado: 'presupuesto' }];
  const sc = responsablesSinContratar([
    m({ id: 'a', orden: 1, prov: 'p1' }), m({ id: 'b', orden: 2, prov: 'p2', titulo: 'Baile' }), m({ id: 'c', orden: 3, prov: 'p2' }),
  ], provs);
  out.push({ name: 'responsablesSinContratar detecta 1 (DJ, dedup)', ok: sc.length === 1 && sc[0].prov === 'p2' && sc[0].titulo === 'Baile', detail: JSON.stringify(sc) });

  return out;
});
