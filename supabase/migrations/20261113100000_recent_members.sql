-- Widget "Últimos membros cadastrados": nome (só o primeiro), data do cadastro e se é o próprio usuário.
-- Nunca devolve e-mail nem listas. Mesmo limite do widget de últimas obras (25).

create function public.recent_members(max_items integer default 25)
returns table (
  member_id    uuid,
  member_name  text,
  joined_at    timestamptz,
  is_own       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when p.id = (select auth.uid()) then 'Você'
      else coalesce(nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''), 'Um membro')
    end,
    p.created_at,
    (p.id = (select auth.uid()))
  from public.profiles p
  where (select auth.uid()) is not null
  order by p.created_at desc
  limit greatest(1, least(coalesce(max_items, 25), 25));
$$;

revoke execute on function public.recent_members(integer) from public, anon;
grant execute on function public.recent_members(integer) to authenticated;
