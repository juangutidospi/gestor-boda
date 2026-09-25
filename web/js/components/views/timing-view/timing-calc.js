/**
 * Lógica pura de la vista Timing (guion del día): conversión de horas, orden de los
 * momentos, cálculo de la línea de tiempo (con paso de medianoche), encadenado de horas,
 * avisos de huecos/solapes y resumen. Sin DOM; recibe datos por parámetro.
 *
 * Cada momento: `{ id, orden, bloque, titulo, inicio:'HH:MM', dur:minutos, lugar, prov, nota }`.
 */

/** Bloques del día en orden, con su clave i18n e icono. */
export const BLOQUES = [
  { id: 'preparativos', icon: '💄' },
  { id: 'ceremonia', icon: '💍' },
  { id: 'celebracion', icon: '🥂' },
  { id: 'fiesta', icon: '🎉' },
];

/** @param {string} hhmm @returns {number} Minutos desde las 00:00 (0 si es inválido). */
export function toMin(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return 0;
  return (Number(m[1]) % 24) * 60 + Math.min(59, Number(m[2]));
}

/** @param {number} min @returns {string} 'HH:MM' (mod 24 h, con relleno de ceros). */
export function toHHMM(min) {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** @param {number} min @returns {string} Duración legible: '2 h 15 min', '45 min', '1 h'. */
export function durLabel(min) {
  const v = Math.max(0, Math.round(Number(min) || 0));
  const h = Math.floor(v / 60);
  const m = v % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Momentos ordenados por su campo `orden` (y por hora como desempate). */
export function ordenar(momentos) {
  return [...momentos].sort((a, b) => (a.orden - b.orden) || (toMin(a.inicio) - toMin(b.inicio)));
}

/**
 * Línea de tiempo absoluta: por cada momento (ya ordenado) su inicio/fin en minutos
 * continuos, sumando 24 h cuando una hora "retrocede" (la fiesta cruza la medianoche).
 * @param {object[]} momentos  Ordenados.
 * @returns {Array<{absStart:number, absEnd:number}>}
 */
export function absTimes(momentos) {
  let base = 0;
  let prevStart = -Infinity;
  return momentos.map((m) => {
    let s = toMin(m.inicio) + base;
    // Solo se considera "día siguiente" un retroceso grande (>12 h): la fiesta que cruza
    // la medianoche. Un retroceso pequeño es un reorden y se deja como solape.
    if (s < prevStart - 720) { base += 1440; s += 1440; }
    prevStart = Math.max(prevStart, s);
    const dur = Math.max(0, Number(m.dur) || 0);
    return { absStart: s, absEnd: s + dur };
  });
}

/**
 * Encadena las horas: cada momento empieza donde acaba el anterior (el primero mantiene
 * su hora). Devuelve una copia con `inicio` recalculado.
 * @param {object[]} momentos  Ordenados.
 * @returns {object[]}
 */
export function encadenar(momentos) {
  let cur = 0;
  return momentos.map((m, i) => {
    if (i === 0) { cur = toMin(m.inicio) + (Math.max(0, Number(m.dur) || 0)); return { ...m }; }
    const nm = { ...m, inicio: toHHMM(cur) };
    cur += Math.max(0, Number(m.dur) || 0);
    return nm;
  });
}

/**
 * Avisos entre momentos consecutivos: hueco (minutos muertos) o solape (se pisan).
 * @param {object[]} momentos  Ordenados.
 * @returns {Array<{tipo:'hueco'|'solape', idx:number, mins:number, a:string, b:string}>}
 */
export function avisos(momentos) {
  const at = absTimes(momentos);
  const out = [];
  for (let i = 1; i < momentos.length; i++) {
    const gap = at[i].absStart - at[i - 1].absEnd;
    if (gap > 0) out.push({ tipo: 'hueco', idx: i, mins: gap, a: momentos[i - 1].titulo, b: momentos[i].titulo });
    else if (gap < 0) out.push({ tipo: 'solape', idx: i, mins: -gap, a: momentos[i - 1].titulo, b: momentos[i].titulo });
  }
  return out;
}

/**
 * Resumen del guion: hora de inicio y fin, duración total (span) y nº de momentos.
 * @param {object[]} momentos  Ordenados.
 * @returns {{inicio:string, fin:string, span:number, n:number}}
 */
export function resumen(momentos) {
  if (!momentos.length) return { inicio: '', fin: '', span: 0, n: 0 };
  const at = absTimes(momentos);
  const start = at[0].absStart;
  const end = Math.max(...at.map((x) => x.absEnd));
  return { inicio: toHHMM(start), fin: toHHMM(end), span: end - start, n: momentos.length };
}

/** @param {string} nombre @returns {string} Iniciales (1-2 letras) del nombre. */
export function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '·';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/**
 * Estado del día en vivo respecto a la hora de reloj `clockMin` (minutos desde 00:00):
 * antes de empezar, momento en curso y siguiente, minutos hasta el siguiente y % de avance.
 * @param {object[]} momentos
 * @param {number} clockMin
 * @returns {{state:'antes'|'durante'|'despues'|'vacio', actualIdx:number, sigIdx:number, mins:number|null, progreso:number}}
 */
export function estadoDia(momentos, clockMin) {
  const list = ordenar(momentos);
  if (!list.length) return { state: 'vacio', actualIdx: -1, sigIdx: -1, mins: null, progreso: 0 };
  const at = absTimes(list);
  const dayStart = at[0].absStart;
  const dayEnd = Math.max(...at.map((x) => x.absEnd));
  let c = clockMin;
  if (c < dayStart - 720) c += 1440; // madrugada que pertenece al final del evento
  if (c < dayStart) return { state: 'antes', actualIdx: -1, sigIdx: 0, mins: dayStart - c, progreso: 0 };
  if (c >= dayEnd) return { state: 'despues', actualIdx: -1, sigIdx: -1, mins: null, progreso: 100 };
  const actualIdx = list.findIndex((_, i) => c >= at[i].absStart && c < at[i].absEnd);
  const sigIdx = list.findIndex((_, i) => at[i].absStart > c);
  const mins = sigIdx >= 0 ? at[sigIdx].absStart - c : null;
  const progreso = Math.round(((c - dayStart) / (dayEnd - dayStart)) * 100);
  return { state: 'durante', actualIdx, sigIdx, mins, progreso };
}

/**
 * Responsables (proveedores) asignados a algún momento que aún no están "contratado".
 * Uno por proveedor, con un momento de ejemplo.
 * @param {object[]} momentos
 * @param {object[]} proveedores
 * @returns {Array<{prov:string, nombre:string, estado:string, titulo:string}>}
 */
export function responsablesSinContratar(momentos, proveedores) {
  const byId = new Map(proveedores.map((p) => [p.id, p]));
  const vistos = new Set();
  const out = [];
  ordenar(momentos).forEach((m) => {
    if (!m.prov || vistos.has(m.prov)) return;
    const p = byId.get(m.prov);
    if (p && p.estado !== 'contratado') { vistos.add(m.prov); out.push({ prov: m.prov, nombre: p.nombre, estado: p.estado, titulo: m.titulo }); }
  });
  return out;
}

/**
 * Doble-reserva: un mismo responsable (prov) en dos momentos que se solapan en el tiempo.
 * @param {object[]} momentos
 * @returns {Array<{prov:string, a:string, b:string}>}
 */
export function dobleReserva(momentos) {
  const list = ordenar(momentos);
  const at = absTimes(list);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (!list[i].prov || list[i].prov !== list[j].prov) continue;
      if (at[i].absStart < at[j].absEnd && at[j].absStart < at[i].absEnd) {
        out.push({ prov: list[i].prov, a: list[i].titulo, b: list[j].titulo });
      }
    }
  }
  return out;
}

