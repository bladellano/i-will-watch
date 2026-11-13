-- A timeline passa a ler o campo "Observações" (list_media.notes) em vez de uma tabela de comentários.
-- Decisões (docs/timeline-comunidade.md):
--  - Salvar a obra com texto nas Observações publica o texto na timeline (um registro por obra do usuário).
--  - Notas que já existiam NÃO são publicadas pela migração: cada uma só aparece quando o dono salva a obra de novo.
--  - "Excluir" no card tira da timeline (notes_hidden = true) e mantém o texto nas Observações. Editar o texto
--    e salvar publica de novo.
--  - As colunas notes_published_at e notes_edited_at são mantidas pelo banco; o cliente só escreve notes_hidden.

-- 1) Remove o desenho anterior (tabela de comentários e a RPC que a lia).
drop function public.community_timeline(text, timestamptz, text, integer);
drop table public.media_comments;
drop function public.media_comments_before_write();

-- 2) Colunas de publicação.
alter table public.list_media
  add column notes_published_at timestamptz,
  add column notes_edited_at    timestamptz,
  add column notes_hidden       boolean not null default false;

-- O cliente passa a escrever só as colunas de uso (antes o grant era da tabela inteira), de modo que
-- notes_published_at e notes_edited_at não possam ser forjadas. A RLS list_media_update_own continua valendo.
revoke update on public.list_media from authenticated;
grant update (status, personal_rating, notes, watched_at, is_pinned, notes_hidden) on public.list_media to authenticated;

-- 3) Regras de publicação, no banco.
create function public.list_media_notes_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  was_visible boolean;
begin
  new.notes := nullif(btrim(new.notes), '');

  if tg_op = 'INSERT' then
    new.notes_hidden := false;
    new.notes_edited_at := null;
    new.notes_published_at := case when new.notes is null then null else now() end;
    return new;
  end if;

  was_visible := old.notes is not null and old.notes_published_at is not null and not old.notes_hidden;

  if new.notes is null then
    -- Texto apagado: sai da timeline e zera o estado.
    new.notes_published_at := null;
    new.notes_edited_at := null;
    new.notes_hidden := false;
  elsif new.notes is distinct from old.notes then
    if char_length(new.notes) > 1000 then
      raise exception 'note_too_long';
    end if;
    if was_visible then
      -- Já estava na timeline: continua no mesmo lugar, agora com "(editado)".
      new.notes_edited_at := now();
    else
      -- Texto novo (ou editado depois de "tirar da timeline"): publica de novo.
      new.notes_published_at := now();
      new.notes_edited_at := null;
      new.notes_hidden := false;
    end if;
  elsif new.notes_published_at is null and not new.notes_hidden then
    -- Nota antiga, nunca publicada: aparece quando o dono salva a obra de novo.
    new.notes_published_at := now();
    new.notes_edited_at := null;
  end if;
  -- Texto igual e já publicado, ou escondido: nada muda (salvar só status ou nota não mexe na timeline).
  return new;
end;
$$;

revoke execute on function public.list_media_notes_publish() from public, anon, authenticated;

-- "update of notes": só dispara quando o texto faz parte do UPDATE (salvar a obra), nunca ao fixar ou desfixar.
create trigger list_media_notes_publish
  before insert or update of notes on public.list_media
  for each row execute function public.list_media_notes_publish();

-- 4) Timeline. Cursor por (occurred_at, event_id), do mais recente para o mais antigo.
--    Comentário = Observações publicadas do vínculo (event_id = id do vínculo).
--    Privacidade:
--     - comentário: aparece se o autor compartilha a atividade (share_activity) ou se é o próprio usuário;
--     - curtida: aparece se quem curtiu tem share_activity E o dono da adição tem share_lists, para não
--       revelar título de lista privada. O curtidor vê as próprias curtidas, e o dono vê as curtidas
--       recebidas desde que o curtidor compartilhe a atividade.
--    Só o primeiro nome é exposto ("Você" para o próprio usuário). Nunca e-mail, nota pessoal ou status.
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
