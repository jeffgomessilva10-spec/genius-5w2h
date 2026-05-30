// src/routes/category.routes.js
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const prisma = require('../prisma/client');

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const categories = await prisma.category.findMany({
      where: projectId ? { projectId } : undefined,
      include: { _count: { select: { activities: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { activities: true },
    });
    if (!category) return res.status(404).json({ error: 'Categoria não encontrada.' });
    res.json({ category });
  } catch (err) { next(err); }
});

router.post('/',
  authorize('ADMIN', 'COLLABORATOR'),
  body('name').notEmpty(),
  body('projectId').isUUID(),
  async (req, res, next) => {
    try {
      const { name, description, color, projectId } = req.body;
      const category = await prisma.category.create({
        data: { name, description, color: color || '#F5C500', projectId },
      });
      res.status(201).json({ category });
    } catch (err) { next(err); }
  }
);

router.put('/:id', authorize('ADMIN', 'COLLABORATOR'), async (req, res, next) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ category });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
