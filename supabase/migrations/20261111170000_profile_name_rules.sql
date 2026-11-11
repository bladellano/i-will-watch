-- Nome do perfil: opcional, sem espacos nas pontas, 1 a 80 caracteres.
-- O gatilho de novo usuario passa a sanear o nome vindo do cadastro para nunca falhar o signup.

update public.profiles set name = nullif(left(btrim(name), 80), '') where name is not null;

alter table public.profiles
  add constraint profiles_name_length check (name is null or char_length(name) between 1 and 80);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), 80), ''));

  insert into public.lists (user_id, name, is_default)
  values (new.id, 'default', true);

  return new;
end;
$$;
