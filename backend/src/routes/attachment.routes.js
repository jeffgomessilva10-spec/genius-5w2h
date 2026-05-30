const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { listAttachments, createAttachment, deleteAttachment } = require('../controllers/attachment.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/',    listAttachments);
router.post('/',   authorize('ADMIN', 'COLLABORATOR'), createAttachment);
router.delete('/:id', deleteAttachment);

module.exports = router;
