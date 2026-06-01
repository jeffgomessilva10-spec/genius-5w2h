/**
 * excel.service.js
 * Parser de planilhas Excel para importação de projetos 5W2H.
 *
 * Suporta dois formatos:
 * 1. Formato Genius (colunas A-G = #, WHAT, WHY, WHO, WHERE, HOW, HOW MUCH + semanas)
 * 2. Formato genérico com cabeçalhos em qualquer linha
 *
 * Retorna estrutura pronta para o importador:
 * { projectName, categories[], activities[], preview[] }
 */
const XLSX = require('xlsx');

// Cores automáticas por posição
const CAT_COLORS = [
  '#F04E00','#2563EB','#7C3AED','#16A34A',
  '#D97706','#DC2626','#0891B2','#65A30D',
];

// Mapeamento de meses para índice (0-11)
const MONTH_MAP = {
  jan:0, fev:1, mar:2, abr:3, mai:4, jun:5,
  jul:6, ago:7, set:8, out:9, nov:10, dez:11,
  january:0, february:1, march:2, april:3, may:4, june:5,
  july:6, august:7, september:8, october:9, november:10, december:11,
};

/** Converte número serial do Excel para Date */
function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1) return null;
  const date = XLSX.SSF.parse_date_code(serial);
  if (!date) return null;
  return new Date(date.y, date.m - 1, date.d);
}

/** Tenta parsear uma data de várias formas */
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;

  // Número serial do Excel
  if (typeof val === 'number' && val > 40000) {
    return excelSerialToDate(val);
  }

  const s = String(val).trim();
  if (!s || s === '-' || s.length < 3) return null;

  // dd/mm/yyyy ou d/m/yy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const y = parseInt(dmy[3]);
    return new Date(y < 100 ? 2000 + y : y, parseInt(dmy[2]) - 1, parseInt(dmy[1]));
  }
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2]-1, +iso[3]);

  // Semana "Sem. N" — estima a semana N do ano corrente
  const wk = s.match(/sem\.?\s*(\d+)/i);
  if (wk) {
    const n = parseInt(wk[1]);
    const d = new Date(new Date().getFullYear(), 0, 1 + (n-1)*7);
    return d;
  }

  return null;
}

/** Limpa e normaliza string */
function str(v) {
  if (v == null) return '';
  return String(v).trim().replace(/\r?\n/g, ' ');
}

/** Converte valor para número */
function num(v) {
  if (v == null || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/[R$\s\.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Mapeia status textual para enum */
function mapStatus(s) {
  const t = str(s).toLowerCase();
  if (t.includes('andamento') || t.includes('progress')) return 'IN_PROGRESS';
  if (t.includes('atras')     || t.includes('delay'))    return 'DELAYED';
  if (t.includes('conclu')    || t.includes('finaliz') || t.includes('done')) return 'DONE';
  return 'PLANNED';
}

/** Detecta a linha de cabeçalho procurando palavras-chave 5W2H */
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z20');
  const kw = ['what', 'o que', 'o quê', 'why', 'por que', 'who', 'quem', 'how', 'como', '#'];

  for (let R = range.s.r; R <= Math.min(range.e.r, 15); R++) {
    let hits = 0;
    for (let C = range.s.c; C <= Math.min(range.e.c, 20); C++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && kw.some(k => str(cell.v).toLowerCase().includes(k))) hits++;
    }
    if (hits >= 2) return R;
  }
  return 0;
}

/**
 * Lê meses e semanas do cabeçalho para montar o mapa de colunas de datas.
 * Retorna: Map<colIndex, { month: Date, week: number }>
 */
function buildDateColumnMap(sheet, headerRow) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
  const dateMap = {};
  let currentMonth = null;
  const year = new Date().getFullYear();

  // Linha de meses (headerRow - 1 ou headerRow - 2)
  for (let mRow = Math.max(0, headerRow - 2); mRow < headerRow; mRow++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: mRow, c: C })];
      if (!cell) continue;
      const v = str(cell.v).toLowerCase().substring(0, 3);
      if (MONTH_MAP[v] !== undefined) {
        currentMonth = new Date(year, MONTH_MAP[v], 1);
      }
      // Linha de semanas
      const wkMatch = str(cell.v).match(/sem\.?\s*(\d+)/i);
      if (wkMatch && currentMonth) {
        const weekN = parseInt(wkMatch[1]);
        // Início da semana N do mês
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1 + (weekN-1)*7);
        const end   = new Date(start); end.setDate(start.getDate() + 6);
        dateMap[C] = { start, end };
      }
    }
  }
  return dateMap;
}

