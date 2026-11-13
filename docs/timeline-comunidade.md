# Timeline da comunidade

Seção da home que mostra o que os membros estão comentando e curtindo, para dar visibilidade às impressões
sobre as obras (antes restritas à página de cada obra) e deixar a comunidade mais ativa.

Este documento registra o escopo do MVP, as decisões tomadas e o backlog da **fase 2**.

## 1. Escopo do MVP

- **Dois tipos de atividade:** comentários e curtidas em adições de obras.
- **Comentário = campo "Observações".** Ao salvar a obra com texto nas Observações, o texto aparece na timeline
  (um registro por obra do membro). Não existe um segundo lugar para comentar.
- **Abas:** Todas, Comentários e Curtidas (a aba "Atividades" entra na fase 2).
- **Editar:** o autor edita pelo menu "⋯" do card (edição inline) ou direto nas Observações. O card continua no
  mesmo lugar e ganha "(editado)", sem histórico de versões.
- **Tirar da timeline:** o menu "⋯" do card (ou o link "Tirar da timeline" na página da obra) remove o card para
  todos e **mantém o texto nas Observações**. Salvar sem mexer no texto não volta a publicar; editar o texto e
  salvar publica de novo. Apagar o texto das Observações também tira da timeline.
- **Curtidas:** quem curtiu desfaz a própria curtida pelo botão "Desfazer curtida", e ela some da timeline.
- **Ação nos cards de outros membros:** copiar a obra para uma das suas listas (mesmo fluxo dos modais de
  membros), para transformar uma indicação em registro com um toque.
- **Carregamento:** 20 itens por página, botão "Carregar mais" (paginação por cursor), sem tempo real. Os dados
  atualizam ao abrir a home, ao trocar de aba ou depois de 1 minuto.
- **Datas:** relativas por 7 dias ("há 12 minutos"), depois absolutas ("08/11/2026").
- **Local:** seção abaixo de "Suas listas" e das capturas pendentes. Os widgets "Últimas obras adicionadas" e
  "Membros recentes" ficam como estão.
- **Identidade:** primeiro nome e avatar com a inicial (sem foto), como nos widgets atuais.

## 2. Decisões

| Tema | Decisão |
| --- | --- |
| Origem do comentário | O campo `list_media.notes` ("Observações"). Uma primeira versão usou uma tabela `media_comments` separada, com as Observações privadas. Isso não atendia ao objetivo (ver o que se escreve nas Observações na timeline), então foi removida pela migração `20261113180000_timeline_from_notes.sql`. |
| Notas que já existiam | Não são publicadas pela migração. Cada uma só aparece quando o dono salva a obra de novo, com o aviso visível sob o campo. |
| Excluir | "Tirar da timeline": o card some para todos e o texto continua nas Observações. |
| Curtida | Reaproveita `item_likes` (curtida na adição de uma obra por outro membro). Não há curtida de obra do catálogo. |
| Montagem da timeline | RPC `community_timeline` (security definer) que junta Observações publicadas e curtidas na leitura. Sem tabela de eventos. |
| Visibilidade | Público para membros logados. Não há "seguir" nem amigos. |
| Privacidade | Toggle `profiles.share_activity` (padrão ligado) no `/perfil`, ao lado de `share_lists`. Retroativo e aplicado na leitura. Não há opção por obra. |
| Moderação | Sem denúncia no MVP; remoção manual pelo painel do Supabase. |
| Limites | Observações com no máximo 1.000 caracteres (valida o banco, só quando o texto muda). Texto sempre simples, nunca HTML. O limite de 10 por hora da primeira versão deixou de existir: há um registro por obra, então não há enxurrada de cards. |

## 3. Privacidade

- **As Observações deixaram de ser privadas.** A página da obra avisa, sob o campo: "Ao salvar, este texto aparece
  na timeline da comunidade". Quem quer manter tudo fora desliga "Mostrar minha atividade na comunidade" no perfil.
- O membro sempre vê a própria atividade, marcada como "Você".
- Com `share_activity` desligado, comentários e curtidas do membro somem para os outros imediatamente, sem apagar
  nada. Ao religar, voltam.
- Uma curtida só aparece para terceiros se **quem curtiu** tem `share_activity` ligado **e** o **dono da adição**
  tem `share_lists` ligado, para não revelar o título de uma lista privada. O dono da adição vê as curtidas
  recebidas desde que quem curtiu compartilhe a atividade.
