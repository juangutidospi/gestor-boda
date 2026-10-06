# Backend Supabase (PostgreSQL) — diseño

Fecha: 2026-10-06

## Objetivo
Dotar a gestor-boda de un backend real sobre Supabase (PostgreSQL gestionado):
usuarios con Supabase Auth, modelo multi-tenant (cada boda es un espacio
aislado con varios colaboradores) y RLS. Sustituye progresivamente el
`localStorage` actual.

## Decisiones
- **Motor:** PostgreSQL (vía Supabase). Sobra en eficiencia para el dominio
  (cientos de invitados/proveedores por boda); la eficiencia se asegura con
  índices por `wedding_id` y cargando cada boda de una vez.
- **Tenancy:** SaaS multiusuario. `weddings` = workspace; `wedding_members`
  relaciona usuarios y bodas con rol (`owner`/`planner`/`colaborador`).
- **Auth:** Supabase Auth (email+contraseña / magic link). Trigger crea
  `profiles` al registrarse; la boda se crea de forma explícita (onboarding/seeder).
- **Dinero:** euros enteros (`integer`). Valoración de finca `numeric(2,1)`.
  Arrays/anidados en `JSONB`.
- **Integridad:** `CHECK` para enums, FKs `ON DELETE CASCADE`/`SET NULL`,
  `updated_at` por trigger, índices en claves de filtrado.
- **RLS sin recursión:** función `is_wedding_member(wedding_id)` `SECURITY
  DEFINER` usada por las políticas (evita el bucle clásico de `wedding_members`).

## Tablas
`profiles`, `weddings`, `wedding_members`, `prov_categorias` (catálogo global),
`fincas`, `mesas`, `invitados`, `proveedores`, `timing` — las cinco últimas con
`wedding_id`.

## Entrega por fases
1. **BBDD (esta entrega):** migraciones SQL (`supabase/migrations/`) + seeder de
   demo (`supabase/seed/seed_demo.mjs`) que crea usuarios demo y una boda con
   todos los datos mock (importa `web/js/core/seed.js` como fuente única).
2. **Auth en el frontend:** cliente `@supabase/supabase-js`, login/registro,
   sesión. Config pública: `SUPABASE_URL` + `anon key`.
3. **Persistencia:** hidratar el `store` al entrar en una boda + escritura
   diferida a Supabase, sección por sección. Opcional: Realtime.

## Validación local
- Dry-run del mapeo del seeder: 4 mesas, 9 fincas, 15 invitados, 14 proveedores,
  13 timing; enums válidos y sin referencias huérfanas.
- SQL ejecutable en el SQL Editor de Supabase (no validado contra un servidor
  local por no haber PostgreSQL server instalado, solo cliente).
