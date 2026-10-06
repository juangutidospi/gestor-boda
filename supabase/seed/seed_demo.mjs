// ============================================================================
// seed_demo.mjs — Crea usuarios de demo y una boda demo con TODOS los datos mock.
//
// Fuente única de datos: web/js/core/seed.js (el mismo mock que usa la app en
// local). Se ejecuta con el SERVICE_ROLE (ignora RLS); NUNCA en el navegador.
//
// Uso:
//   cd supabase/seed && npm install
//   cp ../.env.example ../.env   # y rellena SUPABASE_URL + SERVICE_ROLE_KEY
//   node seed_demo.mjs
//
// Idempotente: borra la boda demo anterior (cascada) y la recrea.
// ============================================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Carga de .env (sin dependencias externas) ------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* usa variables ya presentes en el entorno */ }
}
loadEnv();

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoBoda2026!';
if (!URL || !SERVICE_KEY) {
  console.error('✗ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (revisa supabase/.env).');
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

// --- Mock: importado del propio seed de la app -----------------------------
const { SEED } = await import(resolve(__dirname, '../../web/js/core/seed.js'));

// Usuarios de demo (owner, colaborador, planner)
const DEMO_USERS = [
  { email: 'maria@demo.gestorboda.app',   full_name: 'Mónica Ibáñez',  role: 'owner' },
  { email: 'juan@demo.gestorboda.app',    full_name: 'Juan Gutiérrez', role: 'colaborador' },
  { email: 'planner@demo.gestorboda.app', full_name: 'Bea (planner)',  role: 'planner' },
];

/** Crea el usuario si no existe; devuelve su id. */
async function ensureUser({ email, full_name }) {
  // Busca por email entre los usuarios existentes (paginando).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { full_name },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log('→ Creando/recuperando usuarios de demo…');
  const ids = {};
  for (const u of DEMO_USERS) ids[u.email] = await ensureUser(u);
  const ownerId = ids['maria@demo.gestorboda.app'];

  // Borra la boda demo previa (cascada) para reejecución limpia.
  console.log('→ Limpiando boda demo anterior…');
  await admin.from('weddings').delete().eq('created_by', ownerId).eq('couple_names', 'Mónica & Juan');

  // Crea la boda demo.
  console.log('→ Creando boda demo…');
  const { data: wedding, error: wErr } = await admin.from('weddings').insert({
    couple_names: 'Mónica & Juan',
    wedding_date: '2027-06-12',
    guest_count: SEED.config.guestCount,
    budget_limit: SEED.presupuesto.limite,
    default_view: SEED.config.defaultView,
    created_by: ownerId,
  }).select('id').single();
  if (wErr) throw wErr;
  const wid = wedding.id;

  // Membresías.
  await admin.from('wedding_members').insert(
    DEMO_USERS.map((u) => ({ wedding_id: wid, user_id: ids[u.email], role: u.role })),
  );

  // Mesas (guardamos el mapa viejoId → uuid para resolver invitados.mesa).
  console.log('→ Sembrando mesas…');
  const mesaMap = {};
  for (const m of SEED.mesas) {
    const { data, error } = await admin.from('mesas').insert({
      wedding_id: wid, nombre: m.nombre, capacidad: m.capacidad, forma: m.forma, x: m.x, y: m.y,
    }).select('id').single();
    if (error) throw error;
    mesaMap[m.id] = data.id;
  }

  // Proveedores (mapa para resolver timing.prov).
  console.log('→ Sembrando proveedores…');
  const provMap = {};
  for (const p of SEED.proveedores) {
    const { data, error } = await admin.from('proveedores').insert({
      wedding_id: wid, nombre: p.nombre, categoria: p.categoria, estado: p.estado,
      precio: p.precio || 0, senal: p.senal || 0, contacto: p.contacto || null,
      telefono: p.telefono || null, notas: p.notas || null, fecha_pago: p.fechaPago || null,
      checklist: p.checklist || {},
    }).select('id').single();
    if (error) throw error;
    provMap[p.id] = data.id;
  }

  // Fincas.
  console.log('→ Sembrando fincas…');
  await admin.from('fincas').insert(SEED.fincas.map((f) => ({
    wedding_id: wid, nombre: f.nombre, tipo: f.tipo, zona: f.zona, km: f.km,
    cap_sent: f.capSent, cap_pie: f.capPie, menu: f.menu, alquiler: f.alquiler || 0,
    valoracion: f.valoracion, estado: f.estado,
    servicios: f.servicios || [], fechas: f.fechas || [], fotos: f.fotos || [],
    tour: f.tour || null, notas: f.notas || null, motivo: f.motivo || null,
  })));

  // Invitados (resuelve mesa_id).
  console.log('→ Sembrando invitados…');
  await admin.from('invitados').insert(SEED.invitados.map((g) => ({
    wedding_id: wid, nombre: g.nombre, lado: g.lado, grupo: g.grupo, rsvp: g.rsvp,
    plus: g.plus || 0, nota: g.nota || null, invitacion: g.invitacion, menu: g.menu || null,
    acompanantes: g.acompanantes || [], mesa_id: g.mesa ? mesaMap[g.mesa] || null : null,
  })));

  // Timing (resuelve prov_id).
  console.log('→ Sembrando timing…');
  await admin.from('timing').insert((SEED.timing || []).map((t) => ({
    wedding_id: wid, orden: t.orden, bloque: t.bloque, titulo: t.titulo, inicio: t.inicio,
    dur: t.dur || 0, lugar: t.lugar || null, prov_id: t.prov ? provMap[t.prov] || null : null,
    nota: t.nota || null,
  })));

  console.log('\n✓ Demo lista.');
  console.log(`  Boda: Mónica & Juan  (wedding_id=${wid})`);
  console.log('  Usuarios (contraseña en DEMO_PASSWORD):');
  for (const u of DEMO_USERS) console.log(`    · ${u.email}  [${u.role}]`);
}

main().catch((e) => { console.error('\n✗ Error sembrando:', e.message || e); process.exit(1); });
