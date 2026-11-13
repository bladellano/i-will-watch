-- Copiar obra de outro membro: member_list_items passa a devolver tmdb_id (dado público do catálogo),
-- necessário para reaproveitar a função add-media. Nada além disso é exposto.
drop function if exists public.member_list_items(uuid);

create function public.member_list_items(p_list_id uuid)
returns table (
  id           uuid,
  tmdb_id      bigint,
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
    m.tmdb_id,
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
