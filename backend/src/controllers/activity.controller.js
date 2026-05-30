// src/controllers/activity.controller.js – CRUD completo do 5W2H + Fase 1
const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');
const { audit } = require('../services/audit.service');

// Calcula RiskLevel a partir de probabilidade × impacto
function calcRiskLevel(prob, impact) {
  if (!prob || !impact) return null;
  const score = prob * impact;
  if (score >= 20) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 6)  return 'MEDIUM';
  return 'LOW';
}

const ACTIVITY_INCLUDE = {
  category:    { select: { id: true, name: true, color: true, projectId: true } },
  responsible: { select: { id: true, name: true, email: true, avatarUrl: true } },
  comments:    { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
};

// GET /api/activities
async function listActivities(req, res, next) {
  try {
    const { categoryId, status, responsibleId, startDate, endDate, search, riskLevel } = req.query;
    const where = {};

    if (categoryId)    where.categoryId    = categoryId;
    if (status)        where.status        = status;
    if (responsibleId) where.responsibleId = responsibleId;
    if (riskLevel)     where.riskLevel     = riskLevel;

    if (startDate || endDate) {
      where.whenEnd = {};
      if (startDate) where.whenEnd.gte = new Date(startDate);
      if (endDate)   where.whenEnd.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { what:  { contains: search, mode: 'insensitive' } },
        { why:   { contains: search, mode: 'insensitive' } },
        { who:   { contains: search, mode: 'insensitive' } },
      ];
    }

    const activities = await prisma.activity.findMany({
      where,
      include: ACTIVITY_INCLUDE,
      orderBy: [{ code: 'asc' }],
    });

    return res.json({ activities });
  } catch (err) { next(err); }
}

// GET /api/activities/:id
async function getActivity(req, res, next) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { ...ACTIVITY_INCLUDE, category: true, responsible: { select: { id: true, name: true, email: true } } },
    });
    if (!activity) return res.status(404).json({ error: 'Atividade não encontrada.' });
    return res.json({ activity });
  } catch (err) { next(err); }
}

// POST /api/activities
async function createActivity(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const {
      code, what, why, who, where: whereField, how,
      howMuch, actualCost, plannedHours, actualHours,
      whenStart, whenEnd, status, risk, notes,
      riskProbability, riskImpact, riskMitigation,
      categoryId, responsibleId,
    } = req.body;

    const prob   = riskProbability ? parseInt(riskProbability) : null;
    const impact = riskImpact      ? parseInt(riskImpact)      : null;

    const activity = await prisma.activity.create({
      data: {
        code, what, why, who, where: whereField, how,
        howMuch:        howMuch        ? parseFloat(howMuch)        : null,
        actualCost:     actualCost     ? parseFloat(actualCost)     : null,
        plannedHours:   plannedHours   ? parseFloat(plannedHours)   : null,
        actualHours:    actualHours    ? parseFloat(actualHours)    : null,
        whenStart:      whenStart      ? new Date(whenStart)        : null,
        whenEnd:        whenEnd        ? new Date(whenEnd)          : null,
        status:         status || 'PLANNED',
        risk, notes,
        riskProbability: prob,
        riskImpact:      impact,
        riskLevel:       calcRiskLevel(prob, impact),
        riskMitigation,
        categoryId,
        responsibleId: responsibleId || null,
      },
      include: ACTIVITY_INCLUDE,
    });

    await audit({ action: 'CREATE', entity: 'Activity', entityId: activity.id, userId: req.user.id, after: activity, ipAddress: req.ip });

    return res.status(201).json({ activity });
  } catch (err) { next(err); }
}

// PUT /api/activities/:id
async function updateActivity(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const {
      code, what, why, who, where: whereField, how,
      howMuch, actualCost, plannedHours, actualHours,
      whenStart, whenEnd, status, risk, notes,
      riskProbability, riskImpact, riskMitigation,
      categoryId, responsibleId,
    } = req.body;

    const prevActivity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!prevActivity) return res.status(404).json({ error: 'Atividade não encontrada.' });

    const prob   = riskProbability !== undefined ? parseInt(riskProbability) : prevActivity.riskProbability;
    const impact = riskImpact      !== undefined ? parseInt(riskImpact)      : prevActivity.riskImpact;

    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        code, what, why, who, where: whereField, how,
        howMuch:        howMuch      !== undefined ? parseFloat(howMuch)        : undefined,
        actualCost:     actualCost   !== undefined ? parseFloat(actualCost)     : undefined,
        plannedHours:   plannedHours !== undefined ? parseFloat(plannedHours)   : undefined,
        actualHours:    actualHours  !== undefined ? parseFloat(actualHours)    : undefined,
        whenStart:      whenStart    ? new Date(whenStart) : undefined,
        whenEnd:        whenEnd      ? new Date(whenEnd)   : undefined,
        status, risk, notes,
        riskProbability: riskProbability !== undefined ? prob   : undefined,
        riskImpact:      riskImpact      !== undefined ? impact : undefined,
        riskLevel:       calcRiskLevel(prob, impact),
        riskMitigation,
        categoryId,
        responsibleId: responsibleId !== undefined ? (responsibleId || null) : undefined,
      },
      include: ACTIVITY_INCLUDE,
    });

    // Auditoria
    const auditAction = status && status !== prevActivity.status ? 'STATUS_CHANGE' : 'UPDATE';
    await audit({ action: auditAction, entity: 'Activity', entityId: activity.id, userId: req.user.id, before: prevActivity, after: activity, ipAddress: req.ip });

    // Notificação automática de mudança de status
    if (status && status !== prevActivity.status) {
      const { createStatusChangeNotification } = require('../services/notification.service');
      await createStatusChangeNotification(activity, prevActivity.status, status);
    }

    return res.json({ activity });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Atividade não encontrada.' });
    next(err);
  }
}

// DELETE /api/activities/:id
async function deleteActivity(req, res, next) {
  try {
    const prev = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!prev) return res.status(404).json({ error: 'Atividade não encontrada.' });

    await prisma.activity.delete({ where: { id: req.params.id } });
    await audit({ action: 'DELETE', entity: 'Activity', entityId: req.params.id, userId: req.user.id, before: prev, ipAddress: req.ip });

    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Atividade não encontrada.' });
    next(err);
  }
}

// GET /api/activities/stats/:projectId
async function getProjectStats(req, res, next) {
  try {
    const { projectId } = req.params;
    const where = { category: { projectId } };

    const [stats, total, riskStats, financials] = await Promise.all([
      prisma.activity.groupBy({ by: ['status'], where, _count: { status: true } }),
      prisma.activity.count({ where }),
      prisma.activity.groupBy({ by: ['riskLevel'], where: { ...where, riskLevel: { not: null } }, _count: { riskLevel: true } }),
      prisma.activity.aggregate({
        where,
        _sum: { howMuch: true, actualCost: true, plannedHours: true, actualHours: true },
      }),
    ]);

    return res.json({ stats, total, riskStats, financials: financials._sum });
  } catch (err) { next(err); }
}

module.exports = { listActivities, getActivity, createActivity, updateActivity, deleteActivity, getProjectStats };
