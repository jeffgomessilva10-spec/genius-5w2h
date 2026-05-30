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

// Desativar usuário (ADMIN) — remove de projetos e atividades
router.delete('/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      // 1. Desativa o usuário
      prisma.user.update({ where: { id }, data: { isActive: false } }),
      // 2. Remove de todos os projetos vinculados
      prisma.projectUser.deleteMany({ where: { userId: id } }),
      // 3. Remove como responsável das atividades
      prisma.activity.updateMany({ where: { responsibleId: id }, data: { responsibleId: null } }),
      // 4. Marca notificações como lidas (limpeza)
      prisma.notification.updateMany({ where: { userId: id }, data: { isRead: true } }),
    ]);

    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
