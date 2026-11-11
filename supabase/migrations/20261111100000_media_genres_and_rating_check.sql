-- Etapa 3: generos da obra (exibidos nos detalhes) e validacao da nota pessoal.

alter table public.media
  add column genres text[] not null default '{}';

-- Nota pessoal opcional: inteiro de 1 a 10 (NULL = sem nota).
alter table public.list_media
  add constraint list_media_personal_rating_check
  check (personal_rating is null or personal_rating between 1 and 10);
