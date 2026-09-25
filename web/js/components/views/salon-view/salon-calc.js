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
  if (mesa.forma === 'imperial') return { rect: true, w: 300, h: 78 };
  if (mesa.forma === 'rectangular') return { rect: true, w: 172, h: 92 };
  const cap = Number(mesa.capacidad) || 0;
  const d = 104 + Math.max(0, cap - 6) * 9;
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
 * Auto-sentado inteligente: reparte a los confirmados sin mesa manteniendo juntos los
 * grupos/círculos y sin superar la capacidad. Devuelve las asignaciones a aplicar.
 * @param {object[]} mesas
 * @param {object[]} invitados
 * @returns {Array<{id:string, mesa:string}>}
 */
export function autoSentar(mesas, invitados, reglas = []) {
  const confs = confirmados(invitados);
  const sumP = (arr) => arr.reduce((a, g) => a + plazas(g), 0);
  const byId = new Map(confs.map((g) => [g.id, g]));
  // Union-find: junta por grupo/círculo y por las reglas "sentar juntos".
  const parent = {};
  confs.forEach((g) => { parent[g.id] = g.id; });
  const find = (x) => { let r = x; while (parent[r] !== r) r = parent[r]; parent[x] = r; return r; };
  const union = (a, b) => { if (byId.has(a) && byId.has(b)) parent[find(a)] = find(b); };
  const primeroGrupo = {};
  confs.forEach((g) => { const k = g.grupo || `__${g.id}`; if (primeroGrupo[k]) union(g.id, primeroGrupo[k]); else primeroGrupo[k] = g.id; });
  reglas.filter((r) => r.tipo === 'juntos').forEach((r) => union(r.a, r.b));
  // "No sentar juntos": mapa de enemigos por invitado.
  const enemigos = {};
  reglas.filter((r) => r.tipo === 'separados').forEach((r) => {
    (enemigos[r.a] = enemigos[r.a] || new Set()).add(r.b);
    (enemigos[r.b] = enemigos[r.b] || new Set()).add(r.a);
  });
  const free = {};
  const ocupantes = {};
  mesas.forEach((m) => {
    const seated = confs.filter((g) => g.mesa === m.id);
    free[m.id] = Math.max(0, (Number(m.capacidad) || 0) - sumP(seated));
    ocupantes[m.id] = new Set(seated.map((g) => g.id));
  });
  // Grupos de sin-mesa (unidos por grupo + juntos), ordenados por tamaño.
  const grupos = {};
  confs.filter((g) => !g.mesa).forEach((g) => { const k = find(g.id); (grupos[k] = grupos[k] || []).push(g); });
  const ordenados = Object.values(grupos).sort((a, b) => sumP(b) - sumP(a));
  const asign = [];
  const chocaSeparados = (grupo, mesaId) => grupo.some((g) => [...(enemigos[g.id] || [])].some((e) => ocupantes[mesaId].has(e)));
  const place = (g, mesaId) => { asign.push({ id: g.id, mesa: mesaId }); free[mesaId] -= plazas(g); ocupantes[mesaId].add(g.id); };
  ordenados.forEach((grupo) => {
    const need = sumP(grupo);
    const cabe = (id) => free[id] >= need && !chocaSeparados(grupo, id);
    const juntos = mesas.map((m) => m.id).filter(cabe).sort((a, b) => free[a] - free[b])[0];
    if (juntos) { grupo.forEach((g) => place(g, juntos)); return; }
    grupo.forEach((g) => {
      const id = mesas.map((m) => m.id).filter((mid) => free[mid] >= plazas(g) && !chocaSeparados([g], mid)).sort((a, b) => free[b] - free[a])[0];
      if (id) place(g, id);
    });
  });
  return asign;
}

/**
 * Avisos de salud del plano: sobrecupo, invitados sin sentar, mesas vacías y reglas
 * de convivencia incumplidas.
 * @param {object[]} mesas
 * @param {object[]} invitados
 * @param {object[]} [reglas]
 * @returns {Array<{tipo:string, mesa?:string, texto:string, n?:number}>}
 */
export function saludPlano(mesas, invitados, reglas = []) {
  const confs = confirmados(invitados);
  const avisos = [];
  mesas.forEach((m) => {
    const oc = ocupacionMesa(m, confs);
    if (oc.sobra) avisos.push({ tipo: 'sobrecupo', mesa: m.id, n: oc.exceso, texto: m.nombre });
  });
  const porSentar = sinAsignar(confs).length;
  if (porSentar) avisos.push({ tipo: 'porSentar', n: porSentar, texto: '' });
  mesas.forEach((m) => {
    if (ocupacionMesa(m, confs).asignados.length === 0) avisos.push({ tipo: 'vacia', mesa: m.id, texto: m.nombre });
  });
  const mesaDe = (id) => confs.find((g) => g.id === id)?.mesa || null;
  reglas.forEach((r) => {
    const ma = mesaDe(r.a);
    const mb = mesaDe(r.b);
    const na = confs.find((g) => g.id === r.a)?.nombre || '';
    const nb = confs.find((g) => g.id === r.b)?.nombre || '';
    if (!ma || !mb) return;
    if (r.tipo === 'juntos' && ma !== mb) avisos.push({ tipo: 'reglaJuntos', mesa: ma, texto: `${na} · ${nb}` });
    if (r.tipo === 'separados' && ma === mb) avisos.push({ tipo: 'reglaSeparados', mesa: ma, texto: `${na} · ${nb}` });
  });
  return avisos;
}

