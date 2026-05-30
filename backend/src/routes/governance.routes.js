const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  listGlossary, upsertGlossaryTerm, deleteGlossaryTerm,
  listPolicies, createPolicy, archivePolicy,
  recordConsent, getMyConsents, exportMyData,
  dataQualityReport, exportAuditReport,
} = require('../controllers/governance.controller');

const router = Router();
router.use(authenticate);

// ── Glossário ──────────────────────────────────────────
router.get('/glossary',           listGlossary);
router.post('/glossary',          authorize('ADMIN'), upsertGlossaryTerm);
router.delete('/glossary/:id',    authorize('ADMIN'), deleteGlossaryTerm);

// ── Políticas ──────────────────────────────────────────
router.get('/policies',           listPolicies);
router.post('/policies',          authorize('ADMIN'), createPolicy);
router.patch('/policies/:id/archive', authorize('ADMIN'), archivePolicy);

// ── LGPD ──────────────────────────────────────────────
router.post('/consent',           recordConsent);
router.get('/consent',            getMyConsents);
router.get('/my-data/export',     exportMyData);

// ── Qualidade e Auditoria ──────────────────────────────
router.get('/data-quality',       authorize('ADMIN', 'EXECUTIVE'), dataQualityReport);
router.get('/audit/export',       authorize('ADMIN'), exportAuditReport);

module.exports = router;
