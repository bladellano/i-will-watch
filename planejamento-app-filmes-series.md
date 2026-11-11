# Planejamento do projeto --- Minha lista de filmes e séries

## 1. Visão geral

Desenvolver uma aplicação web pessoal para centralizar filmes e séries
que encontro em diferentes canais --- WhatsApp, e-mail, redes sociais,
sites ou indicações de amigos.

A aplicação deverá permitir cadastrar uma obra manualmente ou a partir
de uma imagem/link. O reconhecimento de imagem com IA será **opcional e
acionado somente quando o usuário desejar**, para controlar custos. A
aplicação utilizará os dados de catálogo do **TMDB**; não haverá
integração com IMDb.

O produto deverá funcionar bem em desktop e dispositivos móveis e poderá
ser instalado como **PWA**.

## 2. Objetivos do MVP

-   Centralizar filmes e séries em um único lugar.
-   Cadastrar obras manualmente por título.
-   Permitir informar uma URL como referência.
-   Permitir anexar uma imagem ou captura de tela.
-   Oferecer reconhecimento por IA como recurso opcional, nunca
    obrigatório.
-   Encontrar e confirmar a obra correspondente no TMDB.
-   Exibir informações como capa, sinopse, data de lançamento, gêneros e
    avaliação do TMDB.
-   Organizar as obras em listas e acompanhar seu status.
-   Evitar registros duplicados.
-   Oferecer uma experiência responsiva e instalável como PWA.

## 2.1 Decisões fechadas

Decisões tomadas após a revisão deste documento. Elas prevalecem sobre
qualquer trecho anterior que pareça divergir.

-   **Ambiente de desenvolvimento:** 100% local (Node.js + npm + Vite),
    acessando o Supabase hospedado. Nenhum workspace em nuvem faz parte
    do fluxo por enquanto.
-   **Papel da LLM neste momento:** gerar o projeto Vue 3, o código, as
    migrations e as Edge Functions como arquivos. Comandos que dependem
    das credenciais do projeto (`supabase login`, `link`, `db push`,
    `functions deploy`, `secrets set`) são executados pelo usuário no
    ambiente local; a LLM informa cada comando e como validar o
    resultado.
-   **Credenciais:** ficam no arquivo `credentials.txt`, na raiz do
    projeto local. Esse arquivo nunca é versionado (ver seção 10).
-   **Escopo de cada execução:** uma etapa por vez, começando pela
    Etapa 1. Só avançar após o usuário validar o critério de conclusão.
-   **Autenticação:** e-mail e senha (Supabase Auth). Sem login social e
    sem magic link no MVP.
-   **Cadastro:** aberto, modelo multiusuário com RLS. O usuário pode
    desativar novos cadastros no painel do Supabase caso o uso seja
    apenas pessoal.
-   **Listas:** definidas pelo usuário, em quantidade ilimitada. Ao
    criar a conta, o usuário recebe uma lista inicial chamada
    `default`, cujo nome e descrição são editáveis. Não existem listas
    padrão fixas (os nomes "Quero assistir", "Assistindo" etc. do
    rascunho inicial eram apenas exemplos).
-   **Status da obra:** três valores iniciais: `ASSISTIR`, `ARQUIVADO` e
    `ASSISTIDO`. O status é independente das listas.
-   **Tailwind CSS:** adotado, junto com `lucide-vue-next` para ícones.
-   **Estrutura de pastas:** conforme a seção 9, criando apenas as
    pastas exigidas pela etapa em andamento.
-   **Gravação em `media`:** feita somente por Edge Function (service
    role), nunca diretamente pelo navegador (ver seções 7 e 8).
-   **Busca no TMDB (Etapa 2):** endpoint de busca multi, resultados em
    `pt-BR`, sem conteúdo adulto, descartando pessoas e mantendo apenas
    filmes e séries. A busca dispara somente ao enviar o formulário
    (não a cada tecla) e tem "Carregar mais".
-   **Gravação de obras (Etapa 2):** o navegador envia apenas
    `tmdb_id`, `media_type`, `list_id` e `status`. A Edge Function
    `add-media` valida o usuário pelo JWT, confirma que a lista é dele,
    busca os dados no TMDB e faz upsert em `media`. Se a obra já estiver
    na lista, a resposta é "já está nesta lista", sem duplicar e sem
    erro.
-   **JWT nas Edge Functions:** `verify_jwt = false` no
    `supabase/config.toml` e validação do usuário dentro de cada função
    (`getUser`), compatível com as novas chaves publishable.
-   **Gêneros (Etapa 3):** nova coluna `media.genres` (lista de nomes),
    gravada pela `add-media`. Obras cadastradas antes dessa coluna ficam
    sem gêneros até serem adicionadas de novo (a função atualiza `media`).
-   **Nota pessoal:** opcional, inteiro de 1 a 10 (`CHECK` no banco).
-   **Origem da indicação:** existe apenas para capturas (Etapa 4), em
    `capture_requests`. Não faz parte da tela de detalhes na Etapa 3.
-   **Data assistida:** preenchida com a data de hoje ao marcar
    `ASSISTIDO` (editável) e limpa ao sair desse status.
