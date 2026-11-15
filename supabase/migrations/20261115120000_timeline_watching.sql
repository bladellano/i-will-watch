-- Timeline: "começou a assistir". Quando a obra passa a ASSISTINDO (vindo de qualquer outro status), o banco
-- registra o momento em list_media.watching_started_at e a timeline mostra o evento.
--  - Repetir a mudança para ASSISTINDO com a obra já nesse status não gera evento novo.
--  - Sair de ASSISTINDO mantém o evento (é histórico). Apagar a obra da lista tira o evento junto.
--  - O dono pode tirar o evento da timeline (watching_hidden). Mudar para ASSISTINDO de novo publica de novo.
--  - watching_started_at é mantido pelo banco; o cliente não escreve essa coluna.

alter table public.list_media
  add column watching_started_at timestamptz,
  add column watching_hidden     boolean not null default false;

grant update (watching_hidden) on public.list_media to authenticated;

create function public.list_media_watching_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.watching_started_at := case when new.status = 'ASSISTINDO' then now() else null end;
    new.watching_hidden := false;
    return new;
  end if;

  if new.status = 'ASSISTINDO' and old.status is distinct from 'ASSISTINDO' then
    new.watching_started_at := now();
    new.watching_hidden := false;
  end if;
  return new;
end;
$$;

revoke execute on function public.list_media_watching_publish() from public, anon, authenticated;

create trigger list_media_watching_publish
  before insert or update of status on public.list_media
  for each row execute function public.list_media_watching_publish();

-- Timeline: inclui o tipo 'watching' (filtro p_type 'watching' ou 'all'). Mesma regra de privacidade dos comentários:
-- o autor vê o próprio evento; os outros veem se o autor compartilha a atividade.
drop function public.community_timeline(text, timestamptz, text, integer);

create function public.community_timeline(
  p_type      text default 'all',
  p_before    timestamptz default null,
  p_before_id text default null,
  p_limit     integer default 20
)
returns table (
  event_type        text,
  event_id          text,
  occurred_at       timestamptz,
  actor_name        text,
  is_own            boolean,
  media_id          uuid,
  tmdb_id           bigint,
  media_type        text,
  title             text,
  release_date      date,
  poster_path       text,
  comment_body      text,
  comment_edited_at timestamptz,
  item_id           uuid,
  owner_name        text
)
language sql
stable
security definer
set search_path = ''
as $$
  with events as (
    select
      'comment'::text as event_type,
      lm.id::text as event_id,
      lm.notes_published_at as occurred_at,
      case
        when l.user_id = (select auth.uid()) then 'Você'
        else coalesce(nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''), 'Um membro')
      end as actor_name,
      (l.user_id = (select auth.uid())) as is_own,
      m.id as media_id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.release_date,
      m.poster_path,
      left(lm.notes, 1000) as comment_body,
      lm.notes_edited_at as comment_edited_at,
      lm.id as item_id,
      null::text as owner_name
    from public.list_media lm
    join public.lists l on l.id = lm.list_id
    join public.profiles p on p.id = l.user_id
    join public.media m on m.id = lm.media_id
    where p_type in ('all', 'comment')
      and lm.notes is not null
      and lm.notes_published_at is not null
      and not lm.notes_hidden
      and (l.user_id = (select auth.uid()) or p.share_activity)

    union all

    select
      'watching'::text,
      'watch:' || lm.id::text,
      lm.watching_started_at,
      case
        when l.user_id = (select auth.uid()) then 'Você'
        else coalesce(nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''), 'Um membro')
      end,
      (l.user_id = (select auth.uid())),
      m.id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.release_date,
      m.poster_path,
      null::text,
      null::timestamptz,
      lm.id,
      null::text
    from public.list_media lm
    join public.lists l on l.id = lm.list_id
    join public.profiles p on p.id = l.user_id
    join public.media m on m.id = lm.media_id
    where p_type in ('all', 'watching')
      and lm.watching_started_at is not null
      and not lm.watching_hidden
      and (l.user_id = (select auth.uid()) or p.share_activity)

    union all

    select
      'like'::text,
      il.item_id::text || ':' || il.user_id::text,
      il.created_at,
      case
        when il.user_id = (select auth.uid()) then 'Você'
        else coalesce(nullif(split_part(btrim(coalesce(pl.name, '')), ' ', 1), ''), 'Um membro')
      end,
      (il.user_id = (select auth.uid())),
      m.id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.release_date,
      m.poster_path,
      null::text,
      null::timestamptz,
      il.item_id,
      case
        when il.owner_id = (select auth.uid()) then 'Você'
        else coalesce(nullif(split_part(btrim(coalesce(po.name, '')), ' ', 1), ''), 'Um membro')
      end
    from public.item_likes il
    join public.list_media lm on lm.id = il.item_id
    join public.media m on m.id = lm.media_id
    join public.profiles pl on pl.id = il.user_id
    join public.profiles po on po.id = il.owner_id
    where p_type in ('all', 'like')
      and (
        il.user_id = (select auth.uid())
        or (il.owner_id = (select auth.uid()) and pl.share_activity)
        or (pl.share_activity and po.share_lists)
      )
  )
  select e.event_type, e.event_id, e.occurred_at, e.actor_name, e.is_own, e.media_id, e.tmdb_id,
         e.media_type, e.title, e.release_date, e.poster_path, e.comment_body, e.comment_edited_at,
         e.item_id, e.owner_name
  from events e
  where (select auth.uid()) is not null
    and (p_before is null or (e.occurred_at, e.event_id) < (p_before, coalesce(p_before_id, '')))
  order by e.occurred_at desc, e.event_id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke execute on function public.community_timeline(text, timestamptz, text, integer) from public, anon;
grant execute on function public.community_timeline(text, timestamptz, text, integer) to authenticated;
