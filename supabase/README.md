# Supabase — base de datos de gestor-boda

Backend PostgreSQL (Supabase) con usuarios, modelo multi-tenant (cada boda es un
espacio aislado) y RLS. Esta carpeta contiene **la Fase 1**: esquema + seguridad
+ seeder de demo. La app sigue usando `localStorage` hasta la Fase 3.

## Contenido

```
supabase/
├─ migrations/
│  ├─ 0001_init.sql      Tablas, tipos (CHECK), índices, updated_at, catálogo
│  ├─ 0002_rls.sql       Row Level Security (función is_wedding_member sin recursión)
│  ├─ 0003_new_user.sql  Trigger: alta de profile al registrarse
│  ├─ 0004_salon.sql     Plano del salón: mesas.rot, tablas reglas y zonas (+RLS)
│  └─ 0005_extras.sql    fincas.senal y weddings.settings (claves de config varias)
├─ seed/
│  ├─ seed_demo.mjs      Crea usuarios demo + boda demo con TODOS los datos mock
│  └─ package.json
├─ .env.example          Plantilla de credenciales (copiar a .env)
└─ README.md
```

## Modelo de datos

- `profiles` — 1 fila por usuario (`auth.users`).
- `weddings` — el espacio de trabajo (novios, fecha, nº invitados, límite de presupuesto…).
- `wedding_members` — pertenencia usuario ↔ boda con rol (`owner` / `planner` / `colaborador`).
- `fincas`, `mesas`, `invitados`, `proveedores`, `timing` — entidades, todas con `wedding_id`.
- `prov_categorias` — catálogo de categorías (referencia global de solo lectura).

Dinero en **euros enteros** (`integer`). Valoración de finca en `numeric(2,1)`.
Arrays/anidados (servicios, fotos, acompañantes, checklist…) en `JSONB`.

## Seguridad (RLS)

- RLS activa en todas las tablas: **solo ves/escribes filas de una boda de la que eres miembro**.
- La pertenencia se comprueba con `public.is_wedding_member(wedding_id)`, una función
  `SECURITY DEFINER` que consulta `wedding_members` saltándose la RLS → evita la
  recursión de políticas (fallo clásico en Supabase).
- El `service_role` ignora RLS: úsalo **solo** en el seeder/backend, nunca en el navegador.

## Puesta en marcha

### 1. Ejecutar las migraciones

En el panel de Supabase → **SQL Editor**, ejecuta en orden el contenido de:

1. `migrations/0001_init.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_new_user.sql`
4. `migrations/0004_salon.sql`
5. `migrations/0005_extras.sql`

(O con la CLI de Supabase: `supabase db push` si enlazas esta carpeta.)

Son idempotentes: puedes reejecutarlas sin romper nada.

### 2. Sembrar la demo (usuarios + datos mock)

```bash
cd supabase/seed
npm install
cp ../.env.example ../.env
# edita ../.env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (Settings → API)
node seed_demo.mjs
```

Crea tres usuarios de demo (contraseña por defecto `DemoBoda2026!`):

| Email                          | Rol         |
|--------------------------------|-------------|
| maria@demo.gestorboda.app      | owner       |
| juan@demo.gestorboda.app       | colaborador |
| planner@demo.gestorboda.app    | planner     |

…y una boda **“Mónica & Juan”** rellena con los mismos datos que la app usa en
local (fincas, invitados, proveedores, mesas, timing). Reejecutable: borra la
boda demo anterior (en cascada) y la recrea.

## Siguientes fases (no incluidas aquí)

- **Fase 2** — Cliente `@supabase/supabase-js` en el frontend, pantalla de
  login/registro y gestión de sesión. (`SUPABASE_URL` + `anon key` como config pública.)
- **Fase 3** — Migrar la persistencia: hidratar el `store` al entrar en una boda
  y escritura diferida a Supabase, sección por sección. Opcional: Realtime para
  colaboración en vivo.
