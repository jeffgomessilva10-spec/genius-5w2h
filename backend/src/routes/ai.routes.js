const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { validateActivity, suggestImprovement } = require('../controllers/ai.controller');

const router = Router();
router.use(authenticate);

router.post('/validate', validateActivity);
router.post('/suggest',  suggestImprovement);

module.exports = router;