/**
 * Mapeia os cabeçalhos para índices de coluna.
 */
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
    notes:    /obs|nota|note|observa/i,
  };

  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: C })];
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
 * Função principal: parseia o Excel e retorna dados estruturados.
 */
function parseExcel(buffer, projectNameOverride = '') {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  // Escolhe a aba certa (prefere "5W 2H", "Plano" ou a primeira)
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    if (/5w|plano|ação|atividade/i.test(name)) { sheetName = name; break; }
  }
  const sheet = workbook.Sheets[sheetName];

  const projectName = projectNameOverride || sheetName;
  const headerRow   = findHeaderRow(sheet);
  const colMap      = mapColumns(sheet, headerRow);
  const dateMap     = buildDateColumnMap(sheet, headerRow);
  const range       = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');

  const categories = [];
  const activities  = [];
  const preview     = []; // para revisão antes de importar
  let colorIdx = 0;

  for (let R = headerRow + 1; R <= range.e.r; R++) {
    const cell = (col) => {
      if (col === undefined) return null;
      const c = sheet[XLSX.utils.encode_cell({ r: R, c: col })];
      return c ? c.v : null;
    };

    const code = str(cell(colMap.code));
    if (!code) continue;

    const whatVal = str(cell(colMap.what));
    const whyVal  = str(cell(colMap.why));
    const whoVal  = str(cell(colMap.who));
    const whereVal= str(cell(colMap.where));
    const howVal  = str(cell(colMap.how));
    const hm      = num(cell(colMap.howMuch));
    const statusV = str(cell(colMap.status));
    const riskV   = str(cell(colMap.risk));
    const notesV  = str(cell(colMap.notes));

    // Determina datas: campo explícito ou coluna de semana marcada
    let whenStart = parseDate(cell(colMap.whenStart));
    let whenEnd   = parseDate(cell(colMap.whenEnd ?? colMap.whenStart));

    // Se não tem datas explícitas, procura célula marcada nas colunas de semana
    if (!whenStart || !whenEnd) {
      const range2 = XLSX.utils.decode_range(sheet['!ref'] || 'A1:AZ1');
      let firstWeek = null, lastWeek = null;
      for (let C = range2.s.c; C <= range2.e.c; C++) {
        if (!dateMap[C]) continue;
        const wCell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (wCell && wCell.v != null && wCell.v !== '' && wCell.v !== false) {
          if (!firstWeek) firstWeek = dateMap[C].start;
          lastWeek = dateMap[C].end;
        }
      }
      if (firstWeek && !whenStart) whenStart = firstWeek;
      if (lastWeek  && !whenEnd)   whenEnd   = lastWeek;
    }

    // Categoria (código sem ponto: "1", "2"...) ou atividade ("1.1", "2.3")
    const isCategory = /^\d+$/.test(code);

    if (isCategory) {
      const name  = whatVal || `Categoria ${code}`;
      const color = CAT_COLORS[colorIdx++ % CAT_COLORS.length];
      categories.push({ code, name, description: whyVal, color });
      preview.push({ type: 'category', code, name, color });
    } else {
      const parentCode = code.split('.')[0];
      const status     = statusV ? mapStatus(statusV) : 'PLANNED';

      activities.push({
        code, parentCode,
        what:      whatVal  || `Atividade ${code}`,
        why:       whyVal,
        who:       whoVal,
        where:     whereVal,
        how:       howVal,
        howMuch:   hm,
        whenStart, whenEnd,
        status, risk: riskV, notes: notesV,
      });
      preview.push({
        type: 'activity', code, parentCode,
        what: whatVal, who: whoVal, status,
        whenStart: whenStart ? whenStart.toISOString().slice(0,10) : null,
        whenEnd:   whenEnd   ? whenEnd.toISOString().slice(0,10)   : null,
        howMuch: hm,
      });
    }
  }

  return { projectName, categories, activities, preview, sheetName, headerRow };
}

module.exports = { parseExcel };
