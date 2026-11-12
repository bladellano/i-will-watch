-- O widget passa a poder abrir o modal de detalhes: a função devolve também dados PÚBLICOS do catálogo
-- (sinopse, gêneros, nota TMDB, título original e id TMDB). Continua sem e-mail e com 1 entrada por membro.

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
