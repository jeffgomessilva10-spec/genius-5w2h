const prisma = require('../prisma/client');

const OBJ_INCLUDE = {
  keyResults: { include: { activities: { select: { id: true, code: true, what: true, status: true } } } },
  createdBy: { select: { id: true, name: true } },
};

// Recalcula progresso do objetivo com base nos KRs
function calcObjectiveProgress(keyResults) {
  if (!keyResults.length) return 0;
  const avg = keyResults.reduce((s, kr) => {
    const target = Number(kr.targetValue);
    const current = Number(kr.currentValue);
    return s + (target > 0 ? Math.min((current / target) * 100, 100) : 0);
  }, 0) / keyResults.length;
  return Math.round(avg);
}

// GET /api/okr?projectId=xxx
async function listObjectives(req, res, next) {
  try {
    const { projectId } = req.query;
    const objectives = await prisma.objective.findMany({
      where: { ...(projectId ? { projectId } : {}), isActive: true },
      include: OBJ_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ objectives });
  } catch (err) { next(err); }
}

// POST /api/okr
async function createObjective(req, res, next) {
  try {
    const { projectId, title, description, targetDate } = req.body;
    if (!projectId || !title) return res.status(422).json({ error: 'projectId e title são obrigatórios.' });

    const objective = await prisma.objective.create({
      data: { projectId, title, description, targetDate: targetDate ? new Date(targetDate) : null, createdById: req.user.id },
      include: OBJ_INCLUDE,
    });
    res.status(201).json({ objective });
  } catch (err) { next(err); }
}

// POST /api/okr/:objectiveId/key-results
async function createKeyResult(req, res, next) {
  try {
    const { title, unit, targetValue } = req.body;
    if (!title || !targetValue) return res.status(422).json({ error: 'title e targetValue são obrigatórios.' });

    const kr = await prisma.keyResult.create({
      data: { objectiveId: req.params.objectiveId, title, unit: unit || '%', targetValue: parseFloat(targetValue) },
    });
    res.status(201).json({ keyResult: kr });
  } catch (err) { next(err); }
}

// PATCH /api/okr/key-results/:id
async function updateKeyResult(req, res, next) {
  try {
    const { currentValue } = req.body;
    const kr = await prisma.keyResult.update({
      where: { id: req.params.id },
      data: { currentValue: parseFloat(currentValue) },
      include: { objective: { include: { keyResults: true } } },
    });

    // Recalcula progresso do objetivo pai
    const progress = calcObjectiveProgress(kr.objective.keyResults);
    await prisma.objective.update({ where: { id: kr.objective.id }, data: { progress } });

    res.json({ keyResult: kr, objectiveProgress: progress });
  } catch (err) { next(err); }
}

// POST /api/okr/key-results/:id/link-activity
async function linkActivity(req, res, next) {
  try {
    const { activityId } = req.body;
    await prisma.activityKeyResult.upsert({
      where: { activityId_keyResultId: { activityId, keyResultId: req.params.id } },
      update: {},
      create: { activityId, keyResultId: req.params.id },
    });
    res.status(201).json({ linked: true });
  } catch (err) { next(err); }
}

// DELETE /api/okr/:id
async function deleteObjective(req, res, next) {
  try {
    await prisma.objective.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listObjectives, createObjective, createKeyResult, updateKeyResult, linkActivity, deleteObjective };
