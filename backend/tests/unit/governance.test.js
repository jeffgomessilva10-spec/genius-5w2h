'use strict';
// tests/unit/governance.test.js — Governança de Dados, LGPD, Qualidade

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function expect(val) {
  return {
    toBe:            (e) => { if (val !== e) throw new Error(`Expected ${e}, got ${val}`); },
    toBeTruthy:      ()  => { if (!val) throw new Error(`Expected truthy`); },
    toBeFalsy:       ()  => { if (val)  throw new Error(`Expected falsy`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`); },
    toEqual:         (e) => { if (JSON.stringify(val) !== JSON.stringify(e)) throw new Error(`Mismatch`); },
    toContain:       (s) => { if (!val?.includes(s)) throw new Error(`Expected to contain "${s}"`); },
  };
}

// ── Glossário ──────────────────────────────────────────
function validateGlossaryTerm({ term, definition }) {
  const errors = [];
  if (!term?.trim())       errors.push('term obrigatório');
  if (!definition?.trim()) errors.push('definition obrigatória');
  if (term?.length > 100)  errors.push('term muito longo (max 100)');
  return { valid: errors.length === 0, errors };
}

console.log('\n📖 Glossário de Negócios');
test('Termo válido passa validação',    () => expect(validateGlossaryTerm({ term: '5W2H', definition: 'Metodologia de plano de ação' }).valid).toBeTruthy());
test('Sem definição é inválido',       () => expect(validateGlossaryTerm({ term: 'SPI', definition: '' }).valid).toBeFalsy());
test('Sem termo é inválido',           () => expect(validateGlossaryTerm({ term: '', definition: 'Algo' }).valid).toBeFalsy());
test('Termo muito longo falha',        () => expect(validateGlossaryTerm({ term: 'x'.repeat(101), definition: 'ok' }).valid).toBeFalsy());

// ── Políticas de dados ─────────────────────────────────
const POLICY_CATEGORIES = ['Classificação', 'Acesso', 'Retenção', 'Privacidade'];

function validatePolicy({ title, category, content }) {
  const errors = [];
  if (!title?.trim())   errors.push('title obrigatório');
  if (!content?.trim()) errors.push('content obrigatório');
  if (!POLICY_CATEGORIES.includes(category)) errors.push('category inválida');
  return { valid: errors.length === 0, errors };
}

console.log('\n📋 Políticas de Dados');
test('Política válida',               () => expect(validatePolicy({ title: 'Política de Acesso', category: 'Acesso', content: 'Conteúdo da política...' }).valid).toBeTruthy());
test('Categoria inválida rejeitada',  () => expect(validatePolicy({ title: 'X', category: 'Outro', content: 'Y' }).valid).toBeFalsy());
test('Sem conteúdo é inválido',       () => expect(validatePolicy({ title: 'X', category: 'Acesso', content: '' }).valid).toBeFalsy());

// ── Consentimento LGPD ────────────────────────────────
const CONSENT_TYPES = ['terms', 'privacy', 'marketing'];

function validateConsent({ type, accepted, userId }) {
  const errors = [];
  if (!userId)                     errors.push('userId obrigatório');
  if (!CONSENT_TYPES.includes(type)) errors.push('type inválido');
  if (typeof accepted !== 'boolean') errors.push('accepted deve ser boolean');
  return { valid: errors.length === 0, errors };
}

console.log('\n⚖️ Consentimento LGPD');
test('Consentimento aceito é válido',  () => expect(validateConsent({ userId: 'u1', type: 'privacy', accepted: true }).valid).toBeTruthy());
test('Recusa é válida (accepted=false)', () => expect(validateConsent({ userId: 'u1', type: 'marketing', accepted: false }).valid).toBeTruthy());
test('Tipo inválido é rejeitado',      () => expect(validateConsent({ userId: 'u1', type: 'cookies', accepted: true }).valid).toBeFalsy());
test('Sem userId é inválido',          () => expect(validateConsent({ userId: null, type: 'terms', accepted: true }).valid).toBeFalsy());

// ── Qualidade de dados ─────────────────────────────────
function calcCompleteness(activities) {
  if (!activities.length) return 100;
  const required = ['what', 'why', 'who', 'where', 'how'];
  const complete = activities.filter(a => required.every(f => a[f]?.trim()));
  return Math.round((complete.length / activities.length) * 100);
}

function detectAnomalies(activities) {
  const now = new Date();
  return activities.filter(a => {
    const isOverdue   = a.whenEnd && new Date(a.whenEnd) < now && a.status !== 'DONE';
    const isOrphaned  = !a.responsibleId;
    const isMissingDates = !a.whenStart || !a.whenEnd;
    return isOverdue || isOrphaned || isMissingDates;
  });
}

console.log('\n📊 Qualidade de Dados');
const goodActivities = [
  { what: 'Redesign site', why: 'Melhorar UX', who: 'João', where: 'Online', how: 'Sprint' },
  { what: 'CRM setup',     why: 'Vendas',      who: 'Ana',  where: 'ERP',    how: 'Config' },
];
const badActivities = [
  { what: 'Algo',          why: '',             who: 'Maria', where: 'Aqui', how: 'Como' },
  { what: '',              why: 'Razão',        who: 'João',  where: 'Lá',   how: 'Assim' },
];

test('100% completeness com dados completos',  () => expect(calcCompleteness(goodActivities)).toBe(100));
test('0% completeness com dados incompletos',  () => expect(calcCompleteness(badActivities)).toBe(0));
test('Sem atividades = 100%',                  () => expect(calcCompleteness([])).toBe(100));

const anomalyActivities = [
  { id: '1', whenEnd: new Date('2020-01-01'), status: 'PLANNED', responsibleId: null,    whenStart: '2020-01-01' },
  { id: '2', whenEnd: new Date('2030-01-01'), status: 'PLANNED', responsibleId: 'u1',   whenStart: '2025-01-01' },
  { id: '3', whenEnd: null,                   status: 'PLANNED', responsibleId: 'u1',   whenStart: null },
];
test('Detecta atividade vencida',   () => expect(detectAnomalies(anomalyActivities).some(a => a.id === '1')).toBeTruthy());
test('Detecta sem datas',           () => expect(detectAnomalies(anomalyActivities).some(a => a.id === '3')).toBeTruthy());
test('Atividade normal não é anomalia', () => expect(detectAnomalies(anomalyActivities).some(a => a.id === '2')).toBeFalsy());

// ── Exportação de dados LGPD ───────────────────────────
function buildDataExport(user, activities, consents) {
  return {
    exportedAt: new Date().toISOString(),
    legalBasis: 'LGPD Art. 18',
    data: {
      user:       { id: user.id, name: user.name, email: user.email },
      activities: activities.map(a => ({ id: a.id, what: a.what })),
      consents:   consents.map(c => ({ type: c.type, accepted: c.accepted })),
    },
  };
}

console.log('\n📤 Exportação LGPD');
test('Export contém base legal LGPD',  () => expect(buildDataExport({ id: 'u1', name: 'João', email: 'j@e.com' }, [], []).legalBasis).toContain('LGPD'));
test('Export contém dados do usuário', () => expect(buildDataExport({ id: 'u1', name: 'João', email: 'j@e.com' }, [], []).data.user.name).toBe('João'));
test('Export tem timestamp',           () => expect(buildDataExport({ id: 'u1', name: 'X', email: 'x@x.com' }, [], []).exportedAt).toBeTruthy());

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