-   **Detalhes da obra:** rota `/listas/:listaId/obras/:vinculoId`,
    porque status, nota e observações pertencem ao vínculo obra-lista.
-   **Filtros e busca nas listas:** por status, tipo e título, feitos no
    navegador sobre a lista carregada, sem paginação, ordenada pelas
    mais recentes.
-   **Remover obra de uma lista:** incluído, com confirmação. Remove só o
    vínculo (`list_media`); a obra continua em `media` e nas outras
    listas.
-   **Gerenciar listas:** criar, renomear, editar descrição e excluir
    (com confirmação) na tela inicial. A lista `default` não tem opção
    de excluir. Cada lista mostra a quantidade de obras.
-   **Fluxo de captura (Etapa 4):** a tela `/capturar` salva a captura
    (imagem opcional, título, URL e origem opcionais) com status
    `pending`, sem chamar a IA, e leva a `/capturas/:id`, onde ficam
    "Identificar com IA", "Buscar manualmente" e "Descartar". A tela
    inicial lista as capturas pendentes.
-   **Storage:** bucket privado `captures`, caminho
    `{user_id}/{capture_id}.{ext}`, acesso somente à própria pasta.
    Aceita JPEG, PNG e WebP, até 5 MB, e a imagem é enviada sem
    redimensionar.
-   **Controle de custo da IA:** aviso explícito antes de executar; cada
    captura roda a IA com sucesso no máximo uma vez (só repete se
    falhou ou não achou candidatos); teto de **10 identificações por
    usuário a cada 24 horas** (janela móvel), registradas em
    `ai_usage_log`. Nada roda no upload, em segundo plano ou agendado.
-   **Resposta da IA:** até 3 candidatos (título, título original, tipo,
    ano e confiança), validados e saneados pela função. Cada candidato
    é buscado no TMDB e a tela mostra até 6 resultados, sem repetir.
    Confiança baixa recebe aviso. Sem resultados, a captura fica
    `failed` com mensagem e a busca manual continua disponível.
-   **Modelo e chave:** Responses API da OpenAI com saída estruturada
    (JSON Schema estrito), `store: false` e modelo padrão `gpt-5-mini`,
    trocável pela secret `OPENAI_MODEL`. A chave fica na secret
    `OPENAI_API_KEY`. Recomenda-se definir um limite mensal de gasto no
    painel da OpenAI.
-   **URL e origem:** a URL é só referência (http/https), nunca
    acessada pelo backend e enviada à IA apenas como texto de contexto.
    A origem é texto livre opcional. Ambas ficam em `capture_requests`.
-   **Conclusão da captura:** ao confirmar um candidato (ou resolver
    pela busca manual), a `add-media` recebe `capture_id`, confirma que
    a captura é do usuário, grava `selected_media_id`, muda o status
    para `completed` e apaga a imagem do Storage (`image_path` vira
    nulo).
-   **Descartar captura:** apaga o arquivo e o registro.

## 3. Stack tecnológica

### Frontend

-   Vue 3.
-   Composition API.
-   TypeScript.
-   Vite.
-   Vue Router.
-   Pinia para estado compartilhado da interface.
-   PWA com `vite-plugin-pwa`.
-   Tailwind CSS (decisão fechada: será utilizado).
-   `lucide-vue-next` para ícones.

### Backend e infraestrutura

-   Supabase hospedado (projeto externo), utilizado tanto durante o
    desenvolvimento local quanto em produção.
-   Supabase PostgreSQL para banco de dados.
-   Supabase Auth para autenticação.
-   Supabase Storage para imagens anexadas.
-   Supabase Edge Functions para integrações e operações que não devem
    ocorrer no navegador.
-   Supabase Row Level Security (RLS) para proteger os dados por
    usuário.

**Importante sobre o ambiente local:** o frontend executado localmente
deverá apontar para o projeto Supabase hospedado. Não será necessário
executar uma instância local do Supabase nem utilizar Docker no fluxo
inicial. As credenciais e configurações do projeto externo serão
fornecidas por variáveis de ambiente locais.

### Serviços externos

-   TMDB API: fonte de dados de filmes e séries, incluindo títulos,
    sinopses, imagens, gêneros, datas e avaliações do próprio TMDB.
-   OpenAI API: utilizada somente no fluxo opcional de
    reconhecimento/extração de informações de imagens ou textos.

Não integrar IMDb nem utilizar scraping para obter avaliações de outras
plataformas.

## 4. Regras importantes de arquitetura e custos

-   O cadastro manual deve funcionar sem chamar a OpenAI.
-   A pesquisa de título no TMDB deve funcionar sem reconhecimento por
    IA.
-   O reconhecimento de imagem deve ser uma ação explícita do usuário,
    por exemplo, por meio de um botão "Identificar com IA".
-   Não enviar imagens à OpenAI automaticamente durante o upload.
-   Antes de executar o reconhecimento, informar que o recurso utiliza
    IA e pode gerar custo.
-   Não executar reconhecimento recorrente, em segundo plano ou por
    agendamento.
