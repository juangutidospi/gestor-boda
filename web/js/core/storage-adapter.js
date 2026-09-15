/**
 * Adaptador de imágenes. En la Fase 0 solo hay implementación local; la Fase 7
 * añadirá un SupabaseAdapter con la misma interfaz sin tocar las vistas.
 *
 * @typedef {Object} StorageAdapter
 * @property {(file: File, key: string) => Promise<string>} put
 * @property {(key: string) => string} url
 * @property {(key: string) => Promise<void>} remove
 */

/** @type {Map<string, string>} clave → objectURL de sesión. */
const local = new Map();

/** @type {StorageAdapter} Guarda las subidas como object URLs de sesión. */
export const LocalAdapter = {
  /**
   * Registra un fichero y devuelve una URL usable en <img src>.
   * @param {File} file
   * @param {string} key
   * @returns {Promise<string>}
   */
  async put(file, key) {
    const objectUrl = URL.createObjectURL(file);
    local.set(key, objectUrl);
    return objectUrl;
  },

  /**
   * URL servible para una clave. Si la clave ya es una URL http(s) o blob, se
   * devuelve tal cual (las fotos sembradas del prototipo son URLs remotas).
   * @param {string} key
   * @returns {string}
   */
  url(key) {
    if (/^(https?:|blob:|data:)/.test(key)) return key;
    return local.get(key) ?? key;
  },

  /**
   * Libera y olvida una subida de sesión.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async remove(key) {
    const u = local.get(key);
    if (u) { URL.revokeObjectURL(u); local.delete(key); }
  },
};

/** Implementación activa. */
export const storage = LocalAdapter;
