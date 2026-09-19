/** Formato monetario compartido (locale es-ES). */

/**
 * @param {number} n
 * @returns {string} Importe con separador de miles, p. ej. "1.234 €".
 */
export function eur(n) { return Math.round(n).toLocaleString('es-ES', { useGrouping: true }) + ' €'; }

/**
 * @param {number} n
 * @returns {string} En miles con una decimal si >= 10000, si no como eur().
 */
export function eurK(n) {
  return n >= 10000
    ? (Math.round(n / 100) / 10).toLocaleString('es-ES', { minimumFractionDigits: 1 }) + 'k €'
    : eur(n);
}
