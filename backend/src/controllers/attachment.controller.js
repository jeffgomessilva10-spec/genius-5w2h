const prisma = require('../prisma/client');
const { audit } = require('../services/audit.service');

// GET /api/activities/:activityId/attachments
async function listAttachments(req, res, next) {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { activityId: req.params.activityId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ attachments });
  } catch (err) { next(err); }
}

// POST /api/activities/:activityId/attachments
async function createAttachment(req, res, next) {
  try {
    const { name, url, type, description } = req.body;
    if (!name || !url) return res.status(422).json({ error: 'Nome e URL são obrigatórios.' });

    const validTypes = ['IMAGE', 'DOCUMENT', 'LINK', 'VIDEO'];
    const attachType = validTypes.includes(type) ? type : 'DOCUMENT';

    const attachment = await prisma.attachment.create({
      data: {
        activityId: req.params.activityId,
        name, url, type: attachType, description,
        uploadedById: req.user.id,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await audit({ action: 'CREATE', entity: 'Attachment', entityId: attachment.id, userId: req.user.id, after: attachment, ipAddress: req.ip });

    res.status(201).json({ attachment });
  } catch (err) { next(err); }
}

// DELETE /api/activities/:activityId/attachments/:id
async function deleteAttachment(req, res, next) {
  try {
    const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!att) return res.status(404).json({ error: 'Anexo não encontrado.' });
    if (att.uploadedById !== req.user.id && req.user.role !== 'ADMIN')
      return res.status(403).json({ error: 'Sem permissão.' });

    await prisma.attachment.delete({ where: { id: req.params.id } });
    await audit({ action: 'DELETE', entity: 'Attachment', entityId: req.params.id, userId: req.user.id, before: att, ipAddress: req.ip });

    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listAttachments, createAttachment, deleteAttachment };
