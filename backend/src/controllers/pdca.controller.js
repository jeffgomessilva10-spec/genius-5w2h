const prisma = require('../prisma/client');

const INCLUDE = { createdBy: { select: { id: true, name: true } } };

// GET /api/pdca?projectId=xxx
async function listPdca(req, res, next) {
  try {
    const { projectId } = req.query;
    const [reviews, lessons] = await Promise.all([
      prisma.pdcaReview.findMany({
        where: projectId ? { projectId } : {},
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lessonLearned.findMany({
        where: projectId ? { projectId } : {},
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json({ reviews, lessons });
  } catch (err) { next(err); }
}

// POST /api/pdca/reviews
async function createReview(req, res, next) {
  try {
    const { projectId, phase, title, description, actionItems } = req.body;
    if (!projectId || !phase || !title || !description)
      return res.status(422).json({ error: 'projectId, phase, title e description são obrigatórios.' });

    const validPhases = ['PLAN', 'DO', 'CHECK', 'ACT', 'DONE'];
    if (!validPhases.includes(phase)) return res.status(422).json({ error: 'Phase inválida.' });

    const review = await prisma.pdcaReview.create({
      data: { projectId, phase, title, description, actionItems, createdById: req.user.id },
      include: INCLUDE,
    });
    res.status(201).json({ review });
  } catch (err) { next(err); }
}

// PATCH /api/pdca/reviews/:id/phase — muda fase (drag-and-drop)
async function moveReview(req, res, next) {
  try {
    const { phase, operationalGain } = req.body;
    const validPhases = ['PLAN', 'DO', 'CHECK', 'ACT', 'DONE'];
    if (!validPhases.includes(phase)) return res.status(422).json({ error: 'Phase inválida.' });

    const data = { phase };
    if (phase === 'DONE') {
      data.completedAt     = new Date();
      data.operationalGain = operationalGain || null;
    }

    const review = await prisma.pdcaReview.update({
      where: { id: req.params.id },
      data,
      include: INCLUDE,
    });
    res.json({ review });
  } catch (err) { next(err); }
}

// DELETE /api/pdca/reviews/:id
async function deleteReview(req, res, next) {
  try {
    await prisma.pdcaReview.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

// POST /api/pdca/lessons
async function createLesson(req, res, next) {
  try {
    const { projectId, title, description, category, impact, recommendation } = req.body;
    if (!projectId || !title || !description)
      return res.status(422).json({ error: 'projectId, title e description são obrigatórios.' });

    const lesson = await prisma.lessonLearned.create({
      data: { projectId, title, description, category: category || 'Geral', impact, recommendation, createdById: req.user.id },
      include: INCLUDE,
    });
    res.status(201).json({ lesson });
  } catch (err) { next(err); }
}

// DELETE /api/pdca/lessons/:id
async function deleteLesson(req, res, next) {
  try {
    await prisma.lessonLearned.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listPdca, createReview, deleteReview, createLesson, deleteLesson, moveReview };