-   Armazenar a imagem original no Supabase Storage somente quando
    necessário para o fluxo do usuário.
-   Manter as chaves da OpenAI e do TMDB exclusivamente nas secrets das
    Edge Functions. Nunca expor essas chaves no frontend.
-   Usar o TMDB como fonte de catálogo e avaliação. Identificar
    claramente a avaliação como "Nota TMDB".
-   Evitar dependência de um backend próprio tradicional neste primeiro
    momento; utilizar Edge Functions quando for necessário executar
    lógica protegida ou integrar serviços externos.
-   Não assumir que dados recebidos da IA estão corretos. Exibir
    resultados candidatos e permitir confirmação do usuário.

## 5. Funcionalidades e fluxos

### 5.0 Autenticação

1.  Telas de cadastro, login e logout com e-mail e senha (Supabase
    Auth).
2.  Rotas de listas, busca e detalhes exigem usuário autenticado; o
    router redireciona usuários anônimos para o login.
3.  Ao criar a conta, um trigger no banco cria o `profiles` e a lista
    `default` do usuário (ver seção 7).
4.  Login social e magic link estão fora do escopo do MVP.

### 5.1 Cadastro manual

1.  Usuário acessa a opção de adicionar uma obra.
2.  Informa o nome do filme ou série.
3.  A aplicação pesquisa no TMDB.
4.  Exibe os resultados encontrados, diferenciando filmes e séries.
5.  Usuário seleciona a obra correta.
6.  Aplicação apresenta uma prévia dos dados.
7.  Usuário escolhe a lista de destino (a lista `default` vem
    pré-selecionada), define o status (padrão `ASSISTIR`) e confirma a
    inclusão.

Esse fluxo deve ser completo e independente de IA.

### 5.2 Cadastro por imagem com reconhecimento opcional

1.  Usuário seleciona ou captura uma imagem.
2.  Opcionalmente, informa um título, contexto ou URL para ajudar na
    identificação.
3.  A imagem pode ser armazenada no Supabase Storage.
4.  A aplicação apresenta a ação explícita "Identificar com IA".
5.  Somente após essa ação, uma Edge Function envia a imagem e o
    contexto necessário à OpenAI.
6.  A IA retorna um ou mais possíveis títulos em formato estruturado.
7.  A Edge Function consulta o TMDB para localizar correspondências.
8.  A interface apresenta os candidatos para confirmação.
9.  Usuário seleciona a obra correta e confirma a inclusão.

Se o usuário não quiser utilizar IA, deverá poder ignorar essa etapa e
pesquisar manualmente no TMDB.

### 5.3 Cadastro por URL

-   Permitir salvar uma URL como referência da indicação.
-   Quando possível, permitir que o usuário informe também o título.
-   A extração automática de informações de páginas externas não é
    obrigatória no MVP.
-   Não implementar scraping genérico como requisito inicial.
-   A URL poderá ser mantida como origem/referência do cadastro.

### 5.4 Listas e acompanhamento

**Listas**

-   O usuário pode criar, renomear, editar a descrição e excluir listas,
    sem limite de quantidade.
-   Ao criar a conta, é criada automaticamente uma lista chamada
    `default` (nome e descrição editáveis).
-   A lista marcada com `is_default = true` não pode ser excluída, mas
    pode ser renomeada. Isso garante que o usuário sempre tenha ao menos
    uma lista de destino.
-   Uma mesma obra pode estar em mais de uma lista. Os dados de catálogo
    não são duplicados (ficam em `media`).
-   Uma obra não pode ser adicionada duas vezes à mesma lista.
-   Ao excluir uma lista, somente os vínculos dela em `list_media` são
    removidos (`ON DELETE CASCADE`). A obra continua em `media` e nas
    demais listas do usuário.
-   Nota pessoal, observações, `watched_at` e origem pertencem ao vínculo
    obra-lista (`list_media`); a origem da captura fica em
    `capture_requests`.

**Status**

-   Valores iniciais: `ASSISTIR`, `ARQUIVADO`, `ASSISTIDO`.
-   Status padrão ao adicionar uma obra: `ASSISTIR`.
-   O status é armazenado em cada vínculo obra-lista (`list_media`).
-   Ao marcar uma obra como `ASSISTIDO`, `watched_at` é preenchido com a
    data atual (editável pelo usuário). Ao sair desse status,
    `watched_at` pode ser limpo.
-   Novos status poderão ser adicionados no futuro por migration; o
    conjunto não é configurável pelo usuário no MVP.

**Informações pessoais por obra**

-   Status.
-   Nota pessoal (opcional, inteiro de 1 a 10).
-   Observações.
-   Data em que foi adicionada.
-   Data em que foi assistida, quando aplicável.
-   Origem da indicação, quando disponível (somente para capturas, a
    partir da Etapa 4; não exibida na Etapa 3).

### 5.5 Detalhes da obra

Exibir, quando disponíveis no TMDB:

-   Título e título original.
-   Tipo: filme ou série.
-   Capa e imagem de fundo.
-   Sinopse.
-   Data de lançamento ou primeira exibição.
-   Gêneros (`media.genres`, lista de nomes gravada pela `add-media`).
-   Avaliação do TMDB.
-   Identificador e link de referência no TMDB.

