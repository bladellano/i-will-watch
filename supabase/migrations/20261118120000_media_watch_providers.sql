-- Onde assistir (streaming) por obra e país, vindo da Watchmode.
-- Escrita somente pela Edge Function watch-providers (service role); membros autenticados apenas leem.

create table public.media_watch_lookups (
  tmdb_id      bigint      not null,
  media_type   text        not null check (media_type in ('movie', 'tv')),
  watchmode_id bigint,
  fetched_at   timestamptz not null default now(),
  primary key (tmdb_id, media_type)
);

create table public.media_watch_providers (
  tmdb_id       bigint not null,
  media_type    text   not null check (media_type in ('movie', 'tv')),
  region        text   not null check (region ~ '^[A-Z]{2}$'),
  source_id     bigint not null,
  access_type   text   not null,
  provider_name text   not null,
  web_url       text,
  ios_url       text,
  android_url   text,
  primary key (tmdb_id, media_type, region, source_id, access_type)
);

alter table public.media_watch_lookups enable row level security;
alter table public.media_watch_providers enable row level security;

create policy media_watch_lookups_select_authenticated on public.media_watch_lookups
  for select to authenticated using (true);

create policy media_watch_providers_select_authenticated on public.media_watch_providers
  for select to authenticated using (true);

grant select on public.media_watch_lookups to authenticated;
grant select on public.media_watch_providers to authenticated;
