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

/** Prioridad de estados para ordenar (los cerrados primero). */
export const ESTADO_ORDEN = ['contratado', 'presupuesto', 'contactado', 'pendiente', 'descartado'];

/**
 * Copia ordenada según el criterio elegido.
 * @param {object[]} provs
 * @param {string[]} categorias Orden natural de categorías (para 'categoria').
 * @param {'categoria'|'precio'|'senal'|'nombre'|'estado'} [orden='categoria']
 * @returns {object[]}
 */
export function ordenar(provs, categorias, orden = 'categoria') {
  const arr = [...provs];
  switch (orden) {
    case 'precio':
      return arr.sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
    case 'senal':
      return arr.sort((a, b) => (Number(b.senal) || 0) - (Number(a.senal) || 0));
    case 'nombre':
      return arr.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    case 'estado':
      return arr.sort((a, b) => ESTADO_ORDEN.indexOf(a.estado) - ESTADO_ORDEN.indexOf(b.estado));
    case 'categoria':
    default:
      return arr.sort((a, b) => categorias.indexOf(a.categoria) - categorias.indexOf(b.categoria));
  }
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

/** Pasos del checklist de contratación, en orden. */
export const CHECKLIST_STEPS = ['presupuesto', 'senal', 'contrato', 'confirmado'];

/**
 * Checklist de contratación de un proveedor: usa lo guardado y, si falta, deriva del
 * estado (presupuesto recibido / señal pagada / contrato firmado / confirmado día D).
 * @param {object} p
 * @returns {{presupuesto:boolean, senal:boolean, contrato:boolean, confirmado:boolean}}
 */
export function checklistDe(p) {
  const c = p.checklist || {};
  const val = (k, fallback) => (typeof c[k] === 'boolean' ? c[k] : fallback);
  return {
    presupuesto: val('presupuesto', p.estado === 'presupuesto' || p.estado === 'contratado'),
    senal: val('senal', Number(p.senal) > 0),
    contrato: val('contrato', p.estado === 'contratado'),
    confirmado: val('confirmado', false),
  };
}

/**
 * Progreso del checklist (pasos hechos / total).
 * @param {object} p
 * @returns {{done:number, total:number}}
 */
export function checklistProgreso(p) {
  const c = checklistDe(p);
  return { done: CHECKLIST_STEPS.filter((k) => c[k]).length, total: CHECKLIST_STEPS.length };
}

/**
 * Timeline de pagos pendientes: por cada contratado con saldo (precio − señal) > 0, una
 * entrada con su importe y fecha de pago. Ordenado por fecha (los sin fecha, al final).
 * @param {object[]} provs
 * @returns {{entradas:Array<{id,nombre,categoria,importe:number,fecha:string|null}>, totalPendiente:number, totalPagado:number}}
 */
export function timelinePagos(provs) {
  const contratados = provs.filter((p) => p.estado === 'contratado');
  const entradas = contratados
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      importe: Math.max(0, (Number(p.precio) || 0) - (Number(p.senal) || 0)),
      fecha: p.fechaPago || null,
    }))
    .filter((e) => e.importe > 0)
    .sort((a, b) => {
      if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha);
      if (a.fecha) return -1;
      if (b.fecha) return 1;
      return 0;
    });
  const totalPendiente = entradas.reduce((a, e) => a + e.importe, 0);
  const totalPagado = provs.reduce((a, p) => a + (Number(p.senal) || 0), 0);
  return { entradas, totalPendiente, totalPagado };
}

export { eur, eurK };
