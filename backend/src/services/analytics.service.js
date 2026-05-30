/**
 * analytics.service.js
 * Serviço central de analytics: registra eventos, calcula métricas.
 * Conformidade LGPD: sem PII nos eventos, pseudonimização de IP.
 */
const prisma = require('../prisma/client');
const crypto = require('crypto');

// Pseudonimiza o IP com hash SHA-256 (sem reversão possível)
function hashIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex').substring(0, 16);
}

// ── Registro de evento ─────────────────────────────────
async function recordEvent({ userId, sessionId, eventType, module, action, context, durationMs, userRole, ip }) {
  // Verifica consentimento antes de registrar dados vinculados ao usuário
  if (userId) {
    const consent = await prisma.consent.findFirst({
      where: { userId, type: 'analytics', accepted: true },
      orderBy: { createdAt: 'desc' },
    });
    // Se usuário recusou analytics, anonimiza completamente
    if (!consent) userId = null;
  }

  // Remove campos potencialmente sensíveis do contexto
  const safeContext = context ? sanitizeContext(context) : null;

  return prisma.analyticEvent.create({
    data: {
      userId,
      sessionId,
      eventType,
      module:     module     || null,
      action:     action     || null,
      context:    safeContext,
      durationMs: durationMs || null,
      userRole:   userRole   || null,
      ipHash:     hashIP(ip),
    },
  });
}

// Remove campos PII do contexto (emails, nomes, etc.)
function sanitizeContext(ctx) {
  const piiFields = ['email', 'name', 'phone', 'password', 'token'];
  const clean = { ...ctx };
  for (const field of piiFields) delete clean[field];
  return clean;
}

// ── Cálculo de DAU/WAU/MAU ────────────────────────────
async function calcActiveUsers(period = 'day', start, end) {
  const now   = end   ? new Date(end)   : new Date();
  const from  = start ? new Date(start) : new Date();

  if (!start) {
    if (period === 'day')   from.setDate(now.getDate() - 1);
    if (period === 'week')  from.setDate(now.getDate() - 7);
    if (period === 'month') from.setMonth(now.getMonth() - 1);
  }

  const result = await prisma.analyticEvent.groupBy({
    by: ['userId'],
    where: {
      eventType: 'SESSION_START',
      userId: { not: null },
      createdAt: { gte: from, lte: now },
    },
    _count: { userId: true },
  });

  return {
    period,
    from: from.toISOString(),
    to:   now.toISOString(),
    uniqueUsers: result.length,
  };
}

// ── Série temporal DAU (por dia no intervalo) ──────────
async function calcDAUSeries(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const days  = [];

  // Gera dias do intervalo
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);

    const count = await prisma.analyticEvent.groupBy({
      by: ['userId'],
      where: {
        eventType: 'SESSION_START',
        userId: { not: null },
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    days.push({
      date:  dayStart.toISOString().split('T')[0],
      users: count.length,
    });
  }
  return days;
}

// ── Duração média de sessão ────────────────────────────
async function calcAvgSessionDuration(startDate, endDate) {
  const where = {
    eventType: 'SESSION_END',
    durationMs: { not: null, gt: 0 },
    ...(startDate || endDate ? { createdAt: {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate   ? { lte: new Date(endDate)   } : {}),
    }} : {}),
  };

  const result = await prisma.analyticEvent.aggregate({
    where,
    _avg: { durationMs: true },
    _count: { id: true },
    _max: { durationMs: true },
    _min: { durationMs: true },
  });

  return {
    avgMs:     Math.round(result._avg.durationMs || 0),
    avgMin:    +(( (result._avg.durationMs || 0) / 60000).toFixed(1)),
    sessions:  result._count.id,
    maxMs:     result._max.durationMs || 0,
    minMs:     result._min.durationMs || 0,
  };
}

// ── Taxa de retenção (D7, D30) ─────────────────────────
async function calcRetention(cohortDate, retainAfterDays = 7) {
  const cohortStart = new Date(cohortDate);
  cohortStart.setHours(0, 0, 0, 0);
  const cohortEnd = new Date(cohortStart);
  cohortEnd.setHours(23, 59, 59, 999);

  const returnStart = new Date(cohortStart);
  returnStart.setDate(returnStart.getDate() + retainAfterDays);
  const returnEnd = new Date(returnStart);
  returnEnd.setHours(23, 59, 59, 999);

  // Usuários que acessaram no dia do cohort
  const cohortUsers = await prisma.analyticEvent.groupBy({
    by: ['userId'],
    where: { eventType: 'SESSION_START', userId: { not: null }, createdAt: { gte: cohortStart, lte: cohortEnd } },
  });

  if (!cohortUsers.length) return { cohortDate, retainAfterDays, cohortSize: 0, retained: 0, rate: 0 };

  const cohortIds = cohortUsers.map(u => u.userId).filter(Boolean);

  // Desses, quantos voltaram após N dias
  const returned = await prisma.analyticEvent.groupBy({
    by: ['userId'],
    where: {
      eventType: 'SESSION_START',
      userId: { in: cohortIds },
      createdAt: { gte: returnStart, lte: returnEnd },
    },
  });

  return {
    cohortDate, retainAfterDays,
    cohortSize: cohortUsers.length,
    retained:   returned.length,
    rate:       cohortUsers.length > 0
      ? +((returned.length / cohortUsers.length * 100).toFixed(1))
      : 0,
  };
}

