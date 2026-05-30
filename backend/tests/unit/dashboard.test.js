'use strict';
// tests/unit/dashboard.test.js – KPIs dos Dashboards

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function expect(val) {
  return {
    toBe:            (e) => { if (val !== e) throw new Error(`Expected ${e}, got ${val}`); },
    toEqual:         (e) => { if (JSON.stringify(val) !== JSON.stringify(e)) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toBeTruthy:      ()  => { if (!val) throw new Error(`Expected truthy, got ${val}`); },
    toBeFalsy:       ()  => { if (val)  throw new Error(`Expected falsy, got ${val}`); },
    toBeNull:        ()  => { if (val !== null) throw new Error(`Expected null, got ${val}`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`); },
    toBeLessThan:    (n) => { if (val >= n) throw new Error(`Expected < ${n}, got ${val}`); },
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error(`Expected >= ${n}, got ${val}`); },
  };
}

// ── SPI e CPI ─────────────────────────────────────────
function calcSPI(doneCount, totalCount, startDate, endDate) {
  if (!totalCount || !startDate || !endDate) return null;
  const now   = new Date();
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const totalDays   = Math.max((end - start) / 86400000, 1);
  const elapsedDays = Math.min(Math.max((now - start) / 86400000, 0), totalDays);
  const pctTime     = elapsedDays / totalDays;
  const pctDone     = doneCount / totalCount;
  return pctTime > 0 ? +(pctDone / pctTime).toFixed(2) : null;
}

function calcCPI(plannedCost, actualCost, doneCount, totalCount) {
  if (!actualCost || actualCost === 0) return null;
  const earnedValue = plannedCost * (doneCount / Math.max(totalCount, 1));
  return +(earnedValue / actualCost).toFixed(2);
}

function spiStatus(spi) {
  if (spi == null) return 'N/A';
  if (spi >= 1)   return 'OK';
  if (spi >= 0.8) return 'WARN';
  return 'RISK';
}

console.log('\n📊 Dashboard Executivo — SPI e CPI');
test('SPI = 1.0 = exatamente no prazo', () => {
  // 50% feito, 50% do tempo passou
  const past = new Date(); past.setDate(past.getDate() - 30);
  const future = new Date(); future.setDate(future.getDate() + 30);
  const spi = calcSPI(5, 10, past, future);
  expect(spi).toBeGreaterThanOrEqual(0.9);
  expect(spi).toBeGreaterThan(0);
});
test('SPI retorna null sem datas', () => {
  const spi = calcSPI(5, 10, null, null);
  expect(spi).toBeNull();
});
test('CPI > 1 = abaixo do orçamento', () => {
  const cpi = calcCPI(10000, 8000, 5, 10);
  expect(cpi).toBeGreaterThan(1);
});
test('CPI < 1 = acima do orçamento', () => {
  const cpi = calcCPI(10000, 12000, 5, 10);
  expect(cpi).toBeLessThan(1);
});
test('CPI retorna null se sem custo real', () => {
  const cpi = calcCPI(10000, 0, 5, 10);
  expect(cpi).toBeNull();
});
test('SPI OK quando >= 1.0',   () => expect(spiStatus(1.05)).toBe('OK'));
test('SPI WARN quando 0.8–1.0', () => expect(spiStatus(0.85)).toBe('WARN'));
test('SPI RISK quando < 0.8',  () => expect(spiStatus(0.7)).toBe('RISK'));

// ── Cálculo de progresso por projeto ──────────────────
function calcProjectProgress(activities) {
  if (!activities.length) return 0;
  return Math.round(activities.filter(a => a.status === 'DONE').length / activities.length * 100);
}

function calcCostVariance(planned, actual) {
  if (!planned) return null;
  return +((planned - actual) / planned * 100).toFixed(1);
}

console.log('\n📈 Dashboard Operacional — KPIs');
test('Progresso 100% quando todas concluídas', () => {
  const acts = [{ status: 'DONE' }, { status: 'DONE' }];
  expect(calcProjectProgress(acts)).toBe(100);
});
test('Progresso 50% quando metade concluída', () => {
  const acts = [{ status: 'DONE' }, { status: 'PLANNED' }];
  expect(calcProjectProgress(acts)).toBe(50);
});
test('Progresso 0% sem atividades', () => expect(calcProjectProgress([])).toBe(0));
test('Variação positiva = economia de custo', () => {
  expect(calcCostVariance(10000, 8000)).toBeGreaterThan(0);
});
test('Variação negativa = estouro de custo', () => {
  expect(calcCostVariance(10000, 12000)).toBeLessThan(0);
});

// ── Controle de acesso por papel ──────────────────────
function canAccessExecutive(role) {
  return ['ADMIN', 'EXECUTIVE'].includes(role);
}
function canAccessOperational(role) {
  return ['ADMIN', 'COLLABORATOR', 'EXECUTIVE'].includes(role);
}
function canSeeOnlyOwnTasks(role) {
  return role === 'COLLABORATOR';
}

console.log('\n🔐 Controle de Acesso por Papel');
test('ADMIN acessa dashboard executivo',        () => expect(canAccessExecutive('ADMIN')).toBeTruthy());
test('EXECUTIVE acessa dashboard executivo',    () => expect(canAccessExecutive('EXECUTIVE')).toBeTruthy());
test('COLLABORATOR NÃO acessa executivo',       () => expect(canAccessExecutive('COLLABORATOR')).toBeFalsy());
test('CLIENT NÃO acessa executivo',             () => expect(canAccessExecutive('CLIENT')).toBeFalsy());
test('COLLABORATOR acessa operacional',         () => expect(canAccessOperational('COLLABORATOR')).toBeTruthy());
test('COLLABORATOR vê apenas suas atividades', () => expect(canSeeOnlyOwnTasks('COLLABORATOR')).toBeTruthy());
test('ADMIN não é restrito a próprias tasks',   () => expect(canSeeOnlyOwnTasks('ADMIN')).toBeFalsy());

// ── Portfolio de projetos ──────────────────────────────
function calcPortfolioStats(projects) {
  return {
    total:          projects.length,
    onTrack:        projects.filter(p => p.spiStatus === 'OK').length,
    atRisk:         projects.filter(p => p.spiStatus === 'RISK').length,
    avgCompletion:  projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.pctDone, 0) / projects.length)
      : 0,
    totalBudget:    projects.reduce((s, p) => s + p.plannedCost, 0),
  };
}

console.log('\n💼 Portfólio de Projetos');
const mockProjects = [
  { spiStatus: 'OK',   cpiStatus: 'OK',   pctDone: 80, plannedCost: 50000 },
  { spiStatus: 'WARN', cpiStatus: 'WARN',  pctDone: 50, plannedCost: 30000 },
  { spiStatus: 'RISK', cpiStatus: 'RISK',  pctDone: 20, plannedCost: 20000 },
];
test('Portfólio contabiliza 3 projetos', () => expect(calcPortfolioStats(mockProjects).total).toBe(3));
test('1 projeto no prazo', () => expect(calcPortfolioStats(mockProjects).onTrack).toBe(1));
test('1 projeto em risco', () => expect(calcPortfolioStats(mockProjects).atRisk).toBe(1));
test('Média de conclusão = 50%', () => expect(calcPortfolioStats(mockProjects).avgCompletion).toBe(50));
test('Orçamento total = R$ 100.000', () => expect(calcPortfolioStats(mockProjects).totalBudget).toBe(100000));

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
