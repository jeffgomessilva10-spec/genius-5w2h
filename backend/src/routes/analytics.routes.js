const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  ingestEvent, getDau, getActiveUsers, getSessionStats,
  getRetention, getFeatureAdoption, getHeatmap, getChurn,
  getSummary, deleteMyAnalytics,
} = require('../controllers/analytics.controller');

const router = Router();

// Ingestão — qualquer usuário autenticado (ou anônimo via middleware)
router.post('/events', authenticate, ingestEvent);

// Exclusão LGPD — qualquer usuário sobre seus próprios dados
router.delete('/my-data', authenticate, deleteMyAnalytics);

// Consultas — apenas ADMIN e EXECUTIVE
router.use(authenticate, authorize('ADMIN', 'EXECUTIVE'));

router.get('/summary',   getSummary);
router.get('/dau',       getDau);
router.get('/active',    getActiveUsers);
router.get('/sessions',  getSessionStats);
router.get('/retention', getRetention);
router.get('/features',  getFeatureAdoption);
router.get('/heatmap',   getHeatmap);
router.get('/churn',     getChurn);

module.exports = router;
