-- Modal "Listas do membro" (widget "Últimas obras adicionadas").
-- Membros que optam por compartilhar (profiles.share_lists = true) deixam os outros membros verem
-- o nome, a descrição e a contagem das listas, e o título, ano, tipo e pôster das obras. Somente leitura.
-- O cliente continua sem leitura direta de lists/list_media alheias: o acesso passa só por estas funções.
-- Nunca são expostos: notas, nota pessoal, status, datas de assistido, destaque (is_pinned) nem e-mail.

-- 1) Preferência de compartilhamento. Padrão ligado: todos aparecem; quem quiser pode desligar no perfil.
-- Como o default também preenche as linhas já existentes, todos os usuários atuais passam a compartilhar.
alter table public.profiles
  add column share_lists boolean not null default true;

-- A RLS de profiles (update só da própria linha) já restringe o alvo; o grant restringe a coluna.
grant update (share_lists) on public.profiles to authenticated;

-- 2) recent_additions passa a devolver member_id (abre o modal) e member_shares_lists (nome clicável).
drop function if exists public.recent_additions(integer);

create function public.recent_additions(max_items integer default 25)
returns table (
  item_id              uuid,
  member_name          text,
  title                text,
  original_title       text,
  media_type           text,
  tmdb_id              bigint,
  release_date         date,
  poster_path          text,
  overview             text,
  tmdb_rating          numeric,
  genres               text[],
  like_count           integer,
  liked_by_me          boolean,
  is_own               boolean,
  added_at             timestamptz,
  member_id            uuid,
  member_shares_lists  boolean
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
    x.added_at,
    x.user_id,
    coalesce(p.share_lists, false)
  from latest_per_member x
  join public.media m on m.id = x.media_id
  left join public.profiles p on p.id = x.user_id
  where (select auth.uid()) is not null
  order by x.added_at desc
  limit greatest(1, least(coalesce(max_items, 25), 25));
$$;

revoke execute on function public.recent_additions(integer) from public, anon;
grant execute on function public.recent_additions(integer) to authenticated;

-- 3) Listas de um membro. Só se ele compartilha (ou se é o próprio usuário).
create function public.member_lists(p_member_id uuid)
returns table (
  id          uuid,
  name        text,
  description text,
  is_default  boolean,
  item_count  integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    l.id,
    l.name,
    l.description,
    l.is_default,
    (select count(*)::integer from public.list_media lm where lm.list_id = l.id)
  from public.lists l
  join public.profiles p on p.id = l.user_id
  where l.user_id = p_member_id
    and (p.share_lists or l.user_id = (select auth.uid()))
    and (select auth.uid()) is not null
  order by l.is_default desc, l.created_at asc;
$$;

revoke execute on function public.member_lists(uuid) from public, anon;
grant execute on function public.member_lists(uuid) to authenticated;

-- 4) Obras de uma lista. Mesma regra: só se o dono compartilha (ou se é o próprio usuário).
create function public.member_list_items(p_list_id uuid)
returns table (
  id           uuid,
  title        text,
  media_type   text,
  release_date date,
  poster_path  text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    lm.id,
    m.title,
    m.media_type,
    m.release_date,
    m.poster_path
  from public.list_media lm
  join public.lists l on l.id = lm.list_id
  join public.profiles p on p.id = l.user_id
  join public.media m on m.id = lm.media_id
  where lm.list_id = p_list_id
    and (p.share_lists or l.user_id = (select auth.uid()))
    and (select auth.uid()) is not null
  order by lm.added_at desc;
$$;

revoke execute on function public.member_list_items(uuid) from public, anon;
grant execute on function public.member_list_items(uuid) to authenticated;
