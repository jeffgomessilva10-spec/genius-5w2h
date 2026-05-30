const prisma = require('../prisma/client');
const { audit } = require('../services/audit.service');

const DOC_INCLUDE = {
  uploadedBy: { select: { id: true, name: true } },
  activity:   { select: { id: true, code: true, what: true } },
};

// GET /api/documents?projectId=xxx
async function listDocuments(req, res, next) {
  try {
    const { projectId, activityId } = req.query;
    const where = {};
    if (projectId)  where.projectId  = projectId;
    if (activityId) where.activityId = activityId;

    const documents = await prisma.document.findMany({
      where,
      include: DOC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ documents });
  } catch (err) { next(err); }
}

// POST /api/documents
async function createDocument(req, res, next) {
  try {
    const { projectId, activityId, name, url, version, description } = req.body;
    if (!projectId || !name || !url)
      return res.status(422).json({ error: 'projectId, name e url são obrigatórios.' });

    const document = await prisma.document.create({
      data: {
        projectId, activityId: activityId || null,
        name, url, version: version || '1.0', description,
        uploadedById: req.user.id,
      },
      include: DOC_INCLUDE,
    });

    await audit({ action: 'CREATE', entity: 'Document', entityId: document.id, userId: req.user.id, after: document, ipAddress: req.ip });

    res.status(201).json({ document });
  } catch (err) { next(err); }
}

// PUT /api/documents/:id
async function updateDocument(req, res, next) {
  try {
    const { name, url, version, description } = req.body;
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: { name, url, version, description },
      include: DOC_INCLUDE,
    });
    res.json({ document });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Documento não encontrado.' });
    next(err);
  }
}

// DELETE /api/documents/:id
async function deleteDocument(req, res, next) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });

    await prisma.document.delete({ where: { id: req.params.id } });
    await audit({ action: 'DELETE', entity: 'Document', entityId: req.params.id, userId: req.user.id, before: doc, ipAddress: req.ip });

    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listDocuments, createDocument, updateDocument, deleteDocument };
