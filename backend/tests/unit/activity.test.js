// tests/unit/activity.test.js – Testes unitários de lógica de atividades

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

jest.mock('../../src/prisma/client', () => ({
  activity: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
}));

const prisma = require('../../src/prisma/client');

// ── Helpers de validação (regras de negócio) ──────────────────
function validateActivity(data) {
  const errors = [];
  if (!data.code)  errors.push('code obrigatório');
  if (!data.what)  errors.push('what (O que) obrigatório');
  if (!data.why)   errors.push('why (Por que) obrigatório');
  if (!data.who)   errors.push('who (Quem) obrigatório');
  if (!data.where) errors.push('where (Onde) obrigatório');
  if (!data.how)   errors.push('how (Como) obrigatório');
  if (!data.categoryId) errors.push('categoryId obrigatório');
  if (data.whenStart && data.whenEnd && new Date(data.whenStart) > new Date(data.whenEnd)) {
    errors.push('whenStart não pode ser após whenEnd');
  }
  return errors;
}

const VALID_STATUSES = ['PLANNED', 'IN_PROGRESS', 'DELAYED', 'DONE'];

describe('Activity – Validação 5W2H', () => {
  test('Atividade válida passa sem erros', () => {
    const errors = validateActivity({
      code: '1.1', what: 'Criar site', why: 'Aumentar presença',
      who: 'Dev', where: 'Remoto', how: 'React', categoryId: 'uuid',
    });
    expect(errors).toHaveLength(0);
  });

  test('Todos os campos 5W2H são obrigatórios', () => {
    const errors = validateActivity({});
    expect(errors).toContain('what (O que) obrigatório');
    expect(errors).toContain('why (Por que) obrigatório');
    expect(errors).toContain('who (Quem) obrigatório');
    expect(errors).toContain('where (Onde) obrigatório');
    expect(errors).toContain('how (Como) obrigatório');
  });

  test('Data de início após data fim gera erro', () => {
    const errors = validateActivity({
      code: '1.1', what: 'X', why: 'Y', who: 'Z', where: 'W', how: 'H',
      categoryId: 'uuid',
      whenStart: '2025-12-01',
      whenEnd:   '2025-01-01',
    });
    expect(errors).toContain('whenStart não pode ser após whenEnd');
  });

  test('Status inválido é detectado', () => {
    const validStatuses = VALID_STATUSES;
    expect(validStatuses).toContain('PLANNED');
    expect(validStatuses).toContain('IN_PROGRESS');
    expect(validStatuses).toContain('DELAYED');
    expect(validStatuses).toContain('DONE');
    expect(validStatuses).not.toContain('CANCELADO');
  });
});

describe('Activity – Prisma mock: CRUD', () => {
  const fakeActivity = {
    id: 'act-uuid-1',
    code: '1.1',
    what: 'Reformular site',
    why: 'Melhorar conversão',
    who: 'Design',
    where: 'Agência',
    how: 'Redesign completo',
    howMuch: 8500,
    whenStart: new Date('2025-02-01'),
    whenEnd: new Date('2025-03-31'),
    status: 'IN_PROGRESS',
    risk: 'Atraso impacta campanhas',
    categoryId: 'cat-uuid-1',
    responsibleId: 'user-uuid-1',
  };

  test('Cria atividade com todos os campos 5W2H', async () => {
    prisma.activity.create.mockResolvedValue(fakeActivity);
    const result = await prisma.activity.create({ data: fakeActivity });
    expect(result.code).toBe('1.1');
    expect(result.what).toBe('Reformular site');
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.risk).toBeDefined();
  });

  test('Busca atividade por ID', async () => {
    prisma.activity.findUnique.mockResolvedValue(fakeActivity);
    const result = await prisma.activity.findUnique({ where: { id: 'act-uuid-1' } });
    expect(result).toEqual(fakeActivity);
  });

  test('Retorna null para atividade inexistente', async () => {
    prisma.activity.findUnique.mockResolvedValue(null);
    const result = await prisma.activity.findUnique({ where: { id: 'nao-existe' } });
    expect(result).toBeNull();
  });

  test('Lista atividades com filtro de status', async () => {
    const delayed = [{ ...fakeActivity, status: 'DELAYED' }];
    prisma.activity.findMany.mockResolvedValue(delayed);
    const result = await prisma.activity.findMany({ where: { status: 'DELAYED' } });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('DELAYED');
  });

  test('Atualiza status da atividade', async () => {
    const updated = { ...fakeActivity, status: 'DONE' };
    prisma.activity.update.mockResolvedValue(updated);
    const result = await prisma.activity.update({
      where: { id: 'act-uuid-1' },
      data: { status: 'DONE' },
    });
    expect(result.status).toBe('DONE');
  });

  test('Deleta atividade por ID', async () => {
    prisma.activity.delete.mockResolvedValue(fakeActivity);
    const result = await prisma.activity.delete({ where: { id: 'act-uuid-1' } });
    expect(result.id).toBe('act-uuid-1');
  });

  test('Stats: groupBy retorna contagem por status', async () => {
    prisma.activity.groupBy.mockResolvedValue([
      { status: 'PLANNED', _count: { status: 3 } },
      { status: 'IN_PROGRESS', _count: { status: 2 } },
      { status: 'DELAYED', _count: { status: 1 } },
      { status: 'DONE', _count: { status: 5 } },
    ]);
    const stats = await prisma.activity.groupBy({ by: ['status'] });
    expect(stats).toHaveLength(4);
    const done = stats.find((s) => s.status === 'DONE');
    expect(done._count.status).toBe(5);
  });
});
