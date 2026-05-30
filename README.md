# Genius Consultoria – Plataforma de Gestão 5W2H

> **Genialidade que demonstra resultados.**  
> Sistema web completo para cadastro, acompanhamento e gestão de projetos utilizando a metodologia **5W2H**, com controle de acesso por papel, notificações automáticas e visualização em linha do tempo.

---

## 📐 Modelo de Dados

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────────────────────┐
│   Project   │──1:N──│   Category   │──1:N──│           Activity               │
│─────────────│       │──────────────│       │──────────────────────────────────│
│ id          │       │ id           │       │ id · code                        │
│ name        │       │ name         │       │ what  (O quê)                    │
│ description │       │ description  │       │ why   (Por quê)                  │
│ startDate   │       │ color        │       │ who   (Quem)                     │
│ endDate     │       │ projectId FK │       │ where (Onde)                     │
│ isActive    │       └──────────────┘       │ how   (Como)                     │
└─────────────┘                              │ howMuch    (Quanto)               │
       │                                     │ whenStart / whenEnd (Quando)     │
       │ M:N (ProjectUser)                   │ status · risk · notes            │
       │                                     │ categoryId FK · responsibleId FK │
┌─────────────┐                              └──────────────────────────────────┘
│    User     │                                            │
│─────────────│                              ┌─────────────────────┐
│ id · name   │◄─────────────────────────────│   Notification       │
│ email       │                              │─────────────────────│
│ passwordHash│                              │ id · type · title   │
│ role        │  ADMIN │ COLLABORATOR │CLIENT│ message · isRead    │
│ avatarUrl   │                              │ sentAt · activityId │
│ isActive    │                              │ userId FK           │
└─────────────┘                              └─────────────────────┘
```

### Papéis de usuário

| Papel         | Criar/Editar projetos | Criar/Editar atividades | Deletar | Visualizar | Receber notificações |
|---------------|-----------------------|-------------------------|---------|------------|----------------------|
| ADMIN         | ✅                    | ✅                      | ✅      | ✅         | ✅                   |
| COLLABORATOR  | ✅                    | ✅                      | ❌      | ✅         | ✅                   |
| CLIENT        | ❌                    | ❌                      | ❌      | Projetos vinculados | ✅         |

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+ (ou Docker)
- npm

---

### Opção 1 – Docker Compose (recomendado)

```bash
# Clone o repositório e entre na pasta
git clone <repo-url> genius-5w2h && cd genius-5w2h

# Configure as variáveis de e-mail (opcional)
cp backend/.env.example backend/.env
# edite SMTP_HOST, SMTP_USER, SMTP_PASS no arquivo .env

# Suba tudo com Docker
docker-compose up -d

# Acesse:
# Frontend: http://localhost:5173
# API:      http://localhost:3001
# Health:   http://localhost:3001/health
```

---

### Opção 2 – Execução local

#### Backend

```bash
cd backend

# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
# edite DATABASE_URL, JWT_SECRET, SMTP_* no .env

# 3. Rode as migrações e crie o banco
npm run migrate
# > Equivale a: prisma migrate dev

# 4. Popule com dados iniciais (usuários e projeto de exemplo)
npm run seed

# 5. Inicie o servidor de desenvolvimento
npm run dev
# API disponível em http://localhost:3001
```

#### Frontend

```bash
cd frontend

# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento
npm run dev
# UI disponível em http://localhost:5173
```

---

## 🔐 Variáveis de Ambiente

Arquivo: `backend/.env` (baseado em `backend/.env.example`)

| Variável                    | Descrição                                  | Padrão / Exemplo                              |
|-----------------------------|--------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`              | String de conexão PostgreSQL (Prisma)      | `postgresql://user:pass@localhost:5432/genius` |
| `JWT_SECRET`                | Chave secreta para assinar tokens JWT      | string aleatória longa                        |
| `JWT_EXPIRES_IN`            | Validade do token                          | `7d`                                          |
| `PORT`                      | Porta da API                               | `3001`                                        |
| `NODE_ENV`                  | Ambiente                                   | `development`                                 |
| `FRONTEND_URL`              | URL do frontend (CORS)                     | `http://localhost:5173`                       |
| `SMTP_HOST`                 | Host do servidor SMTP                      | `smtp.gmail.com`                              |
| `SMTP_PORT`                 | Porta SMTP                                 | `587`                                         |
| `SMTP_USER`                 | Usuário SMTP                               | `seu@email.com`                               |
| `SMTP_PASS`                 | Senha SMTP / App Password                  | senha de aplicativo Google                    |
| `SMTP_FROM`                 | Remetente dos e-mails                      | `Genius Consultoria <noreply@genius.com>`     |
| `NOTIFICATION_DAYS_BEFORE`  | Dias de antecedência para alertas de prazo | `3`                                           |

---

