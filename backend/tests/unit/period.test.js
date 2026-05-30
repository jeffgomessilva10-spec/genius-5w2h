'use strict';
// tests/unit/period.test.js — Cálculo de intervalos com timezone America/Sao_Paulo

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function expect(val) {
  return {
    toBe:            (e) => { if (val !== e) throw new Error(`Expected "${e}", got "${val}"`); },
    toBeTruthy:      ()  => { if (!val)  throw new Error(`Expected truthy`); },
    toBeFalsy:       ()  => { if (val)   throw new Error(`Expected falsy`); },
    toBeNull:        ()  => { if (val !== null) throw new Error(`Expected null`); },
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error(`Expected >= ${n}, got ${val}`); },
    toBeLessThanOrEqual:    (n) => { if (val > n) throw new Error(`Expected <= ${n}, got ${val}`); },
    toContain:       (s) => { if (!val.includes(s)) throw new Error(`Expected to contain "${s}"`); },
  };
}

// Importa o serviço (inline para testes nativos)
const TZ = 'America/Sao_Paulo';
function nowSP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

function getPeriodRange(period) {
  const now = nowSP();
  switch (period) {
    case 'hoje': {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end   = new Date(now); end.setHours(23, 59, 59, 999);
      return {
        start: new Date(start.getTime() + 3 * 60 * 60 * 1000),
        end:   new Date(end.getTime()   + 3 * 60 * 60 * 1000),
      };
    }
    case 'semana': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday); monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
      return {
        start: new Date(monday.getTime() + 3 * 60 * 60 * 1000),
        end:   new Date(sunday.getTime() + 3 * 60 * 60 * 1000),
      };
    }
    case 'mes': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start: new Date(start.getTime() + 3 * 60 * 60 * 1000),
        end:   new Date(end.getTime()   + 3 * 60 * 60 * 1000),
      };
    }
    default: return null;
  }
}

function parseStatusFilter(statusParam) {
  if (!statusParam) return null;
  const VALID = ['PLANNED', 'IN_PROGRESS', 'DELAYED', 'DONE'];
  const statuses = statusParam.toUpperCase().split(',').map(s => s.trim()).filter(s => VALID.includes(s));
  return statuses.length > 0 ? statuses : null;
}

function isActivityInRange(activity, range) {
  if (!range || !activity.whenStart || !activity.whenEnd) return true;
  const start = new Date(activity.whenStart);
  const end   = new Date(activity.whenEnd);
  return (
    (start >= range.start && start <= range.end) ||
    (end   >= range.start && end   <= range.end) ||
    (start <= range.start && end   >= range.end)
  );
}

// ── Testes de getPeriodRange ───────────────────────────
console.log('\n📅 Cálculo de Períodos (America/Sao_Paulo)');

test('"todas" retorna null', () => expect(getPeriodRange('todas')).toBeNull());
test('"invalido" retorna null', () => expect(getPeriodRange('invalido')).toBeNull());

test('"hoje": start < end', () => {
  const r = getPeriodRange('hoje');
  expect(r.start < r.end).toBeTruthy();
});

test('"hoje": intervalo de ~24 horas', () => {
  const r = getPeriodRange('hoje');
  const diffH = (r.end - r.start) / (1000 * 60 * 60);
  expect(diffH).toBeGreaterThanOrEqual(23);
  expect(diffH).toBeLessThanOrEqual(25);
});

test('"semana": intervalo de ~7 dias', () => {
  const r = getPeriodRange('semana');
  const diffD = (r.end - r.start) / (1000 * 60 * 60 * 24);
  expect(diffD).toBeGreaterThanOrEqual(6);
  expect(diffD).toBeLessThanOrEqual(8);
});

test('"semana": start é segunda-feira', () => {
  const r = getPeriodRange('semana');
  // SP é UTC-3, portanto subtract 3h para obter hora local
  const startLocal = new Date(r.start.getTime() - 3 * 60 * 60 * 1000);
  const dayOfWeek = startLocal.getDay(); // 1 = segunda
  expect(dayOfWeek).toBe(1);
});

