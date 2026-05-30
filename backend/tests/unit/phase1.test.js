// tests/unit/phase1.test.js – Testes Fase 1: Riscos, Financeiro, Auditoria
'use strict';

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error(`Expected ${exp}, got ${val}`); },
    toEqual: (exp) => { if (JSON.stringify(val) !== JSON.stringify(exp)) throw new Error(`Expected ${JSON.stringify(exp)}, got ${JSON.stringify(val)}`); },
    toBeTruthy: () => { if (!val) throw new Error(`Expected truthy, got ${val}`); },
    toBeFalsy:  () => { if (val)  throw new Error(`Expected falsy, got ${val}`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`); },
    toBeLessThanOrEqual: (n) => { if (val > n) throw new Error(`Expected <= ${n}, got ${val}`); },
  };
}

// ── Calculadora de nível de risco ──────────────────────
function calcRiskLevel(prob, impact) {
  if (!prob || !impact) return null;
  const score = prob * impact;
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6)  return 'MEDIUM';
  return 'LOW';
}

console.log('\n🔴 Matriz de Riscos');
test('5×5 deve ser CRITICAL', () => expect(calcRiskLevel(5, 5)).toBe('CRITICAL'));
test('4×4 deve ser HIGH',     () => expect(calcRiskLevel(4, 4)).toBe('HIGH'));
test('3×3 deve ser MEDIUM',   () => expect(calcRiskLevel(3, 3)).toBe('MEDIUM'));
test('1×2 deve ser LOW',      () => expect(calcRiskLevel(1, 2)).toBe('LOW'));
test('prob=0 retorna null',   () => expect(calcRiskLevel(0, 5)).toBeFalsy());
test('impact=null retorna null', () => expect(calcRiskLevel(3, null)).toBeFalsy());

// ── Cálculos financeiros ───────────────────────────────
function calcVariance(planned, actual) {
  if (!planned || !actual) return null;
  return ((planned - actual) / planned * 100).toFixed(1);
}
function calcEfficiency(plannedHours, actualHours) {
  if (!plannedHours || !actualHours) return null;
  return (plannedHours / actualHours).toFixed(2);
}

console.log('\n💰 Indicadores Financeiros');
test('Variação positiva (abaixo do orçamento)', () => {
  const v = calcVariance(10000, 8000);
  expect(parseFloat(v)).toBeGreaterThan(0);
});
test('Variação negativa (acima do orçamento)', () => {
  const v = calcVariance(10000, 12000);
  expect(parseFloat(v)).toBeLessThanOrEqual(0);
});
test('Eficiência > 1 = abaixo do planejado em horas', () => {
  const e = calcEfficiency(10, 8);
  expect(parseFloat(e)).toBeGreaterThan(1);
});
test('Eficiência = 1 = exatamente no prazo', () => {
  const e = calcEfficiency(10, 10);
  expect(parseFloat(e)).toBe(1);
});

// ── Validação de comentários ───────────────────────────
function extractMentions(content) {
  return [...content.matchAll(/@([a-zA-ZÀ-ú\s]+?)(?=\s|$|[^a-zA-ZÀ-ú\s])/g)].map(m => m[1].trim());
}

console.log('\n💬 Comentários e @Menções');
test('Extrai menção simples', () => {
  const m = extractMentions('Olá @Jefferson, pode verificar?');
  expect(m[0]).toBe('Jefferson');
});
test('Extrai múltiplas menções', () => {
  const m = extractMentions('@Ana e @Carlos precisam revisar');
  expect(m.length).toBe(2);
});
test('Sem menção retorna array vazio', () => {
  const m = extractMentions('Comentário sem menção');
  expect(m.length).toBe(0);
});

// ── Validação de campos obrigatórios 5W2H ─────────────
function validate5W2H(activity) {
  const required = ['what', 'why', 'who', 'where', 'how'];
  const missing = required.filter(f => !activity[f]?.trim());
  const warnings = [];
  if (!activity.howMuch) warnings.push('Custo estimado não informado');
  if (!activity.whenStart || !activity.whenEnd) warnings.push('Datas não informadas');
  if (activity.what?.length < 10) warnings.push('Descrição muito vaga (< 10 caracteres)');
  return { valid: missing.length === 0, missing, warnings };
}

console.log('\n🔍 Validação 5W2H Ampliada');
test('Atividade completa é válida', () => {
  const r = validate5W2H({ what: 'Reformular o site institucional', why: 'Melhorar conversão', who: 'Equipe Design', where: 'Remoto', how: 'Redesign completo', howMuch: 8500, whenStart: '2025-01-01', whenEnd: '2025-03-31' });
  expect(r.valid).toBeTruthy();
});
test('Campo obrigatório faltando é inválido', () => {
  const r = validate5W2H({ what: 'Teste', why: '', who: 'João', where: 'Online', how: 'Manual', howMuch: null });
  expect(r.valid).toBeFalsy();
});
test('Avisa sobre custo não informado', () => {
  const r = validate5W2H({ what: 'Ação de marketing digital', why: 'Aumentar vendas', who: 'Equipe MKT', where: 'Online', how: 'Campanhas pagas' });
  expect(r.warnings.length).toBeGreaterThan(0);
});

// ── Auditoria ──────────────────────────────────────────
function buildAuditEntry(action, entity, userId, before, after) {
  if (!action || !entity || !userId) throw new Error('Campos obrigatórios faltando');
  return { action, entity, entityId: after?.id || before?.id, userId, before, after, createdAt: new Date() };
}

console.log('\n📋 Log de Auditoria');
test('Cria entrada válida de auditoria', () => {
  const entry = buildAuditEntry('UPDATE', 'Activity', 'user-1', { status: 'PLANNED' }, { id: 'act-1', status: 'IN_PROGRESS' });
  expect(entry.action).toBe('UPDATE');
});
test('Lança erro sem userId', () => {
  let err = null;
  try { buildAuditEntry('DELETE', 'Activity', null, {}, {}); } catch (e) { err = e; }
  expect(err).toBeTruthy();
});

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
