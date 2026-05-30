const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { listTimeEntries, createTimeEntry, deleteTimeEntry } = require('../controllers/timeentry.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/',    listTimeEntries);
router.post('/',   createTimeEntry);
router.delete('/:id', deleteTimeEntry);

module.exports = router;
