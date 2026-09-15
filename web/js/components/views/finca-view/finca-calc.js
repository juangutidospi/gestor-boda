/**
 * Lógica pura de la vista Finca: cálculo de coste, formateo monetario, filtro,
 * orden, estadísticas y filas del comparador. Sin DOM ni dependencias de estado;
 * recibe los datos por parámetro para poder testearse en aislamiento.
 */

/**
 * Formatea un importe en euros con separador de miles es-ES.
 * @param {number} n
 * @returns {string}
 */
export function eur(n) { return Math.round(n).toLocaleString('es-ES', { useGrouping: true }) + ' €'; }

/**
 * Formatea un importe: en miles con una decimal si es >= 10000, si no como eur().
 * @param {number} n
 * @returns {string}
 */
export function eurK(n) {
  return n >= 10000
    ? (Math.round(n / 100) / 10).toLocaleString('es-ES', { minimumFractionDigits: 1 }) + 'k €'
    : eur(n);
}

/**
 * Coste estimado de una finca para un nº de invitados.
 * @param {object} finca
 * @param {number} invitados
 * @returns {number}
 */
export function coste(finca, invitados) { return (finca.alquiler || 0) + (finca.menu || 0) * invitados; }

/**
 * Filtra por tipo, estado y texto (nombre + zona + notas).
 * @param {object[]} fincas
 * @param {{q: string, tipo: string, estado: string}} filtros
 * @returns {object[]}
 */
export function filtrar(fincas, { q, tipo, estado }) {
  const needle = (q || '').trim().toLowerCase();
  return fincas.filter((f) => {
    if (tipo !== 'Todos' && f.tipo !== tipo) return false;
    if (estado !== 'Todos' && f.estado !== estado) return false;
    if (!needle) return true;
    return `${f.nombre} ${f.zona} ${f.notas || ''}`.toLowerCase().includes(needle);
  });
}

/**
 * Devuelve una copia ordenada según el criterio.
 * @param {object[]} fincas
 * @param {string} sort
 * @param {number} invitados
 * @returns {object[]}
 */
export function ordenar(fincas, sort, invitados) {
  const cmp = {
    valoracion: (a, b) => b.valoracion - a.valoracion,
    'coste-asc': (a, b) => coste(a, invitados) - coste(b, invitados),
    'coste-desc': (a, b) => coste(b, invitados) - coste(a, invitados),
    aforo: (a, b) => b.capSent - a.capSent,
    km: (a, b) => a.km - b.km,
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  }[sort] || ((a, b) => 0);
  return [...fincas].sort(cmp);
}

/**
 * Lista de tipos para el filtro: 'Todos' más los tipos únicos presentes.
 * @param {object[]} fincas
 * @returns {string[]}
 */
export function tiposDe(fincas) {
  const set = [];
  fincas.forEach((f) => { if (!set.includes(f.tipo)) set.push(f.tipo); });
  return ['Todos', ...set];
}

/**
 * Calcula las cinco tarjetas de estadística. Devuelve claves i18n + vars; el
 * componente traduce con t().
 * @param {object[]} fincas
 * @param {number} invitados
 * @returns {Array<{key: string, label: string, note: string, noteVars: object, value: string|number}>}
 */
export function calcularStats(fincas, invitados) {
  const activas = fincas.filter((f) => f.estado !== 'descartada');
  const costes = activas.map((f) => coste(f, invitados));
  const media = costes.length ? costes.reduce((a, b) => a + b, 0) / costes.length : 0;
  return [
    { key: 'seguimiento', label: 'finca.stat.seguimiento', value: activas.length, note: 'finca.stat.seguimiento.note', noteVars: { total: fincas.length } },
    { key: 'favoritas', label: 'finca.stat.favoritas', value: fincas.filter((f) => f.estado === 'favorita').length, note: 'finca.stat.favoritas.note', noteVars: {} },
    { key: 'costeMedio', label: 'finca.stat.costeMedio', value: costes.length ? eurK(media) : '—', note: 'finca.stat.costeMedio.note', noteVars: { inv: invitados } },
    { key: 'rango', label: 'finca.stat.rango', value: costes.length ? `${eurK(Math.min(...costes))} – ${eurK(Math.max(...costes))}` : '—', note: 'finca.stat.rango.note', noteVars: {} },
    { key: 'descartadas', label: 'finca.stat.descartadas', value: fincas.filter((f) => f.estado === 'descartada').length, note: 'finca.stat.descartadas.note', noteVars: {} },
  ];
}

/**
 * Filas del comparador con la celda de mejor valor marcada (win=true).
 * @param {object[]} seleccion Fincas a comparar (máx 4).
 * @param {number} invitados
 * @returns {Array<{key: string, label: string, cells: Array<{txt: string, win: boolean}>}>}
 */
export function filasComparador(seleccion, invitados) {
  const defs = [
    { key: 'coste', label: 'finca.compare.row.coste', get: (f) => coste(f, invitados), fmt: (v) => eur(v), best: 'min' },
    { key: 'menu', label: 'finca.compare.row.menu', get: (f) => f.menu, fmt: (v) => `${v} €`, best: 'min' },
    { key: 'alquiler', label: 'finca.compare.row.alquiler', get: (f) => f.alquiler, fmt: (v) => (v ? eur(v) : 'finca.compare.incluido'), best: 'min' },
    { key: 'aforo', label: 'finca.compare.row.aforo', get: (f) => f.capSent, fmt: (v) => `${v}`, best: 'max' },
    { key: 'val', label: 'finca.compare.row.val', get: (f) => f.valoracion, fmt: (v) => v.toString().replace('.', ','), best: 'max' },
    { key: 'km', label: 'finca.compare.row.km', get: (f) => f.km, fmt: (v) => `${v} km`, best: 'min' },
  ];
  return defs.map((d) => {
    const vals = seleccion.map((f) => d.get(f));
    const winner = d.best === 'min' ? Math.min(...vals) : Math.max(...vals);
    return {
      key: d.key,
      label: d.label,
      cells: seleccion.map((f) => ({ txt: d.fmt(d.get(f)), win: d.get(f) === winner })),
    };
  });
}
