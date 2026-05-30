const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { listObjectives, createObjective, createKeyResult, updateKeyResult, linkActivity, deleteObjective } = require('../controllers/okr.controller');

const router = Router();
router.use(authenticate);

router.get('/',    listObjectives);
router.post('/',   authorize('ADMIN', 'COLLABORATOR'), createObjective);
router.delete('/:id', authorize('ADMIN'), deleteObjective);

router.post('/:objectiveId/key-results', authorize('ADMIN', 'COLLABORATOR'), createKeyResult);
router.patch('/key-results/:id',         authorize('ADMIN', 'COLLABORATOR'), updateKeyResult);
router.post('/key-results/:id/link-activity', authorize('ADMIN', 'COLLABORATOR'), linkActivity);

module.exports = router;