Não apresentar a avaliação do TMDB como se fosse uma nota do IMDb.

## 6. PWA

A aplicação deverá ser preparada como Progressive Web App.

Requisitos iniciais:

-   Manifest com nome, nome curto, ícones e cores do aplicativo.
-   Service worker gerenciado por `vite-plugin-pwa`.
-   Layout responsivo e adequado ao uso em celular.
-   Possibilidade de instalação em dispositivos compatíveis.
-   Tela/estado apropriado quando estiver sem conexão.
-   Cache de arquivos estáticos da aplicação.
-   Não armazenar em cache indiscriminadamente dados privados ou
    respostas autenticadas do Supabase.
-   Não prometer funcionamento offline completo no MVP: operações que
    dependem de autenticação, banco, Storage, TMDB ou IA exigem conexão.

A estratégia de cache e eventual suporte offline para leitura poderão
ser evoluídos depois que os fluxos online estiverem estáveis.

## 7. Modelagem inicial do banco de dados

A modelagem abaixo é uma proposta inicial. Validar relacionamentos,
constraints, índices e políticas RLS antes de implementar as migrations.

### `profiles`

-   `id`: UUID, chave primária e referência a `auth.users`.
-   `name`: nome de exibição, opcional.
-   `created_at`: timestamp.

### `media`

Armazena os dados de catálogo, evitando repetir informações da mesma
obra.

-   `id`: UUID, chave primária.
-   `tmdb_id`: identificador da obra no TMDB.
-   `media_type`: `movie` ou `tv`.
-   `title`: título de exibição.
-   `original_title`: título original.
-   `release_date`: data de lançamento ou primeira exibição, quando
    disponível.
-   `overview`: sinopse.
-   `poster_path`: caminho da imagem de capa no TMDB.
-   `backdrop_path`: caminho da imagem de fundo no TMDB.
-   `tmdb_rating`: avaliação do TMDB.
-   `genres`: lista de nomes de gêneros (`text[]`, padrão vazio).
-   `created_at`: timestamp.

Criar constraint única para `(tmdb_id, media_type)`.

### `lists`

-   `id`: UUID, chave primária.
-   `user_id`: referência ao usuário.
-   `name`: nome da lista (editável).
-   `description`: descrição opcional (editável).
-   `is_default`: indica a lista inicial `default` do usuário; essa
    lista não pode ser excluída.
-   `created_at`: timestamp.

### `list_media`

Relaciona obras às listas dos usuários.

-   `id`: UUID, chave primária.
-   `list_id`: referência a `lists`.
-   `media_id`: referência a `media`.
-   `status`: `ASSISTIR` (padrão), `ARQUIVADO` ou `ASSISTIDO`, com
    `CHECK` na coluna (ou enum do Postgres).
-   `personal_rating`: nota pessoal opcional, inteiro de 1 a 10
    (`CHECK`).
-   `notes`: observações opcionais.
-   `added_at`: data de inclusão.
-   `watched_at`: data em que foi assistida, quando aplicável.

Constraint única em `(list_id, media_id)` para impedir que a mesma obra
seja adicionada duas vezes à mesma lista. A mesma obra pode existir em
várias listas.

### Trigger de novo usuário

Trigger em `auth.users` (`AFTER INSERT`, `SECURITY DEFINER`) que cria:

-   o registro em `profiles`;
-   uma lista chamada `default` com `is_default = true`.

Incluir esse trigger nas migrations iniciais (Etapa 1).

### `capture_requests`

Registra entradas recebidas por imagem ou outros meios de captura.

-   `id`: UUID, chave primária.
-   `user_id`: referência ao usuário.
-   `image_path`: caminho da imagem no Storage, opcional.
-   `input_title`: título informado pelo usuário, opcional.
-   `input_url`: URL de origem, opcional.
-   `source`: origem da indicação, opcional.
-   `status`: estado do processamento.
-   `ai_result`: resultado estruturado da IA, JSONB e opcional.
-   `selected_media_id`: obra confirmada, opcional.
-   `error_message`: mensagem de erro, opcional.
-   `created_at`: timestamp.
-   `processed_at`: timestamp, opcional.

Estados possíveis:

-   `pending`: aguardando ação/processamento.
-   `processing`: reconhecimento em andamento.
-   `needs_review`: existem candidatos para confirmação.
-   `completed`: cadastro concluído.
-   `failed`: ocorreu um erro.

O registro de captura não deve obrigar a execução da IA. Uma captura
pode permanecer sem reconhecimento e ser resolvida manualmente.

**Regras adicionadas na Etapa 4**

-   O cliente só cria e lê capturas: pode gravar apenas `id`,
    `image_path`, `input_title`, `input_url` e `source`. `status`,
    `ai_result`, `selected_media_id`, `error_message` e `processed_at`
    são alterados somente pelas Edge Functions.
-   `image_path` deve começar com o `user_id` do dono. Limites:
    título até 200 caracteres, URL até 2048 (http/https) e origem até
    100.
