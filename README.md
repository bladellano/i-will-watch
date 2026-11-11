# Minha Lista de Filmes e Séries

Uma aplicação web para centralizar, organizar e gerenciar suas recomendações de filmes e séries em um único lugar. Capture indicações de amigos, redes sociais, e-mails — com suporte a imagens, links e reconhecimento opcional por IA.

## 📋 Funcionalidades Principais

- **Cadastro de Obras** — Adicione filmes e séries manualmente por título ou através de captura de imagem (com IA opcional)
- **Integração com TMDB** — Busque informações completas (sinopse, data de lançamento, gêneros, avaliações)
- **Listas Personalizadas** — Organize seus conteúdos em quantas listas desejar (ex.: "Para Assistir", "Favoritos")
- **Gerenciamento de Status** — Acompanhe o progresso com status `ASSISTIR`, `ASSISTINDO` e `ASSISTIDO`
- **Notas Pessoais** — Adicione avaliações (1–10) e observações sobre cada obra
- **Reconhecimento por IA** — Identifique filmes/séries a partir de screenshots ou imagens (com limite de 10 requisições/dia)
- **Progressive Web App (PWA)** — Instale como aplicativo nativo em desktop e dispositivos móveis
- **Responsividade** — Experiência otimizada para todos os tamanhos de tela
- **Segurança** — Autenticação com e-mail/senha e controle de acesso baseado em linhas (RLS)

## 📦 Pré-requisitos

- **Node.js** — v22.18.0 ou >= v24.12.0
- **npm** — incluído com Node.js
- **Conta Supabase** — com projeto criado
- **Chaves de API** — TMDB (gratuita) e OpenAI (opcional, para IA)

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/i-will-watch.git
cd i-will-watch
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua-chave-aqui
```

> **Nota:** Nunca adicione a `service_role` key, tokens de API ou chaves privadas com prefixo `VITE_` — elas serão expostas no navegador.

### 4. Configure o Supabase localmente (opcional, para desenvolvimento)

```bash
npx supabase start
```

Isso inicia um servidor Supabase local. Para usar a instância em nuvem, pule este passo.

## 💻 Como Usar

### Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

### Build para Produção

```bash
npm run build
```

Gera a pasta `dist/` pronta para deploy.

### Preview do Build

```bash
npm run preview
```

Testa o build localmente antes de publicar.

## 🧪 Testes

### Testes Unitários

```bash
npm run test
```

Executa testes de unidade (Vitest).

### Modo Watch

```bash
npm run test:watch
```

Reexecuta os testes automaticamente ao salvar arquivos.

### Testes de Segurança (RLS)

```bash
npm run test:rls
```

Valida as políticas de Row-Level Security no Supabase.

### Testes E2E

```bash
npm run test:e2e
```

Executa testes end-to-end (Playwright) contra a versão de produção local.

> **Nota:** E2E requer credenciais de teste configuradas em `.env.test.local`. Veja `.env.test.example`.

## ⚙️ Configuração

### Variáveis de Ambiente (Development)

- `VITE_SUPABASE_URL` — URL do seu projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Chave pública do Supabase (seguro publicar)

### Variáveis de Ambiente (Supabase Edge Functions)

Defina via `npx supabase secrets set`:

- `TMDB_API_TOKEN` — Token da API do TMDB (gratuito)
- `OPENAI_API_KEY` — Chave da API OpenAI (para reconhecimento por IA)
- `OPENAI_MODEL` — Modelo (padrão: `gpt-4o-mini`)

### Configurar PWA

Edite `vite.config.ts` na seção `VitePWA` para personalizar:

- Nome do app: `manifest.name`
- Cores: `theme_color`, `background_color`
- Ícones: adicione novos tamanhos em `manifest.icons`

## 📁 Estrutura de Pastas

```
src/
├── assets/                 # CSS e recursos estáticos
├── components/
│   └── ui/                # Componentes UI reutilizáveis (dialogs, banners, etc.)
├── composables/           # Composables Vue (hooks reutilizáveis)
├── layouts/               # Layouts (AppLayout, AuthLayout)
├── modules/               # Funcionalidades por módulo
│   ├── auth/             # Autenticação (login, registro)
│   ├── capture/          # Captura de imagens e identificação por IA
│   ├── lists/            # Gerenciamento de listas
│   └── media/            # Dados de filmes/séries
├── pages/                 # Páginas (roteadas)
├── router/               # Vue Router
└── services/             # Serviços (Supabase, rede, etc.)
    └── supabase/        # Cliente e funções Supabase

