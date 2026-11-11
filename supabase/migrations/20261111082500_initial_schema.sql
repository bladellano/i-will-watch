-- Etapa 1 - esquema inicial: tabelas, constraints, trigger de novo usuario e RLS.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  created_at  timestamptz not null default now()
);

-- Catalogo compartilhado (sem user_id). Escrita somente via Edge Function (service role).
create table public.media (
  id              uuid primary key default gen_random_uuid(),
  tmdb_id         bigint not null,
  media_type      text not null check (media_type in ('movie', 'tv')),
  title           text not null,
  original_title  text,
  release_date    date,
  overview        text,
  poster_path     text,
  backdrop_path   text,
  tmdb_rating     numeric(4, 2),
  created_at      timestamptz not null default now(),
  constraint media_tmdb_unique unique (tmdb_id, media_type)
);

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) > 0),
  description  text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index lists_user_id_idx on public.lists (user_id);
-- No maximo uma lista "default" por usuario.
create unique index lists_one_default_per_user_idx on public.lists (user_id) where is_default;

create table public.list_media (
  id               uuid primary key default gen_random_uuid(),
  list_id          uuid not null references public.lists (id) on delete cascade,
  media_id         uuid not null references public.media (id) on delete restrict,
  status           text not null default 'ASSISTIR'
                     check (status in ('ASSISTIR', 'ARQUIVADO', 'ASSISTIDO')),
  personal_rating  smallint,
  notes            text,
  added_at         timestamptz not null default now(),
  watched_at       timestamptz,
  constraint list_media_unique unique (list_id, media_id)
);

create index list_media_media_id_idx on public.list_media (media_id);

create table public.capture_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_path        text,
  input_title       text,
  input_url         text,
  source            text,
  status            text not null default 'pending'
                      check (status in ('pending', 'processing', 'needs_review', 'completed', 'failed')),
  ai_result         jsonb,
  selected_media_id uuid references public.media (id) on delete set null,
  error_message     text,
  created_at        timestamptz not null default now(),
  processed_at      timestamptz
);

create index capture_requests_user_id_idx on public.capture_requests (user_id);

-- ---------------------------------------------------------------------------
-- Novo usuario: cria profile e a lista "default"
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');

  insert into public.lists (user_id, name, is_default)
  values (new.id, 'default', true);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privilegios (colunas sensiveis nao sao gravaveis pelo cliente)
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.media, public.lists, public.list_media, public.capture_requests
  from anon;
revoke all on public.profiles, public.media, public.lists, public.list_media, public.capture_requests
  from authenticated;

grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

grant select on public.media to authenticated;

-- user_id (default auth.uid()) e is_default nao sao informados pelo cliente.
grant select, delete on public.lists to authenticated;
grant insert (name, description) on public.lists to authenticated;
grant update (name, description) on public.lists to authenticated;

grant select, insert, update, delete on public.list_media to authenticated;
grant select, insert, update, delete on public.capture_requests to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.media            enable row level security;
alter table public.lists            enable row level security;
alter table public.list_media       enable row level security;
alter table public.capture_requests enable row level security;

-- profiles: cada usuario le e altera somente o proprio registro.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- media: leitura para qualquer autenticado; sem politicas de escrita (service role ignora RLS).
create policy media_select_authenticated on public.media
  for select to authenticated using (true);

-- lists: somente do proprio usuario; a lista default nao pode ser excluida.
create policy lists_select_own on public.lists
  for select to authenticated using (user_id = (select auth.uid()));
create policy lists_insert_own on public.lists
  for insert to authenticated with check (user_id = (select auth.uid()) and not is_default);
create policy lists_update_own on public.lists
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy lists_delete_own_non_default on public.lists
  for delete to authenticated using (user_id = (select auth.uid()) and not is_default);

-- list_media: acesso via lists pertencentes ao usuario autenticado.
create policy list_media_select_own on public.list_media
  for select to authenticated
  using (exists (select 1 from public.lists l where l.id = list_media.list_id and l.user_id = (select auth.uid())));
create policy list_media_insert_own on public.list_media
  for insert to authenticated
  with check (exists (select 1 from public.lists l where l.id = list_media.list_id and l.user_id = (select auth.uid())));
create policy list_media_update_own on public.list_media
  for update to authenticated
  using (exists (select 1 from public.lists l where l.id = list_media.list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_media.list_id and l.user_id = (select auth.uid())));
create policy list_media_delete_own on public.list_media
  for delete to authenticated
  using (exists (select 1 from public.lists l where l.id = list_media.list_id and l.user_id = (select auth.uid())));

-- capture_requests: somente do proprio usuario.
create policy capture_requests_select_own on public.capture_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy capture_requests_insert_own on public.capture_requests
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy capture_requests_update_own on public.capture_requests
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy capture_requests_delete_own on public.capture_requests
  for delete to authenticated using (user_id = (select auth.uid()));