-   `processed_at` marca o início da última tentativa de identificação.
    Uma captura em `processing` há mais de 5 minutos pode ser
    reprocessada (proteção contra travamento).

### `ai_usage_log`

Registra cada execução da IA para limitar o uso e acompanhar custos.
Somente as Edge Functions (service role) leem e gravam.

-   `id`: UUID, chave primária.
-   `user_id`: referência ao usuário.
-   `capture_id`: captura relacionada, opcional (`ON DELETE SET NULL`).
-   `model`: modelo utilizado.
-   `input_tokens`, `output_tokens`: consumo informado pela OpenAI,
    quando disponível.
-   `created_at`: timestamp.

## 8. Segurança e acesso aos dados

-   Ativar RLS nas tabelas que contêm dados privados do usuário.
-   Restringir listas, capturas e relações de obras ao respectivo
    `user_id`.
-   Garantir que um usuário não consiga consultar ou alterar dados
    privados de outro usuário.
-   Políticas RLS por tabela:
    -   `profiles`: cada usuário lê e altera somente o próprio registro.
    -   `lists` e `capture_requests`: acesso restrito a
        `user_id = auth.uid()`.
    -   `list_media`: não possui `user_id`; o acesso é concedido por
        `EXISTS` sobre `lists` pertencentes ao usuário autenticado.
    -   `media`: catálogo compartilhado, sem `user_id`. Leitura para
        qualquer usuário autenticado; sem política de
        `INSERT/UPDATE/DELETE` para clientes. A escrita ocorre somente
        em Edge Function com service role (upsert por
        `tmdb_id` + `media_type`).
-   Definir políticas de acesso ao Storage por usuário.
-   Validar autenticação e autorização dentro das Edge Functions (a
    identidade vem do JWT via `getUser`; as funções são publicadas com
    `verify_jwt = false` por essa validação interna).
-   Validar tipo, tamanho e conteúdo dos arquivos enviados.
-   Manter secrets somente no ambiente do Supabase.
-   Não confiar em `user_id` recebido diretamente do frontend: derivar a
    identidade a partir do contexto autenticado.
-   Evitar expor mensagens internas, tokens ou detalhes sensíveis em
    erros retornados ao cliente.

## 9. Organização sugerida do frontend

``` text
src/
├── assets/
├── components/
│   ├── ui/
│   ├── media/
│   └── lists/
├── modules/
│   ├── auth/
│   │   ├── components/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   ├── media/
│   │   ├── components/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   ├── lists/
│   │   ├── components/
│   │   ├── services/
│   │   ├── stores/
│   │   └── types/
│   └── capture/
│       ├── components/
│       ├── services/
│       ├── stores/
│       └── types/
├── layouts/
├── pages/
├── router/
├── services/
│   └── supabase/
├── stores/
├── composables/
├── App.vue
└── main.ts

supabase/
├── functions/
│   ├── identify-media/
│   ├── search-tmdb/
│   └── add-media/        # upsert em `media` (service role) + vínculo à lista
└── migrations/
```

Criar apenas as pastas necessárias para a etapa em andamento (por
exemplo, na Etapa 1: `modules/auth`, `services/supabase`, `router`,
`layouts` e `pages`). Os módulos `media`, `lists` e `capture` são criados
quando suas etapas começarem, sem pastas vazias.

A estrutura poderá ser ajustada conforme o crescimento do projeto.
Evitar criar abstrações ou camadas sem necessidade real.

## 10. Configuração do ambiente local

O desenvolvimento local utilizará o projeto Supabase hospedado.

### Variáveis locais do frontend

Criar `.env.local` na raiz:

``` env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Utilizar a chave publicável apropriada do projeto Supabase. A proteção
dos dados deve depender de Auth e RLS, não da ocultação dessa chave.

Adicionar ao `.gitignore`:

``` gitignore
.env
.env.local
.env.*.local
credentials.txt
```

### Arquivo `credentials.txt`

As credenciais do projeto estão em `credentials.txt`, na raiz do
projeto local. Regras:

-   Nunca versionar o arquivo (listado no `.gitignore`) e nunca copiar
    seu conteúdo para código-fonte ou documentação.
-   Somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são
    copiadas para `.env.local`.
-   A OpenAI API Key e o TMDB Token vão exclusivamente para as secrets
    do Supabase (comandos abaixo), nunca para variáveis `VITE_`.

### Secrets do backend

Configurar as chaves de serviços externos como secrets no projeto
Supabase, nunca como variáveis `VITE_`:

``` bash
npx supabase secrets set OPENAI_API_KEY=sua_chave
npx supabase secrets set TMDB_API_TOKEN=seu_token
```

A secret da OpenAI só será utilizada pela Edge Function responsável pelo
reconhecimento opcional. A secret do TMDB será utilizada pelas funções
de integração com o catálogo. Opcionalmente, `OPENAI_MODEL` troca o
modelo padrão (`gpt-5-mini`):

``` bash
npx supabase secrets set OPENAI_MODEL=nome_do_modelo
```

### CLI do Supabase

A CLI poderá ser utilizada para versionar e aplicar migrations e
publicar Edge Functions, mesmo sem executar o Supabase localmente.

Fluxo inicial sugerido:

``` bash
npm install supabase --save-dev
npx supabase init
npx supabase login
npx supabase link --project-ref SEU_PROJECT_ID
```

Não executar `npx supabase start` no fluxo padrão, pois o banco e os
serviços serão os do projeto hospedado.

## 11. Etapas de desenvolvimento

### Etapa 1 --- Fundação

-   Criar projeto Vue 3 com TypeScript e Vite.
-   Configurar Vue Router e Pinia.
-   Configurar cliente Supabase usando `.env.local`.
-   Conectar o ambiente local ao projeto Supabase hospedado.
-   Criar migrations iniciais.
-   Configurar Auth (e-mail e senha) e RLS, incluindo as políticas
    por tabela da seção 8.
-   Criar o trigger que gera `profiles` e a lista `default` ao
    cadastrar um usuário.
-   Criar telas de cadastro, login e logout e proteção de rotas.
-   Configurar Tailwind CSS.
-   Definir layout base responsivo.

**Critério de conclusão:** aplicação local conectada ao Supabase
externo, com cadastro/login funcionando, lista `default` criada
automaticamente para novos usuários e acesso aos dados protegido por
RLS.

### Etapa 2 --- Catálogo e cadastro manual

-   Implementar integração segura com TMDB (Edge Function `search-tmdb`).
-   Criar pesquisa de filmes e séries.
-   Exibir resultados com capa, título, ano e tipo.
-   Implementar seleção e confirmação.
-   Persistir a obra em `media` via Edge Function `add-media` (service
    role, upsert por `tmdb_id` + `media_type`).
-   Associar a obra a uma lista do usuário em `list_media`, com status
    inicial `ASSISTIR`.
-   Implementar prevenção de duplicidade.

**Critério de conclusão:** cadastrar uma obra manualmente, sem qualquer
chamada à OpenAI.

### Etapa 3 --- Listas e detalhes

-   Tela inicial com as listas do usuário e a quantidade de obras em
    cada uma.
-   Criar, renomear, editar a descrição e excluir listas (a lista
    `default` só pode ser renomeada/editada).
-   Página de uma lista (`/listas/:listaId`) com filtro por status, filtro
    por tipo (filme ou série) e busca por título, feitos no navegador,
    sem paginação.
-   Página de detalhes (`/listas/:listaId/obras/:vinculoId`) com título,
    título original, tipo, capa, imagem de fundo, sinopse, data, gêneros,
    "Nota TMDB" e link para o TMDB.
-   Alterar status, nota pessoal (1 a 10), observações e data assistida.
-   Remover uma obra da lista, com confirmação.
-   Estados vazios, de carregamento e de erro em todas as telas.
-   Migration que adiciona `media.genres` e o `CHECK` da nota; a função
    `add-media` passa a gravar os gêneros.

**Critério de conclusão:** usuário consegue organizar e acompanhar suas
obras (criar listas, ver o conteúdo, editar dados pessoais e remover).

### Etapa 4 --- Captura de imagem e IA opcional

-   Bucket privado `captures` e políticas por pasta do usuário.
-   Tela `/capturar`: imagem (JPEG, PNG, WebP, até 5 MB), título, URL e
    origem opcionais; salva em Storage e em `capture_requests` sem
    chamar a IA.
-   Tela `/capturas/:id`: dados da captura e as ações "Identificar com
    IA" (com aviso de custo), "Buscar manualmente" e "Descartar".
-   Seção "Capturas pendentes" na tela inicial.
-   Edge Function `identify-media`: valida o usuário e a captura,
    aplica o teto de 10 execuções por 24 horas, reserva a captura de
    forma atômica, envia imagem e contexto à OpenAI (saída estruturada),
    busca candidatos no TMDB e grava o resultado.
-   Exibir candidatos com indicação de confiança e exigir confirmação
    antes de cadastrar.
-   Tratar falhas, baixa confiança e ausência de resultados, sempre
    permitindo o caminho manual.
-   `add-media` conclui a captura e apaga a imagem.

**Critério de conclusão:** reconhecimento funciona sob demanda, com
custo controlado e confirmação antes de cadastrar.

### Etapa 5 --- PWA (concluída e validada)

**Decisões:**

-   `vite-plugin-pwa` 2.0.0 com `registerType: 'prompt'`: nova versão só
    é aplicada quando o usuário clica em "Atualizar" (verificação a cada
    hora).
-   Service worker (`generateSW`) com *precache* apenas dos arquivos
    estáticos do app (js, css, html, ícones, manifest).
-   **Sem cache de runtime**: respostas do Supabase, Edge Functions,
    TMDB e imagens de captura nunca são armazenadas, evitando dado
    privado em cache.
-   Sem modo offline funcional: o app abre, mas exibe o aviso "Sem
    conexão" e mensagens de erro específicas (`requestError`).
-   Service worker desativado em desenvolvimento (`devOptions.enabled:
    false`); validar com `npm run build && npm run preview`.
-   Manifest: nome "Minha lista de filmes e séries", nome curto "Minha
    lista", `pt-BR`, `display: standalone`, tema/fundo `#020617`.