/**
 * Resumen global de menús especiales (no estándar) de todos los confirmados, para la finca.
 * @param {object[]} invitados
 * @returns {Array<{menu:string, n:number}>}
 */
export function resumenGlobal(invitados) {
  const cuenta = {};
  confirmados(invitados).forEach((g) => {
    const m = (g.menu || '').trim();
    if (m && m.toLowerCase() !== 'estándar' && m.toLowerCase() !== 'estandar') cuenta[m] = (cuenta[m] || 0) + plazas(g);
  });
  return Object.entries(cuenta).map(([menu, n]) => ({ menu, n })).sort((a, b) => b.n - a.n);
}

/**
 * Resumen de una mesa para el catering: reparto por lado y menús especiales (no estándar).
 * @param {object[]} asignados Confirmados sentados en la mesa.
 * @returns {{novia:number, novio:number, menus:Array<{menu:string, n:number}>, especiales:number}}
 */
export function resumenMesa(asignados) {
  const novia = asignados.filter((g) => g.lado === 'novia').reduce((a, g) => a + plazas(g), 0);
  const novio = asignados.reduce((a, g) => a + plazas(g), 0) - novia;
  const cuenta = {};
  asignados.forEach((g) => {
    const m = (g.menu || '').trim();
    if (m && m.toLowerCase() !== 'estándar' && m.toLowerCase() !== 'estandar') cuenta[m] = (cuenta[m] || 0) + 1;
  });
  const menus = Object.entries(cuenta).map(([menu, n]) => ({ menu, n })).sort((a, b) => b.n - a.n);
  return { novia, novio, menus, especiales: menus.reduce((a, x) => a + x.n, 0) };
}

/**
 * ¿Se solapan dos rectángulos centrados (AABB, sin rotación)? Con holgura opcional:
 * un solape menor que `margin` en ambos ejes no cuenta.
 * @param {{cx:number,cy:number,w:number,h:number}} a
 * @param {{cx:number,cy:number,w:number,h:number}} b
 * @param {number} [margin]
 * @returns {boolean}
 */
export function rectsSolapan(a, b, margin = 0) {
  return Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - margin
    && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 - margin;
}

/**
 * Detecta solapes entre elementos del plano (mesas y zonas). Solo devuelve pares que
 * impliquen al menos una mesa (dos zonas superpuestas no son problema). Todos los
 * elementos en las mismas unidades (px del lienzo).
 * @param {Array<{id:string,nombre:string,kind:'mesa'|'zona',cx:number,cy:number,w:number,h:number}>} items
 * @param {number} [margin] Holgura para no avisar por roces mínimos.
 * @returns {Array<{a:object,b:object}>}
 */
export function detectarSolapes(items, margin = 8) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.kind !== 'mesa' && b.kind !== 'mesa') continue;
      if (rectsSolapan(a, b, margin)) out.push({ a, b });
    }
  }
  return out;
}

/**
 * Reparte `count` mesas en una rejilla dentro de `area`, saltando las celdas que chocan
 * con algún obstáculo (zonas: escenario, pista, barra…). Todo en las mismas unidades
 * (px del lienzo). Devuelve `count` centros `{cx,cy}` (o menos si no cabe).
 * @param {{cx:number,cy:number,w:number,h:number}} area  Área útil (centrada).
 * @param {number} count
 * @param {Array<{cx:number,cy:number,w:number,h:number}>} [obstaculos]
 * @param {{cw:number,ch:number}} [cell]  Tamaño de celda (mesa + separación).
 * @returns {Array<{cx:number,cy:number}>}
 */
export function autoDistribuir(area, count, obstaculos = [], cell = { cw: 150, ch: 150 }) {
  if (count <= 0) return [];
  const cols = Math.max(1, Math.floor(area.w / cell.cw));
  const rows = Math.ceil(count / cols);
  const gridW = cols * cell.cw;
  const gridH = rows * cell.ch;
  const ox = area.cx - gridW / 2 + cell.cw / 2;
  const oy = area.cy - gridH / 2 + cell.ch / 2;
  const foot = { w: cell.cw * 0.82, h: cell.ch * 0.82 };
  const libre = (s) => !obstaculos.some((o) => rectsSolapan({ cx: s.cx, cy: s.cy, ...foot }, o, 0));
  // Todas las celdas de una rejilla ampliada (filas extra por si sobran obstáculos).
  const all = [];
  for (let r = 0; r < rows + 8; r++) {
    for (let c = 0; c < cols; c++) all.push({ cx: ox + c * cell.cw, cy: oy + r * cell.ch });
  }
  const free = all.filter(libre);
  if (free.length >= count) return free.slice(0, count);
  // No caben esquivando todo: garantiza recolocar todas rellenando con celdas que rocen
  // una zona (el aviso de solape lo marcará para ajustarlas a mano).
  const picked = free.slice();
  for (const s of all) {
    if (picked.length >= count) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, count);
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
