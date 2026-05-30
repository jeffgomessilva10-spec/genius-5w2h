// src/routes/notification.routes.js
const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const prisma = require('../prisma/client');

const router = Router();
router.use(authenticate);

// Minhas notificações
router.get('/', async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        ...(unreadOnly === 'true' ? { isRead: false } : {}),
      },
      include: {
        activity: { select: { id: true, code: true, what: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

// Marcar como lida
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ notification });
  } catch (err) { next(err); }
});

// Marcar todas como lidas
router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'Todas as notificações marcadas como lidas.' });
  } catch (err) { next(err); }
});

module.exports = router;
