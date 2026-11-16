-- Resumo por IA dos comentários de uma obra, visível para todos os membros (modal da obra).
-- Decisões:
--  - Comentário = Observações publicadas na timeline (mesma regra da community_timeline): texto presente,
--    publicado, não tirado da timeline e autor com share_activity ligado. O resumo é igual para todos, então
--    a exceção "o autor vê a própria nota" não se aplica aqui.
--  - O resumo fica em cache por obra. A Edge Function summarize-comments só gera de novo quando o conjunto de
--    comentários muda (source_hash), e nunca devolve um resumo feito com comentários que deixaram de ser públicos.
--  - Leitura e escrita só pela Edge Function (service role). O cliente não acessa a tabela nem a função.

create table public.media_comment_summaries (
  media_id       uuid primary key references public.media (id) on delete cascade,
  summary        text not null check (char_length(summary) between 1 and 1200),
  highlights     text[] not null default '{}',
  comment_count  integer not null check (comment_count >= 0),
  source_hash    text not null,
  model          text not null,
  generated_at   timestamptz not null default now()
);

alter table public.media_comment_summaries enable row level security;
revoke all on public.media_comment_summaries from anon, authenticated;

-- Comentários públicos de uma obra, do mais recente para o mais antigo.
create function public.media_public_comments(p_media_id uuid, p_limit integer default 50)
returns table (item_id uuid, body text, published_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select lm.id, left(lm.notes, 1000), lm.notes_published_at
  from public.list_media lm
  join public.lists l on l.id = lm.list_id
  join public.profiles p on p.id = l.user_id
  where lm.media_id = p_media_id
    and lm.notes is not null
    and lm.notes_published_at is not null
    and not lm.notes_hidden
    and p.share_activity
  order by lm.notes_published_at desc, lm.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke execute on function public.media_public_comments(uuid, integer) from public, anon, authenticated;
grant execute on function public.media_public_comments(uuid, integer) to service_role;

-- O log de uso da IA passa a distinguir a finalidade, para que os resumos não consumam o limite de
-- identificações por captura (identify-media conta só purpose = 'identify').
alter table public.ai_usage_log
  add column purpose  text not null default 'identify' check (purpose in ('identify', 'summary')),
  add column media_id uuid references public.media (id) on delete set null;

create index ai_usage_log_user_purpose_created_idx on public.ai_usage_log (user_id, purpose, created_at desc);