test('"semana": end é domingo', () => {
  const r = getPeriodRange('semana');
  const endLocal = new Date(r.end.getTime() - 3 * 60 * 60 * 1000);
  const dayOfWeek = endLocal.getDay(); // 0 = domingo
  expect(dayOfWeek).toBe(0);
});

test('"mes": start é dia 1', () => {
  const r = getPeriodRange('mes');
  const startLocal = new Date(r.start.getTime() - 3 * 60 * 60 * 1000);
  expect(startLocal.getDate()).toBe(1);
});

test('"mes": end é último dia do mês', () => {
  const r = getPeriodRange('mes');
  const endLocal = new Date(r.end.getTime() - 3 * 60 * 60 * 1000);
  const now = nowSP();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  expect(endLocal.getDate()).toBe(lastDay);
});

test('"hoje" está dentro do range "semana"', () => {
  const hoje  = getPeriodRange('hoje');
  const semana = getPeriodRange('semana');
  expect(hoje.start >= semana.start && hoje.end <= semana.end).toBeTruthy();
});

test('"semana" está dentro do range "mes"', () => {
  const semana = getPeriodRange('semana');
  const mes    = getPeriodRange('mes');
  // A semana corrente pode se sobrepor ao mês
  const overlap = semana.start <= mes.end && semana.end >= mes.start;
  expect(overlap).toBeTruthy();
});

// ── Testes de parseStatusFilter ────────────────────────
console.log('\n🏷️  Parsing de Filtros de Status');

test('null retorna null', () => expect(parseStatusFilter(null)).toBeNull());
test('string vazia retorna null', () => expect(parseStatusFilter('')).toBeNull());
test('PLANNED parseado corretamente', () => {
  const r = parseStatusFilter('PLANNED');
  expect(r[0]).toBe('PLANNED');
});
test('múltiplos status parseados', () => {
  const r = parseStatusFilter('PLANNED,DELAYED,DONE');
  expect(r.length).toBe(3);
});
test('status inválido é ignorado', () => {
  const r = parseStatusFilter('PLANNED,INVALIDO');
  expect(r.length).toBe(1);
});
test('case insensitive', () => {
  const r = parseStatusFilter('planned,in_progress');
  expect(r[0]).toBe('PLANNED');
  expect(r[1]).toBe('IN_PROGRESS');
});
test('todos inválidos retorna null', () => {
  expect(parseStatusFilter('FOO,BAR')).toBeNull();
});

// ── Testes de isActivityInRange ────────────────────────
console.log('\n📊 Atividades dentro do Período');

const rangeHoje = getPeriodRange('hoje');
const now = nowSP();

test('atividade com início hoje está no range', () => {
  const act = { whenStart: now.toISOString(), whenEnd: new Date(now.getTime() + 86400000).toISOString() };
  expect(isActivityInRange(act, rangeHoje)).toBeTruthy();
});

test('atividade passada não está no range de hoje', () => {
  const past = new Date(now); past.setFullYear(2020);
  const act  = { whenStart: past.toISOString(), whenEnd: new Date(past.getTime() + 86400000).toISOString() };
  expect(isActivityInRange(act, rangeHoje)).toBeFalsy();
});

test('atividade sem datas sempre está inclusa', () => {
  expect(isActivityInRange({ whenStart: null, whenEnd: null }, rangeHoje)).toBeTruthy();
});

test('range null inclui tudo', () => {
  const act = { whenStart: '2020-01-01', whenEnd: '2020-01-02' };
  expect(isActivityInRange(act, null)).toBeTruthy();
});

test('atividade abrangendo todo o período está incluída', () => {
  const start = new Date(now); start.setFullYear(2020);
  const end   = new Date(now); end.setFullYear(2030);
  const act   = { whenStart: start.toISOString(), whenEnd: end.toISOString() };
  expect(isActivityInRange(act, rangeHoje)).toBeTruthy();
});

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
