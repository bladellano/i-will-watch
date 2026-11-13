-- Timeline da comunidade (home): comentários sobre obras + curtidas dos membros.
-- Decisões (docs/timeline-comunidade.md):
--  - Comentário é uma entidade nova, ligada à obra do catálogo (media_id) e ao autor. O campo
--    list_media.notes continua privado e intocado.
--  - O cliente só lê/edita/exclui os PRÓPRIOS comentários direto na tabela. A leitura entre membros
--    passa pela função community_timeline (security definer), no mesmo padrão de recent_additions.
--  - profiles.share_activity (padrão ligado) esconde, retroativamente, a atividade do membro da timeline.

-- 1) Preferência de privacidade da atividade.
alter table public.profiles
  add column share_activity boolean not null default true;

grant update (share_activity) on public.profiles to authenticated;

-- 2) Comentários.
create table public.media_comments (
  id          uuid primary key default gen_random_uuid(),
  media_id    uuid not null references public.media (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now(),
  edited_at   timestamptz
);

create index media_comments_created_idx on public.media_comments (created_at desc, id desc);
create index media_comments_user_media_idx on public.media_comments (user_id, media_id, created_at desc);

-- Antes de gravar: apara o texto, marca "editado" e limita a 10 comentários por hora por autor.
create function public.media_comments_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.body := btrim(new.body);
  if tg_op = 'INSERT' then
    if (
      select count(*) from public.media_comments c
      where c.user_id = new.user_id and c.created_at > now() - interval '1 hour'
    ) >= 10 then
      raise exception 'comment_rate_limit';
    end if;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.media_comments_before_write() from public, anon, authenticated;

create trigger media_comments_before_write
  before insert or update on public.media_comments
  for each row execute function public.media_comments_before_write();

alter table public.media_comments enable row level security;

revoke all on public.media_comments from anon, authenticated;
grant select, delete on public.media_comments to authenticated;
grant insert (media_id, body) on public.media_comments to authenticated;
grant update (body) on public.media_comments to authenticated;

-- Cada membro lê, edita e exclui apenas os PRÓPRIOS comentários (os dos outros chegam só pela timeline).
create policy media_comments_select_own on public.media_comments
  for select to authenticated using (user_id = (select auth.uid()));

-- Só comenta uma obra que está em alguma lista sua (o formulário fica na página da obra).
create policy media_comments_insert_own on public.media_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.list_media lm join public.lists l on l.id = lm.list_id
      where lm.media_id = media_comments.media_id and l.user_id = (select auth.uid())
    )
  );

create policy media_comments_update_own on public.media_comments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy media_comments_delete_own on public.media_comments
  for delete to authenticated using (user_id = (select auth.uid()));

-- 3) Timeline. Cursor por (occurred_at, event_id), do mais recente para o mais antigo.
--    Regras de privacidade:
--     - comentário: aparece se o autor compartilha a atividade (share_activity) ou se é o próprio usuário;
--     - curtida: aparece se quem curtiu tem share_activity E o dono da adição tem share_lists, para não
--       revelar título de lista privada. O curtidor vê as próprias curtidas, e o dono vê as curtidas
--       recebidas desde que o curtidor compartilhe a atividade.
--    Só o primeiro nome é exposto ("Você" para o próprio usuário). Nunca e-mail, notas, nota pessoal ou status.
create function public.community_timeline(
  p_type      text default 'all',
  p_before    timestamptz default null,
  p_before_id text default null,
  p_limit     integer default 20
)
returns table (
  event_type       text,
  event_id         text,
  occurred_at      timestamptz,
  actor_name       text,
  is_own           boolean,
  media_id         uuid,
  tmdb_id          bigint,
  media_type       text,
  title            text,
  release_date     date,
  poster_path      text,
  comment_id       uuid,
  comment_body     text,
  comment_edited_at timestamptz,
  item_id          uuid,
  owner_name       text
)
language sql
stable
security definer
set search_path = ''
as $$
  with events as (
    select
      'comment'::text as event_type,
      c.id::text as event_id,
      c.created_at as occurred_at,
      case
        when c.user_id = (select auth.uid()) then 'Você'
        else coalesce(nullif(split_part(btrim(coalesce(p.name, '')), ' ', 1), ''), 'Um membro')
      end as actor_name,
      (c.user_id = (select auth.uid())) as is_own,
      m.id as media_id,
      m.tmdb_id,
      m.media_type,
      m.title,
      m.release_date,
      m.poster_path,
      c.id as comment_id,
      c.body as comment_body,
      c.edited_at as comment_edited_at,
      null::uuid as item_id,
      null::text as owner_name
    from public.media_comments c
    join public.profiles p on p.id = c.user_id
    join public.media m on m.id = c.media_id
    where p_type in ('all', 'comment')
      and (c.user_id = (select auth.uid()) or p.share_activity)

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
      null::uuid,
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
         e.media_type, e.title, e.release_date, e.poster_path, e.comment_id, e.comment_body,
         e.comment_edited_at, e.item_id, e.owner_name
  from events e
  where (select auth.uid()) is not null
    and (p_before is null or (e.occurred_at, e.event_id) < (p_before, coalesce(p_before_id, '')))
  order by e.occurred_at desc, e.event_id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke execute on function public.community_timeline(text, timestamptz, text, integer) from public, anon;
grant execute on function public.community_timeline(text, timestamptz, text, integer) to authenticated;
