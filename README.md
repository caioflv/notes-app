# Notes App — Client + API + Database

This project is a **notes application**, composed of:

- **Web Client** (SPA bundled with Webpack)
- **REST API** built with Node.js + Express
- **SQLite database** managed via Knex

The goal of this app is to provide a simple and efficient way to create and organize notes divided into **notebooks**.  
All business logic—creating, editing, deleting, and searching notes—is handled by the API, while the client delivers a clean and minimal interface inspired by macOS Notes.

---

## Features

### **Notes**

- Create, edit, and delete notes
- Full listing with notebook-based filtering
- Real-time content saving

### **Notebooks**

- Create and delete notebooks

### **Search**

- Simple search system that filters notes by their content

### **Database**

- Local persistence using SQLite
- Database migrations managed with Knex

---

## Technologies Used

### **Client (Frontend)**

- **Webpack 5** – Main bundler
- **Webpack Dev Server** – Local development environment
- **Babel** (@babel/core and preset-env) – Browser compatibility
- **HTML Webpack Plugin** – Automatic HTML generation
- **Mini CSS Extract Plugin** – CSS extraction for production
- **CSS Loader / Style Loader** – CSS file handling
- **Copy Webpack Plugin** – Copies static assets
- **Day.js** – Lightweight date manipulation library

---

### **API (Backend)**

- **Node.js + Express 5** – HTTP server
- **SQLite3** – Lightweight local database
- **Knex.js** – SQL query builder
- **Zod** – Schema validation
- **CORS** – Cross-origin support
- **TypeScript + tsx** – Typed development with hot reload
- **@types/\*** – TypeScript definitions for external libraries

---

## 🗂 General Structure

```
/client
  ├── src/
  ├── dist/
  ├── webpack.config.js
  └── package.json

/api
  ├── src/server.ts
  ├── database/
  ├── migrations/
  └── package.json
```


---

## Como rodar

Passos validados em 2026-11-09 (Ubuntu, Node 20.20.2, npm 10.8.2) sem alterar código. O diagnóstico
completo, com os problemas encontrados, está em [docs/ASSESSMENT.md](docs/ASSESSMENT.md).

### Pré-requisitos

- Node.js 20 (é a versão da imagem Docker; o `package.json` só exige `>=18`).
- `client/` e `server/` são projetos npm separados. Não há `package.json` na raiz.

### 1. API (server)

```bash
cd server
npm ci

# Passo obrigatório e que não estava documentado: o servidor não sobe sem estas variáveis.
# DATABASE_URL precisa ser uma URL válida, mas não é usada (o banco é sempre server/db/database.db).
cat > .env <<'ENV'
DATABASE_URL="file:./db/database.db"
AUTH_SECRET=troque-este-valor
PORT=3333
ENV

npm run dev        # desenvolvimento (tsx watch) em http://localhost:3333
# ou, para produção:
npm run build      # gera server/build/
npm start          # node build/server.js
```

- Rode os comandos **de dentro de `server/`**: os caminhos do banco (`db/database.db`) e do `.env`
  são resolvidos a partir do diretório atual.
- O banco SQLite já vem pronto e com dados em `server/db/database.db` (arquivo versionado). **Não**
  use `npm run knex -- migrate:latest` para preparar o banco da aplicação: o `knexfile.ts` aponta para
  outro arquivo (`server/src/database/database.db`), que a aplicação não usa.
- Usar o app altera `server/db/database.db`. Para descartar as mudanças locais, **pare o servidor
  antes** e rode `git checkout -- server/db/database.db` (com o servidor rodando, as próximas escritas
  falham com `SQLITE_READONLY`).
- A API **não** serve o front: qualquer rota fora da API responde `500 Internal error`, porque o
  servidor procura `client/build`, que não existe.

### 2. Front-end (client)

O front chama a API em um endereço fixo no código, `http://192.168.0.110:3333`
(`client/src/scripts/services/api/config.js`). Para usar o front localmente sem mudar o código,
faça esse IP apontar para a sua máquina (Linux):

```bash
sudo ip addr add 192.168.0.110/32 dev lo     # some ao reiniciar; para remover: sudo ip addr del 192.168.0.110/32 dev lo
```

(Se a sua rede local já usa o IP 192.168.0.110, isso causa conflito.)

```bash
cd client
npm ci
npm run dev        # webpack-dev-server em http://localhost:3005
```

- O login é automático (usuário `caio` / senha `123`, fixos no código). Não existe tela de cadastro
  nem de login.
- Builds: `npm run build` gera um build de **desenvolvimento** (o log mostra "Modo atual: undefined");
  o build de produção é `npm run deploy`. Os dois escrevem em `client/dist/`, que é versionado; para
  descartar: `git checkout -- client/dist && git clean -f client/dist`.

### 3. Conferir se funcionou

Com a API e o front rodando, abra http://localhost:3005 e:

1. Clique em **Notebook**, digite um nome e clique em **Ok**.
2. Selecione o caderno no filtro e clique em **Note**.
3. Preencha título e conteúdo e clique em **Save**. A nota aparece na lista e continua lá depois de
   recarregar a página.

Pela linha de comando:

```bash
TOKEN=$(curl -s -X POST localhost:3333/sessions -H 'Content-Type: application/json' \
  -d '{"username":"caio","password":"123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s -X POST localhost:3333/notebooks -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"title":"Meu caderno"}'      # -> {"success":true,"id":<N>,...}
curl -s -X POST localhost:3333/notes -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"title":"Nota","content":"oi","notebook_id":<N>}'
curl -s localhost:3333/notes
```

### Smoke test E2E (Playwright)

Sobe a API num banco SQLite temporário (`e2e/.tmp/`, com as migrations) e o front com
`webpack serve`, e testa no Chromium: criar caderno e nota, recarregar, buscar, excluir. Também
fixa bugs atuais do front (testes com nome `CURRENT BUG:`).

Pré-requisitos: `npm ci` em `server/` e em `client/`, o alias de `192.168.0.110` da seção 2 e as
portas 3333 e 3005 livres (pare `npm run dev` antes). Não precisa de `server/.env`.

```bash
cd e2e
npm ci
npx playwright install chromium   # na primeira vez
npm test
```

### Docker

**Não funciona hoje.** `docker compose up --build` falha no build da imagem com
`"/build/server/dist": not found`: o `dockerfile` copia `server/dist`, mas o TypeScript gera em
`server/build`. Mesmo corrigindo isso, o `docker-compose.yml` não passa as variáveis de ambiente
exigidas pelo servidor. Detalhes e correção sugerida em [docs/ASSESSMENT.md](docs/ASSESSMENT.md)
(itens B-01, B-03 e B-04).
