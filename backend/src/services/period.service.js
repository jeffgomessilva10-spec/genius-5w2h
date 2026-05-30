/**
 * period.service.js
 * Calcula intervalos de data considerando o timezone America/Sao_Paulo (UTC-3).
 * Usado pelos filtros de período do Gantt e Dashboards.
 */

const TZ = 'America/Sao_Paulo';

/**
 * Retorna a data/hora atual no fuso de São Paulo.
 */
function nowSP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/**
 * Dado um período ('hoje'|'semana'|'mes'|'todas'), retorna { start, end } em UTC
 * para ser usado em queries Prisma.
 */
function getPeriodRange(period) {
  const now = nowSP();

  switch (period) {
    case 'hoje': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      // Converte de volta para UTC (SP é UTC-3)
      return {
        start: new Date(start.getTime() + 3 * 60 * 60 * 1000),
        end:   new Date(end.getTime()   + 3 * 60 * 60 * 1000),
      };
    }

    case 'semana': {
      // Segunda a domingo da semana corrente
      const day = now.getDay(); // 0=dom, 1=seg, ..., 6=sab
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
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

    default: // 'todas' — sem filtro de data
      return null;
  }
}

/**
 * Converte lista de status da query string para array Prisma-compatível.
 * Ex.: "PLANNED,DELAYED" → ['PLANNED', 'DELAYED']
 */
function parseStatusFilter(statusParam) {
  if (!statusParam) return null;
  const VALID = ['PLANNED', 'IN_PROGRESS', 'DELAYED', 'DONE'];
  const statuses = statusParam.toUpperCase().split(',').map(s => s.trim()).filter(s => VALID.includes(s));
  return statuses.length > 0 ? statuses : null;
}

module.exports = { getPeriodRange, parseStatusFilter, nowSP };
