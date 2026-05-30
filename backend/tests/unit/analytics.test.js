'use strict';
// tests/unit/analytics.test.js — Métricas de Uso e Analytics

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
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error(`Expected >= ${n}, got ${val}`); },
    toBeLessThanOrEqual:    (n) => { if (val > n) throw new Error(`Expected <= ${n}, got ${val}`); },
    toBeNull:        ()  => { if (val !== null) throw new Error(`Expected null`); },
    toContain:       (s) => { if (!String(val).includes(s)) throw new Error(`Expected to contain "${s}"`); },
  };
}

// ── Pseudonimização de IP ──────────────────────────────
const crypto = require('crypto');
function hashIP(ip, secret = 'test-secret') {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + secret).digest('hex').substring(0, 16);
}

console.log('\n🔐 Pseudonimização de Dados');
test('IP real não é armazenado',    () => expect(hashIP('192.168.1.1')).toBeTruthy());
test('Hash tem 16 chars',           () => expect(hashIP('10.0.0.1').length).toBe(16));
test('Mesmo IP gera mesmo hash',    () => expect(hashIP('192.168.1.1')).toBe(hashIP('192.168.1.1')));
test('IPs diferentes geram hashes diferentes', () => expect(hashIP('192.168.1.1') !== hashIP('192.168.1.2')).toBeTruthy());
test('IP null retorna null',        () => expect(hashIP(null)).toBeNull());

// ── Sanitização de contexto (sem PII) ─────────────────
function sanitizeContext(ctx) {
  const piiFields = ['email', 'name', 'phone', 'password', 'token'];
  const clean = { ...ctx };
  for (const field of piiFields) delete clean[field];
  return clean;
}

console.log('\n🧹 Sanitização de Contexto');
test('Remove email do contexto',      () => expect(sanitizeContext({ email: 'x@x.com', action: 'click' }).email).toBeFalsy());
test('Mantém campos não-PII',         () => expect(sanitizeContext({ action: 'click', module: 'gantt' }).action).toBe('click'));
test('Remove múltiplos campos PII',   () => {
  const r = sanitizeContext({ email: 'x', name: 'João', phone: '11999', action: 'view' });
  expect(!r.email && !r.name && !r.phone).toBeTruthy();
});
test('Contexto vazio não falha',      () => expect(sanitizeContext({}).email).toBeFalsy());

// ── Validação de tipos de evento ───────────────────────
const VALID_EVENT_TYPES = ['SESSION_START', 'SESSION_END', 'PAGE_VIEW', 'ACTION', 'FEATURE_USE'];

function isValidEventType(type) { return VALID_EVENT_TYPES.includes(type); }

console.log('\n📊 Validação de Eventos');
test('SESSION_START é válido',  () => expect(isValidEventType('SESSION_START')).toBeTruthy());
test('PAGE_VIEW é válido',      () => expect(isValidEventType('PAGE_VIEW')).toBeTruthy());
test('FEATURE_USE é válido',    () => expect(isValidEventType('FEATURE_USE')).toBeTruthy());
test('CLICK é inválido',        () => expect(isValidEventType('CLICK')).toBeFalsy());
test('Tipo vazio é inválido',   () => expect(isValidEventType('')).toBeFalsy());

// ── Cálculo de duração de sessão ──────────────────────
function calcSessionDuration(startMs, endMs) {
  if (!startMs || !endMs || endMs <= startMs) return null;
  return endMs - startMs;
}

function formatDuration(ms) {
  if (!ms) return '0min';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return min > 0 ? `${min}min ${sec}s` : `${sec}s`;
}

console.log('\n⏱️ Duração de Sessão');
test('Duração calculada corretamente',  () => expect(calcSessionDuration(1000, 61000)).toBe(60000));
test('Sessão inválida retorna null',    () => expect(calcSessionDuration(5000, 3000)).toBeNull());
test('Sem timestamps retorna null',     () => expect(calcSessionDuration(null, null)).toBeNull());
test('1 min = "1min 0s"',              () => expect(formatDuration(60000)).toContain('1min'));
test('30s = "30s"',                    () => expect(formatDuration(30000)).toContain('30s'));

// ── Cálculo de retenção ────────────────────────────────
function calcRetentionRate(cohortSize, retained) {
  if (!cohortSize || cohortSize === 0) return 0;
  return +((retained / cohortSize) * 100).toFixed(1);
}

console.log('\n📈 Taxa de Retenção');
test('50% retenção calculada',        () => expect(calcRetentionRate(100, 50)).toBe(50));
test('100% retenção (todos voltaram)', () => expect(calcRetentionRate(10, 10)).toBe(100));
test('0% retenção (ninguém voltou)',   () => expect(calcRetentionRate(10, 0)).toBe(0));
test('Cohort vazio retorna 0',         () => expect(calcRetentionRate(0, 0)).toBe(0));

// ── Cálculo de adoção de funcionalidade ───────────────
function calcAdoptionPct(usersWhoUsed, totalActiveUsers) {
  if (!totalActiveUsers) return 0;
  return Math.min(+((usersWhoUsed / totalActiveUsers) * 100).toFixed(1), 100);
}

console.log('\n🚀 Adoção de Funcionalidades');
test('40% de adoção',             () => expect(calcAdoptionPct(40, 100)).toBe(40));
test('100% máximo',               () => expect(calcAdoptionPct(150, 100)).toBe(100));
test('Sem usuários ativos = 0%',  () => expect(calcAdoptionPct(10, 0)).toBe(0));
test('Gantt por 3 de 10 = 30%',  () => expect(calcAdoptionPct(3, 10)).toBe(30));

// ── Cálculo de churn ───────────────────────────────────
function calcChurnRate(totalUsers, activeUsers) {
  if (!totalUsers) return 0;
  const churned = Math.max(totalUsers - activeUsers, 0);
  return +((churned / totalUsers) * 100).toFixed(1);
}

console.log('\n📉 Churn');
test('30% churn com 7 de 10 inativos', () => expect(calcChurnRate(10, 7)).toBe(30));
test('0% churn se todos ativos',        () => expect(calcChurnRate(10, 10)).toBe(0));
test('100% churn se ninguém ativo',     () => expect(calcChurnRate(10, 0)).toBe(100));
test('Churn não passa de 100%',         () => expect(calcChurnRate(5, -2)).toBeLessThanOrEqual(100));

// ── Consentimento analytics ────────────────────────────
function checkAnalyticsConsent(consentRecord) {
  if (!consentRecord) return false;
  if (consentRecord.type !== 'analytics') return false;
  return consentRecord.accepted === true;
}

console.log('\n✅ Consentimento LGPD Analytics');
test('Consentimento aceito habilita tracking',  () => expect(checkAnalyticsConsent({ type: 'analytics', accepted: true })).toBeTruthy());
test('Consentimento recusado bloqueia tracking', () => expect(checkAnalyticsConsent({ type: 'analytics', accepted: false })).toBeFalsy());
test('Sem consentimento bloqueia tracking',      () => expect(checkAnalyticsConsent(null)).toBeFalsy());
test('Tipo errado de consent não habilita',      () => expect(checkAnalyticsConsent({ type: 'terms', accepted: true })).toBeFalsy());

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
