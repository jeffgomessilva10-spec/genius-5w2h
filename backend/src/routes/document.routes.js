const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { listDocuments, createDocument, updateDocument, deleteDocument } = require('../controllers/document.controller');

const router = Router();
router.use(authenticate);

router.get('/',      listDocuments);
router.post('/',     authorize('ADMIN', 'COLLABORATOR'), createDocument);
router.put('/:id',   authorize('ADMIN', 'COLLABORATOR'), updateDocument);
router.delete('/:id',authorize('ADMIN'),                 deleteDocument);

module.exports = router;