## 🧪 Testes Automatizados

### Testes unitários (sem banco, sem rede)

```bash
cd backend

# Runner nativo (Node.js puro – funciona sem npm install):
node run_tests.js

# Com Jest (após npm install):
npm run test:unit
```

**Suítes cobertas:**

| Suíte                          | Casos | O que valida                                              |
|--------------------------------|-------|-----------------------------------------------------------|
| JWT – Lógica de token          | 3     | Criação, decodificação e expiração de tokens              |
| Validação 5W2H                 | 6     | Campos obrigatórios, datas e custos                       |
| Status – Transições            | 5     | Estados válidos e transições permitidas                   |
| RBAC – Controle de acesso      | 4     | Permissões por papel (ADMIN, COLLABORATOR, CLIENT)        |
| Serviço de Notificações        | 6     | Detecção de prazos próximos e atividades atrasadas        |
| Filtros de atividade           | 6     | Filtros por status, categoria, responsável e busca textual|
| **Total**                      | **30**| ✅ 30 passando                                            |

### Testes de integração (com supertest)

```bash
cd backend
npm run test:integration
```

Cobre os endpoints: `/health`, `/api/auth/login`, `/api/auth/me`, `/api/projects`, `/api/activities`, `/api/notifications`, além de testes de autorização (403/401) para cada papel.

---

## 📡 Endpoints da API

### Autenticação

| Método | Rota                   | Acesso       | Descrição                  |
|--------|------------------------|--------------|----------------------------|
| POST   | `/api/auth/login`      | Público      | Login com email + senha    |
| POST   | `/api/auth/register`   | ADMIN        | Criar novo usuário         |
| GET    | `/api/auth/me`         | Autenticado  | Dados do usuário logado    |

### Projetos

| Método | Rota                           | Acesso              | Descrição                    |
|--------|--------------------------------|---------------------|------------------------------|
| GET    | `/api/projects`                | Autenticado         | Listar projetos              |
| GET    | `/api/projects/:id`            | Autenticado *       | Detalhes + categorias        |
| POST   | `/api/projects`                | ADMIN / COLLAB      | Criar projeto                |
| PUT    | `/api/projects/:id`            | ADMIN / COLLAB      | Editar projeto               |
| DELETE | `/api/projects/:id`            | ADMIN               | Desativar projeto (soft)     |
| POST   | `/api/projects/:id/clients`    | ADMIN / COLLAB      | Vincular cliente             |
| DELETE | `/api/projects/:id/clients/:userId` | ADMIN / COLLAB | Desvincular cliente         |

> *Cliente só acessa projetos vinculados ao seu usuário.

### Categorias

| Método | Rota                   | Acesso         | Descrição          |
|--------|------------------------|----------------|--------------------|
| GET    | `/api/categories`      | Autenticado    | Listar (com ?projectId=) |
| GET    | `/api/categories/:id`  | Autenticado    | Detalhe            |
| POST   | `/api/categories`      | ADMIN / COLLAB | Criar              |
| PUT    | `/api/categories/:id`  | ADMIN / COLLAB | Editar             |
| DELETE | `/api/categories/:id`  | ADMIN          | Deletar            |

### Atividades (5W2H)

| Método | Rota                        | Acesso         | Descrição                                                  |
|--------|-----------------------------|----------------|------------------------------------------------------------|
| GET    | `/api/activities`           | Autenticado    | Listar com filtros: `?status=&categoryId=&responsibleId=&search=&startDate=&endDate=` |
| GET    | `/api/activities/:id`       | Autenticado    | Detalhe completo                                           |
| GET    | `/api/activities/stats/:projectId` | Autenticado | Resumo por status para o projeto                      |
| POST   | `/api/activities`           | ADMIN / COLLAB | Criar atividade com todos os 7 campos 5W2H                 |
| PUT    | `/api/activities/:id`       | ADMIN / COLLAB | Editar atividade (dispara notificação se mudar status)     |
| DELETE | `/api/activities/:id`       | ADMIN / COLLAB | Excluir atividade                                          |

### Notificações

| Método | Rota                            | Acesso      | Descrição                     |
|--------|---------------------------------|-------------|-------------------------------|
| GET    | `/api/notifications`            | Autenticado | Minhas notificações (+ unreadCount) |
| GET    | `/api/notifications?unreadOnly=true` | Autenticado | Apenas não lidas         |
| PATCH  | `/api/notifications/:id/read`   | Autenticado | Marcar uma como lida          |
| PATCH  | `/api/notifications/read-all`   | Autenticado | Marcar todas como lidas       |

### Usuários

| Método | Rota            | Acesso         | Descrição                |
|--------|-----------------|----------------|--------------------------|
| GET    | `/api/users`    | ADMIN / COLLAB | Listar usuários (?role=) |
| PUT    | `/api/users/me` | Autenticado    | Atualizar próprio perfil |
| DELETE | `/api/users/:id`| ADMIN          | Desativar usuário (soft) |

