/**
 * governance.controller.js
 * Módulos de Governança de Dados:
 * - Glossário de Negócios
 * - Políticas de Dados
 * - Consentimento LGPD
 * - Exportação de auditoria
 * - Qualidade de dados
 */
const prisma = require('../prisma/client');
const { logger } = require('../services/logger.service');

// ─── GLOSSÁRIO ────────────────────────────────────────
async function listGlossary(req, res, next) {
  try {
    const { category, search } = req.query;
    const terms = await prisma.glossaryTerm.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(search   ? { term: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
      orderBy: { term: 'asc' },
    });
    res.json({ terms });
  } catch (err) { next(err); }
}

async function upsertGlossaryTerm(req, res, next) {
  try {
    const { id, term, definition, category, examples, relatedTo } = req.body;
    if (!term || !definition) return res.status(422).json({ error: 'term e definition são obrigatórios.' });

    const data = { term, definition, category: category || 'Geral', examples, relatedTo, updatedById: req.user.id };

    const result = id
      ? await prisma.glossaryTerm.update({ where: { id }, data, include: { createdBy: { select: { name: true } } } })
      : await prisma.glossaryTerm.create({ data: { ...data, createdById: req.user.id }, include: { createdBy: { select: { name: true } } } });

    res.status(id ? 200 : 201).json({ term: result });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Termo já existe no glossário.' });
    next(err);
  }
}

async function deleteGlossaryTerm(req, res, next) {
  try {
    await prisma.glossaryTerm.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── POLÍTICAS ────────────────────────────────────────
async function listPolicies(req, res, next) {
  try {
    const { category } = req.query;
    const policies = await prisma.dataPolicy.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ policies });
  } catch (err) { next(err); }
}

async function createPolicy(req, res, next) {
  try {
    const { title, category, content, version, effectiveAt } = req.body;
    if (!title || !category || !content) return res.status(422).json({ error: 'title, category e content são obrigatórios.' });

    const policy = await prisma.dataPolicy.create({
      data: { title, category, content, version: version || '1.0', effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(), createdById: req.user.id },
      include: { createdBy: { select: { name: true } } },
    });
    res.status(201).json({ policy });
  } catch (err) { next(err); }
}

async function archivePolicy(req, res, next) {
  try {
    await prisma.dataPolicy.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── CONSENTIMENTO LGPD ───────────────────────────────
async function recordConsent(req, res, next) {
  try {
    const { type, accepted } = req.body;
    if (!type) return res.status(422).json({ error: 'type é obrigatório.' });

    const consent = await prisma.consent.create({
      data: {
        userId: req.user.id,
        type, accepted: !!accepted,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 200),
      },
    });
    logger.info('Consent recorded', { userId: req.user.id, type, accepted });
    res.status(201).json({ consent });
  } catch (err) { next(err); }
}

async function getMyConsents(req, res, next) {
  try {
    const consents = await prisma.consent.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ consents });
  } catch (err) { next(err); }
}

