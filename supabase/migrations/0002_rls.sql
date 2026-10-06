-- ============================================================================
-- 0002_rls.sql — Row Level Security
--
-- Regla: solo ves/escribes filas de una boda de la que eres miembro.
-- El chequeo de pertenencia se hace con una función SECURITY DEFINER que
-- consulta wedding_members SALTÁNDOSE la RLS → evita la recursión infinita de
-- políticas (fallo clásico cuando una política de wedding_members se refiere a
-- sí misma). El service_role (seeder/backend) ignora RLS por diseño.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: ¿el usuario actual es miembro de esta boda?
-- SECURITY DEFINER + search_path fijo → consulta sin disparar RLS.
-- ----------------------------------------------------------------------------
create or replace function public.is_wedding_member(wid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = wid and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_wedding_member(uuid) from public;
grant execute on function public.is_wedding_member(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ----------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.weddings        enable row level security;
alter table public.wedding_members enable row level security;
alter table public.prov_categorias enable row level security;
alter table public.fincas          enable row level security;
alter table public.mesas           enable row level security;
alter table public.invitados       enable row level security;
alter table public.proveedores     enable row level security;
alter table public.timing          enable row level security;

-- ----------------------------------------------------------------------------
-- profiles: cada usuario gestiona su propio perfil
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_upsert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_upsert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- prov_categorias: catálogo de solo lectura para cualquier autenticado
-- ----------------------------------------------------------------------------
drop policy if exists categorias_read on public.prov_categorias;
create policy categorias_read on public.prov_categorias
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- weddings: ves/editas las bodas de las que eres miembro; creas si eres tú
-- ----------------------------------------------------------------------------
drop policy if exists weddings_select on public.weddings;
drop policy if exists weddings_insert on public.weddings;
drop policy if exists weddings_update on public.weddings;
drop policy if exists weddings_delete on public.weddings;
create policy weddings_select on public.weddings
  for select using (public.is_wedding_member(id));
create policy weddings_insert on public.weddings
  for insert with check (created_by = auth.uid());
create policy weddings_update on public.weddings
  for update using (public.is_wedding_member(id))
             with check (public.is_wedding_member(id));
create policy weddings_delete on public.weddings
  for delete using (
    exists (select 1 from public.wedding_members m
            where m.wedding_id = id and m.user_id = auth.uid() and m.role = 'owner')
  );

-- ----------------------------------------------------------------------------
-- wedding_members: ves tus membresías y las de tus bodas; el owner gestiona
-- ----------------------------------------------------------------------------
drop policy if exists members_select on public.wedding_members;
drop policy if exists members_insert on public.wedding_members;
drop policy if exists members_delete on public.wedding_members;
create policy members_select on public.wedding_members
  for select using (user_id = auth.uid() or public.is_wedding_member(wedding_id));
-- Alta: o te añades a una boda que creaste, o el owner añade a otros.
create policy members_insert on public.wedding_members
  for insert with check (
    (user_id = auth.uid()
      and exists (select 1 from public.weddings w
                  where w.id = wedding_id and w.created_by = auth.uid()))
    or exists (select 1 from public.wedding_members m
               where m.wedding_id = wedding_id and m.user_id = auth.uid() and m.role = 'owner')
  );
create policy members_delete on public.wedding_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.wedding_members m
               where m.wedding_id = wedding_id and m.user_id = auth.uid() and m.role = 'owner')
  );

-- ----------------------------------------------------------------------------
-- Entidades por boda: una política "todo" por tabla con la misma regla
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['fincas','mesas','invitados','proveedores','timing']
  loop
    execute format('drop policy if exists %1$s_all on public.%1$s;', t);
    execute format(
      'create policy %1$s_all on public.%1$s
         for all
         using (public.is_wedding_member(wedding_id))
         with check (public.is_wedding_member(wedding_id));', t);
  end loop;
end $$;
