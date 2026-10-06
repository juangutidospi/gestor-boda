/**
 * Capa remota (Fase 3): hidrata el store desde Supabase al entrar en una boda y
 * refleja las escrituras locales a la base de datos (local-first / optimista).
 *
 * Enfoque: los repos siguen siendo síncronos sobre el store; aquí solo (1)
 * cargamos la boda al arrancar y (2) escuchamos `store:changed` para propagar
 * los cambios a Supabase en segundo plano. Los ids de la app son UUID (ver
 * repos.newId) para coincidir con las claves primarias de la BD.
 *
 * Grupos sincronizados: fincas, invitados, mesas, proveedores, timing + los
 * campos de la boda (config/presupuesto/salón). `reglas`/`zonas` del plano se
 * quedan en local en este incremento.
 */
import { getClient, isConfigured } from './supabase.js';
import { setGroup, set as storeSet } from './store.js';
import { setRemoteMode } from './repos.js';

/** Mapeo grupo ↔ tabla, con conversores fila→entidad y entidad→fila. */
const TABLES = {
  fincas: {
    table: 'fincas',
    fromRow: (r) => ({
      id: r.id, nombre: r.nombre, tipo: r.tipo, zona: r.zona, km: r.km,
      capSent: r.cap_sent, capPie: r.cap_pie, menu: r.menu, alquiler: r.alquiler,
      valoracion: r.valoracion == null ? undefined : Number(r.valoracion), estado: r.estado,
      servicios: r.servicios || [], fechas: r.fechas || [], fotos: r.fotos || [],
      tour: r.tour || undefined, notas: r.notas || '', motivo: r.motivo || '',
    }),
    toRow: (e, wid) => ({
      id: e.id, wedding_id: wid, nombre: e.nombre, tipo: e.tipo ?? null, zona: e.zona ?? null,
      km: e.km ?? null, cap_sent: e.capSent ?? null, cap_pie: e.capPie ?? null, menu: e.menu ?? null,
      alquiler: e.alquiler ?? 0, valoracion: e.valoracion ?? null, estado: e.estado ?? 'candidata',
      servicios: e.servicios || [], fechas: e.fechas || [], fotos: e.fotos || [],
      tour: e.tour ?? null, notas: e.notas ?? null, motivo: e.motivo ?? null,
    }),
  },
  mesas: {
    table: 'mesas',
    fromRow: (r) => ({ id: r.id, nombre: r.nombre, capacidad: r.capacidad, forma: r.forma, x: r.x, y: r.y }),
    toRow: (e, wid) => ({
      id: e.id, wedding_id: wid, nombre: e.nombre, capacidad: e.capacidad ?? 8,
      forma: e.forma ?? 'redonda', x: e.x ?? null, y: e.y ?? null,
    }),
  },
  invitados: {
    table: 'invitados',
    fromRow: (r) => ({
      id: r.id, nombre: r.nombre, lado: r.lado, grupo: r.grupo, rsvp: r.rsvp, plus: r.plus,
      nota: r.nota || '', invitacion: r.invitacion, menu: r.menu || '',
      acompanantes: r.acompanantes || [], mesa: r.mesa_id || undefined,
    }),
    toRow: (e, wid) => ({
      id: e.id, wedding_id: wid, nombre: e.nombre, lado: e.lado ?? null, grupo: e.grupo ?? null,
      rsvp: e.rsvp ?? 'pendiente', plus: e.plus ?? 0, nota: e.nota ?? null,
      invitacion: e.invitacion ?? 'sin enviar', menu: e.menu ?? null,
      acompanantes: e.acompanantes || [], mesa_id: e.mesa || null,
    }),
  },
  proveedores: {
    table: 'proveedores',
    fromRow: (r) => ({
      id: r.id, nombre: r.nombre, categoria: r.categoria, estado: r.estado, precio: r.precio,
      senal: r.senal, contacto: r.contacto || '', telefono: r.telefono || '', notas: r.notas || '',
      fechaPago: r.fecha_pago || undefined, checklist: r.checklist || {},
    }),
    toRow: (e, wid) => ({
      id: e.id, wedding_id: wid, nombre: e.nombre, categoria: e.categoria,
      estado: e.estado ?? 'pendiente', precio: e.precio ?? 0, senal: e.senal ?? 0,
      contacto: e.contacto ?? null, telefono: e.telefono ?? null, notas: e.notas ?? null,
      fecha_pago: e.fechaPago || null, checklist: e.checklist || {},
    }),
  },
  timing: {
    table: 'timing',
    fromRow: (r) => ({
      id: r.id, orden: r.orden, bloque: r.bloque, titulo: r.titulo, inicio: r.inicio,
      dur: r.dur, lugar: r.lugar || '', prov: r.prov_id || '', nota: r.nota || '',
    }),
    toRow: (e, wid) => ({
      id: e.id, wedding_id: wid, orden: e.orden ?? 0, bloque: e.bloque ?? 'preparativos',
      titulo: e.titulo, inicio: e.inicio ?? null, dur: e.dur ?? 0, lugar: e.lugar ?? null,
      prov_id: e.prov || null, nota: e.nota ?? null,
    }),
  },
};

