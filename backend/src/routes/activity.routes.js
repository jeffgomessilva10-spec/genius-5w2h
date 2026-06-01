// src/routes/activity.routes.js
const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/activity.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const prisma = require('../prisma/client');

const router = Router();
router.use(authenticate);

// GET /api/activities/next-code?categoryId=xxx — próximo código automático
router.get('/next-code', async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    if (!categoryId) return res.status(422).json({ error: 'categoryId obrigatório' });

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        activities: { select: { code: true } },
        project: { include: { categories: { include: { _count: { select: { activities: true } } } } } },
      },
    });
    if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });

    const allCats = category.project.categories;
    const catIndex = allCats.findIndex(c => c.id === categoryId) + 1;
    const prefix = String(catIndex);

    let maxSub = 0;
    category.activities.forEach(a => {
      const parts = (a.code || '').split('.');
      if (parts[0] === prefix && parts.length >= 2) {
        const sub = parseInt(parts[1]) || 0;
        if (sub > maxSub) maxSub = sub;
      }
    });

    res.json({ code: `${prefix}.${maxSub + 1}`, prefix, nextSub: maxSub + 1 });
  } catch (err) { next(err); }
});

router.get('/', ctrl.listActivities);
router.get('/stats/:projectId', ctrl.getProjectStats);
router.get('/:id', ctrl.getActivity);

// Somente COLLABORATOR e ADMIN alteram atividades
router.post('/',
  authorize('ADMIN', 'COLLABORATOR'),
  body('code').notEmpty(),
  body('what').notEmpty().withMessage('"O que" é obrigatório'),
  body('why').notEmpty().withMessage('"Por que" é obrigatório'),
  body('who').notEmpty().withMessage('"Quem" é obrigatório'),
  body('where').notEmpty().withMessage('"Onde" é obrigatório'),
  body('how').notEmpty().withMessage('"Como" é obrigatório'),
  body('categoryId').isUUID().withMessage('categoryId inválido'),
  ctrl.createActivity
);

router.put('/:id', authorize('ADMIN', 'COLLABORATOR'), ctrl.updateActivity);
router.delete('/:id', authorize('ADMIN', 'COLLABORATOR'), ctrl.deleteActivity);

module.exports = router;
