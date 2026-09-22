import { getGroup, get, set, setGroup } from './store.js';
import { SEED } from './seed.js';

/** @returns {string} Id corto y único. */
function newId(prefix) { return prefix + Math.random().toString(36).slice(2, 8); }

/**
 * Crea un repositorio de colección sobre un grupo del store. Los items se
 * guardan por id dentro del grupo.
 * @param {string} group Clave del grupo en el store.
 * @param {string} prefix Prefijo para ids nuevos.
 */
function collection(group, prefix) {
  return {
    /** @returns {object[]} Todos los items del grupo. */
    list() { return Object.values(getGroup(group)); },
    /** @param {string} id @returns {object|undefined} */
    get(id) { return get(group, id, undefined); },
    /**
     * Crea (si no trae id) o actualiza un item.
     * @param {object} entity
     * @returns {object} El item con su id.
     */
    upsert(entity) {
      const item = { ...entity };
      if (!item.id) item.id = newId(prefix);
      set(group, item.id, item);
      return item;
    },
    /** @param {string} id */
    remove(id) {
      const bag = { ...getGroup(group) };
      delete bag[id];
      setGroup(group, bag);
    },
  };
}

/** @returns {string[]} Las categorías de proveedor del seed. */
export function listaCategorias() { return SEED.categorias; }

export const fincasRepo = collection('fincas', 'f');
export const invitadosRepo = collection('invitados', 'g');
export const proveedoresRepo = collection('proveedores', 'p');
export const mesasRepo = collection('mesas', 'm');
/** Reglas de convivencia del salón: `{ id, tipo:'juntos'|'separados', a, b }`. */
export const reglasRepo = collection('reglas', 'r');

/** Presupuesto: un único registro bajo la clave 'main'. */
export const presupuestoRepo = {
  get() { return get('presupuesto', 'main', { limite: 0, partidas: [] }); },
  setLimite(n) { const p = this.get(); set('presupuesto', 'main', { ...p, limite: n }); },
  setPartidas(arr) { const p = this.get(); set('presupuesto', 'main', { ...p, partidas: arr }); },
};

/** Configuración de la app (guestCount, tema, idioma, vista por defecto). */
export const configRepo = {
  get() { return get('config', 'main', {}); },
  set(patch) { set('config', 'main', { ...this.get(), ...patch }); },
};

/** Siembra los datos del prototipo la primera vez (grupos vacíos). */
export function ensureSeeded() {
  if (!fincasRepo.list().length) {
    const byId = {};
    SEED.fincas.forEach((f) => { byId[f.id] = f; });
    setGroup('fincas', byId);
  }
  if (!invitadosRepo.list().length) {
    const byId = {};
    SEED.invitados.forEach((g) => { byId[g.id] = g; });
    setGroup('invitados', byId);
  }
  if (!proveedoresRepo.list().length) {
    const byId = {};
    SEED.proveedores.forEach((p) => { byId[p.id] = p; });
    setGroup('proveedores', byId);
  }
  if (!mesasRepo.list().length) {
    const byId = {};
    SEED.mesas.forEach((m) => { byId[m.id] = m; });
    setGroup('mesas', byId);
  }
  if (!presupuestoRepo.get().limite) set('presupuesto', 'main', SEED.presupuesto);
  if (!configRepo.get().guestCount) set('config', 'main', SEED.config);
}
