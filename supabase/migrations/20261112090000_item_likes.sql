-- Curtidas: um membro curte a ADIÇÃO (registro list_media) de outro membro, no máximo uma vez.
-- Guarda o id da adição, o dono dela e quem curtiu. O dono é preenchido pelo banco (não pelo cliente).

create table public.item_likes (
  item_id     uuid not null references public.list_media (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (item_id, user_id),
  constraint item_likes_not_self check (owner_id <> user_id)
);

create index item_likes_owner_idx on public.item_likes (owner_id, created_at desc);

-- owner_id vem sempre da lista dona da adição.
create function public.item_likes_set_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select l.user_id into new.owner_id
  from public.list_media lm join public.lists l on l.id = lm.list_id
  where lm.id = new.item_id;
  return new;
end;
$$;

revoke execute on function public.item_likes_set_owner() from public, anon, authenticated;

create trigger item_likes_before_insert
  before insert on public.item_likes
  for each row execute function public.item_likes_set_owner();

alter table public.item_likes enable row level security;

revoke all on public.item_likes from anon, authenticated;
grant select, delete on public.item_likes to authenticated;
grant insert (item_id) on public.item_likes to authenticated;

-- Cada usuário lê e remove apenas as PRÓPRIAS curtidas. As contagens vêm de recent_additions.
create policy item_likes_select_own on public.item_likes
  for select to authenticated using (user_id = (select auth.uid()));

create policy item_likes_delete_own on public.item_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Não é possível curtir a própria adição (também garantido pela constraint item_likes_not_self).
create policy item_likes_insert_not_own on public.item_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.list_media lm join public.lists l on l.id = lm.list_id
      where lm.id = item_id and l.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Widget: contagem de curtidas, "eu curti" e "é meu"
-- ---------------------------------------------------------------------------

drop function if exists public.recent_additions(integer);

create function public.recent_additions(max_items integer default 5)
returns table (
  item_id        uuid,
  member_name    text,
  title          text,
  original_title text,
  media_type     text,
  tmdb_id        bigint,
  release_date   date,
  poster_path    text,
  overview       text,
  tmdb_rating    numeric,
  genres         text[],
  like_count     integer,
  liked_by_me    boolean,
  is_own         boolean,
  added_at       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_per_member as (
    select distinct on (l.user_id)
      l.user_id,
      lm.id as item_id,
      lm.media_id,
      lm.added_at
    from public.list_media lm
    join public.lists l on l.id = lm.list_id
    order by l.user_id, lm.added_at desc
  )
  select
    x.item_id,
    case
      when x.user_id = (select auth.uid()) then 'Você'
      else coalesce(nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''), 'Um membro')
    end,
    m.title,
    m.original_title,
    m.media_type,
    m.tmdb_id,
    m.release_date,
    m.poster_path,
    m.overview,
    m.tmdb_rating,
    m.genres,
    (select count(*)::integer from public.item_likes il where il.item_id = x.item_id),
    exists (select 1 from public.item_likes il where il.item_id = x.item_id and il.user_id = (select auth.uid())),
    (x.user_id = (select auth.uid())),
    x.added_at
  from latest_per_member x
  join public.media m on m.id = x.media_id
  left join public.profiles p on p.id = x.user_id
  where (select auth.uid()) is not null
  order by x.added_at desc
  limit greatest(1, least(coalesce(max_items, 5), 10));
$$;

revoke execute on function public.recent_additions(integer) from public, anon;
grant execute on function public.recent_additions(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Notificação ao dono (PRONTA, DESLIGADA): só age se existirem no Vault os segredos
-- notify_like_url e notify_like_secret. Sem eles, não faz nada. Veja docs/publicacao.md, seção 3.3.
-- Nenhuma falha aqui impede a curtida.
-- ---------------------------------------------------------------------------

create function public.notify_item_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
  liker text;
  item_title text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'notify_like_url' limit 1;
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'notify_like_secret' limit 1;
  if fn_url is null or fn_secret is null then
    return new;
  end if;

  select nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), '') into liker
  from public.profiles p where p.id = new.user_id;
  select m.title into item_title
  from public.list_media lm join public.media m on m.id = lm.media_id where lm.id = new.item_id;

  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object(
      'owner_id', new.owner_id,
      'liker_name', coalesce(liker, 'Um membro'),
      'title', item_title
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', fn_secret)
  );
  return new;
exception when others then
  raise warning 'notify_item_like falhou: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_item_like() from public, anon, authenticated;

create trigger item_likes_after_insert
  after insert on public.item_likes
  for each row execute function public.notify_item_like();
