/**
 * analytics.controller.js
 * APIs REST para consulta de métricas de uso.
 * Acesso restrito a ADMIN e EXECUTIVE.
 */
const prisma = require('../prisma/client');
const {
  recordEvent, calcActiveUsers, calcDAUSeries,
  calcAvgSessionDuration, calcRetention,
  calcFeatureAdoption, calcSessionFrequency,
  calcModuleHeatmap, calcChurn,
} = require('../services/analytics.service');

// POST /api/analytics/events — recebe evento do frontend
async function ingestEvent(req, res, next) {
  try {
    const { sessionId, eventType, module, action, context, durationMs } = req.body;
    if (!sessionId || !eventType) return res.status(422).json({ error: 'sessionId e eventType são obrigatórios.' });

    const validTypes = ['SESSION_START', 'SESSION_END', 'PAGE_VIEW', 'ACTION', 'FEATURE_USE'];
    if (!validTypes.includes(eventType)) return res.status(422).json({ error: 'eventType inválido.' });

    await recordEvent({
      userId:    req.user?.id   || null,
      sessionId,
      eventType,
      module,
      action,
      context,
      durationMs,
      userRole:  req.user?.role || null,
      ip:        req.ip,
    });

    res.status(201).json({ recorded: true });
  } catch (err) { next(err); }
}

// GET /api/analytics/dau?start=&end=
async function getDau(req, res, next) {
  try {
    const { start, end } = req.query;
    const series = await calcDAUSeries(
      start || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      end   || new Date().toISOString().split('T')[0],
    );
    res.json({ metric: 'DAU', series });
  } catch (err) { next(err); }
}

// GET /api/analytics/active?period=day|week|month
async function getActiveUsers(req, res, next) {
  try {
    const { period = 'day', start, end } = req.query;
    const [day, week, month] = await Promise.all([
      calcActiveUsers('day'),
      calcActiveUsers('week'),
      calcActiveUsers('month'),
    ]);
    res.json({ dau: day, wau: week, mau: month });
  } catch (err) { next(err); }
}

// GET /api/analytics/sessions
async function getSessionStats(req, res, next) {
  try {
    const { start, end } = req.query;
    const [duration, frequency] = await Promise.all([
      calcAvgSessionDuration(start, end),
      calcSessionFrequency(start, end),
    ]);
    res.json({ duration, frequency });
  } catch (err) { next(err); }
}

// GET /api/analytics/retention?cohort=2026-05-01&days=7
async function getRetention(req, res, next) {
  try {
    const { cohort, days } = req.query;
    const cohortDate = cohort || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const [d7, d30] = await Promise.all([
      calcRetention(cohortDate, 7),
      calcRetention(cohortDate, 30),
    ]);
    res.json({ d7, d30 });
  } catch (err) { next(err); }
}

// GET /api/analytics/features?days=30
async function getFeatureAdoption(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await calcFeatureAdoption(days);
    res.json(data);
  } catch (err) { next(err); }
}

// GET /api/analytics/heatmap
async function getHeatmap(req, res, next) {
  try {
    const { start, end } = req.query;
    const data = await calcModuleHeatmap(start, end);
    res.json({ heatmap: data });
  } catch (err) { next(err); }
}

// GET /api/analytics/churn?days=30
async function getChurn(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await calcChurn(days);
    res.json(data);
  } catch (err) { next(err); }
}

// GET /api/analytics/summary — painel geral
async function getSummary(req, res, next) {
  try {
    const [active, duration, adoption, churn, heatmap] = await Promise.all([
      Promise.all([calcActiveUsers('day'), calcActiveUsers('week'), calcActiveUsers('month')]),
      calcAvgSessionDuration(),
      calcFeatureAdoption(30),
      calcChurn(30),
      calcModuleHeatmap(),
    ]);

    res.json({
      generatedAt: new Date().toISOString(),
      activeUsers: { dau: active[0], wau: active[1], mau: active[2] },
      sessionDuration: duration,
      featureAdoption: adoption,
      churn,
      topModules: heatmap.slice(0, 5),
    });
  } catch (err) { next(err); }
}

// DELETE /api/analytics/my-data — LGPD: excluir dados do usuário
async function deleteMyAnalytics(req, res, next) {
  try {
    const { count } = await prisma.analyticEvent.deleteMany({
      where: { userId: req.user.id },
    });
    res.json({ deleted: count, message: 'Dados analíticos removidos com sucesso.' });
  } catch (err) { next(err); }
}

module.exports = {
  ingestEvent, getDau, getActiveUsers, getSessionStats,
  getRetention, getFeatureAdoption, getHeatmap, getChurn,
  getSummary, deleteMyAnalytics,
};
