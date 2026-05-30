// tests/integration/api.test.js – Testes de integração dos endpoints
// Usa supertest + mocks do Prisma para simular banco de dados

process.env.JWT_SECRET = 'integration-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Mock do Prisma ───────────────────────────────────────────
jest.mock('../../src/prisma/client', () => {
  const mockUsers = new Map();
  const mockProjects = new Map();
  const mockActivities = new Map();
  const mockNotifications = new Map();

  return {
    user: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(where.id
          ? mockUsers.get(where.id) || null
          : [...mockUsers.values()].find((u) => u.email === where.email) || null
        )
      ),
      create: jest.fn(({ data }) => {
        const user = { id: `user-${Date.now()}`, ...data, isActive: true, createdAt: new Date() };
        mockUsers.set(user.id, user);
        return Promise.resolve(user);
      }),
      findMany: jest.fn(() => Promise.resolve([...mockUsers.values()])),
      update: jest.fn(({ where, data }) => {
        const user = mockUsers.get(where.id);
        if (!user) throw { code: 'P2025' };
        const updated = { ...user, ...data };
        mockUsers.set(where.id, updated);
        return Promise.resolve(updated);
      }),
    },
    project: {
      findMany: jest.fn(() => Promise.resolve([...mockProjects.values()])),
      findUnique: jest.fn(({ where }) => Promise.resolve(mockProjects.get(where.id) || null)),
      create: jest.fn(({ data }) => {
        const project = { id: `proj-${Date.now()}`, ...data, isActive: true, createdAt: new Date() };
        mockProjects.set(project.id, project);
        return Promise.resolve(project);
      }),
      update: jest.fn(({ where, data }) => {
        const proj = mockProjects.get(where.id);
        if (!proj) throw { code: 'P2025' };
        const updated = { ...proj, ...data };
        mockProjects.set(where.id, updated);
        return Promise.resolve(updated);
      }),
    },
    activity: {
      findMany: jest.fn(() => Promise.resolve([...mockActivities.values()])),
      findUnique: jest.fn(({ where }) => Promise.resolve(mockActivities.get(where.id) || null)),
      create: jest.fn(({ data }) => {
        const act = { id: `act-${Date.now()}`, ...data, createdAt: new Date() };
        mockActivities.set(act.id, act);
        return Promise.resolve(act);
      }),
      update: jest.fn(({ where, data }) => {
        const act = mockActivities.get(where.id);
        if (!act) throw { code: 'P2025' };
        const updated = { ...act, ...data };
        mockActivities.set(where.id, updated);
        return Promise.resolve(updated);
      }),
      delete: jest.fn(({ where }) => {
        const act = mockActivities.get(where.id);
        if (!act) throw { code: 'P2025' };
        mockActivities.delete(where.id);
        return Promise.resolve(act);
      }),
      groupBy: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
    },
    notification: {
      findMany: jest.fn(() => Promise.resolve([...mockNotifications.values()])),
      count: jest.fn(() => Promise.resolve(0)),
      create: jest.fn(({ data }) => {
        const n = { id: `notif-${Date.now()}`, ...data, createdAt: new Date() };
        mockNotifications.set(n.id, n);
        return Promise.resolve(n);
      }),
      update: jest.fn(({ where, data }) => {
        const n = mockNotifications.get(where.id);
        const updated = { ...n, ...data };
        mockNotifications.set(where.id, updated);
        return Promise.resolve(updated);
      }),
      updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
    },
    category: {
      findMany: jest.fn(() => Promise.resolve([])),
      findUnique: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(({ data }) => Promise.resolve({ id: `cat-${Date.now()}`, ...data })),
    },
    projectUser: {
      findUnique: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(({ data }) => Promise.resolve(data)),
      delete: jest.fn(() => Promise.resolve()),
      findMany: jest.fn(() => Promise.resolve([])),
    },
  };
});

const app = require('../../src/app');
const prisma = require('../../src/prisma/client');

