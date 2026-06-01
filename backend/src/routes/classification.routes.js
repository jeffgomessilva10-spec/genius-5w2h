/**
 * classification.routes.js
 * Gerenciamento das classificações hierárquicas de atividades.
 * GET    /api/classifications           — listar todas
 * POST   /api/classifications           — criar (ADMIN)
 * PUT    /api/classifications/:id       — editar (ADMIN)
 * DELETE /api/classifications/:id       — desativar (ADMIN)
 * POST   /api/classifications/seed      — popula padrão (ADMIN)
 */
const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const prisma = require('../prisma/client');

const router = Router();
router.use(authenticate);

// GET — qualquer autenticado
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const items = await prisma.activityClassification.findMany({
      where: { ...(type ? { type } : {}), isActive: true },
      orderBy: [{ type: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
    // Agrupa por tipo
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});
    res.json({ classifications: items, grouped });
  } catch (err) { next(err); }
});

// POST — cria nova classificação (ADMIN)
router.post('/', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { type, name, order } = req.body;
    if (!type || !name) return res.status(422).json({ error: 'type e name são obrigatórios.' });
    const valid = ['STRATEGIC', 'LEAN_OBJECTIVE', 'AREA'];
    if (!valid.includes(type)) return res.status(422).json({ error: `type deve ser: ${valid.join(', ')}` });

    const item = await prisma.activityClassification.upsert({
      where: { type_name: { type, name } },
      update: { isActive: true, order: order ?? 0 },
      create: { type, name, order: order ?? 0 },
    });
    res.status(201).json({ classification: item });
  } catch (err) { next(err); }
});

// PUT — editar
router.put('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, order, isActive } = req.body;
    const item = await prisma.activityClassification.update({
      where: { id: req.params.id },
      data: { ...(name !== undefined ? { name } : {}), ...(order !== undefined ? { order } : {}), ...(isActive !== undefined ? { isActive } : {}) },
    });
    res.json({ classification: item });
  } catch (err) { next(err); }
});

// DELETE — desativar
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.activityClassification.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /seed — popula classificações padrão
router.post('/seed', authorize('ADMIN'), async (req, res, next) => {
  try {
    const defaults = [
      // Categoria Estratégica
      { type: 'STRATEGIC', name: 'Estratégico',  order: 1 },
      { type: 'STRATEGIC', name: 'Projeto',       order: 2 },
      { type: 'STRATEGIC', name: 'Processo',      order: 3 },
      { type: 'STRATEGIC', name: 'Operacional',   order: 4 },
      // Objetivo Lean
      { type: 'LEAN_OBJECTIVE', name: 'Valor',              order: 1 },
      { type: 'LEAN_OBJECTIVE', name: 'Automação',          order: 2 },
      { type: 'LEAN_OBJECTIVE', name: 'Redução de Custo',   order: 3 },
      { type: 'LEAN_OBJECTIVE', name: 'Redução de Tempo',   order: 4 },
      { type: 'LEAN_OBJECTIVE', name: 'Padronização',       order: 5 },
      { type: 'LEAN_OBJECTIVE', name: 'Controle',           order: 6 },
      { type: 'LEAN_OBJECTIVE', name: 'Inovação',           order: 7 },
      // Área
      { type: 'AREA', name: 'Comercial',   order: 1 },
      { type: 'AREA', name: 'Marketing',   order: 2 },
      { type: 'AREA', name: 'RH',          order: 3 },
      { type: 'AREA', name: 'Financeiro',  order: 4 },
      { type: 'AREA', name: 'Operações',   order: 5 },
      { type: 'AREA', name: 'Tecnologia',  order: 6 },
      { type: 'AREA', name: 'Diretoria',   order: 7 },
    ];

    let created = 0;
    for (const d of defaults) {
      const existing = await prisma.activityClassification.findUnique({ where: { type_name: { type: d.type, name: d.name } } });
      if (!existing) {
        await prisma.activityClassification.create({ data: d });
        created++;
      }
    }
    res.json({ message: `${created} classificações criadas.`, total: defaults.length });
  } catch (err) { next(err); }
});

module.exports = router;
