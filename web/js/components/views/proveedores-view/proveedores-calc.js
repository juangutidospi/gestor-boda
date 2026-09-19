/**
 * Lógica pura de la vista Proveedores: filtro, orden por categoría, estadísticas
 * y estado de los chips de categorías. Sin DOM; recibe datos por parámetro.
 */
import { eur, eurK } from '../../../core/money.js';

/**
 * @param {object[]} provs
 * @param {{q:string, categoria:string, estado:string}} filtros
 * @returns {object[]}
 */
export function filtrar(provs, { q, categoria, estado }) {
  const needle = (q || '').trim().toLowerCase();
  return provs.filter((p) => {
    if (categoria !== 'Todas' && p.categoria !== categoria) return false;
    if (estado !== 'Todos' && p.estado !== estado) return false;
    if (!needle) return true;
    return `${p.nombre} ${p.categoria} ${p.notas || ''} ${p.contacto || ''}`.toLowerCase().includes(needle);
  });
}

/**
 * Copia ordenada por el orden de `categorias`.
 * @param {object[]} provs
 * @param {string[]} categorias
 * @returns {object[]}
 */
export function ordenar(provs, categorias) {
  return [...provs].sort((a, b) => categorias.indexOf(a.categoria) - categorias.indexOf(b.categoria));
}

/**
 * Las cuatro tarjetas de estadística (claves i18n + vars; el componente traduce).
 * @param {object[]} provs
 * @param {string[]} categorias
 * @returns {Array<{key,label,value,note,noteVars,noteRaw}>}
 */
export function calcularStats(provs, categorias) {
  const contratados = provs.filter((p) => p.estado === 'contratado');
  const comprometido = contratados.reduce((a, p) => a + (Number(p.precio) || 0), 0);
  const pagado = provs.reduce((a, p) => a + (Number(p.senal) || 0), 0);
  const cubiertas = new Set(contratados.map((p) => p.categoria));
  const usadas = new Set(provs.filter((p) => p.estado !== 'descartado').map((p) => p.categoria));
  return [
    { key: 'contratados', label: 'prov.stat.contratados', value: `${contratados.length} / ${provs.length}`, note: 'prov.stat.contratados.note', noteVars: {}, noteRaw: false },
    { key: 'comprometido', label: 'prov.stat.comprometido', value: eurK(comprometido), note: 'prov.stat.comprometido.note', noteVars: {}, noteRaw: false },
    { key: 'senales', label: 'prov.stat.senales', value: eurK(pagado), note: 'prov.stat.senales.note', noteVars: {}, noteRaw: false },
    { key: 'cubiertas', label: 'prov.stat.cubiertas', value: `${cubiertas.size} / ${categorias.length}`, note: 'prov.stat.cubiertas.note', noteVars: { n: categorias.length - usadas.size }, noteRaw: false },
  ];
}

/**
 * Estado visual de cada categoría para los chips.
 * @param {object[]} provs
 * @param {string[]} categorias
 * @returns {Array<{categoria:string, estado:'cubierta'|'enMarcha'|'vacia'}>}
 */
export function chipsCategorias(provs, categorias) {
  const cubiertas = new Set(provs.filter((p) => p.estado === 'contratado').map((p) => p.categoria));
  const enMarcha = new Set(provs.filter((p) => p.estado !== 'descartado').map((p) => p.categoria));
  return categorias.map((categoria) => ({
    categoria,
    estado: cubiertas.has(categoria) ? 'cubierta' : (enMarcha.has(categoria) ? 'enMarcha' : 'vacia'),
  }));
}

export { eur, eurK };
