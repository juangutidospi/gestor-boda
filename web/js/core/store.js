const KEY = 'gestorboda.state';

/** Estado persistente, plano y con una clave por entidad. */
const EMPTY = { fincas: {}, invitados: {}, proveedores: {}, mesas: {}, presupuesto: {}, config: {}, ui: {} };

let state = load();

/** @returns {object} El estado guardado, o uno vacío. */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(EMPTY), ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return structuredClone(EMPTY);
  }
}

/** Escribe el estado; si el almacenamiento falla, la app sigue en memoria. */
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
}

/**
 * Lee un grupo del estado.
 * @param {keyof EMPTY} group
 * @returns {object} El mapa de ese grupo (no mutar).
 */
export function getGroup(group) { return state[group] ?? {}; }

/**
 * Lee un valor concreto.
 * @param {keyof EMPTY} group
 * @param {string} id
 * @param {*} [fallback]
 * @returns {*}
 */
export function get(group, id, fallback) {
  const bag = state[group];
  return bag && id in bag ? bag[id] : fallback;
}

/**
 * Guarda un valor y avisa a la app.
 * @param {keyof EMPTY} group
 * @param {string} id
 * @param {*} value
 */
export function set(group, id, value) {
  if (!state[group]) state[group] = {};
  state[group][id] = value;
  save();
  window.dispatchEvent(new CustomEvent('store:changed', { detail: { group, id, value } }));
}

/**
 * Conmuta un booleano.
 * @param {keyof EMPTY} group
 * @param {string} id
 * @param {boolean} [initial]
 * @returns {boolean} El valor nuevo.
 */
export function toggle(group, id, initial = false) {
  const next = !get(group, id, initial);
  set(group, id, next);
  return next;
}

/** Borra todo el estado. */
export function reset() {
  state = structuredClone(EMPTY);
  save();
  window.dispatchEvent(new CustomEvent('store:changed', { detail: { group: '*', id: '*', value: null } }));
}
