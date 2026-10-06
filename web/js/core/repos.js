import { getGroup, get, set, setGroup, removeItem } from './store.js';
import { SEED } from './seed.js';

/**
 * Id único. Usa UUID (crypto.randomUUID) para que los ids nuevos sean
 * compatibles con las claves primarias de la base de datos (Supabase).
 * @returns {string}
 */
function newId() {
  return (globalThis.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Crea un repositorio de colección sobre un grupo del store. Los items se
 * guardan por id dentro del grupo.
 * @param {string} group Clave del grupo en el store.
 */
function collection(group) {
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
      if (!item.id) item.id = newId();
      set(group, item.id, item);
      return item;
    },
    /** @param {string} id */
    remove(id) { removeItem(group, id); },
  };
}

/** Modo remoto: cuando está activo, ensureSeeded() no siembra el mock local. */
let remoteMode = false;
/** @param {boolean} on */
export function setRemoteMode(on) { remoteMode = on; }

/** @returns {string[]} Las categorías de proveedor del seed. */
export function listaCategorias() { return SEED.categorias; }

export const fincasRepo = collection('fincas');
export const invitadosRepo = collection('invitados');
export const proveedoresRepo = collection('proveedores');
export const mesasRepo = collection('mesas');
/** Reglas de convivencia del salón: `{ id, tipo:'juntos'|'separados', a, b }`. */
export const reglasRepo = collection('reglas');
/** Zonas del plano del salón: `{ id, tipo, x, y, w, h, rot }` (x,y en %; w,h en px). */
export const zonasRepo = collection('zonas');
/** Momentos del guion del día (Timing): `{ id, orden, bloque, titulo, inicio, dur, lugar, prov, nota }`. */
export const timingRepo = collection('timing');
/** Ajustes del salón: imagen de fondo del plano (data URL). */
export const salonRepo = {
  getBg() { return get('salon', 'bg', { url: '' }).url || ''; },
  setBg(url) { set('salon', 'bg', { url }); },
};

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

/** Siembra los datos del prototipo la primera vez (grupos vacíos). No hace nada
 *  en modo remoto: ahí los datos llegan de Supabase (ver remote.js). */
export function ensureSeeded() {
  if (remoteMode) return;
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
  if (!timingRepo.list().length && Array.isArray(SEED.timing)) {
    const byId = {};
    SEED.timing.forEach((m) => { byId[m.id] = m; });
    setGroup('timing', byId);
  }
  if (!presupuestoRepo.get().limite) set('presupuesto', 'main', SEED.presupuesto);
  if (!configRepo.get().guestCount) set('config', 'main', SEED.config);
}