/**
 * Agrupa los momentos por responsable (los sin responsable van con clave '').
 * @param {object[]} momentos
 * @returns {Array<{prov:string, items:object[]}>}
 */
export function porResponsable(momentos) {
  const map = new Map();
  ordenar(momentos).forEach((m) => {
    const k = m.prov || '';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  });
  return [...map.entries()].map(([prov, items]) => ({ prov, items }));
}

/**
 * Marcas horarias (en minutos absolutos) para la regla del eje proporcional: cada hora
 * en punto entre el inicio y el fin del guion.
 * @param {object[]} momentos
 * @returns {number[]}
 */
export function reglaHoras(momentos) {
  if (!momentos.length) return [];
  const at = absTimes(ordenar(momentos));
  const start = at[0].absStart;
  const end = Math.max(...at.map((x) => x.absEnd));
  const marks = [];
  for (let mk = Math.floor(start / 60) * 60; mk <= Math.ceil(end / 60) * 60; mk += 60) marks.push(mk);
  return marks;
}

/**
 * Días entre hoy y la fecha de la boda (positivo = faltan, 0 = hoy, negativo = pasó).
 * @param {string} fechaISO 'YYYY-MM-DD'
 * @param {string} hoyISO 'YYYY-MM-DD'
 * @returns {number|null}
 */
export function diasHasta(fechaISO, hoyISO) {
  const d = new Date(`${fechaISO}T00:00:00`);
  const h = new Date(`${hoyISO}T00:00:00`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) return null;
  return Math.round((d - h) / 86400000);
}

/**
 * Sello de fecha-hora local para un evento .ics: fecha de la boda a las 00:00 + `absMin`
 * (que puede pasar de 24 h y saltar al día siguiente).
 * @param {string} fechaISO 'YYYY-MM-DD'
 * @param {number} absMin
 * @returns {string} 'YYYYMMDDTHHMMSS' (vacío si la fecha es inválida)
 */
export function icsStamp(fechaISO, absMin) {
  const base = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  base.setMinutes(base.getMinutes() + Math.round(absMin));
  const p = (n) => String(n).padStart(2, '0');
  return `${base.getFullYear()}${p(base.getMonth() + 1)}${p(base.getDate())}T${p(base.getHours())}${p(base.getMinutes())}00`;
}

/**
 * Reparte los momentos en sus bloques (en el orden de BLOQUES), con el subtotal de
 * duración y el rango horario de cada bloque presente.
 * @param {object[]} momentos  Ordenados.
 * @returns {Array<{id:string, icon:string, items:object[], mins:number, inicio:string, fin:string}>}
 */
export function porBloque(momentos) {
  const at = absTimes(momentos);
  return BLOQUES.map((b) => {
    const idxs = momentos.map((m, i) => (m.bloque === b.id ? i : -1)).filter((i) => i >= 0);
    if (!idxs.length) return null;
    const items = idxs.map((i) => momentos[i]);
    const mins = items.reduce((a, m) => a + Math.max(0, Number(m.dur) || 0), 0);
    const inicio = toHHMM(Math.min(...idxs.map((i) => at[i].absStart)));
    const fin = toHHMM(Math.max(...idxs.map((i) => at[i].absEnd)));
    return { id: b.id, icon: b.icon, items, mins, inicio, fin };
  }).filter(Boolean);
}
