-- ============================================================================
-- 0004_salon.sql — Plano del salón: rotación de mesas, reglas de convivencia y
-- zonas del plano. Completa la sincronización de la vista Salón.
-- Idempotente.
-- ============================================================================

-- Rotación de mesas (grados)
alter table public.mesas add column if not exists rot integer not null default 0;

-- ----------------------------------------------------------------------------
-- reglas — convivencia entre invitados (juntos / separados)
-- a y b son invitados; al borrar un invitado se borran sus reglas.
-- ----------------------------------------------------------------------------
create table if not exists public.reglas (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  tipo        text not null default 'juntos' check (tipo in ('juntos','separados')),
  a           uuid references public.invitados(id) on delete cascade,
  b           uuid references public.invitados(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_reglas_wedding on public.reglas(wedding_id);

-- ----------------------------------------------------------------------------
-- zonas — elementos colocables del plano (sala, pista, barra, dj…)
-- x,y en % del lienzo; w,h en px; rot en grados.
-- ----------------------------------------------------------------------------
create table if not exists public.zonas (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  tipo        text not null check (tipo in
                ('sala','escenario','pista','barra','dj','photocall',
                 'entrada','buffet','regalos','tarta','aseos')),
  x           integer,
  y           integer,
  w           integer,
  h           integer,
  rot         integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_zonas_wedding on public.zonas(wedding_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['reglas','zonas']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on public.%1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- RLS: misma regla por boda (función is_wedding_member de 0002)
-- ----------------------------------------------------------------------------
alter table public.reglas enable row level security;
alter table public.zonas  enable row level security;
do $$
declare t text;
begin
  foreach t in array array['reglas','zonas']
  loop
    execute format('drop policy if exists %1$s_all on public.%1$s;', t);
    execute format(
      'create policy %1$s_all on public.%1$s
         for all
         using (public.is_wedding_member(wedding_id))
         with check (public.is_wedding_member(wedding_id));', t);
  end loop;
end $$;
