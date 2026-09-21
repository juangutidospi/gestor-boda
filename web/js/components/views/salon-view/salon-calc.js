/**
 * Lógica pura de la vista Salón: reparto de invitados confirmados en mesas. Stats,
 * ocupación por mesa, invitados sin asignar y geometría del plano (tamaño de mesa,
 * posiciones de las sillas y auto-organización). Sin DOM; recibe datos por parámetro.
 *
 * Solo se reparten invitados confirmados (`rsvp === 'confirmado'`).
 */

/** Personas que ocupa una invitación: titular + acompañantes. */
export function plazas(g) { return 1 + (Number(g.plus) || 0); }

/** Confirmados de la lista. */
export function confirmados(invitados) { return invitados.filter((g) => g.rsvp === 'confirmado'); }

/**
 * Tokens de color por lado (novia/novio). Solo referencias a tokens `--lado-*`.
 * @param {string} lado
 * @returns {{color:string, bg:string, ink:string}}
 */
export function ladoTokens(lado) {
  const key = lado === 'novia' ? 'novia' : 'novio';
  return { color: `var(--lado-${key})`, bg: `var(--lado-${key}-bg)`, ink: `var(--lado-${key}-ink)` };
}

/**
 * Ocupación de una mesa a partir de los confirmados asignados a ella.
 * @param {object} mesa
 * @param {object[]} confs Confirmados.
 * @returns {{asignados:object[], ocupadas:number, pct:number, sobra:boolean, exceso:number}}
 */
export function ocupacionMesa(mesa, confs) {
  const asignados = confs.filter((g) => g.mesa === mesa.id);
  const ocupadas = asignados.reduce((a, g) => a + plazas(g), 0);
  const cap = Number(mesa.capacidad) || 0;
  const pct = Math.min(100, cap ? Math.round((ocupadas / cap) * 100) : 0);
  return { asignados, ocupadas, pct, sobra: ocupadas > cap, exceso: Math.max(0, ocupadas - cap) };
}

/** Confirmados sin mesa asignada. */
export function sinAsignar(confs) { return confs.filter((g) => !g.mesa); }

/**
 * Las cuatro tarjetas de estadística (claves i18n + vars; la vista traduce).
 * @param {object[]} mesas
 * @param {object[]} invitados
 * @returns {Array<{key,label,value,note,noteVars}>}
 */
export function calcularStats(mesas, invitados) {
  const confs = confirmados(invitados);
  const totalPlazas = mesas.reduce((a, m) => a + (Number(m.capacidad) || 0), 0);
  const sentados = confs.filter((g) => g.mesa).reduce((a, g) => a + plazas(g), 0);
  const totalConf = confs.reduce((a, g) => a + plazas(g), 0);
  const porSentar = sinAsignar(confs).length;
  return [
    { key: 'mesas', label: 'salon.stat.mesas', value: mesas.length, note: 'salon.stat.mesas.note', noteVars: { plazas: totalPlazas } },
    { key: 'sentados', label: 'salon.stat.sentados', value: sentados, note: 'salon.stat.sentados.note', noteVars: { total: totalConf } },
    { key: 'porSentar', label: 'salon.stat.porSentar', value: porSentar, note: 'salon.stat.porSentar.note', noteVars: {} },
    { key: 'libres', label: 'salon.stat.libres', value: Math.max(0, totalPlazas - sentados), note: 'salon.stat.libres.note', noteVars: {} },
  ];
}

/**
 * Tamaño de la mesa en px según forma y capacidad.
 * @param {object} mesa
 * @returns {{rect:boolean, w:number, h:number}}
 */
export function mesaSize(mesa) {
  const rect = mesa.forma === 'rectangular';
  if (rect) return { rect: true, w: 250, h: 132 };
  const cap = Number(mesa.capacidad) || 0;
  const d = 156 + Math.max(0, cap - 6) * 15;
  return { rect: false, w: d, h: d };
}

/**
 * Posiciones de los `n` asientos sobre el borde de la mesa (elipse). Primer asiento
 * arriba. Devuelve, por asiento, el punto del asiento (`x,y`), el punto de la etiqueta
 * de nombre por fuera (`nx,ny`), el ángulo tangencial (`deg`) y el de encarado al centro
 * (`faceDeg`).
 * @param {object} mesa
 * @param {number} n
 * @returns {Array<{x:number, y:number, nx:number, ny:number, deg:number, faceDeg:number}>}
 */
export function sillasGeom(mesa, n) {
  if (n <= 0) return [];
  const { rect, w, h } = mesaSize(mesa);
  const rx = w / 2 - (rect ? 8 : 4);
  const ry = h / 2 - (rect ? 8 : 4);
  return Array.from({ length: n }, (_, i) => {
    const ang = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const x = cos * rx;
    const y = sin * ry;
    const r = Math.hypot(x, y) || 1;
    const deg = (ang * 180) / Math.PI + 90;
    return { x, y, nx: x + (x / r) * 30, ny: y + (y / r) * 30, deg, faceDeg: deg + 180 };
  });
}

/**
 * Recoloca las mesas: la rectangular (presidencial) arriba centrada; las redondas en
 * rejilla centrada. Devuelve una copia con `x,y` nuevos.
 * @param {object[]} mesas
 * @returns {object[]}
 */
export function autoOrganizar(mesas) {
  const otras = mesas.filter((m) => m.forma !== 'rectangular');
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(otras.length))));
  return mesas.map((m) => {
    if (m.forma === 'rectangular') return { ...m, x: 50, y: 19 };
    const i = otras.indexOf(m);
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, otras.length - row * cols);
    const idx = i % cols;
    const spread = 62;
    const x = 50 - spread / 2 + (inRow === 1 ? spread / 2 : (idx * spread) / (inRow - 1));
    return { ...m, x, y: 40 + row * 21 };
  });
}