-   Ícones gerados a partir de `public/icon.svg` com
    `npm run generate-pwa-assets` (192, 512, maskable, apple-touch,
    favicon).
-   Ajustes mobile: `viewport-fit=cover`, safe-area no `body`.

**Arquivos principais:** `vite.config.ts`, `pwa-assets.config.ts`,
`index.html`, `src/components/ui/{UpdatePrompt,OfflineBanner}.vue`,
`src/composables/useOnline.ts`, `src/services/network.ts`.

**Validação:** `npm install`; `npm run build && npm run preview`; no
Chrome, DevTools → Application: Manifest sem erros, Service Worker
ativo, Cache Storage somente com arquivos do app; desligar a rede e
conferir o aviso; instalar pelo ícone de instalação do navegador.
Observação: instalação em celular exige HTTPS (Etapa 6, publicação).

**Critério de conclusão:** aplicação instalável e responsiva, sem
comprometer a segurança dos dados.

### Etapa 6 --- Qualidade e refinamento

**Decisões:**

-   Entrega em duas partes: **6A** (testes unitários, RLS e
    acessibilidade) e **6B** (Playwright, custos e publicação).
-   Vitest: testes sem rede (utilitários, `requestError`, stores Pinia e
    serviço de auth com Supabase simulado), em
    `src/**/__tests__/*.spec.ts`; `npm test`.
-   RLS: `npm run test:rls` roda contra o Supabase real com 2 usuários de
    teste (`.env.test.local`, a partir de `.env.test.example`; nunca
    usar a conta principal). Cada teste tenta acessar dados do outro
    usuário e espera negação; os dados criados são removidos.
-   Acessibilidade: correções diretas (foco visível, link "Ir para o
    conteúdo", `h1`, título por rota, diálogos nomeados, status
    anunciado, alvos de toque maiores, `prefers-reduced-motion`) e
    verificação automática com `axe-core` no Playwright (6B).
-   Playwright (6B): contra `npm run preview` e o Supabase real, com
    usuário de teste dedicado; IA sempre simulada (sem custo OpenAI).
-   Custos (6B): relatório com SQL sobre `ai_usage_log` e revisão das
    chamadas a TMDB/OpenAI; sem painel novo.
-   Publicação (6B): apenas documentação (Vercel, com nota sobre
    Netlify): HTTPS, variáveis `VITE_*`, SPA fallback e URLs de
    redirecionamento do Supabase Auth. Nada é publicado automaticamente.

**6A --- concluída e validada.** Arquivos:
`vitest.config.ts`, `vitest.rls.config.ts`, `tests/rls/rls.spec.ts`,
`.env.test.example`, specs em `src/**/__tests__/`.

**6B --- concluída e validada.**

-   Playwright (`npm run test:e2e`, config em `playwright.config.ts`):
    sobe `build` + `preview` na porta 4173 e usa o usuário de teste A de
    `.env.test.local`. Primeira vez: `npx playwright install chromium`.
    Specs em `tests/e2e/`: `auth` (redirecionamento, validação, erro
    genérico, login/logout), `lists-and-media` (criar lista, adicionar
    obra pelo TMDB real, status, nota, persistência, validação de nota,
    remover, excluir lista; lista default sem exclusão), `capture`
    (aviso de custo, cancelamento sem chamada, chamada única à IA
    **simulada** com resposta 429, pendente na home, descarte) e `a11y`
    (`axe-core` WCAG A/AA nas telas e em um diálogo; falha só em
    violações *serious/critical*; teste de teclado com o link de salto).
    Dados criados usam o prefixo `e2e-` e são removidos pelo próprio
    teste.
-   Custos: `docs/custos.md` (mapa de chamadas externas, controles,
    consultas SQL sobre `ai_usage_log`, limites do plano gratuito e um
    ponto de atenção: tentativas de IA que falham não entram no teto
    diário; não alterado).
-   Publicação: `docs/publicacao.md` (Vercel, com nota sobre Netlify;
    variáveis `VITE_*`, URLs do Supabase Auth, verificação pós-deploy) e
    `vercel.json` (SPA fallback e sem cache do `sw.js`). Nada foi
    publicado.

**Critério de conclusão:** testes automatizados dos fluxos críticos,
RLS validado com mais de um usuário e documentação de configuração e
publicação.

## 11.0 Ajustes pós-Etapa 6

-   **Login:** texto "Para que serve este app" (objetivo do produto)
    exibido abaixo do formulário de login.
-   **Cores do status:** Para assistir = verde, Assistido = azul,
    Arquivado = cinza (`src/modules/media/utils/status-style.ts`).
-   **Ordenação da lista:** sempre Para assistir → Assistido →
    Arquivado (`sortListItems`); dentro de cada status, itens fixados
    primeiro e o restante na ordem de inclusão mais recente.
-   **Fixar itens:** coluna `list_media.is_pinned` (migração
    `20261111160000_list_media_pinned.sql`, exige `npx supabase db
    push`); botão de fixar/desafixar em cada card da lista, com destaque
    visual e etiqueta "Fixado". RLS existente já protege o campo.
