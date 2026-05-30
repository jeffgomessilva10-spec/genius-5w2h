const prisma = require('../prisma/client');
const { sendNotification } = require('../services/notification.service');

// GET /api/activities/:activityId/comments
async function listComments(req, res, next) {
  try {
    const comments = await prisma.comment.findMany({
      where: { activityId: req.params.activityId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch (err) { next(err); }
}

// POST /api/activities/:activityId/comments
async function createComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(422).json({ error: 'Comentário não pode estar vazio.' });

    const comment = await prisma.comment.create({
      data: { content: content.trim(), activityId: req.params.activityId, authorId: req.user.id },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Detecta @menções (ex: @João Silva)
    const mentions = [...content.matchAll(/@([a-zA-ZÀ-ú\s]+?)(?=\s|$|[^a-zA-ZÀ-ú\s])/g)]
      .map(m => m[1].trim());

    if (mentions.length) {
      const users = await prisma.user.findMany({
        where: { name: { in: mentions }, isActive: true },
        select: { id: true },
      });
      for (const u of users) {
        if (u.id !== req.user.id) {
          await sendNotification({
            userId: u.id,
            type: 'STATUS_CHANGE',
            title: `${req.user.name} mencionou você`,
            message: content.trim(),
            activityId: req.params.activityId,
            sentById: req.user.id,
          });
        }
      }
    }

    res.status(201).json({ comment });
  } catch (err) { next(err); }
}

// DELETE /api/activities/:activityId/comments/:id
async function deleteComment(req, res, next) {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: 'Comentário não encontrado.' });
    if (comment.authorId !== req.user.id && req.user.role !== 'ADMIN')
      return res.status(403).json({ error: 'Sem permissão.' });

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listComments, createComment, deleteComment };