// ── Adoção de funcionalidades ──────────────────────────
async function calcFeatureAdoption(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const features = [
    { module: 'gantt',      label: 'Gantt'              },
    { module: 'raci',       label: 'Matriz RACI'        },
    { module: 'okr',        label: 'OKRs'               },
    { module: 'pdca',       label: 'PDCA'               },
    { module: 'documents',  label: 'Documentos'         },
    { module: 'governance', label: 'Governança'         },
    { module: 'analytics',  label: 'Analytics'          },
    { module: 'attachments',label: 'Anexos/Evidências'  },
  ];

  // Total de usuários únicos no período
  const totalUsers = await prisma.analyticEvent.groupBy({
    by: ['userId'],
    where: { eventType: 'SESSION_START', userId: { not: null }, createdAt: { gte: since } },
  });
  const total = totalUsers.length || 1;

  const adoption = await Promise.all(features.map(async f => {
    const users = await prisma.analyticEvent.groupBy({
      by: ['userId'],
      where: { module: f.module, userId: { not: null }, createdAt: { gte: since } },
    });
    return {
      module:     f.module,
      label:      f.label,
      users:      users.length,
      pct:        +((users.length / total * 100).toFixed(1)),
    };
  }));

  return { days, totalActiveUsers: total, features: adoption.sort((a, b) => b.users - a.users) };
}

// ── Frequência de sessões por usuário ──────────────────
async function calcSessionFrequency(startDate, endDate) {
  const where = {
    eventType: 'SESSION_START',
    userId: { not: null },
    ...(startDate || endDate ? { createdAt: {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate   ? { lte: new Date(endDate)   } : {}),
    }} : {}),
  };

  const sessions = await prisma.analyticEvent.groupBy({
    by: ['userId'],
    where,
    _count: { id: true },
  });

  if (!sessions.length) return { avgSessions: 0, totalSessions: 0, users: 0 };

  const totalSessions = sessions.reduce((s, u) => s + u._count.id, 0);
  return {
    users:       sessions.length,
    totalSessions,
    avgSessions: +(totalSessions / sessions.length).toFixed(1),
    distribution: {
      once:       sessions.filter(u => u._count.id === 1).length,
      twoToFive:  sessions.filter(u => u._count.id >= 2 && u._count.id <= 5).length,
      moreThanFive: sessions.filter(u => u._count.id > 5).length,
    },
  };
}

// ── Mapa de calor por módulo ────────────────────────────
async function calcModuleHeatmap(startDate, endDate) {
  const where = {
    module: { not: null },
    ...(startDate || endDate ? { createdAt: {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate   ? { lte: new Date(endDate)   } : {}),
    }} : {}),
  };

  const results = await prisma.analyticEvent.groupBy({
    by: ['module'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const total = results.reduce((s, r) => s + r._count.id, 0) || 1;

  return results.map(r => ({
    module: r.module,
    events: r._count.id,
    pct:    +((r._count.id / total * 100).toFixed(1)),
  }));
}

// ── Churn (usuários que pararam de usar) ───────────────
async function calcChurn(inactiveDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  const totalUsers = await prisma.user.count({ where: { isActive: true } });

  const activeUsers = await prisma.analyticEvent.groupBy({
    by: ['userId'],
    where: { eventType: 'SESSION_START', userId: { not: null }, createdAt: { gte: cutoff } },
  });

  const churned = totalUsers - activeUsers.length;
  return {
    inactiveDays,
    totalUsers,
    activeUsers:  activeUsers.length,
    churnedUsers: Math.max(churned, 0),
    churnRate:    totalUsers > 0 ? +((Math.max(churned, 0) / totalUsers * 100).toFixed(1)) : 0,
  };
}

module.exports = {
  recordEvent, hashIP,
  calcActiveUsers, calcDAUSeries,
  calcAvgSessionDuration, calcRetention,
  calcFeatureAdoption, calcSessionFrequency,
  calcModuleHeatmap, calcChurn,
};
