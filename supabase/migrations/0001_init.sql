-- ============================================================================
-- 0001_init.sql — Esquema base de gestor-boda (PostgreSQL / Supabase)
--
-- Modelo multi-tenant (SaaS): cada "boda" (wedding) es un espacio aislado con
-- varios colaboradores. Todas las entidades cuelgan de una boda por wedding_id.
-- Dinero en EUROS ENTEROS (integer). Valoración de finca en numeric(2,1).
-- Idempotente: usa IF NOT EXISTS y DO-blocks para poder reejecutarse.
-- ============================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — 1 fila por usuario de auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  lang        text not null default 'es'   check (lang in ('es','en')),
  theme       text not null default 'light' check (theme in ('light','dark')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- weddings — el espacio de trabajo (sustituye config + presupuesto.limite)
-- ----------------------------------------------------------------------------
create table if not exists public.weddings (
  id            uuid primary key default gen_random_uuid(),
  couple_names  text not null default 'Nuestra boda',
  wedding_date  date,
  guest_count   integer not null default 140 check (guest_count >= 0),
  budget_limit  integer not null default 0   check (budget_limit >= 0), -- euros
  default_view  text not null default 'rejilla',
  salon_bg_url  text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- wedding_members — pertenencia usuario ↔ boda (base de la seguridad)
-- ----------------------------------------------------------------------------
create table if not exists public.wedding_members (
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner','planner','colaborador')),
  created_at  timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create index if not exists idx_wedding_members_user on public.wedding_members(user_id, wedding_id);

-- ----------------------------------------------------------------------------
-- prov_categorias — catálogo de categorías de proveedor (referencia global)
-- ----------------------------------------------------------------------------
create table if not exists public.prov_categorias (
  id      smallint primary key,
  nombre  text not null unique,
  orden   smallint not null
);

-- ----------------------------------------------------------------------------
-- fincas (venues)
-- ----------------------------------------------------------------------------
create table if not exists public.fincas (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  nombre      text not null,
  tipo        text,
  zona        text,
  km          integer,
  cap_sent    integer,
  cap_pie     integer,
  menu        integer,            -- €/invitado
  alquiler    integer not null default 0, -- € fijos
  valoracion  numeric(2,1) check (valoracion between 0 and 9.9),
  estado      text not null default 'candidata'
                check (estado in ('favorita','candidata','descartada','elegida')),
  servicios   jsonb not null default '[]'::jsonb,
  fechas      jsonb not null default '[]'::jsonb,
  fotos       jsonb not null default '[]'::jsonb,
  tour        jsonb,
  notas       text,
  motivo      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_fincas_wedding on public.fincas(wedding_id);
create index if not exists idx_fincas_estado  on public.fincas(wedding_id, estado);

-- ----------------------------------------------------------------------------
-- mesas (del salón)  — se crean antes que invitados por la FK mesa_id
-- ----------------------------------------------------------------------------
create table if not exists public.mesas (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  nombre      text not null,
  capacidad   integer not null default 8 check (capacidad >= 0),
  forma       text not null default 'redonda' check (forma in ('redonda','rectangular')),
  x           integer,            -- posición en el plano (%)
  y           integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_mesas_wedding on public.mesas(wedding_id);

-- ----------------------------------------------------------------------------
-- invitados
-- ----------------------------------------------------------------------------
create table if not exists public.invitados (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  nombre       text not null,
  lado         text check (lado in ('novia','novio')),
  grupo        text,
  rsvp         text not null default 'pendiente'
                 check (rsvp in ('confirmado','pendiente','no')),
  plus         integer not null default 0 check (plus >= 0), -- acompañantes extra
  nota         text,
  invitacion   text not null default 'sin enviar'
                 check (invitacion in ('sin enviar','enviada','recordatorio','respondida')),
  menu         text,
  acompanantes jsonb not null default '[]'::jsonb, -- nombres de acompañantes
  mesa_id      uuid references public.mesas(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_invitados_wedding on public.invitados(wedding_id);
create index if not exists idx_invitados_rsvp    on public.invitados(wedding_id, rsvp);
create index if not exists idx_invitados_mesa     on public.invitados(mesa_id);

-- ----------------------------------------------------------------------------
-- proveedores
-- ----------------------------------------------------------------------------
create table if not exists public.proveedores (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  nombre      text not null,
  categoria   text not null,
  estado      text not null default 'pendiente'
                check (estado in ('contratado','presupuesto','contactado','pendiente','descartado')),
  precio      integer not null default 0 check (precio >= 0), -- €
  senal       integer not null default 0 check (senal  >= 0), -- €
  contacto    text,
  telefono    text,
  notas       text,
  fecha_pago  date,
  checklist   jsonb not null default '{}'::jsonb, -- {presupuesto,senal,contrato,confirmado}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_proveedores_wedding on public.proveedores(wedding_id);
create index if not exists idx_proveedores_estado  on public.proveedores(wedding_id, estado);
create index if not exists idx_proveedores_cat     on public.proveedores(wedding_id, categoria);

-- ----------------------------------------------------------------------------
-- timing (guion del día)
-- ----------------------------------------------------------------------------
create table if not exists public.timing (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  orden       integer not null default 0,
  bloque      text not null default 'preparativos'
                check (bloque in ('preparativos','ceremonia','celebracion','fiesta')),
  titulo      text not null,
  inicio      text,            -- 'HH:MM'
  dur         integer not null default 0 check (dur >= 0), -- minutos
  lugar       text,
  prov_id     uuid references public.proveedores(id) on delete set null,
  nota        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_timing_wedding on public.timing(wedding_id, orden);

-- ----------------------------------------------------------------------------
-- Triggers updated_at para todas las tablas con esa columna
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','weddings','fincas','mesas','invitados','proveedores','timing']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Semilla del catálogo de categorías (idempotente)
-- ----------------------------------------------------------------------------
insert into public.prov_categorias (id, nombre, orden) values
  (1,'Wedding planner',1),(2,'Fotografía',2),(3,'Vídeo',3),(4,'Flores',4),
  (5,'Decoración',5),(6,'Catering',6),(7,'Grupo de música',7),(8,'DJ',8),
  (9,'Saxofonista',9),(10,'Actuaciones y shows',10),(11,'Fotomatón',11),
  (12,'Tarta',12),(13,'Peluquería y maquillaje',13),(14,'Invitaciones y papelería',14),
  (15,'Coche de novios',15),(16,'Autobuses',16),(17,'Barra y cócteles',17),
  (18,'Animación infantil',18),(19,'Fuegos artificiales',19)
on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden;
