/**
 * excel.service.js
 * Serviço de parsing de planilhas Excel para importação de projetos 5W2H.
 * Suporta: .xlsx, .xlsm, .xls, .csv
 *
 * Formato esperado da planilha:
 * Coluna 1:  # (código: "1" = categoria, "1.1" = atividade)
 * Coluna 2:  WHAT (O Quê)
 * Coluna 3:  WHY (Por Quê)
 * Coluna 4:  WHO (Quem)
 * Coluna 5:  WHERE (Onde)
 * Coluna 6:  HOW (Como)
 * Coluna 7:  HOW MUCH (Quanto R$)
 * Coluna 8:  WHEN / Data início
 * Coluna 9:  Data fim (opcional)
 * Coluna 10: Status (opcional)
 * Coluna 11: Risco / Risk (opcional)
 * Coluna 12: Cor da categoria (opcional, hex #RRGGBB)
 */

const XLSX = require('xlsx');

// Paleta de cores automática para categorias
const CATEGORY_COLORS = [
  '#F04E00', '#2563EB', '#16A34A', '#D97706',
  '#7C3AED', '#DC2626', '#0891B2', '#65A30D',
  '#DB2777', '#EA580C', '#0D9488', '#7C3AED',
];

/**
 * Converte um valor de data do Excel (serial number ou string) para Date.
 */
function parseExcelDate(value) {
  if (!value) return null;

  // Já é uma Date
  if (value instanceof Date) return value;

  // String com formato dd/mm/aaaa
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === 'N/A') return null;

    // dd/mm/yyyy ou dd-mm-yyyy
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
      return new Date(year, parseInt(m) - 1, parseInt(d));
    }

    // yyyy-mm-dd
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }

    // Mês/Ano (ex: "Jun/26" → primeiro dia do mês)
    const myMatch = trimmed.match(/^(\w{3})[\/\-](\d{2,4})$/i);
    if (myMatch) {
      const months = { jan:0, fev:1, mar:2, abr:3, mai:4, jun:5, jul:6, ago:7, set:8, out:9, nov:10, dez:11 };
      const monthName = myMatch[1].toLowerCase().substring(0, 3);
      const monthIdx = months[monthName];
      if (monthIdx !== undefined) {
        const year = parseInt(myMatch[2]) < 100 ? 2000 + parseInt(myMatch[2]) : parseInt(myMatch[2]);
        return new Date(year, monthIdx, 1);
      }
    }

    // "Sem. N" (semana N do ano atual) → estimativa de data
    const weekMatch = trimmed.match(/sem\.?\s*(\d+)/i);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1 + (weekNum - 1) * 7);
      return start;
    }
  }

  // Número serial do Excel (dias desde 01/01/1900)
  if (typeof value === 'number' && value > 1000) {
    return XLSX.SSF.parse_date_code(value);
  }

  return null;
}

/**
 * Normaliza valor para string segura.
 */
function str(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * Normaliza valor para número (custo).
 */
function num(v) {
  if (v === null || v === undefined || v === '' || v === '-') return null;
  const n = parseFloat(String(v).replace(/[R$\s.]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

/**
 * Identifica automaticamente qual linha é cabeçalho.
 * Procura pela linha que contém palavras-chave como WHAT, WHY, O QUÊ, etc.
 */
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
  const keywords = ['what', 'o quê', 'o que', 'why', 'por que', 'who', 'quem', 'how', 'como'];

  for (let R = range.s.r; R <= Math.min(range.e.r, 10); R++) {
    let matches = 0;
    for (let C = range.s.c; C <= Math.min(range.e.c, 15); C++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && keywords.some(k => str(cell.v).toLowerCase().includes(k))) {
        matches++;
      }
    }
    if (matches >= 2) return R;
  }
  return 0; // assume primeira linha como cabeçalho
}

/**
 * Mapeia os cabeçalhos das colunas para índices.
 */
function mapColumns(sheet, headerRow) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
  const map = {};

  const patterns = {
    code:     /^#$|^cod|^n[oº°]/i,
    what:     /what|o qu[eê]/i,
    why:      /why|por qu[eê]/i,
    who:      /who|quem/i,
    where:    /where|onde/i,
    how:      /^how$|^como/i,
    howMuch:  /how much|quanto|custo|valor|r\$/i,
    whenStart:/when start|data.?in[íi]c|início|start/i,
    whenEnd:  /when end|data.?f[ií]n|prazo|t[eé]rmino|end|when$/i,
    status:   /status|situa/i,
    risk:     /risco|risk/i,
    color:    /cor|color/i,
  };

  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: C })];
    if (!cell) continue;
    const header = str(cell.v).toLowerCase();

    for (const [key, pattern] of Object.entries(patterns)) {
      if (!map[key] && pattern.test(header)) {
        map[key] = C;
        break;
      }
    }
  }

  // Fallback: se não encontrou code, assume coluna 0
  if (map.code === undefined) map.code = 0;

  return map;
}

