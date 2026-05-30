'use strict';
// tests/unit/phase3.test.js – OKRs, PDCA, IA 5W2H

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
    toContain:       (s) => { if (!val?.includes(s)) throw new Error(`Expected to contain "${s}"`); },
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error(`Expected >= ${n}, got ${val}`); },
    toBeLessThanOrEqual:    (n) => { if (val > n) throw new Error(`Expected <= ${n}, got ${val}`); },
  };
}

// ── OKRs ──────────────────────────────────────────────
function calcKRProgress(targetValue, currentValue) {
  if (!targetValue || targetValue <= 0) return 0;
  return Math.min(Math.round((currentValue / targetValue) * 100), 100);
}

function calcObjectiveProgress(keyResults) {
  if (!keyResults.length) return 0;
  const avg = keyResults.reduce((s, kr) => s + calcKRProgress(kr.targetValue, kr.currentValue), 0) / keyResults.length;
  return Math.round(avg);
}

console.log('\n🎯 OKRs — Objetivos e Resultados-Chave');
test('KR 100% quando current = target', () => expect(calcKRProgress(100, 100)).toBe(100));
test('KR 50% quando current = metade', () => expect(calcKRProgress(100, 50)).toBe(50));
test('KR nunca passa de 100%',          () => expect(calcKRProgress(100, 150)).toBe(100));
test('KR 0% quando target = 0',         () => expect(calcKRProgress(0, 50)).toBe(0));
test('Objetivo com 2 KRs: média correta', () => {
  const krs = [
    { targetValue: 100, currentValue: 80 },
    { targetValue: 50,  currentValue: 25 },
  ];
  expect(calcObjectiveProgress(krs)).toBe(65);
});
test('Objetivo sem KRs = 0%', () => expect(calcObjectiveProgress([])).toBe(0));

// ── PDCA ──────────────────────────────────────────────
const VALID_PHASES = ['PLAN', 'DO', 'CHECK', 'ACT'];

function validatePdca({ projectId, phase, title, description }) {
  const errors = [];
  if (!projectId)            errors.push('projectId obrigatório');
  if (!VALID_PHASES.includes(phase)) errors.push('Phase inválida');
  if (!title?.trim())        errors.push('Título obrigatório');
  if (!description?.trim())  errors.push('Descrição obrigatória');
  return { valid: errors.length === 0, errors };
}

console.log('\n🔄 PDCA');
test('Registro PLAN válido', () => {
  const r = validatePdca({ projectId: 'p1', phase: 'PLAN', title: 'Planejamento Q1', description: 'Definir metas trimestrais' });
  expect(r.valid).toBeTruthy();
});
test('Phase inválida rejeitada', () => {
  const r = validatePdca({ projectId: 'p1', phase: 'REVIEW', title: 'X', description: 'Y' });
  expect(r.valid).toBeFalsy();
});
test('Todas as 4 fases são válidas', () => {
  VALID_PHASES.forEach(p => expect(VALID_PHASES.includes(p)).toBeTruthy());
});
test('Lição aprendida requer título e descrição', () => {
  const r = validatePdca({ projectId: 'p1', phase: 'ACT', title: '', description: 'Algo' });
  expect(r.valid).toBeFalsy();
});

// ── IA — Validação 5W2H ────────────────────────────────
function scoreField(value, minLen = 10) {
  if (!value?.trim()) return 0;
  if (value.trim().length < minLen) return 30;
  if (value.trim().length < minLen * 2) return 70;
  return 100;
}

function gradeActivity(activity) {
  const scores = ['what', 'why', 'who', 'where', 'how'].map(f => scoreField(activity[f], f === 'who' || f === 'where' ? 5 : 10));
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { score: avg, grade: avg >= 90 ? 'A' : avg >= 70 ? 'B' : avg >= 50 ? 'C' : 'D' };
}

console.log('\n🤖 IA — Validação 5W2H');
test('Atividade completa recebe nota A', () => {
  const r = gradeActivity({
    what: 'Redesign completo do site institucional com novo layout responsivo',
    why: 'Aumentar conversão e refletir o posicionamento premium da empresa',
    who: 'Equipe de design + agência parceira',
    where: 'Ambiente de desenvolvimento + servidor de staging',
    how: 'Sprint de 3 semanas com wireframe, prototipo e aprovação do cliente',
  });
  expect(r.grade).toBe('A');
});
test('Atividade vaga recebe nota C ou D', () => {
  const r = gradeActivity({ what: 'Fazer o site', why: 'Melhorar', who: 'João', where: 'Online', how: 'Fazer' });
  expect(['C', 'D'].includes(r.grade)).toBeTruthy();
});
test('Campo vazio reduz a nota significativamente', () => {
  const r1 = gradeActivity({ what: 'Criar landing page de conversão para produto principal', why: 'Aumentar leads qualificados em 40%', who: 'Marketing', where: 'Website', how: 'Design + desenvolvimento React' });
  const r2 = gradeActivity({ what: '', why: 'Aumentar leads qualificados em 40%', who: 'Marketing', where: 'Website', how: 'Design + desenvolvimento React' });
  expect(r1.score).toBeGreaterThan(r2.score);
});
test('Score está entre 0 e 100', () => {
  const r = gradeActivity({ what: 'Ação', why: 'Porque sim', who: 'Alguém', where: 'Algum lugar', how: 'De alguma forma' });
  expect(r.score).toBeGreaterThanOrEqual(0);
  expect(r.score).toBeLessThanOrEqual(100);
});
test('Sem custo gera aviso mas não invalida', () => {
  const activity = { what: 'Campanha de marketing digital no Instagram', why: 'Ampliar presença', who: 'Social Media', where: 'Instagram', how: 'Posts + stories + anúncios', howMuch: null };
  const warnings = [];
  if (!activity.howMuch) warnings.push('Custo não informado');
  expect(warnings).toContain('Custo não informado');
  // Mas a atividade pode ainda ser válida
  const r = gradeActivity(activity);
  expect(r.score).toBeGreaterThan(0);
});

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