let activeWeddingId = null;
let userId = null;

/** @returns {string|null} Id de la boda activa (tras hidratar). */
export function getActiveWeddingId() { return activeWeddingId; }

/**
 * Carga la boda del usuario en el store. Si no tiene ninguna, crea una vacía
 * (onboarding mínimo). Activa el modo remoto y arranca el espejo de escrituras.
 * @returns {Promise<boolean>} true si se hidrató (modo remoto activo)
 */
export async function hydrate() {
  if (!isConfigured()) return false;
  const sb = await getClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return false;
  userId = auth.user.id;

  // Boda activa: primera membresía; si no hay, se crea una.
  const { data: members, error: mErr } = await sb
    .from('wedding_members').select('wedding_id').eq('user_id', userId).limit(1);
  if (mErr) throw mErr;
  if (members && members.length) {
    activeWeddingId = members[0].wedding_id;
  } else {
    const { data: w, error: wErr } = await sb
      .from('weddings').insert({ couple_names: 'Nuestra boda', created_by: userId }).select('id').single();
    if (wErr) throw wErr;
    activeWeddingId = w.id;
    await sb.from('wedding_members').insert({ wedding_id: activeWeddingId, user_id: userId, role: 'owner' });
  }

  setRemoteMode(true);

  // 1) Cabecera de la boda → config / presupuesto / salón.
  const { data: wed } = await sb.from('weddings').select('*').eq('id', activeWeddingId).single();
  const { data: prof } = await sb.from('profiles').select('lang,theme').eq('id', userId).single();
  if (wed) {
    storeSet('config', 'main', {
      guestCount: wed.guest_count ?? 0,
      defaultView: wed.default_view ?? 'rejilla',
      novios: wed.couple_names ?? '',
      weddingDate: wed.wedding_date ?? '',
      theme: prof?.theme ?? 'light',
      lang: prof?.lang ?? 'es',
    });
    storeSet('presupuesto', 'main', { limite: wed.budget_limit ?? 0, partidas: [] });
    storeSet('salon', 'bg', { url: wed.salon_bg_url ?? '' });
  }

  // 2) Entidades por boda.
  for (const [group, map] of Object.entries(TABLES)) {
    const { data, error } = await sb.from(map.table).select('*').eq('wedding_id', activeWeddingId);
    if (error) throw error;
    const byId = {};
    for (const row of data) byId[row.id] = map.fromRow(row);
    setGroup(group, byId);
  }

  startMirror(sb);
  return true;
}

let mirrorOn = false;

/** Suscribe las escrituras del store y las refleja a Supabase (optimista). */
function startMirror(sb) {
  if (mirrorOn) return;
  mirrorOn = true;
  window.addEventListener('store:changed', (ev) => {
    const { group, id, value, op } = ev.detail || {};
    if (!activeWeddingId) return;
    const map = TABLES[group];
    // Entidades por boda
    if (map) {
      if (op === 'remove') {
        sb.from(map.table).delete().eq('id', id).then(reportErr);
      } else if (op === 'set' && value) {
        sb.from(map.table).upsert(map.toRow(value, activeWeddingId)).then(reportErr);
      }
      return;
    }
    // Cabecera de la boda (config/presupuesto/salón)
    if (group === 'config' && op === 'set' && value) {
      const patch = {};
      if ('guestCount' in value) patch.guest_count = value.guestCount;
      if ('defaultView' in value) patch.default_view = value.defaultView;
      if ('novios' in value) patch.couple_names = value.novios;
      if ('weddingDate' in value) patch.wedding_date = value.weddingDate || null;
      if (Object.keys(patch).length) sb.from('weddings').update(patch).eq('id', activeWeddingId).then(reportErr);
      // tema/idioma son del perfil
      const prof = {};
      if ('theme' in value) prof.theme = value.theme;
      if ('lang' in value) prof.lang = value.lang;
      if (Object.keys(prof).length && userId) sb.from('profiles').update(prof).eq('id', userId).then(reportErr);
    } else if (group === 'presupuesto' && op === 'set' && value) {
      sb.from('weddings').update({ budget_limit: value.limite ?? 0 }).eq('id', activeWeddingId).then(reportErr);
    } else if (group === 'salon' && op === 'set' && value && id === 'bg') {
      sb.from('weddings').update({ salon_bg_url: value.url || null }).eq('id', activeWeddingId).then(reportErr);
    }
  });
}

/** Registra en consola los errores de sincronización sin romper la UI. */
function reportErr({ error } = {}) {
  if (error) console.warn('[sync] no se pudo guardar en Supabase:', error.message || error);
}
