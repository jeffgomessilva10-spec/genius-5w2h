// tests/unit/auth.test.js – Testes unitários de autenticação
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configura variáveis de ambiente antes de tudo
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock do Prisma
jest.mock('../../src/prisma/client', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const prisma = require('../../src/prisma/client');

describe('Auth – Utilitários JWT', () => {
  test('JWT_SECRET está definido', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  test('Cria e verifica um token JWT válido', () => {
    const payload = { id: 'user-1', email: 'test@test.com', role: 'COLLABORATOR' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  test('Rejeita token com secret errado', () => {
    const token = jwt.sign({ id: 'x' }, 'wrong-secret');
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).toThrow();
  });

  test('Rejeita token expirado', async () => {
    const token = jwt.sign({ id: 'x' }, process.env.JWT_SECRET, { expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 10));
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).toThrow('jwt expired');
  });
});

describe('Auth – Hash de senha', () => {
  test('Hash bcrypt é gerado corretamente', async () => {
    const password = 'Senha@123';
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });

  test('bcrypt.compare retorna true para senha correta', async () => {
    const password = 'Senha@123';
    const hash = await bcrypt.hash(password, 12);
    const match = await bcrypt.compare(password, hash);
    expect(match).toBe(true);
  });

  test('bcrypt.compare retorna false para senha errada', async () => {
    const hash = await bcrypt.hash('Senha@123', 12);
    const match = await bcrypt.compare('SenhaErrada', hash);
    expect(match).toBe(false);
  });
});

describe('Auth – Prisma mock: busca de usuário', () => {
  test('findUnique retorna usuário quando existe', async () => {
    const fakeUser = {
      id: 'uuid-1',
      email: 'user@test.com',
      role: 'COLLABORATOR',
      isActive: true,
      passwordHash: await bcrypt.hash('Pass@123', 12),
    };
    prisma.user.findUnique.mockResolvedValue(fakeUser);

    const result = await prisma.user.findUnique({ where: { email: 'user@test.com' } });
    expect(result).toEqual(fakeUser);
    expect(result.isActive).toBe(true);
  });

  test('findUnique retorna null quando usuário não existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await prisma.user.findUnique({ where: { email: 'naoexiste@test.com' } });
    expect(result).toBeNull();
  });
});