-   Correções: painel de confirmação visível no celular; erro ao salvar
    nota (`parseRating`).
-   **Nome do usuário:** o cadastro agora pede o nome (obrigatório, 1 a
    80 caracteres), enviado em `user_metadata.name` e copiado para
    `profiles.name` pelo gatilho `handle_new_user`. Nova página
    `/perfil` (e-mail somente leitura + edição do nome) e o cabeçalho
    mostra o nome, com o e-mail como alternativa enquanto não houver
    nome. Migração `20261111170000_profile_name_rules.sql`: limite de
    80 caracteres, normalização do nome e gatilho resistente a nomes
    vazios/longos. Usuários anteriores ao ajuste ficam com nome vazio até
    preencherem em `/perfil`.
-   **Publicação:** `docs/publicacao.md` ganhou a seção 3.1 (SMTP
    próprio, Site URL e limite de e-mails do Supabase).

## 11.1 Andamento

-   Etapa 1 --- Fundação: concluída e validada.
-   Etapa 2 --- Catálogo e cadastro manual: concluída e validada.
-   Etapa 3 --- Listas e detalhes: concluída e validada.
-   Etapa 4 --- Captura de imagem e IA opcional: concluída e validada.
-   Etapa 5 --- PWA: concluída e validada.
-   Etapa 6A --- Testes unitários, RLS e acessibilidade: concluída e validada.
-   Etapa 6B --- Playwright, custos e publicação: concluída e validada (10 testes E2E passando).
-   Todas as etapas (1 a 6) concluídas e validadas. Próximo passo: publicar conforme `docs/publicacao.md`.

## 12. Fora do escopo inicial

Não implementar antes de validar o MVP:

-   Login social e magic link.
-   Status configuráveis pelo usuário e listas padrão fixas (como
    "Favoritos").
-   Integração com WhatsApp ou Telegram.
-   Importação automática de conteúdo de redes sociais.
-   Scraping genérico de sites.
-   Recomendações personalizadas complexas.
-   Estatísticas avançadas e dashboards.
-   Notificações recorrentes.
-   Sincronização offline completa.
-   Processamento automático em lote de imagens.
-   Filas e infraestrutura adicional para processamento assíncrono,
    salvo necessidade comprovada.

## 13. Diretrizes para a LLM durante o desenvolvimento

Utilize este documento como especificação inicial do projeto.

-   Trabalhe em etapas pequenas e verificáveis. Não tente implementar o
    projeto inteiro de uma vez.
-   Antes de alterar arquivos, analise a estrutura existente e preserve
    decisões já implementadas que estejam corretas.
-   Comece pela Etapa 1 e avance somente após validar os critérios de
    conclusão.
-   Apresente um plano curto para cada etapa antes de executar
    alterações relevantes.
-   Gere código funcional, tipado e organizado, seguindo as convenções
    atuais do Vue 3, TypeScript e Supabase.
-   Prefira soluções simples e manuteníveis. Evite abstrações
    prematuras.
-   Não coloque secrets no frontend nem em arquivos versionados. Não
    copie o conteúdo de `credentials.txt` para nenhum arquivo do projeto.
-   Comandos que dependem de credenciais são executados pelo usuário
    localmente; informe o comando exato e como validar o resultado.
-   Não faça chamadas à OpenAI no fluxo de cadastro manual ou durante o
    upload. O reconhecimento deve depender de uma ação explícita do
    usuário.
-   Use exclusivamente o TMDB como catálogo externo e fonte de
    avaliação.
-   Não invente endpoints, parâmetros ou formatos de resposta. Consulte
    a documentação oficial quando necessário.
-   Crie e mantenha migrations versionadas para alterações no banco.
-   Implemente e revise RLS desde o início, não como uma etapa
    posterior.
-   Inclua tratamento de erros, estados de carregamento e validação de
    entradas.
-   Não considere uma funcionalidade concluída sem validar seu fluxo
    principal.
-   Ao concluir cada etapa, informe arquivos criados/alterados, decisões
    tomadas, comandos executados e como testar.
-   Se houver ambiguidade relevante neste documento, apresente a dúvida
    antes de tomar uma decisão que afete arquitetura, segurança ou
    custos.

## 14. Referências oficiais

-   Vue: https://vuejs.org/guide/introduction.html
-   Vite: https://vite.dev/guide/
-   Pinia: https://pinia.vuejs.org/
-   Supabase: https://supabase.com/docs
-   Supabase Auth: https://supabase.com/docs/guides/auth
-   Supabase Storage: https://supabase.com/docs/guides/storage
-   Supabase Edge Functions: https://supabase.com/docs/guides/functions
-   Supabase RLS:
    https://supabase.com/docs/guides/database/postgres/row-level-security
-   TMDB API: https://developer.themoviedb.org/docs
-   OpenAI API: https://platform.openai.com/docs
-   vite-plugin-pwa: https://vite-pwa-org.netlify.app/
-   Vitest: https://vitest.dev/guide/
-   Playwright: https://playwright.dev/docs/intro