- Nunca são expostos e-mail, nota pessoal, status nem datas de assistido.

## 4. Modelo de dados

Migrações (exigem `npx supabase db push`):

- `20261113160000_community_timeline.sql`: `profiles.share_activity` (padrão ligado), a tabela `media_comments`
  e a primeira versão da RPC.
- `20261113180000_timeline_from_notes.sql`: remove `media_comments` e a RPC antiga, e cria:
  - `list_media.notes_published_at`, `notes_edited_at` (mantidas pelo banco) e `notes_hidden` (o único campo de
    publicação que o cliente escreve);
  - o gatilho `list_media_notes_publish` (`before insert or update of notes`), que decide a publicação:
    texto novo publica; edição de texto já publicado só marca `notes_edited_at`; texto igual não muda nada;
    nota antiga e nunca publicada é publicada no próximo salvamento; texto vazio zera o estado;
  - grant de update por coluna em `list_media` (`status`, `personal_rating`, `notes`, `watched_at`, `is_pinned`,
    `notes_hidden`), para que as datas de publicação não possam ser forjadas pelo cliente;
  - `community_timeline(p_type, p_before, p_before_id, p_limit)`: filtro `all | comment | like`, cursor por
    `(occurred_at, event_id)`, limite máximo de 50.
- Fixar ou desfixar uma obra não mexe na publicação (o gatilho só dispara quando `notes` faz parte do UPDATE).

## 5. Código

- Módulo `src/modules/timeline`: `components` (`CommunityTimeline`, `TimelineCommentCard`, `TimelineLikeCard`,
  `CommentBody`, `AuthorMenu`), `services` (`timeline.service`, `notes.service`), `stores/timeline.store.ts` e `utils`.
- Home: `CommunityTimeline` em `src/pages/HomePage.vue`.
- Página da obra (`MediaDetailPage.vue`): aviso de publicação, contador de 1.000 caracteres e o estado
  "Publicado na timeline" / "Fora da timeline" sob as Observações. `updateListItem` devolve o estado calculado pelo banco.
- Perfil: switch "Mostrar minha atividade na comunidade" (`profile.store`, `profile.service`).
- Logout: `timeline.reset()` em `AppLayout.vue`.

## 6. Testes

- Unitários: `src/modules/timeline/**/__tests__` e `profile.store.spec.ts`.
- RLS (`npm run test:rls`): bloco `Observações publicadas e timeline da comunidade` em `tests/rls/rls.spec.ts`.
- E2E (`npm run test:e2e`): `tests/e2e/timeline.spec.ts`. A acessibilidade da home já é varrida em `a11y.spec.ts`.

## 7. Fase 2 (fora do MVP)

Itens combinados para depois, em ordem aproximada de valor:

- **Aba "Atividades":** "adicionou X à lista", "começou a assistir" e "terminou de assistir". Cada tipo precisa
  de evento, card e filtro próprios.
- **Status `ASSISTINDO` e data de início estruturada.** Hoje o "comecei ontem" vive só no texto. O README cita
  `ASSISTINDO`, mas ele não existe no código.
- **Responder e curtir comentário** (aparecem no mockup): exigem threads, tabela de curtidas de comentário,
  notificações e, provavelmente, moderação.
- **Mais de um comentário por obra** (histórico de impressões) e **conversa por obra**, com os comentários de
  outros membros na página da obra.
- **Publicar por obra:** um "Mostrar na timeline" por obra, caso o toggle único do perfil não baste.
- **Denúncia e aprovação de cadastro:** o cadastro é aberto, então qualquer conta nova aparece para todos.
  Entram se a comunidade crescer.
- **Agrupar curtidas em sequência** ("Rafael curtiu 8 obras"), se o ruído virar problema.
- **Tempo real** (Supabase Realtime), avaliando o limite de conexões do plano gratuito.
- **Avatar com foto** (upload via Storage, moderação, redimensionamento) e **nome completo**.
- **Notificações** de comentário, resposta e curtida (a de curtida já existe pronta e desligada em
  `docs/publicacao.md`, seção 3.3).
- **Unificar com os widgets** "Últimas obras adicionadas" e "Membros recentes" se a timeline os tornar redundantes.
- **README desatualizado:** ainda descreve o app como estritamente pessoal e não lista os módulos `likes`,
  `members`, `profile`, `activity` e `timeline`.
