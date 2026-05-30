/**
 * app.js — Express + middlewares de segurança + rotas
 * Arquitetura: Monólito modular com domínios isolados.
 * Segurança: Zero Trust, sanitização, CSP, rate limiting, observabilidade.
 */
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');

const { sanitizeInputs, detectInjection, securityHeaders } = require('./middleware/security.middleware');
const { httpLogger, logger } = require('./services/logger.service');
const { router: observabilityRouter, recordRequest, recordError } = require('./routes/observability.routes');

// ── Rotas de domínio ────────────────────────────────────
const authRoutes         = require('./routes/auth.routes');
const projectRoutes      = require('./routes/project.routes');
const categoryRoutes     = require('./routes/category.routes');
const activityRoutes     = require('./routes/activity.routes');
const notificationRoutes = require('./routes/notification.routes');
const userRoutes         = require('./routes/user.routes');
const commentRoutes      = require('./routes/comment.routes');
const auditRoutes        = require('./routes/audit.routes');
const raciRoutes         = require('./routes/raci.routes');
const timeEntryRoutes    = require('./routes/timeentry.routes');
const attachmentRoutes   = require('./routes/attachment.routes');
const documentRoutes     = require('./routes/document.routes');
const okrRoutes          = require('./routes/okr.routes');
const pdcaRoutes         = require('./routes/pdca.routes');
const aiRoutes           = require('./routes/ai.routes');
const dashboardRoutes    = require('./routes/dashboard.routes');
const governanceRoutes   = require('./routes/governance.routes');
const analyticsRoutes    = require('./routes/analytics.routes');

const app = express();

// ── Trust proxy (Railway, Nginx) ────────────────────────
app.set('trust proxy', 1);

// ── Compressão gzip ─────────────────────────────────────
app.use(compression());

// ── Segurança — Helmet com CSP ──────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ── Headers de segurança adicionais ────────────────────
app.use(securityHeaders);

// ── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.', code: 'RATE_LIMIT' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.', code: 'AUTH_RATE_LIMIT' },
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Log HTTP ────────────────────────────────────────────
app.use(httpLogger);

// ── Contador de métricas ────────────────────────────────
app.use((req, res, next) => {
  recordRequest();
  res.on('finish', () => { if (res.statusCode >= 500) recordError(); });
  next();
});

// ── Sanitização de inputs (XSS + injection) ────────────
app.use(sanitizeInputs);
app.use(detectInjection);

// ── Observabilidade (health/ready/metrics) ─────────────
app.use(observabilityRouter);

// ── Rotas da API ────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/projects',       projectRoutes);
app.use('/api/categories',     categoryRoutes);
app.use('/api/activities',     activityRoutes);
app.use('/api/activities/:activityId/comments',     commentRoutes);
app.use('/api/activities/:activityId/raci',         raciRoutes);
app.use('/api/activities/:activityId/time-entries', timeEntryRoutes);
app.use('/api/activities/:activityId/attachments',  attachmentRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/audit',          auditRoutes);
app.use('/api/documents',      documentRoutes);
app.use('/api/okr',            okrRoutes);
app.use('/api/pdca',           pdcaRoutes);
app.use('/api/ai',             aiRoutes);
app.use('/api/dashboard',      dashboardRoutes);
app.use('/api/governance',     governanceRoutes);
app.use('/api/analytics',     analyticsRoutes);

// ── Handler de erros global ─────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error:  err.message,
    stack:  err.stack,
    path:   req.path,
    method: req.method,
    userId: req.user?.id,
  });

  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 && process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : err.message || 'Erro interno do servidor',
    code:  err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── 404 ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.', code: 'NOT_FOUND' });
});

module.exports = app;
