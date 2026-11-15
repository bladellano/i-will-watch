-- Novo status "ASSISTINDO" (em andamento) para list_media.
-- Remove qualquer CHECK de status existente (o nome gerado pelo Postgres pode variar)
-- e recria com a lista completa de valores.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.list_media'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.list_media drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.list_media
  add constraint list_media_status_check
  check (status in ('ASSISTIR', 'ASSISTINDO', 'ARQUIVADO', 'ASSISTIDO'));
