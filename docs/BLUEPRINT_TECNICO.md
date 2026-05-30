# 🔷 Genius Consultoria — Blueprint Técnico v2.0
### Documentação para Desenvolvedores e Analistas de Manutenção

> **Versão:** 2.0 · **Data:** 2026-05-30 · **Confidencial — Uso Interno**

---

## 📋 SUMÁRIO

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura e Stack Tecnológica](#2-arquitetura-e-stack-tecnológica)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Banco de Dados — Modelo de Dados](#4-banco-de-dados--modelo-de-dados)
5. [Backend — APIs e Rotas](#5-backend--apis-e-rotas)
6. [Frontend — Componentes e Páginas](#6-frontend--componentes-e-páginas)
7. [Autenticação e Autorização (RBAC)](#7-autenticação-e-autorização-rbac)
8. [Sistema de Notificações](#8-sistema-de-notificações)
9. [Analytics e Observabilidade](#9-analytics-e-observabilidade)
10. [Deploy e Infraestrutura](#10-deploy-e-infraestrutura)
11. [Variáveis de Ambiente](#11-variáveis-de-ambiente)
12. [Problemas Conhecidos e Soluções](#12-problemas-conhecidos-e-soluções)
13. [Testes Automatizados](#13-testes-automatizados)
14. [Guia de Manutenção](#14-guia-de-manutenção)
15. [Glossário Técnico](#15-glossário-técnico)

---

## 1. VISÃO GERAL DO SISTEMA

### O que é o Genius 5W2H?

O **Genius 5W2H** é uma plataforma web corporativa de gestão de projetos baseada na metodologia 5W2H. O sistema permite que organizações criem projetos, cadastrem atividades com todos os 7 campos da metodologia, acompanhem cronogramas via Gantt interativo, monitorem riscos com matriz probabilidade × impacto e gerem indicadores executivos com KPIs como SPI (Schedule Performance Index) e CPI (Cost Performance Index).

### URLs de Produção

| Componente | URL |
|---|---|
| Frontend | https://genius-5w2h.onrender.com |
| Backend API | https://genius-5w2h-production.up.railway.app |
| Health Check | https://genius-5w2h-production.up.railway.app/health |
| Repositório | https://github.com/jeffgomessilva10-spec/genius-5w2h |

### Módulos Implementados

| Módulo | Descrição | Status |
|---|---|---|
| Autenticação JWT + RBAC | Login, papéis, controle de acesso | ✅ Ativo |
| Projetos e Atividades 5W2H | CRUD completo com todos os campos | ✅ Ativo |
| Dashboards Operacional e Executivo | KPIs, SPI/CPI, indicadores | ✅ Ativo |
| Gantt com filtros | Cronograma com período e status | ✅ Ativo |
| Notificações E-mail (Brevo) | Boas-vindas, status, prazos | ✅ Ativo |
| Notificações WhatsApp (Twilio) | Requer configuração do Twilio | ⚙️ Opcional |
| Matriz de Riscos | Probabilidade × Impacto automático | ✅ Ativo |
| RACI por atividade | Matriz R/A/C/I | ✅ Ativo |
| Apontamento de Horas | Time tracking por atividade | ✅ Ativo |
| Anexos e Evidências | Links para arquivos externos | ✅ Ativo |
| Repositório de Documentos | Central de documentos por projeto | ✅ Ativo |
| OKRs | Objetivos e Resultados-Chave | ⚠️ Parcial (tabelas pendentes) |
| PDCA + Lições Aprendidas | Ciclo de melhoria contínua | ✅ Ativo |
| Analytics de Uso | DAU/WAU/MAU, retenção, adoção | ✅ Ativo |
| Governança de Dados | Glossário, políticas, LGPD | ✅ Ativo |
| Log de Auditoria | Rastreio de ações críticas | ✅ Ativo |
| Perfil do Usuário | Alterar nome e senha | ✅ Ativo |

---

## 2. ARQUITETURA E STACK TECNOLÓGICA

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)                       │
│              https://genius-5w2h.onrender.com                │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              RENDER — Static Site (Frontend)                 │
│  React 18 + Vite  │  Axios  │  React Router  │  SVG Charts  │
└─────────────────────┬───────────────────────────────────────┘
                      │ API REST (HTTPS + JWT)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           RAILWAY — Node.js API (Backend)                    │
│  Express 4  │  Prisma ORM  │  Winston  │  node-cron         │
│  Helmet  │  Rate Limit  │  JWT  │  XSS sanitize             │
└──────┬─────────────────┬──────────────────────────────────┘
       │                 │
       ▼                 ▼
┌────────────┐    ┌───────────────┐    ┌─────────────────┐
│ PostgreSQL  │    │  Brevo API    │    │  Twilio (opt.)  │
│  (Railway) │    │  (E-mail)     │    │  (WhatsApp)     │
└────────────┘    └───────────────┘    └─────────────────┘
```

### Stack Backend

| Tecnologia | Versão | Função |
|---|---|---|
| Node.js | 20 | Runtime JavaScript |
| Express.js | 4.19 | Framework web |
| Prisma | 5.14 | ORM (Object-Relational Mapper) |
| PostgreSQL | 14+ | Banco de dados relacional |
| jsonwebtoken | 9.0 | Autenticação JWT |
| bcryptjs | 2.4 | Hash de senhas |
| Helmet | 7.1 | Headers de segurança HTTP |
| express-rate-limit | 7.3 | Rate limiting |
| xss | 1.0 | Sanitização contra XSS |
| node-cron | 3.0 | Agendador de tarefas |
| Winston | 3.13 | Logging estruturado |
| nodemailer | 6.9 | E-mail (legado, não usado em produção) |
| twilio | 5.3 | WhatsApp (opcional) |

### Stack Frontend

| Tecnologia | Versão | Função |
|---|---|---|
| React | 18.3 | Framework UI |
| Vite | 5.2 | Bundler / Dev server |
| React Router DOM | 6.23 | Roteamento SPA |
| Axios | 1.7 | Cliente HTTP |
| Lucide React | 0.383 | Ícones |
| date-fns | 3.6 | Manipulação de datas |

> ⚠️ **Nota:** Nenhuma biblioteca de gráficos externa (ex: Recharts) é usada. Todos os gráficos são implementados com SVG puro para manter o bundle leve e o build rápido.

---

## 3. ESTRUTURA DE PASTAS

```
genius-5w2h/
│
├── backend/
│   ├── .env.example                   # Template de variáveis de ambiente
│   ├── Dockerfile                     # Imagem Docker para Railway
│   ├── package.json                   # Dependências e scripts
│   │
│   ├── prisma/
│   │   └── schema.prisma              # MODELO DE DADOS COMPLETO
│   │
│   ├── src/
│   │   ├── app.js                     # Express + middlewares + registro de rotas
│   │   ├── server.js                  # Entrada da aplicação + cron
│   │   │
│   │   ├── controllers/               # Lógica de negócio (MVC — Controller)
│   │   │   ├── activity.controller.js # CRUD atividades + SPI/CPI
│   │   │   ├── analytics.controller.js # Métricas DAU/WAU/MAU
│   │   │   ├── attachment.controller.js # Anexos e evidências
│   │   │   ├── auth.controller.js     # Login + registro + JWT
│   │   │   ├── comment.controller.js  # Comentários + @menções
│   │   │   ├── dashboard.controller.js # KPIs operacional e executivo
│   │   │   ├── document.controller.js # Repositório de documentos
│   │   │   ├── okr.controller.js      # OKRs e Resultados-Chave
│   │   │   ├── pdca.controller.js     # Ciclo PDCA + Lições
│   │   │   ├── project.controller.js  # CRUD projetos + membros
│   │   │   ├── raci.controller.js     # Matriz RACI
│   │   │   └── timeentry.controller.js # Apontamento de horas
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # authenticate() + authorize()
│   │   │   └── security.middleware.js # sanitizeInputs() + detectInjection()
│   │   │
│   │   ├── routes/                    # Definição de endpoints REST
│   │   │   ├── activity.routes.js
│   │   │   ├── ai.routes.js           # Validação IA dos campos 5W2H
│   │   │   ├── analytics.routes.js
│   │   │   ├── attachment.routes.js
│   │   │   ├── audit.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── category.routes.js
│   │   │   ├── comment.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── document.routes.js
│   │   │   ├── gantt.routes.js        # Gantt com filtros de período
│   │   │   ├── governance.routes.js
│   │   │   ├── notification.routes.js
│   │   │   ├── observability.routes.js # /health + /ready + /metrics
│   │   │   ├── okr.routes.js
│   │   │   ├── pdca.routes.js
│   │   │   ├── project.routes.js
│   │   │   ├── raci.routes.js
│   │   │   ├── timeentry.routes.js
│   │   │   └── user.routes.js
│   │   │
│   │   ├── services/
│   │   │   ├── analytics.service.js   # DAU, retenção, churn, adoção
│   │   │   ├── audit.service.js       # Registro de logs de auditoria
│   │   │   ├── logger.service.js      # Winston + HTTP logger middleware
│   │   │   ├── notification.scheduler.js # Cron diário às 08:00
│   │   │   ├── notification.service.js   # E-mail + WhatsApp
│   │   │   └── period.service.js      # Cálculo de períodos (timezone SP)
│   │   │
│   │   └── prisma/
│   │       ├── client.js              # Singleton PrismaClient
│   │       └── seed.js                # Dados iniciais de demonstração
│   │
│   └── tests/
│       └── unit/
│           ├── auth.test.js           # JWT tokens
│           ├── activity.test.js       # Validações 5W2H
│           ├── phase1.test.js         # Riscos, financeiro, comentários
│           ├── phase2.test.js         # RACI, horas, anexos
│           ├── phase3.test.js         # OKRs, PDCA, validação IA
│           ├── dashboard.test.js      # SPI/CPI, KPIs
│           ├── analytics.test.js      # LGPD, métricas
│           └── period.test.js         # Timezone São Paulo
│
├── frontend/
│   ├── index.html                     # Entry point (div#root)
│   ├── vite.config.js                 # Configuração do Vite + proxy dev
│   ├── package.json
│   │
│   ├── public/
│   │   ├── logo-branca.png            # Logo para fundo escuro
│   │   ├── logo-laranja.png           # Logo para fundo claro
│   │   └── _redirects                 # SPA routing (Netlify/Render)
│   │
│   └── src/
│       ├── App.jsx                    # Roteamento + Guards de autenticação
│       ├── main.jsx                   # ReactDOM.createRoot()
│       │
│       ├── context/
│       │   └── AuthContext.jsx        # Estado global de autenticação
│       │
│       ├── hooks/
│       │   └── useIsMobile.js         # Detector mobile (< 768px)
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   └── Sidebar.jsx        # Menu lateral responsivo + drawer mobile
│       │   └── ui/
│       │       ├── ActivityCard.jsx
│       │       ├── AIValidator.jsx    # Validação inteligente dos campos
│       │       ├── Attachments.jsx
│       │       ├── Comments.jsx       # Chat + @menções
│       │       ├── NotificationBell.jsx # Sino + bottom sheet mobile
│       │       ├── PeriodFilter.jsx   # Filtro Hoje/Semana/Mês/Todos
│       │       ├── RaciMatrix.jsx     # Matriz RACI visual
│       │       ├── RiskMatrix.jsx     # Matriz de riscos 5×5
│       │       ├── StatsBar.jsx
│       │       ├── StatusFilter.jsx   # Filtro multi-status
│       │       └── TimeTracker.jsx    # Apontamento de horas
│       │
│       ├── pages/
│       │   ├── AnalyticsPage.jsx      # Dashboard de analytics (Admin/Executive)
│       │   ├── ClientDashboard.jsx    # Painel do cliente
│       │   ├── DocumentsPage.jsx      # Repositório de documentos
│       │   ├── ExecutiveDashboard.jsx # Dashboard executivo (SPI/CPI)
│       │   ├── GanttPage.jsx          # Cronograma com filtros
│       │   ├── GovernancePage.jsx     # Glossário e políticas
│       │   ├── LoginPage.jsx          # Tela de login
│       │   ├── ManagerDashboard.jsx   # Dashboard legado (mantido)
│       │   ├── OKRPage.jsx            # OKRs
│       │   ├── OperationalDashboard.jsx # Dashboard operacional
│       │   ├── PdcaPage.jsx           # PDCA + Lições
│       │   ├── ProfilePage.jsx        # Perfil + alterar senha
│       │   ├── ProjectPage.jsx        # Detalhes do projeto
│       │   ├── ProjectsPage.jsx       # Lista de projetos
│       │   └── UsersPage.jsx          # Gestão de usuários
│       │
│       └── services/
│           ├── api.js                 # Axios + interceptors + endpoints
│           └── analytics.js          # Rastreamento com consentimento LGPD
│
├── docs/
│   ├── BLUEPRINT_TECNICO.md           # Este documento
│   ├── MANUAL_DO_USUARIO.md           # Manual do usuário
│   └── RELATORIO-QA.md               # Relatório de qualidade pós-migração
│
└── RELATORIO-QA.md                    # Relatório de testes
```

---

## 4. BANCO DE DADOS — MODELO DE DADOS

### Diagrama Entidade-Relacionamento (Simplificado)

```
┌──────────┐     M:N      ┌─────────────┐     1:N     ┌────────────┐
│   User   │◄────────────►│ ProjectUser │             │  Project   │
│──────────│              │─────────────│◄────────────│────────────│
│ id       │              │ projectId   │             │ id         │
│ name     │              │ userId      │             │ name       │
│ email    │              └─────────────┘             │ startDate  │
│ role     │                                          │ endDate    │
│ phone    │              1:N                         └─────┬──────┘
└────┬─────┘         ┌────────────┐                         │ 1:N
     │               │  Category  │◄────────────────────────┘
     │               │────────────│
     │               │ id         │
     │               │ name       │
     │               │ color      │
     │               └─────┬──────┘
     │                     │ 1:N
     │               ┌─────▼──────────────────────────────────────┐
     │               │              Activity (Núcleo 5W2H)        │
     │               │────────────────────────────────────────────│
     │               │ id · code                                  │
     │               │ what · why · who · where · how             │
     │               │ howMuch · actualCost                       │
     │               │ plannedHours · actualHours                 │
     │               │ whenStart · whenEnd                        │
     │               │ status (PLANNED|IN_PROGRESS|DELAYED|DONE) │
     │               │ riskProbability · riskImpact · riskLevel   │
     │               │ riskMitigation                             │
     │               └─────┬──────────────────────────────────────┘
     │                     │
     │         ┌───────────┼───────────┬──────────────┐
     │         ▼           ▼           ▼              ▼
     │    ┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────────────┐
     │    │ Comment │ │  Raci   │ │TimeEntry│ │ Attachment   │
     │    └─────────┘ └─────────┘ └────────┘ └──────────────┘
     │
     ▼
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│ Notification│   │  AuditLog    │   │ AnalyticEvent │
└─────────────┘   └──────────────┘   └───────────────┘
```

### Tabela: `users`

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| name | String | Nome completo |
| email | String (unique) | E-mail de acesso |
| password_hash | String | Senha hasheada (bcrypt, custo 12) |
| role | Enum | ADMIN \| COLLABORATOR \| CLIENT \| EXECUTIVE |
| phone | String? | Número WhatsApp (+55...) |
| avatar_url | String? | URL do avatar |
| dashboard_prefs | JSON? | Preferências do dashboard |
| is_active | Boolean | Soft delete |
| created_at | DateTime | |
| updated_at | DateTime | |

### Tabela: `activities` (Núcleo 5W2H)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID | ✅ | PK |
| code | String | ✅ | Identificador legível (ex: "1.3") |
| what | String | ✅ | O Quê — descrição da tarefa |
| why | String | ✅ | Por Quê — motivo/benefício |
| who | String | ✅ | Quem — responsável textual |
| where | String | ✅ | Onde — local/modo de execução |
| how | String | ✅ | Como — metodologia/processo |
| how_much | Decimal? | ❌ | Custo estimado (R$) |
| actual_cost | Decimal? | ❌ | Custo realizado (R$) |
| planned_hours | Decimal? | ❌ | Horas planejadas |
| actual_hours | Decimal? | ❌ | Horas realizadas (calculado) |
| when_start | DateTime? | ❌ | Data de início |
| when_end | DateTime? | ❌ | Data de término/prazo |
| status | Enum | ✅ | PLANNED\|IN_PROGRESS\|DELAYED\|DONE |
| risk | String? | ❌ | Descrição do risco |
| risk_probability | Int? (1-5) | ❌ | Probabilidade do risco |
| risk_impact | Int? (1-5) | ❌ | Impacto do risco |
| risk_level | Enum? | ❌ | LOW\|MEDIUM\|HIGH\|CRITICAL (auto) |
| risk_mitigation | String? | ❌ | Plano de mitigação |
| notes | String? | ❌ | Observações adicionais |
| category_id | UUID FK | ✅ | Categoria do projeto |
| responsible_id | UUID FK? | ❌ | Usuário responsável |

### Cálculo Automático do `risk_level`

```
score = riskProbability × riskImpact

score ≥ 20 → CRITICAL
score ≥ 12 → HIGH  
score ≥ 6  → MEDIUM
score < 6  → LOW
```

### Papéis de Usuário (RBAC)

| Papel | Criar/Editar | Deletar | Ver Tudo | Dashboard Executivo |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| COLLABORATOR | ✅ (seus projetos) | ❌ | Seus projetos | ❌ |
| CLIENT | ❌ | ❌ | Seus indicadores | ❌ |
| EXECUTIVE | ❌ | ❌ | ✅ | ✅ |

---

## 5. BACKEND — APIs E ROTAS

### Autenticação

```
POST   /api/auth/login          Público         Login → { token, user }
POST   /api/auth/register       ADMIN           Criar usuário
GET    /api/auth/me             Autenticado     Dados do usuário logado
```

### Projetos

```
GET    /api/projects                    Autenticado       Listar projetos*
GET    /api/projects/:id                Autenticado*      Detalhes + categorias
POST   /api/projects                    ADMIN/COLLAB      Criar projeto
PUT    /api/projects/:id                ADMIN/COLLAB      Editar projeto
DELETE /api/projects/:id                ADMIN             Desativar (soft)
POST   /api/projects/:id/clients        ADMIN/COLLAB      Vincular usuário
DELETE /api/projects/:id/clients/:uid   ADMIN/COLLAB      Desvincular usuário
```
`*` ADMIN vê todos; COLLAB/CLIENT veem apenas seus projetos

### Atividades

```
GET    /api/activities                  Autenticado       Listar com filtros
       ?status=DELAYED
       &categoryId=xxx
       &responsibleId=xxx
       &search=texto
       &riskLevel=HIGH
POST   /api/activities                  ADMIN/COLLAB      Criar atividade 5W2H
PUT    /api/activities/:id              ADMIN/COLLAB      Editar (notifica se mudar status)
DELETE /api/activities/:id              ADMIN/COLLAB      Excluir
GET    /api/activities/stats/:projectId Autenticado       KPIs: total, por status, financeiro
GET    /api/activities/:id/comments     Autenticado       Listar comentários
POST   /api/activities/:id/comments     ADMIN/COLLAB      Criar comentário (detecta @menções)
DELETE /api/activities/:id/comments/:cid Autenticado      Excluir (próprio ou Admin)
GET    /api/activities/:id/raci         Autenticado       Listar RACI
POST   /api/activities/:id/raci         ADMIN/COLLAB      Adicionar/atualizar papel RACI
DELETE /api/activities/:id/raci/:uid    ADMIN/COLLAB      Remover da RACI
GET    /api/activities/:id/time-entries Autenticado       Listar apontamentos
POST   /api/activities/:id/time-entries Autenticado       Registrar horas
DELETE /api/activities/:id/time-entries/:eid Autenticado  Excluir apontamento
GET    /api/activities/:id/attachments  Autenticado       Listar anexos
POST   /api/activities/:id/attachments  ADMIN/COLLAB      Adicionar anexo
DELETE /api/activities/:id/attachments/:aid Autenticado   Remover anexo
```

### Gantt (Filtros de Período)

```
GET    /api/gantt                       Autenticado       Atividades filtradas para Gantt
       ?period=hoje|semana|mes|todas    (obrigatório)
       &status=PLANNED,IN_PROGRESS      (opcional, separado por vírgula)
       &projectId=xxx                   (opcional)

Retorna:
{
  activities: [...],
  counters: { PLANNED: 5, IN_PROGRESS: 12, DELAYED: 3, DONE: 8, total: 28 },
  period: "semana",
  range: { start: "2026-05-27T03:00:00Z", end: "2026-06-02T02:59:59Z" },
  filtersApplied: { period: "semana", status: ["PLANNED", "IN_PROGRESS"] }
}
```

**Lógica de período (timezone America/Sao_Paulo = UTC-3):**

| Período | Intervalo calculado |
|---|---|
| `hoje` | 00:00:00 a 23:59:59 do dia atual em SP |
| `semana` | Segunda 00:00 a domingo 23:59 da semana atual em SP |
| `mes` | Dia 1 00:00 ao último dia 23:59 do mês atual em SP |
| `todas` | Sem filtro de data |

### Dashboards

```
GET    /api/dashboard/operational       Autenticado       KPIs do colaborador logado
       ?period=week|month               (opcional)
GET    /api/dashboard/executive         ADMIN/EXECUTIVE   KPIs de todos os projetos
       ?period=month                    (opcional)
       &projectId=xxx                   (opcional)
GET    /api/dashboard/preferences       Autenticado       Preferências do usuário
PUT    /api/dashboard/preferences       Autenticado       Salvar preferências
```

**Resposta do Dashboard Executivo:**
```json
{
  "portfolio": {
    "totalProjects": 2,
    "totalActivities": 208,
    "plannedCost": 150000.00,
    "actualCost": 87500.00,
    "avgPctDone": 43,
    "projectsOnTrack": 1,
    "projectsAtRisk": 1,
    "totalDelayed": 84
  },
  "projectKPIs": [{
    "id": "...",
    "name": "Planejamento 2026",
    "pctDone": 55,
    "spi": 0.92,
    "cpi": 1.08,
    "spiStatus": "WARN",
    "cpiStatus": "OK",
    "plannedCost": 100000,
    "actualCost": 65000
  }],
  "riskExposure": [...],
  "topDelayed": [...]
}
```

**Fórmulas dos Índices:**
```
SPI = (% atividades concluídas) ÷ (% tempo decorrido)
    ≥ 1.0 = OK (adiantado ou no prazo)
    0.8–1.0 = WARN (atenção)
    < 0.8 = RISK (atrasado)

CPI = (Valor Agregado) ÷ (Custo Real)
    onde: Valor Agregado = custo_planejado × (concluídas / total)
    ≥ 1.0 = dentro do orçamento
    < 1.0 = acima do orçamento
```

### Observabilidade

```
GET    /health           Público         { status, timestamp, uptimeSeconds, database }
GET    /ready            Público         { ready: true/false }
GET    /metrics          ADMIN           Métricas completas do sistema
```

---

## 6. FRONTEND — COMPONENTES E PÁGINAS

### Guards de Autenticação (App.jsx)

```jsx
PrivateRoute      → Qualquer usuário autenticado
CollaboratorRoute → ADMIN ou COLLABORATOR
ExecutiveRoute    → ADMIN ou EXECUTIVE
```

### Fluxo de Roteamento

```
/ (raiz)
  ↓ PrivateRoute
  ↓ RoleRouter
    CLIENT    → /client
    EXECUTIVE → /executive
    outros    → /dashboard

/login          → LoginPage (público)
/dashboard      → OperationalDashboard (CollaboratorRoute)
/executive      → ExecutiveDashboard (ExecutiveRoute)
/projects       → ProjectsPage (CollaboratorRoute)
/projects/:id   → ProjectPage (PrivateRoute)
/gantt          → GanttPage (CollaboratorRoute)
/documents      → DocumentsPage (CollaboratorRoute)
/okr            → OKRPage (CollaboratorRoute)
/pdca           → PdcaPage (CollaboratorRoute)
/governance     → GovernancePage (PrivateRoute)
/analytics      → AnalyticsPage (ExecutiveRoute)
/users          → UsersPage (CollaboratorRoute)
/profile        → ProfilePage (PrivateRoute)
/client         → ClientDashboard (PrivateRoute)
/activities/new → ActivityForm (CollaboratorRoute)
/activities/:id/edit → ActivityForm (CollaboratorRoute)
```

### Lazy Loading

Todos os componentes de página são carregados com `React.lazy()` para melhorar o tempo de carregamento inicial. Se uma página falhar, o `<Suspense>` exibe um spinner e as outras páginas continuam funcionando.

### AuthContext

Gerencia o estado de autenticação globalmente:

```javascript
// Valores disponíveis via useAuth()
{
  user,           // objeto do usuário logado (null se não autenticado)
  loading,        // true durante verificação inicial do localStorage
  login,          // função async (email, password) → user
  logout,         // limpa localStorage e estado
  isCollaborator, // COLLABORATOR ou ADMIN
  isClient,       // CLIENT
  isAdmin,        // ADMIN
  isExecutive,    // EXECUTIVE ou ADMIN
}
```

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO (RBAC)

### Fluxo Completo de Autenticação

```
1. Usuário faz POST /api/auth/login com { email, password }
2. Backend:
   a. Busca usuário por email no banco
   b. Verifica is_active = true
   c. bcrypt.compare(password, passwordHash)
   d. jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' })
   e. Retorna { token, user }
3. Frontend armazena em localStorage:
   - genius_token → JWT
   - genius_user  → { id, name, email, role }
4. AuthContext lê do localStorage ao inicializar
5. Axios interceptor injeta em TODAS as requisições:
   Authorization: Bearer <token>
6. Middleware authenticate():
   a. Verifica header Authorization
   b. jwt.verify(token, JWT_SECRET)
   c. Busca usuário no banco (verifica is_active)
   d. Injeta req.user = { id, email, role }
7. Middleware authorize(...roles):
   a. Verifica roles.includes(req.user.role)
   b. 403 se não autorizado
```

### Rate Limiting

```
Global:      200 req / 15 min / IP  (todas as rotas)
Auth:         10 req / 15 min / IP  (apenas /api/auth)
```

Resposta quando bloqueado (HTTP 429):
```json
{ "error": "Muitas tentativas de login. Aguarde 15 minutos." }
```

---

## 8. SISTEMA DE NOTIFICAÇÕES

### E-mail via Brevo HTTP API

> ⚠️ **IMPORTANTE:** O Railway bloqueia conexões SMTP (portas 587 e 465). Por isso, usamos a API HTTP do Brevo em vez do SMTP.

**Como funciona:**

```
1. Evento disparador (ex: criar usuário)
2. sendWelcomeNotification({ userId, name, email, password, phone })
3. sendNotification() → salva no banco (tabela notifications) 
4. sendBrevoEmail() → POST https://api.brevo.com/v3/smtp/email
5. Headers: { "api-key": BREVO_API_KEY }
6. Marca sentAt no banco se enviado com sucesso
```

**Eventos que disparam e-mail:**

| Evento | Destinatários | Tipo |
|---|---|---|
| Cadastro de usuário | Novo usuário | Boas-vindas + credenciais |
| Mudança de status de atividade | Responsável + Clientes do projeto | STATUS_CHANGE |
| Prazo próximo (N dias) | Responsável + Clientes | DEADLINE_WARNING |
| Prazo vencido | Responsável + Clientes | DEADLINE_EXCEEDED |
| @menção em comentário | Usuário mencionado | STATUS_CHANGE |

**Agendador (node-cron):**

```javascript
// src/services/notification.scheduler.js
// Roda todo dia às 08:00 (horário do servidor Railway = UTC)
cron.schedule('0 8 * * *', async () => {
  await checkDeadlines(); // verifica NOTIFICATION_DAYS_BEFORE dias à frente
});
```

### WhatsApp via Twilio (Opcional)

Para ativar, configurar no Railway:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

> 📌 Para produção real, é necessário um número aprovado pela Meta (não o sandbox).

---

## 9. ANALYTICS E OBSERVABILIDADE

### Coleta de Eventos

O frontend registra eventos via `POST /api/analytics/events` apenas se o usuário consentiu (LGPD). O `analytics.js` verifica `localStorage.getItem('analytics_consent')` antes de qualquer envio.

**Tipos de evento:** `SESSION_START`, `SESSION_END`, `PAGE_VIEW`, `ACTION`, `FEATURE_USE`

**Pseudonimização:** O IP do usuário é hasheado com SHA-256 antes de armazenar (não reversível).

### Métricas Disponíveis (Admin/Executive)

| Métrica | Endpoint | Descrição |
|---|---|---|
| DAU | /api/analytics/dau | Série temporal de usuários únicos/dia |
| WAU/MAU | /api/analytics/active | Ativos por semana e mês |
| Duração de sessão | /api/analytics/sessions | Média, máx, mín |
| Retenção D7/D30 | /api/analytics/retention | Cohort analysis |
| Adoção | /api/analytics/features | % de uso por módulo |
| Churn | /api/analytics/churn | Taxa de abandono |
| Mapa de calor | /api/analytics/heatmap | Módulos mais acessados |

### Health e Métricas do Sistema

```
GET /health → { status, timestamp, uptimeSeconds, database }
GET /ready  → { ready: true }
GET /metrics (ADMIN) → {
  app: { requestCount, errorRate, memoryMB },
  database: { users, projects, activities, auditLogs },
  system: { memoryMB, nodeVersion }
}
```

---

## 10. DEPLOY E INFRAESTRUTURA

### Backend — Railway

**Dockerfile (resumo):**
```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/prisma/seed.js; node src/server.js"]
```

> ⚠️ O ponto e vírgula `;` antes de `node src/server.js` garante que o servidor suba mesmo se o seed falhar.

**CI/CD automático:**
- Push no `master` → Railway detecta → builda Docker → deploya → roda CMD

**Rollback:**
1. Railway Dashboard → genius-5w2h → Deployments
2. Clique no deploy anterior → três pontinhos (⋯) → **Redeploy**

### Frontend — Render

**Configuração:**
```
Type:              Static Site
Root Directory:    frontend
Build Command:     npm install && npm run build
Publish Directory: dist
```

**Regra de Redirect obrigatória (SPA):**
```
Source:      /*
Destination: /index.html
Action:      Rewrite
```
> ⚠️ Sem esta regra, qualquer URL direta como `/login` retorna "Not Found".

**CI/CD automático:**
- Push no `master` → Render detecta → `npm run build` → publica `dist/`

---

## 11. VARIÁVEIS DE AMBIENTE

### Railway (Backend)

| Variável | Obrigatória | Valor/Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | `${Postgres.DATABASE_URL}` (preenchido automaticamente) |
| `JWT_SECRET` | ✅ | String aleatória longa (min. 32 chars) |
| `JWT_EXPIRES_IN` | ✅ | `7d` |
| `PORT` | ✅ | `3001` |
| `NODE_ENV` | ✅ | `production` |
| `FRONTEND_URL` | ✅ | `https://genius-5w2h.onrender.com` |
| `NOTIFICATION_DAYS_BEFORE` | ✅ | `3` (dias de antecedência para alertas) |
| `BREVO_API_KEY` | ✅ | `xkeysib-...` (obtido em app.brevo.com) |
| `BREVO_USER` | ✅ | Login SMTP do Brevo (ex: `ad0375001@smtp-brevo.com`) |
| `TWILIO_ACCOUNT_SID` | ❌ | Para WhatsApp (opcional) |
| `TWILIO_AUTH_TOKEN` | ❌ | Para WhatsApp (opcional) |
| `TWILIO_WHATSAPP_FROM` | ❌ | `whatsapp:+14155238886` (sandbox) |
| `RESEND_API_KEY` | ❌ | Legado — não mais utilizado |
| `LOG_LEVEL` | ❌ | `info` (padrão) ou `debug` |

### Como alterar variáveis no Railway

1. Railway Dashboard → projeto → card **genius-5w2h**
2. Aba **Variables** → **Raw Editor**
3. Editar → **Update Variables** → **Deploy**

---

## 12. PROBLEMAS CONHECIDOS E SOLUÇÕES

| # | Problema | Causa Raiz | Solução Aplicada |
|---|---|---|---|
| 1 | Tela branca no frontend | `JSON.parse("undefined")` em dados corrompidos no `localStorage` | `try-catch` + limpeza automática do `localStorage` no `AuthContext` |
| 2 | "Not Found" em rotas como `/login` | Render não redireciona SPA por padrão | Regra `/* → /index.html (Rewrite)` no Render Dashboard |
| 3 | OKR retorna HTTP 500 | `AuditLog` tinha FK dupla conflitante no `schema.prisma` impedindo `prisma db push` | Removidas as relações `activity` e `project` do `AuditLog` |
| 4 | E-mail não enviado | Railway bloqueia portas SMTP (587 e 465) | Migrado de Nodemailer SMTP para **Brevo HTTP API** |
| 5 | Build falha no Render | `recharts` (>500KB) estoura memória disponível no plano gratuito | Substituído por gráficos **SVG puro** sem dependência externa |
| 6 | Login Colaborador/Cliente falha | `seed.js` roda múltiplas vezes com bcrypt, gerando hashes inconsistentes | Recriar usuários via painel Admin com novas senhas |
| 7 | `await import('recharts')` no nível do módulo | Top-level await incompatível com Vite no modo de produção | Substituído por imports estáticos (e depois por SVG) |
| 8 | `undefined` no localStorage crashava o app | Dado antigo do Netlify era a string `"undefined"` (não null) | Verificação explícita `stored !== 'undefined'` antes do `JSON.parse` |

---

## 13. TESTES AUTOMATIZADOS

### Estrutura dos Testes

Todos os testes são **nativos Node.js** (sem Jest instalado), usando apenas `assert` ou lógica própria. Rodam sem `npm install`:

```bash
cd backend
node tests/unit/period.test.js      # 25 testes de período/timezone
node tests/unit/analytics.test.js   # 28 testes de analytics + LGPD
node tests/unit/dashboard.test.js   # 22 testes de KPIs e acesso
node tests/unit/phase3.test.js      # 15 testes OKRs, PDCA, IA
node tests/unit/phase2.test.js      # 18 testes RACI, horas, anexos
node tests/unit/phase1.test.js      # 17 testes riscos, financeiro
node tests/unit/activity.test.js    # 30 testes 5W2H, status, RBAC
node tests/unit/auth.test.js        # JWT, tokens, expiração
```

### Resumo de Cobertura

| Arquivo | Testes | O que cobre |
|---|---|---|
| `period.test.js` | 25 | Cálculo hoje/semana/mês em SP, parseStatusFilter, atividades no range |
| `analytics.test.js` | 28 | Hash IP, sanitização PII, tipos de evento, sessão, retenção, churn, LGPD |
| `dashboard.test.js` | 22 | SPI, CPI, status de projeto, RBAC executivo vs colaborador |
| `phase3.test.js` | 15 | OKR progress, PDCA fases, validação IA 5W2H |
| `phase2.test.js` | 18 | RACI roles, eficiência de horas, validação anexos, documentos |
| `phase1.test.js` | 17 | Cálculo riskLevel, variância custo, @menções, audit |
| `activity.test.js` | 30 | 5W2H completo, transições de status, RBAC, filtros |
| `auth.test.js` | ~10 | Criação JWT, decodificação, expiração |
| **Total** | **~165** | |

---

## 14. GUIA DE MANUTENÇÃO

### Adicionar Novo Campo a uma Atividade

1. **Schema:** Editar `backend/prisma/schema.prisma`
   ```prisma
   model Activity {
     // ... campos existentes
     meuNovoCampo String? @map("meu_novo_campo") // novo
   }
   ```

2. **Deploy:** `git add . && git commit -m "Add meuNovoCampo" && git push origin master`
   - O Railway roda automaticamente `prisma db push` que cria a coluna

3. **Controller:** Em `activity.controller.js`, adicionar em `createActivity` e `updateActivity`:
   ```javascript
   const { ..., meuNovoCampo } = req.body;
   data.meuNovoCampo = meuNovoCampo || null;
   ```

4. **Frontend:** Em `ActivityForm.jsx`, adicionar o campo no formulário.

### Adicionar Nova Rota/Módulo

1. Criar `backend/src/controllers/meumodulo.controller.js`
2. Criar `backend/src/routes/meumodulo.routes.js`
3. Registrar em `backend/src/app.js`:
   ```javascript
   const meuModuloRoutes = require('./routes/meumodulo.routes');
   app.use('/api/meumodulo', meuModuloRoutes);
   ```
4. Adicionar em `frontend/src/services/api.js`:
   ```javascript
   export const meuModuloAPI = {
     list: () => api.get('/meumodulo'),
   };
   ```
5. Criar página em `frontend/src/pages/MeuModuloPage.jsx`
6. Adicionar rota em `frontend/src/App.jsx`
7. Adicionar link na `Sidebar.jsx`

### Trocar Serviço de E-mail

O serviço de e-mail está em `backend/src/services/notification.service.js`, função `sendBrevoEmail()`. Para trocar:

1. Alterar a função para usar o novo serviço (SendGrid, Mailgun, etc.)
2. Atualizar variáveis de ambiente no Railway
3. Testar criando um usuário de teste

### Atualizar Chave da API Brevo

1. Acessar `app.brevo.com` → Configurações → SMTP & API → Chaves API
2. Gerar nova chave
3. No Railway → Variables → alterar `BREVO_API_KEY`
4. Update Variables → Deploy

### Resetar Banco de Dados (CUIDADO!)

```bash
# Via Railway CLI (instalar: npm install -g @railway/cli)
railway login
railway connect postgres
# Executar SQL:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
# Depois o Railway rodará prisma db push automaticamente no próximo deploy
```

### Monitoramento de Saúde

```bash
# Health check
curl https://genius-5w2h-production.up.railway.app/health

# Verificar logs no Railway
# Railway Dashboard → genius-5w2h → Deployments → View Logs

# Verificar taxa de erro
curl -H "Authorization: Bearer <TOKEN_ADMIN>" \
  https://genius-5w2h-production.up.railway.app/metrics
```

---

## 15. GLOSSÁRIO TÉCNICO

| Termo | Definição |
|---|---|
| **5W2H** | Metodologia de gestão: What, Why, Who, Where, How, How Much, When |
| **SPI** | Schedule Performance Index — índice de desempenho de prazo (≥1 = no prazo) |
| **CPI** | Cost Performance Index — índice de desempenho de custo (≥1 = no orçamento) |
| **RACI** | Responsible, Accountable, Consulted, Informed — matriz de responsabilidades |
| **OKR** | Objectives and Key Results — metodologia de metas |
| **PDCA** | Plan, Do, Check, Act — ciclo de melhoria contínua |
| **JWT** | JSON Web Token — padrão de autenticação stateless |
| **RBAC** | Role-Based Access Control — controle de acesso por papel |
| **ORM** | Object-Relational Mapper — mapeamento banco↔código (Prisma) |
| **SPA** | Single Page Application — app de página única (React) |
| **Soft Delete** | Desativar registro sem excluir do banco (is_active = false) |
| **Seed** | Dados iniciais inseridos no banco para demonstração |
| **Cron** | Agendador de tarefas por horário (ex: notificações diárias) |
| **DAU/WAU/MAU** | Daily/Weekly/Monthly Active Users — métricas de engajamento |
| **LGPD** | Lei Geral de Proteção de Dados — regulamentação brasileira de privacidade |
| **PII** | Personally Identifiable Information — dados pessoais identificáveis |
| **Hash** | Transformação unidirecional de dados (senhas com bcrypt, IPs com SHA-256) |

---

*Documento gerado em 2026-05-30 · Genius Consultoria · Genialidade que demonstra resultados*
