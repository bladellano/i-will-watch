-- Etapa 4: Storage das capturas, privilegios restritos e controle de uso da IA.

-- ---------------------------------------------------------------------------
-- Bucket privado para as imagens (JPEG/PNG/WebP, ate 5 MB)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captures', 'captures', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario acessa somente a propria pasta: captures/{user_id}/...
create policy captures_objects_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy captures_objects_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy captures_objects_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- capture_requests: o cliente so cria e le; status, ai_result etc. sao das funcoes
-- ---------------------------------------------------------------------------

revoke insert, update on public.capture_requests from authenticated;
grant insert (id, image_path, input_title, input_url, source) on public.capture_requests to authenticated;

drop policy capture_requests_update_own on public.capture_requests;
drop policy capture_requests_insert_own on public.capture_requests;

create policy capture_requests_insert_own on public.capture_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (image_path is null or image_path like (select auth.uid())::text || '/%')
  );

alter table public.capture_requests
  add constraint capture_requests_input_title_check
    check (input_title is null or char_length(input_title) <= 200),
  add constraint capture_requests_input_url_check
    check (input_url is null or (char_length(input_url) <= 2048 and input_url ~* '^https?://')),
  add constraint capture_requests_source_check
    check (source is null or char_length(source) <= 100);

-- ---------------------------------------------------------------------------
-- Registro de cada execucao da IA (limite de uso e acompanhamento de custo).
-- Somente as Edge Functions (service role) leem e gravam.
-- ---------------------------------------------------------------------------

create table public.ai_usage_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  capture_id     uuid references public.capture_requests (id) on delete set null,
  model          text not null,
  input_tokens   integer,
  output_tokens  integer,
  created_at     timestamptz not null default now()
);

create index ai_usage_log_user_created_idx on public.ai_usage_log (user_id, created_at desc);

alter table public.ai_usage_log enable row level security;
revoke all on public.ai_usage_log from anon, authenticated;
