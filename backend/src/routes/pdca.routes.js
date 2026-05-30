const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { listPdca, createReview, deleteReview, createLesson, deleteLesson } = require('../controllers/pdca.controller');

const router = Router();
router.use(authenticate);

router.get('/', listPdca);

router.post('/reviews',        authorize('ADMIN', 'COLLABORATOR'), createReview);
router.delete('/reviews/:id',  authorize('ADMIN', 'COLLABORATOR'), deleteReview);

router.post('/lessons',        authorize('ADMIN', 'COLLABORATOR'), createLesson);
router.delete('/lessons/:id',  authorize('ADMIN', 'COLLABORATOR'), deleteLesson);

module.exports = router;
