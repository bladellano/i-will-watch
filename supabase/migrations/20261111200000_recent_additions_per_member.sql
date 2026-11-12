-- Widget "Últimas obras adicionadas": no máximo UMA entrada por membro (a adição mais recente dele),
-- para evidenciar que vários membros estão atualizando suas listas.

create or replace function public.recent_additions(max_items integer default 5)
returns table (
  item_id      uuid,
  member_name  text,
  title        text,
  media_type   text,
  release_date date,
  poster_path  text,
  added_at     timestamptz
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
    m.media_type,
    m.release_date,
    m.poster_path,
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
