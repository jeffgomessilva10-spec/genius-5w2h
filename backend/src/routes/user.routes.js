// src/routes/user.routes.js
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const prisma = require('../prisma/client');

const router = Router();
router.use(authenticate);

// Listar usuários (somente admin/collaborator)
router.get('/', authorize('ADMIN', 'COLLABORATOR'), async (req, res, next) => {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: { ...(role ? { role } : {}), isActive: true },
      select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (err) { next(err); }
});

// Atualizar próprio perfil
router.put('/me', async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) { next(err); }
});

// Desativar usuário (ADMIN)
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
