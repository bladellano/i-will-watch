-- Itens fixados na lista: destaque para títulos que pedem mais atenção.
-- A policy list_media_update_own e o grant de update de tabela já cobrem a nova coluna.

alter table public.list_media add column is_pinned boolean not null default false;
