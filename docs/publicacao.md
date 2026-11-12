# Publicação

O frontend é um site estático (Vue + Vite). O backend (Supabase e Edge Functions) já roda na nuvem; publicar significa hospedar a pasta `dist/` com **HTTPS**, requisito para instalar o PWA no celular.

## 1. Pré-requisitos

- [ ] `npm test` e `npm run test:rls` passando; `npm run test:e2e` passando.
- [ ] Migrações aplicadas: `npx supabase db push`.
- [ ] Edge Functions publicadas: `npx supabase functions deploy search-tmdb add-media identify-media`.
- [ ] Secrets das funções configurados: `TMDB_API_TOKEN`, `OPENAI_API_KEY` (e opcionalmente `OPENAI_MODEL`). Confira com `npx supabase secrets list`.

## 2. Hospedagem recomendada: Vercel (plano gratuito)

1. Envie o repositório para o GitHub (confirme que `credentials.txt` e `.env*.local` não estão versionados).
2. Em vercel.com → **Add New Project** → importe o repositório. O Vercel detecta Vite.
3. Configuração do build: **Build Command** `npm run build`; **Output Directory** `dist`.
4. **Environment Variables** (Production e Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   Somente essas duas, com **exatamente** esses nomes: sem o prefixo `VITE_` (ex.: `SUPABASE_URL`) o Vite não as embute no site e o app abre em branco com o erro "Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não configuradas". Variáveis só entram no build: depois de criar ou alterar, faça **Redeploy sem cache de build**. A chave *publishable* é pública por desenho (a proteção está no RLS). **Nunca** crie variáveis `VITE_` com a chave da OpenAI, o token do TMDB ou a `service_role`: tudo com prefixo `VITE_` vai para o navegador.
5. O arquivo `vercel.json` já faz o *SPA fallback* (rotas como `/listas/123` abrem o app em vez de 404) e evita cache do `sw.js` e do manifest, para as atualizações do PWA chegarem.
6. Deploy. Anote a URL de produção (ex.: `https://i-will-watch.vercel.app`).

### Alternativa: Netlify

Mesmos passos (build `npm run build`, publish `dist`, mesmas variáveis). Para o SPA fallback, crie `public/_redirects` com `/*  /index.html  200`. Para o `sw.js`, adicione o cabeçalho `Cache-Control: no-cache` em `netlify.toml`.

## 3. Supabase Auth (obrigatório após publicar)

Em Supabase → **Authentication → URL Configuration**:

- **Site URL**: a URL de produção. É ela que vai nos e-mails de confirmação.
- **Redirect URLs**: adicione `https://SEU-DOMINIO/**` e mantenha `http://localhost:5173/**` para desenvolvimento.

Sem isso, o link do e-mail de confirmação aponta para o endereço errado.

### 3.1 E-mail de confirmação (SMTP próprio)

O serviço de e-mail embutido do Supabase envia só **2 e-mails por hora no projeto inteiro** e só para membros da equipe. Com ele, o cadastro de outras pessoas falha com "Muitas tentativas" (código `over_email_send_rate_limit`). Antes de convidar usuários:

1. Em **Authentication → Emails → SMTP Settings**, ative o SMTP personalizado (Gmail com **senha de app**, Resend, Brevo etc.). Nunca compartilhe essa senha em chats ou no repositório.
2. Em **Authentication → Rate Limits**, ajuste o limite de e-mails por hora (padrão com SMTP próprio: 30).
3. Confira a **Site URL**: se ficar `http://localhost:3000`, o link do e-mail de confirmação aponta para o endereço errado.
4. Teste com um e-mail novo e veja também a pasta de spam.

Alternativa para grupos pequenos e de confiança: desligar **Confirm email** em Authentication → Sign In / Providers → Email (o cadastro entra direto, sem verificação do e-mail).

### 3.2 Aviso por e-mail quando um novo usuário se cadastra

Quando alguém **conclui** o cadastro (confirma o e-mail, ou entra direto se "Confirm email" estiver desligado), o banco chama a Edge Function `notify-new-user`, que envia um e-mail ao administrador com nome, e-mail e horário.

Importante: o SMTP configurado em Authentication só serve aos e-mails do próprio Auth. A função usa **a mesma conta Gmail**, mas com credenciais guardadas como *secrets* da função. Falhas na notificação nunca impedem um cadastro.

Configuração, uma única vez (rode no terminal do projeto; **nunca cole senhas ou segredos em chats**):

1. Gere um segredo compartilhado: `openssl rand -hex 32`
2. Defina os secrets da função (use a **senha de app** do Gmail):
   ```
   npx supabase secrets set SMTP_HOST=smtp.gmail.com SMTP_PORT=465 \
     SMTP_USER=seu-gmail@gmail.com SMTP_PASS=senha-de-app-sem-espacos \
     ADMIN_NOTIFY_EMAIL=email-que-recebe@exemplo.com \
     NOTIFY_WEBHOOK_SECRET=o-segredo-gerado
   ```
   Opcional: `SMTP_FROM` (padrão: o próprio `SMTP_USER`).
3. Publique a função e a migração:
   ```
   npx supabase functions deploy notify-new-user
   npx supabase db push
   ```
4. No **SQL Editor** do Supabase, guarde no Vault a URL da função e o mesmo segredo:
   ```sql
   select vault.create_secret('https://SEU_PROJETO.supabase.co/functions/v1/notify-new-user', 'notify_new_user_url');
   select vault.create_secret('o-segredo-gerado', 'notify_new_user_secret');
   ```
5. Teste a função direto (deve chegar um e-mail e responder `{"ok":true}`):
   ```
   curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/notify-new-user \
     -H "Content-Type: application/json" -H "x-webhook-secret: o-segredo-gerado" \
     -d '{"email":"teste@exemplo.com","name":"Teste"}'
   ```
6. Teste o fluxo real com um cadastro novo e confirme o e-mail.

Diagnóstico: `select * from net._http_response order by created desc limit 5;` mostra a resposta da função às chamadas do banco; **Edge Functions → notify-new-user → Logs** mostra erros de SMTP. Sem os segredos do Vault, o gatilho não faz nada. Para desligar: apague os dois segredos do Vault.

## 4. Verificação pós-publicação

1. Abra a URL em HTTPS, cadastre-se (ou entre) e confirme o e-mail.
2. Acesse uma rota interna direto pela barra de endereço (ex.: `/capturar`): deve abrir, não dar 404.
3. DevTools → Application: Manifest sem erros e Service Worker ativo.
4. No celular: abra a URL no Chrome/Safari e use **Instalar app** / **Adicionar à tela inicial**.
5. Faça uma busca no `/adicionar` (valida TMDB) e uma captura sem IA. Teste a IA uma vez, de propósito.
6. Publique uma alteração pequena e confirme que o aviso "Nova versão disponível" aparece.

## 5. Segurança e custos em produção

- A anon/publishable key e a URL do Supabase aparecem no navegador; isso é esperado. O RLS valida o acesso (veja `npm run test:rls`).
- Mantenha um **limite de gasto** (*usage limit*) no painel da OpenAI como segunda barreira, além do teto de 10 identificações por usuário a cada 24 horas.
- Gire as chaves (OpenAI, TMDB) se algum dia vazarem, e atualize com `npx supabase secrets set`.
- As Edge Functions usam CORS aberto (`*`) e validam o usuário pelo JWT dentro da função. Se quiser restringir ao seu domínio, altere `corsHeaders` em `supabase/functions/_shared/http.ts` e faça novo deploy.
