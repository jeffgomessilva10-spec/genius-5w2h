/**
 * excelParser.js — Parser de Excel no browser (client-side).
 * Usa a biblioteca xlsx para ler .xlsx/.xlsm/.xls/.csv sem backend.
 * Mesma lógica do backend/src/services/excel.service.js
 */
import * as XLSX from 'xlsx';

const CAT_COLORS = [
  '#F04E00','#2563EB','#7C3AED','#16A34A',
  '#D97706','#DC2626','#0891B2','#65A30D',
];

const MONTH_MAP = {
  jan:0, fev:1, mar:2, abr:3, mai:4, jun:5,
  jul:6, ago:7, set:8, out:9, nov:10, dez:11,
};

function str(v) {
  if (v == null) return '';
  return String(v).trim().replace(/\r?\n/g, ' ');
}

function num(v) {
  if (!v || v === '-') return null;
  const n = parseFloat(String(v).replace(/[R$\s\.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function mapStatus(s) {
  const t = str(s).toLowerCase();
  if (t.includes('andamento') || t.includes('progress')) return 'IN_PROGRESS';
  if (t.includes('atras')     || t.includes('delay'))    return 'DELAYED';
  if (t.includes('conclu')    || t.includes('finaliz') || t.includes('done')) return 'DONE';
  return 'PLANNED';
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number' && val > 40000) {
    try { return XLSX.SSF.parse_date_code ? new Date(XLSX.SSF.parse_date_code(val).y, XLSX.SSF.parse_date_code(val).m-1, XLSX.SSF.parse_date_code(val).d) : null; } catch { return null; }
  }
  const s = String(val).trim();
  if (!s || s === '-') return null;
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const y = parseInt(dmy[3]);
    return new Date(y < 100 ? 2000+y : y, +dmy[2]-1, +dmy[1]);
  }
  const wk = s.match(/sem\.?\s*(\d+)/i);
  if (wk) {
    const n = parseInt(wk[1]);
    return new Date(new Date().getFullYear(), 0, 1 + (n-1)*7);
  }
  return null;
}

function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z20');
  const kw = ['what','o que','o quê','why','por que','who','quem','how','como','#'];
  for (let R = range.s.r; R <= Math.min(range.e.r, 15); R++) {
    let hits = 0;
    for (let C = range.s.c; C <= Math.min(range.e.c, 20); C++) {
      const cell = sheet[XLSX.utils.encode_cell({ r:R, c:C })];
      if (cell && kw.some(k => str(cell.v).toLowerCase().includes(k))) hits++;
    }
    if (hits >= 2) return R;
  }
  return 0;
}

function buildDateColumnMap(sheet, headerRow) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:AZ1');
  const dateMap = {};
  let currentMonth = null;
  const year = new Date().getFullYear();
  for (let mRow = Math.max(0, headerRow-2); mRow < headerRow; mRow++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = sheet[XLSX.utils.encode_cell({ r:mRow, c:C })];
      if (!cell) continue;
      const v = str(cell.v).toLowerCase().substring(0,3);
      if (MONTH_MAP[v] !== undefined) currentMonth = new Date(year, MONTH_MAP[v], 1);
      const wk = str(cell.v).match(/sem\.?\s*(\d+)/i);
      if (wk && currentMonth) {
        const n = parseInt(wk[1]);
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1+(n-1)*7);
        const end   = new Date(start); end.setDate(start.getDate()+6);
        dateMap[C] = { start, end };
      }
    }
  }
  return dateMap;
}

function mapColumns(sheet, headerRow) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
  const m = {};
  const patterns = {
    code:     /^#$|^cod/i,
    what:     /what|o\s*qu[eê]/i,
    why:      /why|por\s*qu[eê]/i,
    who:      /who|quem/i,
    where:    /where|onde/i,
    how:      /^how$|^como/i,
    howMuch:  /how\s*much|quanto|custo|valor|r\$/i,
    whenStart:/when\s*start|data\s*in[íi]c|início|start/i,
    whenEnd:  /when\s*end|data\s*f[ií]n|prazo|t[eé]rmino|end|^when$/i,
    status:   /status|situa/i,
    risk:     /risco|risk/i,
  };
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = sheet[XLSX.utils.encode_cell({ r:headerRow, c:C })];
    if (!cell) continue;
    const h = str(cell.v).toLowerCase();
    for (const [key, pat] of Object.entries(patterns)) {
      if (!m[key] && pat.test(h)) { m[key] = C; break; }
    }
  }
  if (m.code === undefined) m.code = 0;
  return m;
}

/**
 * Lê um File/ArrayBuffer e retorna { projectName, categories[], activities[] }
 */
export async function parseExcelFile(file, projectNameOverride = '') {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Escolhe a aba certa
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    if (/5w|plano|ação|atividade|matriz/i.test(name)) { sheetName = name; break; }
  }
  const sheet = workbook.Sheets[sheetName];
  const projectName = projectNameOverride || sheetName;

  const headerRow = findHeaderRow(sheet);
  const colMap    = mapColumns(sheet, headerRow);
  const dateMap   = buildDateColumnMap(sheet, headerRow);
  const range     = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');

  const categories = [];
  const activities  = [];
  let colorIdx = 0;

  for (let R = headerRow + 1; R <= range.e.r; R++) {
    const cell = (col) => {
      if (col === undefined) return null;
      const c = sheet[XLSX.utils.encode_cell({ r:R, c:col })];
      return c ? c.v : null;
    };
    const code = str(cell(colMap.code));
    if (!code) continue;

    const whatVal  = str(cell(colMap.what));
    const whyVal   = str(cell(colMap.why));
    const whoVal   = str(cell(colMap.who));
    const whereVal = str(cell(colMap.where));
    const howVal   = str(cell(colMap.how));
    const hm       = num(cell(colMap.howMuch));
    const statusV  = str(cell(colMap.status));
    const riskV    = str(cell(colMap.risk));

    let whenStart = parseDate(cell(colMap.whenStart));
    let whenEnd   = parseDate(cell(colMap.whenEnd ?? colMap.whenStart));

    // Busca datas nas colunas de semana
    if (!whenStart || !whenEnd) {
      let firstW = null, lastW = null;
      for (let C = range.s.c; C <= range.e.c; C++) {
        if (!dateMap[C]) continue;
        const wc = sheet[XLSX.utils.encode_cell({ r:R, c:C })];
        if (wc && wc.v != null && wc.v !== '' && wc.v !== false) {
          if (!firstW) firstW = dateMap[C].start;
          lastW = dateMap[C].end;
        }
      }
      if (firstW && !whenStart) whenStart = firstW;
      if (lastW  && !whenEnd)   whenEnd   = lastW;
    }

    const isCategory = /^\d+$/.test(code);
    if (isCategory) {
      categories.push({ code, name: whatVal || `Categoria ${code}`, description: whyVal, color: CAT_COLORS[colorIdx++ % CAT_COLORS.length] });
    } else {
      activities.push({
        code, parentCode: code.split('.')[0],
        what: whatVal || `Atividade ${code}`,
        why: whyVal, who: whoVal, where: whereVal, how: howVal,
        howMuch: hm,
        whenStart: whenStart ? whenStart.toISOString() : null,
        whenEnd:   whenEnd   ? whenEnd.toISOString()   : null,
        status: statusV ? mapStatus(statusV) : 'PLANNED',
        risk: riskV || null,
      });
    }
  }

  return { projectName, categories, activities, sheetName };
}
