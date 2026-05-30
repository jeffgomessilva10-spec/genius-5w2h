const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { listRaci, upsertRaci, removeRaci } = require('../controllers/raci.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/',           listRaci);
router.post('/',          authorize('ADMIN', 'COLLABORATOR'), upsertRaci);
router.delete('/:userId', authorize('ADMIN', 'COLLABORATOR'), removeRaci);

module.exports = router;
