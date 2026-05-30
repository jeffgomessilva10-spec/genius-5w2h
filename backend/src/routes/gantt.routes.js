/**
 * gantt.routes.js
 * Rota dedicada ao Gantt com filtros de período e status.
 * GET /api/gantt?period=semana&status=PLANNED,IN_PROGRESS&projectId=xxx
 */
const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const prisma = require('../prisma/client');
const { getPeriodRange, parseStatusFilter } = require('../services/period.service');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { period = 'todas', status, projectId } = req.query;
    const { role, id: userId } = req.user;

    // Calcula intervalo de datas
    const range = getPeriodRange(period);

    // Filtro de projetos: clientes veem só os seus; admin/collab filtram por projectId
    let projectFilter = {};
    if (role === 'CLIENT') {
      projectFilter = { category: { project: { users: { some: { userId } } } } };
    } else if (projectId) {
      projectFilter = { category: { projectId } };
    } else if (role === 'COLLABORATOR') {
      // Colaboradores veem apenas projetos em que estão vinculados
      projectFilter = { category: { project: { users: { some: { userId } } } } };
    }

    // Filtro de período: atividade tem whenStart ou whenEnd dentro do range
    let dateFilter = {};
    if (range) {
      dateFilter = {
        OR: [
          { whenStart: { gte: range.start, lte: range.end } },
          { whenEnd:   { gte: range.start, lte: range.end } },
          // Atividade que abrange todo o período
          { AND: [{ whenStart: { lte: range.start } }, { whenEnd: { gte: range.end } }] },
        ],
      };
    }

    // Filtro de status
    const statusList = parseStatusFilter(status);
    const statusFilter = statusList ? { status: { in: statusList } } : {};

    const where = {
      ...projectFilter,
      ...statusFilter,
      // Só inclui atividades com datas definidas no Gantt
      ...(period !== 'todas' ? {
        ...dateFilter,
        whenStart: { not: null },
        whenEnd:   { not: null },
      } : {
        whenStart: { not: null },
        whenEnd:   { not: null },
      }),
    };

    const activities = await prisma.activity.findMany({
      where,
      include: {
        category:    { select: { id: true, name: true, color: true, projectId: true, project: { select: { id: true, name: true } } } },
        responsible: { select: { id: true, name: true } },
      },
      orderBy: [{ whenStart: 'asc' }, { code: 'asc' }],
    });

    // Contadores por status para os KPIs
    const counters = {
      PLANNED:     activities.filter(a => a.status === 'PLANNED').length,
      IN_PROGRESS: activities.filter(a => a.status === 'IN_PROGRESS').length,
      DELAYED:     activities.filter(a => a.status === 'DELAYED').length,
      DONE:        activities.filter(a => a.status === 'DONE').length,
      total:       activities.length,
    };

    res.json({
      activities,
      counters,
      period,
      range: range ? { start: range.start, end: range.end } : null,
      filtersApplied: { period, status: statusList || 'all' },
    });
  } catch (err) { next(err); }
});

module.exports = router;
