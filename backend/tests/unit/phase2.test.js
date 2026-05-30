'use strict';
// tests/unit/phase2.test.js – Testes Fase 2: RACI, Horas, Anexos, Documentos

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function expect(val) {
  return {
    toBe:            (e) => { if (val !== e) throw new Error(`Expected ${e}, got ${val}`); },
    toEqual:         (e) => { if (JSON.stringify(val) !== JSON.stringify(e)) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toBeTruthy:      ()  => { if (!val) throw new Error(`Expected truthy`); },
    toBeFalsy:       ()  => { if (val)  throw new Error(`Expected falsy`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`); },
    toContain:       (s) => { if (!val.includes(s)) throw new Error(`Expected to contain "${s}"`); },
    toHaveLength:    (n) => { if (val.length !== n) throw new Error(`Expected length ${n}, got ${val.length}`); },
  };
}

// ── RACI ──────────────────────────────────────────────
const VALID_RACI_ROLES = ['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'];

function validateRaciRole(role) {
  return VALID_RACI_ROLES.includes(role);
}

function buildRaciMatrix(entries) {
  const matrix = {};
  for (const role of VALID_RACI_ROLES) matrix[role] = [];
  for (const e of entries) {
    if (matrix[e.role]) matrix[e.role].push(e.user);
  }
  return matrix;
}

console.log('\n🎯 Matriz RACI');
test('Papel RESPONSIBLE é válido',  () => expect(validateRaciRole('RESPONSIBLE')).toBeTruthy());
test('Papel ACCOUNTABLE é válido',  () => expect(validateRaciRole('ACCOUNTABLE')).toBeTruthy());
test('Papel INVALIDO é rejeitado',  () => expect(validateRaciRole('OWNER')).toBeFalsy());
test('Matriz agrupa por papel', () => {
  const entries = [
    { role: 'RESPONSIBLE', user: { name: 'Ana' } },
    { role: 'ACCOUNTABLE', user: { name: 'João' } },
    { role: 'INFORMED',    user: { name: 'Maria' } },
  ];
  const m = buildRaciMatrix(entries);
  expect(m.RESPONSIBLE).toHaveLength(1);
  expect(m.ACCOUNTABLE).toHaveLength(1);
  expect(m.CONSULTED).toHaveLength(0);
});
test('Papel duplicado sobrescreve (upsert)', () => {
  const entries = [
    { activityId: 'a1', userId: 'u1', role: 'RESPONSIBLE' },
    { activityId: 'a1', userId: 'u1', role: 'INFORMED' },
  ];
  // Simula upsert: mantém o último
  const result = entries.reduce((map, e) => {
    map[`${e.activityId}_${e.userId}`] = e;
    return map;
  }, {});
  expect(Object.values(result)[0].role).toBe('INFORMED');
});

// ── Apontamento de Horas ───────────────────────────────
function calcEfficiency(planned, actual) {
  if (!planned || !actual) return null;
  return Number((planned / actual).toFixed(2));
}

function calcVarianceHours(planned, actual) {
  return Number((planned - actual).toFixed(2));
}

function isOverBudget(planned, actual) {
  return actual > planned;
}

console.log('\n⏱ Apontamento de Horas');
test('Eficiência > 1 = abaixo do planejado', () => {
  expect(calcEfficiency(10, 8)).toBeGreaterThan(1);
});
test('Eficiência = 1 = dentro do prazo', () => {
  expect(calcEfficiency(10, 10)).toBe(1);
});
test('Variação positiva = sobrou horas', () => {
  expect(calcVarianceHours(10, 7)).toBeGreaterThan(0);
});
test('Detecta excesso de horas', () => {
  expect(isOverBudget(8, 10)).toBeTruthy();
});
test('Horas negativas são inválidas', () => {
  const valid = (h) => h > 0;
  expect(valid(-2)).toBeFalsy();
  expect(valid(2)).toBeTruthy();
});

// ── Anexos ─────────────────────────────────────────────
const VALID_TYPES = ['IMAGE', 'DOCUMENT', 'LINK', 'VIDEO'];

function validateAttachment({ name, url, type }) {
  const errors = [];
  if (!name?.trim())          errors.push('Nome obrigatório');
  if (!url?.trim())           errors.push('URL obrigatória');
  if (!url?.startsWith('http')) errors.push('URL inválida');
  if (!VALID_TYPES.includes(type)) errors.push('Tipo inválido');
  return { valid: errors.length === 0, errors };
}

console.log('\n📎 Anexos e Evidências');
test('Anexo válido passa validação', () => {
  const r = validateAttachment({ name: 'Foto entrega', url: 'https://drive.google.com/file', type: 'IMAGE' });
  expect(r.valid).toBeTruthy();
});
test('Anexo sem nome é inválido', () => {
  const r = validateAttachment({ name: '', url: 'https://example.com', type: 'DOCUMENT' });
  expect(r.valid).toBeFalsy();
});
test('URL sem http é inválida', () => {
  const r = validateAttachment({ name: 'Doc', url: 'drive.google.com', type: 'LINK' });
  expect(r.errors).toContain('URL inválida');
});
test('Tipo VIDEO é aceito', () => {
  const r = validateAttachment({ name: 'Vídeo', url: 'https://youtube.com/watch?v=x', type: 'VIDEO' });
  expect(r.valid).toBeTruthy();
});

// ── Documentos ─────────────────────────────────────────
function validateDocument({ projectId, name, url, version }) {
  const errors = [];
  if (!projectId)           errors.push('projectId obrigatório');
  if (!name?.trim())        errors.push('Nome obrigatório');
  if (!url?.startsWith('http')) errors.push('URL inválida');
  if (version && !/^\d+\.\d+$/.test(version)) errors.push('Versão inválida (use X.Y)');
  return { valid: errors.length === 0, errors };
}

console.log('\n📁 Repositório de Documentos');
test('Documento válido passa validação', () => {
  const r = validateDocument({ projectId: 'p1', name: 'Contrato', url: 'https://docs.google.com', version: '1.0' });
  expect(r.valid).toBeTruthy();
});
test('Versão no formato correto', () => {
  const r = validateDocument({ projectId: 'p1', name: 'Ata', url: 'https://docs.google.com', version: '2.3' });
  expect(r.valid).toBeTruthy();
});
test('Versão em formato inválido gera erro', () => {
  const r = validateDocument({ projectId: 'p1', name: 'Ata', url: 'https://docs.google.com', version: 'v2' });
  expect(r.errors).toContain('Versão inválida (use X.Y)');
});
test('projectId obrigatório', () => {
  const r = validateDocument({ name: 'Relatório', url: 'https://docs.google.com' });
  expect(r.valid).toBeFalsy();
});

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
