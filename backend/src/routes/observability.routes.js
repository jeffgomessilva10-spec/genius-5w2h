/**
 * observability.routes.js
 * Endpoints de saúde, métricas e diagnóstico.
 * /health — liveness probe (Railway, k8s)
 * /ready  — readiness probe
 * /metrics — métricas básicas de aplicação
 */
const { Router } = require('express');
const prisma = require('../prisma/client');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();
const startTime = Date.now();
let requestCount = 0;
let errorCount   = 0;

// Incrementa contadores (chamado pelo app.js)
function recordRequest()  { requestCount++; }
function recordError()    { errorCount++; }

// GET /health — sem autenticação (usado por load balancers)
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      database: 'connected',
    });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// GET /ready — readiness probe
router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

// GET /metrics — apenas ADMIN
router.get('/metrics', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const [userCount, projectCount, activityCount, auditCount] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.project.count({ where: { isActive: true } }),
      prisma.activity.count(),
      prisma.auditLog.count(),
    ]);

    const actsByStatus = await prisma.activity.groupBy({
      by: ['status'], _count: { status: true },
    });

    res.json({
      app: {
        name:           'genius-5w2h-api',
        version:        '2.0.0',
        uptimeSeconds:  Math.floor((Date.now() - startTime) / 1000),
        requestCount,
        errorCount,
        errorRate:      requestCount > 0 ? +((errorCount / requestCount) * 100).toFixed(2) : 0,
      },
      database: {
        users:      userCount,
        projects:   projectCount,
        activities: activityCount,
        auditLogs:  auditCount,
        activitiesByStatus: Object.fromEntries(actsByStatus.map(s => [s.status, s._count.status])),
      },
      system: {
        memoryMB:    Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
        platform:    process.platform,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

module.exports = { router, recordRequest, recordError };
