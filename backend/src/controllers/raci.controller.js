const prisma = require('../prisma/client');

const RACI_INCLUDE = {
  user: { select: { id: true, name: true, email: true, role: true } },
};

// GET /api/activities/:activityId/raci
async function listRaci(req, res, next) {
  try {
    const entries = await prisma.raci.findMany({
      where: { activityId: req.params.activityId },
      include: RACI_INCLUDE,
      orderBy: { role: 'asc' },
    });
    res.json({ raci: entries });
  } catch (err) { next(err); }
}

// POST /api/activities/:activityId/raci
async function upsertRaci(req, res, next) {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(422).json({ error: 'userId e role são obrigatórios.' });

    const validRoles = ['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'];
    if (!validRoles.includes(role)) return res.status(422).json({ error: 'Role inválido.' });

    const entry = await prisma.raci.upsert({
      where: { activityId_userId: { activityId: req.params.activityId, userId } },
      update: { role },
      create: { activityId: req.params.activityId, userId, role },
      include: RACI_INCLUDE,
    });
    res.status(201).json({ raci: entry });
  } catch (err) { next(err); }
}

// DELETE /api/activities/:activityId/raci/:userId
async function removeRaci(req, res, next) {
  try {
    await prisma.raci.delete({
      where: { activityId_userId: { activityId: req.params.activityId, userId: req.params.userId } },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Entrada RACI não encontrada.' });
    next(err);
  }
}

module.exports = { listRaci, upsertRaci, removeRaci };
