const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  operationalDashboard, executiveDashboard,
  getPreferences, updatePreferences,
} = require('../controllers/dashboard.controller');

const router = Router();
router.use(authenticate);

// Operacional — colaboradores veem apenas suas atividades
router.get('/operational', operationalDashboard);

// Executivo — apenas admin e executive
router.get('/executive', authorize('ADMIN', 'EXECUTIVE'), executiveDashboard);

// Preferências de cada usuário
router.get('/preferences',  getPreferences);
router.put('/preferences',  updatePreferences);

module.exports = router;
