// src/controllers/dashboard.controller.js
// KPIs calculados para Dashboard Operacional e Executivo
const prisma = require('../prisma/client');

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────
function toNum(v) { return v ? Number(v) : 0; }

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

function dateFilter(period) {
  const now   = new Date();
  const start = new Date();
  if (period === 'week')    start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else if (period === 'quarter') start.setMonth(now.getMonth() - 3);
  return period ? { gte: start } : undefined;
}

// ──────────────────────────────────────────────────────
// GET /api/dashboard/operational
// Para: COLLABORATOR — visão das SUAS atividades
// ──────────────────────────────────────────────────────
async function operationalDashboard(req, res, next) {
  try {
    const userId  = req.user.id;
    const { period, categoryId, status } = req.query;
    const updatedFilter = dateFilter(period);

    const where = {
      responsibleId: userId,
      ...(status     ? { status }     : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(updatedFilter ? { updatedAt: updatedFilter } : {}),
    };

    const [
      allMyActivities,
      byStatus,
      criticalActivities,
      timeEntries,
      categorySummary,
      upcomingDeadlines,
    ] = await Promise.all([
      // Todas as atividades do usuário
      prisma.activity.count({ where: { responsibleId: userId } }),

      // Contagem por status
      prisma.activity.groupBy({
        by: ['status'],
        where: { responsibleId: userId },
        _count: { status: true },
        _sum:   { howMuch: true, actualCost: true, plannedHours: true, actualHours: true },
      }),

      // Atividades críticas (risco HIGH ou CRITICAL + não finalizadas)
      prisma.activity.findMany({
        where: { responsibleId: userId, riskLevel: { in: ['HIGH', 'CRITICAL'] }, status: { not: 'DONE' } },
        include: { category: { select: { name: true, color: true, projectId: true } } },
        orderBy: [{ riskLevel: 'desc' }, { whenEnd: 'asc' }],
        take: 10,
      }),

      // Horas registradas pelo usuário
      prisma.timeEntry.aggregate({
        where: { userId },
        _sum: { hours: true },
      }),

      // Backlog por categoria
      prisma.activity.groupBy({
        by: ['categoryId'],
        where: { responsibleId: userId, status: { not: 'DONE' } },
        _count: { id: true },
        _sum:   { howMuch: true },
      }),

      // Próximas a vencer (7 dias)
      prisma.activity.findMany({
        where: {
          responsibleId: userId,
          status: { in: ['PLANNED', 'IN_PROGRESS'] },
          whenEnd: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        },
        include: { category: { select: { name: true, color: true } } },
        orderBy: { whenEnd: 'asc' },
        take: 8,
      }),
    ]);

    // Horas por projeto
    const myActivities = await prisma.activity.findMany({
      where: { responsibleId: userId, status: { not: 'DONE' } },
      include: {
        category: { select: { name: true, color: true, project: { select: { id: true, name: true } } } },
      },
      orderBy: { whenEnd: 'asc' },
      take: 20,
    });

    // Enriquecer backlog com nomes de categorias
    const catIds = [...new Set(categorySummary.map(c => c.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: catIds } },
      select: { id: true, name: true, color: true },
    });
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const statusMap = Object.fromEntries(
      byStatus.map(s => [s.status, { count: s._count.status, howMuch: toNum(s._sum.howMuch), actualCost: toNum(s._sum.actualCost), plannedHours: toNum(s._sum.plannedHours), actualHours: toNum(s._sum.actualHours) }])
    );

    res.json({
      profile: 'OPERATIONAL',
      summary: {
        total:       allMyActivities,
        planned:     statusMap.PLANNED?.count     || 0,
        inProgress:  statusMap.IN_PROGRESS?.count || 0,
        delayed:     statusMap.DELAYED?.count     || 0,
        done:        statusMap.DONE?.count        || 0,
        totalHours:  toNum(timeEntries._sum.hours),
        plannedHours: byStatus.reduce((s, r) => s + toNum(r._sum.plannedHours), 0),
        actualHours:  byStatus.reduce((s, r) => s + toNum(r._sum.actualHours),  0),
        plannedCost:  byStatus.reduce((s, r) => s + toNum(r._sum.howMuch),      0),
        actualCost:   byStatus.reduce((s, r) => s + toNum(r._sum.actualCost),   0),
      },
      myActivities: myActivities.slice(0, 12),
      criticalActivities,
      upcomingDeadlines,
      backlogByCategory: categorySummary.map(c => ({
        category: catMap[c.categoryId] || { id: c.categoryId, name: 'Sem categoria' },
        count: c._count.id,
        value: toNum(c._sum.howMuch),
      })),
    });
  } catch (err) { next(err); }
}

