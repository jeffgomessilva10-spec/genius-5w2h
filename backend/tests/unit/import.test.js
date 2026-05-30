'use strict';
// tests/unit/import.test.js — Testes do importador Excel/CSV

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function expect(val) {
  return {
    toBe:            (e) => { if (val !== e) throw new Error(`Expected "${e}", got "${val}"`); },
    toBeTruthy:      ()  => { if (!val) throw new Error(`Expected truthy, got ${val}`); },
    toBeFalsy:       ()  => { if (val)  throw new Error(`Expected falsy, got ${val}`); },
    toBeNull:        ()  => { if (val !== null) throw new Error(`Expected null`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Expected > ${n}, got ${val}`); },
    toEqual:         (e) => { if (JSON.stringify(val) !== JSON.stringify(e)) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toContain:       (s) => { if (!String(val).includes(s)) throw new Error(`Expected to contain "${s}"`); },
  };
}

// Inline das funções para teste nativo sem require
function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === 'N/A') return null;
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
      return new Date(year, parseInt(m) - 1, parseInt(d));
    }
    const myMatch = trimmed.match(/^(\w{3})[\/\-](\d{2,4})$/i);
    if (myMatch) {
      const months = { jan:0, fev:1, mar:2, abr:3, mai:4, jun:5, jul:6, ago:7, set:8, out:9, nov:10, dez:11 };
      const monthIdx = months[myMatch[1].toLowerCase().substring(0, 3)];
      if (monthIdx !== undefined) {
        const year = parseInt(myMatch[2]) < 100 ? 2000 + parseInt(myMatch[2]) : parseInt(myMatch[2]);
        return new Date(year, monthIdx, 1);
      }
    }
    const weekMatch = trimmed.match(/sem\.?\s*(\d+)/i);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      const start = new Date(new Date().getFullYear(), 0, 1 + (weekNum - 1) * 7);
      return start;
    }
  }
  return null;
}

function mapStatus(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('andamento') || s.includes('progress'))    return 'IN_PROGRESS';
  if (s.includes('atras') || s.includes('delay'))           return 'DELAYED';
  if (s.includes('conclu') || s.includes('done') || s.includes('final')) return 'DONE';
  return 'PLANNED';
}

function isCategory(code) {
  return /^\d+$/.test(code);
}

function deriveParentCode(code) {
  return code.split('.')[0];
}

function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function num(v) {
  if (!v || v === '-') return null;
  const n = parseFloat(String(v).replace(/[R$\s.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ── Parsing de datas ───────────────────────────────
console.log('\n📅 Parsing de Datas do Excel');

test('dd/mm/yyyy parseado corretamente', () => {
  const d = parseExcelDate('15/03/2026');
  expect(d instanceof Date).toBeTruthy();
  expect(d.getDate()).toBe(15);
  expect(d.getMonth()).toBe(2); // março = índice 2
  expect(d.getFullYear()).toBe(2026);
});

test('dd/mm/yy (2 dígitos) parseado', () => {
  const d = parseExcelDate('01/06/26');
  expect(d?.getFullYear()).toBe(2026);
});

test('Mês/Ano "Jun/26" parseado', () => {
  const d = parseExcelDate('Jun/26');
  expect(d?.getMonth()).toBe(5); // junho
  expect(d?.getFullYear()).toBe(2026);
});

test('Semana "Sem. 12" parseada', () => {
  const d = parseExcelDate('Sem. 12');
  expect(d instanceof Date).toBeTruthy();
});

test('"N/A" retorna null', () => {
  expect(parseExcelDate('N/A')).toBeNull();
});

test('null retorna null', () => {
  expect(parseExcelDate(null)).toBeNull();
});

test('string vazia retorna null', () => {
  expect(parseExcelDate('')).toBeNull();
});

test('Date nativa passada diretamente', () => {
  const d = new Date(2026, 5, 15);
  expect(parseExcelDate(d)).toBe(d);
});

// ── Identificação de categoria vs atividade ───────
console.log('\n🏷️  Identificação de Código');

test('"1" é categoria',    () => expect(isCategory('1')).toBeTruthy());
test('"2" é categoria',    () => expect(isCategory('2')).toBeTruthy());
test('"10" é categoria',   () => expect(isCategory('10')).toBeTruthy());
test('"1.1" é atividade',  () => expect(isCategory('1.1')).toBeFalsy());
test('"1.10" é atividade', () => expect(isCategory('1.10')).toBeFalsy());
test('"2.3" é atividade',  () => expect(isCategory('2.3')).toBeFalsy());

test('parentCode de "1.1" é "1"', () => expect(deriveParentCode('1.1')).toBe('1'));
test('parentCode de "2.3" é "2"', () => expect(deriveParentCode('2.3')).toBe('2'));

// ── Mapeamento de status ──────────────────────────
console.log('\n📊 Mapeamento de Status');

test('"Em andamento" → IN_PROGRESS', () => expect(mapStatus('Em andamento')).toBe('IN_PROGRESS'));
test('"In Progress" → IN_PROGRESS',  () => expect(mapStatus('In Progress')).toBe('IN_PROGRESS'));
test('"Atrasado" → DELAYED',         () => expect(mapStatus('Atrasado')).toBe('DELAYED'));
test('"Delayed" → DELAYED',          () => expect(mapStatus('Delayed')).toBe('DELAYED'));
test('"Concluído" → DONE',           () => expect(mapStatus('Concluído')).toBe('DONE'));
test('"Finalizado" → DONE',          () => expect(mapStatus('Finalizado')).toBe('DONE'));
test('"Done" → DONE',               () => expect(mapStatus('Done')).toBe('DONE'));
test('vazio → PLANNED',              () => expect(mapStatus('')).toBe('PLANNED'));
test('"Planejado" → PLANNED',        () => expect(mapStatus('Planejado')).toBe('PLANNED'));

// ── Normalização de valores ───────────────────────
console.log('\n💰 Normalização de Valores');

test('Custo "R$ 8.500,00" parseado', () => expect(num('R$ 8.500,00')).toBe(8500));
test('Custo "1500" parseado',        () => expect(num('1500')).toBe(1500));
test('Custo "-" retorna null',       () => expect(num('-')).toBeNull());
test('Custo null retorna null',      () => expect(num(null)).toBeNull());
test('str() nunca retorna null',     () => expect(str(null)).toBe(''));
test('str() faz trim',              () => expect(str('  texto  ')).toBe('texto'));

// ── Simulação de parsing de linhas ────────────────
console.log('\n🔄 Simulação de Parsing de Linhas');

const mockRows = [
  { code: '1',   what: 'Vendas',                  why: '',                        who: '' },
  { code: '1.1', what: 'Estruturar funil CRM',    why: 'Aumentar conversão',     who: 'Gestor Comercial', whenEnd: '30/04/2026' },
  { code: '1.2', what: 'Criar script de vendas',  why: 'Padronizar abordagem',   who: 'Equipe Vendas', whenEnd: '15/03/2026' },
  { code: '2',   what: 'Marketing Digital',        why: '',                        who: '' },
  { code: '2.1', what: 'Calendário editorial',     why: 'Consistência nas redes', who: 'Social Media', whenEnd: '31/12/2026' },
];

const categories = mockRows.filter(r => isCategory(r.code));
const activities  = mockRows.filter(r => !isCategory(r.code));

test('2 categorias identificadas',    () => expect(categories.length).toBe(2));
test('3 atividades identificadas',    () => expect(activities.length).toBe(3));
test('Atividade 1.1 em categoria 1', () => expect(deriveParentCode('1.1')).toBe('1'));
test('Atividade 2.1 em categoria 2', () => expect(deriveParentCode('2.1')).toBe('2'));

const act11 = activities.find(a => a.code === '1.1');
test('Data de 1.1 parseada corretamente', () => {
  const d = parseExcelDate(act11.whenEnd);
  expect(d?.getDate()).toBe(30);
  expect(d?.getMonth()).toBe(3); // abril
});

// ── Validação de formato de arquivo ───────────────
console.log('\n📁 Validação de Formato');

function isValidFileType(mimetype, filename) {
  const allowed = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'text/csv'];
  const ext = filename.split('.').pop().toLowerCase();
  const allowedExt = ['xlsx', 'xlsm', 'xls', 'csv'];
  return allowed.includes(mimetype) || allowedExt.includes(ext);
}

test('.xlsx é válido',                () => expect(isValidFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'plano.xlsx')).toBeTruthy());
test('.xlsm é válido',                () => expect(isValidFileType('application/octet-stream', 'plano.xlsm')).toBeTruthy());
test('.csv é válido',                 () => expect(isValidFileType('text/csv', 'dados.csv')).toBeTruthy());
test('.pdf é inválido',               () => expect(isValidFileType('application/pdf', 'relatorio.pdf')).toBeFalsy());
test('.docx é inválido',              () => expect(isValidFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc.docx')).toBeFalsy());

console.log(`\n${'─'.repeat(40)}`);
console.log(`✅ ${passed} passando  ❌ ${failed} falhando`);
if (failed > 0) process.exit(1);
