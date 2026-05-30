const prisma = require('../prisma/client');

// GET /api/activities/:activityId/time-entries
async function listTimeEntries(req, res, next) {
  try {
    const entries = await prisma.timeEntry.findMany({
      where: { activityId: req.params.activityId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
    res.json({ entries, totalHours });
  } catch (err) { next(err); }
}

// POST /api/activities/:activityId/time-entries
async function createTimeEntry(req, res, next) {
  try {
    const { hours, date, description } = req.body;
    if (!hours || hours <= 0) return res.status(422).json({ error: 'Horas deve ser maior que zero.' });
    if (!date)  return res.status(422).json({ error: 'Data é obrigatória.' });

    const entry = await prisma.timeEntry.create({
      data: {
        activityId: req.params.activityId,
        userId: req.user.id,
        hours: parseFloat(hours),
        date: new Date(date),
        description,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Atualiza actualHours na atividade
    const { _sum } = await prisma.timeEntry.aggregate({
      where: { activityId: req.params.activityId },
      _sum: { hours: true },
    });
    await prisma.activity.update({
      where: { id: req.params.activityId },
      data: { actualHours: _sum.hours || 0 },
    });

    res.status(201).json({ entry });
  } catch (err) { next(err); }
}

// DELETE /api/activities/:activityId/time-entries/:id
async function deleteTimeEntry(req, res, next) {
  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: req.params.id } });
    if (!entry) return res.status(404).json({ error: 'Apontamento não encontrado.' });
    if (entry.userId !== req.user.id && req.user.role !== 'ADMIN')
      return res.status(403).json({ error: 'Sem permissão.' });

    await prisma.timeEntry.delete({ where: { id: req.params.id } });

    // Recalcula actualHours
    const { _sum } = await prisma.timeEntry.aggregate({
      where: { activityId: req.params.activityId },
      _sum: { hours: true },
    });
    await prisma.activity.update({
      where: { id: req.params.activityId },
      data: { actualHours: _sum.hours || 0 },
    });

    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listTimeEntries, createTimeEntry, deleteTimeEntry };
