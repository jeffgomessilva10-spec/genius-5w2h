// src/controllers/activity.controller.js – CRUD completo do 5W2H
const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');

// GET /api/activities?categoryId=&status=&responsibleId=&startDate=&endDate=
async function listActivities(req, res, next) {
  try {
    const { categoryId, status, responsibleId, startDate, endDate, search } = req.query;

    const where = {};

    if (categoryId)    where.categoryId    = categoryId;
    if (status)        where.status        = status;
    if (responsibleId) where.responsibleId = responsibleId;

    // Filtro por intervalo de datas (whenEnd)
    if (startDate || endDate) {
      where.whenEnd = {};
      if (startDate) where.whenEnd.gte = new Date(startDate);
      if (endDate)   where.whenEnd.lte = new Date(endDate);
    }

    // Busca textual no campo "what"
    if (search) {
      where.OR = [
        { what:  { contains: search, mode: 'insensitive' } },
        { why:   { contains: search, mode: 'insensitive' } },
        { who:   { contains: search, mode: 'insensitive' } },
      ];
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        category:    { select: { id: true, name: true, color: true, projectId: true } },
        responsible: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: [{ code: 'asc' }],
    });

    return res.json({ activities });
  } catch (err) {
    next(err);
  }
}

// GET /api/activities/:id
async function getActivity(req, res, next) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: {
        category:    true,
        responsible: { select: { id: true, name: true, email: true } },
      },
    });
    if (!activity) return res.status(404).json({ error: 'Atividade não encontrada.' });
    return res.json({ activity });
  } catch (err) {
    next(err);
  }
}

// POST /api/activities
async function createActivity(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const {
      code, what, why, who, where: whereField, how,
      howMuch, whenStart, whenEnd, status, risk, notes,
      categoryId, responsibleId,
    } = req.body;

    const activity = await prisma.activity.create({
      data: {
        code, what, why, who,
        where: whereField, how,
        howMuch: howMuch ? parseFloat(howMuch) : null,
        whenStart: whenStart ? new Date(whenStart) : null,
        whenEnd:   whenEnd   ? new Date(whenEnd)   : null,
        status: status || 'PLANNED',
        risk, notes,
        categoryId,
        responsibleId: responsibleId || null,
      },
      include: {
        category:    { select: { id: true, name: true, color: true } },
        responsible: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
}

// PUT /api/activities/:id
async function updateActivity(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const {
      code, what, why, who, where: whereField, how,
      howMuch, whenStart, whenEnd, status, risk, notes,
      categoryId, responsibleId,
    } = req.body;

    const prevActivity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!prevActivity) return res.status(404).json({ error: 'Atividade não encontrada.' });

    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        code, what, why, who,
        where: whereField, how,
        howMuch: howMuch !== undefined ? parseFloat(howMuch) : undefined,
        whenStart: whenStart ? new Date(whenStart) : undefined,
        whenEnd:   whenEnd   ? new Date(whenEnd)   : undefined,
        status, risk, notes,
        categoryId,
        responsibleId: responsibleId || null,
      },
      include: {
        category:    { select: { id: true, name: true, color: true } },
        responsible: { select: { id: true, name: true, email: true } },
      },
    });

    // Se mudou o status, cria notificação automática
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
    await prisma.activity.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Atividade não encontrada.' });
    next(err);
  }
}

// GET /api/activities/stats/:projectId – resumo por status
async function getProjectStats(req, res, next) {
  try {
    const { projectId } = req.params;

    const stats = await prisma.activity.groupBy({
      by: ['status'],
      where: { category: { projectId } },
      _count: { status: true },
    });

    const total = await prisma.activity.count({
      where: { category: { projectId } },
    });

    return res.json({ stats, total });
  } catch (err) {
    next(err);
  }
}

module.exports = { listActivities, getActivity, createActivity, updateActivity, deleteActivity, getProjectStats };
