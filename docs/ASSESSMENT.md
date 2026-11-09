# Diagnóstico técnico — notes-app

> Escopo: análise feita sobre o commit `6562bbf` (branch `main`), **sem alterar código**.
> Tudo que está marcado como **(verificado)** foi reproduzido rodando o app localmente
> (Node 20.20.2, Ubuntu, Docker 29). O que está marcado como **(inferido)** vem da
> leitura do código e não foi reproduzido.
> Os passos para rodar estão na seção "Como rodar" do [README](../README.md).

Índice:

1. [Arquitetura](#1-arquitetura)
2. [Problemas encontrados](#2-problemas-encontrados)
3. [Plano de modernização (PRs)](#3-plano-de-modernização)
4. [Perguntas para o dono do sistema](#4-perguntas-para-o-dono-do-sistema)
5. [Anexo: o que aconteceu ao rodar o projeto](#anexo-o-que-aconteceu-ao-rodar-o-projeto)

---

## 1. Arquitetura

### 1.1 Visão geral

```
┌────────────────────────────┐      HTTP/JSON (fetch)       ┌───────────────────────────────┐      knex      ┌──────────────────────┐
│ client/ (SPA JS puro)       │ ───────────────────────────▶ │ server/ (Express 5 + TS)       │ ─────────────▶ │ SQLite                │
│ Webpack dev server :3005    │  BASE_URL fixo:              │ :3333 (PORT do .env)           │                │ server/db/database.db │
│ event bus (EventTarget)     │  http://192.168.0.110:3333   │ rotas → middlewares → controller│                │ (arquivo versionado)  │
└────────────────────────────┘                              └───────────────────────────────┘                └──────────────────────┘
```

- Não há monorepo/workspaces: `client/` e `server/` são projetos npm independentes. O
  `package-lock.json` da raiz está vazio (sem `package.json` na raiz).
- O servidor também tenta servir o front já compilado (`express.static`) a partir de
  `../client/build`, mas o client gera em `client/dist` — na prática essa parte não funciona
  (ver B-03).

### 1.2 Pastas e responsabilidades

| Caminho | Responsabilidade |
|---|---|
| `client/src/main.js` | Ponto de entrada: importa CSS e módulos e faz **login automático** com usuário/senha fixos no `DOMContentLoaded`. |
| `client/src/index.html` | Todo o markup da tela (header, filtros, lista, modal de edição de nota, popup de novo caderno). |
| `client/src/scripts/events/event-manager.js` | Event bus global (`EventTarget`) — todos os módulos conversam por eventos com nomes em string (`GetNotes`, `OnPostNote`, ...). |
| `client/src/scripts/services/api/config.js` | `BASE_URL` (fixo), nomes de rotas e o token JWT em memória. |
| `client/src/scripts/services/api/api-com.js` | Wrappers de `fetch` (`apiGet/apiPost/apiPatch/apiDelete`). |
| `client/src/scripts/services/{notes,notebooks,session}.js` | Escutam eventos `Get*/Post*/Patch*/Delete*`, chamam a API e emitem `On*` com a resposta. |
| `client/src/scripts/{home,notes-list,note-edit,notebooks-select,new-notebook-screen}.js` | Componentes de UI (manipulação direta do DOM). |
| `client/src/scripts/libs/dayjs.js` | Configura Day.js com locale `pt-br`. |
| `client/src/styles/*.css` | Estilos por componente. |
| `client/dist/` | **Artefato de build versionado** (mistura build de dev `main.js` com bundles de produção antigos com hash). |
| `server/src/server.ts` | Cria o app Express, CORS, middleware de header, estáticos, rotas, handler de erro e fallback SPA. |
| `server/src/env.ts` | Valida variáveis de ambiente com Zod (`DATABASE_URL`, `AUTH_SECRET`, `PORT`). |
| `server/src/routes/*` | Define rotas `/sessions`, `/notebooks`, `/notes`. |
| `server/src/middlewares/*` | `ensureAuthenticated` (JWT), `verifyUserAuthorization` (role), `setHeader` (CSP — não funciona). |
| `server/src/controllers/*` | Regras de negócio + validação (Zod) + acesso ao banco (Knex) no mesmo lugar. |
| `server/src/configs/{auth,database}.ts` | Config do JWT e da conexão Knex usada **pela aplicação** (`<cwd>/db/database.db`). |
| `server/knexfile.ts` | Config usada **pela CLI do Knex** (migrations) — aponta para **outro arquivo** (`src/database/database.db`). |
| `server/src/database/migrations/*` | Criação das tabelas `notes` e `notebooks`. |
| `server/src/database/types/*.d.ts` | Tipos globais (ambient) das linhas do banco. |
| `server/db/database.db` | Banco SQLite **versionado no git**, com dados reais (2 notas pessoais). |
| `dockerfile`, `docker-compose.yml`, `.dockerignore` | Imagem única (server + client) — **build quebrado** (ver B-01). |

### 1.3 Fluxo de uma requisição (exemplo: criar uma nota)

1. **Boot do front** — `main.js` emite `LogIn` com `{username:"caio", password:"123"}` →
   `services/session.js` faz `POST /sessions` → em `OnLoggedIn` o token é guardado em
   memória (`setToken`) e `loadHome()` emite `GetNotes` e `GetNotebooks`.
2. **Usuário clica em "Note"** — `home.js` emite `EditNote` com
   `{title:"Title", content:"", notebook_id:-1}`; `note-edit.js` abre o modal.
3. **Usuário clica em "Save"** — como `notebook_id == -1`, `note-edit.js` pega o caderno do
   `<select>` e emite `PostNote`.
4. `services/notes.js` → `apiPost("notes", body)` → `fetch POST http://192.168.0.110:3333/notes`
   com `Authorization: Bearer <token>`.
5. **Servidor** — `express.json()` → `cors` → `setHeader` (pulado, ver S-06) →
   `express.static` → `routes` → `notesRoutes.post("/")` → `ensureAuthenticated` (valida JWT,
   preenche `request.user`) → `verifyUserAuthorization(["common"])` →
   `NotesController.create`.
6. **Controller** — valida o body com Zod, faz `JSON.stringify(content)` e
   `knex("notes").insert(...)` no SQLite (`<cwd>/db/database.db`). Responde
   `201 {success:true, id:[<id>]}` (id dentro de um array).
7. **Erro em qualquer ponto** — cai no handler de `server.ts`, que sempre responde
   `500 {message}`.
8. **Volta ao front** — `services/notes.js` emite `OnPostNote`; `note-edit.js` guarda o id,
   emite `InsertNoteOnView` e fecha o modal; `notes-list.js` insere o card no DOM e no cache
   local `notes[]` (usado pela busca, que é 100% client-side).

### 1.4 Modelo de dados

Esquema real (lido do `server/db/database.db` versionado; igual ao gerado pelas migrations):

```
notebooks                                  notes
─────────────────────────────              ──────────────────────────────────────────────
id          INTEGER PK AUTOINCREMENT  1 ── * id          INTEGER PK AUTOINCREMENT
title       TEXT NOT NULL                  notebook_id INTEGER NOT NULL  FK → notebooks.id
created_at  DATETIME DEFAULT now (UTC)     title       TEXT NOT NULL
updated_at  DATETIME DEFAULT now (UTC)     content     TEXT  (string JSON: o texto é salvo com JSON.stringify)
                                           created_at  DATETIME DEFAULT now (UTC)
                                           updated_at  DATETIME DEFAULT now (UTC)
```

Também existem as tabelas de controle `knex_migrations` / `knex_migrations_lock`.

Observações:

- **Não existe tabela de usuários.** O "usuário" é um objeto fixo no controller de sessão
  (`id: "1", username: "caio", password: "123", role: "common"`). Notas e cadernos não têm dono.
- A FK `notes.notebook_id → notebooks.id` existe no schema, mas **não é aplicada** em tempo de
  execução (o `PRAGMA foreign_keys = ON` só está no `knexfile.ts`, não na config usada pela
  app). Verificado: foi possível criar uma nota com `notebook_id = 99999`.
- `content` é guardado como **string JSON** (`"ola"` vira `"\"ola\""`). Conteúdo vazio vira
  `"[]"` e aparece literalmente como `[]` na tela (verificado). Isso sugere que havia a
  intenção de um conteúdo estruturado (lista de blocos) que nunca foi implementado.
- Exclusão de caderno apaga as notas manualmente no controller (sem `ON DELETE CASCADE` e sem
  transação).

### 1.5 Endpoints

Todas as respostas são JSON. Base: `http://<host>:3333`. "Auth" = header
`Authorization: Bearer <jwt>` com role `common`.

| Método | Rota | Auth | Entrada | Resposta de sucesso (verificada) | Observações |
|---|---|---|---|---|---|
| POST | `/sessions` | não | `{username, password}` | `200 {token}` | Credenciais fixas `caio`/`123`. Senha errada → **500** (deveria ser 401). |
| GET | `/notebooks` | **não** | — | `200 {success, notebooks:[{id,title,created_at,updated_at}]}` | Ordenado por `created_at`. |
| GET | `/notebooks/:notebook_id` | **não** | — | `200 {success, notes:[{id,notebook_id,title,content}]}` | Retorna as **notas** do caderno, não o caderno. Sem validação do parâmetro. Não é usado pelo front. |
| POST | `/notebooks` | sim | `{title}` (min 1) | `201 {success, id, userRole}` | `id` é número. |
| PATCH | `/notebooks/:id` | sim | `{title}` | `200 {success}` | Não verifica se existe. Não é usado pelo front. |
| DELETE | `/notebooks/:id` | sim | — | `200 {success, id}` | Apaga notas do caderno e depois o caderno (sem transação). `:id` não numérico → 500. |
| GET | `/notes` | **não** | — | `200 {success, notes:[{id,notebook_id,title,content,created_at,updated_at}]}` | Retorna **todas** as notas de todos os cadernos. |
| GET | `/notes/:id` | **não** | — | `200 {success, note}` | Inexistente → `200 {success:false}` (deveria ser 404). Não é usado pelo front. |
| POST | `/notes` | sim | `{title (min 1), content (string), notebook_id (number)}` | `201 {success, id:[n]}` | `id` vem **dentro de um array**. Aceita `notebook_id` inexistente. |
| PATCH | `/notes/:id` | sim | `{title?, content?}` | `200 {success}` | Inexistente → `200 {success:true}`. Não permite trocar o caderno. |
| DELETE | `/notes/:id` | sim | — | `200 {success, id}` | Não verifica se existe. |
| GET | `/*` (qualquer outra) | não | — | `500 "Internal error"` | Fallback SPA tenta servir `../client/build/index.html`, que não existe. |

---

## 2. Problemas encontrados

Legenda de prioridade:

- **Crítico** — expõe dados, impede deploy ou corrompe dados; corrigir antes de qualquer outra coisa.
- **Alto** — bug ou risco relevante que afeta usuários ou operação.
- **Médio** — comportamento incorreto com contorno, ou dívida que encarece mudanças.
- **Baixo** — higiene, consistência, melhoria.

Os números de linha se referem ao commit `6562bbf`.

### 2.1 Resumo

| ID | Prioridade | Categoria | Resumo |
|---|---|---|---|
| S-01 | Crítico | Segurança | Autenticação de fachada: credenciais fixas no servidor **e** embutidas no bundle público do front |
| S-02 | Crítico | Segurança | Rotas de leitura sem autenticação e sem conceito de dono: qualquer um lê todas as notas |
| B-01 | Crítico | Build/deploy | `docker compose build` falha (dockerfile copia `dist`, tsc gera `build`) |
| S-03 | Alto | Segurança | Banco com dados pessoais versionado no git |
| S-04 | Alto | Segurança | Segredo JWT já foi commitado (`AUTH_SECRET=secret`) e há fallback `"default"` |
| R-01 | Alto | Confiabilidade | Handler de erro responde 500 para tudo (401/400/404 viram 500) e vaza mensagens internas |
| R-02 | Alto | Confiabilidade | Middleware `setHeader` tem assinatura de error handler: CSP nunca é aplicada e erros são engolidos |
| R-03 | Alto | Confiabilidade | Chave estrangeira não é aplicada: notas órfãs são aceitas |
| R-04 | Alto | Confiabilidade | Migrations e app usam arquivos de banco diferentes |
| B-02 | Alto | Build/deploy | Front com URL da API fixa em um IP de rede local |
| B-03 | Alto | Build/deploy | Servidor procura o front em `../client/build`, que nunca é gerado |
| T-01 | Alto | Testes | Nenhum teste, lint ou CI |
| S-05 | Alto | Segurança | Dependências com vulnerabilidades conhecidas (npm audit: 2+3 críticas) |
| R-05 | Médio | Confiabilidade | `ensureAuthenticated` não trata ausência/erro de token (500 em vez de 401) |
| R-06 | Médio | Confiabilidade | Exclusão de caderno sem transação |
| R-07 | Médio | Confiabilidade | Atualizar/excluir/buscar registro inexistente responde sucesso |
| R-08 | Médio | Confiabilidade | `POST /notes` devolve `id` dentro de array; contratos inconsistentes |
| R-09 | Médio | Confiabilidade | `content` duplamente codificado em JSON; nota vazia exibe `[]` |
| R-10 | Médio | Confiabilidade | Bugs no cache local do front (busca some com notas após excluir/editar) |
| R-11 | Médio | Confiabilidade | Trocar o caderno de uma nota existente é ignorado silenciosamente |
| R-12 | Médio | Confiabilidade | Após excluir um caderno a lista fica vazia até recarregar |
| R-13 | Médio | Confiabilidade | Validação do nome do caderno no front nunca bloqueia |
| S-06 | Médio | Segurança | CORS `*`, sem rate limit, sem headers de segurança, `x-powered-by` exposto |
| S-07 | Médio | Segurança | Token JWT impresso no console do navegador |
| B-04 | Médio | Build/deploy | Imagem Docker não recebe `.env`, não roda migrations, roda como root, `restart: always` |
| B-05 | Médio | Build/deploy | Build de front versionado (`client/dist`) e `npm run build` gera build de desenvolvimento |
| B-06 | Médio | Build/deploy | Rodar o app altera arquivos versionados (`server/db/database.db`, `client/dist/*`) |
| M-01 | Médio | Manutenção | Controllers misturam validação, regra de negócio e SQL |
| M-02 | Médio | Manutenção | `env.ts` exige `DATABASE_URL` que não é usado |
| M-03 | Médio | Manutenção | README desatualizado e sem instruções de execução |
| M-04 | Baixo | Manutenção | Ordem das migrations invertida (notes antes de notebooks) e sintaxe com vírgulas |
| M-05 | Baixo | Manutenção | Front acoplado por event bus com nomes em string e DOM global |
| M-06 | Baixo | Manutenção | Configuração Babel duplicada/conflitante |
| M-07 | Baixo | Manutenção | Inconsistências diversas (idioma, typos, `paths` sem uso, `package-lock` vazio na raiz, `.dockerignore`) |
| R-14 | Baixo | Confiabilidade | Datas UTC exibidas como horário local; locale pt-br em UI em inglês |
| M-08 | Baixo | Manutenção | Botão de excluir caderno: atributo `hidden` anulado pelo CSS |

### 2.2 Detalhamento

#### Segurança

**S-01 — Crítico — Autenticação de fachada**
- `server/src/controllers/sessions-controller.ts:10-18` — usuário fixo `caio` / senha `123`
  em texto puro no código.
- `client/src/main.js:33-35` — o front faz login automático com as mesmas credenciais, ou seja,
  elas vão no bundle JavaScript público. Qualquer pessoa que abrir o site obtém um token válido
  e pode criar/editar/apagar tudo.
- `client/src/index.html:10` — "Hello, Caio!" fixo.
- **Por que é problema:** na prática não existe autenticação; o JWT só dá aparência de
  segurança.
- **Correção sugerida:** decidir o modelo (ver perguntas). Mínimo: tabela `users`, senha com
  hash (bcrypt/argon2), tela de login, remover credenciais do client. Se o app for de usuário
  único e uso pessoal, ao menos tirar a senha do código (variável de ambiente com hash) e do
  front.

**S-02 — Crítico — Leitura pública e ausência de dono dos dados**
- `server/src/routes/notes-routes.ts:9-10` e `server/src/routes/notebooks-routes.ts:9-10` —
  `GET` sem `ensureAuthenticated`. Verificado: `curl /notes` sem token devolve todas as notas.
- Tabelas `notes`/`notebooks` não têm `user_id` (`server/src/database/migrations/*`).
- **Por que é problema:** vazamento de dados; impossível ter mais de um usuário.
- **Correção sugerida:** aplicar `ensureAuthenticated` em todas as rotas exceto `POST
  /sessions`; adicionar `user_id` e filtrar todas as queries por `request.user.id`.

**S-03 — Alto — Banco com dados reais no git**
- `server/db/database.db` (versionado; commits `ca0bb31`, `3b39a0a`, `4d1a88d`) contém 1 caderno e
  2 notas pessoais.
- **Por que é problema:** dados no histórico público; cada execução local altera o arquivo e gera
  diffs binários; risco de sobrescrever o banco de produção num deploy.
- **Correção sugerida:** remover do git, adicionar `server/db/*.db` ao `.gitignore`, criar o banco
  via migrations (+ seed opcional). Avaliar se precisa limpar o histórico (repositório é público).

**S-04 — Alto — Segredo JWT**
- Commit `4d1a88d` versionou `server/.env` com `AUTH_SECRET=secret` (removido em `2ca6a5e`, mas
  continua no histórico de um repositório público).
- `server/src/configs/auth.ts:3` — `process.env.AUTH_SECRET || "default"`.
- **Por que é problema:** se produção usa (ou usou) `secret`, qualquer um forja tokens. O fallback
  `"default"` mascara configuração ausente (hoje `env.ts` já exige a variável, mas `auth.ts` não
  usa `env`).
- **Correção sugerida:** rotacionar o segredo em produção; `auth.ts` deve ler de `env.ts` sem
  fallback; adicionar `server/.env.example`.

**S-05 — Alto — Dependências vulneráveis** (verificado com `npm audit` em 2026-11-09)
- `server`: 17 vulnerabilidades (2 críticas: `tar`, `proxy-addr`; altas incluem `sqlite3`, `zod`,
  `jws`, `path-to-regexp`, `body-parser`).
- `client`: 32 vulnerabilidades (3 críticas: `websocket-driver`, `shell-quote`, `proxy-addr` —
  todas de ferramentas de dev/build).
- **Correção sugerida:** `npm audit fix` nos dois projetos (sem `--force`), avaliar `sqlite3@6`
  (breaking) ou trocar por `better-sqlite3`; ligar Dependabot/Renovate.

**S-06 — Médio — Endurecimento HTTP ausente**
- `server/src/server.ts:17-22` — CORS com `origin: "*"`.
- `server/src/middlewares/header.ts:3-17` — CSP nunca é aplicada (ver R-02). Verificado: a
  resposta não tem `Content-Security-Policy` e tem `X-Powered-By: Express`.
- Sem rate limit no `POST /sessions` (força bruta trivial).
- **Correção sugerida:** restringir CORS à origem do front (ou servir front e API na mesma
  origem), usar `helmet`, `express-rate-limit` no login.

**S-07 — Médio — Token no console**
- `client/src/main.js:38` — `console.log(e.detail)` imprime o token; `client/src/scripts/note-edit.js:65`
  imprime a nota.
- **Correção sugerida:** remover logs de debug; adicionar regra de lint `no-console`.

#### Confiabilidade

**R-01 — Alto — Handler de erro único que sempre responde 500**
- `server/src/server.ts:30-32` — ignora `AppError.statusCode` e `ZodError`. Verificado: senha
  errada → 500; token ausente → 500 `"jwt must be provided"`; body inválido → 500 com o JSON
  bruto do Zod; id não numérico → 500.
- `server/src/utils/AppError.ts:1-8` — não estende `Error` (sem stack trace).
- O handler está registrado **antes** do fallback `app.get(/.*/)` (linha 34), então erros do
  fallback não passam por ele.
- **Correção sugerida:** handler no fim da cadeia que mapeia `AppError` → `statusCode`,
  `ZodError` → 400 com mensagens resumidas, `JsonWebTokenError/TokenExpiredError` → 401, resto →
  500 com mensagem genérica + log.

**R-02 — Alto — `setHeader` registrado como middleware comum, mas com 4 parâmetros**
- `server/src/middlewares/header.ts:3-8` e `server/src/server.ts:24`.
- **Por que é problema:** o Express trata funções de 4 argumentos como *error handlers*. Então:
  (a) em requisições normais ele é pulado e a CSP nunca é enviada; (b) quando há erro antes dele
  (ex.: JSON inválido no body), ele roda e chama `next()` **sem** o erro, "apagando" a falha e
  deixando a requisição seguir para o controller com `body` indefinido. Verificado: `POST /notes`
  com `{bad json` chega ao controller e falha na validação do Zod.
- **Correção sugerida:** assinatura `(req, res, next)`; ou substituir por `helmet`.

**R-03 — Alto — Integridade referencial desligada**
- `server/src/configs/database.ts:4-10` — sem `pool.afterCreate` com `PRAGMA foreign_keys = ON`
  (existe só em `server/knexfile.ts:6-11`).
- Verificado: `POST /notes` com `notebook_id: 99999` → 201 e a nota fica órfã (invisível na UI).
- **Correção sugerida:** uma única config de banco com o PRAGMA; validar existência do caderno no
  controller e devolver 404/422.

**R-04 — Alto — Dois bancos diferentes**
- `server/knexfile.ts:4` → `./src/database/database.db` (usado por `npm run knex -- migrate:latest`).
- `server/src/configs/database.ts:7` → `<cwd>/db/database.db` (usado pela app).
- Verificado: `migrate:latest` criou `server/src/database/database.db`, que a app nunca lê. Um
  ambiente novo só funciona porque o banco já vem pronto no git.
- **Correção sugerida:** `knexfile` importar a mesma config da app (caminho vindo de env, ex.:
  `DATABASE_URL`/`DATABASE_FILE`), e documentar `migrate:latest` como passo de setup/deploy.

**R-05 — Médio — `ensureAuthenticated` frágil**
- `server/src/middlewares/ensureAuthenticated.ts:16-19` — `String(undefined)` é `"undefined"`,
  então o `if (!authHeader)` nunca dispara. Linhas 22-27: não verifica o esquema `Bearer` e não
  trata erro do `verify`.
- **Correção sugerida:** checar `request.headers.authorization` antes de converter, validar o
  prefixo e converter erros de JWT em `AppError(401)`.

**R-06 — Médio — Exclusão de caderno sem transação**
- `server/src/controllers/notebooks-controller.ts:104-105`.
- **Por que é problema:** se a segunda query falhar, as notas já foram apagadas e o caderno fica.
- **Correção sugerida:** `knex.transaction(...)` ou `ON DELETE CASCADE` na FK (com o PRAGMA ligado).

**R-07 — Médio — Sucesso para registros inexistentes**
- `server/src/controllers/notes-controller.ts:30` (`GET /notes/:id` → 200 `{success:false}`),
  `:86-93` (PATCH), `:107-109` (DELETE); `notebooks-controller.ts:83-90` e `:104-107`.
  Verificado para GET e PATCH.
- **Correção sugerida:** checar linhas afetadas e responder 404.

**R-08 — Médio — Contratos inconsistentes**
- `server/src/controllers/notes-controller.ts:50-56` — `insert` sem `.returning("id")` devolve
  `[id]`; o front grava `selectedNote.id = [34]` (`client/src/scripts/note-edit.js:32`) e só
  funciona porque `String([34]) === "34"` ao montar a URL.
- `notebooks-controller.ts:62` devolve `userRole` sem motivo; `GET /notebooks/:id` devolve notas.
- Respostas usam `success` em vez de status HTTP.
- **Correção sugerida:** padronizar (`201 {id: number}`, erros com status correto) — depois que os
  testes de caracterização existirem e com o front ajustado no mesmo PR.

**R-09 — Médio — `content` duplamente codificado**
- `server/src/controllers/notes-controller.ts:42-44,52` e `:73-82`; leitura com `JSON.parse` em
  `:12,27` e `notebooks-controller.ts:35`.
- **Por que é problema:** o banco guarda `"\"texto\""`; conteúdo vazio vira a string `"[]"` e a UI
  mostra `[]` (verificado). Um registro com `content` que não seja JSON válido derruba
  `GET /notes` inteiro com 500 (inferido).
- **Correção sugerida:** depende da resposta sobre o formato do conteúdo (ver perguntas); se for
  texto puro, migrar dados para texto simples e remover o `stringify/parse`.

**R-10 — Médio — Cache local do front inconsistente (afeta a busca)**
- `client/src/scripts/notes-list.js:28-31` — `notes.pop(note)` remove o **último** item, não a nota
  excluída. Verificado: depois de excluir uma nota, buscar por outra nota existente não encontra
  nada.
- `client/src/scripts/notes-list.js:52-56` — `filter` devolve array; atribuir `title/content` no
  array não atualiza nada (só funciona por acaso porque o objeto é compartilhado por referência).
- `client/src/scripts/notes-list.js:97` — `insertNote` faz `push` também ao re-renderizar
  (`UpdateNoteOnView`), duplicando itens no cache.
- `client/src/scripts/note-edit.js:52-58` — edição altera o objeto original antes de salvar;
  fechar sem salvar deixa o cache com dados não persistidos (inferido).
- **Correção sugerida:** cache como `Map` por id, operações imutáveis; editar uma cópia.

**R-11 — Médio — Mudar o caderno de uma nota existente não tem efeito**
- `client/src/scripts/note-edit.js:23-25,69-71` mostra o seletor de caderno também na edição, mas
  `client/src/scripts/services/notes.js:38-41` só envia `title` e `content`, e o schema do PATCH
  (`notes-controller.ts:68-77`) não aceita `notebook_id`.
- **Correção sugerida:** decidir se mover nota entre cadernos é permitido; se sim, aceitar
  `notebook_id` no PATCH; se não, desabilitar o seletor na edição.

**R-12 — Médio — Lista vazia após excluir caderno**
- `client/src/scripts/notebooks-select.js:27-37` remove a opção e o `<select>` volta para "All
  notebooks", mas não emite `FilterNotesByNotebookId`; as notas dos outros cadernos continuam com a
  classe `hidden`. Verificado: após excluir um caderno, nenhuma nota fica visível até recarregar.
- Também não há confirmação antes de apagar o caderno e todas as suas notas
  (`notebooks-select.js:11-13`).
- **Correção sugerida:** reaplicar o filtro após excluir; pedir confirmação.

**R-13 — Médio — Validação do nome do caderno nunca bloqueia**
- `client/src/scripts/new-notebook-screen.js:31` — `!notebookInputName.value.trim() === ""` é
  sempre `false` (precedência de `!`). Nome vazio vai para a API, que responde 500 (popup fica
  aberto sem mensagem).
- **Correção sugerida:** `if (notebookInputName.value.trim() === "") return` e exibir erro.

**R-14 — Baixo — Datas**
- SQLite grava `CURRENT_TIMESTAMP` em UTC sem fuso; `client/src/scripts/notes-list.js:83` usa
  `dayjs(note.updated_at)`, que interpreta como horário local (inferido: data errada perto da
  meia-noite). `client/src/scripts/libs/dayjs.js:4` usa `pt-br` numa UI em inglês.
- **Correção sugerida:** devolver ISO 8601 com `Z` ou usar o plugin `utc` do Day.js; definir idioma.

#### Testes

**T-01 — Alto — Nenhuma rede de segurança**
- Não há testes, script `test`, lint, formatter configurado nem CI (`server/package.json:10-15`,
  `client/package.json:7-11`).
- `server/src/server.ts:13-47` cria o app e chama `listen` no mesmo módulo, o que dificulta testar
  com `supertest`.
- **Correção sugerida:** ver PR 1 e 2 do plano (testes de caracterização da API com banco SQLite
  temporário e um smoke E2E do front).

#### Build/deploy

**B-01 — Crítico — Imagem Docker não builda** (verificado)
- `dockerfile:36` copia `/build/server/dist`, mas `server/tsconfig.json:17` gera em `build/`
  (`outDir` mudou no commit `4d1a88d`). `docker compose build` falha com
  `"/build/server/dist": not found`. O `CMD` (`dockerfile:49`) depende do mesmo caminho `server/dist`.
- **Correção sugerida:** alinhar para `build` (ou voltar `outDir` para `dist`) e adicionar um job de
  CI que faça `docker build`.

**B-02 — Alto — URL da API fixa**
- `client/src/scripts/services/api/config.js:1` — `http://192.168.0.110:3333`.
- **Por que é problema:** só funciona na rede de quem escreveu. Para rodar localmente foi preciso
  criar um alias de IP na interface de loopback.
- **Correção sugerida:** `BASE_URL` via variável de build (`webpack.DefinePlugin`/`process.env.API_URL`)
  ou URL relativa quando front e API estão na mesma origem; proxy do `webpack-dev-server` em dev.

**B-03 — Alto — Servidor não encontra o front**
- `server/src/server.ts:11` — `path.resolve(process.cwd(), "../client/build")`. O client gera em
  `client/dist` (`client/webpack.config.js:23`); na imagem Docker o front fica em
  `/app/client/dist` e o cwd é `/app` (o caminho resolvido seria `/client/build`). Verificado:
  qualquer rota não-API responde 500 `Internal error`. A versão anterior (commit `6562bbf^`)
  usava `client/dist` com lógica dev/prod.
- **Correção sugerida:** caminho configurável por env e relativo a `__dirname`, apontando para
  `client/dist`; ou servir o front separadamente (nginx/CDN).

**B-04 — Médio — Docker incompleto** (inferido, pois a imagem não builda)
- `docker-compose.yml` não passa `environment`/`env_file`: `env.ts` vai falhar na
  inicialização (`DATABASE_URL`/`AUTH_SECRET` ausentes) e `restart: always` deixa o container em
  loop de reinício.
- Nenhum passo roda migrations; o app depende do `server/db` montado do host (linha 11, usando
  `${PWD}`, que depende do diretório de onde o comando é executado).
- `dockerfile:38` usa `npm install` (não `npm ci`), a imagem roda como root, sem `HEALTHCHECK`,
  sem `NODE_ENV=production`; o client é buildado com `npm run build` (modo desenvolvimento) em vez
  de `npm run deploy`.
- `.dockerignore:6` — `*.ts` só ignora arquivos na raiz do contexto; dá a impressão de excluir
  fontes TS, mas não exclui.
- **Correção sugerida:** `env_file`, entrypoint que roda `knex migrate:latest`, `npm ci`,
  `USER node`, healthcheck, `restart: unless-stopped`, volume relativo (`./server/db`).

**B-05 — Médio — Artefatos de build versionados**
- `client/dist/` está no git com um `index.html` de **desenvolvimento** (`<script src="/main.js">`)
  e dois bundles de produção antigos com hash diferentes.
- `client/package.json:8` — `build` roda `webpack` sem `--mode`, então `argv.mode` é `undefined`
  (o log mostra "Modo atual: undefined") e gera build de dev; produção é `npm run deploy`.
- **Correção sugerida:** remover `client/dist` do git e ignorar; `build` = produção, `build:dev`
  se necessário.

**B-06 — Médio — Rodar o projeto suja o working tree**
- Usar o app altera `server/db/database.db`; `npm run build`/`npm run dev` no client reescreve
  arquivos de `client/dist/`. Fácil de commitar por engano.
- **Correção sugerida:** consequência de S-03 e B-05; resolvida pelos mesmos PRs.

#### Manutenção

**M-01 — Médio — Camadas misturadas**
- `server/src/controllers/*.ts` — validação Zod, regra de negócio e SQL no mesmo método; schemas
  duplicados entre `create` e `update`; `try/catch` repetido (Express 5 já propaga rejeições).
- **Correção sugerida:** extrair schemas e um repositório/serviço por recurso, depois que houver
  testes.

**M-02 — Médio — `DATABASE_URL` obrigatório e sem uso**
- `server/src/env.ts:5` exige uma URL válida, mas nada a usa (o caminho do SQLite está fixo em
  `configs/database.ts:7`). O `.env` antigo apontava para um Postgres que não existe no projeto.
- **Correção sugerida:** usar a variável para o caminho do banco ou removê-la; criar
  `server/.env.example`.

**M-03 — Médio — Documentação**
- `README.md:64-78` descreve uma pasta `/api` que não existe e não explica como rodar (corrigido
  parcialmente neste PR com a seção "Como rodar").
- `server/package.json` não define a versão do Node usada (só `>=18`); não há `.nvmrc`.

**M-04 — Baixo — Migrations**
- `server/src/database/migrations/20251110134914_create-notes.ts` roda antes de
  `20251110195300_create-notebooks.ts`, mas referencia `notebooks`. Funciona no SQLite; quebraria
  em Postgres/MySQL.
- Uso de vírgulas encadeando chamadas (`table.increments(...).primary(), table...`) e indentação
  enganosa (linhas 5-14).
- **Correção sugerida:** nova migration (não reescrever as aplicadas) e lint.

**M-05 — Baixo — Arquitetura do front**
- Comunicação só por eventos com nomes em string (`client/src/scripts/events/event-manager.js`);
  todos os módulos fazem `querySelector` no carregamento; difícil de rastrear e testar.
- **Correção sugerida:** constantes para nomes de eventos, módulo de estado único; avaliar
  framework só se o escopo do produto crescer.

**M-06 — Baixo — Babel**
- `client/babel.config.json` define `targets` e `useBuiltIns: "usage"` com `corejs`, mas `core-js`
  não está instalado, e `client/webpack.config.js:51-54` redefine `presets` inline (inferido: as
  opções do arquivo são sobrescritas e os targets ignorados).
- **Correção sugerida:** uma única fonte de configuração (`browserslist` + `babel.config.json`).

**M-07 — Baixo — Inconsistências diversas**
- Mensagens misturando português e inglês e com typo (`"lenght"` em
  `notes-controller.ts:41,71`, `notebooks-controller.ts:49,77`; "Email e/ou senha" sem campo email).
- `server/tsconfig.json:6-8` — `paths` sem `baseUrl` e sem uso; `forceConsistentCasingInFileNames:
  false`.
- `package-lock.json` vazio na raiz; os dois `package.json` se chamam `notes`.
- `client/webpack.config.js:33` — `open: true` tenta abrir navegador (falha em servidor/CI).

**M-08 — Baixo — Botão de excluir caderno**
- `client/src/index.html:23` usa `hidden`, mas `client/src/styles/filters.css:20` define
  `display` e o botão aparece mesmo assim (verificado). A visibilidade real é controlada por
  opacidade em `notebooks-select.js:70-81`.
- **Correção sugerida:** remover o atributo ou usar a classe `.hidden`.

---

## 3. Plano de modernização

Princípios: PRs pequenos, cada um com um objetivo e revertível; **nenhuma mudança de
comportamento antes do PR 1 e 2**; mudanças de contrato da API sempre junto com o ajuste no
front e com os testes atualizados no mesmo PR.

| # | PR | Resolve | Depende de | Muda comportamento? |
|---|---|---|---|---|
| 1 | **Testes de caracterização da API** | T-01 | — | Não |
| 2 | **Smoke test E2E do front** | T-01 | 1 (padrões) | Não |
| 3 | CI mínima (install, tsc, testes, `docker build`) | T-01, B-01 (detecção) | 1 | Não |
| 4 | Higiene de repositório: tirar `server/db/*.db` e `client/dist` do git, `.env.example`, `.nvmrc` | S-03, B-05, B-06, M-03 | 1 | Não (setup muda) |
| 5 | Uma única config de banco + migrations no setup + PRAGMA FK | R-03, R-04, M-02 | 1, 4 | Sim (rejeita notas órfãs) |
| 6 | Corrigir Docker (caminho `build`, env, migrations, usuário não-root) e caminho do front | B-01, B-03, B-04 | 3, 5 | Só deploy |
| 7 | `BASE_URL` configurável + proxy do dev server | B-02 | 2 | Não (config) |
| 8 | Tratamento de erros: handler final, `setHeader` → `helmet`, `ensureAuthenticated` | R-01, R-02, R-05, S-06 (parcial) | 1 | Sim (status 4xx corretos) |
| 9 | Atualização de dependências (`npm audit fix`, sqlite3) | S-05 | 3 | Não esperado |
| 10 | Autenticação real: `users`, hash de senha, tela de login, todas as rotas autenticadas, rotacionar segredo | S-01, S-02, S-04, S-07 | 8 + respostas do dono | Sim |
| 11 | Dono dos dados: `user_id` em notebooks/notes e filtro nas queries | S-02 | 10 | Sim |
| 12 | Contratos e integridade: 404 para inexistentes, `id` numérico, transação/`ON DELETE CASCADE` | R-06, R-07, R-08 | 5, 8 | Sim |
| 13 | Formato do `content` (migração de dados) | R-09 | 12 + respostas do dono | Sim |
| 14 | Bugs do front: cache, filtro após excluir, validação, trocar caderno, datas | R-10..R-14, M-08 | 2, 12 | Sim (correções) |
| 15 | Refatorações internas: camadas no server, eventos no front, Babel, lint/format | M-01, M-04..M-07 | 1, 2, 3 | Não |

### Detalhes dos primeiros PRs

**PR 1 — Testes de caracterização da API (rede de segurança)**
- Objetivo: congelar o comportamento **atual**, inclusive os bugs, para que qualquer refatoração
  que mude algo apareça como teste quebrado e seja uma decisão consciente.
- Ferramentas: `vitest` (ou `node:test`) + `supertest`.
- Mudança mínima de produção necessária (e única permitida neste PR): separar `app` de
  `listen` (`src/app.ts` exporta o app; `src/server.ts` só chama `listen`) e permitir apontar o
  banco para um arquivo temporário (via env), sem alterar o caminho padrão.
- Cada teste cria um SQLite temporário, roda as migrations e testa via HTTP. Casos mínimos (todos
  já observados manualmente nesta análise):
  - `POST /sessions` com `caio/123` → 200 + token; senha errada → **500** (registrar como está).
  - `GET /notes` e `GET /notebooks` sem token → 200 (registrar que é público).
  - CRUD de caderno e nota com token; `POST /notes` devolve `id` como array; `content` é
    devolvido como string; conteúdo vazio vira `"[]"`.
  - `POST /notes` com `notebook_id` inexistente → 201.
  - `PATCH /notes/:id` inexistente → 200 `{success:true}`; `GET /notes/:id` inexistente → 200
    `{success:false}`.
  - Sem token / token inválido → 500; body JSON inválido → 500 com mensagem do Zod.
  - `DELETE /notebooks/:id` apaga as notas do caderno.
- Testes que documentam bugs devem ter nome explícito (ex.: `"BUG atual: senha errada retorna
  500"`) para serem invertidos nos PRs de correção.

**PR 2 — Smoke E2E do front**
- Playwright subindo server (banco temporário) + `webpack serve`; cenário: carrega a home, cria
  caderno, cria nota, recarrega e confirma persistência, busca, exclui nota, exclui caderno.
- Requer o PR 7 **ou** uma variável de ambiente no build só para teste; se o PR 7 ainda não
  existir, rodar o E2E contra o alias de IP documentado no README (como foi feito nesta análise).

**PR 3 — CI**
- GitHub Actions com Node 20: `npm ci` + `tsc --noEmit` + testes (server), `npm run deploy`
  (client), `docker build`. O job de Docker deve falhar até o PR 6 — pode entrar como
  `continue-on-error` e virar obrigatório no PR 6.

---

## 4. Perguntas para o dono do sistema

**Produto e usuários**
1. O app é de uso pessoal (um único usuário) ou deve suportar várias pessoas com contas
   separadas? Existe cadastro de usuário ou as contas são criadas manualmente?
2. O login automático com `caio/123` no front foi temporário (para desenvolvimento) ou é
   intencional (app pessoal sem tela de login)?
3. A leitura pública de notas (`GET` sem token) é intencional? Existe algum caso de
   compartilhamento público de notas?
4. Para que serve a role `common`? Estavam previstas outras roles (ex.: admin, somente leitura)?

**Dados e regras de negócio**
5. Qual o formato pretendido para o conteúdo da nota? O default `"[]"` sugere uma lista de blocos
   (checklist, rich text). Deve continuar texto puro? Markdown?
6. Uma nota pode mudar de caderno? (A UI mostra o seletor na edição, mas a API ignora.)
7. Uma nota pode existir sem caderno? Deve haver um caderno padrão?
8. Excluir um caderno deve apagar todas as notas dele (comportamento atual, sem confirmação) ou
   movê-las / impedir a exclusão? Precisa de lixeira/soft delete?
9. Títulos de caderno devem ser únicos? Há limite de tamanho para título e conteúdo?
10. O README fala em "salvamento em tempo real", mas hoje só salva ao clicar em Save. O auto-save
    é um requisito?
11. A busca deve continuar no front (só nas notas carregadas) ou precisa ir para o servidor
    (volume grande de notas, busca por caderno, etc.)?
12. Idioma e fuso: a interface deve ser em português ou inglês? Qual fuso deve ser usado para
    exibir datas?

**Operação e deploy**
13. Existe um ambiente de produção hoje? Onde roda (VPS, Raspberry Pi na rede local — dado o IP
    `192.168.0.110` —, cloud)? Como é feito o deploy?
14. O banco de produção é o `server/db/database.db` versionado? Existe backup? Os dados atuais
    (caderno "fullstack") precisam ser preservados ou são de teste?
15. Qual `AUTH_SECRET` está em uso em produção? Já foi `secret`? (Se sim, precisa ser rotacionado.)
16. O `DATABASE_URL` com Postgres no `.env` antigo indica um plano de migrar de SQLite para
    Postgres? Ainda é desejado?
17. A ideia é servir front e API pelo mesmo container (como o dockerfile tenta) ou separados?
18. Quais navegadores precisam ser suportados? (O `babel.config.json` mira Edge 17 / Safari 11.)
19. O repositório pode ter o histórico reescrito para remover o banco e o `.env` commitados, ou
    deve ser preservado?

---

## Anexo: o que aconteceu ao rodar o projeto

Registro cronológico dos passos não documentados e erros encontrados (ver passos validados no
README).

| # | Passo / erro | Causa | Como foi contornado (sem alterar código) |
|---|---|---|---|
| 1 | README não tem instruções de instalação/execução | — | Leitura de `package.json`, `dockerfile`, código. |
| 2 | Versão do Node não especificada | `engines: >=18` apenas | Usado Node 20 (mesma do dockerfile). |
| 3 | `npm run dev` (server) quebra: `ZodError ... DATABASE_URL ... AUTH_SECRET ... expected string, received undefined` | `env.ts` exige variáveis e não há `.env.example` | Criado `server/.env` (ignorado pelo git). `DATABASE_URL` precisa ser uma URL qualquer válida, pois não é usada. |
| 4 | Server sobe, mas `GET /` e qualquer rota não-API → 500 `Internal error` | Procura o front em `client/build` | Front servido pelo `webpack serve` (porta 3005). |
| 5 | Front abre, mas não fala com a API | `BASE_URL` fixo `http://192.168.0.110:3333` | Alias de IP no loopback: `sudo ip addr add 192.168.0.110/32 dev lo`. |
| 6 | `npm run knex -- migrate:latest` cria um banco que a app não usa | `knexfile.ts` aponta para `src/database/database.db` | Não necessário: a app usa o `server/db/database.db` versionado (já migrado). |
| 7 | Usar o app altera `server/db/database.db` (versionado); buildar o client altera `client/dist/` | Artefatos versionados | Restaurado com `git checkout -- server/db/database.db client/dist`. Restaurar o banco com o servidor rodando faz as escritas seguintes falharem com `SQLITE_READONLY` (é preciso reiniciar o servidor). |
| 8 | `npm run build` no client loga "Modo atual: undefined" e gera build de dev | `build` sem `--mode` | Produção é `npm run deploy`. |
| 9 | `docker compose build` falha: `"/build/server/dist": not found` | dockerfile desatualizado (B-01) | **Não contornado** — exigiria alterar o dockerfile. |
| 10 | `npm ci` reporta 17 (server) e 32 (client) vulnerabilidades | Dependências desatualizadas | Apenas registrado (S-05). |

Validação funcional feita (verificado, via `curl` e via navegador com Playwright): login
automático, listagem, criação de caderno, criação de nota, edição, persistência após recarregar,
busca, exclusão de nota e de caderno.
