/**
 * Lógica pura de la vista Presupuesto: cruza finca elegida/candidatas, proveedores e
 * invitados contra un límite editable y devuelve total previsto, contratado/pendiente,
 * margen/exceso, anchos de barra y los tres bloques con sus líneas. Sin DOM.
 *
 * Réplica exacta del cálculo del prototipo (regla clave: el catering es banquete, nunca
 * cuenta en el bloque de proveedores).
 *
 * Los textos se devuelven como referencias i18n: `{ k, v }` (clave + vars) o `{ r }`
 * (literal ya resuelto, p. ej. el nombre de una categoría). La vista los traduce.
 */
import { coste } from '../finca-view/finca-calc.js';
import { pax } from '../invitados-view/invitados-calc.js';
import { eur, eurK } from '../../../core/money.js';

/** @param {string} key @param {object} [vars] */
const K = (key, vars) => ({ k: key, v: vars });
/** @param {string} literal */
const R = (literal) => ({ r: literal });

/**
 * @param {{fincas:object[], proveedores:object[], invitados:object[], guestCount:number, limite:number}} input
 * @returns {object} Valores calculados + bloques para la vista.
 */
export function calcularPresupuesto({ fincas = [], proveedores = [], invitados = [], guestCount = 0, limite = 0 }) {
  const inv = Number(guestCount) || 0;
  const lim = Number(limite) || 0;
  const cabezas = invitados.reduce((a, g) => a + pax(g), 0);

  const esBanquete = (p) => p.categoria === 'Catering';
  const provContratados = proveedores.filter((p) => p.estado === 'contratado' && !esBanquete(p));
  const provPendientes = proveedores.filter((p) => (p.estado === 'presupuesto' || p.estado === 'contactado') && !esBanquete(p));
  const cateringProv = proveedores.filter(esBanquete).reduce((a, p) => a + (Number(p.precio) || 0), 0);
  const sumProv = (arr) => arr.reduce((a, p) => a + (Number(p.precio) || 0), 0);
  const provCont = sumProv(provContratados);
  const provPend = sumProv(provPendientes);
  const senales = proveedores.reduce((a, p) => a + (Number(p.senal) || 0), 0);

  const elegida = fincas.find((f) => f.estado === 'elegida') || null;
  const fincaCoste = elegida ? coste(elegida, inv) : 0;
  const candidatas = fincas.filter((f) => f.estado !== 'descartada' && f.estado !== 'elegida');
  const costesCand = candidatas.map((f) => coste(f, inv));
  const fincaPend = elegida ? 0 : (costesCand.length ? Math.round(costesCand.reduce((a, b) => a + b, 0) / costesCand.length) : 0);

  const banquete = fincaCoste || cateringProv || fincaPend;
  const contratado = provCont + fincaCoste;
  const pendiente = provPend + (fincaCoste ? 0 : banquete);
  const total = contratado + pendiente;
  const dif = lim - total;
  const exceso = Math.max(0, total - lim);
  const pc = (n) => Number((lim > 0 ? Math.min(100, Math.max(0, (n / lim) * 100)) : 0).toFixed(1));

  // ---- Bloque 1: Finca y banquete ----
  const lineasFinca = elegida
    ? [
      { concepto: R(elegida.nombre), detalle: K('pres.finca.banquete', { inv }), importe: eur(fincaCoste) },
      { concepto: K('pres.finca.senal'), detalle: K('pres.finca.senal.det'), importe: eur(fincaCoste * 0.25) },
      { concepto: K('pres.finca.porInv'), detalle: elegida.alquiler ? K('pres.finca.porInv.detAlq', { menu: elegida.menu }) : K('pres.finca.porInv.det', { menu: elegida.menu }), importe: inv ? eur(coste(elegida, inv) / inv) : '—' },
    ]
    : [
      { concepto: K('pres.finca.sinElegir'), detalle: K('pres.finca.sinElegir.det', { n: candidatas.length }), importe: '—' },
      { concepto: K('pres.finca.media'), detalle: K('pres.finca.media.det', { inv }), importe: fincaPend ? eur(fincaPend) : '—' },
      { concepto: K('pres.finca.barata'), detalle: costesCand.length ? K('pres.finca.barata.det') : K('pres.finca.barata.detVacio'), importe: costesCand.length ? eur(Math.min(...costesCand)) : '—' },
    ];
  if (cateringProv) {
    lineasFinca.push({ concepto: K('pres.finca.catering'), detalle: K('pres.finca.catering.det'), importe: eur(cateringProv) });
  }

  // ---- Bloque 2: Proveedores (por categoría, catering aparte) ----
  const porCat = {};
  proveedores.forEach((p) => {
    if (p.estado === 'descartado' || p.estado === 'pendiente') return;
    const k = p.categoria;
    porCat[k] = porCat[k] || { total: 0, cont: 0, n: 0 };
    porCat[k].total += Number(p.precio) || 0;
    porCat[k].n += 1;
    if (p.estado === 'contratado') porCat[k].cont += 1;
  });
  const lineasProv = Object.keys(porCat)
    .filter((k) => k !== 'Catering')
    .sort((a, b) => porCat[b].total - porCat[a].total)
    .map((k) => ({
      concepto: R(k),
      detalle: porCat[k].cont ? K(porCat[k].cont > 1 ? 'pres.prov.contratados' : 'pres.prov.contratado', { n: porCat[k].cont }) : K('pres.prov.porConfirmar'),
      importe: porCat[k].total ? eur(porCat[k].total) : '—',
    }));

  // ---- Bloque 3: Pagos y ratios ----
  const extras = [
    { concepto: K('pres.pagos.senales'), detalle: K('pres.pagos.senales.det'), importe: eur(senales) },
    { concepto: K('pres.pagos.pendiente'), detalle: K('pres.pagos.pendiente.det'), importe: eur(Math.max(0, contratado - senales)) },
    { concepto: K('pres.pagos.porInv'), detalle: K('pres.pagos.porInv.det', { inv }), importe: inv ? eur(total / inv) : '—' },
    { concepto: K('pres.pagos.enLista'), detalle: K('pres.pagos.enLista.det', { cabezas }), importe: cabezas ? eur(total / cabezas) : '—' },
    { concepto: K('pres.pagos.margen'), detalle: K('pres.pagos.margen.det'), importe: dif >= 0 ? eur(dif) : `-${eur(Math.abs(dif))}` },
  ];

  return {
    inv,
    cabezas,
    limite: lim,
    limiteLabel: eur(lim),
    total,
    totalLabel: eur(total),
    contratado,
    contratadoLabel: eur(contratado),
    pendiente,
    pendienteLabel: eur(pendiente),
    exceso,
    excesoLabel: exceso ? eur(exceso) : '0 €',
    senales,
    senalesLabel: eur(senales),
    dif,
    difLabel: dif >= 0 ? eur(dif) : `-${eur(Math.abs(dif))}`,
    difIsNeg: dif < 0,
    porInvitado: inv ? K('pres.total.porInv', { valor: eur(total / inv), inv, cabezas }) : K('pres.total.sinInv'),
    barContratado: pc(Math.min(contratado, lim)),
    barPrevisto: pc(Math.max(0, Math.min(total, lim) - contratado)),
    barExceso: pc(exceso),
    bloques: [
      { titulo: K('pres.bloque.finca'), total: eur(banquete), nota: elegida ? K('pres.bloque.finca.nota', { nombre: elegida.nombre }) : K('pres.bloque.finca.notaMedia'), lineas: lineasFinca },
      { titulo: K('pres.bloque.prov'), total: eur(provCont + provPend), nota: K('pres.bloque.prov.nota', { cont: provContratados.length, pend: provPendientes.length }), lineas: lineasProv },
      { titulo: K('pres.bloque.pagos'), total: eur(senales), nota: K('pres.bloque.pagos.nota'), lineas: extras },
    ],
    footerVars: { inv },
    // Contadores de insights (los usa la vista para las alertas accionables).
    nPorConfirmar: provPendientes.length,
    sinFinca: !elegida,
  };
}

export { eur, eurK };
