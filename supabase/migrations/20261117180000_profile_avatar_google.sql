-- Avatar do perfil (URL da foto da conta Google) e leitura de nome/foto vindos do login Google.
-- Guarda apenas a URL devolvida pelo provedor, sem copiar a imagem para o Storage.

alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles
  add constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')), 80), ''),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''), 2048), '')
  );

  insert into public.lists (user_id, name, is_default)
  values (new.id, 'default', true);

  return new;
end;
$$;
