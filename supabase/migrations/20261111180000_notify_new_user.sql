-- Avisa o administrador (por e-mail, via Edge Function notify-new-user) quando um usuário
-- conclui o cadastro: e-mail confirmado (ou já confirmado na criação, se a confirmação estiver desligada).
--
-- Configuração (feita uma vez, fora do git): dois segredos no Vault com a URL da função e o segredo
-- compartilhado. Sem eles, o gatilho simplesmente não faz nada. Veja docs/publicacao.md, seção 3.2.
-- Importante: nenhuma falha aqui pode impedir um cadastro, por isso tudo é protegido por EXCEPTION.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  if tg_op = 'UPDATE' and (old.email_confirmed_at is not null or new.email_confirmed_at is null) then
    return new;
  end if;
  if tg_op = 'INSERT' and new.email_confirmed_at is null then
    return new;
  end if;

  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'notify_new_user_url' limit 1;
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'notify_new_user_secret' limit 1;
  if fn_url is null or fn_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object(
      'email', new.email,
      'name', new.raw_user_meta_data ->> 'name',
      'created_at', new.created_at,
      'confirmed_at', new.email_confirmed_at
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', fn_secret)
  );
  return new;
exception when others then
  raise warning 'notify_new_user falhou: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notify_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.notify_new_user();