/**
 * Lê uma planilha Excel e retorna { projectName, categories, activities }.
 *
 * @param {Buffer} buffer - Buffer do arquivo Excel
 * @param {string} projectName - Nome do projeto (fallback)
 * @returns {{ projectName, categories, activities }}
 */
function parseExcel(buffer, projectName = 'Projeto Importado') {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  // Pega a primeira aba
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Tenta usar o nome da aba como nome do projeto
  const derivedProjectName = sheetName !== 'Sheet1' ? sheetName : projectName;

  const headerRow = findHeaderRow(sheet);
  const colMap = mapColumns(sheet, headerRow);
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');

  const categories = [];
  const activities = [];
  let colorIdx = 0;

  for (let R = headerRow + 1; R <= range.e.r; R++) {
    function cell(col) {
      if (col === undefined) return null;
      const c = sheet[XLSX.utils.encode_cell({ r: R, c: col })];
      return c ? c.v : null;
    }

    const code = str(cell(colMap.code));
    if (!code || code === '') continue;  // linha vazia

    const whatVal   = str(cell(colMap.what));
    const whyVal    = str(cell(colMap.why));
    const whoVal    = str(cell(colMap.who));
    const whereVal  = str(cell(colMap.where));
    const howVal    = str(cell(colMap.how));
    const howMuch   = num(cell(colMap.howMuch));
    const whenStart = parseExcelDate(cell(colMap.whenStart));
    const whenEnd   = parseExcelDate(cell(colMap.whenEnd ?? colMap.whenStart));
    const statusRaw = str(cell(colMap.status));
    const riskVal   = str(cell(colMap.risk));
    const colorVal  = str(cell(colMap.color));

    const status = mapStatus(statusRaw);

    // Código sem ponto = categoria (ex: "1", "2", "Site")
    const isCategory = /^\d+$/.test(code) || (!code.includes('.') && whatVal && !whyVal);

    if (isCategory) {
      const catName = whatVal || code;
      const catColor = colorVal.startsWith('#') ? colorVal : CATEGORY_COLORS[colorIdx++ % CATEGORY_COLORS.length];
      categories.push({
        code,
        name:        catName,
        description: whyVal || '',
        color:       catColor,
      });
    } else {
      // Atividade — deriva categoria pelo prefixo do código
      const parentCode = code.split('.')[0];

      activities.push({
        code,
        parentCode,
        what:     whatVal  || `Atividade ${code}`,
        why:      whyVal   || '',
        who:      whoVal   || '',
        where:    whereVal || '',
        how:      howVal   || '',
        howMuch,
        whenStart: whenStart ? whenStart : null,
        whenEnd:   whenEnd   ? whenEnd   : null,
        status,
        risk:     riskVal  || null,
        notes:    null,
      });
    }
  }

  return { projectName: derivedProjectName, categories, activities };
}

function mapStatus(raw) {
  const s = raw.toLowerCase();
  if (s.includes('andamento') || s.includes('progress'))    return 'IN_PROGRESS';
  if (s.includes('atras') || s.includes('delay'))           return 'DELAYED';
  if (s.includes('conclu') || s.includes('done') || s.includes('final')) return 'DONE';
  return 'PLANNED';
}

module.exports = { parseExcel };
