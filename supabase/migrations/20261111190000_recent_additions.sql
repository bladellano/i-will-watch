-- Widget "Últimas obras adicionadas": atividade recente dos membros.
-- As tabelas continuam privadas (RLS); esta função expõe SOMENTE o necessário para o widget:
-- primeiro nome (nunca e-mail), dados públicos da obra e a data. Apenas para usuários autenticados.

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
  select
    lm.id,
    case
      when l.user_id = (select auth.uid()) then 'Você'
      else coalesce(nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''), 'Um membro')
    end,
    m.title,
    m.media_type,
    m.release_date,
    m.poster_path,
    lm.added_at
  from public.list_media lm
  join public.lists l on l.id = lm.list_id
  join public.media m on m.id = lm.media_id
  left join public.profiles p on p.id = l.user_id
  where (select auth.uid()) is not null
  order by lm.added_at desc
  limit greatest(1, least(coalesce(max_items, 5), 10));
$$;

revoke execute on function public.recent_additions(integer) from public, anon;
grant execute on function public.recent_additions(integer) to authenticated;
