/**
 * Lógica pura de la vista Invitados: parseo de acompañantes, filtro, personas
 * (pax), círculos/menús presentes, agrupación por círculo, estadísticas y ciclo
 * de invitación. Sin DOM ni estado; recibe los datos por parámetro.
 */

const ORDEN_INV = ['sin enviar', 'enviada', 'recordatorio', 'respondida'];

/**
 * Convierte el textarea de acompañantes (un nombre por línea) en un array.
 * @param {string} text
 * @returns {string[]}
 */
export function parseAcomp(text) {
  return String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Personas que suma una invitación: el titular más sus acompañantes.
 * @param {object} invitado
 * @returns {number}
 */
export function pax(invitado) { return 1 + (Number(invitado.plus) || 0); }

/**
 * Filtra por lado, círculo, rsvp, invitación, menú y texto (nombre+nota+grupo).
 * @param {object[]} invitados
 * @param {{q,lado,grupo,rsvp,inv,menu}} filtros
 * @returns {object[]}
 */
export function filtrar(invitados, { q, lado, grupo, rsvp, inv, menu }) {
  const needle = (q || '').trim().toLowerCase();
  return invitados.filter((g) => {
    if (lado !== 'Todos' && g.lado !== lado) return false;
    if (grupo !== 'Todos' && g.grupo !== grupo) return false;
    if (rsvp !== 'Todos' && g.rsvp !== rsvp) return false;
    if (inv !== 'Todas' && (g.invitacion || 'sin enviar') !== inv) return false;
    if (menu === 'especiales' && (!g.menu || g.menu === 'Estándar')) return false;
    if (menu !== 'Todos' && menu !== 'especiales' && (g.menu || 'Estándar') !== menu) return false;
    if (!needle) return true;
    return `${g.nombre} ${g.nota || ''} ${g.grupo}`.toLowerCase().includes(needle);
  });
}

/** @param {object[]} invitados @returns {string[]} Círculos únicos, en orden de aparición. */
export function circulosDe(invitados) {
  const set = [];
  invitados.forEach((g) => { if (g.grupo && !set.includes(g.grupo)) set.push(g.grupo); });
  return set;
}

/** @param {object[]} invitados @returns {string[]} Menús únicos presentes. */
export function menusDe(invitados) {
  const set = [];
  invitados.forEach((g) => { const m = g.menu || 'Estándar'; if (!set.includes(m)) set.push(m); });
  return set;
}

/**
 * Agrupa los invitados por círculo (solo grupos con items), con subtotales.
 * @param {object[]} invitados Ya filtrados.
 * @returns {Array<{titulo,items,inv,pax,conf}>}
 */
export function agrupar(invitados) {
  return circulosDe(invitados).map((titulo) => {
    const items = invitados.filter((g) => g.grupo === titulo);
    return {
      titulo, items,
      inv: items.length,
      pax: items.reduce((a, g) => a + pax(g), 0),
      conf: items.filter((g) => g.rsvp === 'confirmado').length,
    };
  }).filter((gr) => gr.items.length > 0);
}

/**
 * Las siete tarjetas de estadística. Devuelve claves i18n + vars; el componente
 * traduce con t().
 * @param {object[]} invitados Todos (no filtrados).
 * @param {object|null} elegida Finca elegida (para el aforo), o null.
 * @returns {Array<{key,label,value,note,noteVars}>}
 */
export function calcularStats(invitados, elegida) {
  const head = invitados.reduce((a, g) => a + pax(g), 0);
  const confPax = invitados.filter((g) => g.rsvp === 'confirmado').reduce((a, g) => a + pax(g), 0);
  const pend = invitados.filter((g) => g.rsvp === 'pendiente').length;
  const ladoPax = (lado) => invitados.filter((g) => g.lado === lado).reduce((a, g) => a + pax(g), 0);
  return [
    { key: 'total', label: 'inv.stat.total', value: head, note: 'inv.stat.total.note', noteVars: { n: invitados.length } },
    { key: 'confirmados', label: 'inv.stat.confirmados', value: confPax, note: 'inv.stat.confirmados.note', noteVars: { n: pend } },
    { key: 'sinResponder', label: 'inv.stat.sinResponder', value: invitados.filter((g) => (g.invitacion || 'sin enviar') !== 'respondida').length, note: 'inv.stat.sinResponder.note', noteVars: { n: invitados.filter((g) => g.invitacion === 'recordatorio').length } },
    { key: 'menus', label: 'inv.stat.menus', value: invitados.filter((g) => g.menu && g.menu !== 'Estándar').length, note: 'inv.stat.menus.note', noteVars: {} },
    { key: 'novio', label: 'inv.stat.novio', value: ladoPax('novio'), note: 'inv.stat.lado.note', noteVars: {} },
    { key: 'novia', label: 'inv.stat.novia', value: ladoPax('novia'), note: 'inv.stat.lado.note', noteVars: {} },
    { key: 'aforo', label: 'inv.stat.aforo', value: elegida ? elegida.capSent : '—', note: elegida ? elegida.nombre : 'inv.stat.aforo.note.sin', noteVars: {}, noteRaw: !!elegida },
  ];
}

/**
 * Siguiente estado del ciclo de invitación.
 * @param {string} estado
 * @returns {string}
 */
export function siguienteInvitacion(estado) {
  const i = ORDEN_INV.indexOf(estado || 'sin enviar');
  return ORDEN_INV[(i + 1) % ORDEN_INV.length];
}

/**
 * Clave i18n de la acción del botón de invitación según el estado actual.
 * @param {string} estado
 * @returns {string}
 */
export function accionInvitacion(estado) {
  return estado === 'sin enviar' ? 'inv.inv.accion.enviada'
    : estado === 'enviada' ? 'inv.inv.accion.recordatorio'
      : estado === 'recordatorio' ? 'inv.inv.accion.respondida'
        : 'inv.inv.accion.reabrir';
}