tests/
├── e2e/                  # Testes end-to-end (Playwright)
└── rls/                  # Testes de segurança (RLS)

supabase/
├── migrations/           # Migrações do banco de dados
└── functions/           # Edge Functions (serverless)

dist/                     # Build final (gerado, não versionado)
```

## 🔒 Autenticação e Segurança

- **Método:** E-mail e senha (Supabase Auth)
- **RLS:** Todas as tabelas usam Row-Level Security para garantir que cada usuário veja apenas seus dados
- **JWT:** Edge Functions validam o usuário pelo JWT do Supabase
- **Limites:** Máximo de 10 identificações por IA a cada 24 horas (opcional)

Veja `docs/custos.md` para detalhes sobre controle de custos.

## 🌐 Publicação

O app é estático (frontend) e pode ser hospedado em qualquer serviço de static hosting.

### Vercel (Recomendado)

1. Envie para GitHub (confirme que `.env*.local` e `credentials.txt` não estão versionados)
2. Em [vercel.com](https://vercel.com), clique **Add New Project** e importe o repositório
3. Build: `npm run build` | Output: `dist`
4. Variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy

O arquivo `vercel.json` já configura SPA fallback e cache correto para PWA.

### Alternativas

- **Netlify** — Mesmas configurações, com arquivo `public/_redirects` para SPA fallback
- **Firebase Hosting**, **GitHub Pages**, **AWS S3** — Qualquer host de static files com HTTPS

**Após publicar**, configure em Supabase → **Authentication → URL Configuration**:

- **Site URL** — Sua URL de produção
- **Redirect URLs** — `https://seu-dominio/**` + `http://localhost:5173/**`

Veja `docs/publicacao.md` para um guia passo-a-passo completo.

## 📊 Custo

### Supabase (Plano Gratuito)

- 500 MB de banco de dados
- 1 GB de storage
- Limite de Edge Functions invocations

Acompanhe em **Project Settings → Usage**.

### OpenAI (Opcional)

- Usado **apenas** se o usuário clicar em "Identificar" com uma imagem
- Limite de 10 requisições por usuário a cada 24 horas
- Recomenda-se configurar um limite de gasto mensal no painel da OpenAI

### TMDB

- Totalmente gratuito

Para consultas SQL que monitoram custos, veja `docs/custos.md`.

## 🤝 Como Contribuir

1. Faça um fork do repositório
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m "feat: descrição da mudança"`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

**Diretrizes:**

- Escreva testes para novas funcionalidades
- Execute `npm run type-check` para validar TypeScript
- Certifique-se de que `npm test`, `npm run test:rls` e `npm run test:e2e` passam
- Siga o estilo de código existente (Vue 3 Composition API + TypeScript)

## 📝 Scripts Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build otimizado para produção |
| `npm run preview` | Visualiza o build localmente |
| `npm run type-check` | Valida tipos TypeScript |
| `npm run test` | Executa testes unitários |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:rls` | Testes de segurança RLS |
| `npm run test:e2e` | Testes end-to-end |
| `npm run generate-pwa-assets` | Gera ícones PWA |

## 📚 Referências

- **[Vue 3](https://vuejs.org/)** — Framework frontend
- **[Vite](https://vitejs.dev/)** — Build tool
- **[Supabase](https://supabase.com/)** — Backend e autenticação
- **[TMDB API](https://www.themoviedb.org/settings/api)** — Dados de filmes e séries
- **[Tailwind CSS](https://tailwindcss.com/)** — Estilos
- **[Pinia](https://pinia.vuejs.org/)** — State management
- **[Playwright](https://playwright.dev/)** — Testes E2E

## 📄 Licença

Este projeto é privado. Todos os direitos reservados.

---

**Desenvolvido com ❤️ usando Vue 3, TypeScript e Supabase**
