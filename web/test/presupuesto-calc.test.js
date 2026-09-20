import { register } from './runner.js';
import { calcularPresupuesto } from '../js/components/views/presupuesto-view/presupuesto-calc.js';

register('presupuesto/calc', () => {
  const out = [];
  const finca = (over) => ({ id: 'f', nombre: 'F', estado: 'candidata', menu: 100, alquiler: 5000, ...over });
  const prov = (over) => ({ id: 'p', nombre: 'N', categoria: 'Flores', estado: 'presupuesto', precio: 0, senal: 0, ...over });
  const invitado = (plus) => ({ id: 'g', plus });

  // Caso base: sin finca elegida (banquete estimado va a pendiente).
  const base = calcularPresupuesto({
    fincas: [finca({ id: 'a', estado: 'candidata', menu: 100, alquiler: 5000 })], // coste=5000+100*100=15000
    proveedores: [
      prov({ id: 'c', categoria: 'Fotografía', estado: 'contratado', precio: 2000, senal: 500 }),
      prov({ id: 'd', categoria: 'Flores', estado: 'presupuesto', precio: 1000 }),
      prov({ id: 'e', categoria: 'Catering', estado: 'contratado', precio: 8000 }), // banquete, no proveedores
    ],
    invitados: [invitado(0), invitado(1)], // cabezas = 3
    guestCount: 100,
    limite: 30000,
  });

  // contratado = provCont(2000) + fincaCoste(0, no elegida) = 2000
  out.push({ name: 'contratado = solo proveedores contratados (sin finca elegida)', ok: base.contratado === 2000, detail: String(base.contratado) });
  // banquete = fincaCoste(0) || cateringProv(8000) => 8000
  // pendiente = provPend(1000) + banquete(8000) = 9000
  out.push({ name: 'pendiente incluye banquete cuando no hay finca elegida', ok: base.pendiente === 9000, detail: String(base.pendiente) });
  out.push({ name: 'total = contratado + pendiente', ok: base.total === base.contratado + base.pendiente, detail: String(base.total) });
  out.push({ name: 'dif = limite - total', ok: base.dif === 30000 - base.total, detail: String(base.dif) });
  out.push({ name: 'sin exceso cuando total < limite', ok: base.exceso === 0, detail: String(base.exceso) });
  out.push({ name: 'senales suma todas', ok: base.senales === 500, detail: String(base.senales) });
  out.push({ name: 'cabezas = 1 + plus por invitado', ok: base.cabezas === 3, detail: String(base.cabezas) });

  // Bloque proveedores excluye catering y ordena por importe desc.
  const bloqueProv = base.bloques[1];
  const conceptos = bloqueProv.lineas.map((l) => l.concepto.r);
  out.push({ name: 'bloque proveedores excluye Catering', ok: !conceptos.includes('Catering'), detail: conceptos.join(',') });
  out.push({ name: 'bloque proveedores ordenado por importe desc', ok: conceptos[0] === 'Fotografía', detail: conceptos.join(',') });

  // Anchos de barra dentro de rango.
  out.push({ name: 'barContratado + barPrevisto <= 100', ok: base.barContratado + base.barPrevisto <= 100, detail: `${base.barContratado}+${base.barPrevisto}` });

  // Caso con finca elegida: pendiente NO incluye banquete.
  const elegidaCase = calcularPresupuesto({
    fincas: [finca({ id: 'a', estado: 'elegida', menu: 100, alquiler: 5000 })], // coste=15000
    proveedores: [prov({ id: 'd', categoria: 'Flores', estado: 'presupuesto', precio: 1000 })],
    invitados: [invitado(0)],
    guestCount: 100,
    limite: 30000,
  });
  // contratado = provCont(0) + fincaCoste(15000) = 15000; pendiente = provPend(1000) + 0 = 1000
  out.push({ name: 'con finca elegida: contratado incluye el banquete de la finca', ok: elegidaCase.contratado === 15000, detail: String(elegidaCase.contratado) });
  out.push({ name: 'con finca elegida: pendiente NO duplica banquete', ok: elegidaCase.pendiente === 1000, detail: String(elegidaCase.pendiente) });

  // Caso con exceso.
  const excesoCase = calcularPresupuesto({
    fincas: [],
    proveedores: [prov({ id: 'c', categoria: 'Fotografía', estado: 'contratado', precio: 5000 })],
    invitados: [invitado(0)],
    guestCount: 10,
    limite: 3000,
  });
  out.push({ name: 'exceso = total - limite cuando se pasa', ok: excesoCase.exceso === excesoCase.total - 3000 && excesoCase.difIsNeg, detail: `${excesoCase.exceso}/${excesoCase.dif}` });

  return out;
});
