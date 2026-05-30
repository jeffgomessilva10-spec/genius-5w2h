const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { listComments, createComment, deleteComment } = require('../controllers/comment.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/',    listComments);
router.post('/',   authorize('ADMIN', 'COLLABORATOR'), createComment);
router.delete('/:id', deleteComment);

module.exports = router;