// ──────────────────────────────────────────────────────
// GET /api/dashboard/executive
// Para: ADMIN, EXECUTIVE — visão de todos os projetos
// ──────────────────────────────────────────────────────
async function executiveDashboard(req, res, next) {
  try {
    const { period, projectId } = req.query;
    const updatedFilter = dateFilter(period);

    const projectWhere = { isActive: true, ...(projectId ? { id: projectId } : {}) };

    const [projects, allActivities, riskActivities, topDelayed] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        include: {
          categories: {
            include: {
              activities: {
                select: {
                  id: true, status: true, howMuch: true, actualCost: true,
                  plannedHours: true, actualHours: true, riskLevel: true,
                  whenStart: true, whenEnd: true, what: true, code: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Totais globais
      prisma.activity.aggregate({
        where: { ...(updatedFilter ? { updatedAt: updatedFilter } : {}) },
        _sum:   { howMuch: true, actualCost: true, plannedHours: true, actualHours: true },
        _count: { id: true },
      }),

      // Exposição ao risco
      prisma.activity.findMany({
        where: { riskLevel: { in: ['HIGH', 'CRITICAL'] }, status: { not: 'DONE' } },
        include: {
          category: { select: { name: true, project: { select: { name: true } } } },
          responsible: { select: { name: true } },
        },
        orderBy: [{ riskLevel: 'desc' }, { whenEnd: 'asc' }],
        take: 10,
      }),

      // Top atividades atrasadas
      prisma.activity.findMany({
        where: { status: 'DELAYED' },
        include: {
          category: { select: { name: true, color: true, project: { select: { name: true } } } },
          responsible: { select: { name: true } },
        },
        orderBy: { whenEnd: 'asc' },
        take: 8,
      }),
    ]);

    // KPIs por projeto
    const projectKPIs = projects.map(proj => {
      const acts = proj.categories.flatMap(c => c.activities);
      const total     = acts.length;
      const done      = acts.filter(a => a.status === 'DONE').length;
      const delayed   = acts.filter(a => a.status === 'DELAYED').length;
      const planned   = acts.reduce((s, a) => s + toNum(a.howMuch), 0);
      const actual    = acts.reduce((s, a) => s + toNum(a.actualCost), 0);
      const phours    = acts.reduce((s, a) => s + toNum(a.plannedHours), 0);
      const ahours    = acts.reduce((s, a) => s + toNum(a.actualHours), 0);
      const pctDone   = total > 0 ? Math.round((done / total) * 100) : 0;
      const spi = calcSPI(done, total, proj.startDate, proj.endDate);
      const cpi = calcCPI(planned, actual, done, total);

      return {
        id: proj.id, name: proj.name,
        startDate: proj.startDate, endDate: proj.endDate,
        total, done, delayed, pctDone,
        plannedCost: planned, actualCost: actual,
        plannedHours: phours, actualHours: ahours,
        costVariance: planned > 0 ? +(((planned - actual) / planned) * 100).toFixed(1) : null,
        spi, cpi,
        spiStatus: spi == null ? 'N/A' : spi >= 1 ? 'OK' : spi >= 0.8 ? 'WARN' : 'RISK',
        cpiStatus: cpi == null ? 'N/A' : cpi >= 1 ? 'OK' : cpi >= 0.8 ? 'WARN' : 'RISK',
        categoryCount: proj.categories.length,
      };
    });

    // Totais do portfólio
    const portfolio = {
      totalProjects:  projects.length,
      totalActivities: toNum(allActivities._count.id),
      plannedCost:    toNum(allActivities._sum.howMuch),
      actualCost:     toNum(allActivities._sum.actualCost),
      plannedHours:   toNum(allActivities._sum.plannedHours),
      actualHours:    toNum(allActivities._sum.actualHours),
      avgPctDone:     projectKPIs.length > 0
        ? Math.round(projectKPIs.reduce((s, p) => s + p.pctDone, 0) / projectKPIs.length)
        : 0,
      projectsOnTrack: projectKPIs.filter(p => p.spiStatus === 'OK').length,
      projectsAtRisk:  projectKPIs.filter(p => p.spiStatus === 'RISK').length,
      totalDelayed:    projectKPIs.reduce((s, p) => s + p.delayed, 0),
    };

    res.json({
      profile: 'EXECUTIVE',
      portfolio,
      projectKPIs,
      riskExposure: riskActivities,
      topDelayed,
    });
  } catch (err) { next(err); }
}

// GET /api/dashboard/preferences
async function getPreferences(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { dashboardPrefs: true } });
    res.json({ preferences: user?.dashboardPrefs || null });
  } catch (err) { next(err); }
}

// PUT /api/dashboard/preferences
async function updatePreferences(req, res, next) {
  try {
    const { preferences } = req.body;
    await prisma.user.update({ where: { id: req.user.id }, data: { dashboardPrefs: preferences } });
    res.json({ preferences });
  } catch (err) { next(err); }
}

module.exports = { operationalDashboard, executiveDashboard, getPreferences, updatePreferences };