// ── Helpers ──────────────────────────────────────────────────
async function makeUser(role = 'COLLABORATOR') {
  const hash = await bcrypt.hash('Test@123', 12);
  const user = { id: `user-${role}-${Date.now()}`, name: `Test ${role}`, email: `${role.toLowerCase()}-${Date.now()}@test.com`, passwordHash: hash, role, isActive: true };
  prisma.user.findUnique.mockImplementation(({ where }) =>
    Promise.resolve(where.id === user.id || where.email === user.email ? user : null)
  );
  return user;
}

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// ════════════════════════════════════════════════════════════
describe('GET /health', () => {
  test('Retorna status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  let user;

  beforeEach(async () => {
    user = await makeUser('COLLABORATOR');
  });

  test('Login com credenciais válidas retorna token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('COLLABORATOR');
  });

  test('Login com senha errada retorna 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'SenhaErrada' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciais inválidas.');
  });

  test('Login sem e-mail retorna 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Test@123' });

    expect(res.status).toBe(422);
  });

  test('Login com usuário inexistente retorna 401', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@test.com', password: 'Test@123' });

    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════
describe('GET /api/auth/me', () => {
  test('Retorna dados do usuário autenticado', async () => {
    const user = await makeUser('COLLABORATOR');
    const token = tokenFor(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  test('Sem token retorna 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('Token inválido retorna 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════
describe('Projetos – /api/projects', () => {
  let collaborator, adminUser;

  beforeEach(async () => {
    collaborator = await makeUser('COLLABORATOR');
    adminUser = await makeUser('ADMIN');
  });

  test('GET /api/projects retorna lista para colaborador', async () => {
    prisma.project.findMany.mockResolvedValue([
      { id: 'p1', name: 'Projeto Teste', isActive: true, categories: [], _count: { categories: 0 } },
    ]);
    const token = tokenFor(collaborator);
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
  });

  test('POST /api/projects cria projeto (colaborador)', async () => {
    const token = tokenFor(collaborator);
    prisma.project.create.mockResolvedValue({
      id: 'new-proj', name: 'Novo Projeto', isActive: true,
    });

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Novo Projeto', description: 'Teste' });

    expect(res.status).toBe(201);
    expect(res.body.project.name).toBe('Novo Projeto');
  });

  test('POST /api/projects sem nome retorna 422', async () => {
    const token = tokenFor(collaborator);
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Sem nome' });

    expect(res.status).toBe(422);
  });

  test('Cliente não pode criar projeto (403)', async () => {
    const client = await makeUser('CLIENT');
    const token = tokenFor(client);

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tentativa' });

    expect(res.status).toBe(403);
  });
});

// ════════════════════════════════════════════════════════════
describe('Atividades – /api/activities', () => {
  let collaborator;

  beforeEach(async () => {
    collaborator = await makeUser('COLLABORATOR');
  });

  const validActivity = {
    code: '1.1',
    what: 'Criar landing page',
    why: 'Aumentar conversões',
    who: 'Dev Frontend',
    where: 'Remoto',
    how: 'React + Tailwind',
    howMuch: 3500,
    whenStart: '2025-03-01',
    whenEnd: '2025-04-30',
    status: 'PLANNED',
    risk: 'Atraso impacta lançamento',
    categoryId: 'cat-uuid-existente',
  };

  test('POST /api/activities cria atividade com todos os 5W2H', async () => {
    const token = tokenFor(collaborator);
    prisma.activity.create.mockResolvedValue({ id: 'act-1', ...validActivity });

    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${token}`)
      .send(validActivity);

    expect(res.status).toBe(201);
    expect(res.body.activity.what).toBe('Criar landing page');
    expect(res.body.activity.code).toBe('1.1');
  });

  test('POST sem campo obrigatório retorna 422', async () => {
    const token = tokenFor(collaborator);
    const { what, ...withoutWhat } = validActivity;

    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${token}`)
      .send(withoutWhat);

    expect(res.status).toBe(422);
  });

  test('GET /api/activities retorna lista', async () => {
    const token = tokenFor(collaborator);
    prisma.activity.findMany.mockResolvedValue([{ id: 'act-1', ...validActivity }]);

    const res = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.activities)).toBe(true);
  });

  test('GET /api/activities?status=DELAYED filtra por status', async () => {
    const token = tokenFor(collaborator);
    prisma.activity.findMany.mockResolvedValue([
      { id: 'act-2', ...validActivity, status: 'DELAYED' },
    ]);

    const res = await request(app)
      .get('/api/activities?status=DELAYED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test('PUT /api/activities/:id atualiza status', async () => {
    const token = tokenFor(collaborator);
    const existing = { id: 'act-1', ...validActivity, status: 'PLANNED' };
    prisma.activity.findUnique.mockResolvedValue(existing);
    prisma.activity.update.mockResolvedValue({ ...existing, status: 'IN_PROGRESS' });

    const res = await request(app)
      .put('/api/activities/act-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
  });

  test('DELETE /api/activities/:id remove atividade', async () => {
    const token = tokenFor(collaborator);
    prisma.activity.delete.mockResolvedValue({ id: 'act-1' });

    const res = await request(app)
      .delete('/api/activities/act-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  test('Cliente não pode criar atividade (403)', async () => {
    const client = await makeUser('CLIENT');
    const token = tokenFor(client);

    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${token}`)
      .send(validActivity);

    expect(res.status).toBe(403);
  });
});

// ════════════════════════════════════════════════════════════
describe('Notificações – /api/notifications', () => {
  test('GET /api/notifications retorna notificações do usuário', async () => {
    const user = await makeUser('COLLABORATOR');
    const token = tokenFor(user);
    prisma.notification.findMany.mockResolvedValue([
      { id: 'n1', title: 'Prazo próximo', message: 'Atividade X vence em 2 dias', isRead: false },
    ]);
    prisma.notification.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toBeDefined();
    expect(res.body.unreadCount).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════
describe('Segurança – Rotas protegidas', () => {
  test('Rota protegida sem token retorna 401', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('Rota inexistente retorna 404', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
  });
});