// ─── EXPORTAÇÃO LGPD (direito de portabilidade) ───────
async function exportMyData(req, res, next) {
  try {
    const userId = req.user.id;
    const [user, activities, comments, timeEntries, consents, notifications] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } }),
      prisma.activity.findMany({ where: { responsibleId: userId }, select: { id: true, code: true, what: true, status: true, createdAt: true } }),
      prisma.comment.findMany({ where: { authorId: userId }, select: { id: true, content: true, activityId: true, createdAt: true } }),
      prisma.timeEntry.findMany({ where: { userId }, select: { id: true, hours: true, date: true, description: true } }),
      prisma.consent.findMany({ where: { userId }, select: { type: true, accepted: true, createdAt: true } }),
      prisma.notification.count({ where: { userId } }),
    ]);

    logger.info('Data export requested', { userId, requestedBy: req.user.id });

    res.setHeader('Content-Disposition', `attachment; filename="meus-dados-${userId}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      requestedBy: userId,
      legalBasis: 'LGPD Art. 18 — Portabilidade de dados',
      data: { user, activities, comments, timeEntries, consents, notificationCount: notifications },
    });
  } catch (err) { next(err); }
}

// ─── QUALIDADE DE DADOS ───────────────────────────────
async function dataQualityReport(req, res, next) {
  try {
    const [activities, projects, users] = await Promise.all([
      prisma.activity.findMany({
        select: {
          id: true, what: true, why: true, who: true, where: true, how: true,
          howMuch: true, whenStart: true, whenEnd: true, riskProbability: true,
          status: true, responsibleId: true,
        },
      }),
      prisma.project.findMany({ where: { isActive: true }, select: { id: true, name: true, startDate: true, endDate: true } }),
      prisma.user.findMany({ where: { isActive: true }, select: { id: true, email: true, phone: true } }),
    ]);

    // Completeness — campos obrigatórios 5W2H
    const incomplete = activities.filter(a =>
      !a.what?.trim() || !a.why?.trim() || !a.who?.trim() ||
      !a.where?.trim() || !a.how?.trim()
    );

    const noDate     = activities.filter(a => !a.whenStart || !a.whenEnd);
    const noCost     = activities.filter(a => !a.howMuch);
    const noRisk     = activities.filter(a => !a.riskProbability);
    const noResp     = activities.filter(a => !a.responsibleId);
    const noPhone    = users.filter(u => !u.phone);
    const noDates    = projects.filter(p => !p.startDate || !p.endDate);

    const completeness = activities.length > 0
      ? Math.round(((activities.length - incomplete.length) / activities.length) * 100)
      : 100;

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalActivities: activities.length,
        completeness:    `${completeness}%`,
        issues:          incomplete.length + noDate.length + noCost.length,
      },
      issues: {
        incompleteFiveW2H:  { count: incomplete.length, ids: incomplete.slice(0, 10).map(a => a.id) },
        missingDates:       { count: noDate.length,     description: 'Atividades sem whenStart/whenEnd' },
        missingCost:        { count: noCost.length,     description: 'Atividades sem custo estimado' },
        missingRisk:        { count: noRisk.length,     description: 'Atividades sem avaliação de risco' },
        missingResponsible: { count: noResp.length,     description: 'Atividades sem responsável vinculado' },
        usersWithoutPhone:  { count: noPhone.length,    description: 'Usuários sem WhatsApp cadastrado' },
        projectsWithoutDates: { count: noDates.length,  description: 'Projetos sem data início/fim' },
      },
      recommendations: [
        ...(incomplete.length > 0  ? [`Completar ${incomplete.length} atividade(s) com campos 5W2H faltando`] : []),
        ...(noDate.length > 0      ? [`Definir datas para ${noDate.length} atividade(s)`] : []),
        ...(noRisk.length > 0      ? [`Avaliar risco de ${noRisk.length} atividade(s)`] : []),
        ...(noPhone.length > 0     ? [`Cadastrar WhatsApp de ${noPhone.length} usuário(s)`] : []),
      ],
    };

    res.json(report);
  } catch (err) { next(err); }
}

// ─── EXPORTAÇÃO DE AUDITORIA ──────────────────────────
async function exportAuditReport(req, res, next) {
  try {
    const { from, to, entity } = req.query;
    const where = {
      ...(entity ? { entity } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    logger.info('Audit export', { by: req.user.id, filters: { from, to, entity }, count: logs.length });

    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${Date.now()}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      filters: { from, to, entity },
      count: logs.length,
      logs,
    });
  } catch (err) { next(err); }
}

module.exports = {
  listGlossary, upsertGlossaryTerm, deleteGlossaryTerm,
  listPolicies, createPolicy, archivePolicy,
  recordConsent, getMyConsents, exportMyData,
  dataQualityReport, exportAuditReport,
};
