const prisma = require('../prisma/client');

/**
 * Registra uma entrada no log de auditoria.
 * Chamado em pontos críticos: mudança de status, exclusão, criação.
 */
async function audit({ action, entity, entityId, userId, before = null, after = null, ipAddress = null }) {
  try {
    await prisma.auditLog.create({
      data: { action, entity, entityId, userId, before, after, ipAddress },
    });
  } catch (err) {
    console.error('[Audit] Erro ao registrar:', err.message);
  }
}

/**
 * Lista logs de auditoria com filtros.
 */
async function getLogs({ entity, entityId, userId, limit = 50 } = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(entity   ? { entity }   : {}),
      ...(entityId ? { entityId } : {}),
      ...(userId   ? { userId }   : {}),
    },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

module.exports = { audit, getLogs };
