// src/app.js – Configuração do Express
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Rotas
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const categoryRoutes = require('./routes/category.routes');
const activityRoutes = require('./routes/activity.routes');
const notificationRoutes = require('./routes/notification.routes');
const userRoutes = require('./routes/user.routes');
const commentRoutes = require('./routes/comment.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();

// Confia no proxy do Railway
app.set('trust proxy', 1);

// ── Segurança ────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting global: 200 req/15min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
}));

// Rate limiting mais restrito para autenticação
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rotas ────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/activities',    activityRoutes);
app.use('/api/activities/:activityId/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit',         auditRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Handler de erros global ──────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

module.exports = app;
