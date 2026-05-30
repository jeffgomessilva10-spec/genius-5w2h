const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { getLogs } = require('../services/audit.service');

const router = Router();
router.use(authenticate, authorize('ADMIN'));

// GET /api/audit?entity=Activity&entityId=xxx&limit=50
router.get('/', async (req, res, next) => {
  try {
    const { entity, entityId, userId, limit } = req.query;
    const logs = await getLogs({ entity, entityId, userId, limit: Number(limit) || 50 });
    res.json({ logs });
  } catch (err) { next(err); }
});

module.exports = router;