---

## 🔔 Sistema de Notificações

### Como funciona

1. **Agendador diário** (`node-cron`) executa toda manhã às **08:00** via `notification.scheduler.js`
2. O serviço verifica:
   - Atividades com prazo nos próximos **N dias** (configurável via `NOTIFICATION_DAYS_BEFORE`) → envia `DEADLINE_WARNING`
   - Atividades com prazo vencido → atualiza status para `DELAYED` e envia `DEADLINE_EXCEEDED`
3. **Mudança de status manual** também gera notificação `STATUS_CHANGE` automática ao salvar
4. Notificações são salvas no banco (`notifications` table) e enviadas por **e-mail** via Nodemailer
5. O frontend exibe um **sino** com badge de não-lidas, atualizado a cada minuto
6. O e-mail é enviado com template HTML brandado da Genius Consultoria

### Destinatários
- **Responsável** da atividade (se vinculado a um usuário do sistema)
- **Clientes** vinculados ao projeto da atividade

### Configurar periodicidade
Altere o cron expression em `backend/src/services/notification.scheduler.js`:

```js
// Padrão: todo dia às 08:00
cron.schedule('0 8 * * *', async () => { ... });

// Exemplos:
// '0 */6 * * *'   → a cada 6 horas
// '0 8,18 * * *'  → 8h e 18h
// '0 8 * * 1-5'   → apenas dias úteis às 8h
```

---

## 🗂️ Estrutura de Pastas

```
genius-5w2h/
├── docker-compose.yml
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── run_tests.js          ← testes unitários nativos (sem npm)
│   ├── prisma/
│   │   └── schema.prisma     ← modelo de dados completo
│   └── src/
│       ├── app.js            ← Express + middlewares
│       ├── server.js         ← entrada + agendador
│       ├── prisma/
│       │   ├── client.js     ← singleton PrismaClient
│       │   └── seed.js       ← dados iniciais
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── project.controller.js
│       │   └── activity.controller.js
│       ├── middleware/
│       │   └── auth.middleware.js  ← JWT + RBAC
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── project.routes.js
│       │   ├── activity.routes.js
│       │   ├── category.routes.js
│       │   ├── notification.routes.js
│       │   └── user.routes.js
│       └── services/
│           ├── notification.service.js    ← e-mail + banco
│           └── notification.scheduler.js  ← cron diário
│   └── tests/
│       ├── unit/
│       │   ├── auth.test.js
│       │   └── activity.test.js
│       └── integration/
│           └── api.test.js
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx             ← roteamento + guards
        ├── main.jsx
        ├── styles/globals.css  ← design system Genius
        ├── context/
        │   └── AuthContext.jsx
        ├── services/
        │   └── api.js          ← axios + endpoints
        ├── components/
        │   ├── layout/
        │   │   └── Sidebar.jsx
        │   └── ui/
        │       ├── ActivityCard.jsx
        │       ├── NotificationBell.jsx
        │       └── StatsBar.jsx
        └── pages/
            ├── LoginPage.jsx         ← tela de login branded
            ├── ManagerDashboard.jsx  ← painel do colaborador
            ├── ClientDashboard.jsx   ← painel do cliente
            ├── ProjectPage.jsx       ← detalhes + linha do tempo
            └── ActivityForm.jsx      ← formulário 5W2H completo
```

---

## 👥 Usuários de Teste (após seed)

| Papel        | E-mail                                    | Senha       |
|--------------|-------------------------------------------|-------------|
| Admin        | admin@geniusconsultoria.com.br            | Admin@123   |
| Colaborador  | colaborador@geniusconsultoria.com.br      | Collab@123  |
| Cliente      | cliente@empresa.com.br                    | Client@123  |

---

## ✅ Checklist de Conformidade

- [x] Todos os 7 campos 5W2H presentes no modelo de dados e no formulário
- [x] Controle de acesso diferencia ADMIN, COLLABORATOR e CLIENT
- [x] Endpoints RESTful com autenticação JWT em todas as rotas protegidas
- [x] Rate limiting global e específico para autenticação
- [x] Middleware de autorização por papel (authorize factory)
- [x] Clientes acessam apenas projetos vinculados ao seu cadastro
- [x] 30 testes automatizados cobrindo JWT, 5W2H, RBAC, notificações e filtros
- [x] Testes de integração com supertest para os principais endpoints
- [x] Migração de banco via Prisma Migrate
- [x] Seed com dados demonstrativos
- [x] Notificações por e-mail com template HTML Genius
- [x] Agendador cron diário configurável
- [x] Design system fiel à identidade visual da Genius Consultoria
- [x] Docker Compose para deploy simplificado

---

*© 2025 Genius Consultoria – Genialidade que demonstra resultados.*
