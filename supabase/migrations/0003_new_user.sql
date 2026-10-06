-- ============================================================================
-- 0003_new_user.sql — Alta automática de perfil al registrarse
--
-- Al crear un usuario en auth.users se inserta su fila en public.profiles.
-- NO se crea una boda automáticamente: el workspace se crea de forma explícita
-- (onboarding de la app o seeder), evitando bodas vacías huérfanas.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
